# DeskBuddies showcase capture manifest

## Provenance

- Source commit: `01c4a2e0df64ed0d5ed8f92a4a8d9c383e89db6a`
- Capture date/time zone: 2026-07-13, America/Chicago (UTC-05:00)
- Launch: Vite dev server plus Electron 32 from this worktree
- Display: 2560×1440 physical at 96 DPI / 100%; overlay work area 2560×1392 at `(0,0)`
- Method: genuine Electron panel/overlay state, native UI interaction, FFmpeg `gdigrab` for desktop media, and CDP `Page.captureScreenshot` for clean renderer-native panel stills; PNG stills and H.264/yuv420p MP4s
- Dock stills: the compact source preserves native screen pixels at 80×1392. The expanded source is a renderer-native 350×1392 screenshot captured only after a real rail control retained focus, `.app-shell.docked.expanded` was present, and the live render viewport reported 350 px.
- Privacy/authenticity: originals and video contact frames were reviewed. No retained source contains usernames, notifications, files, terminals, browser content, secrets, or fabricated UI.

## Retained sources

Video rate values are exact FFprobe values (`nominal / average`); timestamps are filesystem capture completion times.

| File | Captured (UTC-05:00) | Dimensions / duration / FPS | SHA-256 | Use / review note |
|---|---|---|---|---|
| `raw/cat-closeup-biscuit-cream-orange.mp4` | `2026-07-13T16:26:38.6454196-05:00` | 2560×1392; 6.000 s; 30/1 / 89/3; 178 frames | `67980ce292421c13f6da57749a18d4ae796174c20bab7c3096efea9437cfd4a7` | Biscuit detail-card clip with corrected cream/orange tabby appearance and live overlay cats. |
| `raw/cat-closeup-biscuit-cream-orange.png` | `2026-07-13T18:25:43.1281475-05:00` | 350×720 PNG, renderer-native | `e9c70304629117c91dfc4f54a5edda276aae75bfc0715545b7458a1472e69510` | Clean CDP `Page.captureScreenshot` at 100% / DPR 1 and workspace scrollTop 690; complete cream-orange portrait including both ear tips, identity, and primary controls; no pointer pixels. |
| `raw/cat-closeup-mochi.mp4` | `2026-07-13T16:25:10.2307666-05:00` | 2560×1392; 6.000 s; 30/1 / 59/2; 177 frames | `cd7f9222e7e6f77a37e8fdfce1aa51b9fb9e4dee6b5a37b3e7b1b9c19a07b36b` | Mochi detail-card clip and live overlay cats. |
| `raw/cat-closeup-mochi.png` | `2026-07-13T18:25:44.5556319-05:00` | 350×720 PNG, renderer-native | `c52e2e6069a92de4a7b3c0c1b29ed778fc9436637a60d8cac180d9b7389d4cf9` | Clean CDP `Page.captureScreenshot` at 100% / DPR 1 and workspace scrollTop 690; complete portrait including both ear tips, identity, and primary controls; no pointer pixels. |
| `raw/compact-right-dock.png` | `2026-07-13T16:44:20.8116348-05:00` | 80×1392 PNG, native crop | `0391c0deb139a02e9d576873657779c1f574bed35867e4185a660f6c823f719b` | Unclipped compact right rail. |
| `raw/expanded-hover-right-dock.png` | `2026-07-13T17:33:47.2650404-05:00` | 350×1392 PNG, renderer-native | `5403a1aaf1bbf0fb547341be670b4ab3104b90fc1da5147029e294d83b468d85` | Clean expanded dock after the dock-header fit fix; focus-driven expanded state and 350 px viewport were verified before capture. |
| `raw/expanded-panel-two-column-selector.png` | `2026-07-13T17:24:46.8893035-05:00` | 350×720 PNG, renderer-native | `3a91485d4d9b3a9d20fffeeea4263d773573b05e4d55b480b6bbb7d5084a6595` | Approved settled-state promotional source for the two-column companion selector and tools panel; no pointer tooltip is present. |
| `raw/grounded-follow.mp4` | `2026-07-13T16:30:49.1290093-05:00` | 2560×1392; 8.000 s; 30/1 / 59/2; 236 frames | `482d6572dbae3851a6b7cdf4033484e7f4a844974e64c8d6fe4b0f187f45d0ae` | Ground-follow mode evidence; cats remain grounded near the target. |
| `raw/grounded-follow.png` | `2026-07-13T16:30:40.0721512-05:00` | 2560×1392 PNG | `fb31478dc2c60290ad40a8fee802f70859614f0d089fa5d01dbb6a80c2c3368b` | Ground-follow settled state. |
| `raw/hero-desktop-mochi-biscuit.png` | `2026-07-13T16:28:42.1368712-05:00` | 2560×1392 PNG | `571686b969fafaa3d6019f32e87adc4477f983129e3d3b970188329144dfad1a` | Clean desktop hero with Mochi, corrected Biscuit, and fountain. |
| `raw/walk-cycle-mochi-biscuit.mp4` | `2026-07-13T16:28:40.8933692-05:00` | 2560×1392; 12.000 s; 30/1 / 89/3; 356 frames | `6b5f77c5419f9822bf51998e53a8ae236ffa3f49497f59665b6e225a237c5689` | Held-walk gait/pose animation; explicitly not positional travel evidence. |

## Rejected takes

Rejected earlier takes (`selector-navigation-hover.mp4`, `selector-state-change-patch.mp4`, `cat-closeups-mochi-biscuit.mp4`, and all dock-transition attempts) were removed rather than presented as current evidence. The rejected Patch clip never left the Hidden state and retained a title tooltip, so no selector-click footage exists. No genuine dock-transition footage is retained; downstream edits must compare the genuine settled-state PNGs with an explicitly editorial cut or crossfade.

## Verification scope

- Every retained file has a nonzero SHA-256 and readable FFprobe stream.
- The source revision includes the canonical-appearance migration and identity-heading layout fix exercised by these captures.
- Video average rates vary slightly below the 30 fps acquisition target because desktop capture uses variable delivery; exact nominal and average rates above are not rounded.
