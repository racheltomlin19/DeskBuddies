import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { customCompanions, initialCompanionState } from "./data";
import { PetAvatar } from "./PetAvatar";
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

  it("restores canonical colors when a stored companion has a legacy pattern", () => {
    const canonicalBiscuit = customCompanions.find((pet) => pet.id === "biscuit")!;
    const stored = initialCompanionState.companions.map((pet) =>
      pet.id === "biscuit"
        ? {
            ...pet,
            pattern: "tuxedo" as const,
            primaryColor: "#fffdf8",
            secondaryColor: "#4b4543",
            accentColor: "#2f2a29",
            eyeColor: "#56826c",
            size: 1.21,
            speed: 0.73,
            energy: 0.91
          }
        : pet
    );

    const normalized = normalizeCompanionState({ schemaVersion: COMPANION_SCHEMA_VERSION, companions: stored });
    const biscuit = normalized.companions.find((pet) => pet.id === "biscuit")!;

    expect({
      pattern: biscuit.pattern,
      primaryColor: biscuit.primaryColor,
      secondaryColor: biscuit.secondaryColor,
      accentColor: biscuit.accentColor,
      eyeColor: biscuit.eyeColor
    }).toEqual({
      pattern: canonicalBiscuit.pattern,
      primaryColor: canonicalBiscuit.primaryColor,
      secondaryColor: canonicalBiscuit.secondaryColor,
      accentColor: canonicalBiscuit.accentColor,
      eyeColor: canonicalBiscuit.eyeColor
    });
    expect({ size: biscuit.size, speed: biscuit.speed, energy: biscuit.energy }).toEqual({
      size: 1.21,
      speed: 0.73,
      energy: 0.91
    });
  });

  it("restores canonical authored identity and descriptions instead of stale stored copy", () => {
    const stored = initialCompanionState.companions.map((pet) =>
      pet.id === "mochi"
        ? { ...pet, name: "Old Mochi", breedLabel: "calico watch cat", description: "Old Mochi description" }
        : pet.id === "biscuit"
          ? { ...pet, name: "Old Biscuit", breedLabel: "tuxedo lounger", description: "Old Biscuit description" }
          : pet
    );

    const normalized = normalizeCompanionState({ schemaVersion: 2, companions: stored });
    const mochi = normalized.companions.find((pet) => pet.id === "mochi")!;
    const biscuit = normalized.companions.find((pet) => pet.id === "biscuit")!;

    expect({ name: mochi.name, breedLabel: mochi.breedLabel, description: mochi.description }).toEqual({
      name: "Mochi",
      breedLabel: "calico Japanese Bobtail",
      description: "An alert, watchful Japanese Bobtail who keeps a curious eye on your desktop."
    });
    expect({ name: biscuit.name, breedLabel: biscuit.breedLabel, description: biscuit.description }).toEqual({
      name: "Biscuit",
      breedLabel: "cream-orange Maine Coon",
      description: "A relaxed, playful Maine Coon who enjoys long naps and lively stretches."
    });
    expect(renderToStaticMarkup(createElement(PetAvatar, { pet: mochi, compact: true }))).toContain(
      'aria-label="Mochi calico Japanese Bobtail"'
    );
    expect(renderToStaticMarkup(createElement(PetAvatar, { pet: biscuit, compact: true }))).toContain(
      'aria-label="Biscuit cream-orange Maine Coon"'
    );
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
