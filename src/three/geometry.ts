// Geometry helpers: ellipsoids, tapered capsules, (variable-radius) tubes, thick sheets, merging & mirroring.
import { BufferAttribute, BufferGeometry, Euler, LatheGeometry, Quaternion, SphereGeometry, Vector2, Vector3 } from 'three';

/** Right-side rest point from lateral-positive coords. */
export const R = (lat: number, y: number, z: number) => new Vector3(-lat, y, z);
export const M = (y: number, z: number) => new Vector3(0, y, z);

const UP = new Vector3(0, 1, 0);

export function ellipsoid(c: Vector3, r: [number, number, number], rot?: Euler, w = 20, h = 14): BufferGeometry {
  const g = new SphereGeometry(1, w, h);
  g.scale(r[0], r[1], r[2]);
  if (rot) g.applyQuaternion(new Quaternion().setFromEuler(rot));
  g.translate(c.x, c.y, c.z);
  return g;
}

export function sphere(c: Vector3, r: number, w = 16, h = 12): BufferGeometry {
  return ellipsoid(c, [r, r, r], undefined, w, h);
}

/** Tapered capsule between a and b (radii ra at a, rb at b). */
export function capsule(a: Vector3, b: Vector3, ra: number, rb = ra, radial = 14, capSeg = 6): BufferGeometry {
  const dir = new Vector3().subVectors(b, a);
  const len = Math.max(1e-5, dir.length());
  dir.divideScalar(len);
  const pts: Vector2[] = [];
  for (let i = 0; i <= capSeg; i++) {
    const t = -Math.PI / 2 + (i / capSeg) * (Math.PI / 2);
    pts.push(new Vector2(Math.max(1e-5, ra * Math.cos(t)), ra * Math.sin(t)));
  }
  for (let i = 0; i <= capSeg; i++) {
    const t = (i / capSeg) * (Math.PI / 2);
    pts.push(new Vector2(Math.max(1e-5, rb * Math.cos(t)), len + rb * Math.sin(t)));
  }
  const g = new LatheGeometry(pts, radial);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(UP, dir));
  g.translate(a.x, a.y, a.z);
  return g;
}

// ── curves

/** Centripetal Catmull-Rom point for segment p1→p2 (alpha 0.5). Writes into out. */
export function crPoint(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, u: number, out: Vector3): Vector3 {
  const d01 = Math.max(1e-4, Math.sqrt(p0.distanceTo(p1)));
  const d12 = Math.max(1e-4, Math.sqrt(p1.distanceTo(p2)));
  const d23 = Math.max(1e-4, Math.sqrt(p2.distanceTo(p3)));
  const t0 = 0;
  const t1 = t0 + d01;
  const t2 = t1 + d12;
  const t3 = t2 + d23;
  const t = t1 + (t2 - t1) * u;
  const comp = (a: number, b: number, c: number, d: number) => {
    const a1 = ((t1 - t) / (t1 - t0)) * a + ((t - t0) / (t1 - t0)) * b;
    const a2 = ((t2 - t) / (t2 - t1)) * b + ((t - t1) / (t2 - t1)) * c;
    const a3 = ((t3 - t) / (t3 - t2)) * c + ((t - t2) / (t3 - t2)) * d;
    const b1 = ((t2 - t) / (t2 - t0)) * a1 + ((t - t0) / (t2 - t0)) * a2;
    const b2 = ((t3 - t) / (t3 - t1)) * a2 + ((t - t1) / (t3 - t1)) * a3;
    return ((t2 - t) / (t2 - t1)) * b1 + ((t - t1) / (t2 - t1)) * b2;
  };
  return out.set(comp(p0.x, p1.x, p2.x, p3.x), comp(p0.y, p1.y, p2.y, p3.y), comp(p0.z, p1.z, p2.z, p3.z));
}

/**
 * Allocation-free curve sampler: centripetal Catmull-Rom through control points,
 * resampled to `n` points evenly spaced by arc length.
 */
