// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Overlay } from "./Overlay";
import { getSummonedCompanions } from "./companionState";
import { initialCompanionState, initialSettings } from "./data";

const simulation = vi.hoisted(() => ({
  beginDrag: vi.fn(), dragPet: vi.fn(), endDrag: vi.fn(), command: vi.fn(), react: vi.fn(), x: 100,
  refresh: null as null | (() => void)
}));

vi.mock("./overlay/useCompanionSimulation", () => ({
  useCompanionSimulation: () => ({
    runtime: [{ id: "mochi", x: simulation.x, y: 100, direction: 1, behavior: "idle" }],
    runtimeMap: new Map([["mochi", { id: "mochi", x: simulation.x, y: 100, direction: 1, behavior: "idle" }]]),
    ...simulation,
    command: simulation.command,
    come: vi.fn(), placeAt: vi.fn(), resetPositions: vi.fn()
  })
}));

const snapshot = {
  companions: getSummonedCompanions(initialCompanionState.companions).slice(0, 1),
  settings: { ...initialSettings, fountain: { ...initialSettings.fountain, enabled: false } }
};

function pointer(type: string, init: Record<string, number> = {}) {
  const event = new PointerEvent(type, {
    bubbles: true, clientX: init.clientX ?? 120, clientY: init.clientY ?? 120,
    pointerId: init.pointerId ?? 1, buttons: init.buttons ?? 1
  });
  Object.defineProperties(event, {
    pointerId: { value: init.pointerId ?? 1 },
    buttons: { value: init.buttons ?? 1 }
  });
  return event;
}

async function renderOverlay() {
  const interactive = vi.fn();
  const hide = vi.fn();
  (window as unknown as { deskBuddies: unknown }).deskBuddies = {
    onSnapshot: (callback: (value: unknown) => void) => {
      simulation.refresh = () => callback({ ...snapshot });
      callback(snapshot);
      return () => undefined;
    },
    requestSnapshot: vi.fn(), setOverlayInteractive: interactive, requestHidePet: hide
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<Overlay />));
  const pet = container.querySelector<HTMLButtonElement>(".overlay-pet")!;
  pet.setPointerCapture = vi.fn();
  pet.releasePointerCapture = vi.fn();
  pet.hasPointerCapture = vi.fn(() => true);
  await act(async () => pet.dispatchEvent(pointer("pointerdown")));
  return { container, root, pet, interactive, hide };
}

async function unmount(root: Root, container: HTMLElement) {
  await act(async () => root.unmount());
  container.remove();
}

