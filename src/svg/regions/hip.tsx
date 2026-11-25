// Region diagram: 股関節・お尻 (hip) — the person's RIGHT hip, four views:
//   front 前から · back 後ろから · side 横から · deep 後ろ・深層 (gluteus maximus removed).
//
// This file also holds the small SVG drawing kit used by the lower-limb region diagrams
// (knee.tsx imports it). Everything is original artwork generated from hand-placed anatomical
// landmarks:
//   • muscles are "sheets": a set of rails (cross-sections) from origin to insertion; each fibre
//     is a smooth curve through the rails, so the outline, fibre direction and tendon ends all come
//     from the same description (pennate muscles get chevron fibres);
//   • bones, bursae, cartilage and nerves are smooth Catmull-Rom outlines / tubes through landmarks.
// CSS is scoped under `.thk` so it never collides with other region kits on the same page.
// Module-level geometry is built lazily: every outline / muscle sheet is wrapped in once() (./lazy) and made the
// first time a view that draws it renders. side='left' mirrors the drawing with readable texts (./mirror).
import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { MUSCLES, PAIN_SPOTS, STRUCTURES, type ConditionId, type MuscleId, type PainSpotId, type StructureId } from '../../data/registry';
import type { Highlights, RegionDiagram, RegionDiagramProps } from '../types';
import { OILegend, OIMarks, OI_CSS, OI_LEG_H, oiDots, type OIMap } from './markers';
import { once } from './lazy';
import { MText, MirrorG, flipLR, mirrorLab } from './mirror';


export type { OI, OIMap } from './markers';

/* ═════════════════════════════════════ geometry ═════════════════════════════════════ */

export type PartId = MuscleId | StructureId;
/** Landmark point; a third element of 1 marks a sharp corner for `sp()`. */
export type P = readonly [number, number] | readonly [number, number, number];
export type XY = [number, number];
/** A scalar, or values interpolated along u ∈ [0, 1]. */
export type Num = number | readonly number[];

