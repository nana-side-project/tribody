// Animated tapered tubes ("strands") between attachment points — muscles, tendons, ligaments, nerves.
// Geometry is updated in place every frame (no allocations in update()).
import { BufferAttribute, BufferGeometry, Color, type Material, Mesh, Quaternion, Vector3 } from 'three';
import { CurveSampler, TubeWriter } from './geometry';
import { type CompiledPoint, evalPoint, pointSeg } from './landmarks';
import type { RigState, Side } from './rig';
import type { Strand } from './rig-data/types';

export const RINGS = 30;

export type FlatNormal = NonNullable<Strand['flat']>['normal'];

const FLAT_LOCAL: Record<NonNullable<FlatNormal>, [number, number, number]> = {
  lateral: [-1, 0, 0],
  medial: [1, 0, 0],
  anterior: [0, 0, 1],
  posterior: [0, 0, -1],
  superior: [0, 1, 0],
  inferior: [0, -1, 0],
};

export interface StrandProfile {
  /** belly radius (m) */
  radius: number;
  tendon: [number, number];
  /** 'muscle' = fusiform belly; 'cord' = uniform (tendons, nerves, ligaments) */
  kind: 'muscle' | 'cord';
  flat?: { width: number; normal?: FlatNormal };
}

const _c = new Color();
const _flatN = new Vector3();
const _q = new Quaternion();

export class StrandMesh {
  readonly mesh: Mesh;
  halo: Mesh | null = null;
  readonly rings: Vector3[];
  /** current length (m) and rest length L0 (reference pose) */
  length = 0;
  L0 = 1;
  ratio = 1;
  /** index of the belly-centre ring (label anchor) */
  readonly bellyRing: number;
  private ctrlWorld: Vector3[];
  private sampler: CurveSampler;
  private writer: TubeWriter;
  private haloWriter: TubeWriter | null = null;
  private radii: Float32Array;
  private haloRadii: Float32Array;
  private shape: Float32Array; // 0..1 belly shape per ring
  private mix: Float32Array; // 0 tendon colour .. 1 belly colour
  private colors: Float32Array;
  private geom: BufferGeometry;
  private flatSide: Side;

