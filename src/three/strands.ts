// Animated tapered tubes ("strands") between attachment points — muscles, tendons, ligaments, nerves.
// Geometry is updated in place every frame (no allocations in pose() / write()).
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

/** Flat bands (sheets, aponeuroses): share of the round-tube normal in the shading normal. A true ellipse normal is
 *  almost one direction over the whole face, so a band facing slightly away from the key light (or catching no
 *  highlight) reads uniformly dark — i.e. as a deep-red "contracted" muscle while it is at rest. With a gently curved
 *  normal across the width the band shades like the round strands next to it, so only colour and thickness tell the
 *  length ratio. 0 = exact ellipse normal, 1 = round tube normal. */
const FLAT_ROUND = 0.65;

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
const _t = new Vector3();
const _n = new Vector3();
const _b = new Vector3();
const _w = new Vector3();
const _tmp = new Vector3();

/** Same layout as TubeWriter (ring k has radial + 1 vertices), but per-frame cheaper: cos / sin tables per vertex
 *  column and closed-form normals (the ring frame is orthonormal), no Math.hypot. Flat bands get the softened normal
 *  described at FLAT_ROUND. */
class StrandTubeWriter extends TubeWriter {
  private cs: Float32Array;
  private sn: Float32Array;
  private prev = new Vector3();
  constructor(n: number, radial: number) {
    super(n, radial);
    this.cs = new Float32Array(radial + 1);
    this.sn = new Float32Array(radial + 1);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      this.cs[j] = Math.cos(a);
      this.sn[j] = Math.sin(a);
    }
  }

  write(pts: Vector3[], radii: ArrayLike<number>, flatNormal?: Vector3 | null, flatScale = 1) {
    const { n, radial, positions: P, normals: N, cs, sn } = this;
    // flat: shading normal ∝ n·ca·k + b·sa (k between the ellipse value r / rw and 1)
    const k = flatNormal ? Math.min(1, 1 / Math.max(1e-4, flatScale) + FLAT_ROUND) : 1;
    for (let i = 0; i < n; i++) {
      if (i === 0) _t.subVectors(pts[1], pts[0]);
      else if (i === n - 1) _t.subVectors(pts[n - 1], pts[n - 2]);
      else _t.subVectors(pts[i + 1], pts[i - 1]);
      if (_t.lengthSq() < 1e-12) _t.set(0, 1, 0);
      _t.normalize();
      if (flatNormal) {
        _w.crossVectors(_t, flatNormal);
        if (_w.lengthSq() < 1e-8) _w.crossVectors(_t, _tmp.set(0.3, 0.7, 0.2).normalize());
        _w.normalize();
        _n.copy(_w);
        _b.crossVectors(_t, _w).normalize();
      } else {
        // parallel transport of the normal
        if (i === 0) {
          const ax = Math.abs(_t.x) < 0.9 ? _tmp.set(1, 0, 0) : _tmp.set(0, 1, 0);
          _n.crossVectors(_t, ax).normalize();
        } else {
          _n.copy(this.prev).addScaledVector(_t, -this.prev.dot(_t));
          if (_n.lengthSq() < 1e-10) _n.crossVectors(_t, _tmp.set(0, 0, 1));
          _n.normalize();
        }
        this.prev.copy(_n);
        _b.crossVectors(_t, _n).normalize();
      }
      const r = radii[i];
      const rw = flatNormal ? r * flatScale : r;
      const c = pts[i];
      const nx = _n.x,
        ny = _n.y,
        nz = _n.z,
        bx = _b.x,
        by = _b.y,
        bz = _b.z;
      let o = i * (radial + 1) * 3;
      for (let j = 0; j <= radial; j++, o += 3) {
        const ca = cs[j];
        const sa = sn[j];
        P[o] = c.x + nx * ca * rw + bx * sa * r;
        P[o + 1] = c.y + ny * ca * rw + by * sa * r;
        P[o + 2] = c.z + nz * ca * rw + bz * sa * r;
        if (k === 1) {
          N[o] = nx * ca + bx * sa;
          N[o + 1] = ny * ca + by * sa;
          N[o + 2] = nz * ca + bz * sa;
        } else {
          const a = ca * k;
          const inv = 1 / Math.sqrt(a * a + sa * sa);
          N[o] = (nx * a + bx * sa) * inv;
          N[o + 1] = (ny * a + by * sa) * inv;
          N[o + 2] = (nz * a + bz * sa) * inv;
        }
      }
    }
  }
}

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
  /** ring radii of the last write() (zones on this strand read them) */
  readonly radii: Float32Array;
  private haloRadii: Float32Array;
  private shape: Float32Array; // 0..1 belly shape per ring
  private mix: Float32Array; // 0 tendon colour .. 1 belly colour
  private colors: Float32Array;
  private geom: BufferGeometry;
  private flatSide: Side;
  /** colour buffer cache: rewritten only when a colour or the tendon / belly split changed */
  private colBelly = new Color(-1, -1, -1);
  private colTendon = new Color(-1, -1, -1);
  private colRatio = -1;

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
    this.writer = new StrandTubeWriter(n, radial);
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

  /** Measure the length for a state (used for L0). Updates the ring centres. */
  measure(state: RigState): number {
    for (let i = 0; i < this.ctrl.length; i++) evalPoint(this.ctrl[i], state, this.ctrlWorld[i]);
    return this.sampler.sample(this.ctrlWorld, this.ctrl.length, this.rings, RINGS);
  }

  /** Pose the centre line for a rig state: ring centres, length, ratio and belly ratio. Writes no geometry (cheap:
   *  used for framing / label pre-passes and before choosing the colour, which depends on the fresh belly ratio). */
  pose(state: RigState) {
    this.length = this.measure(state);
    this.ratio = this.L0 > 1e-6 ? this.length / this.L0 : 1;
    if (this.profile.kind === 'muscle') {
      const Lt = this.tendonLen[0] + this.tendonLen[1];
      const L = Math.max(this.length, Lt + 0.01);
      this.bellyRatio = (L - Lt) / Math.max(1e-4, this.L0 - Lt);
    } else this.bellyRatio = this.ratio;
    const f = this.profile.flat;
    if (f) {
      // flat bands: sheet normal in the frame of the first point's bone
      const l = FLAT_LOCAL[f.normal ?? 'lateral'];
      this.flatDir.set(this.flatSide === 'L' ? -l[0] : l[0], l[1], l[2]).applyQuaternion(_q.copy(state.quat[pointSeg(this.ctrl[0])]));
    }
  }

  /** flat bands: world sheet normal of the last pose() */
  readonly flatDir = new Vector3();
  /** flat bands: width / thickness ratio of the last write() (1 = round) */
  flatScale = 1;

  /**
   * Write the tube geometry for the last pose().
   * belly/tendon: linear-space colours. thick: extra radius multiplier (role emphasis).
   */
  write(belly: Color, tendon: Color, thick = 1) {
    const p = this.profile;
    if (p.kind === 'muscle') {
      const Lt = this.tendonLen[0] + this.tendonLen[1];
      const L = Math.max(this.length, Lt + 0.01);
      if (Lt > 0) this.computeProfile(this.tendonLen[0] / L, this.tendonLen[1] / L);
    }
    const scale = p.kind === 'muscle' ? Math.min(1.5, Math.max(0.65, Math.sqrt(1 / Math.max(0.05, this.bellyRatio)))) : 1;
    const rb = p.radius * scale * thick;
    const rt = p.kind === 'muscle' ? Math.max(0.0016, p.radius * 0.24) * thick : p.radius * thick;
    for (let k = 0; k < RINGS; k++) {
      this.radii[k] = p.kind === 'cord' ? rt * this.shape[k] : rt + (rb - rt) * this.shape[k];
    }
    let flatN: Vector3 | null = null;
    let flatScale = 1;
    if (p.flat) {
      flatN = _flatN.copy(this.flatDir);
      flatScale = p.flat.width / 2 / Math.max(1e-4, p.radius * thick);
    }
    this.flatScale = flatScale;
    this.writer.write(this.rings, this.radii, flatN, flatScale);
    const g = this.geom;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    // colours: the tendon / belly split only moves with the length (muscles with tendons)
    const mixKey = p.kind === 'muscle' && this.tendonLen[0] + this.tendonLen[1] > 0 ? this.ratio : 1;
    if (!this.colBelly.equals(belly) || !this.colTendon.equals(tendon) || Math.abs(mixKey - this.colRatio) > 0.002) {
      this.colBelly.copy(belly);
      this.colTendon.copy(tendon);
      this.colRatio = mixKey;
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
      g.attributes.color.needsUpdate = true;
    }
    if (this.halo && this.haloWriter && this.halo.visible) {
      for (let k = 0; k < RINGS; k++) this.haloRadii[k] = this.radii[k] * 1.9 + 0.004;
      this.haloWriter.write(this.rings, this.haloRadii, flatN, flatN ? flatScale * 0.85 : 1);
      const hg = this.halo.geometry;
      hg.attributes.position.needsUpdate = true;
      hg.attributes.normal.needsUpdate = true;
    }
  }

  /** pose() + write(). */
  update(state: RigState, belly: Color, tendon: Color, thick = 1) {
    this.pose(state);
    this.write(belly, tendon, thick);
  }

  enableHalo(material: Material) {
    if (this.halo) return;
    this.haloWriter = new StrandTubeWriter(RINGS, 10);
    const g = this.haloWriter.toGeometry();
    this.halo = new Mesh(g, material);
    this.halo.frustumCulled = false;
    this.halo.matrixAutoUpdate = false;
    this.halo.renderOrder = 5;
  }

  dispose() {
    this.geom.dispose();
    this.halo?.geometry.dispose();
  }
}

