import { describe, expect, it } from 'vitest';
import { CONDITIONS, REGIONS, type RegionId } from '../data';
import { CONDITION_SCENES } from '../three/scenes';
import { BILATERAL_CONDITIONS, BILATERAL_REGIONS, drawnSide, regionDrawnSide } from './viewerHighlights';

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

  it('keeps the central region pages (all their conditions bilateral) unmirrored, so they match their condition pages', () => {
    expect([...BILATERAL_REGIONS].sort()).toEqual(['lowback', 'neck']);
    for (const { id } of REGIONS) {
      const r = id as RegionId;
      const own = CONDITIONS.filter((c) => c.region === r);
      // a region page is unmirrored exactly when it has conditions and every one of them is drawn unmirrored
      expect(BILATERAL_REGIONS.has(r), r).toBe(own.length > 0 && own.every((c) => drawnSide(c.id, 'left') === undefined));
    }
    expect(regionDrawnSide('lowback', 'left')).toBeUndefined();
    expect(regionDrawnSide('neck', 'left')).toBeUndefined();
    expect(regionDrawnSide('neck', 'right')).toBeUndefined();
    expect(regionDrawnSide('calf', 'left')).toBe('left');
    expect(regionDrawnSide('shoulder', 'left')).toBe('left');
    expect(regionDrawnSide('calf', null)).toBeUndefined();
  });
});
