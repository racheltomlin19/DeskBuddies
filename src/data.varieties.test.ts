import { describe, expect, it } from "vitest";
import { customCompanions } from "./data";

const mochi = customCompanions.find((pet) => pet.id === "mochi")!;
const biscuit = customCompanions.find((pet) => pet.id === "biscuit")!;

describe("Mochi and Biscuit varieties", () => {
  it("authors Mochi as a warm calico Japanese Bobtail without changing her identity or personality", () => {
    expect({ id: mochi.id, name: mochi.name, pattern: mochi.pattern, breedLabel: mochi.breedLabel }).toEqual({
      id: "mochi", name: "Mochi", pattern: "calico-bobtail", breedLabel: "calico Japanese Bobtail"
    });
    expect([mochi.primaryColor, mochi.secondaryColor, mochi.accentColor, mochi.eyeColor]).toEqual([
      "#fff8e8", "#dc7a3f", "#403833", "#4f8059"
    ]);
    expect(mochi.description).toBe("An alert, watchful Japanese Bobtail who keeps a curious eye on your desktop.");
    expect(mochi.personality).toEqual({
      idleWeight: 4.8, walkWeight: 1.6, sitWeight: 4.2, sleepWeight: 1.8,
      stretchWeight: 0.5, watchWeight: 4.6, jumpWeight: 0.35, wanderBias: 0.32
    });
  });

  it("authors Biscuit as a cream-orange Maine Coon without changing his identity or personality", () => {
    expect({ id: biscuit.id, name: biscuit.name, pattern: biscuit.pattern, breedLabel: biscuit.breedLabel }).toEqual({
      id: "biscuit", name: "Biscuit", pattern: "cream-orange-tabby", breedLabel: "cream-orange Maine Coon"
    });
    expect([biscuit.primaryColor, biscuit.secondaryColor, biscuit.accentColor, biscuit.eyeColor]).toEqual([
      "#f6d39b", "#d98a45", "#9d5c32", "#b77924"
    ]);
    expect(biscuit.description).toBe("A relaxed, playful Maine Coon who enjoys long naps and lively stretches.");
    expect(biscuit.personality).toEqual({
      idleWeight: 3.2, walkWeight: 1.4, sitWeight: 3.4, sleepWeight: 4.7,
      stretchWeight: 3.9, watchWeight: 1, jumpWeight: 0.25, wanderBias: 0.24
    });
  });
});
