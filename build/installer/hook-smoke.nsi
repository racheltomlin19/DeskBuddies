; Compile-only harness for the DeskBuddies host-kit bridge.
;
; The unpacked (--dir) gate never runs makensis, so this is the cheap local proof
; that the kit's include and the electron-builder hook mapping actually expand.
; It mimics what electron-builder's templates do: call a hook only if it exists.
;
;   npm run dist:stager -- --stage-only --server https://example.invalid
;   makensis -V2 -DSMOKE_OUT=/tmp/hook-smoke.exe build/installer/hook-smoke.nsi
;
; Compiling an installer does not run it; no Windows box is involved.

!ifndef SMOKE_OUT
  !define SMOKE_OUT "hook-smoke.exe"
!endif

Name "DeskBuddies hook smoke"
OutFile "${SMOKE_OUT}"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\DeskBuddiesSmoke"

!include "${__FILEDIR__}/stager-hooks.nsh"

; Which product the kit's customer-visible progress strings will name. Printed at
; compile time because NSIS compresses the string table: it is not greppable out
; of the built installer.
!echo "host-kit product name: ${HOSTKIT_PRODUCT_NAME}"

Section "Install"
  WriteUninstaller "$INSTDIR\\uninstall.exe"

  ; electron-builder: installer.nsi (.onInit) and installSection.nsh
  !ifmacrodef customInit
    !insertmacro customInit
  !endif
  !ifmacrodef customInstall
    !insertmacro customInstall
  !endif
SectionEnd

Section "Uninstall"
  ; electron-builder: uninstaller.nsh
  !ifmacrodef customUnInstall
    !insertmacro customUnInstall
  !endif
SectionEnd
