const { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, nativeImage, screen, nativeTheme, powerMonitor } = require("electron");
const path = require("path");
const fs = require("fs");
const {
  PANEL_ASPECT_RATIO,
  PANEL_HEIGHT,
  PANEL_WIDTH,
  RAIL_WIDTH,
  canResizePanel,
  dockPanelState,
  getDockedBounds,
  getSnapCandidate,
  isDockRearmed,
  normalizePanelState,
  restorePanelState
} = require("./panelDocking.cjs");
const { getPrimaryOverlayBounds } = require("./overlayBounds.cjs");

let overlayWindow;
let panelWindow;
let tray;
let followMenuItem = null;
let cursorTimer = null;
let panelDockState = null;
let panelDockSettleTimer = null;
let panelDockRearmed = true;
let applyingPanelDockBounds = false;
let latestSnapshot = { companions: [], settings: {} };
const popoutWindows = new Map();
const PANEL_DOCK_SETTLE_MS = 180;

// Overlay click-through safety. The renderer drives interactivity, but a stale
// renderer (crash, hang, pointer edge cases) must never strand the overlay in a
// mode that swallows desktop clicks: the main process forces click-through when
// the renderer stops heartbeating or the overlay loses visibility.
let overlayInteractive = false;
let overlayHeartbeatAt = 0;
let overlayWatchdog = null;
let displayChangeHandler = null;
const OVERLAY_HEARTBEAT_TIMEOUT_MS = 1200;
const OVERLAY_WATCHDOG_INTERVAL_MS = 300;

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

// Icon lives in build/ during dev and in resources/ once packaged.
const iconPath = isDev
  ? path.join(__dirname, "..", "build", "icon.png")
  : path.join(process.resourcesPath, "icon.png");

function boundsFilePath() {
  return path.join(app.getPath("userData"), "panel-bounds.json");
}

function readPanelDockState() {
  try {
    return normalizePanelState(JSON.parse(fs.readFileSync(boundsFilePath(), "utf-8")));
  } catch {
    return normalizePanelState(null);
  }
}

function savePanelDockState() {
  try {
    fs.writeFileSync(boundsFilePath(), JSON.stringify(panelDockState));
  } catch {
    // Position memory is a convenience; ignore write failures.
  }
}

function notifyPanelDockState() {
  panelWindow?.webContents.send("panel:dockState", panelDockState);
}

function clearPanelDockSettleTimer() {
  if (panelDockSettleTimer) {
    clearTimeout(panelDockSettleTimer);
    panelDockSettleTimer = null;
  }
}

function applyPanelDockBounds(bounds) {
  applyingPanelDockBounds = true;
  try {
    panelWindow.setBounds(bounds);
  } finally {
    applyingPanelDockBounds = false;
  }
}

function applyPanelDockState(bounds) {
  const docked = Boolean(panelDockState?.dockSide);
  panelWindow.setAspectRatio(docked ? 0 : PANEL_ASPECT_RATIO);
  panelWindow.setMinimumSize(docked ? RAIL_WIDTH : PANEL_WIDTH, docked ? 520 : PANEL_HEIGHT);
  panelWindow.setResizable(canResizePanel(panelDockState));
  applyPanelDockBounds(bounds);
}

function persistPanelDockState() {
  if (panelWindow && !panelWindow.isDestroyed() && !panelDockState.dockSide) {
    panelDockState = { ...panelDockState, floatingBounds: panelWindow.getBounds() };
  }
  savePanelDockState();
}

function restorePanelDockState() {
  const restored = restorePanelState(
    panelDockState,
    screen.getAllDisplays(),
    screen.getPrimaryDisplay().workArea
  );
  const { bounds, ...state } = restored;
  panelDockState = state;
  return bounds;
}

