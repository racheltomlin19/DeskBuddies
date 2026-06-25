import {
  AlarmClock,
  Check,
  Circle,
  Clock3,
  ExternalLink,
  Keyboard,
  ListTodo,
  NotebookPen,
  Plus,
  Trash2
} from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { TaskItem } from "../types";
import { TimerTool } from "./TimerTool";

export type ToolTab = "notes" | "tasks" | "timer" | "stats";

interface ToolDrawerProps {
  activeTab: ToolTab;
  setActiveTab: (tab: ToolTab) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  tasks: TaskItem[];
  newTask: string;
  setNewTask: (value: string) => void;
  addTask: () => void;
  removeTask: (taskId: string) => void;
  setTasks: Dispatch<SetStateAction<TaskItem[]>>;
  timerSeconds: number;
  timerRunning: boolean;
  timerProgress: number;
  poppedTools: ToolTab[];
  onPopTool: (tab: ToolTab) => void;
  timerMinutes: number;
  onTimerToggle: () => void;
  onTimerReset: () => void;
  onTimerMinutesChange: (minutes: number) => void;
  stats: {
    keys: number;
    activeSeconds: number;
    launches: number;
  };
}

export function ToolDrawer({
  activeTab,
  setActiveTab,
  notes,
  onNotesChange,
  tasks,
  newTask,
  setNewTask,
  addTask,
  removeTask,
  setTasks,
  timerSeconds,
  timerRunning,
  timerProgress,
  poppedTools,
  onPopTool,
  timerMinutes,
  onTimerToggle,
  onTimerReset,
  onTimerMinutesChange,
  stats
}: ToolDrawerProps) {
  const canPop = activeTab !== "stats";

  return (
    <aside className="tool-drawer">
      <div className="drawer-head">
        <div>
          <h2>Tools</h2>
          <p>Notes, tasks, focus, counters</p>
        </div>
        {canPop && (
          <button
            type="button"
            className="pop-tool-button"
            onClick={() => onPopTool(activeTab)}
            disabled={poppedTools.includes(activeTab)}
            aria-label={`Pop out ${activeTab}`}
            title={`Pop out ${activeTab} to its own window`}
          >
            <ExternalLink size={16} />
          </button>
        )}
      </div>
      <div className="tab-row" role="tablist" aria-label="Tool tabs">
        <TabButton active={activeTab === "notes"} label="Notes" onClick={() => setActiveTab("notes")}>
          <NotebookPen size={17} />
        </TabButton>
        <TabButton active={activeTab === "tasks"} label="Tasks" onClick={() => setActiveTab("tasks")}>
          <ListTodo size={17} />
        </TabButton>
        <TabButton active={activeTab === "timer"} label="Timer" onClick={() => setActiveTab("timer")}>
          <AlarmClock size={17} />
        </TabButton>
        <TabButton active={activeTab === "stats"} label="Stats" onClick={() => setActiveTab("stats")}>
          <Keyboard size={17} />
        </TabButton>
      </div>

      <div className="drawer-body">
        {activeTab === "notes" && (
          <section className="tool-pane">
            <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} spellCheck />
          </section>
        )}

        {activeTab === "tasks" && (
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
                    onClick={() =>
                      setTasks((current) =>
                        current.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item))
                      )
                    }
                    aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                  >
                    {task.done ? <Check size={15} /> : <Circle size={15} />}
                  </button>
                  <span>{task.text}</span>
                  <button type="button" className="trash-button" onClick={() => removeTask(task.id)} aria-label="Remove task">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "timer" && (
          <TimerTool
            timerSeconds={timerSeconds}
            timerRunning={timerRunning}
            timerProgress={timerProgress}
            timerMinutes={timerMinutes}
            onTimerToggle={onTimerToggle}
            onTimerReset={onTimerReset}
            onTimerMinutesChange={onTimerMinutesChange}
          />
        )}

        {activeTab === "stats" && (
          <section className="tool-pane stats-grid">
            <Metric icon={<Keyboard size={18} />} label="Keys" value={stats.keys.toLocaleString()} />
            <Metric icon={<Clock3 size={18} />} label="Active" value={formatDuration(stats.activeSeconds)} />
            <Metric icon={<ListTodo size={18} />} label="Tasks" value={`${tasks.filter((task) => task.done).length}/${tasks.length}`} />
            <Metric icon={<ListTodo size={18} />} label="Launches" value={String(stats.launches)} />
          </section>
        )}
      </div>
    </aside>
  );
}

interface TabButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}

function TabButton({ active, label, onClick, children }: TabButtonProps) {
  return (
    <button type="button" className={`tab-button ${active ? "active" : ""}`} onClick={onClick} aria-label={label}>
      {children}
      <span>{label}</span>
    </button>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remaining}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
