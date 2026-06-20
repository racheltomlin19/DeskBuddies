// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App companion controls", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("dispatches selected held mode then syncs it to all without profile patch", async () => {
    const pushCommand = vi.fn();
    window.deskBuddies = {
      pushCommand, pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined, setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(), getPanelDockState: vi.fn(async () => ({ dockSide: null, collapsed: false })), onPanelDockState: () => () => undefined,
      minimizeToTray: vi.fn(async () => undefined), close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const container = document.createElement("div"); document.body.appendChild(container); const root = createRoot(container);
    await act(async () => root.render(<App />));
    await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="Walk Buddy1"]')?.click(); });
    expect(pushCommand).toHaveBeenNthCalledWith(1, { behavior: "walk", target: "selected", id: "buddy1", hold: true });
    await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="Sync behavior from Buddy1"]')?.click(); });
    expect(pushCommand).toHaveBeenLastCalledWith({ behavior: "walk", target: "all", hold: true });
    await act(async () => root.unmount()); container.remove();
  });

  it("offers explicit left and right dock controls", async () => {
    const dockPanel = vi.fn(async (side: "left" | "right") => ({ dockSide: side, collapsed: true }));
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(async () => ({ dockSide: null, collapsed: false })),
      dockPanel, onPanelDockState: () => () => undefined,
      minimizeToTray: vi.fn(async () => undefined), close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const container = document.createElement("div"); document.body.appendChild(container); const root = createRoot(container);
    await act(async () => root.render(<App />));

    const left = container.querySelector<HTMLButtonElement>('[aria-label="Dock left"]');
    const right = container.querySelector<HTMLButtonElement>('[aria-label="Dock right"]');
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    await act(async () => left?.click());

    expect(dockPanel).toHaveBeenNthCalledWith(1, "left");
    await act(async () => root.unmount()); container.remove();
  });
});
