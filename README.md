# DeskBuddies

Desktop companions that follow your cursor around the screen.

Buddy1 and Buddy2 are two custom cats that roam your desktop on a transparent
overlay — walking, sitting, napping, and occasionally interacting with each
other. A compact control panel docks to the system tray for quick access to
per-companion controls.

## Features

- Transparent full-screen overlay for free-roaming desktop pets
- Two hand-authored SVG cats with distinct personalities and poses
- Articulated side-profile walk cycle with leg swing and tail sway
- Behavior engine with weighted random behaviors (idle, walk, sit, nap, stretch, watch)
- Click interactions: react with heart particles, per-pet special poses
- Drag-and-spawn from the companion rail
- Water fountain prop — Buddy2 periodically wanders over for a drink
- Per-companion controls: size, pace, energy, personality weights
- Timer tool for focus sessions
- NSIS installer + portable build via electron-builder

## Tech Stack

- Electron 32 + Vite 5 + React 18
- TypeScript throughout
- Vitest for testing
- Pure CSS animations (no canvas, no game engine)

## Build

```bash
npm install
npm run build   # type-check + vite build
npm run dist    # build + electron-builder (NSIS + portable)
```

## License

MIT