const r1 = (n: number) => String(Math.round(n * 10) / 10);
export const xy = (p: readonly number[]) => `${r1(p[0])} ${r1(p[1])}`;
const c01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);
export const lerp = (a: readonly number[], b: readonly number[], t: number): XY => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Point at u ∈ [0,1] on a uniform Catmull-Rom spline through `pts`. */
export function crAt(pts: readonly (readonly number[])[], u: number): XY {
  const n = pts.length;
  if (n === 1) return [pts[0][0], pts[0][1]];
  if (n === 2) return lerp(pts[0], pts[1], c01(u));
  const x = c01(u) * (n - 1);
  const i = Math.min(n - 2, Math.floor(x));
  const t = x - i;
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p0 = i > 0 ? pts[i - 1] : [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
  const p3 = i + 2 < n ? pts[i + 2] : [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

export function numAt(v: Num | undefined, u: number, d: number): number {
  if (v === undefined) return d;
  if (typeof v === 'number') return v;
  if (v.length === 1) return v[0];
  const x = c01(u) * (v.length - 1);
  const i = Math.min(v.length - 2, Math.floor(x));
  return v[i] + (v[i + 1] - v[i]) * (x - i);
}
const numMax = (v: Num) => (typeof v === 'number' ? v : Math.max(...v));
const numMin = (v: Num) => (typeof v === 'number' ? v : Math.min(...v));

/** Smooth path through points (Catmull-Rom → cubic Bézier). Points flagged [x,y,1] are corners. */
export function sp(pts: readonly P[], closed = true, k = 1): string {
  const n = pts.length;
  if (n < 2) return '';
  const get = (i: number) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${xy(pts[0])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1 = p1[2] ? p1 : [p1[0] + ((p2[0] - p0[0]) * k) / 6, p1[1] + ((p2[1] - p0[1]) * k) / 6];
    const c2 = p2[2] ? p2 : [p2[0] - ((p3[0] - p1[0]) * k) / 6, p2[1] - ((p3[1] - p1[1]) * k) / 6];
    d += `C${xy(c1)} ${xy(c2)} ${xy(p2)}`;
  }
  return closed ? `${d}Z` : d;
}

/** Straight polyline. */
export const pl = (pts: readonly (readonly number[])[], closed = false) => `M${pts.map(xy).join('L')}${closed ? 'Z' : ''}`;

/** Ellipse as a path (rotation in degrees). */
export function ell(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const a = (rot * Math.PI) / 180;
  const pts: P[] = [];
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    pts.push([cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
  }
  return sp(pts, true);
}

/** Outline of a tube of width w(u) around a smooth centre line (tendons, nerves, ligaments). */
export function tube(center: readonly P[], w: Num, n = 24, cap = 0.6): string {
  const L: XY[] = [];
  const R: XY[] = [];
  for (let j = 0; j <= n; j++) {
    const u = j / n;
    const a = crAt(center, Math.max(0, u - 0.01));
    const b = crAt(center, Math.min(1, u + 0.01));
    const c = crAt(center, u);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const h = numAt(w, u, 4) / 2;
    L.push([c[0] - (dy / len) * h, c[1] + (dx / len) * h]);
    R.push([c[0] + (dy / len) * h, c[1] - (dx / len) * h]);
  }
  const end = (u: number, dir: number): XY => {
    const c = crAt(center, u);
    const o = crAt(center, u - dir * 0.02);
    const dx = c[0] - o[0];
    const dy = c[1] - o[1];
    const len = Math.hypot(dx, dy) || 1;
    const h = (numAt(w, u, 4) / 2) * cap;
    return [c[0] + (dx / len) * h, c[1] + (dy / len) * h];
  };
  return sp([...L, end(1, 1), ...R.reverse(), end(0, -1)], true);
}

/**
 * The stretch u ∈ [u0, u1] of a tube (same centre line and widths as `tube(c, w)`), e.g. one zone of a tendon. `cap`
 * rounds its ends (0 = square).
 */
export function tubePart(c: readonly P[], w: Num, u0: number, u1: number, cap = 0.25, n = 14): string {
  const pts: P[] = [];
  const ws: number[] = [];
  for (let j = 0; j <= n; j++) {
    const u = u0 + ((u1 - u0) * j) / n;
    pts.push(crAt(c, u));
    ws.push(numAt(w, u, 4));
  }
  return tube(pts, ws, 2 * n, cap);
}

/** Centre line of a tube (for fibre / texture lines). */
export const line = (pts: readonly P[]) => sp(pts, false);

/* ── muscle sheets ── */

/**
 * A muscle as a sheet: `r` is a list of rails (cross-sections) ordered origin → insertion; each rail
 * lists points across the muscle (u = 0 → 1). Fibre u is a smooth curve through rail_k(u); s ∈ [0,1]
 * runs along the fibre. Two rails give straight fibres (fields of pennate muscles).
 */
export interface Sheet {
  r: readonly (readonly P[])[];
  /** origin tendon: s ∈ [0, t0(u)] */
  t0?: Num;
  /** insertion tendon: s ∈ [t1(u), 1] */
  t1?: Num;
  /** number of fibre lines */
  n?: number;
  /** darker division lines at these u (heads, coarse fascicles) */
  seams?: number[];
  /** pennate fibres: 'bi' = chevrons from the mid-line u=.5 to both edges; 'uni' = from u=0 to u=1 */
  pen?: 'bi' | 'uni';
  /** for pennate fibres: s-offset between the two ends of a fibre (slope) */
  penD?: number;
}

const railsAt = (S: Sheet, u: number) => S.r.map((rail) => crAt(rail, u));
export function spt(S: Sheet, u: number, s: number): XY {
  return crAt(railsAt(S, u), s);
}
function fibrePts(S: Sheet, u: number, a: number, b: number, m = 10): XY[] {
  const F = railsAt(S, u);
  const out: XY[] = [];
  for (let j = 0; j <= m; j++) out.push(crAt(F, a + ((b - a) * j) / m));
  return out;
}

/** Outline of the sub-region u ∈ [u0,u1], s ∈ [s0(u), s1(u)] of a sheet. */
export function band(S: Sheet, u0: number, u1: number, s0: Num, s1: Num, nu = 18, ns = 12): string {
  const A = (u: number) => numAt(s0, u, 0);
  const B = (u: number) => numAt(s1, u, 1);
  const pts: P[] = [];
  const f0 = fibrePts(S, u0, A(u0), B(u0), ns);
  f0.forEach((p, j) => pts.push(j === 0 || j === ns ? [p[0], p[1], 1] : p));
  for (let j = 1; j < nu; j++) {
    const u = u0 + ((u1 - u0) * j) / nu;
    pts.push(spt(S, u, B(u)));
  }
  const f1 = fibrePts(S, u1, A(u1), B(u1), ns).reverse();
  f1.forEach((p, j) => pts.push(j === 0 || j === ns ? [p[0], p[1], 1] : p));
  for (let j = 1; j < nu; j++) {
    const u = u1 - ((u1 - u0) * j) / nu;
    pts.push(spt(S, u, A(u)));
  }
  return sp(pts, true);
}

/** Fibre lines along u-lines. */
export function fibres(S: Sheet, n: number, s0: Num, s1: Num, off = 0.5, inset = 0.03, u0 = 0, u1 = 1): string {
  let d = '';
  for (let k = 0; k < n; k++) {
    const u = u0 + ((u1 - u0) * (k + off)) / n;
    if (u <= 0.002 || u >= 0.998) continue;
    const a = numAt(s0, u, 0) + inset;
    const b = numAt(s1, u, 1) - inset;
    if (b - a < 0.03) continue;
    d += line(fibrePts(S, u, a, b, 8));
  }
  return d;
}

/** Pennate fibre strokes (chevrons). */
function pennate(S: Sheet, n: number, s0: number, s1: number, mode: 'bi' | 'uni', D: number, light: boolean): string {
  let d = '';
  const span = s1 - s0 - D;
  for (let k = 0; k < n; k++) {
    const s = s0 + (span * (k + (light ? 0.95 : 0.45))) / n;
    if (s < s0 || s + D > s1) continue;
    if (mode === 'bi') {
      const m = spt(S, 0.5, s);
      const a = spt(S, 0.05, s + D);
      const b = spt(S, 0.95, s + D);
      const ma = lerp(m, a, 0.5);
      const mb = lerp(m, b, 0.5);
      const ca = spt(S, 0.27, s + D * 0.42);
      const cb = spt(S, 0.73, s + D * 0.42);
      d += `M${xy(m)}Q${xy(lerp(ma, ca, 0.8))} ${xy(a)}M${xy(m)}Q${xy(lerp(mb, cb, 0.8))} ${xy(b)}`;
    } else {
      const a = spt(S, 0.04, s);
      const b = spt(S, 0.96, s + D);
      const c = spt(S, 0.5, s + D * 0.5);
      d += `M${xy(a)}Q${xy(lerp(lerp(a, b, 0.5), c, 0.9))} ${xy(b)}`;
    }
  }
  return d;
}

export interface MuscleGeo {
  /** the sheet it was made from (attachment points: `att`) */
  sheet: Sheet;
  body: string;
  ten: string[];
  tenFib: string;
  fib: string;
  fibL: string;
  shade: string;
  hi: string;
  seam: string;
  raphe: string;
}

/** Pre-compute the drawable geometry of a muscle sheet. */
export function muscle(S: Sheet): MuscleGeo {
  const n = S.n ?? 9;
  const t0: Num = S.t0 ?? 0;
  const t1: Num = S.t1 ?? 1;
  const ten: string[] = [];
  let tenFib = '';
  const tn = Math.max(3, Math.round(n * 0.55));
  if (numMax(t0) > 0.004) {
    ten.push(band(S, 0, 1, 0, t0));
    tenFib += fibres(S, tn, 0, t0, 0.5, 0.008);
  }
  if (numMin(t1) < 0.996) {
    ten.push(band(S, 0, 1, t1, 1));
    tenFib += fibres(S, tn, t1, 1, 0.5, 0.008);
  }
  const seam = (S.seams ?? [])
    .map((u) => {
      const pts: XY[] = [];
      for (let j = 0; j <= 12; j++) {
        const s = numAt(t0, u, 0) + ((numAt(t1, u, 1) - numAt(t0, u, 0)) * j) / 12;
        pts.push(spt(S, u, s));
      }
      return line(pts);
    })
    .join('');
  let fib: string;
  let fibL: string;
  let raphe = '';
  if (S.pen) {
    const a = numMax(t0);
    const b = numMin(t1);
    const D = S.penD ?? 0.16;
    fib = pennate(S, n, a, b, S.pen, D, false);
    fibL = pennate(S, n, a, b, S.pen, D, true);
    if (S.pen === 'bi') {
      const pts: XY[] = [];
      for (let j = 0; j <= 14; j++) pts.push(spt(S, 0.5, a + ((b - a) * j) / 14));
      raphe = line(pts);
    }
  } else {
    fib = fibres(S, n, t0, t1, 0.5);
    fibL = fibres(S, n, t0, t1, 0, 0.07);
  }
  return {
    sheet: S,
    body: band(S, 0, 1, t0, t1),
    ten,
    tenFib,
    fib,
    fibL,
    shade: band(S, 0, 0.12, t0, t1, 6) + band(S, 0.88, 1, t0, t1, 6),
    hi: band(S, 0.3, 0.52, t0, t1, 8),
    seam,
    raphe,
  };
}

/* ── 起始 / 停止 markers (muscle page) ── */

/**
 * Points on the origin (s = 0) or insertion (s = 1) end of a muscle sheet, at fibre position(s) u across it — for the
 * 起始 / 停止 markers (Frame `oi`). Only use an end that is a real attachment in that view (not a cut or a crop).
 */
export function att(g: MuscleGeo, end: 'o' | 'i', us: number | readonly number[] = 0.5, s?: number): XY[] {
  const at = s ?? (end === 'o' ? 0 : 1);
  return (typeof us === 'number' ? [us] : us).map((u) => spt(g.sheet, u, at));
}

/**
 * 起始 / 停止 markers from the two ends of muscle sheets (`att`, mid-fibre) for one view. An end outside `box`
 * ([x0, y0, x1, y1]: the part of the view that is not cropped or faded) is left out, so a muscle that runs off the
 * drawing gets no dot there. Override the muscles whose sheet end is not their real attachment in that view.
 */
export function oiFrom(geos: Partial<Record<PartId, MuscleGeo | readonly MuscleGeo[]>>, box: readonly [number, number, number, number]): OIMap {
  const inBox = (p: readonly number[]) => p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3];
  const out: OIMap = {};
  for (const [id, g] of Object.entries(geos) as [PartId, MuscleGeo | readonly MuscleGeo[]][]) {
    const list: readonly MuscleGeo[] = Array.isArray(g) ? g : [g as MuscleGeo];
    const o = list.flatMap((x) => att(x, 'o')).filter(inBox);
    const i = list.flatMap((x) => att(x, 'i')).filter(inBox);
    if (o.length || i.length) out[id] = { o, i };
  }
  return out;
}

/* ═════════════════════════════════════ styles ═════════════════════════════════════ */

const DARK = `
  --k-amber: var(--involved, #f2b13e); --k-cart: #a8bccb; --k-labrum: #7f9fb8; --k-vivid: #ff6a55; --k-shade: #000; --k-shade-o: .2;
  --k-hi-o: .05; --k-mus-ink: color-mix(in srgb, var(--muscle) 52%, #000); --k-ten-ink: color-mix(in srgb, var(--tendon) 52%, #000);
  --k-bone-sh: #000; --k-bone-sh-o: .18; --k-body: color-mix(in srgb, var(--surface-2) 70%, var(--surface));
  --k-ctx: color-mix(in srgb, var(--muscle) 46%, var(--surface)); --k-cut: color-mix(in srgb, var(--muscle) 70%, #fff);
  --k-fat: color-mix(in srgb, var(--nerve) 42%, #6a6258);
  --k-zten: color-mix(in srgb, var(--injured) 20%, color-mix(in srgb, var(--tendon) 68%, var(--surface)));`;

/** caption / inset-note font size in user units: same as labels, so ≥ 11 CSS px on a 360 px phone (figure ≈ 302 px wide) */
export const CAP_FS = 13.25;

export const KIT_CSS = `
.thk { --k-amber: var(--involved, #e0901a); --k-cart: #e1ebf2; --k-labrum: #a9c3d8; --k-vivid: #d8342a; --k-shade: #2b0805; --k-shade-o: .14;
  --k-hi-o: .08; --k-mus-ink: color-mix(in srgb, var(--muscle) 60%, #2a0805);
  --k-ten-ink: color-mix(in srgb, var(--tendon) 60%, #5a4524); --k-bone-sh: #4a443d; --k-bone-sh-o: .1;
  --k-inj-ink: color-mix(in srgb, var(--injured) 70%, #000); --k-body: color-mix(in srgb, var(--surface-2) 55%, var(--surface));
  --k-ctx: color-mix(in srgb, var(--muscle) 40%, var(--surface)); --k-cut: color-mix(in srgb, var(--muscle) 55%, #fff);
  --k-fat: color-mix(in srgb, var(--nerve) 30%, #fff);
  --k-zmus: color-mix(in srgb, var(--injured) 34%, var(--surface)); --k-zten: color-mix(in srgb, var(--injured) 22%, var(--tendon));
  --k-zbone: color-mix(in srgb, var(--injured) 22%, var(--bone)); --k-zink: color-mix(in srgb, var(--injured) 72%, var(--text));
  display: block; width: 100%; height: auto; max-width: 480px; margin: 0 auto; overflow: hidden;
  font-family: inherit; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none;
  touch-action: manipulation; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .thk { ${DARK} } }
:root[data-theme="dark"] .thk { ${DARK} }
.thk .body { fill: var(--k-body); stroke: none; }
.thk .mus { fill: var(--muscle); }
.thk .ol { fill: none; stroke: var(--k-mus-ink); stroke-width: .8; stroke-linejoin: round; }
.thk .fib { fill: none; stroke: var(--k-mus-ink); stroke-width: .55; opacity: .5; stroke-linecap: round; }
.thk .fib-l { fill: none; stroke: #fff; stroke-width: .75; opacity: .15; stroke-linecap: round; }
.thk .seam { fill: none; stroke: var(--k-mus-ink); stroke-width: .9; opacity: .72; stroke-linecap: round; }
.thk .raphe { fill: none; stroke: var(--tendon); stroke-width: 1.6; opacity: .9; stroke-linecap: round; }
.thk .shade { fill: var(--k-shade); opacity: var(--k-shade-o); }
.thk .hi { fill: #fff; opacity: var(--k-hi-o); }
.thk .cutf { fill: var(--k-cut); stroke: var(--k-mus-ink); stroke-width: .7; }
.thk .mus-ctx { fill: var(--k-ctx); stroke: color-mix(in srgb, var(--k-mus-ink) 45%, var(--surface)); stroke-width: .7; }
.thk .fib-ctx { fill: none; stroke: var(--k-mus-ink); stroke-width: .5; opacity: .22; }
.thk .ten, .thk .lig { fill: var(--tendon); stroke: var(--k-ten-ink); stroke-width: .7; stroke-linejoin: round; }
.thk .ten-fib { fill: none; stroke: var(--k-ten-ink); stroke-width: .45; opacity: .5; }
.thk .fascia { fill: var(--tendon); stroke: var(--k-ten-ink); stroke-width: .8; opacity: .9; }
.thk .fascia-t { fill: var(--tendon); stroke: var(--k-ten-ink); stroke-width: .8; fill-opacity: .62; }
.thk .cap { fill: var(--tendon); stroke: var(--k-ten-ink); stroke-width: .7; fill-opacity: .55; }
.thk .bone { fill: var(--bone); stroke: var(--bone-ink); stroke-width: 1; stroke-linejoin: round; }
.thk .bone-g { fill: var(--bone); stroke: var(--bone-ink); stroke-width: .8; opacity: .5; }
.thk .bone-ln { fill: none; stroke: var(--bone-ink); stroke-width: .7; opacity: .5; stroke-linecap: round; stroke-linejoin: round; }
.thk .bone-sh { fill: var(--k-bone-sh); opacity: var(--k-bone-sh-o); stroke: none; }
.thk .bone-t { fill: var(--bone); fill-opacity: .6; stroke: var(--bone-ink); stroke-width: 1; stroke-dasharray: 2.4 1.6; }
.thk .fat { fill: var(--k-fat); stroke: color-mix(in srgb, var(--nerve) 40%, var(--bone-ink)); stroke-width: .6; }
.thk .hole { fill: var(--k-body); stroke: var(--bone-ink); stroke-width: .8; }
.thk .bursa { fill: var(--bursa); stroke: color-mix(in srgb, var(--bursa) 55%, #102a44); stroke-width: .8; fill-opacity: .92; }
.thk .cart { fill: var(--k-cart); stroke: color-mix(in srgb, var(--k-cart) 50%, #2c4a62); stroke-width: .75; }
.thk .labrum { fill: var(--k-labrum); stroke: color-mix(in srgb, var(--k-labrum) 45%, #102a44); stroke-width: .8; }
.thk .nerve { fill: var(--nerve); stroke: color-mix(in srgb, var(--nerve) 55%, #4a3600); stroke-width: .7; }
.thk .nerve-ln { fill: none; stroke: color-mix(in srgb, var(--nerve) 55%, #4a3600); stroke-width: .5; opacity: .55; }
.thk .ghost { fill: none; stroke: var(--text-2); stroke-width: .9; opacity: .5; stroke-dasharray: 3 2.5; }
.thk .rim { fill: none; stroke: var(--k-mus-ink); stroke-width: 1; opacity: .8; }
.thk .rimc { fill: none; stroke: var(--k-cut); stroke-width: 3.4; opacity: .95; }
.thk .rim-t { fill: none; stroke: var(--k-ten-ink); stroke-width: 1.2; opacity: .8; }
.thk .inset-bg { fill: var(--surface); stroke: var(--border); stroke-width: 1.2; }
.thk .inset-ring { fill: none; stroke: var(--text-2); stroke-width: .9; opacity: .55; }
.thk .inset-ln { fill: none; stroke: var(--text-2); stroke-width: .8; opacity: .55; stroke-dasharray: 2.5 2.5; }
.thk .cap-t { font-size: ${CAP_FS}px; fill: var(--text-2); opacity: .85; font-weight: 600; letter-spacing: .02em; paint-order: stroke; stroke: var(--surface); stroke-width: 3.2px; stroke-linejoin: round; }
.thk .note-t { font-size: ${CAP_FS}px; fill: var(--text-2); font-weight: 600; paint-order: stroke; stroke: var(--surface); stroke-width: 3.2px; stroke-linejoin: round; }

/* parts & highlight roles */
.thk-part, .thk-ctx { transition: opacity .25s ease; }
.thk-part[role="button"] { cursor: pointer; outline: none; }
.thk-part.is-dim { opacity: .22; }
.thk-ctx.is-dim { opacity: .3; }
.thk .is-injured :is(.mus, .ten, .lig, .cap, .fascia, .fascia-t, .bone, .bone-t, .bursa, .cart, .labrum, .nerve, .cutf) {
  fill: var(--injured); stroke: var(--k-inj-ink); opacity: 1; fill-opacity: 1; }
.thk .is-injured .ol { stroke: var(--k-inj-ink); stroke-width: 1.1; }
.thk .is-injured :is(.fib, .ten-fib, .bone-ln, .nerve-ln, .raphe) { stroke: #fff; opacity: .35; }
.thk .is-injured .hi { opacity: .12; }
.thk-halo { pointer-events: none; opacity: .5; animation: thk-pulse 1.9s ease-in-out infinite; }
.thk-halo * { fill: var(--injured) !important; stroke: var(--injured) !important; stroke-width: 5px !important; opacity: 1 !important; fill-opacity: 1 !important; }
/* open texture lines must not be force-filled in the glow copy (they would fill into wedges on curved parts) */
.thk .thk-halo :is(.fib, .fib-l, .ten-fib, .bone-ln, .nerve-ln, .seam, .raphe, .hi, .shade, .rim, .rimc, .rim-t, .ghost, .crack) { display: none !important; }
@keyframes thk-pulse { 0%, 100% { opacity: .22; } 50% { opacity: .8; } }
/* focal lesion (Part zone prop): the injured part itself light red without glow, only its lesion zone full red with the
   glow and pulse — a stress-fracture crack, one stretch of a tendon (see lesionsOf) */
.thk .is-injured .thk-zrest :is(.mus, .cutf) { fill: var(--k-zmus); stroke: var(--k-zink); }
.thk .is-injured .thk-zrest :is(.ten, .lig, .cap, .fascia, .fascia-t) { fill: var(--k-zten); stroke: var(--k-zink); fill-opacity: 1; }
.thk .is-injured .thk-zrest :is(.bone, .bone-t) { fill: var(--k-zbone); stroke: var(--k-zink); fill-opacity: 1; }
.thk .is-injured .thk-zrest .ol { stroke: var(--k-zink); stroke-width: 1; }
.thk .is-injured .thk-zrest :is(.fib, .ten-fib, .bone-ln, .raphe) { stroke: var(--k-zink); opacity: .3; }
.thk .is-injured .thk-zrest .fib-l { opacity: .12; }
.thk .is-injured .thk-zrest .hi { opacity: var(--k-hi-o); }
.thk .crack { fill: none; stroke: #fff; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; opacity: .92; }
.thk .is-involved .mus { fill: color-mix(in srgb, var(--muscle) 72%, var(--k-amber)); }
.thk .is-involved .ol { stroke: var(--k-amber); stroke-width: 1.7; }
.thk .is-involved :is(.bone, .bone-t, .cart, .labrum) { fill: color-mix(in srgb, var(--bone) 70%, var(--k-amber)); stroke: var(--k-amber); stroke-width: 1.7; }
.thk .is-involved :is(.ten, .lig, .cap, .fascia, .fascia-t) { fill: color-mix(in srgb, var(--tendon) 62%, var(--k-amber)); stroke: var(--k-amber); stroke-width: 1.5; fill-opacity: 1; }
.thk .is-involved :is(.bursa, .nerve) { stroke: var(--k-amber); stroke-width: 1.8; }
.thk .is-muscle .mus { fill: var(--k-vivid); }
.thk .is-muscle .ol { stroke: color-mix(in srgb, var(--k-vivid) 60%, #000); stroke-width: 1.1; }
.thk .is-selected :is(.ol, .bone, .bone-t, .ten, .lig, .cap, .bursa, .cart, .labrum, .fascia, .fascia-t, .nerve) { stroke: var(--text); stroke-width: 2.2; }
.thk-part:focus-visible :is(.ol, .bone, .ten, .lig, .bursa, .cart, .labrum, .cap, .fascia, .fascia-t, .nerve) { stroke: var(--accent); stroke-width: 2.4; }

/* labels */
.thk-lab { cursor: default; }
.thk-lab[role="button"] { cursor: pointer; }
.thk-lab text { font-size: 13.25px; font-weight: 500; fill: var(--text-2); paint-order: stroke; stroke: var(--surface);
  stroke-width: 3.2px; stroke-linejoin: round; }
.thk-lab .ld { fill: none; stroke: var(--text-2); stroke-width: .75; opacity: .65; }
.thk-lab .ldot { fill: var(--text-2); opacity: .85; }
.thk-lab .lhit { fill: transparent; }
/* context names and the names of faded parts stay readable (≥ 4.5:1): the shapes fade, the names only turn lighter */
.thk-lab.is-ctx text, .thk-lab.is-dim text { fill: var(--text-3); font-weight: 400; }
.thk-lab.is-hl text { fill: var(--text); font-weight: 700; }
.thk-lab.is-injured text { fill: var(--injured); }
.thk-lab.is-injured :is(.ld, .ldot) { stroke: var(--injured); fill: var(--injured); opacity: 1; }
.thk-lab.is-injured .ld { fill: none; }
/* the rest of an injured part whose lesion zone is drawn (Lab \`zone\`, Frame \`zoned\`): muted red, regular weight */
.thk-lab.is-zrest text { fill: color-mix(in srgb, var(--injured) 62%, var(--text-2)); font-weight: 500; }
.thk-lab.is-zrest :is(.ld, .ldot) { stroke: color-mix(in srgb, var(--injured) 62%, var(--text-2)); fill: color-mix(in srgb, var(--injured) 62%, var(--text-2)); opacity: .75; }
.thk-lab.is-zrest .ld { fill: none; }
.thk-lab.is-involved text { fill: color-mix(in srgb, var(--k-amber) 62%, var(--text)); }
.thk-lab.is-involved :is(.ld, .ldot) { stroke: var(--k-amber); fill: var(--k-amber); opacity: 1; }
.thk-lab.is-involved .ld { fill: none; }
.thk-lab.is-dim :is(.ld, .ldot) { opacity: .3; }

/* pain-spot hotspots */
/* same marker as the upper-body kit (shoulder.tsx): white-ringed dot that reads on red muscle and grey bone in both themes */
.thk-spot { cursor: pointer; outline: none; }
.thk-spot .s-hit { fill: transparent; }
.thk-spot .s-ring { fill: var(--accent); opacity: .3; transform-box: fill-box; transform-origin: center; animation: thk-ring 2.2s ease-out infinite; }
.thk-spot .s-sh { fill: #000; opacity: .22; }
.thk-spot .s-dot { fill: var(--accent); stroke: #fff; stroke-width: 2.6; }
.thk-spot .s-core { fill: #fff; opacity: .55; }
.thk-spot .s-sel { fill: none; stroke: var(--injured); stroke-width: 2.2; }
.thk-spot.is-sel .s-dot { fill: var(--injured); stroke: #fff; }
.thk-spot.is-sel .s-core { fill: #fff; opacity: .9; }
.thk-spot.is-sel .s-ring { fill: var(--injured); opacity: .35; }
.thk-spot:focus-visible .s-sel, .thk-spot:focus-visible .s-dot { stroke: var(--text); }
@keyframes thk-ring { 0% { transform: scale(.55); opacity: .5; } 80%, 100% { transform: scale(1.5); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .thk-halo { animation: none; opacity: .55; }
  .thk-spot .s-ring { animation: none; opacity: .2; transform: none; }
  .thk-part, .thk-ctx { transition: none; }
}
`;

/* ═════════════════════════════════════ React kit ═════════════════════════════════════ */

const NAME = new Map<string, string>([
  ...MUSCLES.map((m) => [m.id, m.ja] as [string, string]),
  ...STRUCTURES.map((s) => [s.id, s.ja] as [string, string]),
]);
const SPOT_NAME = new Map<string, string>(PAIN_SPOTS.map((s) => [s.id, s.ja] as [string, string]));
export const partName = (id: PartId) => NAME.get(id) ?? id;

/**
 * Focal lesions: where IN an injured part the damage sits, when that place is the message — the same zones as the 3D
 * condition scenes (src/three/scenes.ts `zones`). The part is then drawn light red and only the zone full red with the
 * glow (Part `zone`); the label that names the zone (Lab `zone`) is the red one, the part's other labels take the
 * lighter style of the rest of the part. The condition page passes its condition (RegionDiagramProps.condition) and the
 * zones come from CONDITION_LESIONS; without one (older callers) they are inferred from the highlight set by lesionsOf,
 * whose rules match exactly one condition each:
 *   'achilles-mid'        Achilles tendon injured, no retrocalcaneal bursa → 2–6 cm above the insertion (achilles-midportion)
 *   'achilles-insertion'  Achilles tendon injured with the retrocalcaneal bursa → where it meets the heel bone (achilles-insertional)
 *   'tibia-stress'        tibia injured → one point, posteromedial distal third (tibial-stress-fracture; MTSS keeps it 'involved')
 *   'metatarsal-stress'   metatarsals injured → 2nd / 3rd shaft–neck (metatarsal-stress-fracture; Morton's keeps them 'involved')
 *   'plantar-origin'      plantar fascia injured → its origin on the heel bone (plantar-heel-pain)
 *   'calf-strain'         gastrocnemius AND soleus injured → lower end of the medial head + lower half of the soleus
 *                         (calf-strain; muscle-cramps has only the gastrocnemius red: the whole muscle cramps)
 */
export type Lesion = 'achilles-mid' | 'achilles-insertion' | 'tibia-stress' | 'metatarsal-stress' | 'plantar-origin' | 'calf-strain';

/** The focal lesions of each condition that has one; any other condition draws its injured parts whole. */
export const CONDITION_LESIONS: Partial<Record<ConditionId, readonly Lesion[]>> = {
  'achilles-midportion': ['achilles-mid'],
  'achilles-insertional': ['achilles-insertion'],
  'tibial-stress-fracture': ['tibia-stress'],
  'metatarsal-stress-fracture': ['metatarsal-stress'],
  'plantar-heel-pain': ['plantar-origin'],
  'calf-strain': ['calf-strain'],
};

/** Fallback when no condition is given: the lesion read from the highlight set. */
export function lesionsOf(hl: Highlights): ReadonlySet<Lesion> {
  const s = new Set<Lesion>();
  if (hl['achilles-tendon'] === 'injured') s.add(hl['retrocalcaneal-bursa'] ? 'achilles-insertion' : 'achilles-mid');
  if (hl.tibia === 'injured') s.add('tibia-stress');
  if (hl.metatarsals === 'injured') s.add('metatarsal-stress');
  if (hl['plantar-fascia'] === 'injured') s.add('plantar-origin');
  if (hl.gastrocnemius === 'injured' && hl.soleus === 'injured') s.add('calf-strain');
  return s;
}

export interface Ctx {
  uid: string;
  hl: Highlights;
  dim: boolean;
  onPart?: (id: PartId) => void;
  /** focal lesions of the shown condition (CONDITION_LESIONS) or highlight set (lesionsOf) */
  les: ReadonlySet<Lesion>;
  /** the left side: the Frame mirrors the drawing (see ./mirror) */
  mir: boolean;
}

export function useCtx(p: RegionDiagramProps): Ctx {
  const raw = useId();
  const uid = `thk${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  const hl = p.highlights ?? {};
  const les = p.condition ? new Set(CONDITION_LESIONS[p.condition] ?? []) : lesionsOf(hl);
  return { uid, hl, dim: !!p.dimOthers && Object.keys(hl).length > 0, onPart: p.onPartSelect, les, mir: p.side === 'left' };
}

const keyAct = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

/**
 * A tappable anatomical part (muscle / structure) carrying data-part="<id>". `zone`: the focal lesion inside it (drawn
 * with the same classes as the part, e.g. a stretch of tendon, a crack) — when the part is injured and a zone is given,
 * the part is drawn light red and only the zone full red with the glow.
 */
export function Part({ k, id, zone, zoned: elsewhere = false, children }: { k: Ctx; id: PartId; zone?: ReactNode; zoned?: boolean; children: ReactNode }) {
  const role = k.hl[id];
  // `zoned` without a zone: the lesion is drawn by a <Lesion> further up the drawing order (over other parts)
  const zoned = role === 'injured' && (!!zone || elsewhere);
  const cls = `thk-part${role ? ` is-${role}` : ''}${zoned ? ' is-zoned' : ''}${k.dim && !role ? ' is-dim' : ''}`;
  const on = k.onPart;
  return (
    <g
      data-part={id}
      className={cls}
      role={on ? 'button' : undefined}
      tabIndex={on ? 0 : undefined}
      aria-label={on ? partName(id) : undefined}
      onClick={on ? () => on(id) : undefined}
      onKeyDown={on ? keyAct(() => on(id)) : undefined}
    >
      <title>{partName(id)}</title>
      {zoned ? (
        <>
          {!!zone && (
            <g className="thk-halo" filter={`url(#${k.uid}-glow)`} aria-hidden="true">
              {zone}
            </g>
          )}
          <g className="thk-zrest">{children}</g>
          {!!zone && <g className="thk-zone">{zone}</g>}
        </>
      ) : (
        <>
          {role === 'injured' && (
            <g className="thk-halo" filter={`url(#${k.uid}-glow)`} aria-hidden="true">
              {children}
            </g>
          )}
          {children}
        </>
      )}
    </g>
  );
}

