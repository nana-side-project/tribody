// Small curve toolkit for the hand-authored body-map artwork.
// Shapes are written as lists of control points and turned into smooth cubic Béziers
// with a centripetal Catmull–Rom spline (no cusps / overshoot even with uneven spacing).
// Contour lines are rendered as *tapered* filled strokes, which reads much more like a
// pen illustration than uniform-width strokes.

export type Pt = readonly [number, number];
/** A control point; a third element `1` marks a sharp corner (tangent is broken there). */
export type CPt = readonly [number, number] | readonly [number, number, 1];

const r1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (p: Pt) => `${r1(p[0])} ${r1(p[1])}`;

type Seg = [Pt, Pt, Pt, Pt]; // start, c1, c2, end

function dist(a: Pt, b: Pt) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Control points of the centripetal Catmull–Rom segment p1→p2 (neighbours p0, p3). */
function crSegment(p0: Pt, p1: Pt, p2: Pt, p3: Pt, alpha = 0.5): Seg {
  const d1 = Math.pow(dist(p0, p1), alpha);
  const d2 = Math.pow(dist(p1, p2), alpha);
  const d3 = Math.pow(dist(p2, p3), alpha);
  let c1: Pt = p1;
  let c2: Pt = p2;
  if (d1 > 1e-6 && d2 > 1e-6) {
    const a = d1 * d1;
    const b = d2 * d2;
    const k = 2 * a + 3 * d1 * d2 + b;
    const den = 3 * d1 * (d1 + d2);
    c1 = [(a * p2[0] - b * p0[0] + k * p1[0]) / den, (a * p2[1] - b * p0[1] + k * p1[1]) / den];
  } else if (d2 > 1e-6) {
    // no incoming tangent (corner / open end): aim one third towards p2
    c1 = [p1[0] + (p2[0] - p1[0]) / 3, p1[1] + (p2[1] - p1[1]) / 3];
  }
  if (d3 > 1e-6 && d2 > 1e-6) {
    const a = d3 * d3;
    const b = d2 * d2;
    const k = 2 * a + 3 * d3 * d2 + b;
    const den = 3 * d3 * (d3 + d2);
    c2 = [(a * p1[0] - b * p3[0] + k * p2[0]) / den, (a * p1[1] - b * p3[1] + k * p2[1]) / den];
  } else if (d2 > 1e-6) {
    c2 = [p2[0] - (p2[0] - p1[0]) / 3, p2[1] - (p2[1] - p1[1]) / 3];
  }
  return [p1, c1, c2, p2];
}

function toSegments(pts: readonly CPt[], closed: boolean): Seg[] {
  const n = pts.length;
  const P = (i: number): Pt => {
    if (closed) {
      const p = pts[((i % n) + n) % n];
      return [p[0], p[1]];
    }
    if (i < 0) {
      // reflect for a natural end tangent
      const a = pts[0];
      const b = pts[1];
      return [2 * a[0] - b[0], 2 * a[1] - b[1]];
    }
    if (i >= n) {
      const a = pts[n - 1];
      const b = pts[n - 2];
      return [2 * a[0] - b[0], 2 * a[1] - b[1]];
    }
    return [pts[i][0], pts[i][1]];
  };
  const corner = (i: number) => {
    const p = closed ? pts[((i % n) + n) % n] : pts[i];
    return !!p && p.length === 3;
  };
  const segs: Seg[] = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p1 = P(i);
    const p2 = P(i + 1);
    // a corner at p1 kills the incoming tangent, a corner at p2 the outgoing one
    const p0 = corner(i) ? p1 : P(i - 1);
    const p3 = corner(i + 1) ? p2 : P(i + 2);
    segs.push(crSegment(p0, p1, p2, p3));
  }
  return segs;
}

/** Smooth SVG path through the points. */
export function smooth(pts: readonly CPt[], closed = true): string {
  if (pts.length < 2) return '';
  const segs = toSegments(pts, closed);
  let d = `M${fmt(segs[0][0])}`;
  for (const [, c1, c2, e] of segs) d += `C${fmt(c1)} ${fmt(c2)} ${fmt(e)}`;
  return closed ? d + 'Z' : d;
}

function bez(s: Seg, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0],
    a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1],
  ];
}

/** Dense polyline sampled along the smooth curve. */
export function sample(pts: readonly CPt[], closed = false, steps = 10): Pt[] {
  const segs = toSegments(pts, closed);
  const out: Pt[] = [];
  segs.forEach((s, i) => {
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) out.push(bez(s, k / steps));
  });
  return out;
}

export interface TaperOpts {
  /** Relative width at the start / end (0 = needle point, 1 = full width). Default 0 / 0. */
  a?: number;
  b?: number;
}

/**
 * A pen-like stroke: a filled polygon around the curve whose width swells in the middle
 * and tapers towards the ends.
 */
export function taper(pts: readonly CPt[], width: number, opts: TaperOpts = {}): string {
  const a = opts.a ?? 0;
  const b = opts.b ?? 0;
  const line = sample(pts, false, 8);
  const n = line.length;
  if (n < 2) return '';
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + dist(line[i - 1], line[i]));
  const total = cum[n - 1] || 1;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = cum[i] / total;
    const prev = line[Math.max(0, i - 1)];
    const next = line[Math.min(n - 1, i + 1)];
    let tx = next[0] - prev[0];
    let ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const base = a + (b - a) * t;
    const f = Math.max(base, Math.pow(Math.sin(Math.PI * t), 0.65));
    const w = (width * f) / 2;
    left.push([line[i][0] - ty * w, line[i][1] + tx * w]);
    right.push([line[i][0] + ty * w, line[i][1] - tx * w]);
  }
  let d = `M${fmt(left[0])}`;
  for (let i = 1; i < n; i++) d += `L${fmt(left[i])}`;
  for (let i = n - 1; i >= 0; i--) d += `L${fmt(right[i])}`;
  return d + 'Z';
}

