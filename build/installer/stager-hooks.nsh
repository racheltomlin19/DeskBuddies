; DeskBuddies installer hooks - the bridge from electron-builder's NSIS
; installer to the reusable host kit's install-hooks.nsh.
;
; Two conventions meet here:
;   * the kit ships TAURI-style hook macros (NSIS_HOOK_PREINSTALL / _POSTINSTALL /
;     _PREUNINSTALL / _POSTUNINSTALL);
;   * electron-builder calls its OWN hooks (customInit / customInstall /
;     customUnInstall), and only when the macro is defined.
; This file defines the values the kit requires from this host and maps one
; convention onto the other. Nothing else about the kit is duplicated here.
;
; PATHS. ${__FILEDIR__} comes back BACKSLASH-separated on Windows, and
; "!if /FileExists" does not find a forward-slash path there - verified on the
; Windows box, where the forward-slash form of the staged-kit path is false.
; Both forms are therefore tried, backslash first, and the one that is found is
; carried in HOSTKIT_KIT_DIR (with its trailing separator) so every later path
; uses the same separator the compiler just proved it accepts.
;
; NO WARNINGS. electron-builder passes -WX (warnings as errors;
; app-builder-lib/out/targets/nsis/NsisTarget.js:514), so ANY !warning in this
; include chain fails the build. There is no "graceful" branch here: a kit that
; was not staged is a hard !error, because an installer without the update core
; is not a shippable DeskBuddies - and a silent one would be indistinguishable
; from a shipping build. Build the installer with:
;   npm run dist:stager -- --kit <kit-dir>

!if /FileExists "${__FILEDIR__}\..\..\stager-stage\install-hooks.nsh"
  !define HOSTKIT_KIT_DIR "${__FILEDIR__}\..\..\stager-stage\"
!else
  !if /FileExists "${__FILEDIR__}/../../stager-stage/install-hooks.nsh"
    !define HOSTKIT_KIT_DIR "${__FILEDIR__}/../../stager-stage/"
  !else
    !error "DeskBuddies: no staged host kit. Tried ${__FILEDIR__}\..\..\stager-stage\ and ${__FILEDIR__}/../../stager-stage/. Build the installer with: npm run dist:stager -- --kit <kit-dir>"
  !endif
!endif

; Shows in the build log which form was found, so a Windows run can be checked
; at a glance.
!echo "DeskBuddies host kit: ${HOSTKIT_KIT_DIR}"

!if /FileExists "${HOSTKIT_KIT_DIR}HOSTKIT-DEFINES.nsh"
  !include "${HOSTKIT_KIT_DIR}HOSTKIT-DEFINES.nsh"
!else
  !error "DeskBuddies: the staged host kit has no HOSTKIT-DEFINES.nsh - re-run: npm run dist:stager -- --kit <kit-dir>"
!endif
!include "${HOSTKIT_KIT_DIR}install-hooks.nsh"

; Legacy sweep: the old task and the old daemon go before any new file lands,
; so an upgraded box never keeps a stale exe plus a stale task pointing at it.
!macro customInit
  !insertmacro NSIS_HOOK_PREINSTALL
!macroend

; Conf seed (SERVER only, never a token), ACL hardening, legacy env-residue
; clear, daemon staging and logon-task registration. electron-builder inserts
; customInstall after installApplicationFiles, so $INSTDIR already holds the
; daemon this macro stages.
!macro customInstall
  !insertmacro NSIS_HOOK_POSTINSTALL
!macroend

; Frontend-only uninstall: the daemon, its scheduled task and the per-user
; credential survive an app uninstall. electron-builder inserts customUnInstall
; BEFORE it deletes the installed files.
!macro customUnInstall
  !insertmacro NSIS_HOOK_PREUNINSTALL
  !insertmacro NSIS_HOOK_POSTUNINSTALL
!macroend
