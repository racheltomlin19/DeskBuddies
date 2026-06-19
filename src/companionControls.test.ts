import { describe, expect, it } from "vitest";
import { customCompanions, initialSettings } from "./data";
import {
  COMPANION_CONTROLS_VERSION,
  migrateLegacyCompanionControls,
  PET_CONTROL_RANGES
} from "./companionControls";

describe("migrateLegacyCompanionControls", () => {
  it("folds legacy global scale and pace into profiles exactly once", () => {
    const result = migrateLegacyCompanionControls(
      customCompanions,
      { ...initialSettings, companionControlsVersion: 0, globalScale: 1.2, globalSpeed: 1.1 }
    );

    expect(result.companions[0].size).toBeCloseTo(customCompanions[0].size * 1.2);
    expect(result.companions[0].speed).toBeCloseTo(customCompanions[0].speed * 1.1);
    expect(result.settings).toMatchObject({
      companionControlsVersion: COMPANION_CONTROLS_VERSION,
      globalScale: 1,
      globalSpeed: 1
    });
    const repeated = migrateLegacyCompanionControls(result.companions, result.settings);
    expect(repeated.companions).toBe(result.companions);
    expect(repeated.settings).toBe(result.settings);
  });

  it("clamps migrated values to visible card ranges", () => {
    const result = migrateLegacyCompanionControls(
      customCompanions,
      { ...initialSettings, companionControlsVersion: 0, globalScale: 4, globalSpeed: 4 }
    );
    expect(result.companions[0].size).toBe(PET_CONTROL_RANGES.size.max);
    expect(result.companions[0].speed).toBe(PET_CONTROL_RANGES.speed.max);
  });
});
