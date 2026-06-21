import { useCallback, useEffect, useState } from "react";
import { useLocalStorageState } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";

/**
 * Focus-timer state shared by every window (panel drawer, in-panel pop-out,
 * native pop-out) through localStorage + the cross-window sync in storage.ts.
 * A running timer stores its wall-clock end so windows derive the remaining
 * time independently instead of writing storage every second.
 */
export interface SharedTimerState {
  minutes: number;
  running: boolean;
  /** Wall-clock ms when a running timer hits zero; null while paused. */
  endsAt: number | null;
  /** Remaining seconds while paused; ignored while running. */
  remainingSeconds: number;
}

export const MIN_TIMER_MINUTES = 1;
export const MAX_TIMER_MINUTES = 180;

export const initialTimerState: SharedTimerState = {
  minutes: 25,
  running: false,
  endsAt: null,
  remainingSeconds: 25 * 60
};

export function boundTimerMinutes(minutes: number) {
  return Math.min(MAX_TIMER_MINUTES, Math.max(MIN_TIMER_MINUTES, Math.round(minutes) || MIN_TIMER_MINUTES));
}

export function normalizeTimerState(value: unknown): SharedTimerState {
  if (!value || typeof value !== "object") {
    return { ...initialTimerState };
  }
  const stored = value as Partial<SharedTimerState>;
  const minutes = typeof stored.minutes === "number" ? boundTimerMinutes(stored.minutes) : initialTimerState.minutes;
  const running = stored.running === true && typeof stored.endsAt === "number";
  const remainingSeconds =
    typeof stored.remainingSeconds === "number"
      ? Math.max(0, Math.min(minutes * 60, Math.round(stored.remainingSeconds)))
      : minutes * 60;
  return {
    minutes,
    running,
    endsAt: running ? (stored.endsAt as number) : null,
    remainingSeconds
  };
}

export function getRemainingSeconds(state: SharedTimerState, now: number) {
  if (state.running && state.endsAt !== null) {
    return Math.max(0, Math.ceil((state.endsAt - now) / 1000));
  }
  return state.remainingSeconds;
}

export function startTimer(state: SharedTimerState, now: number): SharedTimerState {
  const remaining = getRemainingSeconds(state, now);
  const seconds = remaining > 0 ? remaining : state.minutes * 60;
  return { ...state, running: true, endsAt: now + seconds * 1000, remainingSeconds: seconds };
}

export function pauseTimer(state: SharedTimerState, now: number): SharedTimerState {
  return { ...state, running: false, endsAt: null, remainingSeconds: getRemainingSeconds(state, now) };
}

export function resetTimer(state: SharedTimerState): SharedTimerState {
  return { ...state, running: false, endsAt: null, remainingSeconds: state.minutes * 60 };
}

export function setTimerMinutes(state: SharedTimerState, minutes: number): SharedTimerState {
  const bounded = boundTimerMinutes(minutes);
  return { minutes: bounded, running: false, endsAt: null, remainingSeconds: bounded * 60 };
}

/** Wall-clock tick + shared storage-backed timer, wired for TimerTool props. */
export function useSharedTimer() {
  const [state, setState] = useLocalStorageState<SharedTimerState>(
    STORAGE_KEYS.timer,
    initialTimerState,
    normalizeTimerState
  );
  const [now, setNow] = useState(() => Date.now());

  const timerSeconds = getRemainingSeconds(state, now);
  const timerRunning = state.running && timerSeconds > 0;

  useEffect(() => {
    if (!state.running) {
      return;
    }
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [state.running]);

  // Finalize a timer that ran out so every window agrees it stopped at 0:00.
  useEffect(() => {
    if (state.running && timerSeconds === 0) {
      setState((current) =>
        current.running ? { ...current, running: false, endsAt: null, remainingSeconds: 0 } : current
      );
    }
  }, [state.running, timerSeconds, setState]);

  const onTimerToggle = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setState((current) => (current.running ? pauseTimer(current, at) : startTimer(current, at)));
  }, [setState]);

  const onTimerReset = useCallback(() => {
    setState((current) => resetTimer(current));
  }, [setState]);

  const onTimerMinutesChange = useCallback(
    (minutes: number) => {
      setState((current) => setTimerMinutes(current, minutes));
    },
    [setState]
  );

  return {
    timerSeconds,
    timerRunning,
    timerMinutes: state.minutes,
    onTimerToggle,
    onTimerReset,
    onTimerMinutesChange
  };
}