/**
 * The focal lesion of an injured part drawn on a layer of its own, above parts drawn after that part (e.g. a crack in
 * the tibia over the periosteum strip of the medial border). Pair it with <Part zoned>. Not tappable.
 */
export function Lesion({ k, id, children }: { k: Ctx; id: PartId; children: ReactNode }) {
  if (k.hl[id] !== 'injured') return null;
  return (
    <g data-part={id} className="thk-part is-injured is-zoned thk-lesion" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <g className="thk-halo" filter={`url(#${k.uid}-glow)`}>
        {children}
      </g>
      <g className="thk-zone">{children}</g>
    </g>
  );
}

/** Non-interactive context drawing (unregistered bones / muscles, body outline). Fades with dimOthers. */
export function Ctxt({ k, children }: { k: Ctx; children: ReactNode }) {
  return (
    <g className={`thk-ctx${k.dim ? ' is-dim' : ''}`} aria-hidden="true">
      {children}
    </g>
  );
}

/** Draw pre-computed muscle geometry. `ctx` = muted context muscle (not in the registry). */
export function M({ g, ctx = false }: { g: MuscleGeo; ctx?: boolean }) {
  if (ctx) {
    return (
      <>
        {g.ten.map((d, i) => (
          <path key={i} className="ten" d={d} />
        ))}
        <path className="mus-ctx" d={g.body} />
        <path className="fib-ctx" d={g.fib} />
      </>
    );
  }
  return (
    <>
      {g.ten.map((d, i) => (
        <path key={i} className="ten" d={d} />
      ))}
      {g.tenFib && <path className="ten-fib" d={g.tenFib} />}
      <path className="mus" d={g.body} />
      <path className="hi" d={g.hi} />
      <path className="shade" d={g.shade} />
      <path className="fib" d={g.fib} />
      <path className="fib-l" d={g.fibL} />
      {g.seam && <path className="seam" d={g.seam} />}
      {g.raphe && <path className="raphe" d={g.raphe} />}
      <path className="ol" d={g.body} />
    </>
  );
}

