// Simplified skeleton: geometry for every highlightable bone piece, built in rest coordinates
// (right side), converted to segment-local frames and mirrored for the left side.
import { type BufferGeometry, Quaternion, SphereGeometry, Vector3 } from 'three';
import { capsule, deg, ellipsoid, M, merge, mirrorX, R, slab, sphere, tube, CurveSampler } from './geometry';
import { type BaseSeg, type SegName, type Side, segName, segRestOrigin } from './rig';
import type { BonePartId } from './skeleton-parts';

export interface BonePieceDef {
  part: BonePartId;
  seg: BaseSeg;
  /** 'bone' | 'cartilage' material */
  mat: 'bone' | 'cartilage' | 'ink';
  /** midline piece (built once, already symmetric) */
  midline?: boolean;
  build: () => BufferGeometry[];
}

const sample = (ctrl: Vector3[], n: number) => {
  const s = new CurveSampler(ctrl.length + 1, 12);
  const out = Array.from({ length: n }, () => new Vector3());
  s.sample(ctrl, ctrl.length, out, n);
  return out;
};

/** Points on a circle (centre c, axis n, radius r), shifted by `shift` along n. */
function ringPts(c: Vector3, n: Vector3, r: number, shift = 0): Vector3[] {
  const a = Math.abs(n.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const u = new Vector3().crossVectors(n, a).normalize();
  const v = new Vector3().crossVectors(n, u).normalize();
  const out: Vector3[] = [];
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    out.push(c.clone().addScaledVector(n, shift).addScaledVector(u, Math.cos(t) * r).addScaledVector(v, Math.sin(t) * r));
  }
  return out;
}

// spine tables (y, body z, spinous z) — must match landmarks.ts
const CERV: [number, number, number][] = [
  [1.575, 0.0, -0.045],
  [1.555, 0.0, -0.056],
  [1.535, 0.0, -0.05],
  [1.515, -0.002, -0.05],
  [1.497, -0.006, -0.053],
  [1.479, -0.012, -0.06],
  [1.462, -0.02, -0.076],
];
const THOR: [number, number, number][] = [
  [1.445, -0.03, -0.085],
  [1.425, -0.04, -0.098],
  [1.402, -0.048, -0.108],
  [1.378, -0.055, -0.115],
  [1.353, -0.06, -0.12],
  [1.327, -0.063, -0.123],
  [1.3, -0.064, -0.125],
  [1.273, -0.064, -0.125],
  [1.247, -0.062, -0.123],
  [1.222, -0.059, -0.12],
  [1.197, -0.055, -0.115],
  [1.172, -0.05, -0.11],
];
const LUMB: [number, number, number][] = [
  [1.145, -0.044, -0.104],
  [1.115, -0.036, -0.099],
  [1.085, -0.03, -0.095],
  [1.056, -0.03, -0.095],
  [1.028, -0.036, -0.098],
];

function vertebra(y: number, zb: number, zs: number, bodyR: number, bodyH: number, tpLat: number, tpZ: number, spDrop: number, tpR: number, spR: number) {
  const g: BufferGeometry[] = [];
  g.push(capsule(M(y - bodyH / 2, zb), M(y + bodyH / 2, zb), bodyR, bodyR, 14, 3));
  // pedicles/arch
  g.push(capsule(new Vector3(-bodyR * 0.55, y, zb - bodyR * 0.8), new Vector3(bodyR * 0.55, y, zb - bodyR * 0.8), spR * 1.1, spR * 1.1, 8, 3));
  // spinous
  g.push(capsule(M(y, zb - bodyR * 0.9), M(y - spDrop, zs), spR * 1.2, spR, 8, 3));
  // transverse processes
  for (const s of [-1, 1]) g.push(capsule(new Vector3(s * bodyR * 0.5, y, zb - bodyR * 0.9), new Vector3(s * tpLat, y + 0.002, tpZ), tpR, tpR * 0.8, 8, 3));
  return g;
}

