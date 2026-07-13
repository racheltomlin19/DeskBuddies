import { afterEach, describe, expect, it, vi } from "vitest";
import { DRAG_WATCHDOG_MS, createDragTerminationController } from "./dragTermination";

afterEach(() => vi.useRealTimers());

describe("drag termination controller", () => {
  it("terminates an active press at most once across duplicate terminal signals", () => {
    const terminal = vi.fn();
    const controller = createDragTerminationController(terminal);
    controller.begin();
    expect(controller.terminate("pointer-up")).toBe(true);
    expect(controller.terminate("pointer-cancel")).toBe(false);
    expect(controller.terminate("lost-capture")).toBe(false);
    expect(terminal).toHaveBeenCalledOnce();
    expect(terminal).toHaveBeenCalledWith("pointer-up");
  });

  it.each(["pointer-up", "pointer-cancel", "lost-capture", "buttons-released", "blur", "page-hide", "unmount"] as const)(
    "accepts %s as a terminal signal",
    (signal) => {
      const terminal = vi.fn();
      const controller = createDragTerminationController(terminal);
      controller.begin();
      expect(controller.terminate(signal)).toBe(true);
      expect(terminal).toHaveBeenCalledWith(signal);
    }
  );

  it("expires an abandoned drag after 1,500 ms", () => {
    vi.useFakeTimers();
    const terminal = vi.fn();
    const controller = createDragTerminationController(terminal);
    controller.begin();
    vi.advanceTimersByTime(DRAG_WATCHDOG_MS - 1);
    expect(terminal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(terminal).toHaveBeenCalledWith("watchdog");
  });

  it("resets the watchdog only for button-held movement", () => {
    vi.useFakeTimers();
    const terminal = vi.fn();
    const controller = createDragTerminationController(terminal);
    controller.begin();
    vi.advanceTimersByTime(1_000);
    controller.noteMovement(true);
    vi.advanceTimersByTime(1_000);
    expect(terminal).not.toHaveBeenCalled();
    controller.noteMovement(false);
    vi.advanceTimersByTime(500);
    expect(terminal).toHaveBeenCalledWith("watchdog");
  });

  it("beginning a new press replaces the prior watchdog", () => {
    vi.useFakeTimers();
    const terminal = vi.fn();
    const controller = createDragTerminationController(terminal);
    controller.begin();
    vi.advanceTimersByTime(1_000);
    controller.begin();
    vi.advanceTimersByTime(1_000);
    expect(terminal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(terminal).toHaveBeenCalledOnce();
  });

  it("dispose clears the watchdog and safely terminates an active press", () => {
    vi.useFakeTimers();
    const terminal = vi.fn();
    const controller = createDragTerminationController(terminal);
    controller.begin();
    controller.dispose();
    vi.runAllTimers();
    expect(terminal).toHaveBeenCalledOnce();
    expect(terminal).toHaveBeenCalledWith("unmount");
  });
});
