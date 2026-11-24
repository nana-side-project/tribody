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
import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { MUSCLES, PAIN_SPOTS, STRUCTURES, type MuscleId, type PainSpotId, type StructureId } from '../../data/registry';
import type { Highlights, RegionDiagram, RegionDiagramProps } from '../types';

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

/* ═════════════════════════════════════ styles ═════════════════════════════════════ */

const DARK = `
  --k-amber: #f2b13e; --k-cart: #a8bccb; --k-labrum: #7f9fb8; --k-vivid: #ff6a55; --k-shade: #000; --k-shade-o: .2;
  --k-hi-o: .05; --k-mus-ink: color-mix(in srgb, var(--muscle) 52%, #000); --k-ten-ink: color-mix(in srgb, var(--tendon) 52%, #000);
  --k-bone-sh: #000; --k-bone-sh-o: .18; --k-body: color-mix(in srgb, var(--surface-2) 70%, var(--surface));
  --k-ctx: color-mix(in srgb, var(--muscle) 46%, var(--surface)); --k-cut: color-mix(in srgb, var(--muscle) 70%, #fff);`;

export const KIT_CSS = `
.thk { --k-amber: #e0901a; --k-cart: #e1ebf2; --k-labrum: #a9c3d8; --k-vivid: #d8342a; --k-shade: #2b0805; --k-shade-o: .14;
  --k-hi-o: .08; --k-mus-ink: color-mix(in srgb, var(--muscle) 60%, #2a0805);
  --k-ten-ink: color-mix(in srgb, var(--tendon) 60%, #5a4524); --k-bone-sh: #4a443d; --k-bone-sh-o: .1;
  --k-inj-ink: color-mix(in srgb, var(--injured) 70%, #000); --k-body: color-mix(in srgb, var(--surface-2) 55%, var(--surface));
  --k-ctx: color-mix(in srgb, var(--muscle) 40%, var(--surface)); --k-cut: color-mix(in srgb, var(--muscle) 55%, #fff);
  display: block; width: 100%; height: auto; max-width: 480px; margin: 0 auto; overflow: visible;
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
.thk .hole { fill: var(--k-body); stroke: var(--bone-ink); stroke-width: .8; }
.thk .bursa { fill: var(--bursa); stroke: color-mix(in srgb, var(--bursa) 55%, #102a44); stroke-width: .8; fill-opacity: .92; }
.thk .cart { fill: var(--k-cart); stroke: color-mix(in srgb, var(--k-cart) 50%, #2c4a62); stroke-width: .75; }
.thk .labrum { fill: var(--k-labrum); stroke: color-mix(in srgb, var(--k-labrum) 45%, #102a44); stroke-width: .8; }
.thk .nerve { fill: var(--nerve); stroke: color-mix(in srgb, var(--nerve) 55%, #4a3600); stroke-width: .7; }
.thk .nerve-ln { fill: none; stroke: color-mix(in srgb, var(--nerve) 55%, #4a3600); stroke-width: .5; opacity: .55; }
.thk .ghost { fill: none; stroke: var(--text-2); stroke-width: .9; opacity: .5; stroke-dasharray: 3 2.5; }
.thk .rim { fill: none; stroke: var(--k-mus-ink); stroke-width: 1.4; opacity: .7; }
.thk .rim-t { fill: none; stroke: var(--k-ten-ink); stroke-width: 1.2; opacity: .8; }
.thk .inset-bg { fill: var(--surface); stroke: var(--border); stroke-width: 1.2; }
.thk .inset-ring { fill: none; stroke: var(--text-2); stroke-width: .9; opacity: .55; }
.thk .inset-ln { fill: none; stroke: var(--text-2); stroke-width: .8; opacity: .55; stroke-dasharray: 2.5 2.5; }
.thk .cap-t { font-size: 10.5px; fill: var(--text-2); opacity: .85; font-weight: 600; letter-spacing: .02em; }
.thk .note-t { font-size: 10.5px; fill: var(--text-2); font-weight: 600; }

/* parts & highlight roles */
.thk-part, .thk-ctx { transition: opacity .25s ease; }
.thk-part[role="button"] { cursor: pointer; outline: none; }
.thk-part.is-dim { opacity: .22; }
.thk-ctx.is-dim { opacity: .3; }
.thk .is-injured :is(.mus, .ten, .lig, .cap, .fascia, .fascia-t, .bone, .bursa, .cart, .labrum, .nerve, .cutf) {
  fill: var(--injured); stroke: var(--k-inj-ink); opacity: 1; fill-opacity: 1; }
.thk .is-injured .ol { stroke: var(--k-inj-ink); stroke-width: 1.1; }
.thk .is-injured :is(.fib, .ten-fib, .bone-ln, .nerve-ln, .raphe) { stroke: #fff; opacity: .35; }
.thk .is-injured .hi { opacity: .12; }
.thk-halo { pointer-events: none; opacity: .5; animation: thk-pulse 1.9s ease-in-out infinite; }
.thk-halo * { fill: var(--injured) !important; stroke: var(--injured) !important; stroke-width: 5px !important; opacity: 1 !important; fill-opacity: 1 !important; }
@keyframes thk-pulse { 0%, 100% { opacity: .22; } 50% { opacity: .8; } }
.thk .is-involved .mus { fill: color-mix(in srgb, var(--muscle) 72%, var(--k-amber)); }
.thk .is-involved .ol { stroke: var(--k-amber); stroke-width: 1.7; }
.thk .is-involved :is(.bone, .cart, .labrum) { fill: color-mix(in srgb, var(--bone) 70%, var(--k-amber)); stroke: var(--k-amber); stroke-width: 1.7; }
.thk .is-involved :is(.ten, .lig, .cap, .fascia, .fascia-t) { fill: color-mix(in srgb, var(--tendon) 62%, var(--k-amber)); stroke: var(--k-amber); stroke-width: 1.5; fill-opacity: 1; }
.thk .is-involved :is(.bursa, .nerve) { stroke: var(--k-amber); stroke-width: 1.8; }
.thk .is-muscle .mus { fill: var(--k-vivid); }
.thk .is-muscle .ol { stroke: color-mix(in srgb, var(--k-vivid) 60%, #000); stroke-width: 1.1; }
.thk .is-selected :is(.ol, .bone, .ten, .lig, .cap, .bursa, .cart, .labrum, .fascia, .fascia-t, .nerve) { stroke: var(--text); stroke-width: 2.2; }
.thk-part:focus-visible :is(.ol, .bone, .ten, .lig, .bursa, .cart, .labrum, .cap, .fascia, .fascia-t, .nerve) { stroke: var(--accent); stroke-width: 2.4; }

/* labels */
.thk-lab { cursor: default; }
.thk-lab[role="button"] { cursor: pointer; }
.thk-lab text { font-size: 12.5px; font-weight: 500; fill: var(--text-2); paint-order: stroke; stroke: var(--surface);
  stroke-width: 3.2px; stroke-linejoin: round; }
.thk-lab .ld { fill: none; stroke: var(--text-2); stroke-width: .75; opacity: .65; }
.thk-lab .ldot { fill: var(--text-2); opacity: .85; }
.thk-lab .lhit { fill: transparent; }
.thk-lab.is-ctx text { opacity: .8; font-weight: 400; }
.thk-lab.is-hl text { fill: var(--text); font-weight: 700; }
.thk-lab.is-injured text { fill: var(--injured); }
.thk-lab.is-injured :is(.ld, .ldot) { stroke: var(--injured); fill: var(--injured); opacity: 1; }
.thk-lab.is-injured .ld { fill: none; }
.thk-lab.is-involved text { fill: color-mix(in srgb, var(--k-amber) 62%, var(--text)); }
.thk-lab.is-involved :is(.ld, .ldot) { stroke: var(--k-amber); fill: var(--k-amber); opacity: 1; }
.thk-lab.is-involved .ld { fill: none; }
.thk-lab.is-dim { opacity: .3; }

/* pain-spot hotspots */
.thk-spot { cursor: pointer; outline: none; }
.thk-spot .s-hit { fill: transparent; }
.thk-spot .s-ring { fill: var(--accent); opacity: .25; transform-box: fill-box; transform-origin: center; animation: thk-ring 2.2s ease-out infinite; }
.thk-spot .s-dot { fill: var(--accent); stroke: var(--surface); stroke-width: 2.2; }
.thk-spot .s-sel { fill: none; stroke: var(--accent); stroke-width: 2.2; }
.thk-spot.is-sel .s-dot { fill: var(--injured); }
.thk-spot.is-sel .s-ring { fill: var(--injured); opacity: .3; }
.thk-spot.is-sel .s-sel { stroke: var(--injured); }
.thk-spot:focus-visible .s-sel { stroke: var(--text); stroke-width: 2.6; }
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

export interface Ctx {
  uid: string;
  hl: Highlights;
  dim: boolean;
  onPart?: (id: PartId) => void;
}

export function useCtx(p: RegionDiagramProps): Ctx {
  const raw = useId();
  const uid = `thk${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  const hl = p.highlights ?? {};
  return { uid, hl, dim: !!p.dimOthers && Object.keys(hl).length > 0, onPart: p.onPartSelect };
}