/** Tendon / ligament band with longitudinal texture lines. */
export function Ten({ c, w, cls = 'ten', lines = 3 }: { c: readonly P[]; w: Num; cls?: string; lines?: number }) {
  const d = tube(c, w);
  let tex = '';
  for (let i = 0; i < lines; i++) {
    const f = (i + 1) / (lines + 1) - 0.5;
    const pts: XY[] = [];
    for (let j = 0; j <= 14; j++) {
      const u = 0.04 + (0.92 * j) / 14;
      const a = crAt(c, Math.max(0, u - 0.01));
      const b = crAt(c, Math.min(1, u + 0.01));
      const m = crAt(c, u);
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const h = numAt(w, u, 4) * f * 0.9;
      pts.push([m[0] - (dy / len) * h, m[1] + (dx / len) * h]);
    }
    tex += line(pts);
  }
  return (
    <>
      <path className={cls} d={d} />
      <path className="ten-fib" d={tex} />
    </>
  );
}

/** Nerve: yellow tube with fascicle lines. */
export function Nerve({ c, w }: { c: readonly P[]; w: Num }) {
  const d = tube(c, w, 30, 0.4);
  let tex = '';
  for (const f of [-0.22, 0.05, 0.28]) {
    const pts: XY[] = [];
    for (let j = 0; j <= 16; j++) {
      const u = 0.03 + (0.94 * j) / 16;
      const a = crAt(c, Math.max(0, u - 0.01));
      const b = crAt(c, Math.min(1, u + 0.01));
      const m = crAt(c, u);
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const h = numAt(w, u, 4) * f;
      pts.push([m[0] - (dy / len) * h, m[1] + (dx / len) * h]);
    }
    tex += line(pts);
  }
  return (
    <>
      <path className="nerve" d={d} />
      <path className="nerve-ln" d={tex} />
    </>
  );
}

export interface Lab {
  /** part this label names (tap → onPartSelect); omit for context labels */
  id?: PartId;
  t: string;
  /** anchor point on the structure */
  at: readonly number[];
  /** text position (baseline of the first line) */
  x: number;
  y: number;
  a?: 'start' | 'end' | 'middle';
  /** optional elbow point of the leader line */
  via?: readonly number[];
  /**
   * this label names the focal lesion zone of its part (see lesionsOf): it stays red and bold, while the part's other
   * labels (in a view that lists the part in Frame `zoned`) take the lighter style of the rest of the part
   */
  zone?: boolean;
}

export interface Spot {
  id: PainSpotId;
  at: readonly number[];
}

const FS = 13.25; // label font size in user units (≥ 11 CSS px on a 360 px phone, ≈ 12.2 px at 390)
const LH = 15.25;

