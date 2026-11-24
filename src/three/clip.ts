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
  mirror: boolean;
  camera?: CameraSpec;
  focus?: RegionId;
  frame: CompiledPoint[];
  /** true when the clip has movement (more than one distinct key) */
  animated: boolean;
}

const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));

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
    const tEnd = Math.min(t + (k.hold ?? 0) / dur, next - 0.002);
    return { t, tEnd: Math.max(t, tEnd), vec };
  });
  const labels = srcKeys.filter((k) => k.label).map((k) => ({ t: k.t, label: k.label! }));
  let groundY: number | null;
  const g = clip.ground ?? (baseDef.ground === false ? false : (baseDef.ground ?? 0));
  if (g === false) groundY = null;
  else if (g === true) groundY = 0;
  else groundY = g;
  const anchorDef = clip.anchor === null ? null : (clip.anchor ?? baseDef.anchor ?? null);
  const anchorCp = anchorDef ? tryCompile(anchorDef.point, side, `clip ${clip.id} anchor`) : null;
  const animated = keys.length > 1 && keys.some((k) => k.vec.some((v, i) => Math.abs(v - keys[0].vec[i]) > 1e-4));
  const sides: Side[] = clip.sides === 'both' ? ['R', 'L'] : [clip.sides === 'L' ? (mirror ? 'R' : 'L') : side];
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
      lerpVec(k.vec, nxt.vec, ease((tt - k.tEnd) / Math.max(1e-6, nxt.t - k.tEnd)), out);
      return out;
    }
  }
  if (tt > last.tEnd) {
    if (cc.loop === 'loop') {
      const end = 1 + K[0].t;
      lerpVec(last.vec, K[0].vec, ease((tt - last.tEnd) / Math.max(1e-6, end - last.tEnd)), out);
    } else out.set(last.vec);
    return out;
  }
  out.set(K[0].vec);
  return out;
}

function lerpVec(a: PoseVec, b: PoseVec, u: number, out: PoseVec) {
  for (let i = 0; i < POSE_SIZE; i++) out[i] = a[i] + (b[i] - a[i]) * u;
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
      { t: 0, label: DEMO_LABEL_ACTION },
      { t: 0.17, pose: rig.actionPose, hold: 0.9 },
      { t: 0.44 },
      { t: 0.5, label: DEMO_LABEL_STRETCH },
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
