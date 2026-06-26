import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  advanceCompanion,
  applyCuddle,
  applyFountain,
  applyNeighbors,
  clamp,
  commandRuntime,
  createInitialRuntime,
  getGroundY,
  getPetSize,
  reconcileRuntime,
  separateOverlaps,
  type FollowContext
} from "../behaviorEngine";
import type { Behavior, EngineSettings, PetProfile, PetRuntime } from "../types";

export interface SimulationBounds {
  width: number;
  height: number;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

const IDLE_FOLLOW: FollowContext = { active: false, pounce: false, cursor: null, cursorIdleMs: 0 };

interface UseCompanionSimulationArgs {
  companions: PetProfile[];
  settings: EngineSettings;
  getBounds: () => SimulationBounds;
  getFollow?: () => FollowContext;
}

export function resolveSimulationOverlaps(
  runtimes: PetRuntime[],
  companions: PetProfile[],
  settings: EngineSettings,
  bounds: SimulationBounds,
  followActive: boolean
) {
  const mode = followActive || settings.roamMode === "screen" ? "screen" : "ground";
  return separateOverlaps(runtimes, companions, settings, bounds, mode);
}

export function useCompanionSimulation({
  companions,
  settings,
  getBounds,
  getFollow
}: UseCompanionSimulationArgs) {
  const [runtime, setRuntime] = useState<PetRuntime[]>(() => createInitialRuntime(companions, getBounds()));
  const dragRef = useRef<DragState | null>(null);
  const lastFrameRef = useRef<number>(performance.now());
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;
  // Drop points (from spawn-by-drag) waiting for their pet's runtime entry to
  // exist; applied by the tick as soon as the snapshot catches up.
  const pendingPlaceRef = useRef(new Map<string, { x: number; y: number }>());

  useEffect(() => {
    setRuntime((current) => reconcileRuntime(current, companions, getBounds()));
  }, [companions, getBounds]);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      const delta = Math.min(32, now - lastFrameRef.current);
      lastFrameRef.current = now;
      const bounds = getBounds();
      const follow = getFollow ? getFollow() : IDLE_FOLLOW;
      // Consume pending drop placements for pets whose runtime exists. The
      // map mutation happens here (outside the state updater) so StrictMode's
      // double-invoked updaters stay pure.
      let placements: Map<string, { x: number; y: number }> | null = null;
      if (pendingPlaceRef.current.size > 0) {
        const existing = new Set(runtimeRef.current.map((entry) => entry.id));
        for (const [id, point] of Array.from(pendingPlaceRef.current)) {
          if (existing.has(id)) {
            placements = placements ?? new Map();
            placements.set(id, point);
            pendingPlaceRef.current.delete(id);
          }
        }
      }
      setRuntime((current) => {
        const placed = placements
          ? current.map((petRuntime) => {
              const point = placements!.get(petRuntime.id);
              const pet = point ? companions.find((profile) => profile.id === petRuntime.id) : undefined;
              if (!point || !pet) {
                return petRuntime;
              }
              const size = getPetSize(pet, settings);
              return {
                ...petRuntime,
                x: clamp(point.x - size / 2, 8, Math.max(8, bounds.width - size - 8)),
                y: clamp(point.y - size / 2, 16, getGroundY(pet, settings, bounds.height)),
                behavior: "fall" as const,
                vy: 0,
                held: false,
                stateStartedAt: now,
                lastInteractionAt: now
              };
            })
          : current;
        // Ambient interactions run first (skipped while following the cursor).
        const withCuddle = follow.active ? placed : applyCuddle(placed, companions, bounds, now);
        const withNeighbors = follow.active ? withCuddle : applyNeighbors(withCuddle, companions, bounds, now);
        const seeded = follow.active ? withNeighbors : applyFountain(withNeighbors, companions, settings, bounds, now);
        const advanced = seeded.map((petRuntime) => {
          if (dragRef.current?.id === petRuntime.id) {
            return petRuntime;
          }
          const pet = companions.find((profile) => profile.id === petRuntime.id);
          if (!pet) {
            return petRuntime;
          }
          const targetIndex = companions.findIndex((companion) => companion.id === petRuntime.id);
          const petFollow = follow.active ? { ...follow, targetIndex } : follow;
          return advanceCompanion(petRuntime, pet, settings, bounds, delta, now, Math.random, petFollow);
        });
        return resolveSimulationOverlaps(advanced, companions, settings, bounds, follow.active);
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [companions, settings, getBounds, getFollow]);

  const beginDrag = useCallback((id: string, clientX: number, clientY: number) => {
    setRuntime((current) => {
      const entry = current.find((petRuntime) => petRuntime.id === id);
      if (entry) {
        dragRef.current = { id, offsetX: clientX - entry.x, offsetY: clientY - entry.y };
      }
      return current.map((petRuntime) =>
        petRuntime.id === id
          ? { ...petRuntime, behavior: "drag", vy: 0, held: false, stateStartedAt: performance.now() }
          : petRuntime
      );
    });
  }, []);

  const dragPet = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const bounds = getBounds();
      const pet = companions.find((profile) => profile.id === drag.id);
      if (!pet) {
        return;
      }
      const size = getPetSize(pet, settings);
      const nextX = clamp(clientX - drag.offsetX, 8, Math.max(8, bounds.width - size - 8));
      const nextY = clamp(clientY - drag.offsetY, 16, Math.max(16, bounds.height - size * 0.8 - 22));
      setRuntime((current) =>
        current.map((petRuntime) =>
          petRuntime.id === drag.id
            ? { ...petRuntime, x: nextX, y: nextY, behavior: "drag", vy: 0, stateStartedAt: performance.now() }
            : petRuntime
        )
      );
    },
    [companions, settings, getBounds]
  );

