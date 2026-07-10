# DeskBuddies 🐱

Desktop companions that follow your cursor around the screen.

Mochi and Biscuit are two custom cats that roam your desktop on a transparent
overlay — walking, sitting, napping, and occasionally interacting with each
other. A compact control panel docks to the system tray for quick access to
per-companion controls.

![DeskBuddies demo](docs/screenshots/demo.gif)

## Why?

I wanted a desktop pet that actually felt alive — not a static sprite that
sits in the corner, but something that wanders, reacts, and has a bit of
personality. Most desktop pet apps I found were either abandoned Java applets
from 2004 or bloated Electron apps with a million dependencies and no soul.

So I built one. It's just cats for now but the avatar system is extensible.

## Features

- **Transparent overlay** — full-screen, click-through, always on top. Pets roam behind your windows.
- **Two hand-authored cats** — Mochi (tuxedo, watchful) and Biscuit (orange tabby, lounger). Custom SVG, no image assets.
- **Articulated walk cycle** — side-profile rig with leg swing, tail sway, and ear twitch. Pure CSS keyframes.
- **Behavior engine** — weighted random behaviors (idle, walk, sit, nap, stretch, watch, pounce, zoomies). Each cat has its own personality profile.
- **Click interactions** — click a pet to give it a heart reaction. Drag to reposition.
- **Companion interactions** — Mochi and Biscuit cuddle when they're both resting nearby. Biscuit wanders over to the water fountain for a drink.
- **Drag-and-spawn** — pull cats from the companion rail onto the desktop. Hide and show from the tray.
- **Per-companion controls** — size, pace, energy, and personality weight sliders. Live updates.
- **Timer tool** — focus timer with task list. Because productivity.
- **Catalog companions** — 8 additional pets (capybara, elephant, raccoon, monster, etc.) to unlock and summon.
- **Fountain prop** — a little water sticker that Biscuit visits periodically.

## Screenshots

| Control Panel | Overlay |
|:---:|:---:|
| ![panel](docs/screenshots/panel.png) | ![overlay](docs/screenshots/overlay.png) |

## Tech Stack

- Electron 32 + Vite 5 + React 18
- TypeScript throughout (strict mode)
- Vitest for testing
- Pure CSS animations — no canvas, no game engine, no Three.js

## Build

```bash
npm install
npm run build   # type-check + vite build
npm run dist    # build + electron-builder (NSIS installer + portable)
```

 Requires Node 18+, npm, and for portable builds: wine if building Windows
 installers on Linux/macOS.

## Development

```bash
npm run dev      # starts vite dev server + electron
npm test         # run vitest
```

## Project Structure

```
electron/        Electron main + preload + window management
src/
  avatars/       SVG cat rigs and fountain prop
  components/    React UI components (control cards, rail, tools)
  overlay/       Overlay-specific logic (companion sim, hit testing, bounds)
  shared/        IPC bridge between panel and overlay
  App.tsx        Main app shell (tray, panel rendering)
  data.ts        Pet profiles and catalog
  behaviorEngine.ts  Weighted behavior state machine
  types.ts       Shared TypeScript types
```

## Contributing

PRs welcome. If you want to add a new companion, the easiest way is to look at
`src/data.ts` — the catalog companions show the shape. SVG avatars go in
`src/PetAvatar.tsx`.

## License

MIT — see [LICENSE](LICENSE)

## Known Issues

- On some Linux window managers the transparent overlay doesn't render correctly. Works on Windows 10/11 and macOS.
- Multi-monitor setups: pets stay on the primary monitor for now. Working on it.
- The fountain position resets on app restart.