function Label({ k, l, zoned }: { k: Ctx; l: Lab; zoned?: ReadonlySet<PartId> }) {
  const lines = l.t.split('\n');
  const a = l.a ?? 'start';
  const role = l.id ? k.hl[l.id] : undefined;
  // the rest of an injured part whose lesion zone is drawn: lighter style, the zone's own label is the red one
  const rest = role === 'injured' && !l.zone && !!l.id && !!zoned?.has(l.id);
  const cls = `thk-lab${!l.id ? ' is-ctx' : ''}${role ? (rest ? ' is-hl is-zrest' : ` is-hl is-${role}`) : ''}${k.dim && !role ? ' is-dim' : ''}`;
  const w = Math.max(...lines.map((s) => [...s].length)) * FS;
  const h = lines.length * LH;
  const midY = l.y - 4.5 + ((lines.length - 1) * LH) / 2;
  const tip =
    a === 'end'
      ? [l.x + 3, midY]
      : a === 'start'
        ? [l.x - 3, midY]
        : l.at[1] < l.y
          ? [l.x, l.y - FS]
          : [l.x, l.y + 4 + (lines.length - 1) * LH];
  const x0 = a === 'end' ? l.x - w : a === 'start' ? l.x : l.x - w / 2;
  const on = l.id && k.onPart ? k.onPart : undefined;
  const id = l.id;
  return (
    <g
      className={cls}
      onClick={on && id ? () => on(id) : undefined}
      role={on ? 'button' : undefined}
      aria-hidden={on ? undefined : 'true'}
      aria-label={on && id ? partName(id) : undefined}
    >
      <path className="ld" d={l.via ? `M${xy(l.at)}L${xy(l.via)}L${xy(tip)}` : `M${xy(l.at)}L${xy(tip)}`} />
      <circle className="ldot" cx={l.at[0]} cy={l.at[1]} r={1.6} />
      <rect className="lhit" x={x0 - 3} y={l.y - FS} width={w + 6} height={h + 3} />
      <text x={l.x} y={l.y} textAnchor={a}>
        {lines.map((s, i) => (
          <tspan key={i} x={l.x} dy={i ? LH : 0}>
            {s}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/** A hotspot; without `onSel` only a marker of the picked place (not tappable, not focusable, aria-hidden). */
function SpotMark({ s, sel, onSel }: { s: Spot; sel: boolean; onSel?: (id: PainSpotId) => void }) {
  const name = SPOT_NAME.get(s.id) ?? s.id;
  const act = onSel ? () => onSel(s.id) : undefined;
  return (
    <g
      data-spot={s.id}
      className={`thk-spot${sel ? ' is-sel' : ''}`}
      transform={`translate(${r1(s.at[0])} ${r1(s.at[1])})`}
      role={act ? 'button' : undefined}
      tabIndex={act ? 0 : undefined}
      aria-label={act ? `痛む場所: ${name}` : undefined}
      aria-pressed={act ? sel : undefined}
      onClick={act}
      onKeyDown={act ? keyAct(act) : undefined}
      aria-hidden={act ? undefined : 'true'}
      pointerEvents={act ? undefined : 'none'}
    >
      {act && <title>{name}</title>}
      {act && <circle className="s-hit" r={24} />}
      <circle className="s-ring" r={sel ? 15 : 12} />
      {sel && <circle className="s-sel" r={12.5} />}
      <circle className="s-sh" cx={0.6} cy={1.2} r={sel ? 8.6 : 7.6} />
      <circle className="s-dot" r={sel ? 8 : 7} />
      <circle className="s-core" r={sel ? 2.8 : 2} />
    </g>
  );
}

export interface FrameProps {
  k: Ctx;
  p: RegionDiagramProps;
  w: number;
  h: number;
  title: string;
  /** small orientation captions [top-left, top-right] */
  cap?: [string, string];
  labels: Lab[];
  spots: Spot[];
  children: ReactNode;
  /** drawn above the anatomy but below labels (insets) */
  overlay?: ReactNode;
  /** extra <defs> (cut-away masks…) */
  defs?: ReactNode;
  /** soft fade-out of the cropped limb at the top / bottom edge (user units) */
  fade?: { top?: number; bottom?: number };
  /** 起始 / 停止 markers per muscle (drawn for the 'selected' one, with a legend strip under the drawing) */
  oi?: OIMap;
  /**
   * injured parts this view draws with their focal lesion zone (Part `zone` / `zoned` under the current lesions): their
   * labels without `zone` take the lighter style of the rest of the part
   */
  zoned?: readonly (PartId | false | null | undefined)[];
}

/**
 * Root <svg> of a region diagram: styles, glow filter, drawing, labels, hotspots. For the left side (`k.mir`) the
 * drawing is mirrored and the texts stay readable (see ./mirror).
 */
export function Frame({ k, p, w, h, title: title0, cap: cap0, labels: labels0, spots: spots0, children, overlay, defs, fade, oi, zoned: zoned0 }: FrameProps) {
  const showLabels = p.showLabels ?? true;
  const ft = fade?.top ?? 0;
  const fb = fade?.bottom ?? 0;
  const hasFade = ft > 0 || fb > 0;
  const dots = oiDots(oi, k.hl);
  const mir = k.mir;
  const title = mir ? flipLR(title0) : title0;
  // left side: the corner captions swap corners (and say 左), labels and hotspots move to the mirrored places
  const cap: [string, string] | undefined = cap0 && mir ? [flipLR(cap0[1]), flipLR(cap0[0])] : cap0;
  const labels = mir ? labels0.map((l) => mirrorLab(l, w)) : labels0;
  const placed = mir ? spots0.map((s) => ({ ...s, at: [w - s.at[0], s.at[1]] })) : spots0;
  // nothing to tap (no onSpotSelect): only the selected spot, as a marker of the picked place. (The limbs drawn with
  // this kit have no midline: RegionDiagramProps.spotSide leaves their hotspots in place.)
  const spots = p.onSpotSelect ? placed : placed.filter((s) => s.id === p.selectedSpot);
  const zoned = zoned0?.some(Boolean) ? new Set(zoned0.filter((z): z is PartId => !!z)) : undefined;
  return (
    <svg
      viewBox={`0 0 ${w} ${dots.length ? h + OI_LEG_H : h}`}
      className={`thk${p.className ? ` ${p.className}` : ''}`}
      role="group"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <style>{KIT_CSS}</style>
      {dots.length > 0 && <style>{OI_CSS}</style>}
      <defs>
        <filter id={`${k.uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        {hasFade && (
          <>
            <linearGradient id={`${k.uid}-fg`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={h}>
              <stop offset="0" stopColor="#fff" stopOpacity={ft > 0 ? 0 : 1} />
              {ft > 0 && <stop offset={ft / h} stopColor="#fff" stopOpacity="1" />}
              {fb > 0 && <stop offset={1 - fb / h} stopColor="#fff" stopOpacity="1" />}
              <stop offset="1" stopColor="#fff" stopOpacity={fb > 0 ? 0 : 1} />
            </linearGradient>
            <mask id={`${k.uid}-fade`} maskUnits="userSpaceOnUse" x="-20" y="-20" width={w + 40} height={h + 40}>
              <rect x="-20" y="-20" width={w + 40} height={h + 40} fill={`url(#${k.uid}-fg)`} />
            </mask>
          </>
        )}
        {defs}
      </defs>
      <MirrorG mir={mir} w={w}>
        <g mask={hasFade ? `url(#${k.uid}-fade)` : undefined}>{children}</g>
        {overlay}
        <OIMarks dots={dots} />
      </MirrorG>
      {dots.length > 0 && <OILegend w={w} y={h} dots={dots} className="note-t" />}
      {cap && (
        <g aria-hidden="true">
          <text className="cap-t" x={8} y={14}>
            {cap[0]}
          </text>
          <text className="cap-t" x={w - 8} y={14} textAnchor="end">
            {cap[1]}
          </text>
        </g>
      )}
      {showLabels && (
        <g className="thk-labels">
          {labels.map((l, i) => (
            <Label key={i} k={k} l={l} zoned={zoned} />
          ))}
        </g>
      )}
      {p.showSpots && (
        <g className="thk-spots">
          {spots.map((s) => (
            <SpotMark key={s.id} s={s} sel={p.selectedSpot === s.id} onSel={p.onSpotSelect} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** Circular magnifier inset (e.g. a joint cross-section). Children are clipped to the circle. */
export function Inset({ k, name, cx, cy, r, title, children }: { k: Ctx; name: string; cx: number; cy: number; r: number; title?: string; children: ReactNode }) {
  const id = `${k.uid}-in-${name}`;
  return (
    <g className="thk-inset">
      <defs>
        <clipPath id={id}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle className="inset-bg" cx={cx} cy={cy} r={r} />
      <g clipPath={`url(#${id})`}>{children}</g>
      <circle className="inset-ring" cx={cx} cy={cy} r={r} />
      {title && (
        <MText mir={k.mir} className="cap-t" x={cx} y={cy + r + 16} a="middle">
          {title}
        </MText>
      )}
    </g>
  );
}

/** A cut-away window mask: white everywhere except the hole `d`. Put it in Frame `defs`. */
export function HoleMask({ id, d, w, h }: { id: string; d: string; w: number; h: number }) {
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x="-20" y="-20" width={w + 40} height={h + 40}>
      <rect x="-20" y="-20" width={w + 40} height={h + 40} fill="#fff" />
      <path d={d} fill="#000" />
    </mask>
  );
}

/* ═════════════════════════════════════ HIP ═════════════════════════════════════ */

const W = 360;
const H = 470;

/** Mirror a point list across x = mx (for the opposite half of the pelvis). */
const mirror = (pts: readonly P[], mx: number): P[] => pts.map((q) => (q[2] ? [2 * mx - q[0], q[1], 1] : [2 * mx - q[0], q[1]]) as P);
/** Points on a circular arc (degrees, screen coordinates: 0° = +x, 90° = +y). */
export const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 8): XY[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as XY;
  });
/** Closed crescent between radii r0 < r1 over an arc. */
export const crescent = (cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) =>
  sp([...arc(cx, cy, r1, a0, a1, 10).map((p, i, a) => (i === 0 || i === a.length - 1 ? [p[0], p[1], 1] : p) as P), ...arc(cx, cy, r0, a1, a0, 10).map((p, i, a) => (i === 0 || i === a.length - 1 ? [p[0], p[1], 1] : p) as P)]);

/* ───────────── front view: right hip from the front (midline at the viewer's right) ───────────── */
const MXF = 302; // midline
const HCF: XY = [210, 178]; // femoral head centre

const FR = once(() => ({
  body: sp([[152, -10], [146, 40], [130, 100], [114, 158], [110, 200], [113, 260], [118, 330], [124, 400], [131, 480], [370, 480], [370, -10]]),
  l5: sp([[278, 30, 1], [326, 30, 1], [329, 64], [302, 68], [275, 64]]),
  l5tp: sp([[279, 40], [262, 42], [248, 46], [246, 54], [262, 56], [279, 56]]),
  l4: sp([[279, -20, 1], [325, -20, 1], [327, 22], [302, 25], [277, 22]]),
  disc: sp([[278, 23], [302, 26], [326, 23], [327, 30], [302, 31], [277, 30]]),
  sacrum: (() => {
    const r: P[] = [[302, 76, 1], [288, 73], [272, 75], [262, 82], [261, 104], [265, 132], [273, 158], [284, 184], [293, 202], [302, 213, 1]];
    return sp([...r, ...mirror(r, MXF).reverse().slice(1, -1)]);
  })(),
  sacrumLn: [104, 126, 148, 168].map((y, i) => ell(286 + i * 2.2, y, 4.2 - i * 0.4, 3.3 - i * 0.2) + ell(318 - i * 2.2, y, 4.2 - i * 0.4, 3.3 - i * 0.2)).join(''),
  coccyx: sp([[296, 214], [308, 214], [306, 226], [303, 236], [301, 236], [298, 226]]),
}));

/** Right hemipelvis, front (outer contour) + obturator foramen (hole). */
const PELVIS_F: P[] = [
  [302, 191, 1], [292, 186], [282, 186], [276, 189], [266, 188], [252, 184], [238, 177], [229, 168], [235, 150], [243, 128],
  [251, 108], [259, 92], [266, 82, 1], [259, 66], [242, 54], [218, 47], [192, 49], [170, 57], [156, 71], [157, 89], [167, 106],
  [176, 117, 1], [176, 128], [182, 136], [186, 143], [183, 151], [185, 160], [190, 176], [200, 196], [212, 214], [220, 236],
  [226, 254], [236, 264], [250, 262], [264, 254], [280, 246], [294, 242], [302, 240, 1],
];
const OBT_F: P[] = [[246, 205], [262, 200], [278, 206], [282, 222], [274, 239], [258, 244], [241, 238], [233, 222]];
const pelvisF = once(() => sp(PELVIS_F) + sp(OBT_F));
const pelvisFL = once(() => sp(mirror(PELVIS_F, MXF)) + sp(mirror(OBT_F, MXF)));

const FEMUR_F = once(() => sp([
  [156, 163], [172, 165], [192, 160], [210, 153], [228, 160], [235, 178], [229, 196], [214, 203], [203, 209], [194, 222], [192, 231],
  [196, 238, 1], [186, 250], [177, 259], [172, 282], [172, 340], [177, 400], [184, 480], [152, 480], [145, 400], [138, 340], [132, 282],
  [128, 232], [122, 212], [119, 195], [123, 178], [134, 166], [146, 161],
]));
const HEAD_F = once(() => ell(HCF[0], HCF[1], 25, 25));
const CAPSULE_F = once(() => sp([[186, 150], [168, 158], [150, 168], [144, 184], [152, 208], [176, 236], [196, 236], [222, 210], [236, 190], [238, 162], [228, 150], [210, 146]]));
const LABRUM_F = once(() => crescent(HCF[0], HCF[1], 24.5, 29, 185, 300));

const FM = once(() => ({
  gmed: muscle({
    r: [
      [[181, 100], [170, 84], [160, 73], [151, 76]],
      [[170, 130], [151, 124], [134, 126], [121, 140]],
      [[154, 171], [146, 172], [138, 172], [129, 170]],
    ],
    t1: 0.84,
    n: 9,
  }),
  iliacus: muscle({
    r: [
      [[182, 112], [172, 95], [167, 77], [177, 63], [196, 56], [219, 54], [240, 59], [254, 70], [260, 86]],
      [[188, 140], [199, 137], [212, 136], [225, 137], [236, 140]],
      [[190, 196], [198, 197], [206, 196], [213, 193], [219, 190]],
      [[190, 234], [192, 236], [194, 238], [196, 239], [198, 240]],
    ],
    t1: 0.9,
    n: 13,
  }),
  psoas: muscle({
    r: [
      [[251, -20], [279, -18]],
      [[248, 40], [278, 46]],
      [[240, 100], [267, 108]],
      [[226, 156], [251, 162]],
      [[212, 200], [233, 206]],
      [[196, 238], [203, 243]],
    ],
    t1: 0.84,
    n: 8,
  }),
  pect: muscle({
    r: [
      [[230, 182], [244, 186], [258, 190], [272, 193]],
      [[198, 246], [199, 256], [200, 266], [201, 276]],
    ],
    n: 6,
  }),
  amag: muscle({
    r: [
      [[262, 256], [277, 250], [292, 246]],
      [[214, 340], [256, 346], [292, 346]],
      [[205, 480], [250, 490], [290, 490]],
    ],
    n: 9,
  }),
  alon: muscle({
    r: [
      [[277, 196], [286, 201]],
      [[247, 252], [281, 268]],
      [[210, 320], [266, 352]],
      [[200, 360], [232, 480]],
    ],
    t0: 0.1,
    n: 10,
  }),
  grac: muscle({
    r: [
      [[284, 228], [300, 214]],
      [[280, 290], [299, 290]],
      [[282, 380], [298, 382]],
      [[285, 480], [297, 480]],
    ],
    t0: 0.05,
    n: 4,
  }),
  vl: muscle({
    r: [
      [[127, 188], [123, 250], [126, 320], [132, 390], [140, 480]],
      [[172, 232], [177, 310], [181, 390], [185, 470], [189, 550]],
    ],
    n: 12,
  }),
  rf: muscle({
    r: [
      [[181, 142], [189, 145]],
      [[178, 204], [197, 206]],
      [[175, 282], [214, 284]],
      [[177, 380], [219, 382]],
      [[185, 490], [219, 490]],
    ],
    t0: 0.13,
    n: 13,
    pen: 'bi',
    penD: 0.09,
  }),
  tfl: muscle({
    r: [
      [[162, 96], [171, 106], [179, 118]],
      [[139, 160], [155, 166], [170, 172]],
      [[131, 232], [142, 238], [152, 244]],
    ],
    n: 8,
  }),
  sart: muscle({
    r: [
      [[172, 114], [180, 119]],
      [[176, 140], [193, 134]],
      [[199, 197], [221, 189]],
      [[225, 265], [249, 258]],
      [[237, 345], [265, 342]],
      [[241, 490], [269, 492]],
    ],
    t0: 0.05,
    n: 6,
  }),
  ra: muscle({
    r: [
      [[269, 126], [299, 128]],
      [[273, 156], [300, 158]],
      [[279, 184], [299, 187]],
    ],
    t1: 0.8,
    n: 6,
  }),
}));
const ITB_F: P[] = [[126, 150], [127, 200], [130, 250], [133, 305], [136, 360], [140, 420], [146, 480]];
const INGUINAL_F: P[] = [[176, 118], [202, 141], [231, 163], [258, 181], [277, 191]];
const RA_CUT = once(() => ell(284, 127, 15.4, 3.1, 3.5));

/** Hip-joint cross-section (coronal, seen from the front; lateral = left), local coords around the inset centre. */
function hipSection(c: XY) {
  const t = (q: readonly number[]): P => (q[2] ? [c[0] + q[0], c[1] + q[1], 1] : [c[0] + q[0], c[1] + q[1]]);
  const T = (qs: readonly (readonly number[])[]) => qs.map(t);
  const h: XY = [c[0] + 10, c[1] + 2];
  const R = 14.5;
  return {
    h,
    pelvis: sp(
      T([
        [-34, -62], [-24, -40], [-16, -24], [-12, -11], [-8.1, -3.9, 1],
        ...arc(10, 2, 19, 198, 350, 12),
        [30, 8], [31, 15], [38, 20], [62, 20], [62, -62],
      ]),
    ),
    trab: line(T([[-26, -48], [-18, -30], [-8, -22], [8, -24], [24, -18], [34, -6], [40, 8]])),
    femur: sp(
      T([
        [-4, 5.8, 1], ...arc(10, 2, R, 165, 460, 22).slice(1, -1), [7.5, 16.3, 1],
        [0, 27], [-3, 34], [2, 40], [-6, 46], [-13, 60], [-15, 76], [-46, 76], [-48, 50], [-48, 26], [-46, 10], [-38, 0], [-31, 2],
        [-26, 12], [-17, 13],
      ]),
    ),
    femLn: line(T([[-22, 16], [-14, 24], [-8, 38]])) + line(T([[-40, 20], [-36, 40], [-32, 66]])),
    cartA: crescent(h[0], h[1], 17, 19, 202, 340),
    cartH: crescent(h[0], h[1], R, 16.3, 172, 392),
    labrum: sp(T([[-13, -11, 1], [-7.6, -5.4, 1], [-9.6, 5.4, 1], [-13.6, -1]])),
    capL: tube(T([[-15.5, -12], [-17.5, -2], [-21, 7], [-27, 14]]), 3.6),
    capM: tube(T([[33, 18], [22, 26], [10, 31], [-2, 37]]), 3.6),
  };
}
/** what the hip views show uncropped (top / bottom fades) */
const BOX_HIP = [4, 24, 356, 420] as const;
/** 起始 / 停止 markers (muscle page): the sheet ends inside the view; see oiFrom. */
const OI_FRONT = once((): OIMap => {
  const m = oiFrom(
    {
      'adductor-magnus': FM().amag,
      iliopsoas: [FM().iliacus, FM().psoas],
      'adductor-longus': FM().alon,
      gracilis: FM().grac,
      'vastus-lateralis': FM().vl,
      'gluteus-medius': FM().gmed,
      'rectus-femoris': FM().rf,
      'tensor-fasciae-latae': FM().tfl,
      sartorius: FM().sart,
      'rectus-abdominis': FM().ra,
    },
    BOX_HIP,
  );
  // vastus lateralis: a pennate field whose s runs ACROSS the thigh — it starts along the femur (below the greater
  // trochanter, down the linea aspera) and inserts through the quadriceps tendon on the kneecap (below these views)
  m['vastus-lateralis'] = { o: att(FM().vl, 'o', [0.04, 0.42]) };
  return m;
});

function HipFront({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const IC: XY = [54, 412];
  const IR = 46;
  const hs = hipSection(IC);
  const labels: Lab[] = [
    { id: 'asis', t: '上前腸骨棘', at: [175, 116], x: 100, y: 104, a: 'end' },
    { id: 'gluteus-medius', t: '中殿筋', at: [138, 134], x: 100, y: 142, a: 'end' },
    { id: 'tensor-fasciae-latae', t: '大腿筋膜張筋', at: [152, 184], x: 100, y: 190, a: 'end' },
    { id: 'iliotibial-band', t: '腸脛靱帯', at: [131, 252], x: 100, y: 248, a: 'end' },
    { id: 'vastus-lateralis', t: '外側広筋', at: [150, 300], x: 100, y: 292, a: 'end' },
    { id: 'rectus-femoris', t: '大腿直筋', at: [196, 326], x: 100, y: 334, a: 'end' },
    { id: 'hip-labrum', t: '関節唇', at: [IC[0] - 11, IC[1] - 2], x: IC[0] - 21, y: IC[1] - 16, a: 'middle' },
    { t: '軟骨', at: [IC[0] + 23.5, IC[1] - 9.5], x: IC[0] + 23, y: IC[1] - 23, a: 'middle' },
    { id: 'iliopsoas', t: '腸腰筋', at: [262, 36], x: 306, y: 42 },
    { id: 'rectus-abdominis', t: '腹直筋', at: [288, 146], x: 306, y: 114 },
    { id: 'pubic-symphysis', t: '恥骨結合', at: [303, 222], x: 305, y: 238 },
    { id: 'adductor-longus', t: '長内転筋', at: [263, 262], x: 306, y: 272 },
    { id: 'gracilis', t: '薄筋', at: [289, 318], x: 306, y: 316 },
    { id: 'adductor-magnus', t: '大内転筋', at: [272, 384], x: 306, y: 364 },
    { id: 'sartorius', t: '縫工筋', at: [252, 410], x: 306, y: 412 },
  ];
  const spots: Spot[] = [
    { id: 'hip-front', at: [214, 196] },
    { id: 'groin-inner', at: [279, 212] },
    { id: 'hip-outer', at: [126, 174] },
  ];
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title="右の股関節を前から見た図（左が外側、右が体の中心）"
      cap={['右脚・前から', '体の中心 →']}
      labels={labels}
      spots={spots}
      fade={{ top: 28, bottom: 46 }}
      oi={OI_FRONT()}
      overlay={
        <>
          <Ctxt k={k}>
            <circle className="inset-ln" cx={HCF[0]} cy={HCF[1]} r={31} />
            <path className="inset-ln" d={`M${xy([IC[0] + 31, IC[1] - 31])}L${xy([188, 199])}`} />
          </Ctxt>
          <Inset k={k} name="hj" cx={IC[0]} cy={IC[1]} r={IR}>
            <Ctxt k={k}>
              <path className="bone" d={hs.pelvis} />
              <path className="bone-ln" d={hs.trab} />
            </Ctxt>
            <Part k={k} id="hip-joint">
              <path className="cap" d={hs.capL} />
              <path className="cap" d={hs.capM} />
              <path className="bone" d={hs.femur} />
              <path className="bone-ln" d={hs.femLn} />
              <path className="cart" d={hs.cartH} />
              <path className="cart" d={hs.cartA} />
            </Part>
            <Part k={k} id="hip-labrum">
              <path className="labrum" d={hs.labrum} />
            </Part>
          </Inset>
          <MText mir={k.mir} className="cap-t" x={IC[0]} y={IC[1] - IR - 7} a="middle" hidden>
            股関節の断面
          </MText>
        </>
      }
    >
      <Ctxt k={k}>
        <path className="body" d={FR().body} />
        <path className="bone-g" d={FR().l4} />
        <path className="cart" d={FR().disc} />
        <path className="bone-g" d={FR().l5 + FR().l5tp + sp(mirror([[279, 40], [262, 42], [248, 46], [246, 54], [262, 56], [279, 56]], MXF))} />
        <path className="bone-g" d={FR().sacrum} />
        <path className="bone-ln" d={FR().sacrumLn} />
        <path className="bone-g" d={FR().coccyx} />
        <path className="bone-g" d={pelvisFL()} fillRule="evenodd" />
        <path className="bone" d={pelvisF()} fillRule="evenodd" />
        <path className="bone-ln" d={line([[262, 84], [266, 110], [272, 140], [282, 170], [292, 190]])} />
        <path className="bone" d={FEMUR_F()} />
      </Ctxt>
      <Part k={k} id="hip-joint">
        <path className="cap" d={CAPSULE_F()} />
        <path className="bone" d={HEAD_F()} />
      </Part>
      <Part k={k} id="hip-labrum">
        <path className="labrum" d={LABRUM_F()} />
      </Part>
      <Part k={k} id="adductor-magnus">
        <M g={FM().amag} />
      </Part>
      <Part k={k} id="iliopsoas">
        <M g={FM().iliacus} />
        <M g={FM().psoas} />
      </Part>
      <Ctxt k={k}>
        <M g={FM().pect} ctx />
      </Ctxt>
      <Part k={k} id="adductor-longus">
        <M g={FM().alon} />
      </Part>
      <Part k={k} id="gracilis">
        <M g={FM().grac} />
      </Part>
      <Part k={k} id="vastus-lateralis">
        <M g={FM().vl} />
      </Part>
      <Part k={k} id="iliotibial-band">
        <Ten c={ITB_F} w={[22, 26, 20, 15, 13, 13, 13]} cls="fascia" lines={3} />
      </Part>
      <Part k={k} id="gluteus-medius">
        <M g={FM().gmed} />
      </Part>
      <Part k={k} id="rectus-femoris">
        <M g={FM().rf} />
      </Part>
      <Part k={k} id="tensor-fasciae-latae">
        <M g={FM().tfl} />
      </Part>
      <Ctxt k={k}>
        <Ten c={INGUINAL_F} w={4} cls="lig" lines={1} />
      </Ctxt>
      <Part k={k} id="sartorius">
        <M g={FM().sart} />
      </Part>
      <Part k={k} id="rectus-abdominis">
        <M g={FM().ra} />
        <path className="cutf" d={RA_CUT()} />
      </Part>
      <Part k={k} id="pubic-symphysis">
        <path className="cart" d={sp([[299, 189, 1], [305, 189, 1], [306, 214], [305, 240, 1], [299, 240, 1], [298, 214]])} />
      </Part>
      <Part k={k} id="asis">
        <path className="bone" d={ell(176, 117, 4.2, 3.4, -30)} />
      </Part>
    </Frame>
  );
}
/* ───────────── back & deep views: right hip from behind (midline at the viewer's left) ───────────── */
const MXB = 64;

const BK = once(() => ({
  body: sp([[-20, -10], [214, -10], [222, 40], [238, 100], [254, 158], [261, 205], [258, 252], [252, 320], [246, 400], [240, 480], [-20, 480]]),
  cleft: line([[64, 150], [64.5, 200], [65, 248]]),
  fold: line([[70, 266], [100, 282], [138, 296], [176, 304]]),
  sacrum: (() => {
    const r: P[] = [[64, 84, 1], [80, 82], [98, 86], [112, 93], [116, 110], [114, 130], [108, 150], [98, 172], [86, 194], [76, 208], [70, 214], [64, 216, 1]];
    return sp([...r, ...mirror(r, MXB).reverse().slice(1, -1)]);
  })(),
  sacrumLn:
    [104, 126, 148, 168].map((y, i) => ell(MXB + 19 - i * 1.6, y, 4 - i * 0.3, 3.2) + ell(MXB - 19 + i * 1.6, y, 4 - i * 0.3, 3.2)).join('') +
    line([[64, 92], [64, 104], [64, 116], [64, 128], [64, 140], [64, 152], [64, 166]]),
  crest: [100, 122, 144, 164].map((y) => ell(MXB, y, 3.4, 5)).join(''),
  coccyx: sp([[59, 218], [69, 218], [68, 230], [64, 240], [60, 230]]),
  l5: (() => {
    const r: P[] = [[64, 26, 1], [72, 26], [80, 22], [86, 24], [88, 34], [106, 36], [116, 40], [114, 47], [98, 49], [86, 50], [78, 56], [70, 58], [68, 70], [64, 76, 1]];
    return sp([...r, ...mirror(r, MXB).reverse().slice(1, -1)]);
  })(),
}));
const PELVIS_B: P[] = [
  [108, 122, 1], [114, 102], [126, 80], [146, 62], [170, 52], [196, 53], [214, 62], [222, 78], [220, 100], [212, 124], [206, 146], [204, 162],
  [196, 178], [182, 192], [166, 204], [156, 222], [150, 242], [144, 258], [134, 265], [121, 261], [113, 249], [110, 232], [111, 214], [108, 198, 1],
  [116, 188], [119, 172], [117, 154], [110, 140], [105, 131],
];
const pelvisB = once(() => sp(PELVIS_B));
const RAMUS_B: P[] = [[124, 258], [102, 254], [82, 248], [64, 244]];
const FEMUR_B = once(() => sp([
  [160, 166], [176, 168], [196, 166], [212, 160], [224, 158, 1], [238, 164], [248, 174], [251, 192], [248, 214], [240, 232], [234, 270], [226, 330],
  [218, 400], [212, 480], [180, 480], [184, 400], [190, 330], [192, 280], [190, 256], [182, 246], [176, 238, 1], [184, 228], [192, 214], [186, 204],
  [172, 202], [158, 198], [140, 196], [134, 180], [142, 166],
]));
const HEAD_B = once(() => ell(156, 178, 25, 25));

const BM = once(() => ({
  gmed: muscle({
    r: [
      [[128, 80], [148, 64], [172, 56], [196, 57], [214, 66], [222, 82]],
      [[160, 128], [174, 118], [190, 112], [206, 110], [220, 114], [233, 124]],
      [[214, 166], [220, 164], [226, 163], [232, 162], [238, 163], [244, 166]],
    ],
    t1: 0.9,
    n: 12,
  }),
  gmax: muscle({
    r: [
      [[121, 86], [115, 108], [110, 128], [104, 150], [94, 172], [84, 194], [74, 214], [68, 232]],
      [[168, 116], [165, 142], [160, 166], [154, 192], [146, 218], [138, 244], [131, 266], [127, 284]],
      [[236, 160], [243, 182], [247, 204], [247, 226], [243, 248], [235, 268], [225, 288], [214, 305]],
    ],
    t1: [0.86, 0.88, 0.9, 0.92, 0.95, 0.99, 1, 1],
    n: 24,
    seams: [0.14, 0.28, 0.42, 0.56, 0.7, 0.84],
  }),
  bf: muscle({
    r: [
      [[118, 240], [132, 236]],
      [[134, 290], [168, 282]],
      [[150, 360], [196, 350]],
      [[162, 440], [208, 432]],
      [[170, 492], [212, 488]],
    ],
    t0: 0.1,
    n: 8,
  }),
  st: muscle({
    r: [
      [[118, 242], [130, 246]],
      [[108, 292], [140, 298]],
      [[99, 362], [137, 368]],
      [[96, 440], [131, 446]],
      [[96, 492], [127, 496]],
    ],
    t0: 0.1,
    n: 7,
  }),
  sm: muscle({
    r: [
      [[112, 248], [134, 252]],
      [[96, 300], [132, 306]],
      [[84, 380], [114, 386]],
      [[82, 460], [112, 466]],
      [[84, 500], [114, 500]],
    ],
    n: 6,
  }),
  amag: muscle({
    r: [
      [[66, 242], [92, 248], [116, 256]],
      [[64, 330], [86, 336], [110, 330]],
      [[66, 480], [90, 480], [112, 470]],
    ],
    n: 8,
  }),
  grac: muscle({
    r: [
      [[60, 250], [72, 248]],
      [[59, 330], [73, 330]],
      [[61, 480], [74, 480]],
    ],
    n: 3,
  }),
  vl: muscle({
    r: [
      [[246, 214], [243, 300], [238, 390], [234, 480]],
      [[176, 274], [182, 360], [188, 444], [192, 520]],
    ],
    n: 9,
  }),
}));
const ITB_B: P[] = [[246, 150], [250, 200], [248, 260], [244, 330], [240, 400], [236, 480]];
const ITB_BW = [20, 26, 22, 16, 14, 13];

/** 起始 / 停止 markers (muscle page): the sheet ends inside the view; see oiFrom. */
const OI_BACK = once((): OIMap => {
  const m = oiFrom(
    {
      'adductor-magnus': BM().amag,
      gracilis: BM().grac,
      semimembranosus: BM().sm,
      'vastus-lateralis': BM().vl,
      'biceps-femoris': BM().bf,
      semitendinosus: BM().st,
      'gluteus-medius': BM().gmed,
      'gluteus-maximus': BM().gmax,
    },
    BOX_HIP,
  );
  m['vastus-lateralis'] = { o: att(BM().vl, 'o', [0.04, 0.42]) };
  return m;
});

function HipBack({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { t: '仙骨', at: [84, 112], x: 58, y: 104, a: 'end' },
    { id: 'gluteus-medius', t: '中殿筋', at: [204, 86], x: 264, y: 74 },
    { id: 'gluteus-maximus', t: '大殿筋', at: [186, 196], x: 264, y: 140 },
    { id: 'iliotibial-band', t: '腸脛靱帯', at: [247, 300], x: 264, y: 290 },
    { id: 'vastus-lateralis', t: '外側広筋', at: [222, 392], x: 264, y: 372 },
    { id: 'biceps-femoris', t: '大腿二頭筋', at: [178, 400], x: 264, y: 418 },
    { id: 'gracilis', t: '薄筋', at: [66, 300], x: 58, y: 292, a: 'end' },
    { id: 'adductor-magnus', t: '大内転筋', at: [78, 344], x: 58, y: 334, a: 'end' },
    { id: 'semitendinosus', t: '半腱様筋', at: [116, 372], x: 58, y: 376, a: 'end' },
    { id: 'semimembranosus', t: '半膜様筋', at: [96, 428], x: 58, y: 418, a: 'end' },
  ];
  const spots: Spot[] = [
    { id: 'buttock-deep', at: [150, 166] },
    { id: 'sit-bone', at: [126, 238] },
    { id: 'hip-outer', at: [246, 180] },
  ];
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title="右のお尻と股関節を後ろから見た図（左が体の中心、右が外側）"
      cap={['← 体の中心', '右のお尻・後ろから']}
      labels={labels}
      spots={spots}
      fade={{ top: 20, bottom: 46 }}
      oi={OI_BACK()}
    >
      <Ctxt k={k}>
        <path className="body" d={BK().body} />
        <path className="bone-g" d={BK().l5} />
        <path className="bone-g" d={sp(mirror(PELVIS_B, MXB))} />
        <path className="bone" d={BK().sacrum} />
        <path className="bone-ln" d={BK().sacrumLn} />
        <path className="bone" d={BK().coccyx} />
        <path className="bone" d={pelvisB()} />
        <Ten c={RAMUS_B} w={12} cls="bone" lines={0} />
        <path className="bone" d={FEMUR_B()} />
        <path className="bone" d={HEAD_B()} />
        <path className="ghost" d={BK().cleft} />
      </Ctxt>
      <Part k={k} id="adductor-magnus">
        <M g={BM().amag} />
      </Part>
      <Part k={k} id="gracilis">
        <M g={BM().grac} />
      </Part>
      <Part k={k} id="semimembranosus">
        <M g={BM().sm} />
      </Part>
      <Part k={k} id="vastus-lateralis">
        <M g={BM().vl} />
      </Part>
      <Part k={k} id="iliotibial-band">
        <Ten c={ITB_B} w={ITB_BW} cls="fascia" lines={3} />
      </Part>
      <Part k={k} id="biceps-femoris">
        <M g={BM().bf} />
      </Part>
      <Part k={k} id="semitendinosus">
        <M g={BM().st} />
      </Part>
      <Part k={k} id="gluteus-medius">
        <M g={BM().gmed} />
      </Part>
      <Part k={k} id="gluteus-maximus">
        <M g={BM().gmax} />
      </Part>
    </Frame>
  );
}

const DM = once(() => ({
  gmin: muscle({
    r: [
      [[148, 118], [166, 102], [190, 92], [214, 92], [232, 104]],
      [[178, 140], [190, 132], [204, 128], [218, 128], [232, 132]],
      [[214, 160], [221, 158], [228, 157], [235, 158], [242, 160]],
    ],
    n: 11,
  }),
  pir: muscle({
    r: [
      [[109, 128], [111, 142], [111, 156], [107, 170]],
      [[160, 140], [161, 150], [161, 160], [158, 170]],
      [[216, 157], [217, 160], [218, 163], [218, 166]],
    ],
    t1: 0.84,
    n: 9,
  }),
  gemS: muscle({ r: [[[116, 186], [117, 193]], [[166, 178], [166, 184]], [[214, 171], [214, 175]]], n: 3 }),
  gemI: muscle({ r: [[[114, 204], [113, 212]], [[166, 192], [166, 198]], [[214, 180], [214, 185]]], n: 3 }),
  qf: muscle({ r: [[[140, 214], [143, 239]], [[200, 201], [203, 228]]], n: 7 }),
  amin: muscle({ r: [[[126, 244], [118, 264]], [[170, 244], [170, 270]], [[204, 232], [200, 276]]], n: 7 }),
  bf: muscle({
    r: [
      [[126, 270], [138, 266]],
      [[136, 300], [168, 288]],
      [[150, 360], [196, 350]],
      [[162, 440], [208, 432]],
      [[170, 492], [212, 488]],
    ],
    n: 8,
  }),
  st: muscle({
    r: [
      [[118, 272], [128, 276]],
      [[108, 302], [139, 306]],
      [[99, 362], [137, 368]],
      [[96, 440], [131, 446]],
      [[96, 492], [127, 496]],
    ],
    n: 7,
  }),
}));
const GMED_HOLE = once(() => ell(192, 133, 31, 17, -12));
const SACROTUB: P[] = [[103, 150], [106, 176], [110, 204], [116, 232]];
const SCIATIC: P[] = [[136, 150], [142, 172], [150, 196], [156, 222], [160, 252], [164, 292], [166, 340], [164, 400], [160, 490]];

/** 起始 / 停止 markers (muscle page): the sheet ends inside the view; see oiFrom. */
const OI_DEEP = once((): OIMap => {
  const m = oiFrom(
    {
      'vastus-lateralis': BM().vl,
      'adductor-magnus': [DM().amin, BM().amag],
      gracilis: BM().grac,
      semimembranosus: BM().sm,
      'gluteus-minimus': DM().gmin,
      'gluteus-medius': BM().gmed,
      piriformis: DM().pir,
      semitendinosus: DM().st,
      'biceps-femoris': DM().bf,
    },
    BOX_HIP,
  );
  m['vastus-lateralis'] = { o: att(BM().vl, 'o', [0.04, 0.42]) };
  return m;
});

function HipDeep({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const hole = `${k.uid}-gmh`;
  const labels: Lab[] = [
    { t: '仙骨', at: [84, 112], x: 58, y: 104, a: 'end' },
    { id: 'piriformis', t: '梨状筋', at: [124, 146], x: 58, y: 150, a: 'end' },
    { id: 'ischial-tuberosity', t: '坐骨結節', at: [120, 230], x: 58, y: 230, a: 'end' },
    { id: 'gracilis', t: '薄筋', at: [66, 300], x: 58, y: 292, a: 'end' },
    { id: 'adductor-magnus', t: '大内転筋', at: [78, 344], x: 58, y: 334, a: 'end' },
    { id: 'semitendinosus', t: '半腱様筋', at: [116, 372], x: 58, y: 376, a: 'end' },
    { id: 'semimembranosus', t: '半膜様筋', at: [96, 428], x: 58, y: 418, a: 'end' },
    { id: 'gluteus-medius', t: '中殿筋', at: [204, 84], x: 264, y: 64 },
    { id: 'gluteus-minimus', t: '小殿筋', at: [205, 136], x: 264, y: 104 },
    { id: 'gluteal-tendons', t: '中・小殿筋の腱', at: [236, 167], x: 264, y: 140 },
    { id: 'greater-trochanter', t: '大転子', at: [246, 182], x: 264, y: 172 },
    { id: 'trochanteric-bursa', t: '大転子滑液包', at: [240, 202], x: 264, y: 204 },
    { t: '外旋筋群', at: [190, 198], x: 264, y: 236 },
    { id: 'proximal-hamstring-tendon', t: 'ハムストリング腱', at: [134, 262], x: 248, y: 268 },
    { id: 'sciatic-nerve', t: '坐骨神経', at: [164, 318], x: 264, y: 322 },
    { id: 'iliotibial-band', t: '腸脛靱帯', at: [242, 362], x: 264, y: 370 },
    { id: 'biceps-femoris', t: '大腿二頭筋', at: [184, 404], x: 264, y: 418 },
  ];
  const spots: Spot[] = [
    { id: 'buttock-deep', at: [144, 172] },
    { id: 'sit-bone', at: [124, 240] },
    { id: 'hip-outer', at: [244, 190] },
  ];
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title="右のお尻の深層を後ろから見た図（大殿筋を取り除いたところ。左が体の中心）"
      cap={['← 体の中心', '右のお尻・深層（大殿筋を除く）']}
      labels={labels}
      spots={spots}
      fade={{ top: 20, bottom: 46 }}
      oi={OI_DEEP()}
      defs={<HoleMask id={hole} d={GMED_HOLE()} w={W} h={H} />}
    >
      <Ctxt k={k}>
        <path className="body" d={BK().body} />
        <path className="bone-g" d={BK().l5} />
        <path className="bone-g" d={sp(mirror(PELVIS_B, MXB))} />
        <path className="bone" d={BK().sacrum} />
        <path className="bone-ln" d={BK().sacrumLn} />
        <path className="bone" d={BK().coccyx} />
        <path className="bone" d={pelvisB()} />
        <Ten c={RAMUS_B} w={12} cls="bone" lines={0} />
        <path className="bone" d={FEMUR_B()} />
        <path className="bone" d={HEAD_B()} />
        <path className="bone-ln" d={line([[226, 170], [214, 190], [200, 214], [186, 236]])} />
        <Ten c={SACROTUB} w={[18, 15, 12, 10]} cls="lig" lines={3} />
      </Ctxt>
      <Part k={k} id="greater-trochanter">
        <path className="bone" d={sp([[214, 160], [224, 157, 1], [238, 163], [248, 174], [251, 192], [248, 212], [238, 222], [222, 214], [214, 196], [212, 176]])} />
        <path className="bone-ln" d={line([[222, 166], [230, 184], [232, 206]])} />
      </Part>
      <Part k={k} id="vastus-lateralis">
        <M g={BM().vl} />
      </Part>
      <Part k={k} id="adductor-magnus">
        <M g={DM().amin} />
        <M g={BM().amag} />
      </Part>
      <Part k={k} id="gracilis">
        <M g={BM().grac} />
      </Part>
      <Part k={k} id="semimembranosus">
        <M g={BM().sm} />
      </Part>
      <Part k={k} id="iliotibial-band">
        <Ten c={ITB_B.slice(1)} w={ITB_BW.slice(1)} cls="fascia" lines={3} />
      </Part>
      <Ctxt k={k}>
        <M g={DM().qf} ctx />
        <M g={DM().gemS} ctx />
        <M g={DM().gemI} ctx />
        <Ten c={[[118, 199], [166, 189], [214, 178]]} w={[7, 6, 5]} cls="ten" lines={1} />
      </Ctxt>
      <Part k={k} id="trochanteric-bursa">
        <path className="bursa" d={ell(240, 197, 10, 17, 12)} />
      </Part>
      <Part k={k} id="sciatic-nerve">
        <Nerve c={SCIATIC} w={[15, 16, 16, 15, 15, 14, 14, 13, 13]} />
      </Part>
      <Part k={k} id="gluteus-minimus">
        <M g={DM().gmin} />
      </Part>
      <Part k={k} id="gluteus-medius">
        <g mask={`url(#${hole})`}>
          <M g={BM().gmed} />
        </g>
        <path className="rimc" d={GMED_HOLE()} />
        <path className="rim" d={GMED_HOLE()} />
      </Part>
      <Part k={k} id="gluteal-tendons">
        <path className="ten" d={sp([[211, 163], [222, 160], [234, 160], [246, 164], [251, 176], [246, 182], [236, 176], [224, 172], [214, 172]])} />
        <path className="ten-fib" d={line([[216, 166], [234, 165], [247, 172]]) + line([[218, 170], [236, 170], [246, 178]])} />
      </Part>
      <Part k={k} id="piriformis">
        <M g={DM().pir} />
      </Part>
      <Part k={k} id="ischial-tuberosity">
        <path className="bone" d={sp([[110, 222], [120, 210], [136, 212], [146, 230], [145, 252], [136, 266], [121, 264], [111, 250]])} />
        <path className="bone-ln" d={line([[122, 216], [130, 236], [138, 258]])} />
      </Part>
      <Part k={k} id="semitendinosus">
        <M g={DM().st} />
      </Part>
      <Part k={k} id="biceps-femoris">
        <M g={DM().bf} />
      </Part>
      <Part k={k} id="proximal-hamstring-tendon">
        <path className="ten" d={sp([[117, 244], [124, 236], [132, 240], [136, 256], [134, 272], [128, 284], [119, 281], [116, 264]])} />
        <path className="ten" d={sp([[134, 226], [141, 232], [142, 248], [139, 262], [135, 258], [133, 240]])} />
        <path className="ten-fib" d={line([[122, 244], [124, 262], [123, 278]]) + line([[129, 244], [131, 262], [130, 278]])} />
      </Part>
      <Ctxt k={k}>
        <path className="ghost" d={BM().gmax.body} />
      </Ctxt>
    </Frame>
  );
}

/* ───────────── side view: right hip from the outside (front of the body at the viewer's right) ───────────── */
const HCS: XY = [178, 196];
const SD = once(() => ({
  body: sp([[112, -10], [104, 60], [90, 130], [80, 190], [86, 250], [108, 292], [118, 380], [124, 480], [262, 480], [264, 400], [262, 320], [254, 240], [248, 180], [246, 128], [252, 60], [258, -10]]),
  pelvis: sp([
    [231, 127, 1], [224, 108], [212, 90], [196, 80], [172, 72], [144, 76], [118, 88], [106, 104], [100, 124], [98, 146], [104, 162], [114, 180],
    [122, 198], [125, 207, 1], [126, 218], [131, 234], [139, 251], [150, 262], [165, 263], [182, 257], [204, 249], [220, 243], [228, 236], [230, 226],
    [226, 218], [218, 213], [212, 206], [206, 190], [212, 174], [220, 163], [222, 150], [227, 138],
  ]) + ell(194, 233, 14, 7, -12),
  lines: line([[132, 82], [122, 118], [114, 152]]) + line([[204, 84], [168, 110], [140, 140], [124, 172]]) + line([[214, 166], [180, 166], [150, 182]]),
  femur: sp([
    [148, 200], [158, 189], [176, 185], [192, 189], [202, 199], [204, 216], [198, 236], [192, 250], [190, 300], [194, 380], [200, 480], [166, 480],
    [160, 380], [158, 300], [156, 252], [150, 238], [146, 220],
  ]),
}));
const SM2 = once(() => ({
  gmed: muscle({
    r: [
      [[124, 90], [146, 78], [170, 74], [196, 80], [214, 94], [224, 112]],
      [[138, 136], [155, 127], [172, 122], [190, 124], [206, 132], [217, 146]],
      [[158, 192], [165, 189], [172, 187], [179, 187], [186, 189], [193, 192]],
    ],
    t1: 0.9,
    n: 12,
  }),
  gmax: muscle({
    r: [
      [[114, 90], [102, 116], [95, 146], [94, 178], [99, 210], [109, 240], [123, 268]],
      [[148, 138], [142, 164], [138, 190], [138, 216], [141, 242], [147, 266], [155, 288]],
      [[180, 204], [182, 226], [181, 248], [179, 268], [177, 288], [175, 306], [172, 322]],
    ],
    t1: [0.86, 0.89, 0.92, 0.95, 0.99, 1, 1],
    n: 20,
    seams: [0.17, 0.34, 0.5, 0.67, 0.84],
  }),
  tfl: muscle({
    r: [
      [[211, 102], [222, 113], [233, 127]],
      [[206, 190], [219, 193], [232, 198]],
      [[194, 268], [204, 271], [214, 276]],
    ],
    n: 8,
  }),
  vl: muscle({
    r: [
      [[150, 232], [146, 300], [148, 380], [152, 480]],
      [[226, 262], [234, 340], [234, 420], [230, 520]],
    ],
    n: 12,
  }),
  rf: muscle({
    r: [
      [[221, 160], [228, 163]],
      [[223, 222], [238, 225]],
      [[230, 320], [248, 322]],
      [[234, 480], [248, 480]],
    ],
    t0: 0.14,
    n: 5,
  }),
  sart: muscle({
    r: [
      [[228, 127], [235, 131]],
      [[236, 168], [248, 172]],
      [[246, 222], [256, 230]],
      [[254, 262], [260, 270]],
    ],
    t0: 0.06,
    n: 4,
  }),
  bf: muscle({
    r: [
      [[124, 262], [138, 262]],
      [[128, 320], [152, 320]],
      [[133, 400], [158, 400]],
      [[140, 480], [162, 480]],
    ],
    n: 6,
  }),
}));
const ITB_S: P[] = [[183, 194], [184, 260], [185, 330], [185, 400], [186, 480]];
const WIN_S = once(() => ell(172, 222, 26, 37, -4));

/** 起始 / 停止 markers (muscle page): the sheet ends inside the view; see oiFrom. */
const OI_SIDE = once((): OIMap => {
  const m = oiFrom(
    {
      'vastus-lateralis': SM2().vl,
      'rectus-femoris': SM2().rf,
      'biceps-femoris': SM2().bf,
      'gluteus-medius': SM2().gmed,
      'gluteus-maximus': SM2().gmax,
      'tensor-fasciae-latae': SM2().tfl,
    },
    BOX_HIP,
  );
  m['vastus-lateralis'] = { o: att(SM2().vl, 'o', [0.04, 0.42]) };
  // the long head of biceps femoris comes out from under gluteus maximus here: its origin (ischial tuberosity) is hidden
  delete m['biceps-femoris'];
  return m;
});

function HipSide({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const win = `${k.uid}-sw`;
  const labels: Lab[] = [
    { id: 'gluteus-medius', t: '中殿筋', at: [160, 104], x: 88, y: 70, a: 'end' },
    { id: 'gluteus-maximus', t: '大殿筋', at: [114, 170], x: 70, y: 150, a: 'end' }, // above the tendon leader: no crossing
    { id: 'gluteal-tendons', t: '中・小殿筋の腱', at: [176, 204], x: 96, y: 196, a: 'end' },
    { id: 'greater-trochanter', t: '大転子', at: [186, 238], x: 70, y: 228, a: 'end' },
    { id: 'trochanteric-bursa', t: '大転子滑液包', at: [156, 236], x: 88, y: 262, a: 'end' },
    { id: 'iliotibial-band', t: '腸脛靱帯', at: [180, 340], x: 88, y: 330, a: 'end' },
    { id: 'biceps-femoris', t: '大腿二頭筋', at: [143, 400], x: 88, y: 396, a: 'end' },
    { id: 'asis', t: '上前腸骨棘', at: [231, 127], x: 266, y: 112 },
    { id: 'tensor-fasciae-latae', t: '大腿筋膜張筋', at: [220, 200], x: 266, y: 172 },
    { id: 'rectus-femoris', t: '大腿直筋', at: [240, 330], x: 270, y: 320 },
    { id: 'vastus-lateralis', t: '外側広筋', at: [218, 390], x: 270, y: 396 },
  ];
  const spots: Spot[] = [{ id: 'hip-outer', at: [172, 214] }];
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title="右の股関節を外側から見た図（右が体の前）。大転子の上の腸脛靱帯を窓のように切り取っています"
      cap={['右の股関節・外側から', '前 →']}
      labels={labels}
      spots={spots}
      fade={{ top: 20, bottom: 46 }}
      oi={OI_SIDE()}
      defs={
        <clipPath id={win}>
          <path d={WIN_S()} />
        </clipPath>
      }
    >
      <Ctxt k={k}>
        <path className="body" d={SD().body} />
        <path className="bone" d={SD().pelvis} fillRule="evenodd" />
        <path className="bone-ln" d={SD().lines} />
        <path className="bone" d={SD().femur} />
      </Ctxt>
      <Part k={k} id="asis">
        <path className="bone" d={ell(231, 127, 4.4, 3.6, 30)} />
      </Part>
      <Part k={k} id="vastus-lateralis">
        <M g={SM2().vl} />
      </Part>
      <Part k={k} id="rectus-femoris">
        <M g={SM2().rf} />
      </Part>
      <Part k={k} id="biceps-femoris">
        <M g={SM2().bf} />
      </Part>
      <Part k={k} id="gluteus-medius">
        <M g={SM2().gmed} />
      </Part>
      <Part k={k} id="iliotibial-band">
        <Ten c={ITB_S} w={[46, 44, 38, 32, 28]} cls="fascia" lines={5} />
      </Part>
      <Part k={k} id="gluteus-maximus">
        <M g={SM2().gmax} />
      </Part>
      <Part k={k} id="tensor-fasciae-latae">
        <M g={SM2().tfl} />
      </Part>
      {/* cut-away window over the greater trochanter */}
      <g clipPath={`url(#${win})`}>
        <Ctxt k={k}>
          <path className="body" d={WIN_S()} />
        </Ctxt>
        <Part k={k} id="vastus-lateralis">
          <M g={SM2().vl} />
        </Part>
        <Part k={k} id="greater-trochanter">
          <path className="bone" d={sp([[146, 206], [156, 193], [175, 189], [193, 193], [203, 204], [206, 222], [201, 242], [188, 252], [166, 252], [151, 242], [145, 224]])} />
          <path className="bone-sh" d={sp([[150, 236], [166, 246], [188, 247], [201, 238], [198, 248], [186, 254], [164, 254], [150, 244]])} />
          <path className="bone-ln" d={line([[156, 244], [176, 249], [196, 242]])} />
        </Part>
        <Part k={k} id="gluteus-medius">
          <M g={SM2().gmed} />
        </Part>
        <Part k={k} id="gluteal-tendons">
          <path className="ten" d={sp([[154, 188, 1], [192, 188, 1], [190, 200], [186, 214], [180, 224], [170, 226], [163, 216], [157, 202]])} />
          <path className="ten" d={sp([[194, 189, 1], [203, 192, 1], [207, 204], [205, 220], [199, 228], [195, 214], [193, 200]])} />
          <path className="ten-fib" d={line([[160, 192], [166, 208], [171, 222]]) + line([[170, 191], [173, 206], [175, 222]]) + line([[182, 191], [181, 206], [179, 220]]) + line([[198, 193], [201, 208], [201, 222]])} />
        </Part>
        <Part k={k} id="trochanteric-bursa">
          <path className="bursa" d={ell(158, 232, 10, 17, 8)} />
        </Part>
      </g>
      <Part k={k} id="iliotibial-band">
        <path className="rimc" d={WIN_S()} style={{ stroke: 'var(--tendon)' }} />
        <path className="rim-t" d={WIN_S()} />
      </Part>
    </Frame>
  );
}

/* ───────────── component & registration ───────────── */

function HipDiagram(p: RegionDiagramProps) {
  const k = useCtx(p);
  const view = p.view ?? 'front';
  switch (view) {
    case 'back':
      return <HipBack p={p} k={k} />;
    case 'side':
      return <HipSide p={p} k={k} />;
    case 'deep':
      return <HipDeep p={p} k={k} />;
    default:
      return <HipFront p={p} k={k} />;
  }
}

const diagram: RegionDiagram = {
  region: 'hip',
  views: [
    { id: 'front', label: '前から' },
    { id: 'back', label: '後ろから' },
    { id: 'side', label: '横から' },
    { id: 'deep', label: '後ろ・深層' },
  ],
  parts: {
    front: [
      'hip-joint', 'hip-labrum', 'gluteus-medius', 'adductor-magnus', 'iliopsoas', 'adductor-longus', 'gracilis', 'vastus-lateralis',
      'rectus-femoris', 'iliotibial-band', 'tensor-fasciae-latae', 'sartorius', 'rectus-abdominis', 'pubic-symphysis', 'asis',
    ],
    back: [
      'adductor-magnus', 'gracilis', 'semimembranosus', 'vastus-lateralis', 'iliotibial-band', 'biceps-femoris', 'semitendinosus',
      'gluteus-medius', 'gluteus-maximus',
    ],
    side: [
      'asis', 'vastus-lateralis', 'rectus-femoris', 'biceps-femoris', 'gluteus-medius', 'iliotibial-band', 'gluteus-maximus',
      'tensor-fasciae-latae', 'greater-trochanter', 'gluteal-tendons', 'trochanteric-bursa',
    ],
    deep: [
      'greater-trochanter', 'adductor-magnus', 'gracilis', 'semimembranosus', 'vastus-lateralis', 'iliotibial-band', 'trochanteric-bursa',
      'sciatic-nerve', 'gluteus-minimus', 'gluteus-medius', 'gluteal-tendons', 'piriformis', 'ischial-tuberosity', 'semitendinosus',
      'biceps-femoris', 'proximal-hamstring-tendon',
    ],
  },
  spots: {
    front: ['hip-front', 'groin-inner', 'hip-outer'],
    back: ['buttock-deep', 'sit-bone', 'hip-outer'],
    side: ['hip-outer'],
    deep: ['buttock-deep', 'sit-bone', 'hip-outer'],
  },
  Component: HipDiagram,
};
export default diagram;
