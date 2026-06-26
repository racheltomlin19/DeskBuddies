import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { PetAvatar } from "./PetAvatar";
import { Fountain } from "./avatars/Fountain";
import { getFountainX, getPetSize } from "./behaviorEngine";
import { normalizeSnapshot, type OverlaySnapshot } from "./shared/overlayBridge";
import { findPetAtPoint, getTrashZone, isPointInTrashZone, type PetBox } from "./overlay/hitTest";
import { useCompanionSimulation, type SimulationBounds } from "./overlay/useCompanionSimulation";
import type { FollowContext } from "./behaviorEngine";
import { initialSettings } from "./data";
import { getOverlayInteractionTransition } from "./overlay/interactionState";

const emptySnapshot: OverlaySnapshot = { companions: [], settings: { ...initialSettings } };

export function Overlay() {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot>(emptySnapshot);
  const interactiveRef = useRef(false);
  const draggingRef = useRef(false);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const cursorMovedAtRef = useRef(0);
  const dragSampleRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const throwRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const interactionTimeoutRef = useRef<number | null>(null);
  const requestOverlayInteraction = useCallback((overPet: boolean, dragging: boolean) => {
    if (interactionTimeoutRef.current !== null) window.clearTimeout(interactionTimeoutRef.current);
    const transition = getOverlayInteractionTransition({ interactive: interactiveRef.current, overPet, dragging });
    if (transition.delay === 0) { interactiveRef.current = transition.interactive; window.deskBuddies?.setOverlayInteractive(transition.interactive); }
    else interactionTimeoutRef.current = window.setTimeout(() => { interactiveRef.current = false; window.deskBuddies?.setOverlayInteractive(false); }, transition.delay);
  }, []);
  useEffect(() => () => { if (interactionTimeoutRef.current !== null) window.clearTimeout(interactionTimeoutRef.current); }, []);

  const getBounds = useCallback((): SimulationBounds => ({ width: window.innerWidth, height: window.innerHeight }), []);

  const followMode = snapshot.settings.followMode;
  const pounce = snapshot.settings.pounce;
  const getFollow = useCallback(
    (): FollowContext => ({
      active: Boolean(followMode) && cursorRef.current !== null,
      pounce: Boolean(pounce),
      cursor: cursorRef.current,
      cursorIdleMs: performance.now() - cursorMovedAtRef.current
    }),
    [followMode, pounce]
  );

  const { runtime, runtimeMap, beginDrag, dragPet, endDrag, command, come, react, placeAt, resetPositions } =
    useCompanionSimulation({
      companions: snapshot.companions,
      settings: snapshot.settings,
      getBounds,
      getFollow
    });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const pressMovedRef = useRef(false);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const lastClickRef = useRef<{ id: string; t: number } | null>(null);

  useEffect(() => {
    if (!window.deskBuddies) {
      return;
    }
    const unsubscribe = window.deskBuddies.onSnapshot((value) => setSnapshot(normalizeSnapshot(value)));
    window.deskBuddies.requestSnapshot();
    return unsubscribe;
  }, []);

  // Track the cursor (from the main-process pump) and when it last moved.
  useEffect(() => {
    if (!window.deskBuddies?.onCursor) {
      return;
    }
    return window.deskBuddies.onCursor((point) => {
      const prev = cursorRef.current;
      if (!point || !prev || Math.hypot(point.x - prev.x, point.y - prev.y) > 3) {
        cursorMovedAtRef.current = performance.now();
      }
      cursorRef.current = point;
    });
  }, []);

  // Apply behavior commands pushed from the panel.
  useEffect(() => {
    if (!window.deskBuddies?.onCommand) {
      return;
    }
    // placeAt/resetPositions/command/come are stable or derived from the
    // snapshot, so re-subscribing on their identity change is cheap.
    return window.deskBuddies.onCommand((incoming) => {
      if (incoming.action === "resetPositions") {
        resetPositions();
        return;
      }
      if (incoming.action === "place" && incoming.id && typeof incoming.x === "number" && typeof incoming.y === "number") {
        placeAt(incoming.id, incoming.x, incoming.y);
        return;
      }
      const ids =
        incoming.target === "all"
          ? snapshot.companions.map((pet) => pet.id)
          : incoming.id
            ? [incoming.id]
            : snapshot.companions.slice(0, 1).map((pet) => pet.id);
      if (incoming.behavior === "come") {
        come(ids);
        return;
      }
      command(incoming.behavior, ids, Boolean(incoming.hold));
    });
  }, [command, come, placeAt, resetPositions, snapshot.companions]);

  const boxes = useMemo<PetBox[]>(() => {
    return runtime
      .map((entry) => {
        const pet = snapshot.companions.find((profile) => profile.id === entry.id);
        if (!pet) {
          return null;
        }
        const size = getPetSize(pet, snapshot.settings);
        return { id: entry.id, x: entry.x, y: entry.y, width: size, height: size };
      })
      .filter((box): box is PetBox => box !== null);
  }, [runtime, snapshot]);

  const boxesRef = useRef(boxes);
  boxesRef.current = boxes;
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  // Pets keep moving while the cursor sits still, so re-evaluate the padded
  // hit test whenever the boxes change. Without this the overlay can stay
  // interactive (blocking desktop clicks) after a pet wanders out from under
  // a stationary cursor — and can't become grabbable when one wanders in.
  useEffect(() => {
    if (draggingRef.current) {
      return;
    }
    const point = lastPointerRef.current;
    if (!point) {
      return;
    }
    const padding = interactiveRef.current ? 34 : 14;
    const over = findPetAtPoint(point, boxes, padding) !== null;
    if (over !== interactiveRef.current) {
      requestOverlayInteraction(over, false);
    }
  }, [boxes, requestOverlayInteraction]);

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      if (draggingRef.current) {
        // Sample pointer velocity so a flick on release becomes a toss.
        const nowT = performance.now();
        const prev = dragSampleRef.current;
        if (prev) {
          const dt = Math.max(1, nowT - prev.t);
          throwRef.current = {
            vx: ((event.clientX - prev.x) / dt) * 16,
            vy: ((event.clientY - prev.y) / dt) * 16
          };
        }
        const origin = pressOriginRef.current;
        if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 5) {
          pressMovedRef.current = true;
        }
        dragSampleRef.current = { x: event.clientX, y: event.clientY, t: nowT };
        dragPet(event.clientX, event.clientY);
        return;
      }
      // Hysteresis: a wider hit box while already hovering keeps the window from
      // flip-flopping between interactive and click-through as the pet drifts.
      const padding = interactiveRef.current ? 34 : 14;
      const over = findPetAtPoint({ x: event.clientX, y: event.clientY }, boxesRef.current, padding) !== null;
      if (over !== interactiveRef.current) {
        requestOverlayInteraction(over, false);
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [dragPet, requestOverlayInteraction]);

  const onPetPointerDown = useCallback(
    (id: string, event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      requestOverlayInteraction(true, true);
      draggingRef.current = true;
      setDraggingId(id);
      pressMovedRef.current = false;
      pressOriginRef.current = { x: event.clientX, y: event.clientY };
      dragSampleRef.current = { x: event.clientX, y: event.clientY, t: performance.now() };
      throwRef.current = { vx: 0, vy: 0 };
      beginDrag(id, event.clientX, event.clientY);
    },
    [beginDrag, requestOverlayInteraction]
  );

  // A press that never moved is a click: single = react, double = happy hop.
  const onPetClick = useCallback(
    (id: string) => {
      if (pressMovedRef.current) {
        return;
      }
      const nowT = performance.now();
      const last = lastClickRef.current;
      if (last && last.id === id && nowT - last.t < 320) {
        lastClickRef.current = null;
        command("jump", [id]);
      } else {
        lastClickRef.current = { id, t: nowT };
        react(id);
      }
    },
    [command, react]
  );

  const onPetPointerUp = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      dragSampleRef.current = null;
      const point = lastPointerRef.current;
      // A real drag released over the trash corner hides the pet instead of
      // tossing it. Clicks (no movement) can never trigger the trash.
      if (draggingId && pressMovedRef.current && point && isPointInTrashZone(point, getBounds())) {
        endDrag(0, 0);
        window.deskBuddies?.requestHidePet?.(draggingId);
      } else {
        endDrag(throwRef.current.vx, throwRef.current.vy);
      }
    }
    requestOverlayInteraction(false, false);
    setDraggingId(null);
  }, [draggingId, endDrag, getBounds, requestOverlayInteraction]);

  const fountainSize = 120;
  const fountainLeft = getFountainX(snapshot.settings, window.innerWidth) - fountainSize / 2;

  const trashZone = draggingId ? getTrashZone(getBounds()) : null;
  const draggedRuntime = draggingId ? runtimeMap.get(draggingId) : undefined;
  const draggedPet = draggingId ? snapshot.companions.find((pet) => pet.id === draggingId) : undefined;
  const trashActive = Boolean(
    trashZone &&
      draggedRuntime &&
      draggedPet &&
      isPointInTrashZone(
        {
          x: draggedRuntime.x + getPetSize(draggedPet, snapshot.settings) / 2,
          y: draggedRuntime.y + getPetSize(draggedPet, snapshot.settings) / 2
        },
        getBounds()
      )
  );

  return (
    <div className="overlay-stage">
      {snapshot.settings.fountain.enabled && (
        <div
          className="overlay-fountain"
          style={{ transform: `translate3d(${fountainLeft}px, ${window.innerHeight - 150}px, 0)`, width: fountainSize }}
          aria-hidden="true"
        >
          <Fountain />
        </div>
      )}
      {trashZone && (
        <div
          className={`overlay-trash ${trashActive ? "active" : ""}`}
          style={{ left: trashZone.x, top: trashZone.y, width: trashZone.width, height: trashZone.height }}
          aria-hidden="true"
        >
          <Trash2 size={40} />
          <span>Hide</span>
        </div>
      )}
      {snapshot.companions.map((pet) => {
        const current = runtimeMap.get(pet.id);
        if (!current) {
          return null;
        }
        const size = getPetSize(pet, snapshot.settings);
        return (
          <button
            key={pet.id}
            type="button"
            className={`overlay-pet behavior-${current.behavior}`}
            style={{
              transform: `translate3d(${current.x}px, ${current.y}px, 0) rotate(${current.rotation ?? 0}deg)`,
              width: size,
              height: size
            }}
            onPointerDown={(event) => onPetPointerDown(pet.id, event)}
            onPointerUp={onPetPointerUp}
            onPointerCancel={onPetPointerUp}
            onClick={() => onPetClick(pet.id)}
          >
            <div className="overlay-pet-art" style={{ transform: `scaleX(${current.direction})` }}>
              <PetAvatar pet={pet} behavior={current.behavior} />
            </div>
            {snapshot.settings.showNames && <span className="pet-name">{pet.name}</span>}
            {current.behavior === "react" && (
              <span className="pet-hearts" aria-hidden="true">
                <span>♥</span>
                <span>♥</span>
                <span>♥</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
