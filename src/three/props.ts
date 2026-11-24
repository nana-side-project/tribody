// Exercise props (band, step, wall, mat, roller, ball, towel, pillow, dumbbell, slant board, chair/bench, door frame,
// bike).
import {
  BoxGeometry,
  type BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  type Material,
  Mesh,
  type MeshStandardMaterial,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Prop, PropPoint } from './clips/types';
import { TubeWriter } from './geometry';
import { type CompiledPoint, evalPoint, pointSeg, tryCompile } from './landmarks';
import type { Palette } from './materials';
import { solid } from './materials';
import type { AttachRef } from './landmarks';
import { type RigState, SEG_INDEX, type Side, type Vec3 } from './rig';

type Resolved = { kind: 'world'; p: Vector3 } | { kind: 'body'; cp: CompiledPoint; off: Vector3 };

const _v = new Vector3();
const _t = new Vector3();
const UP = new Vector3(0, 1, 0);

/** Soft roll along +Y (length `len`, radius `r`): a lathe with rounded, slightly sunken ends. */
function rollGeometry(r: number, len: number) {
  const h = len / 2;
  const e = Math.min(r * 0.45, h * 0.5);
  const pts: Vector2[] = [new Vector2(0, -h + e * 0.25), new Vector2(r * 0.55, -h + e * 0.12)];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new Vector2(r - e + e * Math.sin(a), -h + e - e * Math.cos(a)));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new Vector2(r - e + e * Math.cos(a), h - e + e * Math.sin(a)));
  }
  pts.push(new Vector2(r * 0.55, h - e * 0.12), new Vector2(0, h - e * 0.25));
  return new LatheGeometry(pts, 32);
}
/** Spiral line on an end face of a towel roll (the rolled layers). */
function spiralGeometry(r: number, y: number) {
  const pts: Vector3[] = [];
  const turns = 2.6;
  for (let i = 0; i <= 90; i++) {
    const u = i / 90;
    const a = u * turns * Math.PI * 2;
    const rr = r * (0.12 + 0.72 * u);
    pts.push(new Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr));
  }
  return new TubeGeometry(new CatmullRomCurve3(pts), 120, r * 0.035, 5, false);
}
/** Rounded box with a puffed (pillow-like) top and bottom; its top centre is at the origin. */
function pillowGeometry(sx: number, h: number, sz: number) {
  const g = new RoundedBoxGeometry(sx, h, sz, 5, Math.min(h * 0.45, sx / 4, sz / 4));
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = (2 * pos.getX(i)) / sx;
    const z = (2 * pos.getZ(i)) / sz;
    const puff = Math.max(0, 1 - x * x) * Math.max(0, 1 - z * z);
    pos.setY(i, pos.getY(i) * (1 + 0.35 * puff));
  }
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox!.max.y, 0);
  return g;
}
function axisVec(a: 'x' | 'y' | 'z' | Vec3 | undefined, fallback: Vec3): Vector3 {
  if (a === 'x') return new Vector3(1, 0, 0);
  if (a === 'y') return new Vector3(0, 1, 0);
  if (a === 'z') return new Vector3(0, 0, 1);
  return new Vector3(...(a ?? fallback)).normalize();
}

function isVec3(p: unknown): p is Vec3 {
  return Array.isArray(p) && p.length === 3 && p.every((x) => typeof x === 'number');
}

interface Dyn {
  update(state: RigState): void;
}

export class PropLayer {
  readonly group = new Group();
  private dyn: Dyn[] = [];
  private mats: Material[] = [];
  private geos: BufferGeometry[] = [];
  /** Points for camera framing (furniture only, world). */
  framing: Vector3[] = [];

  constructor(private pal: Palette) {}

  private mat(color: string, opts: Parameters<typeof solid>[1] = {}) {
    const m = solid(color, { roughness: 0.75, ...opts });
    this.mats.push(m);
    return m;
  }
  private geo<T extends BufferGeometry>(g: T): T {
    this.geos.push(g);
    return g;
  }

