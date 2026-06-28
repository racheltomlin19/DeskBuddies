function getPrimaryOverlayBounds(primaryDisplay) {
  const { x, y, width, height } = primaryDisplay.workArea;
  return { x, y, width, height };
}

module.exports = { getPrimaryOverlayBounds };
