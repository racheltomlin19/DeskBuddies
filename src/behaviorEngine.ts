import type { Behavior, EngineSettings, PetProfile, PetRuntime } from "./types";

export interface StageBounds {
  width: number;
  height: number;
}

export interface FollowContext {
  active: boolean;
  pounce: boolean;
  cursor: { x: number; y: number } | null;
  cursorIdleMs: number;
  targetIndex?: number;
}

const IDLE_FOLLOW: FollowContext = { active: false, pounce: false, cursor: null, cursorIdleMs: 0 };

const BASE_PET_SIZE = 150;
// A cat that just pounced waits this long before stalking the idle cursor again.
const POUNCE_COOLDOWN_MS = 4000;
const FOLLOW_SLOTS = [
  { x: -0.75, y: -0.35 },
  { x: 0.75, y: -0.35 },
  { x: -0.75, y: 0.55 },
  { x: 0.75, y: 0.55 },
  { x: 0, y: -1.1 },
  { x: 0, y: 1.05 }
] as const;

export function createInitialRuntime(pets: PetProfile[], bounds: StageBounds = { width: 900, height: 520 }): PetRuntime[] {
  const now = performance.now();
  const settings = defaultScaleSettings();
  const largestSize = pets.reduce((max, pet) => Math.max(max, getPetSize(pet, settings)), 0);
  const maxX = Math.max(8, bounds.width - largestSize - 8);
  // Spread spawns a full pet-width apart so companions don't stack on each other.
  const spacing = pets.length > 1 ? Math.min(largestSize + 16, (maxX - 24) / (pets.length - 1)) : 0;
  return pets.map((pet, index) => ({
    id: pet.id,
    x: clamp(24 + index * spacing, 8, Math.max(8, bounds.width - getPetSize(pet, settings) - 8)),
    y: getGroundY(pet, defaultScaleSettings(), bounds.height),
    direction: index % 2 === 0 ? 1 : -1,
    behavior: index === 1 ? "walk" : "idle",
    vy: 0,
    phase: Math.random() * Math.PI,
    stateStartedAt: now - index * 650,
    lastInteractionAt: now
  }));
}

export function reconcileRuntime(current: PetRuntime[], pets: PetProfile[], bounds: StageBounds = { width: 900, height: 520 }) {
  const existing = new Map(current.map((entry) => [entry.id, entry]));
  const additions = createInitialRuntime(pets, bounds);

  return pets.map((pet, index) => {
    const runtime = existing.get(pet.id) ?? additions[index];
    return keepInBounds(runtime, pet, defaultScaleSettings(), bounds);
  });
}

export function commandRuntime(runtime: PetRuntime, behavior: Behavior, now: number, hold = false): PetRuntime {
  return {
    ...runtime,
    behavior,
    stateStartedAt: now,
    vy: behavior === "fall" ? 1 : 0,
    lastInteractionAt: now,
    held: hold
  };
}

