import { describe, expect, it } from "vitest";
import {
  RAIL_WIDTH,
  canResizePanel,
  dockPanelState,
  getSnapCandidate,
  getDockedBounds,
  isDockRearmed,
  normalizePanelState,
  restorePanelState
} from "./panelDocking.cjs";

const workArea = { x: 0, y: 0, width: 1920, height: 1040 };

describe("panel docking", () => {
  it("selects the nearest qualifying edge within the 32 px threshold", () => {
    expect(getSnapCandidate({ x: 32, y: 100, width: 350, height: 720 }, workArea)).toBe("left");
    expect(getSnapCandidate({ x: 1538, y: 100, width: 350, height: 720 }, workArea)).toBe("right");
    expect(getSnapCandidate({ x: 30, y: 100, width: 1865, height: 720 }, workArea)).toBe("right");
    expect(getSnapCandidate({ x: 33, y: 100, width: 350, height: 720 }, workArea)).toBeNull();
  });

  it("supports negative multi-monitor coordinates", () => {
    const negativeWorkArea = { x: -1920, y: -40, width: 1920, height: 1040 };
    expect(getSnapCandidate({ x: -1890, y: 100, width: 350, height: 720 }, negativeWorkArea)).toBe("left");
    expect(getSnapCandidate({ x: -382, y: 100, width: 350, height: 720 }, negativeWorkArea)).toBe("right");
  });

  it("uses a caller-provided snap threshold", () => {
    const bounds = { x: 40, y: 100, width: 350, height: 720 };
    expect(getSnapCandidate(bounds, workArea)).toBeNull();
    expect(getSnapCandidate(bounds, workArea, 40)).toBe("left");
  });

  it("rearms docking only after clearing both horizontal edges by 64 px", () => {
    expect(isDockRearmed({ x: 64, y: 100, width: 350, height: 720 }, workArea)).toBe(true);
    expect(isDockRearmed({ x: 63, y: 100, width: 350, height: 720 }, workArea)).toBe(false);
    expect(isDockRearmed({ x: 1506, y: 100, width: 350, height: 720 }, workArea)).toBe(true);
    expect(isDockRearmed({ x: 1507, y: 100, width: 350, height: 720 }, workArea)).toBe(false);

    const negativeWorkArea = { x: -1920, y: 0, width: 1920, height: 1040 };
    expect(isDockRearmed({ x: -1856, y: 100, width: 350, height: 720 }, negativeWorkArea)).toBe(true);
  });

  it("calculates full and collapsed native bounds", () => {
    expect(RAIL_WIDTH).toBe(80);
    expect(getDockedBounds("left", false, workArea)).toEqual({ x: 0, y: 0, width: 350, height: 1040 });
    expect(getDockedBounds("left", true, workArea)).toEqual({ x: 0, y: 0, width: 80, height: 1040 });
    expect(getDockedBounds("right", true, workArea)).toEqual({ x: 1840, y: 0, width: 80, height: 1040 });
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
