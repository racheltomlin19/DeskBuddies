import { Check, Circle, Plus, Trash2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { getTimerProgress, TimerTool } from "./components/TimerTool";
import { useSharedTimer } from "./timerState";
import { uid, useLocalStorageState } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";
import { initialTasks } from "./data";
import type { PopoutTab, TaskItem } from "./types";

interface PopoutAppProps {
  tab: PopoutTab;
}

const TITLES: Record<PopoutTab, string> = {
  notes: "Notes",
  tasks: "Tasks",
  timer: "Timer"
};

export function PopoutApp({ tab }: PopoutAppProps) {
  return (
    <div className="popout-window">
      <header className="popout-window-head">
        <h1>{TITLES[tab]}</h1>
        <button type="button" className="popout-window-close" onClick={() => window.close()} aria-label="Close">
          <X size={16} />
        </button>
      </header>
      <div className="popout-window-body">
        {tab === "notes" && <NotesPane />}
        {tab === "tasks" && <TasksPane />}
        {tab === "timer" && <TimerPane />}
      </div>
    </div>
  );
}

function NotesPane() {
  const [notes, setNotes] = useLocalStorageState(STORAGE_KEYS.notes, "");
  return (
    <section className="tool-pane">
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} spellCheck />
    </section>
  );
}

function TasksPane() {
  const [tasks, setTasks] = useLocalStorageState<TaskItem[]>(STORAGE_KEYS.tasks, initialTasks);
  const [newTask, setNewTask] = useState("");

  const addTask = useCallback(() => {
    const text = newTask.trim();
    if (!text) {
      return;
    }
    setTasks((current) => [{ id: uid("task"), text, done: false }, ...current]);
    setNewTask("");
  }, [newTask, setTasks]);

  return (
    <section className="tool-pane">
      <form
        className="task-form"
        onSubmit={(event) => {
          event.preventDefault();
          addTask();
        }}
      >
        <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="New task" />
        <button type="submit" aria-label="Add task">
          <Plus size={17} />
        </button>
      </form>
      <div className="task-list">
        {tasks.map((task) => (
          <div className={`task-row ${task.done ? "done" : ""}`} key={task.id}>
            <button
              type="button"
              className="check-button"
              onClick={() => setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)))}
              aria-label={task.done ? "Mark incomplete" : "Mark complete"}
            >
              {task.done ? <Check size={15} /> : <Circle size={15} />}
            </button>
            <span>{task.text}</span>
            <button
              type="button"
              className="trash-button"
              onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))}
              aria-label="Remove task"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimerPane() {
  // Same shared timer as the panel: start it there, watch it tick here.
  const timer = useSharedTimer();

  return <TimerTool {...timer} timerProgress={getTimerProgress(timer.timerSeconds, timer.timerMinutes)} />;
}
