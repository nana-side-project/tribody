// Tap rules and magnifier layout for the home body map (see ./lens.ts).
// The scales cover the rendered map on 360–430 px phones (0.40–0.58 CSS px per figure unit).
import { describe, expect, it } from 'vitest';
import { LENS, TAP, decideTap, layoutLens, lensItemAt } from './lens';
import { type BodyView, type PlacedSpot, placeSpots } from './spots';

const SCALES = [0.4, 0.424, 0.488, 0.576];
/** lens stage widths: 360 px phone (card 344 − 2×6) … 430 px phone (card capped at 372) */
const WIDTHS = [332, 360];
const VIEWS: BodyView[] = ['front', 'back', 'sole'];

/** taps within `r` px of a point, in 16 directions */
function around(r: number): [number, number][] {
  if (r === 0) return [[0, 0]];
  return Array.from({ length: 16 }, (_, i) => [r * Math.cos((i * Math.PI) / 8), r * Math.sin((i * Math.PI) / 8)]);
}

/**
 * same spot on the other side, if a 10 px slip may pick it: only the pairs either side of the spine
 * (closer than TAP.twinUnits — the nearer side wins there); wider pairs (inner knees, groin) must ask
 */
function twinNear(spots: PlacedSpot[], s: PlacedSpot, scale: number) {
  const t = spots.find((o) => o.id === s.id && o.side !== s.side);
  if (!t) return false;
  const units = Math.hypot(t.x - s.x, t.y - s.y);
  return units < TAP.twinUnits && units * scale < 2 * 10 + 1;
}

describe('body map taps', () => {
  for (const view of VIEWS) {
    const spots = placeSpots(view);
    for (const scale of SCALES) {
      it(`${view} @${scale}: a tap within 10 px (+ rounding) of a hotspot never picks another spot, and the lens always offers it`, () => {
        for (const s of spots) {
          // 10.7: a 10 px slip plus the sub-pixel rounding of pointer coordinates
          for (const r of [0, 3, 6, 8, 10, 10.7]) {
            for (const [dx, dy] of around(r)) {
              const d = decideTap(spots, s.x + dx / scale, s.y + dy / scale, scale, true);
              const tag = `${s.key} (${dx.toFixed(1)}, ${dy.toFixed(1)})`;
              if (d.kind === 'pick') {
                expect(d.spot.id, tag).toBe(s.id);
                if (!twinNear(spots, s, scale)) expect(d.spot.side, tag).toBe(s.side);
              } else {
                expect(d.kind, tag).toBe('lens');
                if (d.kind !== 'lens') continue;
                for (const w of WIDTHS) {
                  const lay = layoutLens(d.spots, w, scale, d.required);
                  expect(
                    lay.items.map((i) => i.spot.key),
                    tag,
                  ).toContain(s.key);
                }
              }
            }
          }
        }
      });

      it(`${view} @${scale}: a centre tap on a hotspot with no neighbour within ${TAP.safePx} px opens it directly`, () => {
        for (const s of spots) {
          const crowded = spots.some(
            (o) => o.id !== s.id && Math.hypot(o.x - s.x, o.y - s.y) * scale < TAP.safePx,
          );
          const d = decideTap(spots, s.x, s.y, scale, true);
          if (!crowded) expect(d.kind === 'pick' && d.spot.key, s.key).toBe(s.key);
        }
      });
    }
  }

  it('a tap off the figure does nothing; a body tap far from every hotspot explains instead of guessing', () => {
    const spots = placeSpots('front');
    expect(decideTap(spots, 5, 5, 0.488, false).kind).toBe('none');
    // mid-thigh, ~100 units from the nearest hotspot
    const d = decideTap(spots, 230 - 50, 600, 0.488, true);
    expect(d.kind).toBe('miss');
  });
});

describe('body map lens layout', () => {
  // every lens the tap rule can open: sample taps on a fine grid over each view
  for (const view of VIEWS) {
    for (const scale of SCALES) {
      for (const w of WIDTHS) {
        it(`${view} @${scale}, stage ${w}px: callouts are ≥ 44 px, don't overlap, stay on the stage, and the dots stay clear`, () => {
          const spots = placeSpots(view);
          const seen = new Set<string>();
          for (const s of spots)
            for (const r of [0, 6, 10, 16])
              for (const [dx, dy] of around(r)) {
                const d = decideTap(spots, s.x + dx / scale, s.y + dy / scale, scale, true);
                if (d.kind !== 'lens') continue;
                const sig = d.spots.map((p) => p.key).join() + '/' + d.required;
                if (seen.has(sig)) continue;
                seen.add(sig);
                const lay = layoutLens(d.spots, w, scale, d.required);
                const tag = `${view} ${sig}`;
                expect(lay.items.length, tag).toBeGreaterThanOrEqual(2);
                expect(lay.m / scale, tag).toBeGreaterThanOrEqual(LENS.minZoom - 1e-9);
                expect(lay.m / scale, tag).toBeLessThanOrEqual(LENS.maxZoom + 1e-9);
                for (const it of lay.items) {
                  expect(it.lh, tag).toBeGreaterThanOrEqual(44);
                  expect(it.ly - it.lh / 2, tag).toBeGreaterThanOrEqual(0);
                  expect(it.ly + it.lh / 2, tag).toBeLessThanOrEqual(lay.h);
                  // dots in the middle band, clear of both callout columns
                  expect(it.px, tag).toBeGreaterThan(lay.colW + 8);
                  expect(it.px, tag).toBeLessThan(lay.w - lay.colW - 8);
                  expect(it.py, tag).toBeGreaterThan(12);
                  expect(it.py, tag).toBeLessThan(lay.h - 12);
                }
                for (const col of ['left', 'right'] as const) {
                  const c = lay.items.filter((i) => i.col === col).sort((a, b) => a.ly - b.ly);
                  for (let i = 1; i < c.length; i++)
                    expect(c[i].ly - c[i].lh / 2, tag).toBeGreaterThanOrEqual(c[i - 1].ly + c[i - 1].lh / 2 + 2);
                }
                // magnified dots far enough apart that a ±10 px tap on one can't hit another
                for (let i = 0; i < lay.items.length; i++)
                  for (let j = i + 1; j < lay.items.length; j++) {
                    const a = lay.items[i];
                    const b = lay.items[j];
                    expect(Math.hypot(a.px - b.px, a.py - b.py), `${tag}: ${a.spot.key} ↔ ${b.spot.key}`).toBeGreaterThan(30);
                  }
                // tapping a magnified dot 10 px off still selects it
                for (const it of lay.items)
                  for (const [dx, dy] of around(10)) expect(lensItemAt(lay, it.px + dx, it.py + dy)?.spot.key, tag).toBe(it.spot.key);
              }
        });
      }
    }
  }
});
