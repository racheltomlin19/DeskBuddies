export const DRAG_WATCHDOG_MS = 1_500;

export type DragTerminalSignal =
  | "pointer-up"
  | "pointer-cancel"
  | "lost-capture"
  | "buttons-released"
  | "blur"
  | "page-hide"
  | "watchdog"
  | "unmount";

export interface DragTerminationController {
  begin(): void;
  noteMovement(buttonHeld: boolean): void;
  terminate(signal: DragTerminalSignal): boolean;
  dispose(): void;
}

export function createDragTerminationController(
  onTerminate: (signal: DragTerminalSignal) => void
): DragTerminationController {
  let active = false;
  let watchdog: ReturnType<typeof setTimeout> | null = null;

  const clearWatchdog = () => {
    if (watchdog !== null) clearTimeout(watchdog);
    watchdog = null;
  };
  const terminate = (signal: DragTerminalSignal) => {
    if (!active) return false;
    active = false;
    clearWatchdog();
    onTerminate(signal);
    return true;
  };
  const armWatchdog = () => {
    clearWatchdog();
    watchdog = setTimeout(() => terminate("watchdog"), DRAG_WATCHDOG_MS);
  };

  return {
    begin() {
      active = true;
      armWatchdog();
    },
    noteMovement(buttonHeld) {
      if (active && buttonHeld) armWatchdog();
    },
    terminate,
    dispose() {
      if (!terminate("unmount")) clearWatchdog();
    }
  };
}
