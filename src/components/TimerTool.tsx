import { Minus, Pause, Play, Plus, TimerReset } from "lucide-react";

interface TimerToolProps {
  timerSeconds: number;
  timerRunning: boolean;
  timerProgress: number;
  timerMinutes: number;
  onTimerToggle: () => void;
  onTimerReset: () => void;
  onTimerMinutesChange: (minutes: number) => void;
}

export function TimerTool({
  timerSeconds,
  timerRunning,
  timerProgress,
  timerMinutes,
  onTimerToggle,
  onTimerReset,
  onTimerMinutesChange
}: TimerToolProps) {
  const setMinutes = (minutes: number) => onTimerMinutesChange(Math.min(180, Math.max(1, minutes)));

  return (
    <section className="tool-pane timer-pane">
      <div className="timer-ring" style={{ ["--timer-progress" as string]: timerProgress }}>
        <span>{formatTimer(timerSeconds)}</span>
      </div>
      <div className="timer-duration">
        <button type="button" onClick={() => setMinutes(timerMinutes - 5)} aria-label="Decrease minutes">
          <Minus size={17} />
        </button>
        <label>
          Minutes
          <input
            type="number"
            min="1"
            max="180"
            value={timerMinutes}
            onChange={(event) => setMinutes(Number(event.target.value) || 1)}
          />
        </label>
        <button type="button" onClick={() => setMinutes(timerMinutes + 5)} aria-label="Increase minutes">
          <Plus size={17} />
        </button>
      </div>
      <div className="timer-actions">
        <button
          type="button"
          className="timer-action primary"
          onClick={onTimerToggle}
          aria-label={timerRunning ? "Pause timer" : "Start timer"}
        >
          {timerRunning ? <Pause size={18} /> : <Play size={18} />}
          {timerRunning ? "Pause" : "Start"}
        </button>
        <button type="button" className="timer-action" onClick={onTimerReset} aria-label="Reset timer">
          <TimerReset size={18} />
          Reset
        </button>
      </div>
    </section>
  );
}

export function getTimerProgress(timerSeconds: number, timerMinutes: number) {
  const totalSeconds = Math.max(1, timerMinutes * 60);
  return 1 - timerSeconds / totalSeconds;
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}
