// Region diagram: 肩 (shoulder) — right shoulder, four views (front / deep front / back / deep back).
//
// This file also holds the small SVG drawing kit shared by the upper-body region diagrams
// (neck.tsx and lowback.tsx import it). Everything is original artwork generated from
// hand-placed anatomical landmarks:
//   • muscles are "fibre fields": a set of fibres running from an origin line to an insertion
//     line (quadratic curves, bulged by control points), so the outline, fibre direction and
//     tendon ends all come from the same anatomical description;
//   • bones / bursae / cartilage are smooth Catmull-Rom outlines through landmark points.
import { createContext, useContext, useId, type KeyboardEvent, type ReactNode } from 'react';
import { MUSCLES, PAIN_SPOTS, STRUCTURES, type MuscleId, type PainSpotId, type StructureId } from '../../data/registry';
import type { Highlights, RegionDiagram, RegionDiagramProps } from '../types';

/* ══════════════════════════════════ geometry ══════════════════════════════════ */

export type PartId = MuscleId | StructureId;
/** A landmark point. A third element of 1 marks a sharp corner for `sp()`. */
export type P = readonly [number, number] | readonly [number, number, number];
export type XY = [number, number];
/** A scalar, or a list of scalars interpolated along u ∈ [0, 1]. */
export type Num = number | readonly number[];

/** Parse "x,y x,y,1 …" into landmark points (compact geometry authoring). */
export const PS = (s: string): P[] =>
  s
    .trim()
    .split(/\s+/)
    .map((t) => t.split(',').map(Number) as unknown as P);

/** Rotate points by `deg` (screen coordinates, clockwise-positive) about (cx, cy). */
export const rotP = (pts: readonly P[], deg: number, cx: number, cy: number): P[] => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return pts.map((q) => {
    const x = q[0] - cx;
    const y = q[1] - cy;
    const out = [cx + x * c - y * s, cy + x * s + y * c];
    return (q[2] ? [...out, 1] : out) as unknown as P;
  });
};

const fmt = (n: number) => String(Math.round(n * 10) / 10);
const xy = (p: readonly number[]) => `${fmt(p[0])} ${fmt(p[1])}`;
const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);
export const lerp = (a: readonly number[], b: readonly number[], t: number): XY => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

