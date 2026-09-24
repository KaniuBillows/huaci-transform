import { describe, expect, it } from 'vitest';
import { layoutPanelNearToolbar } from './layout';

describe('layoutPanelNearToolbar', () => {
  it('下方空间足够时放在工具条下面', () => {
    const pos = layoutPanelNearToolbar(100, 100, 1280, 800);
    expect(pos).toEqual({ x: 100, y: 148, placement: 'below', maxHeight: 480 });
    expect(pos.y + pos.maxHeight).toBeLessThanOrEqual(700);
  });

  it('靠近屏幕底部时改放到工具条上方', () => {
    const pos = layoutPanelNearToolbar(100, 700, 1280, 800);
    expect(pos).toEqual({ x: 100, y: 692, placement: 'above', maxHeight: 480 });
    expect(pos.y).toBeLessThanOrEqual(700);
    expect(pos.y - pos.maxHeight).toBeGreaterThanOrEqual(12);
  });

  it('两侧都容不下完整弹窗时选较大空间并限制高度', () => {
    const pos = layoutPanelNearToolbar(100, 360, 1280, 800);
    expect(pos).toEqual({ x: 100, y: 352, placement: 'above', maxHeight: 340 });
    expect(pos.y - pos.maxHeight).toBe(12);
  });

  it('较矮的窗口仍保留底部 100px', () => {
    const pos = layoutPanelNearToolbar(100, 380, 1280, 500);
    expect(pos.placement).toBe('above');
    expect(pos.y).toBeLessThanOrEqual(400);
    expect(pos.maxHeight).toBeLessThanOrEqual(pos.y - 12);
  });
});
