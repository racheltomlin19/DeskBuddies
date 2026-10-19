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
import {
  OVERLAY_ENTRY_HIT_PADDING,
  OVERLAY_EXIT_HIT_PADDING,
  getOverlayInteractionTransition
} from "./overlay/interactionState";
import { createDragTerminationController, type DragTerminalSignal } from "./overlay/dragTermination";

const emptySnapshot: OverlaySnapshot = { companions: [], settings: { ...initialSettings } };

export function Overlay() {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot>(emptySnapshot);
  const interactiveRef = useRef(false);
  const draggingRef = useRef(false);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const cursorMovedAtRef = useRef(0);
  const dragSampleRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const throwRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const interactionTimeoutRef = useRef<number | null>(null);
  const forceClickThrough = useCallback(() => {
    if (interactionTimeoutRef.current !== null) window.clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = null;
    interactiveRef.current = false;
    window.deskBuddies?.setOverlayInteractive(false);
  }, []);
  const requestOverlayInteraction = useCallback((overPet: boolean, dragging: boolean) => {
    if (interactionTimeoutRef.current !== null) window.clearTimeout(interactionTimeoutRef.current);
    const transition = getOverlayInteractionTransition({ interactive: interactiveRef.current, overPet, dragging });
    if (transition.delay === 0) {
      interactiveRef.current = transition.interactive;
      window.deskBuddies?.setOverlayInteractive(transition.interactive);
      if (transition.interactive) window.deskBuddies?.setOverlayInteractiveHeartbeat?.();
    }
    else interactionTimeoutRef.current = window.setTimeout(() => { interactiveRef.current = false; window.deskBuddies?.setOverlayInteractive(false); }, transition.delay);
  }, []);

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
  const draggingIdRef = useRef<string | null>(null);
  const capturedTargetRef = useRef<HTMLButtonElement | null>(null);
  const capturedPointerIdRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const suppressStaleHitRef = useRef(false);
  const endDragRef = useRef(endDrag);
  endDragRef.current = endDrag;
  const getBoundsRef = useRef(getBounds);
  getBoundsRef.current = getBounds;

  const finishDragRef = useRef<(signal: DragTerminalSignal) => void>(() => undefined);
  finishDragRef.current = (signal) => {
    const id = draggingIdRef.current;
    const moved = pressMovedRef.current;
    const point = lastPointerRef.current;
    const normalRelease = signal === "pointer-up";
    draggingRef.current = false;
    dragSampleRef.current = null;
    suppressClickRef.current = !normalRelease || moved;
    suppressStaleHitRef.current = true;

    if (normalRelease && id && moved && point && isPointInTrashZone(point, getBoundsRef.current())) {
      endDragRef.current(0, 0);
      window.deskBuddies?.requestHidePet?.(id);
    } else {
      const velocity = normalRelease ? throwRef.current : { vx: 0, vy: 0 };
      endDragRef.current(velocity.vx, velocity.vy);
    }

    const target = capturedTargetRef.current;
    const pointerId = capturedPointerIdRef.current;
    capturedTargetRef.current = null;
    capturedPointerIdRef.current = null;
    draggingIdRef.current = null;
    pressOriginRef.current = null;
    if (target && pointerId !== null && signal !== "lost-capture") {
      try {
        if (!target.hasPointerCapture || target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
      } catch { /* capture may already be gone */ }
    }
    forceClickThrough();
    if (signal !== "unmount") setDraggingId(null);
  };
  const terminationRef = useRef<ReturnType<typeof createDragTerminationController> | null>(null);
  if (terminationRef.current === null) {
    terminationRef.current = createDragTerminationController((signal) => finishDragRef.current(signal));
  }

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

  // Pets keep moving while the cursor sits still, so re-evaluate the padded
  // hit test whenever the boxes change. Without this the overlay can stay
  // interactive (blocking desktop clicks) after a pet wanders out from under
  // a stationary cursor — and can't become grabbable when one wanders in.
  useEffect(() => {
    if (draggingRef.current) {
      return;
    }
    if (suppressStaleHitRef.current) {
      suppressStaleHitRef.current = false;
      return;
    }
    const point = lastPointerRef.current;
    if (!point) {
      return;
    }
    if (point.x < 0 || point.y < 0 || point.x > window.innerWidth || point.y > window.innerHeight) {
      forceClickThrough();
      return;
    }
    const padding = interactiveRef.current ? OVERLAY_EXIT_HIT_PADDING : OVERLAY_ENTRY_HIT_PADDING;
    const over = findPetAtPoint(point, boxes, padding) !== null;
    if (over !== interactiveRef.current) {
      requestOverlayInteraction(over, false);
    }
  }, [boxes, requestOverlayInteraction, forceClickThrough]);

  // Safety net for a stranded interactive overlay: keep the main process alive
  // while we hold the mouse, and drop the mode if the pointer is gone, out of
  // bounds, or no longer over a pet. The main process has its own watchdog for
  // the case where this renderer stops running entirely.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!interactiveRef.current) {
        return;
      }
      window.deskBuddies?.setOverlayInteractiveHeartbeat?.();
      const point = lastPointerRef.current;
      if (!point) {
        forceClickThrough();
        return;
      }
      if (point.x < 0 || point.y < 0 || point.x > window.innerWidth || point.y > window.innerHeight) {
        forceClickThrough();
        return;
      }
      const over = findPetAtPoint(point, boxesRef.current, OVERLAY_EXIT_HIT_PADDING) !== null;
      if (!over) {
        forceClickThrough();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [forceClickThrough]);

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      if (draggingRef.current) {
        if (event.pointerId !== capturedPointerIdRef.current) return;
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        if (event.buttons === 0) {
          terminationRef.current?.terminate("buttons-released");
          return;
        }
        terminationRef.current?.noteMovement(true);
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
      if (event.clientX < 0 || event.clientY < 0 || event.clientX > window.innerWidth || event.clientY > window.innerHeight) {
        lastPointerRef.current = null;
        forceClickThrough();
        return;
      }
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      suppressStaleHitRef.current = false;
      // Hysteresis: a wider hit box while already hovering keeps the window from
      // flip-flopping between interactive and click-through as the pet drifts.
      const padding = interactiveRef.current ? OVERLAY_EXIT_HIT_PADDING : OVERLAY_ENTRY_HIT_PADDING;
      const over = findPetAtPoint({ x: event.clientX, y: event.clientY }, boxesRef.current, padding) !== null;
      if (over !== interactiveRef.current) {
        requestOverlayInteraction(over, false);
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [dragPet, requestOverlayInteraction, forceClickThrough]);

  useEffect(() => {
    const terminateUp = (event: globalThis.PointerEvent) => {
      if (event.pointerId === capturedPointerIdRef.current) terminationRef.current?.terminate("pointer-up");
    };
    const terminateCancel = (event: globalThis.PointerEvent) => {
      if (event.pointerId === capturedPointerIdRef.current) terminationRef.current?.terminate("pointer-cancel");
    };
    const terminateBlur = () => {
      lastPointerRef.current = null;
      if (!terminationRef.current?.terminate("blur")) forceClickThrough();
    };
    const terminateHidden = () => {
      if (document.visibilityState === "hidden") {
        lastPointerRef.current = null;
        if (!terminationRef.current?.terminate("page-hide")) forceClickThrough();
      }
    };
    // The pointer left the overlay entirely (multi-monitor edge, window moved,
    // or the cursor jumped without an intermediate pointermove).
    const terminateLeave = () => {
      if (draggingRef.current) {
        return;
      }
      lastPointerRef.current = null;
      forceClickThrough();
    };
    window.addEventListener("pointerup", terminateUp);
    window.addEventListener("pointercancel", terminateCancel);
    window.addEventListener("blur", terminateBlur);
    document.addEventListener("pointerleave", terminateLeave);
    document.addEventListener("visibilitychange", terminateHidden);
    return () => {
      window.removeEventListener("pointerup", terminateUp);
      window.removeEventListener("pointercancel", terminateCancel);
      window.removeEventListener("blur", terminateBlur);
      document.removeEventListener("pointerleave", terminateLeave);
      document.removeEventListener("visibilitychange", terminateHidden);
      terminationRef.current?.dispose();
      forceClickThrough();
    };
  }, [forceClickThrough]);

  const onPetPointerDown = useCallback(
    (id: string, event: PointerEvent<HTMLButtonElement>) => {
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* global recovery remains available */ }
      requestOverlayInteraction(true, true);
      draggingRef.current = true;
      draggingIdRef.current = id;
      capturedTargetRef.current = event.currentTarget;
      capturedPointerIdRef.current = event.pointerId;
      suppressClickRef.current = false;
      setDraggingId(id);
      pressMovedRef.current = false;
      pressOriginRef.current = { x: event.clientX, y: event.clientY };
      dragSampleRef.current = { x: event.clientX, y: event.clientY, t: performance.now() };
      throwRef.current = { vx: 0, vy: 0 };
      beginDrag(id, event.clientX, event.clientY);
      terminationRef.current?.begin();
    },
    [beginDrag, requestOverlayInteraction]
  );

  // A press that never moved is a click: single = react, double = happy hop.
  const onPetClick = useCallback(
    (id: string) => {
      if (suppressClickRef.current || pressMovedRef.current) {
        suppressClickRef.current = false;
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

  const onPetPointerUp = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId === capturedPointerIdRef.current) terminationRef.current?.terminate("pointer-up");
  }, []);
  const onPetPointerCancel = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId === capturedPointerIdRef.current) terminationRef.current?.terminate("pointer-cancel");
  }, []);
  const onPetLostPointerCapture = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId === capturedPointerIdRef.current) terminationRef.current?.terminate("lost-capture");
  }, []);

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
            onPointerCancel={onPetPointerCancel}
            onLostPointerCapture={onPetLostPointerCapture}
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
