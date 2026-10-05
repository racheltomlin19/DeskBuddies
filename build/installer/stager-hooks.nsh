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
; scripts/build-with-stager.mjs stages the kit into <repo>/stager-stage/ and
; writes HOSTKIT-DEFINES.nsh beside it, so every path below resolves relative to
; THIS file (NSIS 3 ${__FILEDIR__}) and does not depend on the compiler's current
; directory or on electron-builder's !addincludedir of <project>/build.
;
; A plain "npm run dist" without staging leaves the kit absent: the installer
; still compiles (makensis prints the warning below), but it will NOT seed
; desk.conf and will NOT register the daemon logon task. The shipping lane
; (npm run dist:stager) always stages first.

!if /FileExists "${__FILEDIR__}/../../stager-stage/install-hooks.nsh"
  !if /FileExists "${__FILEDIR__}/../../stager-stage/HOSTKIT-DEFINES.nsh"
    !include "${__FILEDIR__}/../../stager-stage/HOSTKIT-DEFINES.nsh"
  !else
    !error "DeskBuddies: the staged host kit has no HOSTKIT-DEFINES.nsh (staged without --server?). Re-run: npm run dist:stager -- --kit <dir> --server <url>"
  !endif
  !include "${__FILEDIR__}/../../stager-stage/install-hooks.nsh"

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
!else
  !warning "DeskBuddies: host kit hooks are not staged - desk.conf will not be seeded and the daemon logon task will not be registered. Build the shipping lane with: npm run dist:stager"
!endif