function setPanelCollapsed(collapsed) {
  if (!panelDockState?.dockSide) {
    return panelDockState;
  }

  const display = screen.getAllDisplays().find((item) => item.id === panelDockState.displayId);
  if (!display) {
    applyPanelDockState(restorePanelDockState());
  } else {
    panelDockState = { ...panelDockState, collapsed };
    applyPanelDockState(getDockedBounds(panelDockState.dockSide, panelDockState.collapsed, display.workArea));
  }
  persistPanelDockState();
  notifyPanelDockState();
  return panelDockState;
}

function undockPanel() {
  clearPanelDockSettleTimer();
  if (!panelDockState) {
    return panelDockState;
  }

  panelDockRearmed = false;
  panelDockState = { ...panelDockState, dockSide: null, collapsed: false, displayId: null };
  applyPanelDockState(panelDockState.floatingBounds);
  persistPanelDockState();
  notifyPanelDockState();
  return panelDockState;
}

function dockPanel(side) {
  clearPanelDockSettleTimer();
  if (!panelWindow || panelWindow.isDestroyed() || (side !== "left" && side !== "right")) {
    return panelDockState;
  }
  const floatingBounds = panelDockState?.dockSide ? panelDockState.floatingBounds : panelWindow.getBounds();
  const display = screen.getDisplayMatching(floatingBounds);
  panelDockState = dockPanelState(panelDockState, side, display, floatingBounds);
  applyPanelDockState(getDockedBounds(side, true, display.workArea));
  persistPanelDockState();
  notifyPanelDockState();
  return panelDockState;
}

function loadPage(win, page) {
  if (isDev) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}/${page}`);
  } else {
    // dist/ is packaged as extraResources (real files, not in asar)
    win.loadFile(path.join(process.resourcesPath, "dist", page));
  }
}

function loadPopout(win, tab) {
  if (isDev) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}/index.html?popout=${tab}`);
  } else {
    win.loadFile(path.join(process.resourcesPath, "dist", "index.html"), { search: `popout=${tab}` });
  }
}

function popoutBoundsPath(tab) {
  return path.join(app.getPath("userData"), `popout-${tab}.json`);
}

// A tool pop-out is a standalone frameless window: it can be dragged to any
// display and stays open when the main panel is minimized/hidden to the tray.
function openPopout(tab) {
  const existing = popoutWindows.get(tab);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return;
  }

  let saved = null;
  try {
    saved = JSON.parse(fs.readFileSync(popoutBoundsPath(tab), "utf-8"));
  } catch {
    saved = null;
  }

  const win = new BrowserWindow({
    width: saved?.width ?? 300,
    height: saved?.height ?? 400,
    x: saved?.x,
    y: saved?.y,
    icon: iconPath,
    minWidth: 240,
    minHeight: 260,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: true,
    resizable: true,
    skipTaskbar: false,
    title: `DeskBuddies — ${tab}`,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setAlwaysOnTop(true, "floating");
  loadPopout(win, tab);

  const persist = () => {
    try {
      fs.writeFileSync(popoutBoundsPath(tab), JSON.stringify(win.getBounds()));
    } catch {
      // Pop-out position memory is a convenience; ignore write failures.
    }
  };
  win.on("moved", persist);
  win.on("resized", persist);
  win.on("closed", () => popoutWindows.delete(tab));

  popoutWindows.set(tab, win);
}

function getOverlayBounds() {
  return getPrimaryOverlayBounds(screen.getPrimaryDisplay());
}

function updateOverlayBounds() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setBounds(getOverlayBounds());
  }
}

function setOverlayInteractive(interactive) {
  overlayInteractive = Boolean(interactive);
  overlayHeartbeatAt = Date.now();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(!overlayInteractive, { forward: true });
  }
}

function forceOverlayClickThrough() {
  setOverlayInteractive(false);
}

function stopOverlayWatchdog() {
  if (overlayWatchdog) {
    clearInterval(overlayWatchdog);
    overlayWatchdog = null;
  }
}

