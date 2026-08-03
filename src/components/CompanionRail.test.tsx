// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialCompanionState } from "../data";
import { CompanionRail } from "./CompanionRail";

function pointer(type: string, x: number, y: number, pointerId = 1) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(event, "pointerId", { value: pointerId });
  return event;
}

describe("CompanionRail", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    root = undefined;
    container?.remove();
    container = undefined;
  });

  async function renderRail() {
    const onSpawnDrag = vi.fn();
    const onToggleSummoned = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(<CompanionRail companions={initialCompanionState.companions} onSpawnDrag={onSpawnDrag} onToggleSummoned={onToggleSummoned} />);
    });
    return { onSpawnDrag, onToggleSummoned };
  }

  it("renders each profile as one pressed chip with name and status", async () => {
    await renderRail();
    const gus = container!.querySelector<HTMLButtonElement>('[aria-label="Hide Gus from desktop"]')!;
    const yorkie = container!.querySelector<HTMLButtonElement>('[aria-label="Summon Yorkie to desktop"]')!;

    expect(gus.tagName).toBe("BUTTON");
    expect(gus.getAttribute("aria-pressed")).toBe("true");
    expect(gus.textContent).toContain("Gus");
    expect(gus.textContent).toContain("On desktop");
    expect(yorkie.getAttribute("aria-pressed")).toBe("false");
    expect(yorkie.textContent).toContain("Hidden");
    expect(gus.querySelectorAll("svg")).toHaveLength(1);
  });

  it("toggles from chip click and keyboard activation", async () => {
    const { onToggleSummoned } = await renderRail();
    const gus = container!.querySelector<HTMLButtonElement>('[aria-label="Hide Gus from desktop"]')!;

    await act(async () => gus.click());
    gus.focus();
    await act(async () => gus.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 })));

    expect(document.activeElement).toBe(gus);
    expect(onToggleSummoned).toHaveBeenCalledTimes(2);
    expect(onToggleSummoned).toHaveBeenNthCalledWith(1, "gus", false);
  });

  it("captures portrait drag, spawns once, and suppresses the following click", async () => {
    const { onSpawnDrag, onToggleSummoned } = await renderRail();
    const portrait = container!.querySelector<HTMLElement>('[aria-label="Drag Mochi to desktop"]')!;
    const chip = portrait.closest("button")!;
    const capture = vi.fn();
    const release = vi.fn();
    portrait.setPointerCapture = capture;
    portrait.releasePointerCapture = release;

    await act(async () => {
      portrait.dispatchEvent(pointer("pointerdown", 10, 10, 7));
      portrait.dispatchEvent(pointer("pointermove", 17, 10, 7));
      portrait.dispatchEvent(pointer("pointermove", 30, 20, 7));
      portrait.dispatchEvent(pointer("pointerup", 30, 20, 7));
      chip.click();
    });

    expect(capture).toHaveBeenCalledWith(7);
    expect(release).toHaveBeenCalledWith(7);
    expect(onSpawnDrag).toHaveBeenCalledTimes(1);
    expect(onSpawnDrag).toHaveBeenCalledWith("mochi");
    expect(onToggleSummoned).not.toHaveBeenCalled();
  });

  it("does nothing on a cancelled portrait drag", async () => {
    const { onSpawnDrag, onToggleSummoned } = await renderRail();
    const portrait = container!.querySelector<HTMLElement>('[aria-label="Drag Mochi to desktop"]')!;

    await act(async () => {
      portrait.dispatchEvent(pointer("pointerdown", 10, 10));
      portrait.dispatchEvent(pointer("pointermove", 20, 20));
      portrait.dispatchEvent(pointer("pointercancel", 20, 20));
    });

    expect(onSpawnDrag).not.toHaveBeenCalled();
    expect(onToggleSummoned).not.toHaveBeenCalled();
    expect(portrait.classList.contains("dragging")).toBe(false);
  });
});
