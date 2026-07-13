import { expect, it } from "vitest";
import { customCompanions, initialSettings } from "./data";
import { advanceCompanion, applyCuddle, applyFountain, applyNeighbors, getGroundY } from "./behaviorEngine";
import type { PetRuntime } from "./types";

const bounds = { width: 1920, height: 1080 };
const frameMs = 1000 / 60;

function randomFor(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function audit(seed: number, minutes: number) {
  const random = randomFor(seed);
  let runtimes: PetRuntime[] = customCompanions.map((pet, index) => ({
    id: pet.id,
    x: 720 + index * 110,
    y: getGroundY(pet, initialSettings, bounds.height),
    direction: index === 0 ? 1 : -1,
    behavior: "idle",
    vy: 0,
    phase: 0,
    stateStartedAt: 0,
    lastInteractionAt: 0
  }));
  const counts = { zoomies: 0, chase: 0, climb: 0, cuddleInterruptions: 0, neighborInterruptions: 0 };
  const frames = minutes * 60 * 60;

  for (let frame = 1; frame <= frames; frame += 1) {
    const now = frame * frameMs;
    const beforeGroup = runtimes;
    const cuddled = applyCuddle(runtimes, customCompanions, bounds, now, random, frameMs);
    if (cuddled.some((runtime, index) => runtime.behavior !== beforeGroup[index].behavior)) counts.cuddleInterruptions += 1;
    const grouped = applyNeighbors(cuddled, customCompanions, bounds, now, random, frameMs);
    if (grouped.some((runtime, index) => runtime.behavior !== cuddled[index].behavior)) counts.neighborInterruptions += 1;
    const seeded = applyFountain(grouped, customCompanions, initialSettings, bounds, now, random, frameMs);
    const previous = runtimes;
    runtimes = seeded.map((runtime, index) =>
      advanceCompanion(runtime, customCompanions[index], initialSettings, bounds, frameMs, now, random)
    );
    for (let index = 0; index < runtimes.length; index += 1) {
      for (const behavior of ["zoomies", "chase", "climb"] as const) {
        if (runtimes[index].behavior === behavior && previous[index].behavior !== behavior) counts[behavior] += 1;
      }
    }
  }
  return counts;
}

it("keeps group interruptions below two per minute after timing normalization", () => {
  const results = [1, 2, 3].map((seed) => audit(seed, 15));
  expect(audit(1, 15)).toEqual(results[0]);
  for (const result of results) {
    expect(result.cuddleInterruptions + result.neighborInterruptions).toBeLessThanOrEqual(30);
  }
});