export class CurveSampler {
  private dense: Vector3[];
  private lens: Float32Array;
  private ghostA = new Vector3();
  private ghostB = new Vector3();
  constructor(
    maxCtrl: number,
    private perSeg = 10,
  ) {
    const nd = Math.max(2, (maxCtrl - 1) * perSeg + 1);
    this.dense = Array.from({ length: nd }, () => new Vector3());
    this.lens = new Float32Array(nd);
  }
  /** Returns the curve length. `out` must have length ≥ n. */
  sample(ctrl: Vector3[], nCtrl: number, out: Vector3[], n: number, closed = false): number {
    const per = this.perSeg;
    let nd = 0;
    if (nCtrl < 2) {
      for (let i = 0; i < n; i++) out[i].copy(ctrl[0]);
      return 0;
    }
    const segs = closed ? nCtrl : nCtrl - 1;
    const get = (i: number): Vector3 => {
      if (closed) return ctrl[((i % nCtrl) + nCtrl) % nCtrl];
      if (i < 0) return this.ghostA.copy(ctrl[0]).multiplyScalar(2).sub(ctrl[1]);
      if (i >= nCtrl) return this.ghostB.copy(ctrl[nCtrl - 1]).multiplyScalar(2).sub(ctrl[nCtrl - 2]);
      return ctrl[i];
    };
    for (let s = 0; s < segs; s++) {
      const p0 = get(s - 1);
      const p1 = get(s);
      const p2 = get(s + 1);
      const p3 = get(s + 2);
      const steps = per;
      for (let k = s === 0 ? 0 : 1; k <= steps; k++) {
        if (nd >= this.dense.length) break;
        if (nCtrl === 2 && !closed) this.dense[nd].lerpVectors(p1, p2, k / steps);
        else crPoint(p0, p1, p2, p3, k / steps, this.dense[nd]);
        nd++;
      }
    }
    // cumulative lengths
    this.lens[0] = 0;
    for (let i = 1; i < nd; i++) this.lens[i] = this.lens[i - 1] + this.dense[i].distanceTo(this.dense[i - 1]);
    const total = this.lens[nd - 1];
    let j = 1;
    for (let i = 0; i < n; i++) {
      const target = (i / (n - 1)) * total;
      while (j < nd - 1 && this.lens[j] < target) j++;
      const l0 = this.lens[j - 1];
      const l1 = this.lens[j];
      const f = l1 > l0 ? (target - l0) / (l1 - l0) : 0;
      out[i].lerpVectors(this.dense[j - 1], this.dense[j], Math.min(1, Math.max(0, f)));
    }
    return total;
  }
}

// ── tube writer (also used for animated strands)

const _t = new Vector3();
const _n = new Vector3();
const _b = new Vector3();
const _w = new Vector3();
const _tmp = new Vector3();

/**
 * Writes a tube along `n` ring centres into preallocated position/normal arrays.
 * Ring k has `radial + 1` vertices (seam duplicated). Optional elliptical cross-section:
 * width axis = cross(tangent, flatNormal) with half-width radii[k] * flatScale, thickness radii[k].
 */
export class TubeWriter {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly index: Uint16Array | Uint32Array;
  private normalsPrev = new Vector3();
  constructor(
    readonly n: number,
    readonly radial: number,
    closed = false,
  ) {
    const nv = n * (radial + 1);
    this.positions = new Float32Array(nv * 3);
    this.normals = new Float32Array(nv * 3);
    const segs = closed ? n : n - 1;
    const idx = nv > 65000 ? new Uint32Array(segs * radial * 6) : new Uint16Array(segs * radial * 6);
    let o = 0;
    for (let k = 0; k < segs; k++) {
      const k2 = (k + 1) % n;
      for (let j = 0; j < radial; j++) {
        const a = k * (radial + 1) + j;
        const b = k2 * (radial + 1) + j;
        const c = b + 1;
        const d = a + 1;
        idx[o++] = a;
        idx[o++] = d;
        idx[o++] = b;
        idx[o++] = b;
        idx[o++] = d;
        idx[o++] = c;
      }
    }
    this.index = idx;
  }

