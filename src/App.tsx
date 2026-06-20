import { Check, Circle, ListTodo, Minus, PanelLeft, PanelRight, PanelRightClose, PanelRightOpen, Pin, Plus, Sparkles, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initialCompanionState, initialSettings, initialTasks } from "./data";
import {
  getSummonedCompanions,
  normalizeCompanionState,
  updateCompanionsByIds,
  setCompanionSummoned
} from "./companionState";
import { migrateLegacyCompanionControls } from "./companionControls";
import { CompanionRail } from "./components/CompanionRail";
import { CompanionControlsPanel } from "./components/CompanionControlsPanel";
import { getTimerProgress, TimerTool } from "./components/TimerTool";
import { ToolDrawer, type ToolTab } from "./components/ToolDrawer";
import { ToolPopout } from "./components/ToolPopout";
import { useSharedTimer } from "./timerState";
import { uid, useLocalStorageState } from "./storage";
import { STORAGE_KEYS } from "./storageKeys";
import type { Behavior, EngineSettings, HeldMode, PetProfile, TaskItem } from "./types";
import type { OverlaySnapshot } from "./shared/overlayBridge";


interface StatsState {
  keys: number;
  activeSeconds: number;
  launches: number;
}

const initialStats: StatsState = {
  keys: 0,
  activeSeconds: 0,
  launches: 1
};

function normalizeSettings(value: unknown): EngineSettings {
  if (!value || typeof value !== "object") {
    return initialSettings;
  }

  const stored = value as Partial<EngineSettings>;
  return {
    ...initialSettings,
    ...stored,
    clickThrough: false,
    roamMode: stored.roamMode === "screen" ? "screen" : "ground",
    companionControlsVersion:
      typeof stored.companionControlsVersion === "number" ? stored.companionControlsVersion : 0
  };
}