// rib parameters: [a, zBack, zFront, drop, thetaEnd]
const RIBS: [number, number, number, number, number][] = [
  [0.058, -0.05, 0.058, 0.03, 2.45],
  [0.088, -0.085, 0.075, 0.045, 2.5],
  [0.108, -0.1, 0.088, 0.06, 2.5],
  [0.122, -0.11, 0.097, 0.07, 2.5],
  [0.132, -0.115, 0.102, 0.08, 2.5],
  [0.14, -0.118, 0.104, 0.088, 2.5],
  [0.145, -0.12, 0.103, 0.095, 2.5],
  [0.147, -0.12, 0.098, 0.1, 2.35],
  [0.146, -0.118, 0.09, 0.1, 2.3],
  [0.141, -0.115, 0.08, 0.095, 2.25],
  [0.132, -0.11, 0.06, 0.075, 1.9],
  [0.115, -0.105, 0.03, 0.05, 1.5],
];
const STERNAL: [number, number][] = [
  [1.413, 0.068],
  [1.392, 0.082],
  [1.368, 0.09],
  [1.343, 0.094],
  [1.318, 0.096],
  [1.29, 0.096],
  [1.262, 0.095],
];
function ribPoint(i: number, th: number): Vector3 {
  const [a, zb, zf, drop] = RIBS[i];
  const b = (zf - zb) / 2;
  const zc = (zf + zb) / 2;
  const yH = THOR[i][0];
  return R(a * Math.sin(th), yH - 0.004 - (drop * (1 - Math.cos(th))) / 2, zc - b * Math.cos(th));
}
function ribCurve(i: number): Vector3[] {
  const [a, , , , thEnd] = RIBS[i];
  const [yH, zbT] = THOR[i];
  const th0 = Math.asin(Math.min(0.9, 0.05 / a));
  const pts = [R(0.016, yH, zbT - 0.004), R(0.034, yH - 0.002, zbT - 0.034)];
  const steps = 7;
  for (let k = 0; k <= steps; k++) pts.push(ribPoint(i, th0 + ((thEnd - th0) * k) / steps));
  return pts;
}

/** Iliac crest, ASIS → iliac tubercle → PSIS (lateral-positive). */
const ILIUM_TOP: [number, number, number][] = [
  [0.12, 1.0, 0.065],
  [0.132, 1.03, 0.05],
  [0.139, 1.052, 0.028],
  [0.142, 1.068, -0.012],
  [0.126, 1.072, -0.045],
  [0.092, 1.066, -0.068],
  [0.062, 1.046, -0.085],
  [0.045, 1.02, -0.092],
];

function iliumGrid(): Vector3[][] {
  const top = ILIUM_TOP.map(([x, y, z]) => R(x, y, z));
  const bot = [
    [0.103, 0.966, 0.058],
    [0.108, 0.952, 0.036],
    [0.112, 0.945, 0.006],
    [0.102, 0.944, -0.028],
    [0.082, 0.95, -0.054],
    [0.062, 0.968, -0.074],
    [0.05, 0.99, -0.085],
    [0.044, 1.004, -0.09],
  ].map(([x, y, z]) => R(x, y, z));
  const N = 14;
  const T = sample(top, N);
  const B = sample(bot, N);
  const rows = 6;
  const grid: Vector3[][] = [];
  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    grid.push(
      T.map((t, c) => {
        const p = new Vector3().lerpVectors(t, B[c], v);
        // gluteal surface: convex outward in front, slightly concave behind (the wing's gentle S-curve)
        const cu = c / (N - 1);
        const bulge = Math.sin(Math.PI * v) * (0.011 * Math.sin(Math.PI * Math.min(1, cu * 1.25)) - 0.004 * Math.max(0, cu - 0.7) / 0.3);
        p.x -= bulge; // slightly convex outwards (right side lateral = −x)
        return p;
      }),
    );
  }
  return grid;
}

function sacrumGrid(): Vector3[][] {
  const spine = sample([M(1.008, -0.062), M(0.958, -0.088), M(0.905, -0.083)], 7);
  const widths = [0.054, 0.05, 0.043, 0.035, 0.027, 0.019, 0.012];
  return spine.map((c, r) => {
    const w = widths[r];
    const cols = 7;
    return Array.from({ length: cols }, (_, k) => {
      const u = (k / (cols - 1)) * 2 - 1; // -1..1
      return new Vector3(u * w, c.y + Math.abs(u) * 0.004 * (1 - r / 6), c.z + (1 - u * u) * -0.006 + Math.abs(u) * 0.01);
    });
  });
}

