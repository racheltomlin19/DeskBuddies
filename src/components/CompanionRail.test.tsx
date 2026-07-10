// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialCompanionState } from "../data";
import { CompanionRail } from "./CompanionRail";

function pointer(type: string, x: number, y: number) {
  return new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
}

describe("CompanionRail", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(async () => {
    if (root) {
      await act(async () => root!.unmount());
      root = undefined;
    }
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
      root!.render(
        <CompanionRail
          companions={initialCompanionState.companions}
          onSpawnDrag={onSpawnDrag}
          onToggleSummoned={onToggleSummoned}
        />
      );
    });
    return { onSpawnDrag, onToggleSummoned };
  }

  it("spawns a pet after a bubble drag crosses six pixels", async () => {
    const { onSpawnDrag } = await renderRail();
    const dragBubble = container!.querySelector<HTMLElement>('[aria-label="Drag Mochi to desktop"]')!;

    await act(async () => {
      dragBubble.dispatchEvent(pointer("pointerdown", 10, 10));
      dragBubble.dispatchEvent(pointer("pointermove", 20, 20));
      dragBubble.dispatchEvent(pointer("pointerup", 20, 20));
    });

    expect(onSpawnDrag).toHaveBeenCalledWith("mochi");
  });

  it("does not start a drag from the hide button", async () => {
    const { onSpawnDrag, onToggleSummoned } = await renderRail();
    const hideButton = container!.querySelector<HTMLElement>('[aria-label="Hide Mochi"]')!;

    await act(async () => {
      hideButton.dispatchEvent(pointer("pointerdown", 10, 10));
      hideButton.dispatchEvent(pointer("pointermove", 20, 20));
      hideButton.dispatchEvent(pointer("pointerup", 20, 20));
      hideButton.click();
    });

    expect(onSpawnDrag).not.toHaveBeenCalled();
    expect(onToggleSummoned).toHaveBeenCalledWith("mochi", false);
  });
});