const _sp = new Vector3();

/** A lesion zone on a strand (the Achilles midportion, a tendon's insertion…): a slightly fatter tube over the
 *  parent's centre line between two arc-length fractions, with rounded ends. It follows the parent in every pose:
 *  call write() after the parent's pose() + write() of the same frame (it reads the parent's rings and radii). */
export class SegmentMesh {
  readonly mesh: Mesh;
  halo: Mesh | null = null;
  /** see-through copy (drawn only where something hides the zone) */
  xray: Mesh | null = null;
  readonly rings: Vector3[];
  private radii: Float32Array;
  private writer: StrandTubeWriter;
  private haloWriter: StrandTubeWriter | null = null;
  private xrayWriter: StrandTubeWriter | null = null;
  private tmpRadii: Float32Array;

  constructor(
    readonly parent: StrandMesh,
    /** arc-length fractions along the parent (0 = its first path point, 1 = its last) */
    readonly range: [number, number],
    material: Material,
    /** radius multiplier over the parent's (the zone must sit just outside the parent's surface) */
    readonly grow = 1.45,
    readonly n = 14,
  ) {
    this.rings = Array.from({ length: n }, () => new Vector3());
    this.radii = new Float32Array(n);
    this.tmpRadii = new Float32Array(n);
    const radial = parent.profile.flat ? 12 : 10;
    this.writer = new StrandTubeWriter(n, radial);
    this.mesh = new Mesh(this.writer.toGeometry(), material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  enableHalo(material: Material) {
    if (this.halo) return;
    this.haloWriter = new StrandTubeWriter(this.n, 10);
    this.halo = new Mesh(this.haloWriter.toGeometry(), material);
    this.halo.frustumCulled = false;
    this.halo.matrixAutoUpdate = false;
    this.halo.renderOrder = 5;
  }

  enableXray(material: Material) {
    if (this.xray) return;
    this.xrayWriter = new StrandTubeWriter(this.n, 10);
    this.xray = new Mesh(this.xrayWriter.toGeometry(), material);
    this.xray.frustumCulled = false;
    this.xray.matrixAutoUpdate = false;
    this.xray.renderOrder = 6;
  }

  /** Centre line only (framing / label pre-passes): reads the parent's posed rings. */
  pose() {
    const P = this.parent.rings;
    const last = RINGS - 1;
    const [a, b] = this.range;
    for (let i = 0; i < this.n; i++) {
      const u = (a + ((b - a) * i) / (this.n - 1)) * last;
      const k = Math.min(last - 1, Math.max(0, Math.floor(u)));
      const f = Math.min(1, Math.max(0, u - k));
      this.rings[i].lerpVectors(P[k], P[k + 1], f);
    }
  }

  /** Geometry for the current pose (after the parent's write()). */
  write() {
    this.pose();
    const R = this.parent.radii;
    const last = RINGS - 1;
    const [a, b] = this.range;
    for (let i = 0; i < this.n; i++) {
      const u = (a + ((b - a) * i) / (this.n - 1)) * last;
      const k = Math.min(last - 1, Math.max(0, Math.floor(u)));
      const f = Math.min(1, Math.max(0, u - k));
      const r = R[k] + (R[k + 1] - R[k]) * f;
      // rounded ends (a capsule-like cuff on the tendon), never thinner than the parent in the middle
      const s = (2 * i) / (this.n - 1) - 1;
      const end = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(s), 6)));
      this.radii[i] = Math.max(0.0008, r * this.grow * (0.35 + 0.65 * end));
    }
    const flat = this.parent.profile.flat ? _sp.copy(this.parent.flatDir) : null;
    const fs = flat ? this.parent.flatScale / 1.12 : 1;
    this.writer.write(this.rings, this.radii, flat, fs);
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    if (this.halo && this.haloWriter && this.halo.visible) {
      for (let i = 0; i < this.n; i++) this.tmpRadii[i] = this.radii[i] * 1.7 + 0.004;
      this.haloWriter.write(this.rings, this.tmpRadii, flat, flat ? fs * 0.85 : 1);
      const hg = this.halo.geometry;
      hg.attributes.position.needsUpdate = true;
      hg.attributes.normal.needsUpdate = true;
    }
    if (this.xray && this.xrayWriter) {
      for (let i = 0; i < this.n; i++) this.tmpRadii[i] = this.radii[i] * 1.06;
      this.xrayWriter.write(this.rings, this.tmpRadii, flat, fs);
      const xg = this.xray.geometry;
      xg.attributes.position.needsUpdate = true;
      xg.attributes.normal.needsUpdate = true;
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.halo?.geometry.dispose();
    this.xray?.geometry.dispose();
  }
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
