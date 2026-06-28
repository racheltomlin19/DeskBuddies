const PANEL_WIDTH = 350;
const PANEL_HEIGHT = 720;
const PANEL_ASPECT_RATIO = PANEL_WIDTH / PANEL_HEIGHT;
const RAIL_WIDTH = 60;
const SNAP_DISTANCE = 24;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeFloatingBounds(value) {
  const source = value && typeof value === "object" ? value : {};
  const height = Number.isFinite(source.height) ? Math.max(PANEL_HEIGHT, Math.round(source.height)) : PANEL_HEIGHT;
  const bounds = { width: Math.round(height * PANEL_ASPECT_RATIO), height };
  if (Number.isFinite(source.x)) bounds.x = Math.round(source.x);
  if (Number.isFinite(source.y)) bounds.y = Math.round(source.y);
  return bounds;
}

function snapPanelBounds(bounds, workArea) {
  if (Math.abs(bounds.x - workArea.x) <= SNAP_DISTANCE) return "left";
  if (Math.abs(bounds.x + bounds.width - (workArea.x + workArea.width)) <= SNAP_DISTANCE) return "right";
  return null;
}

function getDockedBounds(side, collapsed, workArea) {
  const width = collapsed ? RAIL_WIDTH : PANEL_WIDTH;
  return {
    x: side === "left" ? workArea.x : workArea.x + workArea.width - width,
    y: workArea.y,
    width,
    height: workArea.height
  };
}

function canResizePanel(state) {
  return state.dockSide === null;
}

function normalizePanelState(value) {
  const floatingBounds = value && value.floatingBounds ? value.floatingBounds : value;
  return {
    dockSide: value && (value.dockSide === "left" || value.dockSide === "right") ? value.dockSide : null,
    collapsed: Boolean(value && value.collapsed),
    displayId: typeof (value && value.displayId) === "number" ? value.displayId : null,
    floatingBounds: normalizeFloatingBounds(floatingBounds)
  };
}

function dockPanelState(state, side, display, floatingBounds) {
  return {
    ...state,
    dockSide: side,
    collapsed: true,
    displayId: display.id,
    floatingBounds: normalizeFloatingBounds(floatingBounds)
  };
}

function restorePanelState(state, displays, primaryWorkArea) {
  const display = displays.find((item) => item.id === state.displayId);
  if (state.dockSide && display) return { ...state, bounds: getDockedBounds(state.dockSide, state.collapsed, display.workArea) };
  const normalized = normalizeFloatingBounds(state.floatingBounds);
  const height = Math.min(normalized.height, primaryWorkArea.height);
  const width = Math.round(height * PANEL_ASPECT_RATIO);
  const canRestorePosition = !state.dockSide && Number.isFinite(normalized.x) && Number.isFinite(normalized.y);
  const centeredX = primaryWorkArea.x + (primaryWorkArea.width - width) / 2;
  const centeredY = primaryWorkArea.y + (primaryWorkArea.height - height) / 2;
  const x = canRestorePosition
    ? clamp(normalized.x, primaryWorkArea.x, primaryWorkArea.x + Math.max(0, primaryWorkArea.width - width))
    : centeredX;
  const y = canRestorePosition
    ? clamp(normalized.y, primaryWorkArea.y, primaryWorkArea.y + Math.max(0, primaryWorkArea.height - height))
    : centeredY;
  return {
    ...state,
    dockSide: null,
    collapsed: false,
    displayId: null,
    floatingBounds: { ...normalized, x, y, width, height },
    bounds: { x, y, width, height }
  };
}

module.exports = {
  PANEL_WIDTH,
  PANEL_HEIGHT,
  PANEL_ASPECT_RATIO,
  RAIL_WIDTH,
  SNAP_DISTANCE,
  snapPanelBounds,
  getDockedBounds,
  canResizePanel,
  normalizeFloatingBounds,
  normalizePanelState,
  dockPanelState,
  restorePanelState
};