  constructor(
    readonly ctrl: CompiledPoint[],
    readonly profile: StrandProfile,
    material: Material,
    side: Side,
    radial = profile.flat ? 12 : 10,
  ) {
    this.flatSide = side;
    const n = RINGS;
    this.rings = Array.from({ length: n }, () => new Vector3());
    this.ctrlWorld = ctrl.map(() => new Vector3());
    this.sampler = new CurveSampler(Math.max(2, ctrl.length), 10);
    this.writer = new TubeWriter(n, radial);
    this.radii = new Float32Array(n);
    this.haloRadii = new Float32Array(n);
    this.shape = new Float32Array(n);
    this.mix = new Float32Array(n);
    this.computeProfile(profile.tendon[0], profile.tendon[1]);
    let best = 0;
    let bestV = -1;
    for (let k = 0; k < n; k++) {
      const v = this.shape[k] * this.mix[k];
      if (v > bestV) {
        bestV = v;
        best = k;
      }
    }
    this.bellyRing = profile.kind === 'cord' ? Math.round((n - 1) / 2) : best;
    const g = this.writer.toGeometry();
    const nv = n * (radial + 1);
    this.colors = new Float32Array(nv * 3);
    g.setAttribute('color', new BufferAttribute(this.colors, 3));
    const fib = new Float32Array(nv * 2);
    for (let k = 0; k < n; k++)
      for (let j = 0; j <= radial; j++) {
        const o = (k * (radial + 1) + j) * 2;
        fib[o] = j / radial;
        fib[o + 1] = profile.kind === 'cord' ? 0.5 : this.mix[k];
      }
    g.setAttribute('aFib', new BufferAttribute(fib, 2));
    this.geom = g;
    this.mesh = new Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  /** Tendon lengths (m) — fixed, so only the contractile belly changes length. */
  private tendonLen: [number, number] = [0, 0];
  /** Belly (fibre) length ratio — drives thickness & colour. */
  bellyRatio = 1;

  /** Set the rest length L0 (reference pose). */
  setRest(L0: number) {
    this.L0 = Math.max(1e-4, L0);
    this.tendonLen = [this.profile.tendon[0] * this.L0, this.profile.tendon[1] * this.L0];
  }

  private computeProfile(ts: number, te: number) {
    const n = RINGS;
    const b0 = Math.min(0.9, Math.max(0, ts));
    const b1 = Math.max(b0 + 0.08, Math.min(1, 1 - te));
    for (let k = 0; k < n; k++) {
      const s = k / (n - 1);
      if (this.profile.kind === 'cord') {
        this.shape[k] = 1 - 0.35 * Math.pow(Math.abs(2 * s - 1), 6);
        this.mix[k] = 1;
      } else {
        const u = Math.min(1, Math.max(0, (s - b0) / (b1 - b0)));
        this.shape[k] = Math.pow(Math.sin(Math.PI * u), 0.62);
        this.mix[k] =
          (ts > 0.001 ? smooth(b0 - 0.03, b0 + 0.06, s) : 1) * (te > 0.001 ? 1 - smooth(b1 - 0.06, b1 + 0.03, s) : 1);
      }
    }
  }

  /** Measure the length for a state (used for L0). */
  measure(state: RigState): number {
    for (let i = 0; i < this.ctrl.length; i++) evalPoint(this.ctrl[i], state, this.ctrlWorld[i]);
    return this.sampler.sample(this.ctrlWorld, this.ctrl.length, this.rings, RINGS);
  }

  enableHalo(material: Material) {
    if (this.halo) return;
    this.haloWriter = new TubeWriter(RINGS, 10);
    const g = this.haloWriter.toGeometry();
    this.halo = new Mesh(g, material);
    this.halo.frustumCulled = false;
    this.halo.matrixAutoUpdate = false;
    this.halo.renderOrder = 5;
  }

  /**
   * Update geometry for the current rig state.
   * belly/tendon: linear-space colours. thick: extra radius multiplier (role emphasis).
   */
  update(state: RigState, belly: Color, tendon: Color, thick = 1) {
    this.length = this.measure(state);
    this.ratio = this.L0 > 1e-6 ? this.length / this.L0 : 1;
    const p = this.profile;
    if (p.kind === 'muscle') {
      const Lt = this.tendonLen[0] + this.tendonLen[1];
      const L = Math.max(this.length, Lt + 0.01);
      this.bellyRatio = (L - Lt) / Math.max(1e-4, this.L0 - Lt);
      if (Lt > 0) this.computeProfile(this.tendonLen[0] / L, this.tendonLen[1] / L);
    } else this.bellyRatio = this.ratio;
    const scale = p.kind === 'muscle' ? Math.min(1.5, Math.max(0.65, Math.sqrt(1 / Math.max(0.05, this.bellyRatio)))) : 1;
    const rb = p.radius * scale * thick;
    const rt = p.kind === 'muscle' ? Math.max(0.0016, p.radius * 0.24) * thick : p.radius * thick;
    for (let k = 0; k < RINGS; k++) {
      this.radii[k] = p.kind === 'cord' ? rt * this.shape[k] : rt + (rb - rt) * this.shape[k];
    }
    let flatN: Vector3 | null = null;
    let flatScale = 1;
    if (p.flat) {
      const seg = pointSeg(this.ctrl[0]);
      const l = FLAT_LOCAL[p.flat.normal ?? 'lateral'];
      _flatN.set(this.flatSide === 'L' ? -l[0] : l[0], l[1], l[2]).applyQuaternion(_q.copy(state.quat[seg]));
      flatN = _flatN;
      flatScale = p.flat.width / 2 / Math.max(1e-4, p.radius * thick);
    }
    this.writer.write(this.rings, this.radii, flatN, flatScale);
    const radial = this.writer.radial;
    const C = this.colors;
    for (let k = 0; k < RINGS; k++) {
      _c.copy(tendon).lerp(belly, this.mix[k]);
      for (let j = 0; j <= radial; j++) {
        const o = (k * (radial + 1) + j) * 3;
        C[o] = _c.r;
        C[o + 1] = _c.g;
        C[o + 2] = _c.b;
      }
    }
    const g = this.geom;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    if (this.halo && this.haloWriter && this.halo.visible) {
      for (let k = 0; k < RINGS; k++) this.haloRadii[k] = this.radii[k] * 1.9 + 0.004;
      this.haloWriter.write(this.rings, this.haloRadii, flatN, flatN ? flatScale * 0.85 : 1);
      const hg = this.halo.geometry;
      hg.attributes.position.needsUpdate = true;
      hg.attributes.normal.needsUpdate = true;
    }
  }

  dispose() {
    this.geom.dispose();
    this.halo?.geometry.dispose();
  }
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