function App() {
  const [companionState, setCompanionState] = useLocalStorageState(
    STORAGE_KEYS.companions,
    initialCompanionState,
    normalizeCompanionState
  );
  const companions = companionState.companions;
  const summonedCompanions = useMemo(() => getSummonedCompanions(companions), [companions]);
  const [settings, setSettings] = useLocalStorageState<EngineSettings>(STORAGE_KEYS.settings, initialSettings, normalizeSettings);
  const [notes, setNotes] = useLocalStorageState(STORAGE_KEYS.notes, "Today feels lighter with company on the desktop.");
  const [tasks, setTasks] = useLocalStorageState<TaskItem[]>(STORAGE_KEYS.tasks, initialTasks);
  const [stats, setStats] = useLocalStorageState<StatsState>(STORAGE_KEYS.stats, initialStats);
  const [heldModes, setHeldModes] = useState<Record<string, HeldMode>>({});
  const summonedIds = useMemo(() => summonedCompanions.map((pet) => pet.id), [summonedCompanions]);
  const [dockState, setDockState] = useState<{ dockSide: "left" | "right" | null; collapsed: boolean }>({ dockSide: null, collapsed: false });
  const collapseTimeoutRef = useRef<number | null>(null);
  const [toolTab, setToolTab] = useState<ToolTab>("notes");
  const [newTask, setNewTask] = useState("");
  // Timer state is shared across the panel and every pop-out window.
  const sharedTimer = useSharedTimer();
  const [poppedTools, setPoppedTools] = useState<ToolTab[]>([]);
  const [firstRunSeen, setFirstRunSeen] = useLocalStorageState<boolean>(STORAGE_KEYS.firstRun, false);
  const showFirstRun = !firstRunSeen;

  useEffect(() => {
    const request = window.deskBuddies?.getPanelDockState?.();
    request?.then((state) => state && setDockState(state)).catch(() => undefined);
    return window.deskBuddies?.onPanelDockState?.(setDockState);
  }, []);
  const requestCollapsed = useCallback((collapsed: boolean) => {
    const request = window.deskBuddies?.setPanelCollapsed?.(collapsed);
    request?.then(setDockState).catch(() => undefined);
  }, []);
  const requestDock = useCallback((side: "left" | "right") => {
    const request = window.deskBuddies?.dockPanel?.(side);
    request?.then(setDockState).catch(() => undefined);
  }, []);
  const clearCollapseTimeout = useCallback(() => {
    if (collapseTimeoutRef.current !== null) {
      window.clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
  }, []);
  useEffect(() => clearCollapseTimeout, [clearCollapseTimeout]);
  const handleWorkspaceEnter = useCallback(() => {
    clearCollapseTimeout();
    if (dockState.dockSide && dockState.collapsed) {
      requestCollapsed(false);
    }
  }, [clearCollapseTimeout, dockState, requestCollapsed]);
  const handleWorkspaceLeave = useCallback(() => {
    clearCollapseTimeout();
    if (dockState.dockSide) {
      collapseTimeoutRef.current = window.setTimeout(() => requestCollapsed(true), 250);
    }
  }, [clearCollapseTimeout, dockState.dockSide, requestCollapsed]);

  const updateSettings = useCallback(
    (patch: Partial<EngineSettings>) => {
      setSettings((current) => ({ ...current, ...patch }));
    },
    [setSettings]
  );

  useEffect(() => {
    setStats((current) => ({ ...current, launches: Math.max(1, current.launches) }));
  }, [setStats]);

  useEffect(() => {
    if (!window.deskBuddies) {
      return;
    }

    window.deskBuddies.setAlwaysOnTop(settings.alwaysOnTop).catch(() => undefined);
  }, [settings.alwaysOnTop]);

  // Start/stop the main-process cursor pump when follow mode changes.
  useEffect(() => {
    window.deskBuddies?.setFollow(settings.followMode);
  }, [settings.followMode]);

  // Register/unregister the OS launch-at-login item.
  useEffect(() => {
    window.deskBuddies?.setLaunchAtLogin(settings.launchAtLogin).catch(() => undefined);
  }, [settings.launchAtLogin]);

  // Mirror the tray "Follow mode" checkbox into settings.
  useEffect(() => {
    if (!window.deskBuddies?.onTrayToggleFollow) {
      return;
    }
    return window.deskBuddies.onTrayToggleFollow((enabled) => {
      updateSettings({ followMode: enabled });
    });
  }, [updateSettings]);

  const pushSnapshot = useCallback(() => {
    const snapshot: OverlaySnapshot = { companions: summonedCompanions, settings };
    window.deskBuddies?.pushSnapshot(snapshot);
  }, [summonedCompanions, settings]);

  useEffect(() => {
    pushSnapshot();
  }, [pushSnapshot]);

  useEffect(() => {
    if (!window.deskBuddies?.onSnapshotRequested) {
      return;
    }
    return window.deskBuddies.onSnapshotRequested(() => pushSnapshot());
  }, [pushSnapshot]);

  useEffect(() => {
    const onKeyDown = () => {
      setStats((current) => ({ ...current, keys: current.keys + 1 }));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setStats]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setStats((current) => ({ ...current, activeSeconds: current.activeSeconds + 1 }));
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [setStats]);

  const completedTasks = tasks.filter((task) => task.done).length;
  const timerProgress = getTimerProgress(sharedTimer.timerSeconds, sharedTimer.timerMinutes);


  const updateCompanions = useCallback(
    (updater: (companions: PetProfile[]) => PetProfile[]) => {
      setCompanionState((current) => ({
        ...current,
        companions: updater(current.companions)
      }));
    },
    [setCompanionState]
  );

  useEffect(() => {
    const migrated = migrateLegacyCompanionControls(companions, settings);
    if (migrated.companions !== companions) {
      updateCompanions(() => migrated.companions);
      setSettings(migrated.settings);
    }
  }, [companions, setSettings, settings, updateCompanions]);

  const toggleSummoned = useCallback(
    (id: string, summoned: boolean) => {
      updateCompanions((current) => setCompanionSummoned(current, id, summoned));
    },
    [updateCompanions]
  );

  // Overlay trash-corner: dropping a pet on the trash zone asks us (the state
  // owner) to hide it. Non-destructive — the profile stays in the tray.
  useEffect(() => {
    if (!window.deskBuddies?.onHidePet) {
      return;
    }
    return window.deskBuddies.onHidePet((id) => {
      updateCompanions((current) => setCompanionSummoned(current, id, false));
    });
  }, [updateCompanions]);

  // Spawn-by-drag: a tray card drag was released. If the cursor ended outside
  // the panel, summon the pet and drop it right there on the overlay.
  const spawnDragRelease = useCallback(
    async (id: string) => {
      const request = window.deskBuddies?.dropPetAtCursor?.();
      const drop = await request?.catch(() => undefined);
      if (!drop?.outside || typeof drop.x !== "number" || typeof drop.y !== "number") {
        return;
      }
      updateCompanions((current) => setCompanionSummoned(current, id, true));
      window.deskBuddies?.pushCommand({ behavior: "idle", target: "selected", id, action: "place", x: drop.x, y: drop.y });
    },
    [updateCompanions]
  );

  const updatePet = useCallback(
    (id: string, patch: Partial<PetProfile>) => {
      setCompanionState((current) => ({
        ...current,
        companions: updateCompanionsByIds(current.companions, [id], patch)
      }));
    },
    [setCompanionState]
  );

  const updateAllPets = useCallback((patch: Partial<PetProfile>) => {
    setCompanionState((current) => ({ ...current, companions: updateCompanionsByIds(current.companions, summonedIds, patch) }));
  }, [setCompanionState, summonedIds]);
  const setHeldMode = useCallback((id: string, mode: HeldMode) => {
    setHeldModes((current) => ({ ...current, [id]: mode }));
    window.deskBuddies?.pushCommand({ behavior: mode ?? "idle", target: "selected", id, hold: mode !== null });
  }, []);
  const setAllHeldMode = useCallback((mode: HeldMode) => {
    setHeldModes(Object.fromEntries(summonedIds.map((id) => [id, mode])));
    window.deskBuddies?.pushCommand({ behavior: mode ?? "idle", target: "all", hold: mode !== null });
  }, [summonedIds]);
  const runAction = useCallback((ids: string[], behavior: Behavior) => ids.forEach((id) => window.deskBuddies?.pushCommand({ behavior, target: "selected", id, hold: false })), []);
  const syncHeldMode = useCallback((sourceId: string) => setAllHeldMode(heldModes[sourceId] ?? null), [heldModes, setAllHeldMode]);

  const addTask = useCallback(() => {
    const text = newTask.trim();
    if (!text) {
      return;
    }

    setTasks((current) => [{ id: uid("task"), text, done: false }, ...current]);
    setNewTask("");
  }, [newTask, setTasks]);

  const removeTask = useCallback(
    (taskId: string) => {
      setTasks((current) => current.filter((task) => task.id !== taskId));
    },
    [setTasks]
  );

  const popTool = useCallback((tab: ToolTab) => {
    // Prefer a real OS window (roams across screens, survives minimizing the
    // panel). Fall back to an in-panel floating card outside Electron.
    if (window.deskBuddies?.openPopout && tab !== "stats") {
      window.deskBuddies.openPopout(tab);
      return;
    }
    setPoppedTools((current) => (current.includes(tab) ? current : [...current, tab]));
  }, []);

  const closePoppedTool = useCallback((tab: ToolTab) => {
    setPoppedTools((current) => current.filter((item) => item !== tab));
  }, []);

  const toggleTaskDone = useCallback(
    (taskId: string) => {
      setTasks((current) => current.map((item) => (item.id === taskId ? { ...item, done: !item.done } : item)));
    },
    [setTasks]
  );

  const timerActionProps = {
    ...sharedTimer,
    timerProgress
  };

  const collapsedDock = Boolean(dockState.dockSide && dockState.collapsed);

  return (
    <main className={`app-shell ${dockState.dockSide ? `docked ${dockState.collapsed ? "collapsed" : "expanded"}` : ""}`}>
      {!collapsedDock && (
        <TopBar
          alwaysOnTop={settings.alwaysOnTop}
          summonedCount={summonedCompanions.length}
          onTogglePin={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })}
          onDockLeft={() => requestDock("left")}
          onDockRight={() => requestDock("right")}
        />
      )}

      {!collapsedDock && showFirstRun && (
        <div className="first-run" role="status">
          <Sparkles size={16} />
          <p>Your companions live on the desktop now. Press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>P</kbd> anytime to bring this panel back.</p>
          <button type="button" aria-label="Dismiss" onClick={() => setFirstRunSeen(true)}>
            <X size={15} />
          </button>
        </div>
      )}

      <section className={`workspace ${dockState.dockSide ? `docked ${dockState.collapsed ? "collapsed" : "expanded"}` : ""}`} onMouseEnter={handleWorkspaceEnter} onMouseLeave={handleWorkspaceLeave}>
        <CompanionRail companions={companions} onSpawnDrag={spawnDragRelease} onToggleSummoned={toggleSummoned} />
        {!dockState.collapsed && <CompanionControlsPanel pets={companions} settings={settings} heldModes={heldModes} onHeldMode={setHeldMode} onAction={runAction} onUpdatePet={updatePet} onUpdateAll={updateAllPets} onUpdateSettings={updateSettings} onSyncBehavior={syncHeldMode} />}
        {dockState.dockSide && !dockState.collapsed && <button type="button" className="undock-button" onClick={() => window.deskBuddies?.undockPanel?.().then(setDockState)}>Undock panel</button>}

        <div className="tools-region">
          <button
            className="tools-toggle"
            type="button"
            onClick={() => updateSettings({ panelOpen: !settings.panelOpen })}
            aria-label={settings.panelOpen ? "Hide tools" : "Show tools"}
          >
            {settings.panelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            <span>{settings.panelOpen ? "Hide tools" : "Show tools"}</span>
            <small>
              <ListTodo size={13} /> {completedTasks}/{tasks.length || 1}
            </small>
          </button>

          {settings.panelOpen && (
            <ToolDrawer
              activeTab={toolTab}
              setActiveTab={setToolTab}
              notes={notes}
              onNotesChange={setNotes}
              tasks={tasks}
              newTask={newTask}
              setNewTask={setNewTask}
              addTask={addTask}
              removeTask={removeTask}
              setTasks={setTasks}
              timerSeconds={timerActionProps.timerSeconds}
              timerRunning={timerActionProps.timerRunning}
              timerProgress={timerProgress}
              poppedTools={poppedTools}
              onPopTool={popTool}
              timerMinutes={timerActionProps.timerMinutes}
              onTimerToggle={timerActionProps.onTimerToggle}
              onTimerReset={timerActionProps.onTimerReset}
              onTimerMinutesChange={timerActionProps.onTimerMinutesChange}
              stats={stats}
            />
          )}
        </div>

        {poppedTools.map((tab, index) => (
          <ToolPopout
            key={tab}
            title={getToolTitle(tab)}
            onClose={() => closePoppedTool(tab)}
            style={{ right: 18 + index * 20, bottom: 18 + index * 20 }}
          >
            {tab === "notes" && <textarea value={notes} onChange={(event) => setNotes(event.target.value)} spellCheck />}

            {tab === "tasks" && (
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
                        onClick={() => toggleTaskDone(task.id)}
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

            {tab === "timer" && <TimerTool {...timerActionProps} />}
          </ToolPopout>
        ))}

      </section>
    </main>
  );
}

function getToolTitle(tab: ToolTab) {
  switch (tab) {
    case "notes":
      return "Notes";
    case "tasks":
      return "Tasks";
    case "timer":
      return "Timer";
    default:
      return "Tool";
  }
}

interface TopBarProps {
  alwaysOnTop: boolean;
  summonedCount: number;
  onTogglePin: () => void;
  onDockLeft: () => void;
  onDockRight: () => void;
}

function TopBar({ alwaysOnTop, summonedCount, onTogglePin, onDockLeft, onDockRight }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-mark">
          <Sparkles size={18} />
        </span>
        <span>DeskBuddies</span>
        <small className="brand-count">{summonedCount} on desktop</small>
      </div>
      <div className="top-actions">
        <IconButton label="Dock left" onClick={onDockLeft}>
          <PanelLeft size={17} />
        </IconButton>
        <IconButton label="Dock right" onClick={onDockRight}>
          <PanelRight size={17} />
        </IconButton>
        <IconButton active={alwaysOnTop} label="Always on top" onClick={onTogglePin}>
          <Pin size={17} />
        </IconButton>
        <IconButton label="Minimize to tray" onClick={() => window.deskBuddies?.minimizeToTray()}>
          <Minus size={17} />
        </IconButton>
        <IconButton label="Close to tray" tone="danger" onClick={() => window.deskBuddies?.close()}>
          <X size={17} />
        </IconButton>
      </div>
    </header>
  );
}

interface IconButtonProps {
  active?: boolean;
  label: string;
  tone?: "default" | "danger";
  onClick?: () => void;
  children: ReactNode;
}

function IconButton({ active = false, label, tone = "default", onClick, children }: IconButtonProps) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""} ${tone === "danger" ? "danger" : ""}`}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export default App;
