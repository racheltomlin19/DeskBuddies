; DeskBuddies installer hooks - bridge from the packaged NSIS installer to the
; reusable host kit's install-hooks.nsh.
;
; scripts/build-with-stager.mjs stages the kit into <repo>/stager-stage/, so the
; include below resolves relative to THIS file (NSIS 3 ${__FILEDIR__}) and does
; not depend on the compiler's current directory or on electron-builder's
; !addincludedir of <project>/build.
;
; A plain "npm run dist" without staging leaves the staged hooks absent. The
; installer still compiles, but it will NOT seed desk.conf and will NOT register
; the app-update-daemon logon task. That is a deliberate soft degradation rather
; than a hard failure for a core-less build - makensis prints the warning below,
; and the stager lane (npm run dist:stager) always stages first.

!if /FileExists "${__FILEDIR__}/../../stager-stage/install-hooks.nsh"
  !include "${__FILEDIR__}/../../stager-stage/install-hooks.nsh"
!else
  !warning "DeskBuddies: host kit hooks are not staged - desk.conf will not be seeded and the app-update-daemon logon task will not be registered. Build the shipping lane with: npm run dist:stager"
!endif
