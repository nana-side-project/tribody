import { describe, expect, it } from 'vitest';
import { CONDITIONS, REGIONS, type RegionId } from '../data';
import { CONDITION_SCENES } from '../three/scenes';
import { getRegionDiagram } from '../svg/regions';
import { spotsAcross } from '../svg/regions/shoulder';
import { BILATERAL_CONDITIONS, BILATERAL_REGIONS, drawnSide, regionDrawnSide, regionSpotSide, spotMarkViews, spotSideOf } from './viewerHighlights';

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

describe('the tapped side on a bilateral figure (spotSide)', () => {
  it('moves only the hotspots where the drawing stays unmirrored, and the whole drawing everywhere else', () => {
    for (const c of CONDITIONS)
      for (const side of ['left', 'right'] as const) {
        // exactly one of the two carries the side: the mirrored drawing or the marker on the unmirrored one
        expect([drawnSide(c.id, side), spotSideOf(c.id, side)].filter(Boolean), `${c.id} ${side}`).toEqual([side]);
        expect(spotSideOf(c.id, null)).toBeUndefined();
      }
    expect(spotSideOf('low-back-pain', 'left')).toBe('left');
    expect(spotSideOf('cyclist-neck-pain', 'right')).toBe('right');
    expect(spotSideOf('calf-strain', 'left')).toBeUndefined();
    for (const { id } of REGIONS)
      for (const side of ['left', 'right'] as const) {
        const r = id as RegionId;
        expect([regionDrawnSide(r, side), regionSpotSide(r, side)].filter(Boolean), `${r} ${side}`).toEqual([side]);
      }
    expect(regionSpotSide('lowback', 'left')).toBe('left');
    expect(regionSpotSide('neck', undefined)).toBeUndefined();
    expect(regionSpotSide('knee', 'left')).toBeUndefined();
  });

  it('mirrors hotspots across the given midline only (y and ids kept)', () => {
    expect(spotsAcross([{ id: 'lowback-center', at: [200, 166] }], 180)).toEqual([{ id: 'lowback-center', at: [160, 166] }]);
    expect(spotsAcross([{ id: 'neck-base', at: [214, 168] }, { id: 'neck-back', at: [186, 100] }], 168)).toEqual([
      { id: 'neck-base', at: [122, 168] },
      { id: 'neck-back', at: [150, 100] },
    ]);
  });

  it('opens a bilateral condition page from a tapped spot on the view its region page shows that spot on', () => {
    const neck = getRegionDiagram('neck');
    const lowback = getRegionDiagram('lowback');
    // cyclist-neck-pain: the trapezius is the painful tissue; the neck spots are on both views, 後ろから first
    expect(spotMarkViews(neck, 'neck-base', ['trapezius'])).toEqual({ views: ['back', 'side'], open: 'back' });
    expect(spotMarkViews(neck, 'neck-back', ['trapezius'])).toEqual({ views: ['back', 'side'], open: 'back' });
    expect(spotMarkViews(lowback, 'lowback-center', ['thoracolumbar-fascia'])).toEqual({ views: ['back', 'side'], open: 'back' });
    // a spot the figure has no hotspot for (shoulder blade, on the neck figure): no marker, the usual view
    expect(spotMarkViews(neck, 'scapula-medial', ['trapezius'])).toEqual({ views: [], open: undefined });
    // the first view with the spot does not draw the painful tissue: marked, but the usual view opens
    expect(spotMarkViews(neck, 'neck-base', ['deep-neck-flexors'])).toEqual({ views: ['back', 'side'], open: undefined });
    expect(spotMarkViews(undefined, 'neck-base', ['trapezius'])).toEqual({ views: [], open: undefined });
  });
});
