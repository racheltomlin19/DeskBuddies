import { describe, expect, it } from "vitest";
import {
  canResizePanel,
  dockPanelState,
  getDockedBounds,
  normalizePanelState,
  restorePanelState,
  snapPanelBounds
} from "./panelDocking.cjs";

const workArea = { x: 0, y: 0, width: 1920, height: 1040 };

describe("panel docking", () => {
  it("snaps only near left and right work-area edges", () => {
    expect(snapPanelBounds({ x: 12, y: 100, width: 350, height: 720 }, workArea)).toBe("left");
    expect(snapPanelBounds({ x: 1565, y: 100, width: 350, height: 720 }, workArea)).toBe("right");
    expect(snapPanelBounds({ x: 600, y: 100, width: 350, height: 720 }, workArea)).toBeNull();
  });

  it("calculates full and collapsed native bounds", () => {
    expect(getDockedBounds("left", false, workArea)).toEqual({ x: 0, y: 0, width: 350, height: 1040 });
    expect(getDockedBounds("right", true, workArea)).toEqual({ x: 1860, y: 0, width: 60, height: 1040 });
  });

  it("allows native resizing only while undocked", () => {
    expect(canResizePanel({ dockSide: null })).toBe(true);
    expect(canResizePanel({ dockSide: "left" })).toBe(false);
    expect(canResizePanel({ dockSide: "right" })).toBe(false);
  });

  it("restores the saved floating position with the approved tall aspect", () => {
    const state = normalizePanelState({
      dockSide: null,
      collapsed: false,
      floatingBounds: { x: 200, y: 100, width: 528, height: 520 }
    });
    const restored = restorePanelState(state, [{ id: 1, workArea }], workArea);

    expect(restored.bounds).toEqual({ x: 200, y: 100, width: 350, height: 720 });
  });

  it("centers the approved tall panel when no floating position has been saved", () => {
    const state = normalizePanelState(null);
    const restored = restorePanelState(state, [{ id: 1, workArea }], workArea);

    expect(restored.bounds).toEqual({ x: 785, y: 160, width: 350, height: 720 });
  });

  it("creates an explicit collapsed dock state while preserving floating bounds", () => {
    const state = normalizePanelState({
      dockSide: null,
      floatingBounds: { x: 200, y: 100, width: 350, height: 720 }
    });
    const docked = dockPanelState(state, "right", { id: 3, workArea }, state.floatingBounds);

    expect(docked).toMatchObject({
      dockSide: "right",
      collapsed: true,
      displayId: 3,
      floatingBounds: { x: 200, y: 100, width: 350, height: 720 }
    });
  });

  it("restores a missing dock display as centered primary floating bounds", () => {
    const state = normalizePanelState({
      dockSide: "left", displayId: 9, floatingBounds: { x: 200, y: 200, width: 350, height: 720 }
    });
    const restored = restorePanelState(state, [{ id: 1, workArea }], workArea);
    expect(restored.dockSide).toBeNull();
    expect(restored.bounds.x).toBe((1920 - 350) / 2);
  });
});
