import { describe, expect, it } from "vitest";
import { customCompanions, initialSettings } from "../data";
import type { PetRuntime } from "../types";
import { resolveSimulationOverlaps } from "./useCompanionSimulation";

function runtime(id: string, x: number, y: number): PetRuntime {
  return {
    id,
    x,
    y,
    direction: 1,
    behavior: "walk",
    vy: 0,
    phase: 0,
    stateStartedAt: 0,
    lastInteractionAt: 0
  };
}

describe("simulation overlap resolution", () => {
  it("separates autonomous ground-roaming pets horizontally without changing their ground heights", () => {
    const current = [runtime("buddy1", 300, 360), runtime("buddy2", 300, 350)];
    const resolved = resolveSimulationOverlaps(
      current,
      customCompanions,
      { ...initialSettings, roamMode: "ground" },
      { width: 900, height: 520 },
      false
    );

    expect(Math.abs(resolved[0].x - resolved[1].x)).toBeGreaterThan(20);
    expect(resolved.map((pet) => pet.y)).toEqual([360, 350]);
  });
});