function scapulaGrid(): Vector3[][] {
  const SA = R(0.077, 1.435, -0.09);
  const IA = R(0.086, 1.236, -0.104);
  const LA = R(0.144, 1.396, -0.032);
  const rows = 9;
  const cols = 6;
  const grid: Vector3[][] = [];
  for (let r = 0; r < rows; r++) {
    const u = r / (rows - 1);
    const med = new Vector3().lerpVectors(SA, IA, u);
    med.x -= Math.sin(Math.PI * u) * 0.004; // medial border slight convexity (toward midline for right = +x?) keep subtle
    const lat = new Vector3().lerpVectors(LA, IA, Math.pow(u, 0.85));
    const row: Vector3[] = [];
    for (let c = 0; c < cols; c++) {
      const v = c / (cols - 1);
      const p = new Vector3().lerpVectors(med, lat, v);
      // slightly concave anteriorly (posterior surface convex)
      p.z -= Math.sin(Math.PI * v) * 0.006 * (1 - u * 0.6);
      row.push(p);
    }
    grid.push(row);
  }
  return grid;
}

export const BONE_PIECES: BonePieceDef[] = [
  // ── head
  {
    part: 'skull',
    seg: 'head',
    mat: 'bone',
    midline: true,
    build: () => [
      ellipsoid(M(1.686, -0.014), [0.068, 0.071, 0.086]),
      ellipsoid(M(1.656, 0.042), [0.056, 0.05, 0.042]),
      ellipsoid(M(1.603, 0.052), [0.04, 0.03, 0.03]),
      ellipsoid(R(0.05, 1.624, 0.036), [0.013, 0.012, 0.028]),
      ellipsoid(R(-0.05, 1.624, 0.036), [0.013, 0.012, 0.028]),
      ellipsoid(M(1.64, -0.072), [0.05, 0.036, 0.026]),
      sphere(R(0.05, 1.6, -0.027), 0.008),
      sphere(R(-0.05, 1.6, -0.027), 0.008),
    ],
  },
  {
    part: 'skull',
    seg: 'head',
    mat: 'ink',
    midline: true,
    build: () => [
      ellipsoid(R(0.028, 1.638, 0.073), [0.016, 0.0135, 0.008]),
      ellipsoid(R(-0.028, 1.638, 0.073), [0.016, 0.0135, 0.008]),
      ellipsoid(M(1.611, 0.08), [0.0065, 0.01, 0.005]),
    ],
  },
  {
    part: 'mandible',
    seg: 'head',
    mat: 'bone',
    midline: true,
    build: () => [
      tube([R(-0.048, 1.61, -0.006), R(-0.046, 1.562, 0.0), R(-0.03, 1.541, 0.05), M(1.534, 0.072), R(0.03, 1.541, 0.05), R(0.046, 1.562, 0.0), R(0.048, 1.61, -0.006)], 0.0075, { n: 40 }),
      // mandible body (fills the gap up to the teeth so the jaw doesn't read as a loose hoop) + chin
      ellipsoid(R(0.036, 1.556, 0.032), [0.008, 0.017, 0.022], deg(0, -38, 0)),
      ellipsoid(R(-0.036, 1.556, 0.032), [0.008, 0.017, 0.022], deg(0, 38, 0)),
      ellipsoid(M(1.553, 0.064), [0.021, 0.02, 0.011]),
    ],
  },
  // ── spine
  {
    part: 'cervical',
    seg: 'neck',
    mat: 'bone',
    midline: true,
    build: () =>
      CERV.flatMap(([y, zb, zs], i) =>
        i === 0
          ? [
              tube([R(-0.016, y, zb - 0.01), R(-0.02, y, zb - 0.03), M(y, zs), R(0.02, y, zb - 0.03), R(0.016, y, zb - 0.01), M(y, zb + 0.006)], 0.0038, { closed: true, n: 30 }),
              capsule(R(0.018, y, zb - 0.012), R(0.036, y, zb - 0.008), 0.0035, 0.003),
              capsule(R(-0.018, y, zb - 0.012), R(-0.036, y, zb - 0.008), 0.0035, 0.003),
            ]
          : vertebra(y, zb, zs, 0.0115, 0.011, 0.026, zb - 0.008, i === 6 ? 0.008 : 0.004, 0.0032, 0.0036),
      ),
  },
  {
    part: 'thoracic',
    seg: 'thorax',
    mat: 'bone',
    midline: true,
    build: () => THOR.flatMap(([y, zb, zs], i) => vertebra(y, zb, zs, 0.0135 + i * 0.0005, 0.016 + i * 0.0004, 0.034 + i * 0.0006, zb - 0.035, 0.016, 0.0036, 0.0036)),
  },
  {
    part: 'lumbar',
    seg: 'lumbar',
    mat: 'bone',
    midline: true,
    build: () => LUMB.flatMap(([y, zb, zs]) => vertebra(y, zb, zs, 0.021, 0.023, 0.045, zb - 0.032, 0.006, 0.0042, 0.0055)),
  },
  {
    part: 'discs',
    seg: 'lumbar',
    mat: 'cartilage',
    midline: true,
    build: () => {
      const g: BufferGeometry[] = [];
      const ys = [1.16, ...LUMB.slice(0, 4).map(([y], i) => (y + LUMB[i + 1][0]) / 2), 1.015];
      const zs = [-0.047, ...LUMB.slice(0, 4).map(([, z], i) => (z + LUMB[i + 1][1]) / 2), -0.04];
      ys.forEach((y, i) => g.push(capsule(M(y - 0.0025, zs[i]), M(y + 0.0025, zs[i]), 0.0205, 0.0205, 14, 2)));
      return g;
    },
  },
  {
    part: 'sacrum',
    seg: 'pelvis',
    mat: 'bone',
    midline: true,
    build: () => [slab(sacrumGrid(), 0.016)],
  },
  {
    part: 'coccyx',
    seg: 'pelvis',
    mat: 'bone',
    midline: true,
    build: () => [capsule(M(0.903, -0.084), M(0.879, -0.071), 0.0055, 0.003)],
  },
  {
    part: 'pubic_symphysis',
    seg: 'pelvis',
    mat: 'cartilage',
    midline: true,
    build: () => [ellipsoid(M(0.882, 0.067), [0.006, 0.016, 0.008])],
  },
  {
    part: 'sternum',
    seg: 'thorax',
    mat: 'bone',
    midline: true,
    build: () => [
      ellipsoid(M(1.407, 0.077), [0.026, 0.023, 0.008]),
      ellipsoid(M(1.33, 0.093), [0.017, 0.064, 0.0075], deg(-9, 0, 0)),
      capsule(M(1.268, 0.097), M(1.243, 0.094), 0.006, 0.003),
    ],
  },
  // ── thorax (sided)
  {
    part: 'ribs',
    seg: 'thorax',
    mat: 'bone',
    build: () => RIBS.map((_, i) => tube(ribCurve(i), i === 0 ? 0.0055 : 0.0045, { n: 34, radial: 6 })),
  },
  {
    part: 'costal_cartilage',
    seg: 'thorax',
    mat: 'cartilage',
    build: () => {
      const g: BufferGeometry[] = [];
      for (let i = 0; i < 7; i++) {
        const end = ribPoint(i, RIBS[i][4]);
        const [ys, zs] = STERNAL[i];
        const mid = new Vector3().lerpVectors(end, R(0.022, ys, zs), 0.5);
        mid.z += 0.006;
        g.push(tube([end, mid, R(0.02, ys, zs)], 0.004, { n: 12, radial: 6 }));
      }
      const joins: [number, Vector3][] = [
        [7, R(0.062, 1.24, 0.096)],
        [8, R(0.085, 1.21, 0.088)],
        [9, R(0.104, 1.185, 0.075)],
      ];
      for (const [i, to] of joins) {
        const end = ribPoint(i, RIBS[i][4]);
        g.push(tube([end, new Vector3().lerpVectors(end, to, 0.5).add(new Vector3(0, 0.004, 0.006)), to], 0.0038, { n: 12, radial: 6 }));
      }
      return g;
    },
  },
  // ── pelvis (sided)
  {
    part: 'ilium',
    seg: 'pelvis',
    mat: 'bone',
    build: () => [
      slab(iliumGrid(), 0.007),
      // iliac crest (thick rounded rim: ASIS → tubercle → PSIS) so the wing reads as bone, not a flat disc
      tube(ILIUM_TOP.map(([x, y, z]) => R(x, y, z)), [0.0052, 0.0058, 0.0066, 0.0068, 0.0064, 0.006, 0.0058, 0.0056], { n: 40, radial: 8 }),
      // anterior border: ASIS → AIIS → acetabular rim
      tube([R(0.12, 1.0, 0.065), R(0.108, 0.982, 0.06), R(0.103, 0.966, 0.058), R(0.097, 0.948, 0.04)], [0.0048, 0.0042, 0.0052, 0.006], { n: 16 }),
      // posterior border: PSIS → PIIS → greater sciatic notch → posterior acetabulum
      tube([R(0.045, 1.019, -0.091), R(0.05, 0.99, -0.087), R(0.066, 0.952, -0.072), R(0.088, 0.93, -0.035)], [0.0055, 0.005, 0.0055, 0.0075], { n: 18 }),
      // iliac pillar: the thick column from the acetabulum up to the iliac tubercle
      tube([R(0.104, 0.94, 0.004), R(0.122, 0.995, 0.0), R(0.138, 1.055, -0.008)], [0.0095, 0.0068, 0.0052], { n: 16 }),
      sphere(R(0.12, 1.0, 0.065), 0.0062),
      sphere(R(0.045, 1.019, -0.091), 0.0062),
    ],
  },
  {
    part: 'acetabulum',
    seg: 'pelvis',
    mat: 'bone',
    build: () => {
      // partial-sphere cup around the femoral head, dome pointing superomedially (+x = medial on the right)
      const g = new SphereGeometry(0.0305, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.56);
      g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(0.42, 0.86, -0.22).normalize()));
      g.translate(-0.085, 0.92, 0);
      return [g, tube(ringPts(R(0.085, 0.92, 0), new Vector3(-0.42, -0.86, 0.22).normalize(), 0.03, 0.0058), 0.0035, { closed: true, n: 36, radial: 6 })];
    },
  },
  {
    part: 'pubis',
    seg: 'pelvis',
    mat: 'bone',
    build: () => [
      tube([R(0.08, 0.912, 0.024), R(0.052, 0.904, 0.057), R(0.022, 0.892, 0.068)], 0.0075, { n: 14 }),
      ellipsoid(R(0.018, 0.882, 0.066), [0.011, 0.017, 0.009]),
      tube([R(0.02, 0.868, 0.062), R(0.034, 0.852, 0.045), R(0.048, 0.839, 0.012)], 0.0058, { n: 14 }),
    ],
  },
  {
    part: 'ischium',
    seg: 'pelvis',
    mat: 'bone',
    build: () => [
      tube([R(0.048, 0.839, 0.012), R(0.058, 0.834, -0.022), R(0.071, 0.864, -0.045), R(0.08, 0.898, -0.032), R(0.086, 0.914, -0.014)], 0.0078, { n: 20 }),
      capsule(R(0.062, 0.886, -0.05), R(0.045, 0.882, -0.06), 0.0045, 0.0025),
    ],
  },
  { part: 'ischial_tuberosity', seg: 'pelvis', mat: 'bone', build: () => [ellipsoid(R(0.062, 0.838, -0.033), [0.012, 0.017, 0.016])] },
  // ── shoulder girdle
  {
    part: 'clavicle',
    seg: 'clavicle',
    mat: 'bone',
    build: () => [tube([R(0.024, 1.432, 0.062), R(0.06, 1.442, 0.068), R(0.105, 1.448, 0.048), R(0.145, 1.455, 0.018), R(0.173, 1.456, -0.004)], [0.0075, 0.0062, 0.006, 0.0065, 0.007], { n: 26 })],
  },
  {
    part: 'scapula',
    seg: 'scapula',
    mat: 'bone',
    build: () => [
      slab(scapulaGrid(), 0.0045),
      tube([R(0.075, 1.382, -0.107), R(0.12, 1.413, -0.096), R(0.162, 1.438, -0.062), R(0.178, 1.448, -0.032)], [0.0045, 0.0058, 0.0065, 0.0065], { n: 22 }),
      ellipsoid(R(0.141, 1.4, -0.022), [0.011, 0.017, 0.012]),
      sphere(R(0.077, 1.435, -0.09), 0.004),
      sphere(R(0.086, 1.236, -0.104), 0.0045),
    ],
  },
  { part: 'acromion', seg: 'scapula', mat: 'bone', build: () => [ellipsoid(R(0.184, 1.451, -0.008), [0.017, 0.006, 0.02], deg(0, 0, 8))] },
  { part: 'coracoid', seg: 'scapula', mat: 'bone', build: () => [tube([R(0.138, 1.42, -0.01), R(0.141, 1.43, 0.012), R(0.151, 1.42, 0.034)], 0.0045, { n: 12 })] },
  { part: 'glenoid', seg: 'scapula', mat: 'cartilage', build: () => [ellipsoid(R(0.151, 1.405, -0.012), [0.0035, 0.019, 0.013], deg(0, -20, 0))] },
  // ── arm
  { part: 'humeral_head', seg: 'humerus', mat: 'bone', build: () => [sphere(R(0.167, 1.409, -0.007), 0.0235, 20, 14)] },
  { part: 'greater_tubercle', seg: 'humerus', mat: 'bone', build: () => [ellipsoid(R(0.189, 1.405, -0.004), [0.011, 0.017, 0.014])] },
  {
    part: 'humerus',
    seg: 'humerus',
    mat: 'bone',
    build: () => [
      ellipsoid(R(0.18, 1.396, 0.016), [0.007, 0.008, 0.007]),
      tube([R(0.182, 1.392, -0.006), R(0.189, 1.26, -0.006), R(0.193, 1.12, -0.012)], [0.014, 0.0112, 0.0122], { n: 20, radial: 10 }),
      ellipsoid(R(0.191, 1.094, -0.013), [0.031, 0.011, 0.014]),
      capsule(R(0.17, 1.088, -0.008), R(0.212, 1.088, -0.006), 0.0098, 0.0092),
      sphere(R(0.225, 1.095, -0.015), 0.006),
      sphere(R(0.156, 1.094, -0.02), 0.0075),
    ],
  },
  {
    part: 'ulna',
    seg: 'forearm',
    mat: 'bone',
    build: () => [
      ellipsoid(R(0.185, 1.098, -0.033), [0.009, 0.013, 0.01]),
      tube([R(0.183, 1.085, -0.024), R(0.2, 0.96, -0.017), R(0.217, 0.852, -0.011)], [0.0092, 0.0068, 0.0062], { n: 18 }),
      sphere(R(0.218, 0.848, -0.01), 0.0075),
    ],
  },
  {
    part: 'radius',
    seg: 'forearm',
    mat: 'bone',
    build: () => [
      capsule(R(0.211, 1.077, -0.008), R(0.211, 1.066, -0.007), 0.0095, 0.009),
      tube([R(0.209, 1.064, -0.006), R(0.228, 0.96, 0.0), R(0.254, 0.862, 0.002)], [0.0058, 0.0075, 0.0105], { n: 18 }),
      ellipsoid(R(0.252, 0.85, 0.002), [0.017, 0.009, 0.012]),
    ],
  },
  {
    part: 'hand',
    seg: 'hand',
    mat: 'bone',
    build: () => {
      const g: BufferGeometry[] = [ellipsoid(R(0.243, 0.822, 0.002), [0.024, 0.012, 0.01])];
      const lens = [0.068, 0.075, 0.07, 0.055];
      for (let i = 0; i < 4; i++) {
        const lb = 0.258 - i * 0.011;
        const lh = 0.266 - i * 0.0135;
        g.push(capsule(R(lb, 0.81, 0.004), R(lh, 0.742, 0.007), 0.0045, 0.0048, 8, 3));
        g.push(capsule(R(lh, 0.736, 0.008), R(lh + 0.001, 0.736 - lens[i], 0.012), 0.0042, 0.0034, 8, 3));
      }
      g.push(capsule(R(0.268, 0.81, 0.01), R(0.279, 0.776, 0.024), 0.005, 0.005, 8, 3));
      g.push(capsule(R(0.28, 0.772, 0.026), R(0.286, 0.736, 0.036), 0.0044, 0.0036, 8, 3));
      return g;
    },
  },
  // ── leg
  { part: 'femoral_head', seg: 'femur', mat: 'bone', build: () => [sphere(R(0.085, 0.92, 0.0), 0.0235, 20, 14)] },
  { part: 'greater_trochanter', seg: 'femur', mat: 'bone', build: () => [ellipsoid(R(0.146, 0.902, -0.01), [0.014, 0.024, 0.018])] },
  {
    part: 'femur',
    seg: 'femur',
    mat: 'bone',
    build: () => [
      capsule(R(0.092, 0.916, 0.002), R(0.132, 0.899, -0.005), 0.0135, 0.015, 12, 3),
      tube([R(0.138, 0.88, -0.008), R(0.127, 0.8, -0.002), R(0.11, 0.68, 0.004), R(0.096, 0.565, 0.0)], [0.017, 0.0142, 0.0136, 0.016], { n: 26, radial: 10 }),
      sphere(R(0.1, 0.857, -0.012), 0.0085),
      ellipsoid(R(0.09, 0.548, -0.004), [0.03, 0.03, 0.021]),
    ],
  },
  {
    part: 'femoral_condyles',
    seg: 'femur',
    mat: 'bone',
    build: () => [
      ellipsoid(R(0.09, 0.51, -0.006), [0.043, 0.024, 0.029]),
      ellipsoid(R(0.067, 0.508, -0.016), [0.019, 0.022, 0.022]),
      ellipsoid(R(0.112, 0.508, -0.016), [0.019, 0.022, 0.021]),
      // trochlea and the anterior condyles: the patella glides on these (see rig.ts PAT_TILT)
      ellipsoid(R(0.09, 0.53, 0.012), [0.026, 0.028, 0.021]),
      ellipsoid(R(0.09, 0.505, 0.006), [0.036, 0.021, 0.026]),
    ],
  },
  { part: 'lateral_epicondyle', seg: 'femur', mat: 'bone', build: () => [sphere(R(0.128, 0.516, -0.004), 0.0065)] },
  { part: 'patella', seg: 'patella', mat: 'bone', build: () => [ellipsoid(R(0.09, 0.528, 0.048), [0.022, 0.024, 0.0095])] },
  { part: 'tibial_plateau', seg: 'tibia', mat: 'bone', build: () => [ellipsoid(R(0.088, 0.477, -0.003), [0.039, 0.0105, 0.028])] },
  {
    part: 'tibia',
    seg: 'tibia',
    mat: 'bone',
    build: () => [
      ellipsoid(R(0.088, 0.462, -0.004), [0.036, 0.02, 0.025]),
      ellipsoid(R(0.09, 0.447, 0.026), [0.01, 0.013, 0.008]),
      tube([R(0.088, 0.452, 0.0), R(0.087, 0.3, 0.004), R(0.085, 0.13, 0.0)], [0.018, 0.0125, 0.0145], { n: 24, radial: 10 }),
      ellipsoid(R(0.086, 0.096, -0.003), [0.022, 0.017, 0.02]),
    ],
  },
  { part: 'medial_malleolus', seg: 'tibia', mat: 'bone', build: () => [capsule(R(0.068, 0.105, 0.0), R(0.062, 0.07, 0.003), 0.0075, 0.007)] },
  { part: 'fibula', seg: 'tibia', mat: 'bone', build: () => [tube([R(0.124, 0.45, -0.022), R(0.122, 0.26, -0.022), R(0.116, 0.09, -0.02)], [0.0065, 0.0055, 0.0065], { n: 22 })] },
  { part: 'fibular_head', seg: 'tibia', mat: 'bone', build: () => [sphere(R(0.125, 0.455, -0.022), 0.0095)] },
  { part: 'lateral_malleolus', seg: 'tibia', mat: 'bone', build: () => [ellipsoid(R(0.118, 0.07, -0.021), [0.0075, 0.017, 0.011])] },
  // ── foot
  { part: 'talus', seg: 'foot', mat: 'bone', build: () => [ellipsoid(R(0.09, 0.066, 0.003), [0.02, 0.015, 0.028]), sphere(R(0.083, 0.058, 0.034), 0.012)] },
  {
    part: 'calcaneus',
    seg: 'foot',
    mat: 'bone',
    build: () => [
      ellipsoid(R(0.093, 0.036, -0.028), [0.019, 0.022, 0.04]),
      ellipsoid(R(0.09, 0.033, -0.062), [0.018, 0.023, 0.012]),
      ellipsoid(R(0.07, 0.048, -0.01), [0.008, 0.005, 0.01]),
    ],
  },
  { part: 'navicular', seg: 'foot', mat: 'bone', build: () => [ellipsoid(R(0.069, 0.05, 0.055), [0.013, 0.012, 0.008]), sphere(R(0.062, 0.047, 0.056), 0.0055)] },
  { part: 'cuboid', seg: 'foot', mat: 'bone', build: () => [ellipsoid(R(0.112, 0.03, 0.048), [0.014, 0.012, 0.016])] },
  {
    part: 'cuneiforms',
    seg: 'foot',
    mat: 'bone',
    build: () => [
      ellipsoid(R(0.066, 0.038, 0.074), [0.009, 0.014, 0.01]),
      ellipsoid(R(0.08, 0.045, 0.073), [0.007, 0.011, 0.009]),
      ellipsoid(R(0.094, 0.042, 0.071), [0.007, 0.011, 0.009]),
    ],
  },
  {
    part: 'metatarsals',
    seg: 'foot',
    mat: 'bone',
    build: () => {
      const mt: [Vector3, Vector3, number][] = [
        [R(0.066, 0.034, 0.087), R(0.064, 0.016, 0.137), 0.0082],
        [R(0.08, 0.04, 0.084), R(0.08, 0.014, 0.139), 0.0052],
        [R(0.094, 0.037, 0.082), R(0.095, 0.013, 0.131), 0.005],
        [R(0.107, 0.032, 0.072), R(0.11, 0.013, 0.122), 0.005],
        [R(0.124, 0.025, 0.06), R(0.125, 0.012, 0.112), 0.0055],
      ];
      const g: BufferGeometry[] = [];
      for (const [a, b, r] of mt) {
        g.push(capsule(a, b, r, r * 0.85, 8, 3));
        g.push(sphere(b, r * 1.25, 10, 8));
      }
      g.push(sphere(R(0.131, 0.02, 0.06), 0.0068));
      return g;
    },
  },
  {
    part: 'phalanges',
    seg: 'toes',
    mat: 'bone',
    build: () => [
      capsule(R(0.064, 0.015, 0.146), R(0.063, 0.013, 0.172), 0.0075, 0.007, 8, 3),
      capsule(R(0.063, 0.013, 0.176), R(0.062, 0.012, 0.192), 0.0068, 0.0055, 8, 3),
      capsule(R(0.08, 0.013, 0.148), R(0.082, 0.01, 0.184), 0.0048, 0.004, 8, 3),
      capsule(R(0.095, 0.012, 0.14), R(0.097, 0.01, 0.177), 0.0047, 0.004, 8, 3),
      capsule(R(0.11, 0.012, 0.13), R(0.112, 0.01, 0.165), 0.0045, 0.0038, 8, 3),
      capsule(R(0.125, 0.012, 0.119), R(0.127, 0.009, 0.15), 0.0043, 0.0036, 8, 3),
    ],
  },
];

export interface BuiltPiece {
  part: BonePartId;
  side: Side | null;
  seg: SegName;
  mat: 'bone' | 'cartilage' | 'ink';
  geometry: BufferGeometry;
}

/** Build all bone pieces in segment-local coordinates (both sides). */
export function buildSkeletonGeometry(): BuiltPiece[] {
  const out: BuiltPiece[] = [];
  for (const d of BONE_PIECES) {
    const geo = merge(d.build());
    if (d.midline) {
      const seg = segName(d.seg, null);
      const o = segRestOrigin(seg);
      geo.translate(-o.x, -o.y, -o.z);
      out.push({ part: d.part, side: null, seg, mat: d.mat, geometry: geo });
      continue;
    }
    const left = mirrorX(geo);
    for (const side of ['R', 'L'] as Side[]) {
      const seg = segName(d.seg, side);
      const g = side === 'R' ? geo : left;
      const o = segRestOrigin(seg);
      g.translate(-o.x, -o.y, -o.z);
      out.push({ part: d.part, side, seg, mat: d.mat, geometry: g });
    }
  }
  return out;
}
