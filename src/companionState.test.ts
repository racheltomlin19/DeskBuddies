import { describe, expect, it } from "vitest";
import { customCompanions, initialCompanionState } from "./data";
import {
  COMPANION_SCHEMA_VERSION,
  findSelectedCompanion,
  getSharedNumberValue,
  getSummonedCompanions,
  normalizeCompanionState,
  setCompanionSummoned,
  updateCompanionsByIds
} from "./companionState";

describe("companion state", () => {
  it("preserves authored companions while allowing them to be hidden", () => {
    const hidden = setCompanionSummoned(initialCompanionState.companions, "buddy1", false);
    const normalized = normalizeCompanionState({ schemaVersion: 2, companions: hidden });

    const buddy1 = normalized.companions.find((pet) => pet.id === "buddy1");
    expect(buddy1?.summoned).toBe(false);
    expect(buddy1?.avatar).toBe("buddy1");
    expect(buddy1?.locked).toBe(false);
  });

  it("preserves editable fields from stored companions", () => {
    const edited = initialCompanionState.companions.map((pet) =>
      pet.id === "buddy2" ? { ...pet, size: 1.22, speed: 0.91, energy: 0.95, primaryColor: "#123456" } : pet
    );

    const normalized = normalizeCompanionState({ schemaVersion: 2, companions: edited });
    const buddy2 = normalized.companions.find((pet) => pet.id === "buddy2")!;

    expect(buddy2.size).toBe(1.22);
    expect(buddy2.speed).toBe(0.91);
    expect(buddy2.energy).toBe(0.95);
    expect(buddy2.primaryColor).toBe("#123456");
    expect(buddy2.avatar).toBe("buddy2");
  });

  it("updates only selected companions", () => {
    const updated = updateCompanionsByIds(initialCompanionState.companions, ["buddy1"], { energy: 0.75 });

    expect(updated.find((pet) => pet.id === "buddy1")?.energy).toBe(0.75);
    expect(updated.find((pet) => pet.id === "buddy2")?.energy).toBe(
      customCompanions.find((pet) => pet.id === "buddy2")?.energy
    );
  });

  it("reports shared and mixed numeric values for multi-selection", () => {
    const shared = updateCompanionsByIds(initialCompanionState.companions, ["buddy1", "buddy2"], { speed: 0.66 });

    expect(getSharedNumberValue(shared, ["buddy1", "buddy2"], "speed")).toBe(0.66);
    expect(getSharedNumberValue(initialCompanionState.companions, ["buddy1", "buddy2"], "energy")).toBe("mixed");
    expect(getSharedNumberValue(initialCompanionState.companions, [], "energy")).toBeUndefined();
  });

  it("defaults Buddy2 higher than Buddy1 and Buddy1 near one-third energy", () => {
    const buddy1 = customCompanions.find((pet) => pet.id === "buddy1")!;
    const buddy2 = customCompanions.find((pet) => pet.id === "buddy2")!;

    expect(buddy2.speed).toBeGreaterThan(buddy1.speed);
    expect(buddy2.energy).toBeGreaterThan(buddy1.energy);
    expect(buddy1.energy).toBeGreaterThanOrEqual(0.32);
    expect(buddy1.energy).toBeLessThanOrEqual(0.34);
  });

  it("still finds selected summoned companions", () => {
    const summoned = getSummonedCompanions(initialCompanionState.companions);
    expect(findSelectedCompanion(initialCompanionState.companions, summoned[0].id)?.id).toBe(summoned[0].id);
  });

  it("returns defaults for legacy or junk normalization input", () => {
    const oldPets = [
      { id: "patch", name: "Edited Patch", species: "cat", pattern: "patch-cat" },
      { id: "buddy2", name: "Wrong Name", species: "cat", pattern: "tabby" }
    ];

    const migrated = normalizeCompanionState(oldPets);
    const junk = normalizeCompanionState("nope");

    expect(migrated.schemaVersion).toBe(COMPANION_SCHEMA_VERSION);
    expect(migrated.companions).toEqual(initialCompanionState.companions);
    expect(junk).toEqual(initialCompanionState);
  });

  it("falls back to a restorable built-in companion when every companion is hidden", () => {
    const companions = initialCompanionState.companions.map((pet) => ({ ...pet, summoned: false }));

    expect(getSummonedCompanions(companions)).toHaveLength(0);
    expect(findSelectedCompanion(companions, "missing")?.id).toBe("buddy1");
  });
});
