import { describe, expect, it } from 'vitest';
import { layoutPanelNearToolbar } from './layout';

describe('layoutPanelNearToolbar', () => {
  it('下方空间足够时放在工具条下面', () => {
    const pos = layoutPanelNearToolbar(100, 100, 1280, 800);
    expect(pos.y).toBe(148);
  });

  it('靠近屏幕底部时改放到工具条上方', () => {
    const pos = layoutPanelNearToolbar(100, 700, 1280, 800);
    expect(pos.y).toBe(412);
    expect(pos.y + 280).toBeLessThanOrEqual(700);
  });
});
