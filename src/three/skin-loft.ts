// Smooth mannequin skin: lofted, CPU-skinned tubes for the trunk, arms and legs.
// Each ring is an (super)ellipse in the rest pose, bound to one or two segments; vertices are blended
// between the segment transforms every time the pose changes (no allocations in update()).
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { type BaseSeg, type RigState, SEG_INDEX, type SegName, segName, segRestOrigin, type Side, type Vec3 } from './rig';

interface RingDef {
  /** rest centre, lateral-positive */
  c: Vec3;
  /** half-width (x) and half-depth (z) */
  a: number;
  b: number;
  w: [BaseSeg, number][];
}
interface ChainDef {
  rings: RingDef[];
  /** superellipse exponent (2 = ellipse) */
  n: number;
  sided: boolean;
}

const r = (c: Vec3, a: number, b: number, w: [BaseSeg, number][]): RingDef => ({ c, a, b, w });

const TRUNK: ChainDef = {
  n: 2.35,
  sided: false,
  rings: [
    r([0, 0.818, -0.012], 0.02, 0.018, [['pelvis', 1]]),
    r([0, 0.832, -0.012], 0.085, 0.06, [['pelvis', 1]]),
    r([0, 0.862, -0.018], 0.138, 0.092, [['pelvis', 1]]),
    r([0, 0.9, -0.02], 0.158, 0.106, [['pelvis', 1]]),
    r([0, 0.95, -0.014], 0.162, 0.104, [['pelvis', 1]]),
    r([0, 1.0, -0.008], 0.152, 0.097, [['pelvis', 0.75], ['lumbar', 0.25]]),
    r([0, 1.05, -0.004], 0.136, 0.092, [['pelvis', 0.3], ['lumbar', 0.7]]),
    r([0, 1.1, -0.004], 0.13, 0.094, [['lumbar', 1]]),
    r([0, 1.15, -0.006], 0.134, 0.1, [['lumbar', 0.5], ['thorax', 0.5]]),
    r([0, 1.2, -0.008], 0.142, 0.108, [['lumbar', 0.15], ['thorax', 0.85]]),
    r([0, 1.26, -0.008], 0.148, 0.115, [['thorax', 1]]),
    r([0, 1.32, -0.01], 0.15, 0.117, [['thorax', 1]]),
    r([0, 1.375, -0.016], 0.148, 0.11, [['thorax', 1]]),
    r([0, 1.415, -0.02], 0.138, 0.098, [['thorax', 1]]),
    r([0, 1.448, -0.024], 0.098, 0.078, [['thorax', 0.7], ['neck', 0.3]]),
    r([0, 1.475, -0.026], 0.06, 0.058, [['thorax', 0.25], ['neck', 0.75]]),
    r([0, 1.53, -0.018], 0.05, 0.052, [['neck', 1]]),
    r([0, 1.58, -0.01], 0.05, 0.053, [['neck', 0.5], ['head', 0.5]]),
    r([0, 1.61, -0.005], 0.046, 0.05, [['head', 1]]),
  ],
};

const ARM: ChainDef = {
  n: 2,
  sided: true,
  rings: [
    r([0.178, 1.448, -0.006], 0.012, 0.012, [['humerus', 1]]),
    r([0.18, 1.437, -0.006], 0.036, 0.038, [['humerus', 1]]),
    r([0.183, 1.41, -0.006], 0.054, 0.052, [['humerus', 1]]),
    r([0.187, 1.37, -0.006], 0.053, 0.05, [['humerus', 1]]),
    r([0.19, 1.31, -0.008], 0.047, 0.046, [['humerus', 1]]),
    r([0.192, 1.23, -0.01], 0.043, 0.045, [['humerus', 1]]),
    r([0.194, 1.16, -0.013], 0.04, 0.042, [['humerus', 1]]),
    r([0.196, 1.095, -0.015], 0.038, 0.039, [['humerus', 0.55], ['forearm', 0.45]]),
    r([0.203, 1.04, -0.012], 0.039, 0.037, [['humerus', 0.1], ['forearm', 0.9]]),
    r([0.214, 0.97, -0.008], 0.034, 0.03, [['forearm', 1]]),
    r([0.227, 0.9, -0.003], 0.028, 0.022, [['forearm', 1]]),
    r([0.237, 0.848, 0.0], 0.025, 0.018, [['forearm', 0.6], ['hand', 0.4]]),
    r([0.24, 0.825, 0.002], 0.022, 0.015, [['hand', 1]]),
  ],
};