  write(pts: Vector3[], radii: ArrayLike<number>, flatNormal?: Vector3 | null, flatScale = 1) {
    const { n, radial, positions: P, normals: N } = this;
    for (let k = 0; k < n; k++) {
      // tangent
      if (k === 0) _t.subVectors(pts[1], pts[0]);
      else if (k === n - 1) _t.subVectors(pts[n - 1], pts[n - 2]);
      else _t.subVectors(pts[k + 1], pts[k - 1]);
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
        if (k === 0) {
          const ax = Math.abs(_t.x) < 0.9 ? _tmp.set(1, 0, 0) : _tmp.set(0, 1, 0);
          _n.crossVectors(_t, ax).normalize();
        } else {
          _n.copy(this.normalsPrev).addScaledVector(_t, -this.normalsPrev.dot(_t));
          if (_n.lengthSq() < 1e-10) _n.crossVectors(_t, _tmp.set(0, 0, 1));
          _n.normalize();
        }
        this.normalsPrev.copy(_n);
        _b.crossVectors(_t, _n).normalize();
      }
      const r = radii[k];
      const rw = flatNormal ? r * flatScale : r;
      const c = pts[k];
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const o = (k * (radial + 1) + j) * 3;
        P[o] = c.x + (_n.x * ca * rw + _b.x * sa * r);
        P[o + 1] = c.y + (_n.y * ca * rw + _b.y * sa * r);
        P[o + 2] = c.z + (_n.z * ca * rw + _b.z * sa * r);
        // ellipse normal
        let nx = (_n.x * ca) / rw + (_b.x * sa) / r;
        let ny = (_n.y * ca) / rw + (_b.y * sa) / r;
        let nz = (_n.z * ca) / rw + (_b.z * sa) / r;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l;
        ny /= l;
        nz /= l;
        N[o] = nx;
        N[o + 1] = ny;
        N[o + 2] = nz;
      }
    }
  }

  toGeometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new BufferAttribute(this.normals, 3));
    g.setIndex(new BufferAttribute(this.index, 1));
    return g;
  }
}

/** Static tube along control points with per-control-point radii (interpolated). Capped with spheres. */
export function tube(ctrl: Vector3[], radius: number | number[], opts: { n?: number; radial?: number; caps?: boolean; closed?: boolean } = {}) {
  const n = opts.n ?? Math.max(8, ctrl.length * 8);
  const radial = opts.radial ?? 8;
  const closed = !!opts.closed;
  const sampler = new CurveSampler(ctrl.length + 1, 12);
  const pts = Array.from({ length: n }, () => new Vector3());
  const src = closed ? [...ctrl] : ctrl;
  sampler.sample(src, src.length, pts, n, closed);
  const radii = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    if (typeof radius === 'number') radii[k] = radius;
    else {
      const f = (k / (n - 1)) * (radius.length - 1);
      const i = Math.min(radius.length - 2, Math.floor(f));
      radii[k] = radius[i] + (radius[i + 1] - radius[i]) * (f - i);
    }
  }
  const w = new TubeWriter(n, radial, closed);
  w.write(pts, radii);
  const g = w.toGeometry();
  if (opts.caps === false || closed) return g;
  return merge([g, sphere(pts[0], radii[0], 10, 8), sphere(pts[n - 1], radii[n - 1], 10, 8)]);
}

