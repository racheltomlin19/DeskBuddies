import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

const [main, preload] = await Promise.all([
  readFile(new URL("./main.cjs", import.meta.url), "utf8"),
  readFile(new URL("./preload.cjs", import.meta.url), "utf8")
]);

test("panel minimize invokes BrowserWindow minimize independently of hide", () => {
  expect(preload).toMatch(/minimize:\s*\(\)\s*=>\s*ipcRenderer\.invoke\("panel:minimize"\)/);
  expect(main).toMatch(/ipcMain\.handle\("panel:minimize"[\s\S]*?panelWindow\?\.minimize\(\)/);
  expect(main).toMatch(/ipcMain\.handle\("panel:close"[\s\S]*?panelWindow\?\.hide\(\)/);
});

test("overlay follows all primary display metric changes and listeners are removed", () => {
  expect(main).toMatch(/screen\.on\("display-added",\s*displayChangeHandler\)/);
  expect(main).toMatch(/screen\.on\("display-removed",\s*displayChangeHandler\)/);
  expect(main).toMatch(/screen\.on\("display-metrics-changed",\s*displayChangeHandler\)/);
  expect(main).toMatch(/screen\.removeListener\("display-added",\s*displayChangeHandler\)/);
  expect(main).toMatch(/screen\.removeListener\("display-removed",\s*displayChangeHandler\)/);
  expect(main).toMatch(/screen\.removeListener\("display-metrics-changed",\s*displayChangeHandler\)/);
});

test("overlay click-through has a main-process watchdog and a manual escape hatch", () => {
  expect(main).toMatch(/OVERLAY_HEARTBEAT_TIMEOUT_MS = 1200/);
  expect(main).toMatch(/startOverlayWatchdog\(\)/);
  expect(main).toMatch(/ipcMain\.on\("overlay:heartbeat"/);
  expect(main).toMatch(/Restore desktop clicks/);
  expect(preload).toMatch(/setOverlayInteractiveHeartbeat:/);
  expect(preload).toMatch(/ipcRenderer\.send\("overlay:heartbeat"\)/);
});

test("floating panel docking waits for a resettable 180 ms movement settle", () => {
  expect(main).toMatch(/const PANEL_DOCK_SETTLE_MS = 180/);
  expect(main).toMatch(/function clearPanelDockSettleTimer\(\)[\s\S]*?clearTimeout\(panelDockSettleTimer\)[\s\S]*?panelDockSettleTimer = null/);
  expect(main).toMatch(/panelWindow\.on\("move",[\s\S]*?clearPanelDockSettleTimer\(\)[\s\S]*?setTimeout\([\s\S]*?PANEL_DOCK_SETTLE_MS/);
});

test("continuous move observations rearm immediately but only the quiet timer applies docking", () => {
  const listener = main.match(/panelWindow\.on\("move", \(\) => \{([\s\S]*?)\n  \}\);/)?.[1] ?? "";
  expect(listener).toMatch(/const observedBounds = panelWindow\.getBounds\(\)[\s\S]*?isDockRearmed\(observedBounds, observedDisplay\.workArea\)[\s\S]*?panelDockRearmed = true/);
  expect(listener).toMatch(/clearPanelDockSettleTimer\(\)[\s\S]*?setTimeout/);
  expect(listener).not.toMatch(/applyPanelDockState[^(]/);
  expect(listener).toMatch(/setTimeout\([\s\S]*?getSnapCandidate[\s\S]*?applyPanelDockState/);
});

test("settled docking uses fresh window bounds and their matching display", () => {
  expect(main).toMatch(/setTimeout\(\(\) => \{[\s\S]*?const currentBounds = panelWindow\.getBounds\(\)[\s\S]*?screen\.getDisplayMatching\(currentBounds\)[\s\S]*?getSnapCandidate\(currentBounds, display\.workArea\)/);
});

test("undock rearm suppresses snapping until the restored panel clears both edges", () => {
  expect(main).toMatch(/let panelDockRearmed = true/);
  expect(main).toMatch(/function undockPanel\(\)[\s\S]*?clearPanelDockSettleTimer\(\)[\s\S]*?panelDockRearmed = false/);
  expect(main).toMatch(/isDockRearmed\(observedBounds, observedDisplay\.workArea\)[\s\S]*?panelDockRearmed = true/);
});

test("pending panel docking is cleared across dock and shutdown paths", () => {
  expect(main).toMatch(/function dockPanel\(side\)[\s\S]*?clearPanelDockSettleTimer\(\)/);
  expect(main).toMatch(/panelWindow\.on\("close",[\s\S]*?clearPanelDockSettleTimer\(\)/);
  expect(main).toMatch(/function quitApp\(\)[\s\S]*?clearPanelDockSettleTimer\(\)/);
  expect(main).toMatch(/app\.on\("will-quit",[\s\S]*?clearPanelDockSettleTimer\(\)/);
});