  const endDrag = useCallback(
    (throwVx = 0, throwVy = 0) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) {
        return;
      }
      const bounds = getBounds();
      const pet = companions.find((profile) => profile.id === drag.id);
      if (!pet) {
        return;
      }
      const ground = getGroundY(pet, settings, bounds.height);
      const speed = Math.hypot(throwVx, throwVy);
      // A flick past the threshold becomes a spinning toss; otherwise fall/settle.
      const tossed = settings.physics && speed > 6;
      setRuntime((current) =>
        current.map((petRuntime) => {
          if (petRuntime.id !== drag.id) {
            return petRuntime;
          }
          if (tossed) {
            return {
              ...petRuntime,
              behavior: "toss",
              vx: throwVx,
              vy: throwVy,
              rotation: petRuntime.rotation ?? 0,
              stateStartedAt: performance.now()
            };
          }
          return {
            ...petRuntime,
            behavior: petRuntime.y < ground - 4 && settings.physics ? "fall" : "idle",
            vx: 0,
            vy: 0,
            rotation: 0,
            y: settings.physics ? petRuntime.y : ground,
            stateStartedAt: performance.now()
          };
        })
      );
    },
    [companions, settings, getBounds]
  );

  const command = useCallback((behavior: Behavior, ids: string[], hold = false) => {
    const now = performance.now();
    setRuntime((current) =>
      current.map((petRuntime) => (ids.includes(petRuntime.id) ? commandRuntime(petRuntime, behavior, now, hold) : petRuntime))
    );
  }, []);

  // Call: walk the targeted pets to the center of the stage, then greet.
  const come = useCallback(
    (ids: string[]) => {
      const now = performance.now();
      const bounds = getBounds();
      setRuntime((current) =>
        current.map((petRuntime) => {
          if (!ids.includes(petRuntime.id)) {
            return petRuntime;
          }
          const pet = companions.find((profile) => profile.id === petRuntime.id);
          const size = pet ? getPetSize(pet, settings) : 0;
          const targetX = clamp(bounds.width / 2 - size / 2, 8, Math.max(8, bounds.width - size - 8));
          return {
            ...petRuntime,
            behavior: "come",
            targetX,
            direction: targetX > petRuntime.x ? 1 : -1,
            held: false,
            stateStartedAt: now,
            lastInteractionAt: now
          };
        })
      );
    },
    [companions, settings, getBounds]
  );

  // Spawn-by-drag: queue a drop point; the tick applies it once the pet's
  // runtime entry exists (the snapshot adding the pet may arrive after the
  // place command).
  const placeAt = useCallback((id: string, x: number, y: number) => {
    pendingPlaceRef.current.set(id, { x, y });
  }, []);

  // Reset positions: re-lay every summoned pet out along the ground.
  const resetPositions = useCallback(() => {
    dragRef.current = null;
    pendingPlaceRef.current.clear();
    setRuntime(() => createInitialRuntime(companions, getBounds()));
  }, [companions, getBounds]);

  const react = useCallback((id: string, behavior: Behavior = "react") => {
    const now = performance.now();
    setRuntime((current) =>
      current.map((petRuntime) =>
        petRuntime.id === id ? { ...petRuntime, behavior, vy: 0, stateStartedAt: now, lastInteractionAt: now } : petRuntime
      )
    );
  }, []);

  const runtimeMap = useMemo(() => new Map(runtime.map((entry) => [entry.id, entry])), [runtime]);

  return { runtime, runtimeMap, beginDrag, dragPet, endDrag, command, come, react, placeAt, resetPositions };
}