const LEG: ChainDef = {
  n: 2,
  sided: true,
  rings: [
    r([0.098, 0.95, -0.012], 0.05, 0.055, [['femur', 1]]),
    r([0.097, 0.9, -0.008], 0.082, 0.082, [['femur', 1]]),
    r([0.096, 0.84, -0.004], 0.084, 0.083, [['femur', 1]]),
    r([0.094, 0.76, 0.0], 0.077, 0.076, [['femur', 1]]),
    r([0.092, 0.67, 0.002], 0.068, 0.066, [['femur', 1]]),
    r([0.09, 0.59, 0.003], 0.057, 0.056, [['femur', 1]]),
    r([0.09, 0.535, 0.005], 0.052, 0.052, [['femur', 0.85], ['tibia', 0.15]]),
    r([0.089, 0.495, 0.006], 0.051, 0.053, [['femur', 0.45], ['tibia', 0.55]]),
    r([0.088, 0.45, -0.003], 0.05, 0.052, [['femur', 0.05], ['tibia', 0.95]]),
    r([0.088, 0.39, -0.014], 0.048, 0.057, [['tibia', 1]]),
    r([0.088, 0.32, -0.017], 0.045, 0.054, [['tibia', 1]]),
    r([0.089, 0.24, -0.012], 0.038, 0.043, [['tibia', 1]]),
    r([0.09, 0.165, -0.008], 0.031, 0.034, [['tibia', 1]]),
    r([0.09, 0.11, -0.008], 0.029, 0.031, [['tibia', 0.85], ['foot', 0.15]]),
    r([0.09, 0.085, -0.008], 0.026, 0.028, [['tibia', 0.5], ['foot', 0.5]]),
  ],
};

const SEGS_AROUND = 36;

interface Chain {
  rings: number;
  around: number;
  /** per vertex: rest local offsets for up to 2 segments */
  segA: Int16Array;
  segB: Int16Array;
  wB: Float32Array;
  localA: Float32Array;
  localB: Float32Array;
  geom: BufferGeometry;
  pos: Float32Array;
  nor: Float32Array;
}

const _a = new Vector3();
const _b = new Vector3();
const tA = new Vector3();
const tB = new Vector3();
const _u = new Vector3();
const _d = new Vector3();
const _n = new Vector3();
const _c = new Vector3();

