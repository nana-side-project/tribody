import { describe, expect, it } from 'vitest';
import { CONDITION_SCENES } from '../three/scenes';
import { BILATERAL_CONDITIONS, drawnSide } from './viewerHighlights';

describe('bilateral conditions', () => {
  it('match the 3D scenes marked bilateral, so 2D and 3D mirror the same pages', () => {
    const scenes = Object.entries(CONDITION_SCENES)
      .filter(([, s]) => s?.bilateral)
      .map(([id]) => id)
      .sort();
    expect([...BILATERAL_CONDITIONS].sort()).toEqual(scenes);
  });

  it('draws a one-sided condition on the tapped side and a bilateral one unmirrored', () => {
    expect(drawnSide('calf-strain', 'left')).toBe('left');
    expect(drawnSide('calf-strain', 'right')).toBe('right');
    expect(drawnSide('calf-strain', null)).toBeUndefined();
    expect(drawnSide('low-back-pain', 'left')).toBeUndefined();
    expect(drawnSide('cyclist-neck-pain', 'left')).toBeUndefined();
  });
});