function startOverlayWatchdog() {
  stopOverlayWatchdog();
  overlayWatchdog = setInterval(() => {
    if (!overlayInteractive) {
      return;
    }
    if (!overlayWindow || overlayWindow.isDestroyed() || !overlayWindow.isVisible()) {
      forceOverlayClickThrough();
      return;
    }
    if (Date.now() - overlayHeartbeatAt > OVERLAY_HEARTBEAT_TIMEOUT_MS) {
      forceOverlayClickThrough();
    }
  }, OVERLAY_WATCHDOG_INTERVAL_MS);
  if (typeof overlayWatchdog.unref === "function") {
    overlayWatchdog.unref();
  }
}

function createOverlayWindow() {
  const { x, y, width, height } = getOverlayBounds();

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    icon: iconPath,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  // Windows applies setIgnoreMouseEvents poorly before the window is shown;
  // re-assert click-through once the content is ready, then show without focus.
  overlayWindow.once("ready-to-show", () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      return;
    }
    overlayWindow.setIgnoreMouseEvents(!overlayInteractive, { forward: true });
    overlayWindow.showInactive();
  });
  overlayWindow.on("hide", forceOverlayClickThrough);
  overlayWindow.on("minimize", forceOverlayClickThrough);
  overlayWindow.on("closed", stopOverlayWatchdog);
  startOverlayWatchdog();
  loadPage(overlayWindow, "overlay.html");
}