/** Thick sheet from a grid of points (rows × cols). */
export function slab(grid: Vector3[][], thickness: number): BufferGeometry {
  const rows = grid.length;
  const cols = grid[0].length;
  const nrm: Vector3[][] = grid.map((row) => row.map(() => new Vector3()));
  const du = new Vector3();
  const dv = new Vector3();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      du.subVectors(grid[r][Math.min(cols - 1, c + 1)], grid[r][Math.max(0, c - 1)]);
      dv.subVectors(grid[Math.min(rows - 1, r + 1)][c], grid[Math.max(0, r - 1)][c]);
      nrm[r][c].crossVectors(du, dv);
      if (nrm[r][c].lengthSq() < 1e-14) nrm[r][c].set(0, 0, 1);
      nrm[r][c].normalize();
    }
  }
  // fix degenerate normals (e.g. collapsed rows) by borrowing neighbours
  const pos: number[] = [];
  const idx: number[] = [];
  const h = thickness / 2;
  const base = (offSign: number) => {
    const start = pos.length / 3;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const p = grid[r][c];
        const nn = nrm[r][c];
        pos.push(p.x + nn.x * h * offSign, p.y + nn.y * h * offSign, p.z + nn.z * h * offSign);
      }
    return start;
  };
  const f = base(1);
  const b = base(-1);
  const at = (s: number, r: number, c: number) => s + r * cols + c;
  for (let r = 0; r < rows - 1; r++)
    for (let c = 0; c < cols - 1; c++) {
      idx.push(at(f, r, c), at(f, r, c + 1), at(f, r + 1, c));
      idx.push(at(f, r, c + 1), at(f, r + 1, c + 1), at(f, r + 1, c));
      idx.push(at(b, r, c), at(b, r + 1, c), at(b, r, c + 1));
      idx.push(at(b, r, c + 1), at(b, r + 1, c), at(b, r + 1, c + 1));
    }
  // border walls (own vertices so normals don't smear)
  const loop: [number, number][] = [];
  for (let c = 0; c < cols; c++) loop.push([0, c]);
  for (let r = 1; r < rows; r++) loop.push([r, cols - 1]);
  for (let c = cols - 2; c >= 0; c--) loop.push([rows - 1, c]);
  for (let r = rows - 2; r > 0; r--) loop.push([r, 0]);
  for (let i = 0; i < loop.length; i++) {
    const [r0, c0] = loop[i];
    const [r1, c1] = loop[(i + 1) % loop.length];
    const s = pos.length / 3;
    const P = (rr: number, cc: number, sg: number) => {
      const p = grid[rr][cc];
      const nn = nrm[rr][cc];
      pos.push(p.x + nn.x * h * sg, p.y + nn.y * h * sg, p.z + nn.z * h * sg);
    };
    P(r0, c0, 1);
    P(r1, c1, 1);
    P(r1, c1, -1);
    P(r0, c0, -1);
    idx.push(s, s + 2, s + 1, s, s + 3, s + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Merge geometries (position + normal only). */
export function merge(geos: BufferGeometry[]): BufferGeometry {
  let nv = 0;
  let ni = 0;
  for (const g of geos) {
    nv += g.getAttribute('position').count;
    ni += g.index ? g.index.count : g.getAttribute('position').count;
  }
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const idx = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos[(vo + i) * 3] = p.getX(i);
      pos[(vo + i) * 3 + 1] = p.getY(i);
      pos[(vo + i) * 3 + 2] = p.getZ(i);
      nor[(vo + i) * 3] = n.getX(i);
      nor[(vo + i) * 3 + 1] = n.getY(i);
      nor[(vo + i) * 3 + 2] = n.getZ(i);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.getX(i) + vo;
    else for (let i = 0; i < p.count; i++) idx[io++] = i + vo;
    vo += p.count;
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, 3));
  out.setAttribute('normal', new BufferAttribute(nor, 3));
  out.setIndex(new BufferAttribute(idx, 1));
  return out;
}

/** Mirror across x = 0 (fixes triangle winding). */
export function mirrorX(g: BufferGeometry): BufferGeometry {
  const m = g.clone();
  m.scale(-1, 1, 1);
  if (m.index) {
    const a = m.index.array as Uint16Array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
    m.index.needsUpdate = true;
  }
  return m;
}

export function deg(x: number, y: number, z: number) {
  const D = Math.PI / 180;
  return new Euler(x * D, y * D, z * D);
}
