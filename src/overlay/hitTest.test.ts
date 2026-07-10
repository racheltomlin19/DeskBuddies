import { describe, expect, it } from "vitest";
import {
  findPetAtPoint,
  getTrashZone,
  isPointInTrashZone,
  TRASH_ZONE_MARGIN,
  TRASH_ZONE_SIZE,
  type PetBox
} from "./hitTest";

const boxes: PetBox[] = [
  { id: "mochi", x: 0, y: 0, width: 100, height: 100 },
  { id: "biscuit", x: 50, y: 50, width: 100, height: 100 }
];

describe("findPetAtPoint", () => {
  it("returns null when the point is over no pet", () => {
    expect(findPetAtPoint({ x: 400, y: 400 }, boxes)).toBeNull();
  });

  it("returns the pet under the point", () => {
    expect(findPetAtPoint({ x: 10, y: 10 }, boxes)).toBe("mochi");
  });

  it("prefers the last (top-most) pet when boxes overlap", () => {
    expect(findPetAtPoint({ x: 70, y: 70 }, boxes)).toBe("biscuit");
  });

  it("treats edges as inside", () => {
    expect(findPetAtPoint({ x: 0, y: 0 }, boxes)).toBe("mochi");
    expect(findPetAtPoint({ x: 100, y: 0 }, boxes)).toBe("mochi");
  });

  it("supports padded hit boxes", () => {
    expect(findPetAtPoint({ x: -8, y: 10 }, boxes, 10)).toBe("mochi");
    expect(findPetAtPoint({ x: -20, y: 10 }, boxes, 10)).toBeNull();
  });
});

describe("trash zone", () => {
  const bounds = { width: 1920, height: 1080 };

  it("sits in the bottom-right corner with a margin", () => {
    const zone = getTrashZone(bounds);
    expect(zone).toEqual({
      x: 1920 - TRASH_ZONE_SIZE - TRASH_ZONE_MARGIN,
      y: 1080 - TRASH_ZONE_SIZE - TRASH_ZONE_MARGIN,
      width: TRASH_ZONE_SIZE,
      height: TRASH_ZONE_SIZE
    });
  });

  it("detects points inside and outside, treating edges as inside", () => {
    const zone = getTrashZone(bounds);
    expect(isPointInTrashZone({ x: zone.x + 10, y: zone.y + 10 }, bounds)).toBe(true);
    expect(isPointInTrashZone({ x: zone.x, y: zone.y }, bounds)).toBe(true);
    expect(isPointInTrashZone({ x: zone.x - 1, y: zone.y + 10 }, bounds)).toBe(false);
    expect(isPointInTrashZone({ x: 10, y: 10 }, bounds)).toBe(false);
  });

  it("clamps to the origin on tiny stages", () => {
    const zone = getTrashZone({ width: 100, height: 80 });
    expect(zone.x).toBe(0);
    expect(zone.y).toBe(0);
  });
});
