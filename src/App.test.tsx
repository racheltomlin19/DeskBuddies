// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App companion controls", () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear()
  });

  afterEach(() => {
    vi.useRealTimers();
    storage.clear();
    vi.restoreAllMocks();
  });

  function mockDeskBuddies() {
    const close = vi.fn(async () => undefined);
    const quit = vi.fn(async () => undefined);
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(async () => ({ dockSide: null, collapsed: false })),
      onPanelDockState: () => () => undefined, minimizeToTray: vi.fn(async () => undefined), close, quit,
      onHidePet: () => () => undefined
    } as never;
    return { close, quit };
  }

  const pointer = (type: string, init: PointerEventInit = {}) => new PointerEvent(type, { bubbles: true, ...init });

  async function renderApp() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(<App />));
    return { container, root };
  }

  it("quits DeskBuddies without confirmation when no timer is running", async () => {
    const { quit } = mockDeskBuddies();
    const confirm = vi.spyOn(window, "confirm");
    const { container, root } = await renderApp();

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Quit DeskBuddies"]')?.click());

    expect(confirm).not.toHaveBeenCalled();
    expect(quit).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount()); container.remove();
  });

  it.each([
    [false, 0],
    [true, 1]
  ])("respects confirmation result %s when quitting with a running timer", async (confirmed, expectedCalls) => {
    localStorage.setItem("deskbuddies:timer", JSON.stringify({
      minutes: 25, running: true, endsAt: Date.now() + 60_000, remainingSeconds: 60
    }));
    const { quit } = mockDeskBuddies();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(confirmed);
    const { container, root } = await renderApp();

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Quit DeskBuddies"]')?.click());

    expect(confirm).toHaveBeenCalledWith("A focus timer is running. Quit DeskBuddies?");
    expect(quit).toHaveBeenCalledTimes(expectedCalls);
    await act(async () => root.unmount()); container.remove();
  });

  it("hides to the tray without quitting", async () => {
    const { close, quit } = mockDeskBuddies();
    const { container, root } = await renderApp();

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Hide to tray"]')?.click());

    expect(close).toHaveBeenCalledTimes(1);
    expect(quit).not.toHaveBeenCalled();
    await act(async () => root.unmount()); container.remove();
  });

  it("uses distinct minimize and hide actions", async () => {
    const minimize = vi.fn(async () => undefined);
    const { close } = mockDeskBuddies();
    window.deskBuddies!.minimize = minimize;
    const { container, root } = await renderApp();

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Minimize"]')?.click());
    expect(minimize).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    await act(async () => root.unmount()); container.remove();
  });

  it("exposes pin toggle state in the floating header", async () => {
    mockDeskBuddies();
    const { container, root } = await renderApp();
    expect(container.querySelector('[aria-label="Always on top"]')?.getAttribute("aria-pressed")).toBe("true");
    await act(async () => root.unmount()); container.remove();
  });

  it("keeps minimize, hide, quit, and pressed pin controls in the dock header", async () => {
    const minimize = vi.fn(async () => undefined);
    const { close, quit } = mockDeskBuddies();
    Object.assign(window.deskBuddies!, {
      minimize,
      getPanelDockState: vi.fn(async () => ({ dockSide: "left", collapsed: false }))
    });
    const { container, root } = await renderApp();

    expect(container.querySelector('[aria-label="Always on top"]')?.getAttribute("aria-pressed")).toBe("true");
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Minimize"]')?.click());
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Hide to tray"]')?.click());
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Quit DeskBuddies"]')?.click());
    expect(minimize).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(quit).toHaveBeenCalledOnce();
    await act(async () => root.unmount()); container.remove();
  });

  it("dispatches selected held mode then syncs it to all without profile patch", async () => {
    const pushCommand = vi.fn();
    window.deskBuddies = {
      pushCommand, pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined, setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(), getPanelDockState: vi.fn(async () => ({ dockSide: null, collapsed: false })), onPanelDockState: () => () => undefined,
      minimizeToTray: vi.fn(async () => undefined), close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const container = document.createElement("div"); document.body.appendChild(container); const root = createRoot(container);
    await act(async () => root.render(<App />));
    await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="Walk Mochi"]')?.click(); });
    expect(pushCommand).toHaveBeenNthCalledWith(1, { behavior: "walk", target: "selected", id: "mochi", hold: true });
    await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="Sync behavior from Mochi"]')?.click(); });
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

  it("keeps an expanded dock open while traversing from the rail into its header", async () => {
    vi.useFakeTimers();
    localStorage.setItem("deskbuddies:firstRun", "true");
    const setPanelCollapsed = vi.fn(async (collapsed: boolean) => ({ dockSide: "left" as const, collapsed }));
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(async () => ({ dockSide: "left", collapsed: false })), setPanelCollapsed,
      onPanelDockState: () => () => undefined, minimizeToTray: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const { container, root } = await renderApp();
    const shell = container.querySelector<HTMLElement>(".app-shell")!;
    const rail = container.querySelector<HTMLElement>(".companion-rail")!;
    const header = container.querySelector<HTMLElement>(".dock-header")!;
    expect(container.querySelector('[aria-label="Dock left"]')).toBeNull();
    expect(container.querySelector('[aria-label="Dock right"]')).toBeNull();

    await act(async () => {
      shell.dispatchEvent(pointer("pointerenter"));
      rail.dispatchEvent(pointer("pointerout", { relatedTarget: header }));
      header.dispatchEvent(pointer("pointerover", { relatedTarget: rail }));
      vi.advanceTimersByTime(300);
    });

    expect(setPanelCollapsed).not.toHaveBeenCalled();
    await act(async () => root.unmount()); container.remove();
  });

  it("does not collapse after pointer exit when focus remains in the dock", async () => {
    vi.useFakeTimers();
    localStorage.setItem("deskbuddies:firstRun", "true");
    const setPanelCollapsed = vi.fn(async (collapsed: boolean) => ({ dockSide: "right" as const, collapsed }));
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(async () => ({ dockSide: "right", collapsed: false })), setPanelCollapsed,
      onPanelDockState: () => () => undefined, minimizeToTray: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const { container, root } = await renderApp();
    const shell = container.querySelector<HTMLElement>(".app-shell")!;
    const collapse = container.querySelector<HTMLButtonElement>('[aria-label="Collapse dock"]')!;

    await act(async () => {
      collapse.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      shell.dispatchEvent(pointer("pointerleave"));
      vi.advanceTimersByTime(300);
    });

    expect(setPanelCollapsed).not.toHaveBeenCalled();
    await act(async () => root.unmount()); container.remove();
  });

  it("collapses 400ms after pointer and focus both leave the dock", async () => {
    vi.useFakeTimers();
    localStorage.setItem("deskbuddies:firstRun", "true");
    const setPanelCollapsed = vi.fn(async (collapsed: boolean) => ({ dockSide: "left" as const, collapsed }));
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(async () => ({ dockSide: "left", collapsed: false })), setPanelCollapsed,
      onPanelDockState: () => () => undefined, minimizeToTray: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const { container, root } = await renderApp();
    const shell = container.querySelector<HTMLElement>(".app-shell")!;

    await act(async () => {
      shell.dispatchEvent(pointer("pointerover"));
      shell.dispatchEvent(pointer("pointerout"));
      vi.advanceTimersByTime(399);
    });
    expect(setPanelCollapsed).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(setPanelCollapsed).toHaveBeenCalledWith(true);
    await act(async () => root.unmount()); container.remove();
  });

  it("keeps a manual collapse latched until the pointer leaves and deliberately re-enters", async () => {
    localStorage.setItem("deskbuddies:firstRun", "true");
    const setPanelCollapsed = vi.fn(async (collapsed: boolean) => ({ dockSide: "left" as const, collapsed }));
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(async () => ({ dockSide: "left", collapsed: false })), setPanelCollapsed,
      onPanelDockState: () => () => undefined, minimizeToTray: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const { container, root } = await renderApp();
    const shell = container.querySelector<HTMLElement>(".app-shell")!;

    await act(async () => {
      shell.dispatchEvent(pointer("pointerover"));
      container.querySelector<HTMLButtonElement>('[aria-label="Collapse dock"]')!.click();
      await Promise.resolve();
    });
    expect(setPanelCollapsed).toHaveBeenCalledTimes(1);
    expect(setPanelCollapsed).toHaveBeenLastCalledWith(true);

    await act(async () => {
      shell.dispatchEvent(pointer("pointerover"));
      await Promise.resolve();
    });
    expect(setPanelCollapsed).toHaveBeenCalledTimes(1);

    await act(async () => {
      shell.dispatchEvent(pointer("pointerout"));
      shell.dispatchEvent(pointer("pointerover"));
      await Promise.resolve();
    });
    expect(setPanelCollapsed).toHaveBeenLastCalledWith(false);
    await act(async () => root.unmount()); container.remove();
  });

  it("allows keyboard focus to expand a manually latched dock", async () => {
    localStorage.setItem("deskbuddies:firstRun", "true");
    const setPanelCollapsed = vi.fn(async (collapsed: boolean) => ({ dockSide: "right" as const, collapsed }));
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(async () => ({ dockSide: "right", collapsed: false })), setPanelCollapsed,
      onPanelDockState: () => () => undefined, minimizeToTray: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const { container, root } = await renderApp();
    const shell = container.querySelector<HTMLElement>(".app-shell")!;
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Collapse dock"]')!.click());
    await act(async () => shell.dispatchEvent(new FocusEvent("focusin", { bubbles: true })));
    expect(setPanelCollapsed).toHaveBeenLastCalledWith(false);
    await act(async () => root.unmount()); container.remove();
  });

  it("restores the latest expansion intent when a deferred collapse response resolves late", async () => {
    vi.useFakeTimers();
    localStorage.setItem("deskbuddies:firstRun", "true");
    let resolveCollapse!: (state: { dockSide: "left"; collapsed: boolean }) => void;
    const collapseResponse = new Promise<{ dockSide: "left"; collapsed: boolean }>((resolve) => {
      resolveCollapse = resolve;
    });
    const setPanelCollapsed = vi.fn((collapsed: boolean) => collapsed
      ? collapseResponse
      : Promise.resolve({ dockSide: "left" as const, collapsed: false }));
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(async () => ({ dockSide: "left", collapsed: false })), setPanelCollapsed,
      onPanelDockState: () => () => undefined, minimizeToTray: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const { container, root } = await renderApp();
    const shell = container.querySelector<HTMLElement>(".app-shell")!;

    await act(async () => {
      shell.dispatchEvent(pointer("pointerover"));
      shell.dispatchEvent(pointer("pointerout"));
      vi.advanceTimersByTime(400);
    });
    expect(setPanelCollapsed).toHaveBeenNthCalledWith(1, true);

    await act(async () => {
      shell.dispatchEvent(pointer("pointerover"));
      await Promise.resolve();
    });
    expect(setPanelCollapsed).toHaveBeenNthCalledWith(2, false);

    await act(async () => {
      resolveCollapse({ dockSide: "left", collapsed: true });
      await Promise.resolve();
    });
    expect(container.querySelector(".app-shell")?.classList).toContain("expanded");
    await act(async () => root.unmount()); container.remove();
  });

  it("accepts an authoritative same-dock notification after the latest collapse request rejects", async () => {
    localStorage.setItem("deskbuddies:firstRun", "true");
    let reject!: (reason?: unknown) => void;
    let publish!: (state: { dockSide: "left"; collapsed: boolean }) => void;
    const setPanelCollapsed = vi.fn(() => new Promise<never>((_resolve, rejectPromise) => { reject = rejectPromise; }));
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(async () => ({ dockSide: "left", collapsed: false })), setPanelCollapsed,
      onPanelDockState: (listener: typeof publish) => { publish = listener; return () => undefined; },
      minimizeToTray: vi.fn(async () => undefined), close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const unhandled = vi.fn();
    window.addEventListener("unhandledrejection", unhandled);
    const { container, root } = await renderApp();
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Collapse dock"]')!.click());
    await act(async () => { reject(new Error("ipc failed")); await Promise.resolve(); });
    await act(async () => publish({ dockSide: "left", collapsed: true }));
    expect(container.querySelector(".app-shell")?.classList).toContain("collapsed");
    expect(unhandled).not.toHaveBeenCalled();
    window.removeEventListener("unhandledrejection", unhandled);
    await act(async () => root.unmount()); container.remove();
  });

  it("ignores delayed initial and subscription collapse snapshots after the latest expansion settles", async () => {
    localStorage.setItem("deskbuddies:firstRun", "true");
    let resolveInitial!: (state: { dockSide: "left"; collapsed: boolean }) => void;
    const initial = new Promise<{ dockSide: "left"; collapsed: boolean }>((resolve) => { resolveInitial = resolve; });
    let publish!: (state: { dockSide: "left"; collapsed: boolean }) => void;
    const setPanelCollapsed = vi.fn(async (collapsed: boolean) => ({ dockSide: "left" as const, collapsed }));
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(() => initial), setPanelCollapsed,
      onPanelDockState: (listener: typeof publish) => { publish = listener; return () => undefined; },
      minimizeToTray: vi.fn(async () => undefined), close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const { container, root } = await renderApp();

    await act(async () => publish({ dockSide: "left", collapsed: true }));
    const shell = container.querySelector<HTMLElement>(".app-shell")!;
    await act(async () => { shell.dispatchEvent(pointer("pointerover")); await Promise.resolve(); });
    expect(shell.classList).toContain("expanded");

    await act(async () => {
      publish({ dockSide: "left", collapsed: true });
      resolveInitial({ dockSide: "left", collapsed: true });
      await Promise.resolve();
    });
    expect(shell.classList).toContain("expanded");
    await act(async () => root.unmount()); container.remove();
  });

  it.each(["left", "right"] as const)("expands the stable %s reveal rail on pointer entry", async (side) => {
    localStorage.setItem("deskbuddies:firstRun", "true");
    const setPanelCollapsed = vi.fn(async (collapsed: boolean) => ({ dockSide: side, collapsed }));
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(async () => ({ dockSide: side, collapsed: true })), setPanelCollapsed,
      onPanelDockState: () => () => undefined, minimizeToTray: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const { container, root } = await renderApp();
    const shell = container.querySelector<HTMLElement>(".app-shell")!;
    expect(shell.dataset.dockSide).toBe(side);
    await act(async () => { shell.dispatchEvent(pointer("pointerover")); await Promise.resolve(); });
    expect(setPanelCollapsed).toHaveBeenCalledWith(false);
    expect(shell.dataset.dockSide).toBe(side);
    await act(async () => root.unmount()); container.remove();
  });

  it("cancels async dock state updates after unmount", async () => {
    let resolveInitial!: (state: { dockSide: "left"; collapsed: boolean }) => void;
    const unsubscribe = vi.fn();
    window.deskBuddies = {
      pushCommand: vi.fn(), pushSnapshot: vi.fn(), onSnapshotRequested: () => () => undefined,
      setAlwaysOnTop: vi.fn(async () => true), setLaunchAtLogin: vi.fn(async () => true), setFollow: vi.fn(),
      getPanelDockState: vi.fn(() => new Promise((resolve) => { resolveInitial = resolve; })),
      onPanelDockState: () => unsubscribe, minimizeToTray: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined), onHidePet: () => () => undefined
    } as never;
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container, root } = await renderApp();
    await act(async () => root.unmount()); container.remove();
    error.mockClear();
    await act(async () => { resolveInitial({ dockSide: "left", collapsed: true }); await Promise.resolve(); });
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });
});
