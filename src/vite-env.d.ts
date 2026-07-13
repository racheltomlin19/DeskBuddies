/// <reference types="vite/client" />

import type { OverlaySnapshot } from "./shared/overlayBridge";
import type { Behavior, PopoutTab } from "./types";

export interface OverlayCommand {
  behavior: Behavior;
  target: "selected" | "all";
  id?: string;
  hold?: boolean;
  /** "place": drop the pet at x/y. "resetPositions": re-lay out all pets. */
  action?: "place" | "resetPositions";
  x?: number;
  y?: number;
}

export interface SpawnDropResult {
  outside: boolean;
  x?: number;
  y?: number;
}

export interface PanelDockState {
  dockSide: "left" | "right" | null;
  collapsed: boolean;
}

declare global {
  interface Window {
    deskBuddies?: {
      minimize: () => Promise<void>;
      minimizeToTray: () => Promise<void>;
      close: () => Promise<void>;
      quit: () => Promise<void>;
      setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
      setLaunchAtLogin: (enabled: boolean) => Promise<boolean>;
      getPanelDockState?: () => Promise<PanelDockState>;
      setPanelCollapsed?: (collapsed: boolean) => Promise<PanelDockState>;
      undockPanel?: () => Promise<PanelDockState>;
      dockPanel?: (side: "left" | "right") => Promise<PanelDockState>;
      onPanelDockState?: (callback: (state: PanelDockState) => void) => () => void;
      pushSnapshot: (snapshot: OverlaySnapshot) => void;
      requestSnapshot: () => void;
      onSnapshot: (callback: (snapshot: unknown) => void) => () => void;
      onSnapshotRequested: (callback: () => void) => () => void;
      setOverlayInteractive: (interactive: boolean) => void;
      setFollow: (active: boolean) => void;
      onCursor: (callback: (point: { x: number; y: number } | null) => void) => () => void;
      pushCommand: (command: OverlayCommand) => void;
      onCommand: (callback: (command: OverlayCommand) => void) => () => void;
      onTrayToggleFollow: (callback: (enabled: boolean) => void) => () => void;
      openPopout?: (tab: PopoutTab) => void;
      broadcastStorage?: (key: string, value: string) => void;
      onStorageSync?: (callback: (payload: { key: string; value: string }) => void) => () => void;
      dropPetAtCursor?: () => Promise<SpawnDropResult>;
      requestHidePet?: (id: string) => void;
      onHidePet?: (callback: (id: string) => void) => () => void;
    };
  }
}

export {};