const keyAct = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

/** A tappable anatomical part (muscle / structure) carrying data-part="<id>". */
export function Part({ k, id, children }: { k: Ctx; id: PartId; children: ReactNode }) {
  const role = k.hl[id];
  const cls = `thk-part${role ? ` is-${role}` : ''}${k.dim && !role ? ' is-dim' : ''}`;
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
      {role === 'injured' && (
        <g className="thk-halo" filter={`url(#${k.uid}-glow)`} aria-hidden="true">
          {children}
        </g>
      )}
      {children}
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
}

export interface Spot {
  id: PainSpotId;
  at: readonly number[];
}

const FS = 12.5; // label font size in user units (≈ 11.5 CSS px on a 390 px phone)
const LH = 14.5;

function Label({ k, l }: { k: Ctx; l: Lab }) {
  const lines = l.t.split('\n');
  const a = l.a ?? 'start';
  const role = l.id ? k.hl[l.id] : undefined;
  const cls = `thk-lab${!l.id ? ' is-ctx' : ''}${role ? ` is-hl is-${role}` : ''}${k.dim && !role ? ' is-dim' : ''}`;
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

function SpotMark({ s, sel, onSel }: { s: Spot; sel: boolean; onSel?: (id: PainSpotId) => void }) {
  const name = SPOT_NAME.get(s.id) ?? s.id;
  const act = onSel ? () => onSel(s.id) : undefined;
  return (
    <g
      data-spot={s.id}
      className={`thk-spot${sel ? ' is-sel' : ''}`}
      transform={`translate(${r1(s.at[0])} ${r1(s.at[1])})`}
      role="button"
      tabIndex={0}
      aria-label={`痛む場所: ${name}`}
      aria-pressed={sel}
      onClick={act}
      onKeyDown={act ? keyAct(act) : undefined}
    >
      <title>{name}</title>
      <circle className="s-hit" r={24} />
      <circle className="s-ring" r={sel ? 13 : 11} />
      {sel && <circle className="s-sel" r={10.5} />}
      <circle className="s-dot" r={sel ? 6.5 : 5.5} />
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
}

/** Root <svg> of a region diagram: styles, glow filter, drawing, labels, hotspots. */
export function Frame({ k, p, w, h, title, cap, labels, spots, children, overlay, defs, fade }: FrameProps) {
  const showLabels = p.showLabels ?? true;
  const ft = fade?.top ?? 0;
  const fb = fade?.bottom ?? 0;
  const hasFade = ft > 0 || fb > 0;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`thk${p.className ? ` ${p.className}` : ''}`}
      role="group"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <style>{KIT_CSS}</style>
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
      <g mask={hasFade ? `url(#${k.uid}-fade)` : undefined}>{children}</g>
      {overlay}
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
            <Label key={i} k={k} l={l} />
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
        <text className="cap-t" x={cx} y={cy + r + 13} textAnchor="middle">
          {title}
        </text>
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
