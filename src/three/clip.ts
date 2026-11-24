// Clip compilation & evaluation: keyframes → pose vectors, easing, holds, phase labels,
// ground / anchor placement, and the auto-built muscle demo clip.
import { Vector3 } from 'three';
import type { RegionId } from '../data/registry';
import type { CameraSpec, Clip, Prop } from './clips/types';
import { type CompiledPoint, evalPoint, tryCompile } from './landmarks';
import {
  type Anchor,
  applyPose,
  BASE_POSES,
  type BasePoseName,
  groundState,
  mirrorPose,
  newPoseVec,
  type PoseVec,
  POSE_SIZE,
  RigState,
  type Side,
  solveFK,
  lowestSkinY,
} from './rig';
import type { MuscleRig } from './rig-data/types';

export interface CompiledKey {
  t: number;
  tEnd: number;
  vec: PoseVec;
  /** pass-through key (ClipKey.pass): the motion does not stop here */
  pass: boolean;
  /** per-slot velocity (value per unit of normalised time) at a pass key; null = velocity stop */
  m: PoseVec | null;
}

export interface CompiledClip {
  src: Clip;
  duration: number;
  loop: 'loop' | 'pingpong';
  keys: CompiledKey[];
  labels: { t: number; label: string }[];
  groundY: number | null;
  anchor: { cp: CompiledPoint; axes: Anchor['axes'] } | null;
  anchorTarget: Vector3;
  props: Prop[];
  side: Side;
  sides: Side[];
  /** per-part highlight sides overriding `sides` (Clip.partSides, mirror applied) */
  partSides: Partial<Record<string, Side[]>>;
  mirror: boolean;
  camera?: CameraSpec;
  focus?: RegionId;
  frame: CompiledPoint[];
  /** true when the clip has movement (more than one distinct key) */
  animated: boolean;
}

const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));

const clipWarned = new Set<string>();
function clipWarn(msg: string) {
  if (clipWarned.has(msg)) return;
  clipWarned.add(msg);
  console.warn('[tribody] ' + msg);
}

export function compileClip(clip: Clip): CompiledClip {
  const mirror = !!clip.mirror;
  const side: Side = mirror ? 'L' : 'R';
  const baseDef = BASE_POSES[clip.base] ?? BASE_POSES.STAND;
  const mp = (p: Parameters<typeof mirrorPose>[0]) => (mirror ? mirrorPose(p) : p);
  const baseVec = newPoseVec();
  applyPose(baseVec, mp(baseDef.pose));
  applyPose(baseVec, mp(clip.pose));
  const dur = Math.max(0.2, clip.duration || 4);
  const srcKeys = clip.keys?.length ? [...clip.keys].sort((a, b) => a.t - b.t) : [{ t: 0 }];
  const keys: CompiledKey[] = srcKeys.map((k, i) => {
    const vec = new Float32Array(baseVec) as PoseVec;
    applyPose(vec, mp(k.pose));
    const next = srcKeys[i + 1]?.t ?? (clip.loop === 'loop' ? 1 + srcKeys[0].t : 1);
    const t = Math.min(1, Math.max(0, k.t));
    let hold = k.hold ?? 0;
    if (k.pass && hold > 0) {
      clipWarn(`clip ${clip.id} key ${i} (t ${k.t}): hold is ignored on a pass key`);
      hold = 0;
    }
    const tEnd = Math.min(t + hold / dur, next - 0.002);
    return { t, tEnd: Math.max(t, tEnd), vec, pass: !!k.pass, m: null };
  });
  passTangents(keys, clip.loop === 'pingpong' ? 'pingpong' : 'loop', String(clip.id));
  const labels = srcKeys.filter((k) => k.label).map((k) => ({ t: k.t, label: k.label! }));
  let groundY: number | null;
  const g = clip.ground ?? (baseDef.ground === false ? false : (baseDef.ground ?? 0));
  if (g === false) groundY = null;
  else if (g === true) groundY = 0;
  else groundY = g;
  const anchorDef = clip.anchor === null ? null : (clip.anchor ?? baseDef.anchor ?? null);
  const anchorCp = anchorDef ? tryCompile(anchorDef.point, side, `clip ${clip.id} anchor`) : null;
  const animated = keys.length > 1 && keys.some((k) => k.vec.some((v, i) => Math.abs(v - keys[0].vec[i]) > 1e-4));
  const sideOf = (s: 'R' | 'L' | 'both' | undefined): Side[] => (s === 'both' ? ['R', 'L'] : [s === 'L' ? (mirror ? 'R' : 'L') : side]);
  const sides: Side[] = sideOf(clip.sides);
  const partSides: Partial<Record<string, Side[]>> = {};
  for (const [id, s] of Object.entries(clip.partSides ?? {})) if (s) partSides[id] = sideOf(s);
  const props = [...(baseDef.props ?? []), ...(clip.props ?? [])];
  const cc: CompiledClip = {
    src: clip,
    duration: dur,
    loop: clip.loop === 'pingpong' ? 'pingpong' : 'loop',
    keys,
    labels,
    groundY,
    anchor: anchorCp && anchorDef ? { cp: anchorCp, axes: anchorDef.axes } : null,
    anchorTarget: new Vector3(),
    props,
    side,
    sides,
    partSides,
    mirror,
    camera: clip.camera ?? baseDef.camera,
    focus: clip.focus,
    frame: (clip.frame ?? []).map((r, i) => tryCompile(r, side, `clip ${clip.id} frame ${i}`)).filter((x): x is CompiledPoint => !!x),
    animated,
  };
  // reference placement at t = 0
  const st = new RigState();
  solveFK(evalClip(cc, 0, newPoseVec()), st);
  if (cc.groundY !== null) groundState(st, cc.groundY);
  if (cc.anchor) evalPoint(cc.anchor.cp, st, cc.anchorTarget);
  return cc;
}

