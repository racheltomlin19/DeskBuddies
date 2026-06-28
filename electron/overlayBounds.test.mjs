import { describe, expect, it } from "vitest";
import { getPrimaryOverlayBounds } from "./overlayBounds.cjs";

describe("primary overlay bounds", () => {
  it("uses only the primary display work area", () => {
    const primary = {
      id: 1,
      workArea: { x: 100, y: 40, width: 1920, height: 1040 },
      scaleFactor: 1.25
    };

    expect(getPrimaryOverlayBounds(primary)).toEqual(primary.workArea);
  });
});