function createPanelWindow() {
  panelDockState = readPanelDockState();
  const panelBounds = restorePanelDockState();
  panelWindow = new BrowserWindow({
    ...panelBounds,
    icon: iconPath,
    minWidth: panelDockState.dockSide ? RAIL_WIDTH : PANEL_WIDTH,
    minHeight: panelDockState.dockSide ? 520 : PANEL_HEIGHT,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    titleBarStyle: "hidden",
    hasShadow: true,
    resizable: canResizePanel(panelDockState),
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.setAspectRatio(panelDockState.dockSide ? 0 : PANEL_ASPECT_RATIO);
  panelWindow.setAlwaysOnTop(true, "floating");
  loadPage(panelWindow, "index.html");
  persistPanelDockState();
  panelWindow.webContents.on("did-finish-load", notifyPanelDockState);

  panelWindow.on("move", () => {
    if (applyingPanelDockBounds || panelDockState.dockSide) {
      return;
    }
    const observedBounds = panelWindow.getBounds();
    const observedDisplay = screen.getDisplayMatching(observedBounds);
    if (!panelDockRearmed && isDockRearmed(observedBounds, observedDisplay.workArea)) {
      panelDockRearmed = true;
    }
    clearPanelDockSettleTimer();
    panelDockSettleTimer = setTimeout(() => {
      panelDockSettleTimer = null;
      if (!panelWindow || panelWindow.isDestroyed() || panelDockState.dockSide) {
        return;
      }

      const currentBounds = panelWindow.getBounds();
      const display = screen.getDisplayMatching(currentBounds);
      if (!panelDockRearmed) {
        persistPanelDockState();
        return;
      }

      const dockSide = getSnapCandidate(currentBounds, display.workArea);
      if (!dockSide) {
        persistPanelDockState();
        return;
      }
      panelDockState = dockPanelState(panelDockState, dockSide, display, currentBounds);
      applyPanelDockState(getDockedBounds(dockSide, true, display.workArea));
      persistPanelDockState();
      notifyPanelDockState();
    }, PANEL_DOCK_SETTLE_MS);
  });
  panelWindow.on("resized", persistPanelDockState);

  panelWindow.on("close", (event) => {
    clearPanelDockSettleTimer();
    if (!app.isQuiting) {
      event.preventDefault();
      persistPanelDockState();
      panelWindow.hide();
    }
  });
}

function showPanel() {
  if (!panelWindow) {
    createPanelWindow();
    return;
  }
  panelWindow.show();
  panelWindow.focus();
}

function quitApp() {
  clearPanelDockSettleTimer();
  app.isQuiting = true;
  app.quit();
}

function createTray() {
  let trayImage = nativeImage.createFromPath(iconPath);
  if (!trayImage.isEmpty()) {
    trayImage = trayImage.resize({ width: 18, height: 18 });
  }
  tray = new Tray(trayImage.isEmpty() ? nativeImage.createEmpty() : trayImage);
  tray.setToolTip("DeskBuddies");
  const menu = Menu.buildFromTemplate([
    { label: "Show panel", click: showPanel },
    // Escape hatch for a renderer that fails to release the mouse.
    { label: "Restore desktop clicks", click: forceOverlayClickThrough },
    {
      id: "follow-mode",
      label: "Follow mode",
      type: "checkbox",
      checked: false,
      click: (item) => {
        // Keep the pump in sync immediately; the panel mirrors the setting.
        if (item.checked) {
          startCursorPump();
        } else {
          stopCursorPump();
        }
        panelWindow?.webContents.send("tray:toggleFollow", item.checked);
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: quitApp
    }
  ]);
  tray.setContextMenu(menu);
  followMenuItem = menu.getMenuItemById("follow-mode");
  tray.on("double-click", showPanel);
}

app.whenReady().then(() => {
  nativeTheme.themeSource = "light";
  createOverlayWindow();
  createPanelWindow();
  createTray();

  // Keep the overlay aligned to the primary work area as displays change.
  // Geometry changes can also strand a pointer hit-test, so reset click-through.
  displayChangeHandler = () => {
    updateOverlayBounds();
    forceOverlayClickThrough();
  };
  screen.on("display-added", displayChangeHandler);
  screen.on("display-removed", displayChangeHandler);
  screen.on("display-metrics-changed", displayChangeHandler);

  // A suspended or locked session leaves the renderer without pointer events;
  // release the mouse so the lock screen / next session is usable.
  powerMonitor.on("suspend", forceOverlayClickThrough);
  powerMonitor.on("lock-screen", forceOverlayClickThrough);

  globalShortcut.register("Control+Alt+P", () => {
    showPanel();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
      createPanelWindow();
    } else {
      showPanel();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  app.isQuiting = true;
});

app.on("will-quit", () => {
  clearPanelDockSettleTimer();
  stopOverlayWatchdog();
  if (displayChangeHandler) {
    screen.removeListener("display-added", displayChangeHandler);
    screen.removeListener("display-removed", displayChangeHandler);
    screen.removeListener("display-metrics-changed", displayChangeHandler);
    displayChangeHandler = null;
  }
  globalShortcut.unregisterAll();
  if (cursorTimer) {
    clearInterval(cursorTimer);
    cursorTimer = null;
  }
});

// Cursor pump: only runs while follow mode is on. Sends overlay-relative
// coordinates so the overlay can compare against pet positions directly.
function startCursorPump() {
  if (cursorTimer) {
    return;
  }
  cursorTimer = setInterval(() => {
    if (!overlayWindow) {
      return;
    }
    const point = screen.getCursorScreenPoint();
    const wb = overlayWindow.getBounds();
    overlayWindow.webContents.send("cursor:update", { x: point.x - wb.x, y: point.y - wb.y });
  }, 33);
}

function stopCursorPump() {
  if (cursorTimer) {
    clearInterval(cursorTimer);
    cursorTimer = null;
  }
  overlayWindow?.webContents.send("cursor:update", null);
}

ipcMain.on("follow:set", (_event, active) => {
  // Mirror the panel's follow state onto the tray checkbox so a follow mode
  // persisted from a previous session (or toggled in the panel) doesn't leave
  // the tray item out of sync.
  if (followMenuItem) {
    followMenuItem.checked = Boolean(active);
  }
  if (active) {
    startCursorPump();
  } else {
    stopCursorPump();
  }
});

// Panel -> main: open a tool in its own pop-out window.
ipcMain.on("popout:open", (_event, tab) => {
  if (tab === "notes" || tab === "tasks" || tab === "timer") {
    openPopout(tab);
  }
});

// Any window -> every other window: localStorage write announcement. storage
// events don't reliably cross windows on file:// (packaged builds), so the
// renderers mirror writes through this relay.
ipcMain.on("storage:sync", (event, payload) => {
  if (!payload || typeof payload.key !== "string") {
    return;
  }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.webContents.id !== event.sender.id) {
      win.webContents.send("storage:sync", payload);
    }
  }
});

// Panel drag released: report whether the cursor is outside the panel and,
// if so, where that is in overlay coordinates so the pet can spawn there.
ipcMain.handle("spawn:dropAtCursor", () => {
  const point = screen.getCursorScreenPoint();
  const panelBounds = panelWindow && !panelWindow.isDestroyed() ? panelWindow.getBounds() : null;
  const insidePanel =
    panelBounds &&
    point.x >= panelBounds.x &&
    point.x <= panelBounds.x + panelBounds.width &&
    point.y >= panelBounds.y &&
    point.y <= panelBounds.y + panelBounds.height;
  const overlayBounds = overlayWindow && !overlayWindow.isDestroyed() ? overlayWindow.getBounds() : null;
  if (insidePanel || !overlayBounds) {
    return { outside: false };
  }
  return { outside: true, x: point.x - overlayBounds.x, y: point.y - overlayBounds.y };
});

// Overlay trash-corner -> panel: the panel owns companion state, so relay the
// hide request to it.
ipcMain.on("pet:hide", (_event, id) => {
  if (typeof id === "string") {
    panelWindow?.webContents.send("pet:hide", id);
  }
});

// Panel -> main -> overlay: behavior commands.
ipcMain.on("command:push", (_event, command) => {
  overlayWindow?.webContents.send("command:apply", command);
});

// Panel -> main -> overlay: state snapshot.
ipcMain.on("snapshot:push", (_event, snapshot) => {
  latestSnapshot = snapshot;
  overlayWindow?.webContents.send("snapshot:update", snapshot);
});

// Overlay startup -> main -> panel: request a fresh snapshot.
ipcMain.on("snapshot:request", () => {
  overlayWindow?.webContents.send("snapshot:update", latestSnapshot);
  panelWindow?.webContents.send("snapshot:requested");
});

// Overlay hit-test -> main: only capture the mouse while it is over a pet.
ipcMain.on("overlay:setInteractive", (_event, interactive) => {
  setOverlayInteractive(interactive);
});

// Renderer heartbeat: only meaningful while it believes the overlay is
// interactive. A missed heartbeat window (~1.2 s) drops the overlay back to
// click-through in the watchdog above.
ipcMain.on("overlay:heartbeat", () => {
  if (overlayInteractive) {
    overlayHeartbeatAt = Date.now();
  }
});

ipcMain.handle("panel:minimize", () => {
  panelWindow?.minimize();
});

// Compatibility with older preload bundles.
ipcMain.handle("panel:minimizeToTray", () => panelWindow?.minimize());

ipcMain.handle("panel:close", () => {
  panelWindow?.hide();
});

ipcMain.handle("app:quit", quitApp);

ipcMain.handle("panel:alwaysOnTop", (_event, enabled) => {
  panelWindow?.setAlwaysOnTop(Boolean(enabled), enabled ? "floating" : "normal");
  return panelWindow?.isAlwaysOnTop() ?? false;
});

ipcMain.handle("panel:getDockState", () => panelDockState);

ipcMain.handle("panel:setCollapsed", (_event, collapsed) => setPanelCollapsed(Boolean(collapsed)));

ipcMain.handle("panel:undock", () => undockPanel());

ipcMain.handle("panel:dock", (_event, side) => dockPanel(side));

ipcMain.handle("app:launchAtLogin", (_event, enabled) => {
  // In dev this would register the bare Electron binary as a login item;
  // only touch the OS login items from a packaged build.
  if (!app.isPackaged) {
    return false;
  }
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
  return app.getLoginItemSettings().openAtLogin;
});