/** Normalised clip time for a playback time in seconds. */
export function clipPhase(cc: CompiledClip, seconds: number): number {
  const u = seconds / cc.duration;
  if (cc.loop === 'pingpong') {
    const m = u % 2;
    return m < 1 ? m : 2 - m;
  }
  return u - Math.floor(u);
}

/** Pose vector at normalised time t (0..1). */
export function evalClip(cc: CompiledClip, t: number, out: PoseVec): PoseVec {
  const K = cc.keys;
  if (K.length === 1) {
    out.set(K[0].vec);
    return out;
  }
  const last = K[K.length - 1];
  let tt = t;
  if (cc.loop === 'loop' && tt < K[0].t) tt += 1;
  for (let i = 0; i < K.length; i++) {
    const k = K[i];
    const nxt = K[i + 1];
    if (tt <= k.tEnd && tt >= k.t) {
      out.set(k.vec);
      return out;
    }
    if (nxt && tt > k.tEnd && tt < nxt.t) {
      const h = Math.max(1e-6, nxt.t - k.tEnd);
      segment(k, nxt, (tt - k.tEnd) / h, h, out);
      return out;
    }
  }
  if (tt > last.tEnd) {
    if (cc.loop === 'loop') {
      const h = Math.max(1e-6, 1 + K[0].t - last.tEnd);
      segment(last, K[0], (tt - last.tEnd) / h, h, out);
    } else out.set(last.vec);
    return out;
  }
  out.set(K[0].vec);
  return out;
}

function lerpVec(a: PoseVec, b: PoseVec, u: number, out: PoseVec) {
  for (let i = 0; i < POSE_SIZE; i++) out[i] = a[i] + (b[i] - a[i]) * u;
}

/**
 * One segment a → b at local u (0..1) lasting h (normalised time). Two velocity stops: the classic sine ease
 * (bit-identical to clips without pass keys). Otherwise a cubic Hermite per slot with the pass keys' tangents
 * (zero at a stop), i.e. C1 through the run of pass keys and eased only at the run's ends.
 */
function segment(a: CompiledKey, b: CompiledKey, u: number, h: number, out: PoseVec) {
  if (!a.m && !b.m) {
    lerpVec(a.vec, b.vec, ease(u), out);
    return;
  }
  const s = Math.min(1, Math.max(0, u));
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h01 = 1 - h00;
  const h10 = (s3 - 2 * s2 + s) * h;
  const h11 = (s3 - s2) * h;
  const ma = a.m;
  const mb = b.m;
  for (let i = 0; i < POSE_SIZE; i++) {
    out[i] = h00 * a.vec[i] + h01 * b.vec[i] + (ma ? h10 * ma[i] : 0) + (mb ? h11 * mb[i] : 0);
  }
}

/**
 * Tangents of pass keys: the 3-point (non-uniform Catmull–Rom) slope through the neighbouring keys, limited per
 * slot like a monotone (Fritsch–Carlson) spline: 0 where the slot turns (local extremum, so it never overshoots a
 * key value) and at most 3× the smaller neighbouring secant (each segment stays monotone between its keys, so
 * joint limits and contacts are never crossed by more than the keys themselves).
 */
