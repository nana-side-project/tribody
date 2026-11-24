// Integrity checks for the body-map hotspots: every pain spot is drawn on each of its views,
// on both sides, inside the silhouette, mirrored correctly and not on top of another spot.
import { describe, expect, it } from 'vitest';
import { PAIN_SPOTS } from '../../data/registry';
import { type Pt, sample } from './geometry';
import { CX, figureOutlines } from './figure';
import { soleOutline } from './sole';
import { type BodyView, placeSpots } from './spots';

function inside(p: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

const polys = (view: BodyView): Pt[][] =>
  view === 'sole'
    ? [sample(soleOutline('right'), true), sample(soleOutline('left'), true)]
    : figureOutlines(view).map((o) => sample(o, true));

describe('body map hotspots', () => {
  for (const view of ['front', 'back', 'sole'] as const) {
    const placed = placeSpots(view);
    const shapes = polys(view);

    it(`${view}: every spot listing this view has a left and a right hotspot`, () => {
      const expected = PAIN_SPOTS.filter((s) => (s.views as readonly string[]).includes(view)).map((s) => s.id);
      for (const id of expected) {
        expect(placed.filter((p) => p.id === id).map((p) => p.side).sort()).toEqual(['left', 'right']);
      }
      expect(new Set(placed.map((p) => p.id)).size).toBe(expected.length);
    });

    it(`${view}: hotspots lie on the body`, () => {
      for (const p of placed) expect(shapes.some((s) => inside([p.x, p.y], s)), p.key).toBe(true);
    });

    it(`${view}: hotspots are mirror images and not stacked on each other`, () => {
      for (const p of placed.filter((q) => q.side === 'right')) {
        const l = placed.find((q) => q.id === p.id && q.side === 'left')!;
        expect(Math.abs(p.x - CX - (CX - l.x))).toBeLessThan(1e-6);
        expect(p.y).toBe(l.y);
      }
      for (let i = 0; i < placed.length; i++)
        for (let j = i + 1; j < placed.length; j++) {
          const d = Math.hypot(placed[i].x - placed[j].x, placed[i].y - placed[j].y);
          expect(d, `${placed[i].key} ↔ ${placed[j].key}`).toBeGreaterThan(14);
        }
    });

    it(`${view}: the figure's right side is drawn on the correct half`, () => {
      for (const p of placed) {
        const onViewerLeft = p.x < CX;
        // front & sole (seen from below): figure's right on the viewer's left; back: on the right
        expect(onViewerLeft).toBe(view === 'back' ? p.side === 'left' : p.side === 'right');
      }
    });
  }
});
