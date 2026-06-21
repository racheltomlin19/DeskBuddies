import { describe, expect, it } from "vitest";
import {
  boundTimerMinutes,
  getRemainingSeconds,
  initialTimerState,
  normalizeTimerState,
  pauseTimer,
  resetTimer,
  setTimerMinutes,
  startTimer
} from "./timerState";

const T0 = 1_000_000;

describe("shared timer state", () => {
  it("starts by pinning the wall-clock end time", () => {
    const started = startTimer(initialTimerState, T0);
    expect(started.running).toBe(true);
    expect(started.endsAt).toBe(T0 + 25 * 60 * 1000);
    expect(getRemainingSeconds(started, T0)).toBe(25 * 60);
    expect(getRemainingSeconds(started, T0 + 90_000)).toBe(25 * 60 - 90);
  });

  it("pauses by banking the remaining seconds", () => {
    const started = startTimer(initialTimerState, T0);
    const paused = pauseTimer(started, T0 + 60_000);
    expect(paused.running).toBe(false);
    expect(paused.endsAt).toBeNull();
    expect(paused.remainingSeconds).toBe(24 * 60);
    // Resume: continues from where it stopped.
    const resumed = startTimer(paused, T0 + 120_000);
    expect(getRemainingSeconds(resumed, T0 + 120_000)).toBe(24 * 60);
  });

  it("never goes below zero and restarts a finished timer from the full duration", () => {
    const started = startTimer(initialTimerState, T0);
    expect(getRemainingSeconds(started, T0 + 26 * 60 * 1000)).toBe(0);
    const finished = pauseTimer(started, T0 + 26 * 60 * 1000);
    const restarted = startTimer(finished, T0 + 27 * 60 * 1000);
    expect(getRemainingSeconds(restarted, T0 + 27 * 60 * 1000)).toBe(25 * 60);
  });

  it("resets to the selected duration and stops", () => {
    const started = startTimer(setTimerMinutes(initialTimerState, 50), T0);
    const reset = resetTimer(started);
    expect(reset).toMatchObject({ running: false, endsAt: null, remainingSeconds: 50 * 60 });
  });

  it("bounds duration changes and stops the timer", () => {
    expect(boundTimerMinutes(0)).toBe(1);
    expect(boundTimerMinutes(999)).toBe(180);
    const changed = setTimerMinutes(startTimer(initialTimerState, T0), 30);
    expect(changed).toEqual({ minutes: 30, running: false, endsAt: null, remainingSeconds: 30 * 60 });
  });

  it("normalizes junk and clamps stored values", () => {
    expect(normalizeTimerState(null)).toEqual(initialTimerState);
    expect(normalizeTimerState("junk")).toEqual(initialTimerState);
    expect(normalizeTimerState({ minutes: 9999, running: true })).toMatchObject({ minutes: 180, running: false });
    const running = normalizeTimerState({ minutes: 10, running: true, endsAt: T0, remainingSeconds: 300 });
    expect(running.running).toBe(true);
    expect(running.endsAt).toBe(T0);
  });
});
