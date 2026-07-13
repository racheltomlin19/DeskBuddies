import { describe, expect, it } from "vitest";
import {
  initialDockHoverState,
  reduceDockHover,
  shouldCollapseDock,
  type DockHoverEvent,
  type DockHoverState
} from "./panelCollapse";

describe("dock hover state", () => {
  const armedOutside: DockHoverState = { pointerInside: false, focusInside: false, mode: "armed" };
  const latchedInside: DockHoverState = { pointerInside: true, focusInside: false, mode: "manual-latched" };

  it("starts armed and outside", () => {
    expect(initialDockHoverState).toEqual(armedOutside);
  });

  const states: DockHoverState[] = (["armed", "manual-latched"] as const).flatMap((mode) =>
    [false, true].flatMap((pointerInside) =>
      [false, true].map((focusInside) => ({ mode, pointerInside, focusInside })))
  );
  const events: DockHoverEvent[] = [
    { type: "pointer-enter" }, { type: "pointer-leave" }, { type: "focus-in" },
    { type: "focus-out" }, { type: "manual-collapse" }, { type: "dock-session-reset" }
  ];

  function expectedTransition(state: DockHoverState, event: DockHoverEvent) {
    if (event.type === "pointer-enter") return {
      state: { ...state, pointerInside: true }, intent: state.mode === "armed" ? "expand" : "none"
    };
    if (event.type === "pointer-leave") return {
      state: { ...state, pointerInside: false, mode: "armed" },
      intent: state.focusInside ? "none" : "schedule-collapse"
    };
    if (event.type === "focus-in") return { state: { ...state, focusInside: true }, intent: "expand" };
    if (event.type === "focus-out") return {
      state: { ...state, focusInside: false }, intent: state.pointerInside ? "none" : "schedule-collapse"
    };
    if (event.type === "dock-session-reset") return { state: initialDockHoverState, intent: "none" };
    return { state: { ...state, mode: "manual-latched" }, intent: "collapse" };
  }

  it.each(states.flatMap((state) => events.map((event) => [state, event] as const)))(
    "transitions state %o on event %o",
    (state, event) => expect(reduceDockHover(state, event)).toEqual(expectedTransition(state, event))
  );

  it("preserves the manual latch through focus-out and repeated manual collapse", () => {
    const focused = reduceDockHover(latchedInside, { type: "focus-in" }).state;
    const blurred = reduceDockHover(focused, { type: "focus-out" }).state;
    expect(blurred.mode).toBe("manual-latched");
    expect(reduceDockHover(blurred, { type: "manual-collapse" }).state).toEqual(blurred);
  });

  it("clears a manual latch for an undock/redock or dock-side change", () => {
    expect(reduceDockHover(latchedInside, { type: "dock-session-reset" }).state).toEqual(initialDockHoverState);
  });

  it.each([
    [{ docked: false, pointerInside: false, focusInside: false }, false],
    [{ docked: true, pointerInside: true, focusInside: false }, false],
    [{ docked: true, pointerInside: false, focusInside: true }, false],
    [{ docked: true, pointerInside: false, focusInside: false }, true]
  ])("returns the dock collapse intent for %o", (intent, expected) => {
    expect(shouldCollapseDock(intent)).toBe(expected);
  });
});
