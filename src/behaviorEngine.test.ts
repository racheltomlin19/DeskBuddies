import { describe, expect, it } from "vitest";
import { customCompanions, initialSettings } from "./data";
import {
  advanceCompanion,
  applyCuddle,
  applyFountain,
  applyNeighbors,
  commandRuntime,
  createInitialRuntime,
  getFollowTarget,
  getGroundY,
  getPetSize,
  reconcileRuntime,
  separateOverlaps
} from "./behaviorEngine";
import type { FollowContext } from "./behaviorEngine";
import type { PetRuntime } from "./types";

const bounds = { width: 900, height: 520 };
const buddy1 = customCompanions.find((pet) => pet.id === "buddy1")!;
const buddy2 = customCompanions.find((pet) => pet.id === "buddy2")!;

function runtimeFor(id: string, patch: Partial<PetRuntime> = {}): PetRuntime {
  return {
    id,
    x: 100,
    y: 320,
    direction: 1,
    behavior: "idle",
    vy: 0,
    phase: 0,
    stateStartedAt: 0,
    lastInteractionAt: 0,
    ...patch
  };
}

describe("behavior engine", () => {
  it("creates bounded runtime for each summoned companion", () => {
    const runtimes = createInitialRuntime([buddy1, buddy2], bounds);

    expect(runtimes).toHaveLength(2);
    expect(runtimes[0].id).toBe("buddy1");
    expect(runtimes[0].x).toBeGreaterThanOrEqual(8);
    expect(runtimes[0].y).toBe(getGroundY(buddy1, initialSettings, bounds.height));
  });

  it("reconciles runtime by dropping missing ids and adding new companions", () => {
    const current = [runtimeFor("missing"), runtimeFor("buddy1")];
    const reconciled = reconcileRuntime(current, [buddy1, buddy2], bounds);

    expect(reconciled.map((runtime) => runtime.id)).toEqual(["buddy1", "buddy2"]);
  });

  it("turns an idle Buddy2 into stretch when the weighted roll lands in stretch", () => {
    const next = advanceCompanion(
      runtimeFor("buddy2", { behavior: "idle", stateStartedAt: 0 }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      2500,
      () => 0.82
    );

    expect(next.behavior).toBe("stretch");
  });

  it("turns an idle Buddy1 into watch when the weighted roll lands in watch", () => {
    const next = advanceCompanion(
      runtimeFor("buddy1", { behavior: "idle", stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      2500,
      () => 0.88
    );

    expect(next.behavior).toBe("watch");
  });

  it("lands falling companions on the ground", () => {
    const ground = getGroundY(buddy1, initialSettings, bounds.height);
    const next = advanceCompanion(
      runtimeFor("buddy1", { behavior: "fall", y: ground - 2, vy: 6 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0
    );

    expect(next.behavior).toBe("idle");
    expect(next.y).toBe(ground);
    expect(next.vy).toBe(0);
  });

  it("commands behavior and sets fall velocity only for fall", () => {
    expect(commandRuntime(runtimeFor("buddy1"), "jump", 1200).behavior).toBe("jump");
    expect(commandRuntime(runtimeFor("buddy1"), "fall", 1200).vy).toBe(1);
  });

  it("uses size and global scale together", () => {
    expect(getPetSize(buddy1, { ...initialSettings, globalScale: 1.25 })).toBeGreaterThan(getPetSize(buddy1, initialSettings));
  });
});

describe("held behavior lock", () => {
  it("commandRuntime marks the behavior as held when hold is requested", () => {
    const locked = commandRuntime(runtimeFor("buddy1"), "sit", 1000, true);
    expect(locked.held).toBe(true);
    const loose = commandRuntime(runtimeFor("buddy1"), "sit", 1000);
    expect(loose.held).toBeFalsy();
  });

  it("keeps a held walker patrolling instead of switching randomly", () => {
    const next = advanceCompanion(
      runtimeFor("buddy2", { behavior: "walk", x: 300, direction: 1, held: true, stateStartedAt: 0 }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      5000,
      () => 0
    );
    expect(next.behavior).toBe("walk");
    expect(next.x).toBeGreaterThan(300);
  });

  it("holds a held nap indefinitely", () => {
    const next = advanceCompanion(
      runtimeFor("buddy1", { behavior: "sleep", held: true, stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      60000,
      () => 0
    );
    expect(next.behavior).toBe("sleep");
  });

  it("releases the hold when commanded back to auto", () => {
    const released = commandRuntime(runtimeFor("buddy1", { held: true }), "idle", 1000, false);
    expect(released.held).toBe(false);
  });
});

describe("come to center", () => {
  it("walks toward the target then greets on arrival", () => {
    const walking = advanceCompanion(
      runtimeFor("buddy2", { behavior: "come", x: 100, targetX: 500 }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5
    );
    expect(walking.behavior).toBe("come");
    expect(walking.x).toBeGreaterThan(100);

    const arrived = advanceCompanion(
      runtimeFor("buddy2", { behavior: "come", x: 500, targetX: 500, stateStartedAt: 0 }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5
    );
    expect(arrived.behavior).toBe("greet");
  });
});

describe("standalone pounce", () => {
  it("crouches then leaps then settles without follow mode", () => {
    const crouch = advanceCompanion(
      runtimeFor("buddy1", { behavior: "stalk", stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      600,
      () => 0.5
    );
    expect(crouch.behavior).toBe("pounce");

    const airborne = advanceCompanion(
      runtimeFor("buddy1", { behavior: "pounce", x: 200, direction: 1, stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(airborne.behavior).toBe("pounce");
    expect(airborne.x).toBeGreaterThan(200);

    const landed = advanceCompanion(
      runtimeFor("buddy1", { behavior: "pounce", x: 200, direction: 1, stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      500,
      () => 0.5
    );
    expect(landed.behavior).toBe("idle");
  });
});

describe("cuddle", () => {
  it("sends one cat walking to the other when they are apart and resting", () => {
    const result = applyCuddle(
      [
        runtimeFor("buddy1", { x: 200, behavior: "idle", lastInteractionAt: 0 }),
        runtimeFor("buddy2", { x: 600, behavior: "idle", lastInteractionAt: 0 })
      ],
      [buddy1, buddy2],
      bounds,
      10000,
      () => 0
    );
    const behaviors = result.map((runtime) => runtime.behavior);
    expect(behaviors).toContain("come");
  });

  it("syncs both into a nap when they are already close and resting", () => {
    const result = applyCuddle(
      [
        runtimeFor("buddy1", { x: 300, behavior: "idle", lastInteractionAt: 0 }),
        runtimeFor("buddy2", { x: 360, behavior: "idle", lastInteractionAt: 0 })
      ],
      [buddy1, buddy2],
      bounds,
      10000,
      () => 0
    );
    expect(result.map((runtime) => runtime.behavior)).toEqual(["sleep", "sleep"]);
  });
});

describe("follow mode", () => {
  it("does not jitter its position once inside the arrival deadzone", () => {
    const size = getPetSize(buddy2, initialSettings);
    const target = getFollowTarget({ x: 320, y: 300 }, 0, size, bounds);
    const next = advanceCompanion(
      runtimeFor("buddy2", { x: target.x + 4, y: target.y - 3, behavior: "watch", stateStartedAt: 0 }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5,
      { active: true, pounce: false, cursor: { x: 320, y: 300 }, cursorIdleMs: 0, targetIndex: 0 }
    );
    expect(next.x).toBe(target.x + 4);
    expect(next.y).toBe(target.y - 3);
  });


  it("assigns separate follow slots around the cursor", () => {
    const first = getFollowTarget({ x: 450, y: 260 }, 0, 120, bounds);
    const second = getFollowTarget({ x: 450, y: 260 }, 1, 120, bounds);

    expect(first).not.toEqual(second);
  });

  it("walks toward a far cursor and faces it", () => {
    const next = advanceCompanion(
      runtimeFor("buddy2", { x: 100, behavior: "idle" }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5,
      { active: true, pounce: false, cursor: { x: 700, y: 300 }, cursorIdleMs: 0 }
    );
    expect(next.x).toBeGreaterThan(100);
    expect(next.direction).toBe(1);
    expect(["walk", "chase"]).toContain(next.behavior);
  });

  it("follow mode moves toward cursor y as well as x", () => {
    const next = advanceCompanion(
      runtimeFor("buddy1", { x: 100, y: 400, behavior: "idle" }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5,
      { active: true, pounce: false, cursor: { x: 700, y: 120 }, cursorIdleMs: 0, targetIndex: 0 }
    );

    expect(next.x).toBeGreaterThan(100);
    expect(next.y).toBeLessThan(400);
  });

  it("watches the cursor once it has arrived", () => {
    const target = getFollowTarget({ x: 320, y: 300 }, 0, getPetSize(buddy2, initialSettings), bounds);
    const next = advanceCompanion(
      runtimeFor("buddy2", { x: target.x, y: target.y, behavior: "walk" }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5,
      { active: true, pounce: false, cursor: { x: 320, y: 300 }, cursorIdleMs: 0, targetIndex: 0 }
    );
    expect(next.behavior).toBe("watch");
  });

  it("makes a cat stalk then pounce when the cursor sits still nearby", () => {
    const follow: FollowContext = { active: true, pounce: true, cursor: { x: 320, y: 300 }, cursorIdleMs: 1600, targetIndex: 0 };
    const target = getFollowTarget({ x: 320, y: 300 }, 0, getPetSize(buddy1, initialSettings), bounds);
    const stalking = advanceCompanion(
      runtimeFor("buddy1", { x: target.x, y: target.y, behavior: "watch", stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5,
      follow
    );
    expect(stalking.behavior).toBe("stalk");

    const pouncing = advanceCompanion(
      { ...stalking, stateStartedAt: 0 },
      buddy1,
      initialSettings,
      bounds,
      16.67,
      700,
      () => 0.5,
      follow
    );
    expect(pouncing.behavior).toBe("pounce");
  });

  it("separates overlapping follow-mode pets", () => {
    const separated = separateOverlaps(
      [
        runtimeFor("buddy1", { x: 300, y: 200 }),
        runtimeFor("buddy2", { x: 305, y: 205 })
      ],
      [buddy1, buddy2],
      initialSettings,
      bounds
    );

    expect(Math.hypot(separated[0].x - separated[1].x, separated[0].y - separated[1].y)).toBeGreaterThan(20);
  });

  it("separates pets that start at the exact same coordinates", () => {
    const separated = separateOverlaps(
      [
        runtimeFor("buddy1", { x: 300, y: 200 }),
        runtimeFor("buddy2", { x: 300, y: 200 })
      ],
      [buddy1, buddy2],
      initialSettings,
      bounds
    );

    expect(Math.hypot(separated[0].x - separated[1].x, separated[0].y - separated[1].y)).toBeGreaterThan(20);
  });

  it("pounces near the assigned follow slot when the cursor idles", () => {
    const stalking = advanceCompanion(
      runtimeFor("buddy1", { x: 370, y: 210, behavior: "watch", stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5,
      { active: true, pounce: true, cursor: { x: 450, y: 260 }, cursorIdleMs: 1500, targetIndex: 0 }
    );

    expect(stalking.behavior).toBe("stalk");
  });

  it("lands a follow pounce into watch and stamps the pounce time", () => {
    const target = getFollowTarget({ x: 320, y: 300 }, 0, getPetSize(buddy1, initialSettings), bounds);
    const landed = advanceCompanion(
      runtimeFor("buddy1", { x: target.x, y: target.y, behavior: "pounce", stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      500,
      () => 0.5,
      { active: true, pounce: true, cursor: { x: 320, y: 300 }, cursorIdleMs: 3000, targetIndex: 0 }
    );
    expect(landed.behavior).toBe("watch");
    expect(landed.lastPounceAt).toBe(500);
  });

  it("keeps an airborne follow pounce fully inside the screen", () => {
    const target = getFollowTarget({ x: 0, y: 0 }, 0, getPetSize(buddy1, initialSettings), bounds);
    const airborne = advanceCompanion(
      runtimeFor("buddy1", { x: target.x, y: target.y, behavior: "pounce", stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      190,
      () => 0.5,
      { active: true, pounce: true, cursor: { x: 0, y: 0 }, cursorIdleMs: 3000, targetIndex: 0 }
    );

    expect(airborne.y).toBeGreaterThanOrEqual(16);
  });

  it("does not immediately re-stalk an idle cursor after landing a pounce", () => {
    const target = getFollowTarget({ x: 320, y: 300 }, 0, getPetSize(buddy1, initialSettings), bounds);
    const followIdle: FollowContext = { active: true, pounce: true, cursor: { x: 320, y: 300 }, cursorIdleMs: 5000, targetIndex: 0 };

    const cooling = advanceCompanion(
      runtimeFor("buddy1", { x: target.x, y: target.y, behavior: "watch", stateStartedAt: 500, lastPounceAt: 500 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5,
      followIdle
    );
    expect(cooling.behavior).toBe("watch");

    const ready = advanceCompanion(
      runtimeFor("buddy1", { x: target.x, y: target.y, behavior: "watch", stateStartedAt: 500, lastPounceAt: 500 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      6000,
      () => 0.5,
      followIdle
    );
    expect(ready.behavior).toBe("stalk");
  });

  it("does not pounce when pounce is disabled", () => {
    const target = getFollowTarget({ x: 320, y: 300 }, 0, getPetSize(buddy1, initialSettings), bounds);
    const next = advanceCompanion(
      runtimeFor("buddy1", { x: target.x, y: target.y, behavior: "watch", stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5,
      { active: true, pounce: false, cursor: { x: 320, y: 300 }, cursorIdleMs: 5000, targetIndex: 0 }
    );
    expect(next.behavior).toBe("watch");
  });

  it("ignores follow while being dragged", () => {
    const next = advanceCompanion(
      runtimeFor("buddy2", { behavior: "drag" }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5,
      { active: true, pounce: true, cursor: { x: 700, y: 300 }, cursorIdleMs: 5000 }
    );
    expect(next.behavior).toBe("drag");
  });
});

describe("grab and toss", () => {
  it("carries a tossed pet sideways and spins it mid-air", () => {
    const mid = advanceCompanion(
      runtimeFor("buddy1", { behavior: "toss", x: 200, y: 100, vx: 6, vy: -4, rotation: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(mid.behavior).toBe("toss");
    expect(mid.x).toBeGreaterThan(200);
    expect(mid.rotation).not.toBe(0);
  });

  it("lands a tossed pet on its feet and clears spin/velocity", () => {
    const ground = getGroundY(buddy1, initialSettings, bounds.height);
    const landed = advanceCompanion(
      runtimeFor("buddy1", { behavior: "toss", x: 200, y: ground - 1, vx: 2, vy: 5, rotation: 40 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(landed.behavior).toBe("idle");
    expect(landed.y).toBe(ground);
    expect(landed.rotation).toBe(0);
    expect(landed.vx).toBe(0);
  });

  it("settles instead of tossing when physics is off", () => {
    const ground = getGroundY(buddy1, initialSettings, bounds.height);
    const settled = advanceCompanion(
      runtimeFor("buddy1", { behavior: "toss", x: 200, y: 100, vx: 6, vy: -4 }),
      buddy1,
      { ...initialSettings, physics: false },
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(settled.behavior).toBe("idle");
    expect(settled.y).toBe(ground);
  });
});

describe("zoomies", () => {
  it("bursts into zoomies from idle when the roll lands in the window", () => {
    const next = advanceCompanion(
      runtimeFor("buddy2", { behavior: "idle", x: 300, stateStartedAt: 0 }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      2000,
      () => 0
    );
    expect(next.behavior).toBe("zoomies");
    expect(next.targetX).toBeDefined();
  });

  it("sprints faster than a normal walk", () => {
    const zoom = advanceCompanion(
      runtimeFor("buddy2", { behavior: "zoomies", x: 300, targetX: 800, direction: 1 }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    const walk = advanceCompanion(
      runtimeFor("buddy2", { behavior: "walk", x: 300, direction: 1 }),
      buddy2,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(zoom.x - 300).toBeGreaterThan(walk.x - 300);
  });
});

describe("click reaction", () => {
  it("holds the react pose briefly then returns to idle", () => {
    const held = advanceCompanion(
      runtimeFor("buddy1", { behavior: "react", stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(held.behavior).toBe("react");

    const done = advanceCompanion(
      runtimeFor("buddy1", { behavior: "react", stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5
    );
    expect(done.behavior).toBe("idle");
  });
});

describe("edge climb and perch", () => {
  it("starts climbing when a walking cat is pinned to the edge", () => {
    const climbed = advanceCompanion(
      runtimeFor("buddy1", { behavior: "walk", x: 10, direction: -1, stateStartedAt: 0 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0
    );
    expect(climbed.behavior).toBe("climb");
  });

  it("climbs upward and reaches a perch", () => {
    const mid = advanceCompanion(
      runtimeFor("buddy1", { behavior: "climb", x: 8, y: 200 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(mid.behavior).toBe("climb");
    expect(mid.y).toBeLessThan(200);

    const top = advanceCompanion(
      runtimeFor("buddy1", { behavior: "climb", x: 8, y: 25 }),
      buddy1,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(top.behavior).toBe("perch");
  });
});

describe("buddy2 fountain", () => {
  const enabled = { ...initialSettings, fountain: { enabled: true, x: 0.7 } };

  it("sends Buddy2 to drink when the roll lands and the fountain is on", () => {
    const runtimes = [runtimeFor("buddy2", { behavior: "idle", lastInteractionAt: 0 })];
    const result = applyFountain(runtimes, [buddy2], enabled, bounds, 10000, () => 0);
    expect(result[0].behavior).toBe("drink");
    expect(result[0].targetX).toBeGreaterThan(0);
  });

  it("never sends Buddy1 to the fountain", () => {
    const runtimes = [runtimeFor("buddy1", { behavior: "idle", lastInteractionAt: 0 })];
    const result = applyFountain(runtimes, [buddy1], enabled, bounds, 10000, () => 0);
    expect(result[0].behavior).toBe("idle");
  });

  it("is a no-op when the fountain is disabled", () => {
    const runtimes = [runtimeFor("buddy2", { behavior: "idle", lastInteractionAt: 0 })];
    const disabled = { ...initialSettings, fountain: { enabled: false, x: 0.7 } };
    const result = applyFountain(runtimes, [buddy2], disabled, bounds, 10000, () => 0);
    expect(result).toBe(runtimes);
  });
});

describe("pet-to-pet interactions", () => {
  const restingCats = () => [
    runtimeFor("buddy1", { x: 300, behavior: "idle", lastInteractionAt: 0 }),
    runtimeFor("buddy2", { x: 360, behavior: "idle", lastInteractionAt: 0 })
  ];

  it("naps two nearby resting cats together on a low roll", () => {
    const result = applyNeighbors(restingCats(), [buddy1, buddy2], bounds, 10000, () => 0);
    expect(result.map((runtime) => runtime.behavior)).toEqual(["sleep", "sleep"]);
  });

  it("leaves cats alone when they are far apart", () => {
    const far = [
      runtimeFor("buddy1", { x: 100, behavior: "idle", lastInteractionAt: 0 }),
      runtimeFor("buddy2", { x: 800, behavior: "idle", lastInteractionAt: 0 })
    ];
    const result = applyNeighbors(far, [buddy1, buddy2], bounds, 10000, () => 0);
    expect(result).toBe(far);
  });

  it("does nothing while the interaction is on cooldown", () => {
    const recent = [
      runtimeFor("buddy1", { x: 300, behavior: "idle", lastInteractionAt: 9000 }),
      runtimeFor("buddy2", { x: 360, behavior: "idle", lastInteractionAt: 9000 })
    ];
    const result = applyNeighbors(recent, [buddy1, buddy2], bounds, 10000, () => 0);
    expect(result).toBe(recent);
  });
});

describe("autonomous roaming mode", () => {
  it.each(["walk", "sit", "sleep", "watch", "stretch"] as const)(
    "starts Screen roaming immediately when switched from %s without a target",
    (behavior) => {
      const next = advanceCompanion(
        runtimeFor("buddy1", { behavior, x: 100, y: getGroundY(buddy1, initialSettings, bounds.height), stateStartedAt: 0 }),
        buddy1,
        { ...initialSettings, roamMode: "screen" },
        bounds,
        16.67,
        100,
        () => 0
      );

      expect(next.behavior).toBe("walk");
      expect(next.targetX).toBeDefined();
      expect(next.targetY).toBeDefined();
      expect(next.targetY).not.toBe(getGroundY(buddy1, initialSettings, bounds.height));
    }
  );

  it("chooses an in-bounds two-dimensional target in Screen mode", () => {
    const next = advanceCompanion(
      runtimeFor("buddy1", { behavior: "idle", x: 100, y: 300, stateStartedAt: 0 }),
      buddy1,
      { ...initialSettings, roamMode: "screen" },
      bounds,
      16.67,
      2500,
      () => 0
    );
    expect(next.targetX).toBeDefined();
    expect(next.targetY).toBeDefined();
    expect(next.targetY).not.toBe(getGroundY(buddy1, initialSettings, bounds.height));
  });

  it("rests at a Screen target without snapping to ground", () => {
    const next = advanceCompanion(
      runtimeFor("buddy1", { behavior: "walk", x: 240, y: 120, targetX: 240, targetY: 120, stateStartedAt: 0 }),
      buddy1,
      { ...initialSettings, roamMode: "screen" },
      bounds,
      16.67,
      4000,
      () => 0.5
    );
    expect(next.y).toBe(120);
    expect(next.behavior).toMatch(/idle|sit|sleep|watch/);
  });

  it("keeps Ground autonomous pets on getGroundY", () => {
    const next = advanceCompanion(
      runtimeFor("buddy1", { behavior: "idle", y: 100, stateStartedAt: 0 }),
      buddy1,
      { ...initialSettings, roamMode: "ground" },
      bounds,
      16.67,
      2500,
      () => 0
    );
    expect(next.y).toBe(getGroundY(buddy1, initialSettings, bounds.height));
  });

  it("keeps an already-climbing Screen cat moving to its perch", () => {
    const climbing = advanceCompanion(
      runtimeFor("buddy1", { behavior: "climb", x: 8, y: 200, stateStartedAt: 0 }),
      buddy1,
      { ...initialSettings, roamMode: "screen" },
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(climbing.behavior).toBe("climb");
    expect(climbing.y).toBeLessThan(200);

    const perched = advanceCompanion(
      runtimeFor("buddy1", { behavior: "climb", x: 8, y: 25, stateStartedAt: 0 }),
      buddy1,
      { ...initialSettings, roamMode: "screen" },
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(perched.behavior).toBe("perch");
  });

  it("lets a walking Screen cat enter the existing edge climb", () => {
    const next = advanceCompanion(
      runtimeFor("buddy1", { behavior: "walk", x: 10, direction: -1, stateStartedAt: 0 }),
      buddy1,
      { ...initialSettings, roamMode: "screen" },
      bounds,
      16.67,
      1000,
      () => 0
    );
    expect(next.behavior).toBe("climb");
  });

  it("keeps a Screen cat off ground when its edge climb roll fails", () => {
    const next = advanceCompanion(
      runtimeFor("buddy1", { behavior: "walk", x: 10, y: 120, targetX: 120, targetY: 120, stateStartedAt: 0 }),
      buddy1,
      { ...initialSettings, roamMode: "screen" },
      bounds,
      16.67,
      1000,
      () => 0.5
    );
    expect(next.behavior).toBe("walk");
    expect(next.x).toBeGreaterThan(10);
    expect(next.y).toBe(120);
    expect(next.targetY).toBe(120);
  });
});