  private resolve(p: PropPoint, side: Side, mirror: boolean, ctx: string): Resolved | null {
    if (isVec3(p)) return { kind: 'world', p: new Vector3(mirror ? -p[0] : p[0], p[1], p[2]) };
    if (typeof p === 'object' && p && 'at' in p && 'off' in p) {
      const cp = tryCompile(p.at as AttachRef, side, ctx);
      if (!cp) return null;
      return { kind: 'body', cp, off: new Vector3(mirror ? -p.off[0] : p.off[0], p.off[1], p.off[2]) };
    }
    const cp = tryCompile(p as AttachRef, side, ctx);
    return cp ? { kind: 'body', cp, off: new Vector3() } : null;
  }
  private evalR(r: Resolved, state: RigState, out: Vector3): Vector3 {
    if (r.kind === 'world') return out.copy(r.p);
    return evalPoint(r.cp, state, out).add(r.off);
  }

  /** Build props. Furniture is placed from `refState` (clip t = 0, already grounded). */
  setProps(props: Prop[], side: Side, mirror: boolean, refState: RigState) {
    this.clear();
    const P = this.pal;
    const furniture = P.dark ? '#5d5650' : '#d6cdc2';
    for (const [i, prop] of props.entries()) {
      const ctx = `prop ${i} (${prop.kind})`;
      const place = (pp: PropPoint | undefined, fallback: Vector3) => {
        if (pp === undefined) return fallback.clone();
        const r = this.resolve(pp, side, mirror, ctx);
        return r ? this.evalR(r, refState, new Vector3()) : fallback.clone();
      };
      const pelvis = refState.pos[SEG_INDEX.pelvis];
      switch (prop.kind) {
        case 'band': {
          const a = this.resolve(prop.from, side, mirror, ctx);
          const b = this.resolve(prop.to, side, mirror, ctx);
          if (!a || !b) break;
          this.addBand(a, b, prop.width ?? 0.026, prop.color ?? (P.dark ? '#6dba86' : '#7cc394'), refState);
          break;
        }
        case 'step':
        case 'box': {
          const s = prop.size ?? (prop.kind === 'step' ? [0.7, 0.15, 0.32] : [0.45, 0.4, 0.45]);
          const top = place(prop.at, new Vector3(pelvis.x, s[1], pelvis.z));
          const m = new Mesh(this.geo(new RoundedBoxGeometry(s[0], s[1], s[2], 3, 0.012)), this.mat(prop.color ?? furniture));
          m.position.set(top.x, top.y - s[1] / 2, top.z);
          this.group.add(m);
          this.pushBox(m.position, s);
          break;
        }
        case 'wall': {
          const n = new Vector3(...(prop.normal ?? [0, 0, 1])).normalize();
          if (mirror) n.x = -n.x;
          const w = prop.width ?? 1.6;
          const h = prop.height ?? 2.0;
          const at = place(prop.at, new Vector3(0, 0, -0.6));
          const m = new Mesh(this.geo(new BoxGeometry(w, h, 0.05)), this.mat(furniture, { transparent: true, opacity: 0.55 }));
          m.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), n);
          m.position.copy(at).addScaledVector(n, -0.025);
          m.position.y = h / 2;
          m.renderOrder = 2;
          this.group.add(m);
          break;
        }
        case 'mat': {
          const s = prop.size ?? [1.85, 0.64];
          const at = place(prop.at, new Vector3(pelvis.x, 0, pelvis.z));
          const m = new Mesh(this.geo(new RoundedBoxGeometry(s[0], 0.008, s[1], 2, 0.003)), this.mat(prop.color ?? (P.dark ? '#3e4d58' : '#b3c6d2'), { roughness: 0.9 }));
          m.position.set(at.x, 0.004, at.z);
          m.rotation.y = (((prop.rotY ?? 0) * (mirror ? -1 : 1)) * Math.PI) / 180 + Math.PI / 2;
          this.group.add(m);
          break;
        }
        case 'roller': {
          const r = prop.radius ?? 0.075;
          const len = prop.length ?? 0.9;
          const at = place(prop.at, new Vector3(pelvis.x, r, pelvis.z));
          const m = new Mesh(this.geo(new CylinderGeometry(r, r, len, 28, 1)), this.mat(prop.color ?? (P.dark ? '#5b7487' : '#8aa5b8'), { roughness: 0.85 }));
          if ((prop.axis ?? 'x') === 'x') m.rotation.z = Math.PI / 2;
          else m.rotation.x = Math.PI / 2;
          m.position.copy(at);
          this.group.add(m);
          break;
        }
        case 'ball': {
          const r = this.resolve(prop.at, side, mirror, ctx);
          if (!r) break;
          const rad = prop.radius ?? 0.09;
          const m = new Mesh(this.geo(new SphereGeometry(rad, 24, 16)), this.mat(prop.color ?? (P.dark ? '#c9a04f' : '#e9be62'), { roughness: 0.55 }));
          this.group.add(m);
          this.dyn.push({ update: (st) => void this.evalR(r, st, m.position) });
          break;
        }
        case 'towel': {
          const r = this.resolve(prop.at, side, mirror, ctx);
          if (!r) break;
          const rad = prop.radius ?? 0.03;
          const len = prop.length ?? 0.2;
          const g = new Group();
          const cloth = this.mat(prop.color ?? (P.dark ? '#d3cab9' : '#f3ede2'), { roughness: 0.97 });
          const line = this.mat(P.dark ? '#9a907f' : '#cbbfa9', { roughness: 0.97 });
          const stripe = this.mat(P.dark ? '#a99a80' : '#ddcfb6', { roughness: 0.97 });
          g.add(new Mesh(this.geo(rollGeometry(rad, len)), cloth));
          for (const sgn of [-1, 1]) {
            g.add(new Mesh(this.geo(spiralGeometry(rad * 0.93, sgn * (len / 2 - rad * 0.08))), line));
            // woven border stripes near both ends
            const band = new Mesh(this.geo(new TorusGeometry(rad * 1.003, rad * 0.06, 6, 32)), stripe);
            band.rotation.x = Math.PI / 2;
            band.position.y = sgn * (len / 2 - Math.min(0.03, len * 0.15));
            g.add(band);
          }
          const ax = axisVec(prop.axis, [0, 0, 1]);
          if (mirror) ax.x = -ax.x;
          const qAxis = new Quaternion().setFromUnitVectors(UP, ax);
          this.group.add(g);
          if (r.kind === 'world') {
            g.position.copy(r.p);
            g.quaternion.copy(qAxis);
            this.framing.push(r.p.clone().addScaledVector(ax, len / 2), r.p.clone().addScaledVector(ax, -len / 2));
          } else {
            const seg = pointSeg(r.cp);
            this.dyn.push({
              update: (st) => {
                this.evalR(r, st, g.position);
                g.quaternion.copy(st.quat[seg]).multiply(qAxis);
              },
            });
          }
          break;
        }
        case 'pillow': {
          const s = prop.size ?? [0.45, 0.12, 0.3];
          const top = place(prop.at, new Vector3(pelvis.x, s[1], pelvis.z));
          const m = new Mesh(this.geo(pillowGeometry(s[0], s[1], s[2])), this.mat(prop.color ?? (P.dark ? '#8f969e' : '#eef0f3'), { roughness: 0.92 }));
          m.position.copy(top);
          m.rotation.y = (((prop.rotY ?? 0) * (mirror ? -1 : 1)) * Math.PI) / 180;
          this.group.add(m);
          this.pushBox(new Vector3(top.x, top.y - s[1] / 2, top.z), [Math.max(s[0], s[2]), s[1], Math.max(s[0], s[2])]);
          break;
        }
        case 'dumbbell': {
          const s = prop.hand === 'L' ? (mirror ? 'R' : 'L') : mirror ? 'L' : 'R';
          const cp = tryCompile(`hand_${s}:palm` as AttachRef, 'R', ctx);
          if (!cp) break;
          const g = new Group();
          const sz = prop.size ?? 1;
          const dark = this.mat(P.dark ? '#77726d' : '#5b5753', { roughness: 0.45 });
          const handle = new Mesh(this.geo(new CylinderGeometry(0.014, 0.014, 0.15, 12)), dark);
          handle.rotation.z = Math.PI / 2;
          g.add(handle);
          for (const x of [-0.085, 0.085]) {
            const w = new Mesh(this.geo(new CylinderGeometry(0.042 * sz, 0.042 * sz, 0.045, 6)), dark);
            w.rotation.z = Math.PI / 2;
            w.position.x = x;
            g.add(w);
          }
          this.group.add(g);
          const seg = pointSeg(cp);
          this.dyn.push({
            update: (st) => {
              evalPoint(cp, st, g.position);
              g.quaternion.copy(st.quat[seg]);
            },
          });
          break;
        }
        case 'slant': {
          const [len, w] = prop.size ?? [0.45, 0.42];
          const ang = ((prop.angle ?? 25) * Math.PI) / 180;
          const h = Math.tan(ang) * len;
          const shape = new Shape();
          shape.moveTo(-len / 2, 0);
          shape.lineTo(len / 2, 0);
          shape.lineTo(len / 2, h);
          shape.closePath();
          const g = this.geo(new ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }));
          g.translate(0, 0, -w / 2);
          g.rotateY(-Math.PI / 2); // rises toward +z
          const at = place(prop.at, new Vector3(pelvis.x, 0, pelvis.z));
          const m = new Mesh(g, this.mat(furniture));
          m.position.set(at.x, 0, at.z);
          m.rotation.y = (((prop.rotY ?? 0) * (mirror ? -1 : 1)) * Math.PI) / 180;
          this.group.add(m);
          break;
        }
        case 'chair':
        case 'bench': {
          const top = place(prop.at, new Vector3(pelvis.x, 0.45, pelvis.z));
          const g = new Group();
          const seatW = prop.kind === 'chair' ? 0.44 : 0.4;
          const seatD = prop.kind === 'chair' ? 0.42 : 1.2;
          const seat = new Mesh(this.geo(new RoundedBoxGeometry(seatW, 0.04, seatD, 2, 0.01)), this.mat(furniture));
          seat.position.y = -0.02;
          g.add(seat);
          const legH = Math.max(0.05, top.y - 0.04);
          const legMat = this.mat(P.dark ? '#7b746d' : '#a1968a');
          for (const sx of [-1, 1])
            for (const sz of [-1, 1]) {
              const leg = new Mesh(this.geo(new CylinderGeometry(0.012, 0.012, legH, 8)), legMat);
              leg.position.set((sx * seatW) / 2.4, -0.04 - legH / 2, (sz * seatD) / 2.4);
              g.add(leg);
            }
          if (prop.kind === 'chair') {
            const back = new Mesh(this.geo(new RoundedBoxGeometry(seatW, 0.42, 0.03, 2, 0.01)), this.mat(furniture));
            back.position.set(0, 0.2, -seatD / 2 + 0.015);
            g.add(back);
          }
          g.position.copy(top);
          g.rotation.y = (((prop.rotY ?? 0) * (mirror ? -1 : 1)) * Math.PI) / 180;
          this.group.add(g);
          break;
        }
        case 'doorframe': {
          const w = prop.width ?? 0.85;
          const h = prop.height ?? 2.05;
          const n = new Vector3(...(prop.normal ?? [0, 0, 1])).normalize();
          const at = place(prop.at, new Vector3(0, 0, 0.2));
          const perp = new Vector3().crossVectors(UP, n).normalize();
          const m = this.mat(furniture);
          for (const s of [-1, 1]) {
            const post = new Mesh(this.geo(new BoxGeometry(0.07, h, 0.12)), m);
            post.position.copy(at).addScaledVector(perp, (s * (w + 0.07)) / 2);
            post.position.y = h / 2;
            post.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), n);
            this.group.add(post);
          }
          const beam = new Mesh(this.geo(new BoxGeometry(w + 0.14, 0.07, 0.12)), m);
          beam.position.copy(at);
          beam.position.y = h + 0.035;
          beam.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), n);
          this.group.add(beam);
          break;
        }
        case 'bike':
          this.addBike(side, refState);
          break;
      }
    }
  }

  private pushBox(c: Vector3, s: Vec3) {
    this.framing.push(new Vector3(c.x - s[0] / 2, c.y - s[1] / 2, c.z - s[2] / 2), new Vector3(c.x + s[0] / 2, c.y + s[1] / 2, c.z + s[2] / 2));
  }

  private addBand(a: Resolved, b: Resolved, width: number, color: string, ref: RigState) {
    const n = 14;
    const writer = new TubeWriter(n, 8);
    const pts = Array.from({ length: n }, () => new Vector3());
    const radii = new Float32Array(n);
    const g = this.geo(writer.toGeometry());
    const m = this.mat(color, { roughness: 0.6 }) as MeshStandardMaterial;
    const mesh = new Mesh(g, m);
    mesh.frustumCulled = false;
    this.group.add(mesh);
    const pa = new Vector3();
    const pb = new Vector3();
    this.evalR(a, ref, pa);
    this.evalR(b, ref, pb);
    const rest = Math.max(0.05, pa.distanceTo(pb)) * 0.85;
    const base = new Color(color);
    const deep = new Color(color).multiplyScalar(0.72);
    const flatN = new Vector3();
    const thick = 0.0022;
    this.dyn.push({
      update: (st) => {
        this.evalR(a, st, pa);
        this.evalR(b, st, pb);
        const len = pa.distanceTo(pb);
        const ratio = len / rest;
        _t.subVectors(pb, pa).normalize();
        // slight sag in the middle when slack
        const sag = Math.max(0, 1.05 - ratio) * 0.06;
        for (let k = 0; k < n; k++) {
          const u = k / (n - 1);
          pts[k].lerpVectors(pa, pb, u);
          pts[k].y -= Math.sin(Math.PI * u) * sag;
          radii[k] = thick;
        }
        flatN.crossVectors(_t, UP);
        if (flatN.lengthSq() < 1e-6) flatN.set(1, 0, 0);
        flatN.normalize();
        const w = (width / Math.sqrt(Math.max(0.6, ratio))) / 2;
        writer.write(pts, radii, flatN, w / thick);
        g.attributes.position.needsUpdate = true;
        g.attributes.normal.needsUpdate = true;
        m.color.copy(base).lerp(deep, Math.min(1, Math.max(0, (ratio - 1) / 0.8)));
      },
    });
  }

  private addBike(side: Side, ref: RigState) {
    const P = this.pal;
    const frameMat = this.mat(P.dark ? '#7f8c99' : '#7d8a97', { roughness: 0.4 });
    const darkMat = this.mat(P.dark ? '#2f2d2b' : '#3b3937', { roughness: 0.7 });
    const get = (r: string) => {
      const cp = tryCompile(r as AttachRef, side, 'bike');
      return cp ? evalPoint(cp, ref, new Vector3()) : new Vector3();
    };
    const seat = get('pelvis:ischial_tuberosity').add(get('pelvis:ischial_tuberosity_L')).multiplyScalar(0.5);
    seat.y -= 0.03;
    seat.x = 0;
    const hoodR = get('hand_R:palm');
    const hoodL = get('hand_L:palm');
    const pedR = get('foot_R:met_head_1').add(get('foot_R:met_head_5')).multiplyScalar(0.5);
    const pedL = get('foot_L:met_head_1').add(get('foot_L:met_head_5')).multiplyScalar(0.5);
    pedR.y -= 0.018;
    pedL.y -= 0.018;
    const bb = new Vector3().addVectors(pedR, pedL).multiplyScalar(0.5);
    bb.x = 0;
    const wheelR = 0.335;
    const rear = new Vector3(0, wheelR, bb.z - 0.405);
    const front = new Vector3(0, wheelR, bb.z + 0.585);
    const hoods = new Vector3().addVectors(hoodR, hoodL).multiplyScalar(0.5);
    const headTop = new Vector3(0, hoods.y - 0.09, hoods.z - 0.09);
    const headBot = new Vector3(0, headTop.y - 0.14, headTop.z + 0.04);
    const seatCluster = new Vector3().lerpVectors(bb, seat, 0.78);
    const cyl = (a: Vector3, b: Vector3, r: number, m: Material) => {
      const len = a.distanceTo(b);
      const mesh = new Mesh(this.geo(new CylinderGeometry(r, r, len, 10)), m);
      mesh.position.addVectors(a, b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(UP, _v.subVectors(b, a).normalize());
      this.group.add(mesh);
    };
    cyl(bb, seatCluster, 0.016, frameMat);
    cyl(seatCluster, seat.clone().setY(seat.y - 0.02), 0.012, darkMat);
    cyl(seatCluster, headTop, 0.015, frameMat);
    cyl(bb, headBot, 0.019, frameMat);
    cyl(headBot, headTop, 0.018, frameMat);
    cyl(headBot, front, 0.011, frameMat);
    cyl(bb, rear, 0.011, frameMat);
    cyl(seatCluster, rear, 0.009, frameMat);
    // stem + bar + hoods
    const barC = new Vector3(0, hoods.y + 0.01, hoods.z - 0.02);
    cyl(headTop, barC, 0.012, darkMat);
    const barHalf = Math.max(0.19, Math.abs(hoodR.x - hoodL.x) / 2);
    cyl(new Vector3(-barHalf, barC.y, barC.z), new Vector3(barHalf, barC.y, barC.z), 0.011, darkMat);
    for (const s of [-1, 1]) {
      const h = new Vector3(s * barHalf, barC.y, barC.z);
      cyl(h, new Vector3(s * barHalf, barC.y - 0.1, barC.z + 0.06), 0.011, darkMat);
      cyl(new Vector3(s * barHalf, barC.y - 0.1, barC.z + 0.06), new Vector3(s * barHalf, barC.y - 0.12, barC.z - 0.03), 0.011, darkMat);
    }
    // saddle
    const saddle = new Mesh(this.geo(new SphereGeometry(1, 16, 8)), darkMat);
    saddle.scale.set(0.07, 0.018, 0.13);
    saddle.position.set(0, seat.y - 0.002, seat.z + 0.03);
    this.group.add(saddle);
    // wheels
    for (const c of [rear, front]) {
      const tyre = new Mesh(this.geo(new TorusGeometry(wheelR - 0.012, 0.012, 10, 64)), darkMat);
      tyre.rotation.y = Math.PI / 2;
      tyre.position.copy(c);
      this.group.add(tyre);
      const rim = new Mesh(this.geo(new TorusGeometry(wheelR - 0.035, 0.006, 6, 48)), frameMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.copy(c);
      this.group.add(rim);
      const hub = new Mesh(this.geo(new CylinderGeometry(0.018, 0.018, 0.1, 12)), frameMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(c);
      this.group.add(hub);
    }
    // cranks & chainring
    const ring = new Mesh(this.geo(new TorusGeometry(0.095, 0.006, 6, 40)), darkMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.copy(bb).setX(-0.045);
    this.group.add(ring);
    for (const p of [pedR, pedL]) {
      const crankStart = bb.clone().setX(p.x < 0 ? -0.07 : 0.07);
      const crankEnd = new Vector3(crankStart.x, p.y, p.z);
      cyl(crankStart, crankEnd, 0.009, frameMat);
      const pedal = new Mesh(this.geo(new BoxGeometry(0.08, 0.012, 0.06)), darkMat);
      pedal.position.set(p.x, p.y - 0.004, p.z);
      this.group.add(pedal);
    }
    this.framing.push(rear.clone().setY(0), front.clone().setY(0), headTop.clone(), new Vector3(0, wheelR * 2, rear.z));
  }

  update(state: RigState) {
    for (const d of this.dyn) d.update(state);
  }

  clear() {
    this.group.clear();
    this.dyn = [];
    this.framing = [];
    for (const m of this.mats) m.dispose();
    for (const g of this.geos) g.dispose();
    this.mats = [];
    this.geos = [];
  }

  dispose() {
    this.clear();
  }
}

