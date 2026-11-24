// Smooth mannequin skin: lofted, CPU-skinned tubes for the trunk, arms and legs.
// Each ring is an (super)ellipse in the rest pose, bound to one or two segments; vertices are blended
// between the segment transforms every time the pose changes (no allocations in update()).
// The ring tables (LOFT_TRUNK / LOFT_ARM / LOFT_LEG) live in rig.ts: the back / chest rings of the trunk also ground
// the figure there, vertex for vertex (GROUND_RINGS), so what touches the floor is exactly what is drawn.
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { LOFT_ARM, LOFT_AROUND, LOFT_LEG, LOFT_TRUNK, type LoftChainDef, loftBinding, newLoftBinding, type RigState, SEG_INDEX, segRestOrigin, type Side, skinVertex, bladeSamplesWorld, newBladeSamples } from './rig';

const SEGS_AROUND = LOFT_AROUND;

interface Chain {
  rings: number;
  around: number;
  /** per vertex: rest local offsets for up to 2 segments */
  segA: Int16Array;
  segB: Int16Array;
  wB: Float32Array;
  localA: Float32Array;
  localB: Float32Array;
  /** per vertex: drape kind (0 none, 1 shoulder blade — rig.ts loftBinding / skinVertex), its weight,
   *  rest normal and rest push (subtracted, so the rest shape is unchanged) */
  drape: Uint8Array;
  dw: Float32Array;
  nrm: Float32Array;
  push0: Float32Array;
  geom: BufferGeometry;
  pos: Float32Array;
  nor: Float32Array;
}

const _a = new Vector3();
const tA = new Vector3();
const tB = new Vector3();
const _u = new Vector3();
const _d = new Vector3();
const _n = new Vector3();
const _c = new Vector3();

function buildChain(def: LoftChainDef, side: Side | null): Chain {
  const R = def.rings.length;
  const A = SEGS_AROUND + 1;
  const nv = R * A;
  const segA = new Int16Array(nv);
  const segB = new Int16Array(nv);
  const wB = new Float32Array(nv);
  const localA = new Float32Array(nv * 3);
  const localB = new Float32Array(nv * 3);
  const b = newLoftBinding();
  const nrm = new Float32Array(nv * 3);
  const push0 = new Float32Array(nv);
  const drape = new Uint8Array(nv);
  const dw = new Float32Array(nv);
  const oA = new Vector3();
  const oB = new Vector3();
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < A; j++) {
      // rest point + the segment(s) it follows (rig.ts loftBinding: the grounding uses the same binding)
      const { p } = loftBinding(def, i, j % SEGS_AROUND, side, b);
      segRestOrigin(b.segA, oA);
      segRestOrigin(b.segB, oB);
      const v = i * A + j;
      segA[v] = SEG_INDEX[b.segA];
      segB[v] = SEG_INDEX[b.segB];
      wB[v] = b.w;
      localA[v * 3] = p.x - oA.x;
      localA[v * 3 + 1] = p.y - oA.y;
      localA[v * 3 + 2] = p.z - oA.z;
      localB[v * 3] = p.x - oB.x;
      localB[v * 3 + 1] = p.y - oB.y;
      localB[v * 3 + 2] = p.z - oB.z;
      if (b.drape) {
        drape[v] = b.drape;
        dw[v] = b.dw;
        nrm.set([b.n.x, b.n.y, b.n.z], v * 3);
        push0[v] = b.push0;
      }
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
  return { rings: R, around: A, segA, segB, wB, localA, localB, drape, dw, nrm, push0, geom, pos, nor };
}

/** Vertex (i = ring, clamped; j = around, wrapped) of a lofted grid into `out`. */
function gridPoint(pos: Float32Array, R: number, A: number, i: number, j: number, out: Vector3) {
  const v = (Math.min(R - 1, Math.max(0, i)) * A + ((j + SEGS_AROUND) % SEGS_AROUND)) * 3;
  return out.set(pos[v], pos[v + 1], pos[v + 2]);
}

export class SkinLoft {
  readonly geometries: BufferGeometry[] = [];
  private chains: Chain[] = [];
  constructor() {
    this.chains.push(buildChain(LOFT_TRUNK, null));
    for (const s of ['R', 'L'] as Side[]) {
      this.chains.push(buildChain(LOFT_ARM, s));
      this.chains.push(buildChain(LOFT_LEG, s));
    }
    for (const c of this.chains) this.geometries.push(c.geom);
  }

  /** world positions of the drape samples (shoulder blades) for the current pose */
  private samples = newBladeSamples();
  update(state: RigState) {
    bladeSamplesWorld(state, this.samples);
    for (const ch of this.chains) {
      const { pos, localA, localB, segA, segB, wB, drape, dw, nrm, push0 } = ch;
      const nv = ch.rings * ch.around;
      for (let v = 0; v < nv; v++) {
        skinVertex(state, segA[v], localA, segB[v], localB, wB[v], drape[v], dw[v], nrm, push0, this.samples, v * 3, _a);
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
    const u = _u;
    const d = _d;
    const n = _n;
    const c = _c;
    for (let i = 0; i < R; i++) {
      // ring centre for orientation
      c.set(0, 0, 0);
      for (let j = 0; j < SEGS_AROUND; j++) c.add(gridPoint(pos, R, A, i, j, tA));
      c.divideScalar(SEGS_AROUND);
      for (let j = 0; j < A; j++) {
        gridPoint(pos, R, A, i, j + 1, tA);
        gridPoint(pos, R, A, i, j - 1, tB);
        u.subVectors(tA, tB);
        gridPoint(pos, R, A, i + 1, j, tA);
        gridPoint(pos, R, A, i - 1, j, tB);
        d.subVectors(tA, tB);
        n.crossVectors(u, d);
        gridPoint(pos, R, A, i, j, tA);
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

