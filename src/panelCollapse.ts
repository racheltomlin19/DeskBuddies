export interface DockCollapseIntent {
  docked: boolean;
  pointerInside: boolean;
  focusInside: boolean;
}

export type DockHoverMode = "armed" | "manual-latched";

export interface DockHoverState {
  pointerInside: boolean;
  focusInside: boolean;
  mode: DockHoverMode;
}

export type DockHoverEvent =
  | { type: "pointer-enter" }
  | { type: "pointer-leave" }
  | { type: "focus-in" }
  | { type: "focus-out" }
  | { type: "manual-collapse" }
  | { type: "dock-session-reset" };

export type DockHoverIntent = "none" | "expand" | "collapse" | "schedule-collapse";

export interface DockHoverTransition {
  state: DockHoverState;
  intent: DockHoverIntent;
}

export const initialDockHoverState: DockHoverState = {
  pointerInside: false,
  focusInside: false,
  mode: "armed"
};

export function reduceDockHover(state: DockHoverState, event: DockHoverEvent): DockHoverTransition {
  switch (event.type) {
    case "pointer-enter":
      return {
        state: { ...state, pointerInside: true },
        intent: state.mode === "armed" ? "expand" : "none"
      };
    case "pointer-leave": {
      const next = { ...state, pointerInside: false, mode: "armed" as const };
      return { state: next, intent: next.focusInside ? "none" : "schedule-collapse" };
    }
    case "focus-in":
      return { state: { ...state, focusInside: true }, intent: "expand" };
    case "focus-out": {
      const next = { ...state, focusInside: false };
      return { state: next, intent: next.pointerInside ? "none" : "schedule-collapse" };
    }
    case "manual-collapse":
      return { state: { ...state, mode: "manual-latched" }, intent: "collapse" };
    case "dock-session-reset":
      return { state: initialDockHoverState, intent: "none" };
  }
}

export function shouldCollapseDock({ docked, pointerInside, focusInside }: DockCollapseIntent): boolean {
  return docked && !pointerInside && !focusInside;
}
