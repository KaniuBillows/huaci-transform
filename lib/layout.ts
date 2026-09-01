const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 280;
const TOOLBAR_HEIGHT = 40;
const PANEL_GAP = 8;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * 相对工具条放置悬浮窗：优先下方；下方空间不足时改到上方，避免挡住按钮。
 */
export function layoutPanelNearToolbar(
  toolbarX: number,
  toolbarY: number,
  viewportW: number,
  viewportH: number,
): { x: number; y: number } {
  const x = clamp(toolbarX, 12, viewportW - PANEL_WIDTH - 12);
  const minY = 12;
  const maxY = Math.max(minY, viewportH - PANEL_HEIGHT - 12);
  const below = toolbarY + TOOLBAR_HEIGHT + PANEL_GAP;
  const above = toolbarY - PANEL_HEIGHT - PANEL_GAP;
  if (below <= maxY) {
    return { x, y: below };
  }
  if (above >= minY) {
    return { x, y: above };
  }
  const spaceBelow = viewportH - (toolbarY + TOOLBAR_HEIGHT) - 12;
  const spaceAbove = toolbarY - 12;
  return { x, y: clamp(spaceBelow >= spaceAbove ? below : above, minY, maxY) };
}
