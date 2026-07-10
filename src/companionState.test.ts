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
    const hidden = setCompanionSummoned(initialCompanionState.companions, "mochi", false);
    const normalized = normalizeCompanionState({ schemaVersion: 2, companions: hidden });

    const mochi = normalized.companions.find((pet) => pet.id === "mochi");
    expect(mochi?.summoned).toBe(false);
    expect(mochi?.avatar).toBe("mochi");
    expect(mochi?.locked).toBe(false);
  });

  it("preserves editable fields from stored companions", () => {
    const edited = initialCompanionState.companions.map((pet) =>
      pet.id === "biscuit" ? { ...pet, size: 1.22, speed: 0.91, energy: 0.95, primaryColor: "#123456" } : pet
    );

    const normalized = normalizeCompanionState({ schemaVersion: 2, companions: edited });
    const biscuit = normalized.companions.find((pet) => pet.id === "biscuit")!;

    expect(biscuit.size).toBe(1.22);
    expect(biscuit.speed).toBe(0.91);
    expect(biscuit.energy).toBe(0.95);
    expect(biscuit.primaryColor).toBe("#123456");
    expect(biscuit.avatar).toBe("biscuit");
  });

  it("updates only selected companions", () => {
    const updated = updateCompanionsByIds(initialCompanionState.companions, ["mochi"], { energy: 0.75 });

    expect(updated.find((pet) => pet.id === "mochi")?.energy).toBe(0.75);
    expect(updated.find((pet) => pet.id === "biscuit")?.energy).toBe(
      customCompanions.find((pet) => pet.id === "biscuit")?.energy
    );
  });

  it("reports shared and mixed numeric values for multi-selection", () => {
    const shared = updateCompanionsByIds(initialCompanionState.companions, ["mochi", "biscuit"], { speed: 0.66 });

    expect(getSharedNumberValue(shared, ["mochi", "biscuit"], "speed")).toBe(0.66);
    expect(getSharedNumberValue(initialCompanionState.companions, ["mochi", "biscuit"], "energy")).toBe("mixed");
    expect(getSharedNumberValue(initialCompanionState.companions, [], "energy")).toBeUndefined();
  });

  it("defaults Biscuit higher than Mochi and Mochi near one-third energy", () => {
    const mochi = customCompanions.find((pet) => pet.id === "mochi")!;
    const biscuit = customCompanions.find((pet) => pet.id === "biscuit")!;

    expect(biscuit.speed).toBeGreaterThan(mochi.speed);
    expect(biscuit.energy).toBeGreaterThan(mochi.energy);
    expect(mochi.energy).toBeGreaterThanOrEqual(0.32);
    expect(mochi.energy).toBeLessThanOrEqual(0.34);
  });

  it("still finds selected summoned companions", () => {
    const summoned = getSummonedCompanions(initialCompanionState.companions);
    expect(findSelectedCompanion(initialCompanionState.companions, summoned[0].id)?.id).toBe(summoned[0].id);
  });

  it("returns defaults for legacy or junk normalization input", () => {
    const oldPets = [
      { id: "patch", name: "Edited Patch", species: "cat", pattern: "patch-cat" },
      { id: "biscuit", name: "Wrong Name", species: "cat", pattern: "tabby" }
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
    expect(findSelectedCompanion(companions, "missing")?.id).toBe("mochi");
  });
});
