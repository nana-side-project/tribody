// Original artwork for the foot-sole view: both soles seen from BELOW (true plantar view),
// toes pointing up. Seen from below, the person's RIGHT foot appears on the viewer's LEFT
// (like the front view); big toes are on the inside (towards the centre).
//
// Foot-local coordinates (m, v), normalised to the foot length L:
//   m = medial offset from the foot's long axis (+ towards the big-toe side),
//   v = distance from the back of the heel (0) towards the toes (≈ 1).
import { type CPt, capsule, ellipse, smooth, taper } from './geometry';
import { CX } from './figure';

export const SOLE = {
  L: 520,
  heelY: 782,
  /** distance of each foot's long axis from the canvas midline */
  axis: 122,
};

/** Canvas x/y of a foot-local point. side = which foot (the person's right foot is drawn on the left). */
export function solePt(side: 'right' | 'left', m: number, v: number): [number, number] {
  const ax = side === 'right' ? CX - SOLE.axis : CX + SOLE.axis;
  const dir = side === 'right' ? 1 : -1; // medial points towards the centre
  return [ax + dir * m * SOLE.L, SOLE.heelY - v * SOLE.L];
}

const BLOB: [number, number][] = [
  [0, 0],
  [-0.07, 0.008],
  [-0.115, 0.04],
  [-0.137, 0.09],
  [-0.142, 0.15],
  [-0.143, 0.22],
  [-0.147, 0.3],
  [-0.155, 0.38],
  [-0.163, 0.44],
  [-0.166, 0.5],
  [-0.17, 0.57],
  [-0.174, 0.635],
  [-0.172, 0.68],
  [-0.163, 0.716],
  [-0.14, 0.742],
  [-0.09, 0.766],
  [-0.03, 0.78],
  [0.04, 0.79],
  [0.1, 0.794],
  [0.16, 0.786],
  [0.198, 0.752],
  [0.211, 0.7],
  [0.205, 0.64],
  [0.184, 0.57],
  [0.158, 0.5],
  [0.136, 0.43],
  [0.127, 0.36],
  [0.125, 0.29],
  [0.125, 0.22],
  [0.123, 0.15],
  [0.112, 0.085],
  [0.08, 0.035],
  [0.04, 0.008],
];

const TOES: { a: [number, number]; b: [number, number]; ra: number; rb: number }[] = [
  { a: [0.13, 0.775], b: [0.14, 0.925], ra: 0.062, rb: 0.061 }, // hallux
  { a: [0.034, 0.78], b: [0.037, 0.93], ra: 0.03, rb: 0.035 },
  { a: [-0.031, 0.77], b: [-0.036, 0.903], ra: 0.029, rb: 0.033 },
  { a: [-0.091, 0.755], b: [-0.099, 0.872], ra: 0.027, rb: 0.031 },
  { a: [-0.14, 0.73], b: [-0.152, 0.826], ra: 0.025, rb: 0.028 },
];

interface SLine {
  pts: [number, number][];
  w: number;
  faint?: boolean;
  a?: number;
  b?: number;
}

const LINES: SLine[] = [
  // proximal edge of the ball of the foot (metatarsal pad)
  { pts: [[-0.158, 0.6], [-0.06, 0.642], [0.06, 0.658], [0.16, 0.64], [0.198, 0.61]], w: 1.6, faint: true },
  // toe sulcus (where the toes meet the sole)
  { pts: [[-0.152, 0.737], [-0.06, 0.769], [0.05, 0.786], [0.17, 0.783]], w: 1.5 },
  // weight-bearing edge: lateral band vs. the lifted medial arch
  { pts: [[0.105, 0.2], [0.045, 0.3], [0.03, 0.42], [0.07, 0.53], [0.14, 0.6]], w: 1.5, faint: true },
  // toe pad creases
  { pts: [[0.088, 0.86], [0.135, 0.866], [0.188, 0.858]], w: 1.1, faint: true },
];

/** Outline control polygon of one sole (without toes) in canvas coordinates. */
export function soleOutline(side: 'right' | 'left'): CPt[] {
  return BLOB.map(([m, v]) => solePt(side, m, v) as CPt);
}

export interface SoleArt {
  body: string[];
  contours: { d: string; faint?: boolean }[];
  /** heel pad outline (stroked loop) */
  loops: { d: string; faint?: boolean }[];
}

let cached: SoleArt | null = null;

export function buildSole(): SoleArt {
  if (cached) return cached;
  const body: string[] = [];
  const contours: SoleArt['contours'] = [];
  const loops: SoleArt['loops'] = [];
  for (const side of ['right', 'left'] as const) {
    const P = (m: number, v: number) => solePt(side, m, v);
    body.push(smooth(soleOutline(side), true));
    for (const t of TOES) {
      body.push(capsule(P(t.a[0], t.a[1]), P(t.b[0], t.b[1]), t.ra * SOLE.L, t.rb * SOLE.L));
    }
    for (const l of LINES) {
      contours.push({ d: taper(l.pts.map(([m, v]) => P(m, v) as CPt), l.w, { a: l.a, b: l.b }), faint: l.faint });
    }
    // heel pad
    const [hx, hy] = P(0, 0.118);
    loops.push({ d: ellipse(hx, hy, 0.088 * SOLE.L, 0.095 * SOLE.L), faint: true });
  }
  cached = { body, contours, loops };
  return cached;
}
