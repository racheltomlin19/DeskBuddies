const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("deskBuddies", {
  // Panel window controls
  minimize: () => ipcRenderer.invoke("panel:minimize"),
  // Compatibility for older renderer bundles; this now performs a real minimize.
  minimizeToTray: () => ipcRenderer.invoke("panel:minimize"),
  close: () => ipcRenderer.invoke("panel:close"),
  quit: () => ipcRenderer.invoke("app:quit"),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("panel:alwaysOnTop", enabled),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke("app:launchAtLogin", enabled),
  getPanelDockState: () => ipcRenderer.invoke("panel:getDockState"),
  setPanelCollapsed: (collapsed) => ipcRenderer.invoke("panel:setCollapsed", collapsed),
  undockPanel: () => ipcRenderer.invoke("panel:undock"),
  dockPanel: (side) => ipcRenderer.invoke("panel:dock", side),
  onPanelDockState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("panel:dockState", listener);
    return () => ipcRenderer.removeListener("panel:dockState", listener);
  },

  // Snapshot sync
  pushSnapshot: (snapshot) => ipcRenderer.send("snapshot:push", snapshot),
  requestSnapshot: () => ipcRenderer.send("snapshot:request"),
  onSnapshot: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on("snapshot:update", listener);
    return () => ipcRenderer.removeListener("snapshot:update", listener);
  },
  onSnapshotRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("snapshot:requested", listener);
    return () => ipcRenderer.removeListener("snapshot:requested", listener);
  },

  // Overlay hit-test click-through
  setOverlayInteractive: (interactive) => ipcRenderer.send("overlay:setInteractive", interactive),

  // Follow mode: cursor pump + follow toggle
  setFollow: (active) => ipcRenderer.send("follow:set", active),
  onCursor: (callback) => {
    const listener = (_event, point) => callback(point);
    ipcRenderer.on("cursor:update", listener);
    return () => ipcRenderer.removeListener("cursor:update", listener);
  },

  // Tool pop-out windows (own OS window, roam across screens, survive minimize)
  openPopout: (tab) => ipcRenderer.send("popout:open", tab),

  // Cross-window localStorage sync relay (storage events are unreliable on file://)
  broadcastStorage: (key, value) => ipcRenderer.send("storage:sync", { key, value }),
  onStorageSync: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("storage:sync", listener);
    return () => ipcRenderer.removeListener("storage:sync", listener);
  },

  // Spawn-by-drag: resolve where the panel drag was released, overlay-relative
  dropPetAtCursor: () => ipcRenderer.invoke("spawn:dropAtCursor"),

  // Trash-corner removal: overlay asks the panel (state owner) to hide a pet
  requestHidePet: (id) => ipcRenderer.send("pet:hide", id),
  onHidePet: (callback) => {
    const listener = (_event, id) => callback(id);
    ipcRenderer.on("pet:hide", listener);
    return () => ipcRenderer.removeListener("pet:hide", listener);
  },

  // Behavior commands: panel -> overlay
  pushCommand: (command) => ipcRenderer.send("command:push", command),
  onCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on("command:apply", listener);
    return () => ipcRenderer.removeListener("command:apply", listener);
  },

  // Tray-driven events
  onTrayToggleFollow: (callback) => {
    const listener = (_event, enabled) => callback(Boolean(enabled));
    ipcRenderer.on("tray:toggleFollow", listener);
    return () => ipcRenderer.removeListener("tray:toggleFollow", listener);
  }
});
