import { describe, expect, it } from "vitest";
import { initialSettings } from "../data";
import { getSummonedCompanions } from "../companionState";
import { initialCompanionState } from "../data";
import { normalizeSnapshot } from "./overlayBridge";

const summoned = getSummonedCompanions(initialCompanionState.companions);

describe("normalizeSnapshot", () => {
  it("returns an empty, safe snapshot for junk input", () => {
    const snapshot = normalizeSnapshot(null);
    expect(snapshot.companions).toEqual([]);
    expect(snapshot.settings).toEqual(initialSettings);
  });

  it("passes through a valid snapshot", () => {
    const snapshot = normalizeSnapshot({ companions: summoned, settings: initialSettings });
    expect(snapshot.companions.map((pet) => pet.id)).toEqual(summoned.map((pet) => pet.id));
    expect(snapshot.settings.physics).toBe(initialSettings.physics);
  });

  it("fills missing settings fields from defaults", () => {
    const snapshot = normalizeSnapshot({ companions: [], settings: { physics: false } });
    expect(snapshot.settings.physics).toBe(false);
    expect(snapshot.settings.globalScale).toBe(initialSettings.globalScale);
  });

  it("drops companions that are not objects with an id", () => {
    const snapshot = normalizeSnapshot({ companions: [summoned[0], null, { name: "x" }], settings: initialSettings });
    expect(snapshot.companions).toHaveLength(1);
    expect(snapshot.companions[0].id).toBe(summoned[0].id);
  });
});