function passTangents(keys: CompiledKey[], loop: 'loop' | 'pingpong', id: string) {
  const n = keys.length;
  if (n < 2) {
    for (const k of keys) k.pass = false;
    return;
  }
  for (let i = 0; i < n; i++) {
    const k = keys[i];
    if (!k.pass) continue;
    let p: CompiledKey;
    let q: CompiledKey;
    let tp: number;
    let tq: number;
    if (i > 0) {
      p = keys[i - 1];
      tp = p.tEnd;
    } else if (loop === 'loop') {
      p = keys[n - 1];
      tp = p.tEnd - 1;
    } else {
      clipWarn(`clip ${id}: the first key of a pingpong clip cannot be a pass key`);
      k.pass = false;
      continue;
    }
    if (i < n - 1) {
      q = keys[i + 1];
      tq = q.t;
    } else if (loop === 'loop') {
      q = keys[0];
      tq = q.t + 1;
    } else {
      clipWarn(`clip ${id}: the last key of a pingpong clip cannot be a pass key`);
      k.pass = false;
      continue;
    }
    const h0 = k.t - tp;
    const h1 = tq - k.t;
    const m = newPoseVec();
    // angular speed through the key vs the straight p → q speed (degrees; root position left out)
    let mag = 0;
    let sec = 0;
    if (h0 > 1e-6 && h1 > 1e-6) {
      for (let j = 0; j < POSE_SIZE; j++) {
        const d0 = (k.vec[j] - p.vec[j]) / h0;
        const d1 = (q.vec[j] - k.vec[j]) / h1;
        if (j >= 3) sec += ((q.vec[j] - p.vec[j]) / (h0 + h1)) ** 2;
        if (d0 * d1 <= 0) continue; // turning point (or flat on one side): this slot stops here
        const cr = (h1 * d0 + h0 * d1) / (h0 + h1);
        const lim = 3 * Math.min(Math.abs(d0), Math.abs(d1));
        m[j] = Math.sign(cr) * Math.min(Math.abs(cr), lim);
        if (j >= 3) mag += m[j] * m[j];
      }
    }
    // a pass key whose DOFs nearly all turn (or stay flat on one side) there is still a velocity stop
    if (Math.sqrt(mag) < 0.2 * Math.sqrt(sec) || mag < 1e-12)
      clipWarn(`clip ${id} key ${i} (t ${k.t}): pass key is (almost) a stop — most DOFs turn or are flat here; give it a pose between its neighbours`);
    k.m = m;
  }
}

export function phaseLabel(cc: CompiledClip, t: number): string | null {
  if (!cc.labels.length) return null;
  let cur: string | null = cc.loop === 'loop' ? cc.labels[cc.labels.length - 1].label : cc.labels[0].label;
  for (const l of cc.labels) if (l.t <= t + 1e-6) cur = l.label;
  return cur;
}

const _a = new Vector3();
/** Apply anchor / ground to a solved state (translation only). */
export function placeState(cc: CompiledClip, state: RigState) {
  if (cc.anchor) {
    evalPoint(cc.anchor.cp, state, _a);
    const dx = cc.anchorTarget.x - _a.x;
    const dz = cc.anchorTarget.z - _a.z;
    const dy = cc.anchor.axes === 'xyz' ? cc.anchorTarget.y - _a.y : 0;
    state.translate(dx, dy, dz);
    if (cc.anchor.axes === 'xz' && cc.groundY !== null) {
      const low = lowestSkinY(state);
      state.translate(0, cc.groundY - low, 0);
    }
  } else if (cc.groundY !== null) {
    groundState(state, cc.groundY);
  }
}

export const DEMO_LABEL_ACTION = '収縮：筋が短くなる';
export const DEMO_LABEL_STRETCH = 'ストレッチ：筋が伸びる';

/** Muscle page demo: rest → action (収縮) → rest → stretch (伸張) → rest. */
export function muscleDemoClip(rig: MuscleRig): Clip {
  return {
    id: `demo:${rig.id}`,
    duration: 7,
    base: rig.base ?? 'STAND',
    pose: rig.restPose,
    keys: [
      { t: 0, label: rig.actionLabel ?? DEMO_LABEL_ACTION },
      { t: 0.17, pose: rig.actionPose, hold: 0.9 },
      { t: 0.44 },
      { t: 0.5, label: rig.stretchLabel ?? DEMO_LABEL_STRETCH },
      { t: 0.67, pose: rig.stretchPose, hold: 0.9 },
      { t: 0.94 },
    ],
    loop: 'loop',
    camera: rig.camera,
    focus: rig.focus,
    anchor: rig.anchor,
    ground: rig.ground,
    props: rig.props,
    sides: 'R',
  };
}

/** Times (normalised) of the action / stretch peaks in the demo clip (for verification). */
export const DEMO_T_ACTION = 0.2;
export const DEMO_T_STRETCH = 0.7;

/** Static clip of a base pose. */
export function staticClip(base: BasePoseName, id = 'static'): Clip {
  return { id, duration: 4, base, keys: [{ t: 0 }], loop: 'loop' };
}
