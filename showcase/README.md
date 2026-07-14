# DeskBuddies showcase source

This directory contains privacy-reviewed, genuine captures of the current DeskBuddies Electron app. Approved source media lives under `captures/raw`; downstream edited stills and videos belong under `exports`.

See [`captures/manifest.md`](captures/manifest.md) for provenance, acceptance notes, and technical metadata.
Use [`media-checksums.sha256`](media-checksums.sha256) to verify every retained
PNG, JPEG, WAV, and MP4 after copying the media separately from the source
patch.

## Screenshot exports

The screenshots below are deterministic editorial layouts built only from the privacy-reviewed sources in `captures/raw`. App UI and companion artwork remain genuine source pixels; no UI, pet, or behavior was generated or reconstructed. The compact and expanded dock features deliberately place verified dock crops over the verified staged desktop and are editorial compositions, not single native screenshots.

| Export | Verified source(s) | Composition type | Dimensions | Bytes | SHA-256 |
|---|---|---|---:|---:|---|
| `exports/screenshots/deskbuddies-01-hero.png` | `hero-desktop-mochi-biscuit.png` | Genuine desktop still with editorial typography | 1920×1080 | 598,522 | `8ddd0bc971879f6372edb9a5fd5baf4b8d35b544dd19c2bcb253c99f76eb4302` |
| `exports/screenshots/deskbuddies-01-hero-web.png` | Same as original | Compressed web copy | 1600×900 | 562,937 | `806c392e22c54de1f379e0004c36e4130ca5edf19230ee572b1d2a03db65a0e9` |
| `exports/screenshots/deskbuddies-02-panel.png` | `hero-desktop-mochi-biscuit.png`; `expanded-panel-two-column-selector.png` | Editorial feature composition | 1920×1080 | 407,892 | `efccda70eff810c6d6c1b47b5033ec0f2cbb057689315f8db622fb5f9d72a046` |
| `exports/screenshots/deskbuddies-02-panel-web.png` | Same as original | Compressed web copy | 1600×900 | 384,513 | `8dd58b401953b043c987c012236795187a9ff96ac724b184fbcf410b5ddc6e3a` |
| `exports/screenshots/deskbuddies-03-compact-dock.png` | `hero-desktop-mochi-biscuit.png`; `compact-right-dock.png` | Editorial dock composition; not a native screenshot | 1920×1080 | 358,614 | `786efd25822ac9f9d699a26478e810912f8c9d528ebcf3cd7602d2d5b87dee38` |
| `exports/screenshots/deskbuddies-03-compact-dock-web.png` | Same as original | Compressed web copy | 1600×900 | 366,985 | `7670228193229dbad1c068c01c40497105426fadd590c5428ed802e5072b11f2` |
| `exports/screenshots/deskbuddies-04-hover-dock.png` | `hero-desktop-mochi-biscuit.png`; `expanded-hover-right-dock.png` | Editorial dock composition; not a native screenshot | 1920×1080 | 327,419 | `f05ae09a1f61cb46152111b7da34430aa651b780baaf7af0d1f6c99ec622ee6a` |
| `exports/screenshots/deskbuddies-04-hover-dock-web.png` | Same as original | Compressed web copy | 1600×900 | 390,693 | `88355e36c044d4f7999f6009f90162f2b386ac5c732b11b60feca11a82bc54a6` |
| `exports/screenshots/deskbuddies-05-grounded-follow.png` | `grounded-follow.png` | Genuine state still with editorial frame/crop | 1920×1080 | 489,969 | `df02e27e1c39eefa218fe820b6a22c91b6caf63024717398273db2c07abf5814` |
| `exports/screenshots/deskbuddies-05-grounded-follow-web.png` | Same as original | Compressed web copy | 1600×900 | 446,257 | `6502fde88c836798a1a2aa7ece1318fbfb4eaf2a1ec3d507c46e40dacd4e3b69` |
| `exports/screenshots/deskbuddies-06-cat-varieties.png` | `expanded-panel-two-column-selector.png`; `cat-closeup-mochi.png`; `cat-closeup-biscuit-cream-orange.png` | Editorial triptych of genuine renderer/desktop stills | 1920×1080 | 168,258 | `c02f7d4790df545bea1dd0205c26732e6d67f3a0b863f8ae59cc1195a2d6aebf` |
| `exports/screenshots/deskbuddies-06-cat-varieties-web.png` | Same as original | Compressed web copy | 1600×900 | 265,982 | `5dcc00fd0d20e5d94fc337cf3adad98ca05908ce29cd444b0e7ce5b28d552085` |