/** Mirror points about the vertical line x = cx (reversing order keeps the winding). */
export function mirror(pts: readonly CPt[], cx: number, reverse = true): CPt[] {
  const m = pts.map((p) => (p.length === 3 ? ([2 * cx - p[0], p[1], 1] as const) : ([2 * cx - p[0], p[1]] as const)));
  return reverse ? m.reverse() : m;
}

/** Shift points (used to place half-figure data, written as lateral offsets, onto the canvas). */
export function shift(pts: readonly CPt[], dx: number, dy = 0, sx = 1): CPt[] {
  return pts.map((p) =>
    p.length === 3 ? ([dx + sx * p[0], dy + p[1], 1] as const) : ([dx + sx * p[0], dy + p[1]] as const),
  );
}

/** Ellipse path (optionally rotated, degrees). */
export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const k = 0.5523;
  const c = Math.cos((rot * Math.PI) / 180);
  const s = Math.sin((rot * Math.PI) / 180);
  const T = (x: number, y: number): Pt => [cx + x * c - y * s, cy + x * s + y * c];
  const p = [T(rx, 0), T(0, ry), T(-rx, 0), T(0, -ry)];
  const h = [
    [T(rx, ry * k), T(rx * k, ry)],
    [T(-rx * k, ry), T(-rx, ry * k)],
    [T(-rx, -ry * k), T(-rx * k, -ry)],
    [T(rx * k, -ry), T(rx, -ry * k)],
  ];
  let d = `M${fmt(p[0])}`;
  for (let i = 0; i < 4; i++) d += `C${fmt(h[i][0])} ${fmt(h[i][1])} ${fmt(p[(i + 1) % 4])}`;
  return d + 'Z';
}

/** Capsule (rounded bar) between two points with radius r at each end (r1→r2). */
export function capsule(a: Pt, b: Pt, ra: number, rb = ra): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const pts: CPt[] = [
    [a[0] + nx * ra, a[1] + ny * ra],
    [b[0] + nx * rb, b[1] + ny * rb],
    [b[0] + ux * rb * 0.7 + nx * rb * 0.7, b[1] + uy * rb * 0.7 + ny * rb * 0.7],
    [b[0] + ux * rb, b[1] + uy * rb],
    [b[0] + ux * rb * 0.7 - nx * rb * 0.7, b[1] + uy * rb * 0.7 - ny * rb * 0.7],
    [b[0] - nx * rb, b[1] - ny * rb],
    [a[0] - nx * ra, a[1] - ny * ra],
    [a[0] - ux * ra * 0.7 - nx * ra * 0.7, a[1] - uy * ra * 0.7 - ny * ra * 0.7],
    [a[0] - ux * ra, a[1] - uy * ra],
    [a[0] - ux * ra * 0.7 + nx * ra * 0.7, a[1] - uy * ra * 0.7 + ny * ra * 0.7],
  ];
  return smooth(pts, true);
}

/**
 * A limb described by a polyline axis. Local coordinates (s, w): s = distance along the
 * axis from its first point (may be negative / beyond the end), w = offset across it,
 * positive towards `+x` side of the axis direction rotated −90° (i.e. lateral for a limb
 * hanging down on the +x side of the body).
 */
export class Limb {
  private seg: { p: Pt; ux: number; uy: number; s0: number; len: number }[] = [];
  readonly length: number;
  constructor(axis: Pt[], private blend = 18) {
    let s = 0;
    for (let i = 0; i < axis.length - 1; i++) {
      const p = axis[i];
      const q = axis[i + 1];
      const len = dist(p, q);
      this.seg.push({ p, ux: (q[0] - p[0]) / len, uy: (q[1] - p[1]) / len, s0: s, len });
      s += len;
    }
    this.length = s;
  }
  private angleAt(s: number) {
    // direction angle blended smoothly across joints
    const segs = this.seg;
    const ang = (i: number) => Math.atan2(segs[i].uy, segs[i].ux);
    let i = segs.findIndex((g) => s < g.s0 + g.len);
    if (i < 0) i = segs.length - 1;
    let a = ang(i);
    const g = segs[i];
    if (i > 0 && s - g.s0 < this.blend) {
      const t = 0.5 + (s - g.s0) / (2 * this.blend);
      a = ang(i - 1) + (ang(i) - ang(i - 1)) * t;
    } else if (i < segs.length - 1 && g.s0 + g.len - s < this.blend) {
      const t = 0.5 - (g.s0 + g.len - s) / (2 * this.blend);
      a = ang(i) + (ang(i + 1) - ang(i)) * t;
    }
    return a;
  }
  axisPt(s: number): Pt {
    const segs = this.seg;
    let g = segs[0];
    if (s >= 0) {
      g = segs.find((x) => s < x.s0 + x.len) ?? segs[segs.length - 1];
    }
    const t = s - g.s0;
    return [g.p[0] + g.ux * t, g.p[1] + g.uy * t];
  }
  pt(s: number, w: number): Pt {
    const p = this.axisPt(s);
    const a = this.angleAt(s);
    // normal: direction rotated −90° (for a downward axis, points to +x)
    const nx = Math.sin(a);
    const ny = -Math.cos(a);
    return [p[0] + nx * w, p[1] + ny * w];
  }
  pts(list: readonly (readonly [number, number] | readonly [number, number, 1])[]): CPt[] {
    return list.map((q) => {
      const p = this.pt(q[0], q[1]);
      return q.length === 3 ? ([p[0], p[1], 1] as const) : p;
    });
  }
}
