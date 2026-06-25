import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TaskItem } from "../types";
import { ToolDrawer, type ToolTab } from "./ToolDrawer";

const tasks: TaskItem[] = [
  { id: "task-open", text: "Open task", done: false },
  { id: "task-done", text: "Done task", done: true }
];

function renderDrawer(activeTab: ToolTab) {
  return renderToStaticMarkup(
    <ToolDrawer
      activeTab={activeTab}
      setActiveTab={() => undefined}
      notes="Desk notes"
      onNotesChange={() => undefined}
      tasks={tasks}
      newTask=""
      setNewTask={() => undefined}
      addTask={() => undefined}
      removeTask={() => undefined}
      setTasks={() => undefined}
      timerSeconds={25 * 60}
      timerRunning={false}
      timerProgress={0}
      poppedTools={[]}
      onPopTool={() => undefined}
      timerMinutes={25}
      onTimerToggle={() => undefined}
      onTimerReset={() => undefined}
      onTimerMinutesChange={() => undefined}
      stats={{ keys: 1234, activeSeconds: 3665, launches: 3 }}
    />
  );
}

describe("ToolDrawer", () => {
  it("renders the notes pane with all tool tabs", () => {
    const markup = renderDrawer("notes");

    expect(markup).toContain("Tools");
    expect(markup).toContain("Notes");
    expect(markup).toContain("Tasks");
    expect(markup).toContain("Timer");
    expect(markup).toContain("Stats");
    expect(markup).toContain("Desk notes");
  });

  it("renders task controls without relying on App internals", () => {
    const markup = renderDrawer("tasks");

    expect(markup).toContain("New task");
    expect(markup).toContain("Open task");
    expect(markup).toContain("Done task");
    expect(markup).toContain("Mark complete");
    expect(markup).toContain("Mark incomplete");
    expect(markup).toContain("Remove task");
  });

  it("formats timer and stats panes", () => {
    const timerMarkup = renderDrawer("timer");
    const statsMarkup = renderDrawer("stats");

    expect(timerMarkup).toContain("25:00");
    expect(timerMarkup).toContain("Start");
    expect(timerMarkup).toContain("Reset");
    expect(statsMarkup).toContain("1,234");
    expect(statsMarkup).toContain("1h 1m");
    expect(statsMarkup).toContain("1/2");
    expect(statsMarkup).toContain("3");
  });

  it("renders a single pop-out control for the active tool", () => {
    expect(renderDrawer("timer")).toContain("Pop out timer");
    expect(renderDrawer("notes")).toContain("Pop out notes");
    // Stats has no window to pop out.
    expect(renderDrawer("stats")).not.toContain("Pop out");
  });
});
