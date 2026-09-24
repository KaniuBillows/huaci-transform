const PANEL_WIDTH = 420;
const PANEL_MAX_HEIGHT = 480;
const TOOLBAR_HEIGHT = 40;
const PANEL_GAP = 8;
const EDGE_GAP = 12;
const BOTTOM_GAP = 100;

export interface PanelPosition {
  x: number;
  /** 下方布局时是上边缘，上方布局时是下边缘。 */
  y: number;
  placement: 'above' | 'below';
  maxHeight: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** 在工具条附近选择可用空间，并为流式增长的内容预留滚动高度。 */
export function layoutPanelNearToolbar(
  toolbarX: number,
  toolbarY: number,
  viewportW: number,
  viewportH: number,
): PanelPosition {
  const x = clamp(toolbarX, EDGE_GAP, viewportW - PANEL_WIDTH - EDGE_GAP);
  const safeBottom = Math.max(EDGE_GAP, viewportH - BOTTOM_GAP);
  const below = clamp(toolbarY + TOOLBAR_HEIGHT + PANEL_GAP, EDGE_GAP, safeBottom);
  const above = clamp(toolbarY - PANEL_GAP, EDGE_GAP, safeBottom);
  const spaceBelow = safeBottom - below;
  const spaceAbove = above - EDGE_GAP;

  if (spaceBelow >= PANEL_MAX_HEIGHT || spaceBelow >= spaceAbove) {
    return {
      x,
      y: below,
      placement: 'below',
      maxHeight: Math.min(PANEL_MAX_HEIGHT, spaceBelow),
    };
  }
  return {
    x,
    y: above,
    placement: 'above',
    maxHeight: Math.min(PANEL_MAX_HEIGHT, spaceAbove),
  };
}
