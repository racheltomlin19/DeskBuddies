#!/bin/bash
# macOS lane: build the update-core helper and emit a kit the stager lane consumes.
#
#   bash scripts/mac-build-helper.sh [--rust-crypter <dir>] [--arch <arch>]
#                                    [--out <kit dir>] [--helper-name <name>]
#   HOST_KIT_DIR=<kit dir> npm run dist:mac
#
# Why this exists: scripts/build-with-stager.mjs --mac stages a PREBUILT helper and
# has no mac kit builder to fall back on, so the "build the helper" step used to be
# a cargo one-liner in this document - a step nobody re-runs identically. This
# script is that step, and it is the one place the darwin link arg lives.
#
# WHY -Wl,-no_uuid (task-30 item 1, 2026-10-06)
# On darwin/arm64 ld stamps an LC_UUID derived from the BUILD PATH, and the ad-hoc
# CodeDirectory hash then covers it, so two builds of the same source from different
# directories differ in EXACTLY 48 bytes and no arm64 artifact is reproducible
# (measured on the Intel MBP, Ventura 13.7.8, cargo 1.97.1: the path LENGTH is what
# moves the hash, the x86_64 build is immune). -Wl,-no_uuid removes the LC_UUID, so
# the artifact is byte-identical across build paths.
#
# DARWIN ONLY: -Wl,-no_uuid is meaningless to a mingw link, and the same
# rust-crypter checkout cross-builds Windows - the flag must never leak into that
# link. This script refuses any non-darwin arch outright.
#
# RUSTFLAGS, not .cargo/config.toml: measured with cargo 1.97.1, an exported
# RUSTFLAGS REPLACES the config's [build] rustflags, and a [target.<triple>] table
# replaces them too - the flag is applied here so neither repo's config has to
# give up its path remaps. (Those remaps rewrite /home/jacob/... Linux paths that
# cannot occur in a macOS build.)
#
# Emits <out>/<helper-name> plus <out>/MANIFEST.txt ("<sha256>  <helper-name>"),
# which is exactly the contract mainMac() enforces: a kit with no manifest entry is
# refused, so this script always writes one.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DARWIN_LINK_ARG="-C link-arg=-Wl,-no_uuid"

RUST_CRYPTER="${RUST_CRYPTER_DIR:-$ROOT/../rust-crypter}"
ARCH="x86_64"
OUT="$ROOT/host-kit-mac"
HELPER="agent"

while [ $# -gt 0 ]; do
  case "$1" in
    --rust-crypter) RUST_CRYPTER="${2:?--rust-crypter needs a directory}"; shift 2 ;;
    --arch)         ARCH="${2:?--arch needs x86_64 or aarch64}"; shift 2 ;;
    --out)          OUT="${2:?--out needs a directory}"; shift 2 ;;
    --helper-name)  HELPER="${2:?--helper-name needs a name}"; shift 2 ;;
    -h|--help)      sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

TARGET="$ARCH-apple-darwin"
case "$TARGET" in
  *-apple-darwin) ;;
  *) echo "FATAL: $TARGET is not a darwin target - the mac lane is darwin-only" >&2; exit 1 ;;
esac
if [ ! -f "$RUST_CRYPTER/Cargo.toml" ]; then
  echo "FATAL: no rust-crypter checkout at $RUST_CRYPTER (pass --rust-crypter <dir>)" >&2
  exit 1
fi

echo "== helper: app-update-daemon  target=$TARGET  source=$RUST_CRYPTER"
echo "== RUSTFLAGS=$DARWIN_LINK_ARG (darwin only: the arm64 LC_UUID is a build-path hash)"
( cd "$RUST_CRYPTER" && RUSTFLAGS="${RUSTFLAGS:+$RUSTFLAGS }$DARWIN_LINK_ARG" \
    cargo build --release --target "$TARGET" -p app-update-core --bin app-update-daemon )

BIN="$RUST_CRYPTER/target/$TARGET/release/app-update-daemon"
[ -f "$BIN" ] || { echo "FATAL: $BIN missing after the build" >&2; exit 1; }
if otool -l "$BIN" | grep -q LC_UUID; then
  echo "FATAL: the helper carries an LC_UUID - the darwin link arg did not apply" >&2
  exit 1
fi

mkdir -p "$OUT"
cp "$BIN" "$OUT/$HELPER"
SHA="$(shasum -a 256 "$OUT/$HELPER" | awk '{print $1}')"
SIZE="$(stat -f %z "$OUT/$HELPER")"
printf '%s  %s\n' "$SHA" "$HELPER" > "$OUT/MANIFEST.txt"

codesign --verify --strict "$OUT/$HELPER" >/dev/null 2>&1 && SIG="codesign-verify=ok" || SIG="codesign-verify=none(pre-sign)"
echo "== kit: $OUT"
echo "   $HELPER  sha256=$SHA size=$SIZE LC_UUID=0 $SIG"
echo "   MANIFEST.txt: $(cat "$OUT/MANIFEST.txt")"
echo "== next: HOST_KIT_DIR=$OUT npm run dist:mac"
echo MAC_HELPER_KIT_DONE