## Landscape showcase

`exports/video/deskbuddies-showcase-1080p.mp4` is the full 33.5-second product
showcase with the original DeskBuddies instrumental.

| Export | Dimensions | Duration | Video | Audio | Bytes | SHA-256 |
|---|---:|---:|---|---|---:|---|
| `exports/video/deskbuddies-showcase-1080p.mp4` | 1920×1080 | 33.500 s | H.264, `yuv420p`, 30 fps, 1,005 frames | AAC stereo, 48 kHz | 7,357,024 | `6d66cab625a0dbd53851fc6cc1be91cc1e68cdcb7dfcde8b97e9444d43595933` |

## Social video exports

The social masters are purpose-designed 18-second adaptations of the approved
seven-beat story, not crops of the landscape MP4. Both use the retained
normalized instrumental, trimmed to the social runtime with a restrained final
audio fade. Text remains inside aspect-specific safe frames, and genuine app
captures are shown inside uncropped editorial cards.

| Export | Recommended use | Dimensions | Duration | Bytes | SHA-256 |
|---|---|---:|---:|---:|---|
| `exports/video/deskbuddies-showcase-vertical.mp4` | Reels, Shorts, TikTok, vertical product stories | 1080×1920 | 18.000 s | 4,121,808 | `b71f86d2259c0d2e70647f1e1a09ccd33fba954b76224d52a021639b337de943` |
| `exports/video/deskbuddies-showcase-square.mp4` | Feed posts, README/social embeds, square product cards | 1080×1080 | 18.000 s | 3,579,908 | `a34c9df6b20ba262a857ad3cdde22fa394480311b9ca2f133c749b257d63e238` |

Both exports explicitly label held gait as no-travel evidence, show the selector
as a settled state with no click, disclose the dock comparison as editorial with
no auto-dock claim, retain the Grounded Follow floor line, and identify Biscuit
as cream-orange with complete ears. Aspect-specific contact sheets and seven
hero frames per master are retained under `exports/video/qa/`. In the Grounded
Follow beat, an opaque, labeled capture note covers only the source cursor glow;
the pets, fountain, and desktop floor line remain visible.

## Silent UI demo

`exports/video/deskbuddies-ui-demo-silent.mp4` is a purpose-built, UI-led
24-second cut rather than an audio-stripped showcase master. It uses only the
four primary labels `Companions`, `Docked when you want it`, `Grounded follow`,
and `DeskBuddies`, with small evidence disclosures where a settled-state edit
needs clarification.

| Export | Dimensions | Duration | Video | Audio streams | Bytes | SHA-256 |
|---|---:|---:|---|---:|---:|---|
| `exports/video/deskbuddies-ui-demo-silent.mp4` | 1920×1080 | 24.000 s | H.264, `yuv420p`, 30/1 fps, 720 frames | 0 | 2,539,603 | `574c607e7c6362ada2b920341200dec8ae8ff652dee7346edee95b7ea61dd1c3` |

The demo shows genuine held-gait footage without claiming positional travel, a
clean settled selector without a click or action claim, an explicitly editorial
comparison of genuine compact and expanded dock states, and genuine Grounded
Follow footage with the floor line retained. Encoded hero frames and a 12-frame
contact sheet are retained under `exports/video/qa/` with the `silent-` prefix.
Six additional encoded frames prove the neutral 16.7–17.0-second handoff and
the atomic Follow capture/mask reveal.