function buildChain(def: ChainDef, side: Side | null): Chain {
  const R = def.rings.length;
  const A = SEGS_AROUND + 1;
  const nv = R * A;
  const segA = new Int16Array(nv);
  const segB = new Int16Array(nv);
  const wB = new Float32Array(nv);
  const localA = new Float32Array(nv * 3);
  const localB = new Float32Array(nv * 3);
  const p = new Vector3();
  const sx = side === 'R' ? -1 : 1;
  for (let i = 0; i < R; i++) {
    const ring = def.rings[i];
    const wsum = ring.w.reduce((s, x) => s + x[1], 0);
    const sa = ring.w[0];
    const sb = ring.w[1] ?? ring.w[0];
    const segNameA = segName(sa[0], side) as SegName;
    const segNameB = segName(sb[0], side) as SegName;
    const oA = segRestOrigin(segNameA);
    const oB = segRestOrigin(segNameB);
    for (let j = 0; j < A; j++) {
      const t = (j / SEGS_AROUND) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const e = 2 / def.n;
      const x = ring.a * Math.sign(c) * Math.pow(Math.abs(c), e);
      const z = ring.b * Math.sign(s) * Math.pow(Math.abs(s), e);
      // ring centre in world rest coords; mirror lateral offsets for the side
      p.set(sx * ring.c[0] + (side === 'R' ? -x : x), ring.c[1], ring.c[2] + z);
      const v = i * A + j;
      segA[v] = SEG_INDEX[segNameA];
      segB[v] = SEG_INDEX[segNameB];
      wB[v] = ring.w[1] ? ring.w[1][1] / wsum : 0;
      localA[v * 3] = p.x - oA.x;
      localA[v * 3 + 1] = p.y - oA.y;
      localA[v * 3 + 2] = p.z - oA.z;
      localB[v * 3] = p.x - oB.x;
      localB[v * 3 + 1] = p.y - oB.y;
      localB[v * 3 + 2] = p.z - oB.z;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < R - 1; i++)
    for (let j = 0; j < SEGS_AROUND; j++) {
      const a = i * A + j;
      const b = (i + 1) * A + j;
      // winding: outward normals (around × up) for both mirrored and unmirrored chains
      if (side === 'R') idx.push(a, a + 1, b, a + 1, b + 1, b);
      else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const geom = new BufferGeometry();
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  geom.setAttribute('position', new BufferAttribute(pos, 3));
  geom.setAttribute('normal', new BufferAttribute(nor, 3));
  geom.setIndex(idx);
  return { rings: R, around: A, segA, segB, wB, localA, localB, geom, pos, nor };
}

export class SkinLoft {
  readonly geometries: BufferGeometry[] = [];
  private chains: Chain[] = [];
  constructor() {
    this.chains.push(buildChain(TRUNK, null));
    for (const s of ['R', 'L'] as Side[]) {
      this.chains.push(buildChain(ARM, s));
      this.chains.push(buildChain(LEG, s));
    }
    for (const c of this.chains) this.geometries.push(c.geom);
  }

  update(state: RigState) {
    for (const ch of this.chains) {
      const { pos, nor, localA, localB, segA, segB, wB } = ch;
      const nv = ch.rings * ch.around;
      for (let v = 0; v < nv; v++) {
        const ia = segA[v];
        _a.set(localA[v * 3], localA[v * 3 + 1], localA[v * 3 + 2]).applyQuaternion(state.quat[ia]).add(state.pos[ia]);
        const w = wB[v];
        if (w > 0) {
          const ib = segB[v];
          _b.set(localB[v * 3], localB[v * 3 + 1], localB[v * 3 + 2]).applyQuaternion(state.quat[ib]).add(state.pos[ib]);
          _a.lerp(_b, w);
        }
        pos[v * 3] = _a.x;
        pos[v * 3 + 1] = _a.y;
        pos[v * 3 + 2] = _a.z;
      }
      this.normals(ch);
      ch.geom.attributes.position.needsUpdate = true;
      ch.geom.attributes.normal.needsUpdate = true;
    }
  }

  /** Grid normals from neighbouring vertices (outward). */
  private normals(ch: Chain) {
    const { pos, nor, rings: R, around: A } = ch;
    const get = (i: number, j: number, out: Vector3) => {
      const v = (Math.min(R - 1, Math.max(0, i)) * A + ((j + SEGS_AROUND) % SEGS_AROUND)) * 3;
      return out.set(pos[v], pos[v + 1], pos[v + 2]);
    };
    const u = _u;
    const d = _d;
    const n = _n;
    const c = _c;
    for (let i = 0; i < R; i++) {
      // ring centre for orientation
      c.set(0, 0, 0);
      for (let j = 0; j < SEGS_AROUND; j++) c.add(get(i, j, tA));
      c.divideScalar(SEGS_AROUND);
      for (let j = 0; j < A; j++) {
        get(i, j + 1, tA);
        get(i, j - 1, tB);
        u.subVectors(tA, tB);
        get(i + 1, j, tA);
        get(i - 1, j, tB);
        d.subVectors(tA, tB);
        n.crossVectors(u, d);
        get(i, j, tA);
        if (n.dot(tB.subVectors(tA, c)) < 0) n.negate();
        if (n.lengthSq() < 1e-14) n.subVectors(tA, c);
        n.normalize();
        const v = (i * A + j) * 3;
        nor[v] = n.x;
        nor[v + 1] = n.y;
        nor[v + 2] = n.z;
      }
    }
  }

  dispose() {
    for (const g of this.geometries) g.dispose();
  }
}