beforeEach(() => {
  if (!(globalThis as { PointerEvent?: unknown }).PointerEvent) {
    class TestPointerEvent extends MouseEvent {
      readonly pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    }
    vi.stubGlobal("PointerEvent", TestPointerEvent);
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  simulation.x = 100;
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});
afterEach(() => vi.useRealTimers());

describe("Overlay drag recovery", () => {
  it.each(["pointerup", "pointercancel"])("shares idempotent cleanup for window %s and element duplicates", async (type) => {
    const view = await renderOverlay();
    await act(async () => {
      window.dispatchEvent(pointer(type, { buttons: 0 }));
      view.pet.dispatchEvent(pointer(type, { buttons: 0 }));
    });
    expect(simulation.endDrag).toHaveBeenCalledOnce();
    expect(view.interactive).toHaveBeenLastCalledWith(false);
    await unmount(view.root, view.container);
  });

  it("recovers on lost pointer capture and suppresses its duplicate click", async () => {
    const view = await renderOverlay();
    await act(async () => {
      view.pet.dispatchEvent(pointer("lostpointercapture", { buttons: 0 }));
      view.pet.click();
    });
    expect(simulation.endDrag).toHaveBeenCalledOnce();
    expect(simulation.react).not.toHaveBeenCalled();
    await unmount(view.root, view.container);
  });

  it("treats implicit lost capture after pointerup as a duplicate and preserves the click", async () => {
    const view = await renderOverlay();
    await act(async () => {
      window.dispatchEvent(pointer("pointerup", { pointerId: 1, buttons: 0 }));
      view.pet.dispatchEvent(pointer("lostpointercapture", { pointerId: 1, buttons: 0 }));
      view.pet.click();
    });
    expect(simulation.endDrag).toHaveBeenCalledOnce();
    expect(simulation.react).toHaveBeenCalledOnce();
    expect(view.pet.hasPointerCapture).toHaveBeenCalledWith(1);
    expect(view.pet.releasePointerCapture).toHaveBeenCalledWith(1);
    await unmount(view.root, view.container);
  });

  it("recovers when movement reports no held button", async () => {
    const view = await renderOverlay();
    await act(async () => window.dispatchEvent(pointer("pointermove", { buttons: 0 })));
    expect(simulation.endDrag).toHaveBeenCalledOnce();
    expect(view.interactive).toHaveBeenLastCalledWith(false);
    await unmount(view.root, view.container);
  });

  it("ignores terminal events from an unrelated pointer", async () => {
    const view = await renderOverlay();
    await act(async () => {
      window.dispatchEvent(pointer("pointermove", { pointerId: 2, buttons: 0 }));
      window.dispatchEvent(pointer("pointerup", { pointerId: 2, buttons: 0 }));
      window.dispatchEvent(pointer("pointercancel", { pointerId: 2, buttons: 0 }));
    });
    expect(simulation.endDrag).not.toHaveBeenCalled();
    await act(async () => window.dispatchEvent(pointer("pointerup", { pointerId: 1, buttons: 0 })));
    expect(simulation.endDrag).toHaveBeenCalledOnce();
    await unmount(view.root, view.container);
  });

  it("does not let an unrelated pointer replace active drag terminal coordinates", async () => {
    Object.defineProperties(window, {
      innerWidth: { configurable: true, value: 800 },
      innerHeight: { configurable: true, value: 600 }
    });
    const view = await renderOverlay();
    await act(async () => {
      window.dispatchEvent(pointer("pointermove", { pointerId: 1, clientX: 220, clientY: 220, buttons: 1 }));
      window.dispatchEvent(pointer("pointermove", { pointerId: 2, clientX: 760, clientY: 560, buttons: 1 }));
      window.dispatchEvent(pointer("pointerup", { pointerId: 1, clientX: 220, clientY: 220, buttons: 0 }));
    });
    expect(simulation.dragPet).toHaveBeenLastCalledWith(220, 220);
    expect(view.hide).not.toHaveBeenCalled();
    expect(simulation.endDrag).toHaveBeenCalledOnce();
    await unmount(view.root, view.container);
  });

  it("skips only the cleanup render then resumes stationary-pointer box reevaluation", async () => {
    vi.useFakeTimers();
    const view = await renderOverlay();
    await act(async () => {
      window.dispatchEvent(pointer("pointermove", { pointerId: 1, buttons: 1 }));
      window.dispatchEvent(pointer("pointerup", { pointerId: 1, buttons: 0 }));
    });
    expect(view.interactive).toHaveBeenLastCalledWith(false);

    simulation.x = 110;
    await act(async () => simulation.refresh?.());
    expect(view.interactive).toHaveBeenLastCalledWith(true);

    simulation.x = 500;
    await act(async () => simulation.refresh?.());
    await act(async () => vi.advanceTimersByTime(120));
    expect(view.interactive).toHaveBeenLastCalledWith(false);
    await unmount(view.root, view.container);
  });

  it("preserves click, double-click, and held-movement toss velocity", async () => {
    const view = await renderOverlay();
    await act(async () => {
      window.dispatchEvent(pointer("pointerup", { pointerId: 1, buttons: 0 }));
      view.pet.click();
    });
    expect(simulation.react).toHaveBeenCalledOnce();
    await act(async () => {
      view.pet.dispatchEvent(pointer("pointerdown", { pointerId: 1 }));
      window.dispatchEvent(pointer("pointerup", { pointerId: 1, buttons: 0 }));
      view.pet.click();
    });
    expect(simulation.command).toHaveBeenCalledWith("jump", ["mochi"]);
    await act(async () => {
      view.pet.dispatchEvent(pointer("pointerdown", { pointerId: 1, clientX: 120 }));
      window.dispatchEvent(pointer("pointermove", { pointerId: 1, clientX: 180, buttons: 1 }));
      window.dispatchEvent(pointer("pointerup", { pointerId: 1, clientX: 180, buttons: 0 }));
    });
    const [vx] = simulation.endDrag.mock.calls.at(-1)!;
    expect(vx).toBeGreaterThan(0);
    await unmount(view.root, view.container);
  });

  it("recovers on blur, hidden page, and unmount", async () => {
    const blurred = await renderOverlay();
    await act(async () => window.dispatchEvent(new Event("blur")));
    expect(simulation.endDrag).toHaveBeenCalledTimes(1);
    await unmount(blurred.root, blurred.container);

    const hidden = await renderOverlay();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(simulation.endDrag).toHaveBeenCalledTimes(2);
    await unmount(hidden.root, hidden.container);

    const mounted = await renderOverlay();
    await unmount(mounted.root, mounted.container);
    expect(simulation.endDrag).toHaveBeenCalledTimes(3);
    expect(mounted.interactive).toHaveBeenLastCalledWith(false);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  it.each(["blur", "hidden"])("keeps click-through after %s until a real visible pointer move", async (reason) => {
    const view = await renderOverlay();
    if (reason === "hidden") {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    } else {
      await act(async () => window.dispatchEvent(new Event("blur")));
    }
    simulation.x = 110;
    await act(async () => simulation.refresh?.());
    simulation.x = 111;
    await act(async () => simulation.refresh?.());
    expect(view.interactive).toHaveBeenLastCalledWith(false);

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(pointer("pointermove", { clientX: 120, clientY: 120, buttons: 0 }));
    });
    expect(view.interactive).toHaveBeenLastCalledWith(true);
    await unmount(view.root, view.container);
  });

  it("watchdog recovers after 1,500 ms", async () => {
    vi.useFakeTimers();
    const view = await renderOverlay();
    await act(async () => vi.advanceTimersByTime(1_500));
    expect(simulation.endDrag).toHaveBeenCalledOnce();
    expect(view.interactive).toHaveBeenLastCalledWith(false);
    await unmount(view.root, view.container);
  });

  it("hides a trash drop once despite duplicate releases and click", async () => {
    Object.defineProperties(window, { innerWidth: { configurable: true, value: 800 }, innerHeight: { configurable: true, value: 600 } });
    const view = await renderOverlay();
    await act(async () => {
      window.dispatchEvent(pointer("pointermove", { clientX: 760, clientY: 560, buttons: 1 }));
      window.dispatchEvent(pointer("pointerup", { clientX: 760, clientY: 560, buttons: 0 }));
      view.pet.dispatchEvent(pointer("pointerup", { clientX: 760, clientY: 560, buttons: 0 }));
      view.pet.click();
    });
    expect(view.hide).toHaveBeenCalledOnce();
    expect(simulation.endDrag).toHaveBeenCalledOnce();
    expect(simulation.react).not.toHaveBeenCalled();
    await unmount(view.root, view.container);
  });
});