function crSeg(p0: readonly number[], p1: readonly number[], p2: readonly number[], p3: readonly number[], t: number): XY {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

/** Point at u ∈ [0,1] on a Catmull-Rom spline through `pts` (uniform in point index). */
export function crAt(pts: readonly (readonly number[])[], u: number): XY {
  const n = pts.length;
  if (n === 1) return [pts[0][0], pts[0][1]];
  if (n === 2) return lerp(pts[0], pts[1], clamp01(u));
  const x = clamp01(u) * (n - 1);
  const i = Math.min(n - 2, Math.floor(x));
  const t = x - i;
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p0 = i > 0 ? pts[i - 1] : [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
  const p3 = i + 2 < n ? pts[i + 2] : [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
  return crSeg(p0, p1, p2, p3, t);
}

function numAt(v: Num | undefined, u: number, d: number): number {
  if (v === undefined) return d;
  if (typeof v === 'number') return v;
  if (v.length === 1) return v[0];
  const x = clamp01(u) * (v.length - 1);
  const i = Math.min(v.length - 2, Math.floor(x));
  return v[i] + (v[i + 1] - v[i]) * (x - i);
}
const numMax = (v: Num) => (typeof v === 'number' ? v : Math.max(...v));
const numMin = (v: Num) => (typeof v === 'number' ? v : Math.min(...v));

/** Smooth path through points (Catmull-Rom → cubic Bézier). Points flagged [x,y,1] are corners. */
export function sp(pts: readonly P[], closed = true, k = 1): string {
  const n = pts.length;
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

/** Straight polyline path. */
export const pl = (pts: readonly (readonly number[])[], closed = false) =>
  `M${pts.map(xy).join('L')}${closed ? 'Z' : ''}`;

/** Closed outline of a "tube" of width w(u) around a smooth centre line (clavicle, ribs, tendons…). */
export function tube(center: readonly P[], w: Num, n = 24, capR = 0.5): string {
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
  // rounded caps: add a point beyond each end
  const end = (i: number, dir: number): XY => {
    const c = crAt(center, i);
    const o = crAt(center, i - dir * 0.02);
    const dx = c[0] - o[0];
    const dy = c[1] - o[1];
    const len = Math.hypot(dx, dy) || 1;
    const h = (numAt(w, i, 4) / 2) * capR * 1.4;
    return [c[0] + (dx / len) * h, c[1] + (dy / len) * h];
  };
  return sp([...L, end(1, 1), ...R.reverse(), end(0, -1)], true);
}

/* ── fibre fields (muscles) ── */

export interface Field {
  /** origin line (u = 0 → 1) */
  o: readonly P[];
  /** insertion line, matched point-by-point with `o` */
  i: readonly P[];
  /** optional control line (quadratic bulge of each fibre) */
  c?: readonly P[];
}

function fibre(f: Field, u: number) {
  const O = crAt(f.o, u);
  const I = crAt(f.i, u);
  const C = f.c ? crAt(f.c, u) : lerp(O, I, 0.5);
  return { O, C, I };
}
const qb = (O: XY, C: XY, I: XY, t: number): XY => {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return [a * O[0] + b * C[0] + c * I[0], a * O[1] + b * C[1] + c * I[1]];
};
/** Point of the field at fibre u, position s along the fibre. */
export function fpt(f: Field, u: number, s: number): XY {
  const { O, C, I } = fibre(f, u);
  return qb(O, C, I, s);
}

/** A muscle surface: u runs across the fibres (0 → 1), s along them (origin 0 → insertion 1). */
export type Surf = (u: number, s: number) => XY;
const surfOf = (f: Field | Surf): Surf => (typeof f === 'function' ? f : (u, s) => fpt(f, u, s));

/** Outline of the sub-region u ∈ [u0,u1], s ∈ [s0(u), s1(u)] of a field / surface. */
export function band(f: Field | Surf, u0: number, u1: number, s0: Num, s1: Num, nu = 22, ns = 10): string {
  const P = surfOf(f);
  const S0 = (u: number) => numAt(s0, u, 0);
  const S1 = (u: number) => numAt(s1, u, 1);
  const pts: XY[] = [];
  for (let j = 0; j <= ns; j++) pts.push(P(u0, S0(u0) + ((S1(u0) - S0(u0)) * j) / ns));
  for (let j = 1; j <= nu; j++) {
    const u = u0 + ((u1 - u0) * j) / nu;
    pts.push(P(u, S1(u)));
  }
  for (let j = 1; j <= ns; j++) pts.push(P(u1, S1(u1) - ((S1(u1) - S0(u1)) * j) / ns));
  for (let j = 1; j < nu; j++) {
    const u = u1 - ((u1 - u0) * j) / nu;
    pts.push(P(u, S0(u)));
  }
  return pl(pts, true);
}

/** Fibre lines at u = u0 + (u1-u0)·(k+off)/n (exact quadratics for fields, smoothed samples for surfaces). */
export function fibres(f: Field | Surf, n: number, s0: Num, s1: Num, off = 0.5, inset = 0.025, u0 = 0, u1 = 1): string {
  let d = '';
  if (typeof f === 'function') {
    for (let k = 0; k < n; k++) {
      const u = u0 + ((u1 - u0) * (k + off)) / n;
      if (u <= 0.001 || u >= 0.999) continue;
      const a = numAt(s0, u, 0) + inset;
      const b = numAt(s1, u, 1) - inset;
      if (b - a < 0.02) continue;
      const pts: P[] = [];
      for (let j = 0; j <= 8; j++) pts.push(f(u, a + ((b - a) * j) / 8));
      d += sp(pts, false);
    }
    return d;
  }
  for (let k = 0; k < n; k++) {
    const u = u0 + ((u1 - u0) * (k + off)) / n;
    if (u <= 0.001 || u >= 0.999) continue;
    const { O, C, I } = fibre(f, u);
    const a = numAt(s0, u, 0) + inset;
    const b = numAt(s1, u, 1) - inset;
    if (b - a < 0.02) continue;
    const A = qb(O, C, I, a);
    const B = qb(O, C, I, b);
    const wa = (1 - a) * (1 - b);
    const wb = (1 - a) * b + a * (1 - b);
    const wc = a * b;
    const Q: XY = [wa * O[0] + wb * C[0] + wc * I[0], wa * O[1] + wb * C[1] + wc * I[1]];
    d += `M${xy(A)}Q${xy(Q)} ${xy(B)}`;
  }
  return d;
}

export interface MuscleSpec extends Field {
  /** tendon at the origin: s ∈ [0, t0(u)] */
  t0?: Num;
  /** tendon at the insertion: s ∈ [t1(u), 1] */
  t1?: Num;
  /** number of drawn fibres */
  n?: number;
  /** extra darker division lines (e.g. between heads) at these u */
  seams?: number[];
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
}

/** A strap-like muscle following a curved centre line `c` with width `w(s)` (fibres run along it). */
export interface StrapSpec {
  c: readonly P[];
  w: Num;
  t0?: Num;
  t1?: Num;
  n?: number;
  seams?: number[];
  /** shift of the strap across its width (−0.5…0.5 of w), e.g. to hug one side */
  shift?: Num;
}
export function strapSurf(c: readonly P[], w: Num, shift: Num = 0): Surf {
  const N = 64;
  const pts: XY[] = [];
  const nor: XY[] = [];
  for (let j = 0; j <= N; j++) pts.push(crAt(c, j / N));
  for (let j = 0; j <= N; j++) {
    const a = pts[Math.max(0, j - 1)];
    const b = pts[Math.min(N, j + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    nor.push([-(b[1] - a[1]) / len, (b[0] - a[0]) / len]);
  }
  return (u, s) => {
    const x = clamp01(s) * N;
    const j = Math.min(N - 1, Math.floor(x));
    const t = x - j;
    const p = lerp(pts[j], pts[j + 1], t);
    const q = lerp(nor[j], nor[j + 1], t);
    const off = (u - 0.5 + numAt(shift, s, 0)) * numAt(w, s, 6);
    return [p[0] + q[0] * off, p[1] + q[1] * off];
  };
}
export function strap(m: StrapSpec): MuscleGeo {
  return geoOf(strapSurf(m.c, m.w, m.shift), m);
}

/** Pre-compute the drawable geometry of a muscle. */
export function muscle(m: MuscleSpec): MuscleGeo {
  return geoOf(m, m);
}

function geoOf(m: Field | Surf, o: { t0?: Num; t1?: Num; n?: number; seams?: number[] }): MuscleGeo {
  const S = surfOf(m);
  const n = o.n ?? 9;
  const t0: Num = o.t0 ?? 0;
  const t1: Num = o.t1 ?? 1;
  const ten: string[] = [];
  let tenFib = '';
  if (numMax(t0) > 0.004) {
    ten.push(band(m, 0, 1, 0, t0));
    tenFib += fibres(m, Math.max(3, Math.round(n * 0.6)), 0, t0, 0.5, 0.01);
  }
  if (numMin(t1) < 0.996) {
    ten.push(band(m, 0, 1, t1, 1));
    tenFib += fibres(m, Math.max(3, Math.round(n * 0.6)), t1, 1, 0.5, 0.01);
  }
  const seam = (o.seams ?? [])
    .map((u) => {
      const pts: XY[] = [];
      for (let j = 0; j <= 12; j++) {
        const s = numAt(t0, u, 0) + ((numAt(t1, u, 1) - numAt(t0, u, 0)) * j) / 12;
        pts.push(S(u, s));
      }
      return pl(pts);
    })
    .join('');
  return {
    body: band(m, 0, 1, t0, t1),
    ten,
    tenFib,
    fib: fibres(m, n, t0, t1, 0.5),
    fibL: fibres(m, n, t0, t1, 0, 0.06),
    shade: band(m, 0, 0.13, t0, t1, 6) + band(m, 0.87, 1, t0, t1, 6),
    hi: band(m, 0.3, 0.55, t0, t1, 8),
    seam,
  };
}

/* ══════════════════════════════════ styles ══════════════════════════════════ */

const DARK_VARS = `
  --rd-amber: #f2b13e; --rd-cart: #a9bdcc; --rd-vivid: #ff6a55; --rd-shade: #000; --rd-shade-o: .16;
  --rd-hi-o: .05; --rd-mus-ink: color-mix(in srgb, var(--muscle) 55%, #000);
  --rd-ten-ink: color-mix(in srgb, var(--tendon) 55%, #000); --rd-bone-sh: #000; --rd-bone-sh-o: .16;`;

export const KIT_CSS = `
.tbu { --rd-amber: #e0901a; --rd-cart: #dfe9f1; --rd-vivid: #d8342a; --rd-shade: #2b0805; --rd-shade-o: .13;
  --rd-hi-o: .07; --rd-mus-ink: color-mix(in srgb, var(--muscle) 62%, #2a0805);
  --rd-ten-ink: color-mix(in srgb, var(--tendon) 62%, #5a4524); --rd-bone-sh: #4a443d; --rd-bone-sh-o: .1;
  --rd-inj-ink: color-mix(in srgb, var(--injured) 70%, #000);
  display: block; width: 100%; height: auto; max-width: 480px; margin: 0 auto; overflow: hidden;
  font-family: inherit; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none;
  touch-action: manipulation; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .tbu { ${DARK_VARS} } }
:root[data-theme="dark"] .tbu { ${DARK_VARS} }
.tbu path, .tbu circle, .tbu ellipse { vector-effect: none; }
.tbu .mus { fill: var(--muscle); }
.tbu .ol { fill: none; stroke: var(--rd-mus-ink); stroke-width: .8; stroke-linejoin: round; }
.tbu .fib { fill: none; stroke: var(--rd-mus-ink); stroke-width: .55; opacity: .5; stroke-linecap: round; }
.tbu .fib-l { fill: none; stroke: #fff; stroke-width: .75; opacity: .14; stroke-linecap: round; }
.tbu .seam { fill: none; stroke: var(--rd-mus-ink); stroke-width: .9; opacity: .75; }
.tbu .shade { fill: var(--rd-shade); opacity: var(--rd-shade-o); }
.tbu .hi { fill: #fff; opacity: var(--rd-hi-o); }
.tbu .mus-ctx { fill: color-mix(in srgb, var(--muscle) 62%, var(--surface)); stroke: color-mix(in srgb, var(--rd-mus-ink) 50%, var(--surface)); stroke-width: .7; }
.tbu .fib-ctx { fill: none; stroke: var(--rd-mus-ink); stroke-width: .5; opacity: .25; }
.tbu .ten, .tbu .lig { fill: var(--tendon); stroke: var(--rd-ten-ink); stroke-width: .7; stroke-linejoin: round; }
.tbu .ten-fib { fill: none; stroke: var(--rd-ten-ink); stroke-width: .45; opacity: .5; }
.tbu .cap { fill: var(--tendon); stroke: var(--rd-ten-ink); stroke-width: .7; opacity: .95; }
.tbu .fascia { fill: var(--tendon); stroke: var(--rd-ten-ink); stroke-width: .8; opacity: .93; }
.tbu .bone { fill: var(--bone); stroke: var(--bone-ink); stroke-width: 1; stroke-linejoin: round; }
.tbu .bone-ln { fill: none; stroke: var(--bone-ink); stroke-width: .7; opacity: .55; stroke-linecap: round; stroke-linejoin: round; }
.tbu .bone-sh { fill: var(--rd-bone-sh); opacity: var(--rd-bone-sh-o); stroke: none; }
.tbu .rib-o { fill: none; stroke: var(--bone-ink); stroke-linecap: round; }
.tbu .rib-i { fill: none; stroke: var(--bone); stroke-linecap: round; }
.tbu .ghost { fill: none; stroke: var(--bone-ink); stroke-width: .8; opacity: .38; stroke-linecap: round; }
.tbu .skin { fill: none; stroke: var(--text-2); stroke-width: 1; opacity: .28; stroke-dasharray: 3 3; }
.tbu .bursa { fill: var(--bursa); stroke: color-mix(in srgb, var(--bursa) 55%, #102a44); stroke-width: .8; }
.tbu .cart { fill: var(--rd-cart); stroke: color-mix(in srgb, var(--rd-cart) 50%, #2c4a62); stroke-width: .75; }
.tbu .face { fill: color-mix(in srgb, var(--rd-cart) 55%, var(--bone)); stroke: color-mix(in srgb, var(--rd-cart) 40%, #2c4a62); stroke-width: .6; }
.tbu .nucleus { fill: color-mix(in srgb, var(--bursa) 55%, var(--rd-cart)); stroke: color-mix(in srgb, var(--bursa) 50%, #102a44); stroke-width: .6; }
.tbu .nerve { fill: var(--nerve); stroke: color-mix(in srgb, var(--nerve) 55%, #4a3600); stroke-width: .6; }
.tbu .inset-bg { fill: var(--surface); stroke: var(--border); stroke-width: 1; }
.tbu .cap-t { font-size: 10.5px; fill: var(--text-2); opacity: .8; font-weight: 600; letter-spacing: .02em; }
.tbu .note-t { font-size: 10.5px; fill: var(--text-2); font-weight: 600; }

.tbu .drop { fill: #1a0503; opacity: .2; stroke: none; }
.tbu .tone-deep .mus { fill: color-mix(in srgb, var(--muscle) 82%, #3a0805); }
.tbu .labrum { fill: color-mix(in srgb, var(--rd-cart) 62%, var(--bursa)); stroke: color-mix(in srgb, var(--bursa) 45%, #0e2a44); stroke-width: .9; }
.tbu .tbu-halo .drop { display: none; }

/* parts & highlight roles */
.tbu-part, .tbu-ctx { transition: opacity .25s ease; }
.tbu-part[role="button"] { cursor: pointer; outline: none; }
.tbu-part.is-dim { opacity: .22; }
.tbu-ctx.is-dim { opacity: .3; }
.tbu .is-injured .mus, .tbu .is-injured .ten, .tbu .is-injured .lig, .tbu .is-injured .cap, .tbu .is-injured .fascia,
.tbu .is-injured .bone, .tbu .is-injured .bursa, .tbu .is-injured .cart, .tbu .is-injured .nerve, .tbu .is-injured .nucleus {
  fill: var(--injured); stroke: var(--rd-inj-ink); opacity: 1; }
.tbu .is-injured .ol { stroke: var(--rd-inj-ink); stroke-width: 1.1; }
.tbu .is-injured .fib, .tbu .is-injured .ten-fib, .tbu .is-injured .bone-ln { stroke: #fff; opacity: .35; }
.tbu .is-injured .hi { opacity: .12; }
.tbu-halo { pointer-events: none; opacity: .5; animation: tbu-pulse 1.9s ease-in-out infinite; }
.tbu-halo * { fill: var(--injured) !important; stroke: var(--injured) !important; stroke-width: 5px !important; opacity: 1 !important; }
@keyframes tbu-pulse { 0%, 100% { opacity: .22; } 50% { opacity: .8; } }
.tbu .is-involved .mus { fill: color-mix(in srgb, var(--muscle) 74%, var(--rd-amber)); }
.tbu .is-involved .ol { stroke: var(--rd-amber); stroke-width: 1.7; }
.tbu .is-involved .bone, .tbu .is-involved .cart { fill: color-mix(in srgb, var(--bone) 72%, var(--rd-amber)); stroke: var(--rd-amber); stroke-width: 1.7; }
.tbu .is-involved .ten, .tbu .is-involved .lig, .tbu .is-involved .cap, .tbu .is-involved .fascia { fill: color-mix(in srgb, var(--tendon) 65%, var(--rd-amber)); stroke: var(--rd-amber); stroke-width: 1.5; }
.tbu .is-involved .bursa, .tbu .is-involved .nucleus, .tbu .is-involved .nerve { stroke: var(--rd-amber); stroke-width: 1.7; }
.tbu .is-muscle .mus { fill: var(--rd-vivid); }
.tbu .is-muscle .ol { stroke: color-mix(in srgb, var(--rd-vivid) 60%, #000); stroke-width: 1.1; }
.tbu .is-selected .ol, .tbu .is-selected .bone, .tbu .is-selected .ten, .tbu .is-selected .lig, .tbu .is-selected .cap,
.tbu .is-selected .bursa, .tbu .is-selected .cart, .tbu .is-selected .fascia, .tbu .is-selected .nerve {
  stroke: var(--text); stroke-width: 2.2; }
.tbu-part:focus-visible .ol, .tbu-part:focus-visible .bone, .tbu-part:focus-visible .ten, .tbu-part:focus-visible .bursa,
.tbu-part:focus-visible .cart, .tbu-part:focus-visible .cap, .tbu-part:focus-visible .fascia {
  stroke: var(--accent); stroke-width: 2.4; }

/* labels */
.tbu-lab { cursor: default; }
.tbu-lab[role="button"] { cursor: pointer; }
.tbu-lab text { font-size: 12.5px; font-weight: 500; fill: var(--text-2); paint-order: stroke; stroke: var(--surface);
  stroke-width: 3.2px; stroke-linejoin: round; }
.tbu-lab .ld { fill: none; stroke: var(--text-2); stroke-width: .75; opacity: .65; }
.tbu-lab .ldot { fill: var(--text-2); opacity: .85; }
.tbu-lab .lhit { fill: transparent; }
.tbu-lab.is-ctx text { fill: var(--text-2); opacity: .8; font-weight: 400; }
.tbu-lab.is-hl text { fill: var(--text); font-weight: 700; }
.tbu-lab.is-injured text { fill: var(--injured); font-weight: 700; }
.tbu-lab.is-injured .ld, .tbu-lab.is-injured .ldot { stroke: var(--injured); fill: var(--injured); opacity: 1; }
.tbu-lab.is-involved text { fill: color-mix(in srgb, var(--rd-amber) 62%, var(--text)); font-weight: 700; }
.tbu-lab.is-involved .ld, .tbu-lab.is-involved .ldot { stroke: var(--rd-amber); fill: var(--rd-amber); opacity: 1; }
.tbu-lab.is-dim { opacity: .3; }

/* pain-spot hotspots */
.tbu-spot { cursor: pointer; outline: none; }
.tbu-spot .s-hit { fill: transparent; }
.tbu-spot .s-ring { fill: var(--accent); opacity: .25; transform-box: fill-box; transform-origin: center;
  animation: tbu-ring 2.2s ease-out infinite; }
.tbu-spot .s-dot { fill: var(--accent); stroke: var(--surface); stroke-width: 2.2; }
.tbu-spot .s-sel { fill: none; stroke: var(--accent); stroke-width: 2.2; }
.tbu-spot.is-sel .s-dot { fill: var(--injured); }
.tbu-spot.is-sel .s-ring { fill: var(--injured); opacity: .3; }
.tbu-spot.is-sel .s-sel { stroke: var(--injured); }
.tbu-spot:focus-visible .s-sel { stroke: var(--text); stroke-width: 2.6; }
.tbu-spot .s-pill { fill: var(--injured); }
.tbu-spot .s-pill-t { font-size: 11.5px; font-weight: 700; fill: #fff; }
@keyframes tbu-ring { 0% { transform: scale(.55); opacity: .5; } 80%, 100% { transform: scale(1.5); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .tbu-halo { animation: none; opacity: .55; }
  .tbu-spot .s-ring { animation: none; opacity: .2; transform: none; }
  .tbu-part, .tbu-ctx { transition: none; }
}
`;

/* ══════════════════════════════════ React kit ══════════════════════════════════ */

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

const UidCtx = createContext('');

export function useCtx(p: RegionDiagramProps): Ctx {
  const raw = useId();
  const uid = `tbu${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
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
  const cls = `tbu-part${role ? ` is-${role}` : ''}${k.dim && !role ? ' is-dim' : ''}`;
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
        <g className="tbu-halo" filter={`url(#${k.uid}-glow)`} aria-hidden="true">
          {children}
        </g>
      )}
      {children}
    </g>
  );
}

/** Non-interactive context drawing (unlisted bones, skin outline…). Fades with dimOthers. */
export function Ctxt({ k, children }: { k: Ctx; children: ReactNode }) {
  return (
    <g className={`tbu-ctx${k.dim ? ' is-dim' : ''}`} aria-hidden="true">
      {children}
    </g>
  );
}

/** Draw pre-computed muscle geometry. `deep` darkens it slightly (deeper layer); `flat` skips the drop shadow. */
export function M({ g, ctx = false, deep = false, flat = false }: { g: MuscleGeo; ctx?: boolean; deep?: boolean; flat?: boolean }) {
  const uid = useContext(UidCtx);
  if (!ctx) {
    return (
      <g className={deep ? 'tone-deep' : undefined}>
        {!flat && uid && <path className="drop" d={g.body} filter={`url(#${uid}-sh)`} transform="translate(.9 1.6)" />}
        <MBody g={g} />
      </g>
    );
  }
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
  return null;
}

function MBody({ g }: { g: MuscleGeo }) {
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
      <path className="ol" d={g.body} />
    </>
  );
}

/** Rib-like bone drawn as a double stroke (outline + fill). */
export function Rib({ d, w = 6.5 }: { d: string; w?: number }) {
  return (
    <>
      <path className="rib-o" d={d} strokeWidth={w + 1.8} />
      <path className="rib-i" d={d} strokeWidth={w} />
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
}

export interface Spot {
  id: PainSpotId;
  at: readonly number[];
}

const FS = 12.5; // label font size (user units ≈ 11.5 CSS px at 390 px viewport)
const LH = 14.5;

function Label({ k, l }: { k: Ctx; l: Lab }) {
  const lines = l.t.split('\n');
  const a = l.a ?? 'start';
  const role = l.id ? k.hl[l.id] : undefined;
  const cls = `tbu-lab${!l.id ? ' is-ctx' : ''}${role ? ` is-hl is-${role}` : ''}${k.dim && !role ? ' is-dim' : ''}`;
  const w = Math.max(...lines.map((s) => [...s].length)) * FS;
  const h = lines.length * LH;
  const midY = l.y - 4.5 + ((lines.length - 1) * LH) / 2;
  const tip =
    a === 'end' ? [l.x + 3, midY] : a === 'start' ? [l.x - 3, midY] : l.at[1] < l.y ? [l.x, l.y - FS] : [l.x, l.y + 4 + (lines.length - 1) * LH];
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
      <path className="ld" d={`M${xy(l.at)}L${xy(tip)}`} />
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
      className={`tbu-spot${sel ? ' is-sel' : ''}`}
      transform={`translate(${fmt(s.at[0])} ${fmt(s.at[1])})`}
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
  /** drawn above the labels (e.g. an inset) */
  overlay?: ReactNode;
  /** soft fade of the drawing at the [top, bottom] edges (user units) */
  fade?: [number, number];
  /** soft fade at the [left, right] edges */
  fadeX?: [number, number];
  /** extra <defs> (masks / clip paths), given the diagram's unique id prefix */
  defs?: (uid: string) => ReactNode;
}

/** Root <svg> of a region diagram: styles, glow filter, drawing, labels, hotspots. */
export function Frame({ k, p, w, h, title, cap, labels, spots, children, overlay, fade, fadeX, defs }: FrameProps) {
  const showLabels = p.showLabels ?? true;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`tbu${p.className ? ` ${p.className}` : ''}`}
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
        <filter id={`${k.uid}-sh`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        {fade && (
          <>
            <linearGradient id={`${k.uid}-fg`} x1="0" y1="0" x2="0" y2={h} gradientUnits="userSpaceOnUse">
              <stop offset={0} stopColor="#000" />
              <stop offset={fade[0] / h} stopColor="#fff" />
              <stop offset={1 - fade[1] / h} stopColor="#fff" />
              <stop offset={1} stopColor="#000" />
            </linearGradient>
            <mask id={`${k.uid}-fade`} maskUnits="userSpaceOnUse" x={-20} y={0} width={w + 40} height={h}>
              <rect x={-20} y={0} width={w + 40} height={h} fill={`url(#${k.uid}-fg)`} />
            </mask>
          </>
        )}
        {fadeX && (
          <>
            <linearGradient id={`${k.uid}-fgx`} x1="0" y1="0" x2={w} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset={0} stopColor="#000" />
              <stop offset={fadeX[0] / w} stopColor="#fff" />
              <stop offset={1 - fadeX[1] / w} stopColor="#fff" />
              <stop offset={1} stopColor="#000" />
            </linearGradient>
            <mask id={`${k.uid}-fadex`} maskUnits="userSpaceOnUse" x={0} y={-20} width={w} height={h + 40}>
              <rect x={0} y={-20} width={w} height={h + 40} fill={`url(#${k.uid}-fgx)`} />
            </mask>
          </>
        )}
        {defs?.(k.uid)}
      </defs>
      <g mask={fade ? `url(#${k.uid}-fade)` : undefined}>
        <g mask={fadeX ? `url(#${k.uid}-fadex)` : undefined}>
          <UidCtx.Provider value={k.uid}>{children}</UidCtx.Provider>
        </g>
      </g>
      <UidCtx.Provider value={k.uid}>{overlay}</UidCtx.Provider>
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
        <g className="tbu-labels">
          {labels.map((l, i) => (
            <Label key={i} k={k} l={l} />
          ))}
        </g>
      )}
      {p.showSpots && (
        <g className="tbu-spots">
          {spots.map((s) => (
            <SpotMark key={s.id} s={s} sel={p.selectedSpot === s.id} onSel={p.onSpotSelect} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** Thoracic / lumbar vertebra seen from behind: lamina + transverse processes + spinous process. */
export function vertPost(cx: number, cy: number, o: { tp?: number; tpY?: number; sp?: number; w?: number; spW?: number } = {}): string {
  const tp = o.tp ?? 30;
  const ty = o.tpY ?? -9;
  const spl = o.sp ?? 22;
  const w = o.w ?? 12;
  const sw = o.spW ?? 4;
  const right: P[] = [
    [w * 0.5, -9],
    [w, -8],
    [w + 5, ty - 1],
    [tp - 4, ty - 2.5],
    [tp, ty],
    [tp, ty + 5],
    [tp - 4, ty + 7],
    [w + 5, ty + 9],
    [w, 6],
    [sw + 1, 8],
    [sw, spl - 5],
    [0, spl, 1],
  ];
  const left: P[] = right
    .slice(0, -1)
    .reverse()
    .map((q) => [-q[0], q[1]] as P);
  const pts: P[] = [[0, -7, 1], ...right, ...left].map((q) => (q[2] ? [cx + q[0], cy + q[1], 1] : [cx + q[0], cy + q[1]]) as P);
  return sp(pts, true);
}

/** Just the spinous process (to draw on top of muscles that arise from it). */
export function spinePost(cx: number, cy: number, spl = 22, sw = 4): string {
  return sp(
    [
      [cx - sw - 1, cy + 2],
      [cx + sw + 1, cy + 2],
      [cx + sw, cy + spl - 5],
      [cx, cy + spl, 1],
      [cx - sw, cy + spl - 5],
    ],
    true,
  );
}

/* ══════════════════════════════════ SHOULDER ══════════════════════════════════ */
// Shared canvas for all four views (≈ 10 units per cm).
const W = 360;
const H = 420;

/* ───────────── posterior views (person's right shoulder; midline on the viewer's left) ───────────── */
const MX = 78; // midline (spinous processes)
const TV = [56, 78, 100, 122, 144, 166, 188, 210, 232, 254, 276, 298, 320, 342, 364]; // T1… vertebra centres

const B = {
  spine: TV.map((y, i) => vertPost(MX, y, { tp: 29 - i * 0.5, sp: 22, w: 11, spW: 3.2 })).join(''),
  cerv: [vertPost(MX, 12, { tp: 25, sp: 16, tpY: -6, spW: 3 }), vertPost(MX, 34, { tp: 27, sp: 20, tpY: -7, spW: 3.2 })].join(''),
  spinous: TV.map((y) => spinePost(MX, y, 22, 3.2)).join('') + spinePost(MX, 34, 20, 3.2),
  ribsR: TV.slice(0, 11)
    .map((y, i) => {
      const k = Math.min(1, 0.55 + i * 0.09);
      return sp(
        [
          [MX + 27, y - 9],
          [MX + 46, y - 6 + 2 * k],
          [MX + 48 + 34 * k, y + 8 * k],
          [MX + 48 + 66 * k, y + 28 * k],
          [MX + 48 + 92 * k, y + 54 * k],
          [MX + 48 + 104 * k, y + 80 * k],
        ],
        false,
      );
    })
    .join(''),
  ribsL: TV.slice(0, 11)
    .map((y) => sp(PS(`${MX - 27},${y - 9} ${MX - 46},${y - 5} ${MX - 72},${y + 8} ${MX - 90},${y + 22}`), false))
    .join(''),
  scap: sp(PS('126,90,1 148,89 166,92 176,98 184,95 195,91 205,96 211,108 213,124 211,138 205,147 195,156 181,170 165,188 149,204 134,221,1 126,199 120,172 117,146 116,124 120,104')),
  scapSh: sp(PS('128,132 160,128 196,122 204,132 196,150 170,176 146,200 134,210 125,190 121,160')),
  /** spine of the scapula (ridge) */
  sspine: sp(PS('115,117,1 140,110 166,103 192,97 214,95 216,106 209,115 184,119 156,123 130,128 118,129,1')),
  sspineSh: sp(PS('122,126 152,122 182,117 208,113 206,117 182,120 152,124 124,129')),
  sspineLn: sp(PS('122,120 150,115 180,109 206,103'), false),
  acromion: sp(PS('208,95 222,88 238,87 249,93 252,102 245,111,1 227,113 210,114')),
  acrLn: sp(PS('216,102 232,99 246,101'), false),
  humerus: sp(PS('226,106 240,107 251,113 257,125 256,140 252,152 251,178 255,212 252,242 250,300 249,440 224,440 224,300 222,220 219,172 214,157 208,147 206,130 210,115')),
  humLn: sp(PS('243,108 252,128 246,148'), false),
};

/** muscles of the posterior views */
const MB = {
  supra: muscle({ o: PS('128,93 122,106 118,117'), i: PS('230,104 236,110'), c: PS('172,80 170,96 172,108'), t1: 0.8, n: 8 }),
  infra: muscle({
    o: PS('121,131 117,150 119,172 125,198'),
    i: PS('247,122 250,128 252,134 252,139'),
    c: PS('186,119 184,136 180,154 184,170'),
    t1: [0.84, 0.82, 0.8, 0.8],
    n: 13,
  }),
  tminor: muscle({ o: PS('194,152 176,174 156,200'), i: PS('251,138 251,148'), c: PS('224,142 214,160 206,186'), t1: 0.8, n: 7 }),
  tmajor: muscle({ o: PS('150,200 136,224'), i: PS('213,170 213,192'), c: PS('184,186 178,216'), n: 7 }),
  triLat: muscle({ o: PS('228,156 244,152 255,170'), i: PS('232,430 254,430'), c: PS('222,260 246,262 268,272'), n: 9 }),
  triLong: muscle({ o: PS('203,146 209,150'), i: PS('214,430 234,430'), c: PS('193,250 232,250'), t0: 0.11, n: 8 }),
  levator: muscle({ o: PS('112,-14 99,-14'), i: PS('127,90 118,117'), c: PS('128,40 104,58'), n: 6 }),
  rhMinor: muscle({ o: PS('82,28 82,54'), i: PS('124,96 118,116'), t0: 0.08, n: 5 }),
  rhMajor: muscle({ o: PS('82,66 82,110 82,158'), i: PS('117,124 118,172 133,216'), t0: 0.07, n: 12 }),
  lat: muscle({
    o: PS('82,194 82,250 82,310 86,372 116,436 184,446 226,436'),
    i: PS('200,184 201,188 202,192 203,196 204,200 205,204 206,208'),
    c: PS('140,204 138,236 142,276 150,316 166,346 198,340 222,312'),
    t0: [0.04, 0.06, 0.1, 0.14, 0.16, 0.06, 0.02],
    t1: 0.92,
    n: 18,
  }),
  trap: muscle({
    o: PS('82,-14 82,44 82,88 82,140 82,220 82,300'),
    i: PS('190,72 226,90 206,99 166,108 133,117 121,123'),
    c: PS('138,8 152,60 142,92 122,124 104,168 98,212'),
    t0: [0, 0.1, 0.13, 0.06, 0.04, 0.06],
    t1: [1, 1, 1, 1, 0.9, 0.8],
    n: 18,
  }),
  deltoid: muscle({
    o: PS('140,127 164,123 190,119 214,115 240,112 251,102'),
    i: PS('246,226 249,222 251,219 253,216 255,213 257,210'),
    c: PS('182,198 200,182 220,170 240,160 262,152 278,146'),
    t1: 0.92,
    n: 15,
  }),
};

const CAPSULE_B = sp(PS('211,104 224,101 238,105 249,114 253,130 249,148 238,160 226,170 214,166 209,150 207,128'));
const CAPSULE_B_LN = [
  sp(PS('214,110 232,108 246,118'), false),
  sp(PS('212,128 232,126 250,132'), false),
  sp(PS('212,146 228,150 244,148'), false),
  sp(PS('214,160 226,162 236,157'), false),
].join('');

function BackView({ k, deep }: { k: Ctx; deep: boolean }) {
  return (
    <>
      <Ctxt k={k}>
        <g opacity={0.5}>
          <Rib d={B.ribsL} w={6} />
        </g>
        <Rib d={B.ribsR} w={6.5} />
        <path className="bone" d={B.cerv} />
      </Ctxt>
      <Part k={k} id="thoracic-spine">
        <path className="bone" d={B.spine} />
      </Part>
      <Part k={k} id="scapula">
        <path className="bone" d={B.scap} />
        <path className="bone-sh" d={B.scapSh} />
      </Part>
      <Ctxt k={k}>
        <M g={MB.tmajor} deep />
        <path className="bone" d={B.humerus} />
        <path className="bone-ln" d={B.humLn} />
      </Ctxt>
      {!deep && (
        <Part k={k} id="latissimus-dorsi">
          <M g={MB.lat} />
        </Part>
      )}
      <Part k={k} id="triceps-brachii">
        <M g={MB.triLat} />
        <M g={MB.triLong} />
      </Part>
      {deep && (
        <Part k={k} id="posterior-capsule">
          <path className="cap" d={CAPSULE_B} />
          <path className="ten-fib" d={CAPSULE_B_LN} />
        </Part>
      )}
      <Part k={k} id="teres-minor">
        <M g={MB.tminor} />
      </Part>
      <Part k={k} id="infraspinatus">
        <M g={MB.infra} />
      </Part>
      {deep && (
        <Part k={k} id="supraspinatus">
          <M g={MB.supra} deep />
        </Part>
      )}
      <Part k={k} id="scapula">
        <path className="bone" d={B.sspine} />
        <path className="bone-sh" d={B.sspineSh} />
        <path className="bone-ln" d={B.sspineLn} />
      </Part>
      <Part k={k} id="acromion">
        <path className="bone" d={B.acromion} />
        <path className="bone-ln" d={B.acrLn} />
      </Part>
      {deep && (
        <>
          <Part k={k} id="levator-scapulae">
            <M g={MB.levator} />
          </Part>
          <Part k={k} id="rhomboids">
            <M g={MB.rhMinor} />
            <M g={MB.rhMajor} />
          </Part>
        </>
      )}
      {!deep && (
        <>
          <Part k={k} id="trapezius">
            <M g={MB.trap} />
          </Part>
          <Part k={k} id="deltoid">
            <M g={MB.deltoid} />
          </Part>
        </>
      )}
      <Part k={k} id="thoracic-spine">
        <path className="bone" d={B.spinous} />
      </Part>
    </>
  );
}

const LABELS_BACK: Lab[] = [
  { id: 'trapezius', t: '僧帽筋', at: [140, 60], x: 168, y: 40 },
  { id: 'acromion', t: '肩峰', at: [240, 94], x: 268, y: 72 },
  { id: 'deltoid', t: '三角筋', at: [246, 160], x: 272, y: 150 },
  { id: 'infraspinatus', t: '棘下筋', at: [176, 150], x: 272, y: 186 },
  { id: 'teres-minor', t: '小円筋', at: [206, 170], x: 272, y: 206 },
  { id: 'triceps-brachii', t: '上腕三頭筋', at: [242, 300], x: 272, y: 300 },
  { id: 'latissimus-dorsi', t: '広背筋', at: [120, 330], x: 40, y: 334, a: 'end' },
  { id: 'thoracic-spine', t: '胸椎', at: [MX, 254], x: 40, y: 258, a: 'end' },
];
const LABELS_BACK_DEEP: Lab[] = [
  { id: 'levator-scapulae', t: '肩甲挙筋', at: [114, 36], x: 150, y: 34 },
  { id: 'supraspinatus', t: '棘上筋', at: [166, 98], x: 186, y: 62 },
  { id: 'acromion', t: '肩峰', at: [240, 94], x: 268, y: 72 },
  { id: 'infraspinatus', t: '棘下筋', at: [196, 134], x: 272, y: 112 },
  { id: 'posterior-capsule', t: '後方関節包', at: [228, 162], x: 272, y: 168 },
  { id: 'teres-minor', t: '小円筋', at: [206, 168], x: 272, y: 192 },
  { t: '大円筋', at: [190, 196], x: 272, y: 216 },
  { id: 'triceps-brachii', t: '上腕三頭筋', at: [242, 300], x: 272, y: 300 },
  { id: 'scapula', t: '肩甲骨', at: [140, 116], x: 40, y: 120, a: 'end' },
  { id: 'rhomboids', t: '菱形筋', at: [100, 150], x: 40, y: 170, a: 'end' },
  { id: 'thoracic-spine', t: '胸椎', at: [MX, 254], x: 40, y: 258, a: 'end' },
];
const SPOTS_BACK: Spot[] = [
  { id: 'shoulder-top', at: [206, 86] },
  { id: 'shoulder-back', at: [236, 148] },
  { id: 'scapula-medial', at: [104, 160] },
];

/* ───────────── anterior views (person's right shoulder; midline on the viewer's right) ───────────── */

/** Anterior ribs 1–10: lateral point, costochondral junction, sternal / costal-margin end. */
const RIB_F: [XY, XY, XY][] = [
  [[176, 86], [232, 93], [283, 88]],
  [[166, 106], [228, 115], [284, 101]],
  [[158, 128], [226, 137], [284, 119]],
  [[152, 150], [224, 159], [284, 139]],
  [[148, 174], [222, 183], [284, 159]],
  [[146, 198], [220, 207], [284, 179]],
  [[146, 222], [216, 233], [284, 198]],
  [[148, 248], [210, 259], [272, 216]],
  [[150, 274], [204, 285], [258, 236]],
  [[154, 300], [198, 311], [244, 258]],
];

/** Arm abduction used by the front views (pivot = humeral head centre). */
const ABD = 10;
const ab = (pts: readonly P[], f = 1) => rotP(pts, ABD * f, 130, 104);

const F = {
  sternum: sp(PS('284,74 300,74 304,84 300,102 302,200 298,236 292,254,1 286,236 282,200 284,102 280,84')),
  sternLn: sp(PS('284,103 300,103'), false),
  ribs: RIB_F.map(([L, C, S]) => sp([L, [(L[0] + C[0]) / 2, (L[1] + C[1]) / 2 + 5], C, S], false)).join(''),
  clav: tube(PS('286,81 262,79 232,77 204,74 178,70 158,66 147,66'), [14, 11, 10, 9.5, 9, 10, 11]),
  clavLn: sp(PS('276,82 240,79 205,76 170,70'), false),
  acromion: sp(PS('150,61 136,57 122,57 113,62 113,69 120,73 134,73 148,72')),
  coracoid: sp(PS('190,86 184,78 172,75 162,79 155,88 151,98 154,105,1 161,101 165,93 172,87 181,89')),
  scap: sp(PS('232,80,1 214,82 198,84 190,89 180,86 168,88 158,86 153,92 151,106 153,120 158,128 167,150 182,180 200,208 221,237,1 227,200 230,160 232,120')),
  scapSh: sp(PS('166,132 196,120 224,110 226,170 220,220 200,200 178,168')),
  head: sp(ab(PS('126,82 140,84 150,93 154,106 150,120 142,129 134,134 124,134 114,132 107,124 104,110 106,96 114,86'))),
  shaft: sp(ab(PS('136,128 136,150 133,200 130,260 126,440 100,440 103,300 104,246 103,236 106,180 107,140 108,128'))),
  grooveLn: sp(ab(PS('118,104 118,130 117,170')), false) + sp(ab(PS('126,108 127,132 125,170')), false),
  headLn: sp(ab(PS('140,87 130,100 131,122 140,131')), false),
};

/** Arm silhouette filled with deep muscle tone so the superficial arm muscles read as one limb. */
const ARM_UNDER = sp(ab(PS('104,136 98,180 96,236 92,300 92,430 152,430 156,300 160,220 158,170 150,140')));

const MF = {
  trap: muscle({ o: PS('214,-14 246,-14'), i: PS('138,60 196,71'), c: PS('200,30 236,46'), n: 9 }),
  scm: muscle({ o: PS('288,82 268,80'), i: PS('244,-14 232,-14'), c: PS('270,30 252,34'), t0: 0.08, n: 6 }),
  pecMajor: muscle({
    o: PS('192,78 236,80 278,84 289,112 289,150 287,192 276,218'),
    i: ab(PS('115,146 116,152 117,158 118,164 119,170 120,175 121,180')),
    c: PS('150,116 180,112 198,122 204,140 202,166 196,196 192,224'),
    t1: [0.88, 0.89, 0.9, 0.9, 0.9, 0.9, 0.9],
    seams: [0.27],
    n: 22,
  }),
  pecMinor: muscle({ o: PS('206,132 214,156 214,182'), i: PS('155,101 160,106'), c: PS('184,108 188,128 188,148'), t1: 0.86, n: 9 }),
  deltoid: muscle({
    o: PS('190,77 170,74 150,73 132,74 117,71 111,64'),
    i: ab(PS('108,240 107,238 106,236 105,234 104,232 103,230')),
    c: ab(PS('143,143 128,126 114,116 100,112 80,118 62,122'), 0.5),
    t1: 0.95,
    n: 16,
  }),
  biLong: muscle({ o: ab(PS('118,146 123,146')), i: ab(PS('110,410 124,410')), c: ab(PS('92,272 126,272')), t0: 0.14, n: 6 }),
  biShort: muscle({ o: PS('154,103 159,106'), i: ab(PS('124,410 138,410')), c: ab(PS('114,250 152,258'), 0.8), t0: 0.12, n: 6 }),
  brachialis: muscle({ o: ab(PS('104,232 112,236')), i: ab(PS('102,410 114,410')), c: ab(PS('88,320 112,320')), n: 4 }),
  triceps: muscle({ o: ab(PS('148,146 156,154')), i: ab(PS('138,410 150,410')), c: ab(PS('152,280 168,280')), n: 4 }),
  lat: muscle({ o: PS('144,430 166,430'), i: ab(PS('138,158 147,172')), c: PS('138,280 172,296'), t1: 0.88, n: 7 }),
  subscap: muscle({
    o: PS('228,88 229,130 227,170 224,206 220,230'),
    i: ab(PS('132,110 133,116 134,122 135,128 135,134')),
    c: PS('188,92 186,122 182,150 174,176 168,196'),
    t1: [0.74, 0.76, 0.78, 0.8, 0.8],
    n: 14,
  }),
  supra: muscle({ o: PS('228,78 226,94'), i: ab(PS('110,86 113,95')), c: PS('170,72 168,92'), t1: 0.55, n: 5 }),
};

/** Serratus anterior: one finger-like slip per rib (4th–9th), pointed tip on the rib, running back-up under the lat. */
const SERRATUS = [4, 5, 6, 7, 8, 9].map((r, j) => {
  const [L, C] = RIB_F[r - 1];
  const xt = 206 - j * 2.5;
  const yt = L[1] + ((C[1] - L[1]) * (xt - L[0])) / (C[0] - L[0]) + 3;
  const xp = 150;
  const yp = yt - 22 - j * 1.5;
  return muscle({
    o: [
      [xt, yt - 3],
      [xt + 1, yt + 3],
    ],
    i: [
      [xp, yp - 11],
      [xp, yp + 12],
    ],
    c: [
      [(xt + xp) / 2 + 2, yt - 19 - j],
      [(xt + xp) / 2 + 4, yt - 2],
    ],
    t0: 0.1,
    n: 5,
  });
}).reverse();

const BURSA_F = sp(PS('158,76 140,73 120,74 105,81 99,95 101,110 107,112 109,98 116,89 132,84 150,84'));
const CA_LIG = tube(PS('158,92 146,80 132,74'), [7, 6, 8]);
const LHB_TENDON = tube([...PS('154,86 142,83 130,86'), ...ab(PS('122,95 119,110 119,130 119,158 119,178'))], [4.6, 4.6, 4.8, 5, 5, 5, 5, 5.5]);
const TRANSVERSE_LIG = tube(ab(PS('113,124 127,126')), 4);

/** Inset: the right glenoid seen face-on from the side (humerus removed): labrum ring + biceps anchor. */
const INSET = { cx: 304, cy: 350, r: 48 };
const GLEN = (() => {
  const { cx, cy } = INSET;
  const pear = (s: number, dy = 6): P[] =>
    PS('0,-24 7,-21 11,-10 15,5 14,17 8,24 0,26 -8,24 -14,17 -15,5 -11,-10 -7,-21').map(
      ([x, y]) => [cx + x * s, cy + dy + y * s] as P,
    );
  const at = (s: string) => PS(s).map(([x, y]) => [cx + x, cy + y] as P);
  return {
    rim: sp(pear(1.32)),
    face: sp(pear(0.96)),
    acromion: sp(at('-40,-14 -34,-32 -18,-42 4,-42 16,-36 12,-30 -6,-34 -22,-28 -30,-10')),
    coracoid: sp(at('12,-24 22,-34 34,-32 40,-22 36,-18 28,-24 20,-18')),
    body: sp(at('-26,44 -22,18 -20,-6 -12,-24 14,-24 20,-4 22,18 26,44'), false),
    biceps: tube(at('0,-26 4,-36 12,-46 22,-48'), [5.5, 5, 5, 5]),
  };
})();

function FrontView({ k, deep }: { k: Ctx; deep: boolean }) {
  return (
    <>
      <Ctxt k={k}>
        <g opacity={deep ? 0.42 : 0.5}>
          <Rib d={F.ribs} w={5.5} />
        </g>
        <path className="bone" d={F.sternum} />
        <path className="bone-ln" d={F.sternLn} />
      </Ctxt>
      {deep && (
        <>
          <Part k={k} id="scapula">
            <path className="bone" d={F.scap} />
            <path className="bone-sh" d={F.scapSh} />
          </Part>
          <Part k={k} id="subscapularis">
            <M g={MF.subscap} deep />
          </Part>
        </>
      )}
      {!deep && (
        <Part k={k} id="serratus-anterior">
          {SERRATUS.map((g, i) => (
            <M key={i} g={g} />
          ))}
        </Part>
      )}
      {!deep && (
        <>
          <Part k={k} id="triceps-brachii">
            <M g={MF.triceps} />
          </Part>
          <Part k={k} id="latissimus-dorsi">
            <M g={MF.lat} />
          </Part>
        </>
      )}
      {!deep && (
        <Ctxt k={k}>
          <g className="tone-deep">
            <path className="mus" d={ARM_UNDER} />
          </g>
        </Ctxt>
      )}
      {deep && (
        <>
          <Ctxt k={k}>
            <path className="bone" d={F.shaft} />
          </Ctxt>
          <Part k={k} id="humeral-head">
            <path className="bone" d={F.head} />
            <path className="bone-ln" d={F.grooveLn} />
            <path className="bone-ln" d={F.headLn} />
          </Part>
          <Part k={k} id="supraspinatus">
            <M g={MF.supra} deep />
          </Part>
          <Part k={k} id="subacromial-bursa">
            <path className="bursa" d={BURSA_F} />
          </Part>
          <Part k={k} id="scapula">
            <path className="bone" d={F.coracoid} />
          </Part>
          <Part k={k} id="pectoralis-minor">
            <M g={MF.pecMinor} />
          </Part>
        </>
      )}
      {!deep && (
        <Ctxt k={k}>
          <M g={MF.brachialis} />
        </Ctxt>
      )}
      <Part k={k} id="biceps-brachii">
        <M g={MF.biShort} />
        <M g={MF.biLong} />
      </Part>
      {deep && (
        <>
          <Part k={k} id="biceps-long-head-tendon">
            <path className="ten" d={LHB_TENDON} />
          </Part>
          <Ctxt k={k}>
            <path className="lig" d={TRANSVERSE_LIG} />
            <path className="lig" d={CA_LIG} />
          </Ctxt>
        </>
      )}
      {!deep && (
        <>
          <Part k={k} id="pectoralis-major">
            <M g={MF.pecMajor} />
          </Part>
          <Ctxt k={k}>
            <M g={MF.scm} ctx />
          </Ctxt>
          <Part k={k} id="trapezius">
            <M g={MF.trap} />
          </Part>
        </>
      )}
      <Part k={k} id="acromion">
        <path className="bone" d={F.acromion} />
      </Part>
      {!deep && (
        <Part k={k} id="deltoid">
          <M g={MF.deltoid} />
        </Part>
      )}
      <Ctxt k={k}>
        <path className="bone" d={F.clav} />
        <path className="bone-ln" d={F.clavLn} />
      </Ctxt>
    </>
  );
}

function GlenoidInset({ k }: { k: Ctx }) {
  const { cx, cy, r } = INSET;
  return (
    <g>
      <circle className="inset-bg" cx={cx} cy={cy} r={r} />
      <Ctxt k={k}>
        <path className="ghost" d={GLEN.body} />
        <path className="bone" d={GLEN.acromion} />
        <path className="bone" d={GLEN.coracoid} />
      </Ctxt>
      <Part k={k} id="glenoid-labrum">
        <path className="labrum" d={GLEN.rim} />
      </Part>
      <Ctxt k={k}>
        <path className="face" d={GLEN.face} />
      </Ctxt>
      <Part k={k} id="biceps-long-head-tendon">
        <path className="ten" d={GLEN.biceps} />
      </Part>
      <text className="note-t" x={cx} y={cy + r + 13} textAnchor="middle">
        関節窩を横から
      </text>
    </g>
  );
}

const LABELS_FRONT: Lab[] = [
  { id: 'acromion', t: '肩峰', at: [124, 62], x: 92, y: 44, a: 'end' },
  { id: 'trapezius', t: '僧帽筋', at: [192, 44], x: 172, y: 30, a: 'end' },
  { id: 'deltoid', t: '三角筋', at: [90, 150], x: 64, y: 150, a: 'end' },
  { id: 'biceps-brachii', t: '上腕二頭筋', at: [90, 262], x: 65, y: 246, a: 'end' },
  { t: '鎖骨', at: [250, 78], x: 306, y: 60 },
  { id: 'pectoralis-major', t: '大胸筋', at: [236, 150], x: 306, y: 150 },
  { id: 'serratus-anterior', t: '前鋸筋', at: [192, 252], x: 306, y: 256 },
  { id: 'latissimus-dorsi', t: '広背筋', at: [152, 330], x: 306, y: 330 },
];
const LABELS_DEEP: Lab[] = [
  { id: 'acromion', t: '肩峰', at: [124, 62], x: 92, y: 44, a: 'end' },
  { id: 'subacromial-bursa', t: '肩峰下\n滑液包', at: [102, 96], x: 70, y: 82, a: 'end' },
  { id: 'humeral-head', t: '上腕骨頭', at: [106, 116], x: 70, y: 132, a: 'end' },
  { id: 'biceps-long-head-tendon', t: '上腕二頭筋\n長頭腱', at: [110, 160], x: 70, y: 170, a: 'end' },
  { id: 'biceps-brachii', t: '上腕二頭筋', at: [90, 262], x: 65, y: 246, a: 'end' },
  { id: 'supraspinatus', t: '棘上筋', at: [196, 88], x: 214, y: 40 },
  { t: '鎖骨', at: [262, 79], x: 306, y: 60 },
  { id: 'pectoralis-minor', t: '小胸筋', at: [192, 134], x: 306, y: 122 },
  { id: 'subscapularis', t: '肩甲下筋', at: [214, 196], x: 306, y: 182 },
  { id: 'scapula', t: '肩甲骨', at: [216, 228], x: 306, y: 212 },
  { id: 'glenoid-labrum', t: '関節唇', at: [INSET.cx - 19, INSET.cy + 22], x: 246, y: 392, a: 'end' },
];
const SPOTS_FRONT: Spot[] = [
  { id: 'shoulder-top', at: [124, 76] },
  { id: 'shoulder-front', at: [118, 150] },
];

/* ───────────── component & export ───────────── */

const VIEWS = [
  { id: 'front', label: '前から' },
  { id: 'deep', label: '前・深層' },
  { id: 'back', label: '後ろから' },
  { id: 'back-deep', label: '後ろ・深層' },
];

function ShoulderDiagram(p: RegionDiagramProps) {
  const k = useCtx(p);
  const view = VIEWS.some((v) => v.id === p.view) ? (p.view as string) : 'front';
  if (view === 'front' || view === 'deep') {
    const deep = view === 'deep';
    return (
      <Frame
        k={k}
        p={p}
        w={W}
        h={H}
        title={deep ? '右肩を前から見た図（三角筋・大胸筋を外した深層）' : '右肩を前から見た図'}
        cap={[deep ? '右肩・前から（深層）' : '右肩・前から', '体の中心 →']}
        labels={deep ? LABELS_DEEP : LABELS_FRONT}
        spots={SPOTS_FRONT}
        overlay={deep ? <GlenoidInset k={k} /> : undefined}
        fade={[34, 46]}
      >
        <FrontView k={k} deep={deep} />
      </Frame>
    );
  }
  const deep = view === 'back-deep';
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title={deep ? '右肩を後ろから見た図（僧帽筋・三角筋を外した深層）' : '右肩を後ろから見た図'}
      cap={['← 体の中心', deep ? '右肩・後ろから（深層）' : '右肩・後ろから']}
      labels={deep ? LABELS_BACK_DEEP : LABELS_BACK}
      spots={SPOTS_BACK}
      fade={[30, 46]}
    >
      <BackView k={k} deep={deep} />
    </Frame>
  );
}

const diagram: RegionDiagram = {
  region: 'shoulder',
  views: VIEWS,
  parts: {
    front: ['deltoid', 'pectoralis-major', 'biceps-brachii', 'triceps-brachii', 'serratus-anterior', 'latissimus-dorsi', 'trapezius', 'acromion'],
    deep: [
      'supraspinatus',
      'subscapularis',
      'pectoralis-minor',
      'biceps-long-head-tendon',
      'subacromial-bursa',
      'glenoid-labrum',
      'humeral-head',
      'acromion',
      'scapula',
      'biceps-brachii',
    ],
    back: ['trapezius', 'deltoid', 'latissimus-dorsi', 'infraspinatus', 'teres-minor', 'triceps-brachii', 'acromion', 'scapula', 'thoracic-spine'],
    'back-deep': [
      'supraspinatus',
      'infraspinatus',
      'teres-minor',
      'posterior-capsule',
      'rhomboids',
      'levator-scapulae',
      'triceps-brachii',
      'acromion',
      'scapula',
      'thoracic-spine',
    ],
  },
  spots: {
    front: ['shoulder-top', 'shoulder-front'],
    deep: ['shoulder-top', 'shoulder-front'],
    back: ['shoulder-top', 'shoulder-back', 'scapula-medial'],
    'back-deep': ['shoulder-top', 'shoulder-back', 'scapula-medial'],
  },
  Component: ShoulderDiagram,
};

export default diagram;