export function advanceCompanion(
  petRuntime: PetRuntime,
  pet: PetProfile,
  settings: EngineSettings,
  bounds: StageBounds,
  delta: number,
  now: number,
  random: () => number = Math.random,
  follow: FollowContext = IDLE_FOLLOW
): PetRuntime {
  const size = getPetSize(pet, settings);
  const maxX = Math.max(8, bounds.width - size - 8);
  const ground = getGroundY(pet, settings, bounds.height);
  const elapsed = now - petRuntime.stateStartedAt;
  const next = {
    ...petRuntime,
    x: clamp(petRuntime.x, 8, maxX),
    phase: petRuntime.phase + delta * 0.006
  };

  if (next.behavior === "drag") {
    return next;
  }

  // Follow mode steers the pet toward the cursor (and lets cats pounce),
  // but never interrupts an airborne state.
  if (
    follow.active &&
    follow.cursor &&
    next.behavior !== "jump" &&
    next.behavior !== "fall" &&
    next.behavior !== "toss"
  ) {
    return applyFollow(next, pet, settings, bounds, delta, now, follow, ground, maxX, size);
  }

  // Held (locked) behavior: hold the chosen action, skip autonomous transitions.
  if (next.held) {
    return advanceHeld(next, pet, settings, delta, ground, maxX);
  }

  if (
    settings.roamMode === "screen" &&
    next.behavior !== "jump" &&
    next.behavior !== "fall" &&
    next.behavior !== "toss" &&
    next.behavior !== "climb" &&
    next.behavior !== "perch"
  ) {
    return advanceScreenRoam(next, pet, settings, bounds, delta, now, random, maxX, size);
  }

  // Standalone pounce (outside follow mode): crouch, then a forward leap.
  if (next.behavior === "stalk") {
    if (elapsed > 450) {
      return { ...next, y: ground, behavior: "pounce", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }
  if (next.behavior === "pounce") {
    const progress = Math.min(1, elapsed / 380);
    const leap = (2.4 + pet.speed * 2.2) * settings.globalSpeed * (delta / 16.67);
    const x = clamp(next.x + leap * next.direction, 8, maxX);
    if (progress >= 1) {
      return { ...next, x, y: ground, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, x, y: ground - Math.sin(progress * Math.PI) * (40 + pet.energy * 30) };
  }

  // Come: walk to a summoned target point, then greet on arrival.
  if (next.behavior === "come") {
    const target = next.targetX ?? next.x;
    const dx = target - next.x;
    if (Math.abs(dx) > 6) {
      const step = (0.9 + pet.speed * 1.1) * settings.globalSpeed * (delta / 16.67);
      const direction: 1 | -1 = dx > 0 ? 1 : -1;
      return {
        ...next,
        x: clamp(next.x + Math.min(Math.abs(dx), step) * direction, 8, maxX),
        y: ground,
        direction,
        behavior: "come"
      };
    }
    return { ...next, y: ground, behavior: "greet", targetX: undefined, stateStartedAt: now };
  }

  if (!settings.physics && (next.behavior === "fall" || next.behavior === "toss")) {
    return { ...next, y: ground, vx: 0, rotation: 0, behavior: "idle", stateStartedAt: now };
  }

  // Toss: thrown pet arcs under gravity, spins, bounces off side walls, lands on its feet.
  if (next.behavior === "toss") {
    const vx = (next.vx ?? 0) * 0.995;
    const vy = (next.vy ?? 0) + 0.9;
    let x = next.x + vx;
    let bounceVx = vx;
    if (x <= 8) {
      x = 8;
      bounceVx = Math.abs(vx) * 0.6;
    } else if (x >= maxX) {
      x = maxX;
      bounceVx = -Math.abs(vx) * 0.6;
    }
    const y = next.y + vy;
    const rotation = (next.rotation ?? 0) + vx * 6;
    if (y >= ground) {
      return { ...next, x, y: ground, vx: 0, vy: 0, rotation: 0, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, x, y, vx: bounceVx, vy, rotation };
  }

  if (next.behavior === "jump") {
    const progress = Math.min(1, elapsed / 720);
    return {
      ...next,
      y: ground - Math.sin(progress * Math.PI) * (52 + pet.energy * 42),
      behavior: progress >= 1 ? "idle" : "jump",
      stateStartedAt: progress >= 1 ? now : next.stateStartedAt
    };
  }

  if (next.behavior === "fall") {
    const vy = next.vy + 0.84;
    const y = next.y + vy;
    if (y >= ground) {
      return { ...next, y: ground, vy: 0, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y, vy };
  }

  if (next.behavior === "sleep" || next.behavior === "sit" || next.behavior === "watch") {
    if (elapsed > 5200 + pet.energy * 2400 && random() < 0.012) {
      return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  if (next.behavior === "stretch") {
    if (elapsed > 1450) {
      return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  // Greet: hold a nose-boop facing, then return to idle.
  if (next.behavior === "greet") {
    if (elapsed > 900) {
      return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  // React: a brief happy pose after a click, then back to idle.
  if (next.behavior === "react") {
    if (elapsed > 850) {
      return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  // Drink: walk to the fountain target, then lap for a few seconds.
  if (next.behavior === "drink") {
    const target = next.targetX ?? next.x;
    const dx = target - next.x;
    if (Math.abs(dx) > 6) {
      const step = (0.5 + pet.speed * 0.8) * settings.globalSpeed * (delta / 16.67);
      const direction: 1 | -1 = dx > 0 ? 1 : -1;
      return {
        ...next,
        x: clamp(next.x + Math.min(Math.abs(dx), step) * direction, 8, maxX),
        y: ground,
        direction,
        behavior: "drink"
      };
    }
    if (elapsed > 3600) {
      return { ...next, y: ground, behavior: "idle", targetX: undefined, stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  // Climb: scale the wall up to the perch height.
  if (next.behavior === "climb") {
    const perchY = 24;
    const y = next.y - 1.8 * settings.globalSpeed * (delta / 16.67);
    if (y <= perchY) {
      return { ...next, y: perchY, behavior: "perch", stateStartedAt: now };
    }
    return { ...next, y };
  }

  // Perch: sit at the top a while, then drop off and fall.
  if (next.behavior === "perch") {
    if (elapsed > 4000 + pet.energy * 3000) {
      return { ...next, behavior: "fall", vy: 1, stateStartedAt: now };
    }
    return next;
  }

  // Zoomies: a fast sprint to a target edge, then a skidding sit.
  if (next.behavior === "zoomies") {
    const target = next.targetX ?? (next.direction === 1 ? maxX : 8);
    const direction: 1 | -1 = target > next.x ? 1 : -1;
    const zoomStep = (2.2 + pet.speed * 2.4) * settings.globalSpeed * (delta / 16.67);
    const x = clamp(next.x + zoomStep * direction, 8, maxX);
    const reached = Math.abs(x - target) < 6 || x <= 8 || x >= maxX;
    if (reached || elapsed > 2600) {
      return { ...next, x, y: ground, direction, behavior: "sit", targetX: undefined, stateStartedAt: now };
    }
    return { ...next, x, y: ground, direction };
  }

  if (next.behavior === "idle") {
    // Rare zoomies burst, more likely for high-energy companions.
    if (elapsed > 1400 && random() < 0.0016 + pet.energy * 0.004) {
      const target = random() > 0.5 ? maxX : 8;
      return {
        ...next,
        y: ground,
        behavior: "zoomies",
        targetX: target,
        direction: target > next.x ? 1 : -1,
        stateStartedAt: now
      };
    }
    const wakeChance = 0.0035 + pet.energy * 0.004;
    if (elapsed > 1100 && random() < wakeChance) {
      return {
        ...next,
        y: ground,
        behavior: chooseWeightedBehavior(pet, random),
        direction: random() > 0.5 ? 1 : -1,
        stateStartedAt: now
      };
    }
    if (elapsed > 2100 && random() > 0.78) {
      return { ...next, y: ground, behavior: chooseWeightedBehavior(pet, random), stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  const step = (0.42 + pet.speed * 0.78) * settings.globalSpeed * (delta / 16.67);
  let x = next.x + step * next.direction;
  let direction = next.direction;

  if (x <= 8 || x >= maxX) {
    direction = direction === 1 ? -1 : 1;
    x = clamp(x, 8, maxX);
  }

  if (elapsed > 1700 && random() < 0.0045) {
    return {
      ...next,
      x,
      y: ground,
      direction,
      behavior: chooseWeightedBehavior(pet, random),
      stateStartedAt: now
    };
  }

  // Cats near a side edge occasionally climb it and perch at the top.
  if (pet.species === "cat" && (x <= 32 || x >= maxX - 32) && elapsed > 800 && random() < 0.02) {
    const edgeX = x <= 32 ? 8 : maxX;
    return { ...next, x: edgeX, y: ground, direction: edgeX === 8 ? -1 : 1, behavior: "climb", stateStartedAt: now };
  }

  return { ...next, x, y: ground, direction };
}

/**
 * Ambient pet-to-pet interactions: two nearby, resting cats occasionally
 * greet (nose boop), nap together, or one chases the other off. Pure — runs
 * as a pre-pass over all runtimes before advanceCompanion each tick.
 */
export function applyNeighbors(
  runtimes: PetRuntime[],
  pets: PetProfile[],
  bounds: StageBounds,
  now: number,
  random: () => number = Math.random
): PetRuntime[] {
  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  const resting = runtimes.filter((runtime) => {
    const pet = petById.get(runtime.id);
    return pet && pet.species === "cat" && (runtime.behavior === "idle" || runtime.behavior === "sit");
  });
  if (resting.length < 2) {
    return runtimes;
  }

  const [a, b] = resting;
  const dist = Math.abs(a.x - b.x);
  const cooldownOk = now - a.lastInteractionAt > 6000 && now - b.lastInteractionAt > 6000;
  if (dist > 140 || !cooldownOk) {
    return runtimes;
  }
  if (random() > 0.006) {
    return runtimes;
  }

  const roll = random();
  const updates = new Map<string, Partial<PetRuntime>>();
  if (roll < 0.4) {
    updates.set(a.id, { behavior: "sleep", stateStartedAt: now, lastInteractionAt: now });
    updates.set(b.id, { behavior: "sleep", stateStartedAt: now, lastInteractionAt: now });
  } else if (roll < 0.82) {
    updates.set(a.id, { behavior: "greet", direction: b.x > a.x ? 1 : -1, stateStartedAt: now, lastInteractionAt: now });
    updates.set(b.id, { behavior: "greet", direction: a.x > b.x ? 1 : -1, stateStartedAt: now, lastInteractionAt: now });
  } else {
    updates.set(a.id, {
      behavior: "chase",
      direction: b.x > a.x ? 1 : -1,
      targetX: b.x,
      stateStartedAt: now,
      lastInteractionAt: now
    });
    updates.set(b.id, {
      behavior: "zoomies",
      direction: a.x > b.x ? -1 : 1,
      targetX: a.x > b.x ? 8 : bounds.width,
      stateStartedAt: now,
      lastInteractionAt: now
    });
  }
  return runtimes.map((runtime) => (updates.has(runtime.id) ? { ...runtime, ...updates.get(runtime.id) } : runtime));
}

/** Absolute x of the fountain from its stored width fraction. */
export function getFountainX(settings: EngineSettings, width: number) {
  return clamp(settings.fountain.x * width, 40, Math.max(40, width - 40));
}

/**
 * Sends Biscuit to the fountain to drink now and then. Pure pre-pass; Mochi
 * and catalog pets ignore the fountain. No-op when the fountain is disabled.
 */
export function applyFountain(
  runtimes: PetRuntime[],
  pets: PetProfile[],
  settings: EngineSettings,
  bounds: StageBounds,
  now: number,
  random: () => number = Math.random
): PetRuntime[] {
  if (!settings.fountain.enabled) {
    return runtimes;
  }
  const fountainX = getFountainX(settings, bounds.width);
  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  return runtimes.map((runtime) => {
    const pet = petById.get(runtime.id);
    if (!pet || pet.avatar !== "biscuit" || runtime.behavior !== "idle") {
      return runtime;
    }
    if (now - runtime.lastInteractionAt < 8000 || random() > 0.004) {
      return runtime;
    }
    return { ...runtime, behavior: "drink", targetX: fountainX, stateStartedAt: now, lastInteractionAt: now };
  });
}

export function getPetSize(pet: PetProfile, settings: EngineSettings) {
  return BASE_PET_SIZE * pet.size * settings.globalScale;
}

export function getGroundY(pet: PetProfile, settings: EngineSettings, height: number) {
  return Math.max(72, height - getPetSize(pet, settings) * 0.82 - 28);
}

export function getFollowTarget(
  cursor: { x: number; y: number },
  index: number,
  size: number,
  bounds: StageBounds
) {
  const ring = Math.floor(index / FOLLOW_SLOTS.length);
  const slot = FOLLOW_SLOTS[index % FOLLOW_SLOTS.length];
  const distance = size * (0.72 + ring * 0.45);
  const x = clamp(cursor.x - size / 2 + slot.x * distance, 8, Math.max(8, bounds.width - size - 8));
  const y = clamp(cursor.y - size / 2 + slot.y * distance, 16, Math.max(16, bounds.height - size - 16));
  return { x, y };
}

export function getScreenRoamTarget(pet: PetProfile, settings: EngineSettings, bounds: StageBounds, random: () => number) {
  const size = getPetSize(pet, settings);
  return {
    x: clamp(8 + random() * Math.max(0, bounds.width - size - 16), 8, Math.max(8, bounds.width - size - 8)),
    y: clamp(16 + random() * Math.max(0, bounds.height - size - 32), 16, Math.max(16, bounds.height - size - 16))
  };
}

export function separateOverlaps(
  runtimes: PetRuntime[],
  pets: PetProfile[],
  settings: EngineSettings,
  bounds: StageBounds,
  mode: "screen" | "ground" = "screen"
) {
  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  const next = runtimes.map((runtime) => ({ ...runtime }));

  for (let i = 0; i < next.length; i += 1) {
    for (let j = i + 1; j < next.length; j += 1) {
      const aPet = petById.get(next[i].id);
      const bPet = petById.get(next[j].id);
      if (!aPet || !bPet) {
        continue;
      }
      if (next[i].behavior === "drag" || next[j].behavior === "drag") {
        continue;
      }
      const aSize = getPetSize(aPet, settings);
      const bSize = getPetSize(bPet, settings);
      const minDist = (aSize + bSize) * 0.34;
      const dx = next[j].x - next[i].x;
      const dy = mode === "ground" ? 0 : next[j].y - next[i].y;
      const rawDist = Math.hypot(dx, dy);
      const dist = Math.max(1, rawDist);
      if (dist >= minDist) {
        continue;
      }
      const push = (minDist - dist) / 2;
      // Exact-coordinate overlaps have no natural direction vector. Pick a
      // stable horizontal axis so the pair can still be separated.
      const ux = rawDist === 0 ? 1 : dx / dist;
      const uy = rawDist === 0 ? 0 : dy / dist;
      next[i].x = clamp(next[i].x - ux * push, 8, Math.max(8, bounds.width - aSize - 8));
      if (mode === "screen") {
        next[i].y = clamp(next[i].y - uy * push, 16, Math.max(16, bounds.height - aSize - 16));
      }
      next[j].x = clamp(next[j].x + ux * push, 8, Math.max(8, bounds.width - bSize - 8));
      if (mode === "screen") {
        next[j].y = clamp(next[j].y + uy * push, 16, Math.max(16, bounds.height - bSize - 16));
      }
    }
  }

  return next;
}

function chooseWeightedBehavior(pet: PetProfile, random: () => number): Behavior {
  const choices: Array<[Behavior, number]> = [
    ["idle", pet.personality.idleWeight],
    ["walk", pet.personality.walkWeight],
    ["sit", pet.personality.sitWeight],
    ["sleep", pet.personality.sleepWeight],
    ["stretch", pet.personality.stretchWeight],
    ["watch", pet.personality.watchWeight]
  ];
  const total = choices.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;

  for (const [behavior, weight] of choices) {
    roll -= weight;
    if (roll <= 0) {
      return behavior;
    }
  }

  return "idle";
}

// Held behaviors keep doing their thing: walkers patrol, everyone else holds pose.
function advanceHeld(
  next: PetRuntime,
  pet: PetProfile,
  settings: EngineSettings,
  delta: number,
  ground: number,
  maxX: number
): PetRuntime {
  if (next.behavior === "walk" || next.behavior === "chase") {
    const step = (0.42 + pet.speed * 0.78) * settings.globalSpeed * (delta / 16.67);
    let x = next.x + step * next.direction;
    let direction = next.direction;
    if (x <= 8 || x >= maxX) {
      direction = direction === 1 ? -1 : 1;
      x = clamp(x, 8, maxX);
    }
    return { ...next, x, y: ground, direction };
  }
  return { ...next, y: ground };
}

function advanceScreenRoam(
  next: PetRuntime,
  pet: PetProfile,
  settings: EngineSettings,
  bounds: StageBounds,
  delta: number,
  now: number,
  random: () => number,
  maxX: number,
  size: number
): PetRuntime {
  const elapsed = now - next.stateStartedAt;

  const isScreenWalker = next.behavior === "walk" || next.behavior === "chase";
  if (
    pet.species === "cat" &&
    isScreenWalker &&
    (next.x <= 32 || next.x >= maxX - 32) &&
    elapsed > 800 &&
    random() < 0.02
  ) {
    const edgeX = next.x <= 32 ? 8 : maxX;
    return { ...next, x: edgeX, direction: edgeX === 8 ? -1 : 1, behavior: "climb", stateStartedAt: now };
  }

  if (next.targetX === undefined || next.targetY === undefined) {
    // Switching from Ground to Screen can leave any autonomous pose active
    // without a two-dimensional target. Seed one immediately; otherwise
    // targetless walk/sit/sleep/watch/stretch states never enter Screen roam.
    const target = getScreenRoamTarget(pet, settings, bounds, random);
    return {
      ...next,
      targetX: target.x,
      targetY: target.y,
      direction: target.x >= next.x ? 1 : -1,
      behavior: "walk",
      stateStartedAt: now
    };
  }

  const target = { x: next.targetX, y: next.targetY };
  const dx = target.x - next.x;
  const dy = target.y - next.y;
  const dist = Math.hypot(dx, dy);
  const arrive = Math.max(30, size * 0.28);

  if (dist > arrive) {
    const step = Math.min(dist, (1.2 + pet.speed * 1.7) * settings.globalSpeed * (delta / 16.67));
    const ratio = step / dist;
    const direction: 1 | -1 = dx >= 0 ? 1 : -1;
    const behavior: Behavior = dist > 320 ? "chase" : "walk";
    return {
      ...next,
      x: clamp(next.x + dx * ratio, 8, maxX),
      y: clamp(next.y + dy * ratio, 16, Math.max(16, bounds.height - size - 16)),
      direction,
      behavior,
      stateStartedAt: next.behavior === behavior ? next.stateStartedAt : now
    };
  }

  if (next.behavior === "idle" || next.behavior === "sit" || next.behavior === "sleep" || next.behavior === "watch") {
    if (elapsed > 2100) {
      const nextTarget = getScreenRoamTarget(pet, settings, bounds, random);
      return {
        ...next,
        targetX: nextTarget.x,
        targetY: nextTarget.y,
        direction: nextTarget.x >= next.x ? 1 : -1,
        behavior: "walk",
        stateStartedAt: now
      };
    }
    return next;
  }

  return {
    ...next,
    behavior: chooseWeightedBehavior(pet, random),
    stateStartedAt: now
  };
}

const CUDDLE_DIST = 118;

/**
 * Mochi and Biscuit cuddle: when both custom cats are resting, the livelier
 * one walks over and then they nap together. Pure pre-pass; runs before the
 * generic neighbor interactions so its cooldown suppresses double-firing.
 */
export function applyCuddle(
  runtimes: PetRuntime[],
  pets: PetProfile[],
  bounds: StageBounds,
  now: number,
  random: () => number = Math.random
): PetRuntime[] {
  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  const mochi = runtimes.find((runtime) => runtime.id === "mochi");
  const biscuit = runtimes.find((runtime) => runtime.id === "biscuit");
  const mochiPet = petById.get("mochi");
  const biscuitPet = petById.get("biscuit");
  if (!mochi || !biscuit || !mochiPet || !biscuitPet) {
    return runtimes;
  }

  const isResting = (runtime: PetRuntime) => runtime.behavior === "idle" || runtime.behavior === "sit";
  if (!isResting(mochi) || !isResting(biscuit)) {
    return runtimes;
  }
  const cooldownOk = now - mochi.lastInteractionAt > 6000 && now - biscuit.lastInteractionAt > 6000;
  if (!cooldownOk || random() > 0.01) {
    return runtimes;
  }

  const dist = Math.abs(mochi.x - biscuit.x);
  if (dist <= CUDDLE_DIST) {
    // Close enough: sync into a shared nap.
    return runtimes.map((runtime) =>
      runtime.id === "mochi" || runtime.id === "biscuit"
        ? { ...runtime, behavior: "sleep", stateStartedAt: now, lastInteractionAt: now }
        : runtime
    );
  }

  // Apart: the higher-energy cat pads over to the other.
  const walkerId = biscuitPet.energy >= mochiPet.energy ? "biscuit" : "mochi";
  const walker = walkerId === "biscuit" ? biscuit : mochi;
  const partner = walkerId === "biscuit" ? mochi : biscuit;
  const side: 1 | -1 = walker.x >= partner.x ? 1 : -1;
  const targetX = clamp(partner.x + side * (CUDDLE_DIST - 26), 40, Math.max(40, bounds.width - 40));
  return runtimes.map((runtime) => {
    if (runtime.id === walkerId) {
      return {
        ...runtime,
        behavior: "come",
        targetX,
        direction: targetX > runtime.x ? 1 : -1,
        stateStartedAt: now,
        lastInteractionAt: now
      };
    }
    if (runtime.id === partner.id) {
      return { ...runtime, lastInteractionAt: now };
    }
    return runtime;
  });
}

function applyFollow(
  next: PetRuntime,
  pet: PetProfile,
  settings: EngineSettings,
  _bounds: StageBounds,
  delta: number,
  now: number,
  follow: FollowContext,
  ground: number,
  maxX: number,
  size: number
): PetRuntime {
  const cursor = follow.cursor!;
  const target = getFollowTarget(cursor, follow.targetIndex ?? 0, size, _bounds);
  const dx = target.x - next.x;
  const dy = target.y - next.y;
  const dist = Math.hypot(dx, dy);
  const arrive = Math.max(30, size * 0.28);
  const canPounce = follow.pounce && pet.species === "cat";
  const elapsed = now - next.stateStartedAt;

  // Pounce state machine: crouch (stalk) then leap (pounce), then watch again.
  if (next.behavior === "stalk") {
    if (elapsed > 620) {
      return { ...next, y: target.y, behavior: "pounce", stateStartedAt: now };
    }
    return { ...next, y: target.y };
  }
  if (next.behavior === "pounce") {
    const progress = Math.min(1, elapsed / 380);
    const y = clamp(
      target.y - Math.sin(progress * Math.PI) * (34 + pet.energy * 26),
      16,
      Math.max(16, _bounds.height - size - 16)
    );
    const x = clamp(next.x + dx * 0.16, 8, maxX);
    if (progress >= 1) {
      return { ...next, x, y: target.y, behavior: "watch", stateStartedAt: now, lastPounceAt: now };
    }
    return { ...next, x, y };
  }

  const pounceReady = next.lastPounceAt === undefined || now - next.lastPounceAt > POUNCE_COOLDOWN_MS;
  if (canPounce && pounceReady && follow.cursorIdleMs > 1400 && dist <= Math.max(arrive, size * 0.72)) {
    return { ...next, y: target.y, direction: dx >= 0 ? 1 : -1, behavior: "stalk", stateStartedAt: now };
  }

  if (dist > arrive) {
    const step = Math.min(dist, (1.2 + pet.speed * 1.7) * settings.globalSpeed * (delta / 16.67));
    const direction: 1 | -1 = dx >= 0 ? 1 : -1;
    const behavior: Behavior = dist > 320 ? "chase" : "walk";
    const stateStartedAt = next.behavior === behavior ? next.stateStartedAt : now;
    const ratio = dist === 0 ? 0 : step / dist;
    return {
      ...next,
      x: clamp(next.x + dx * ratio, 8, maxX),
      y: clamp(next.y + dy * ratio, 16, Math.max(16, _bounds.height - size - 16)),
      direction,
      behavior,
      stateStartedAt
    };
  }

  // Arrived: hold position (deadzone) and just face the cursor. Not snapping to
  // the moving slot each frame is what stops the jitter when the cursor is near.
  const direction: 1 | -1 = dx >= 0 ? 1 : -1;
  return {
    ...next,
    direction,
    behavior: "watch",
    stateStartedAt: next.behavior === "watch" ? next.stateStartedAt : now
  };
}

function keepInBounds(runtime: PetRuntime, pet: PetProfile, settings: EngineSettings, bounds: StageBounds) {
  const maxX = Math.max(8, bounds.width - getPetSize(pet, settings) - 8);
  return {
    ...runtime,
    x: clamp(runtime.x, 8, maxX),
    y: clamp(runtime.y, 16, getGroundY(pet, settings, bounds.height))
  };
}

function defaultScaleSettings(): EngineSettings {
  return {
    alwaysOnTop: true,
    desktopMode: false,
    panelOpen: true,
    showNames: true,
    physics: true,
    clickThrough: false,
    followMode: false,
    pounce: false,
    roamMode: "ground",
    launchAtLogin: false,
    fountain: { enabled: false, x: 0.7 },
    globalScale: 1,
    globalSpeed: 1,
    companionControlsVersion: 1
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
