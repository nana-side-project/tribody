// TriBody 3D rig — pure kinematics (no rendering).
//
// Coordinate system: metres, Y up, the figure faces +Z, the figure's LEFT is +X
// (so the figure's RIGHT side is −X). Floor is y = 0. ~1.75 m adult.
//
// Every segment frame is axis-aligned with the world when the rig is in the reference pose
// (all DOFs = 0 = anatomical position: standing, arms at the sides, palms forward).
// Rest coordinates in this file are written "lateral-positive": [lat, y, z] where lat is the
// distance from the midline (positive = away from midline). The right side uses x = −lat,
// the left side x = +lat. Joint DOFs have the same anatomical meaning on both sides; the
// rig mirrors them internally. See docs/ENGINE.md for the full manual.
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { Prop } from './clips/types';

export type Vec3 = [number, number, number];
export type Side = 'R' | 'L';
export const SIDES: readonly Side[] = ['R', 'L'];

// ───────────────────────────────────────────── joints & DOFs

export const AXIAL_JOINTS = ['lumbar', 'thorax', 'neck', 'head'] as const;
export const LIMB_JOINTS = [
  'scapula',
  'shoulder',
  'elbow',
  'forearm',
  'wrist',
  'hip',
  'knee',
  'ankle',
  'toes',
] as const;
export type AxialJoint = (typeof AXIAL_JOINTS)[number];
export type LimbJoint = (typeof LIMB_JOINTS)[number];
export type JointName = AxialJoint | LimbJoint;

export const JOINT_DOFS = {
  lumbar: ['flex', 'lat', 'rot'],
  thorax: ['flex', 'lat', 'rot'],
  neck: ['flex', 'lat', 'rot'],
  head: ['flex', 'lat', 'rot'],
  scapula: ['elev', 'protr', 'upRot'],
  shoulder: ['flex', 'abd', 'rot'],
  elbow: ['flex'],
  forearm: ['sup'],
  wrist: ['flex'],
  hip: ['flex', 'abd', 'rot'],
  knee: ['flex'],
  ankle: ['dorsi', 'inv'],
  toes: ['ext'],
} as const satisfies Record<JointName, readonly string[]>;

export type DofOf<J extends JointName> = (typeof JOINT_DOFS)[J][number];
/** `hip` = both sides, `hip_R` / `hip_L` = one side. Axial joints have no side. */
export type JointKey = AxialJoint | LimbJoint | `${LimbJoint}_${Side}`;
type BaseJoint<K extends string> = K extends `${infer B}_${Side}` ? B : K;
export type JointAngles = {
  [K in JointKey]?: Partial<Record<DofOf<BaseJoint<K> & JointName>, number>>;
};

/** Root = the pelvis frame. pos in metres (pelvis origin = midpoint between the hip joint centres),
 *  rot in degrees, applied as R = Ry(rot[1]) · Rx(rot[0]) · Rz(rot[2])  (three.js Euler order 'YXZ'). */
export interface RootTransform {
  pos?: Vec3;
  rot?: Vec3;
}
export interface Pose {
  root?: RootTransform;
  joints?: JointAngles;
}

/** Sanity limits (degrees). Values outside are clamped (and reported once in dev). */
export const DOF_LIMITS: { [J in JointName]: Record<DofOf<J>, [number, number]> } = {
  lumbar: { flex: [-35, 60], lat: [-35, 35], rot: [-15, 15] },
  thorax: { flex: [-30, 45], lat: [-30, 30], rot: [-45, 45] },
  neck: { flex: [-60, 50], lat: [-40, 40], rot: [-75, 75] },
  head: { flex: [-30, 30], lat: [-20, 20], rot: [-20, 20] },
  scapula: { elev: [-15, 45], protr: [-30, 35], upRot: [-20, 60] },
  shoulder: { flex: [-65, 185], abd: [-60, 185], rot: [-95, 105] },
  elbow: { flex: [-5, 150] },
  forearm: { sup: [-175, 10] },
  wrist: { flex: [-85, 85] },
  hip: { flex: [-35, 135], abd: [-35, 55], rot: [-50, 65] },
  knee: { flex: [-5, 155] },
  ankle: { dorsi: [-60, 35], inv: [-30, 35] },
  toes: { ext: [-40, 95] },
};

export interface DofSlot {
  joint: JointName;
  dof: string;
  side: Side | null;
  index: number;
  min: number;
  max: number;
  /** e.g. 'hip_R.flex' */
  key: string;
}

/** Pose vector layout: [root.pos x,y,z, root.rot x,y,z, ...DOF_SLOTS]. */
export const ROOT_SIZE = 6;
export const DOF_SLOTS: DofSlot[] = [];
const SLOT_INDEX = new Map<string, number>();
(() => {
  let i = ROOT_SIZE;
  const add = (joint: JointName, side: Side | null) => {
    for (const dof of JOINT_DOFS[joint] as readonly string[]) {
      const key = `${joint}${side ? '_' + side : ''}.${dof}`;
      const [min, max] = (DOF_LIMITS[joint] as Record<string, [number, number]>)[dof];
      DOF_SLOTS.push({ joint, dof, side, index: i, min, max, key });
      SLOT_INDEX.set(key, i++);
    }
  };
  for (const j of AXIAL_JOINTS) add(j, null);
  for (const s of SIDES) for (const j of LIMB_JOINTS) add(j, s);
})();
export const POSE_SIZE = ROOT_SIZE + DOF_SLOTS.length;
export type PoseVec = Float32Array;

export function slotIndex(joint: JointName, dof: string, side: Side | null): number {
  const i = SLOT_INDEX.get(`${joint}${side ? '_' + side : ''}.${dof}`);
  if (i === undefined) throw new Error(`unknown DOF ${joint}.${dof}`);
  return i;
}

const warned = new Set<string>();
function warnOnce(msg: string) {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn('[tribody rig] ' + msg);
}

function parseJointKey(key: string): { joint: JointName; sides: (Side | null)[] } | null {
  const m = /^([a-z]+)(?:_(R|L))?$/i.exec(key);
  if (!m) return null;
  const joint = m[1] as JointName;
  if (!(joint in JOINT_DOFS)) return null;
  const isAxial = (AXIAL_JOINTS as readonly string[]).includes(joint);
  if (isAxial) return m[2] ? null : { joint, sides: [null] };
  return { joint, sides: m[2] ? [m[2] as Side] : ['R', 'L'] };
}

export function newPoseVec(): PoseVec {
  return new Float32Array(POSE_SIZE);
}

/** Writes `pose` onto `vec` (only the values the pose specifies). */
export function applyPose(vec: PoseVec, pose: Pose | undefined): PoseVec {
  if (!pose) return vec;
  if (pose.root?.pos) {
    vec[0] = pose.root.pos[0];
    vec[1] = pose.root.pos[1];
    vec[2] = pose.root.pos[2];
  }
  if (pose.root?.rot) {
    vec[3] = pose.root.rot[0];
    vec[4] = pose.root.rot[1];
    vec[5] = pose.root.rot[2];
  }
  const joints = pose.joints as Record<string, Record<string, number> | undefined> | undefined;
  if (joints) {
    for (const k of Object.keys(joints)) {
      const spec = joints[k];
      if (!spec) continue;
      const pk = parseJointKey(k);
      if (!pk) {
        warnOnce(`unknown joint key "${k}"`);
        continue;
      }
      for (const dof of Object.keys(spec)) {
        const v = spec[dof];
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        for (const side of pk.sides) {
          const idx = SLOT_INDEX.get(`${pk.joint}${side ? '_' + side : ''}.${dof}`);
          if (idx === undefined) {
            warnOnce(`unknown DOF "${dof}" on joint "${k}"`);
            continue;
          }
          vec[idx] = v;
        }
      }
    }
  }
  return vec;
}

/** Clamp every DOF to DOF_LIMITS (returns the vector). */
export function clampPose(vec: PoseVec): PoseVec {
  for (const s of DOF_SLOTS) {
    const v = vec[s.index];
    if (v < s.min - 0.01 || v > s.max + 0.01) {
      warnOnce(`${s.key} = ${v.toFixed(1)} outside [${s.min}, ${s.max}] — clamped`);
      vec[s.index] = v < s.min ? s.min : s.max;
    }
  }
  return vec;
}

/** Mirror a pose spec left↔right (swaps _R/_L, negates axial lat/rot, mirrors the root). */
export function mirrorPose(p: Pose | undefined): Pose | undefined {
  if (!p) return p;
  const out: Pose = {};
  if (p.root) {
    out.root = {};
    if (p.root.pos) out.root.pos = [-p.root.pos[0], p.root.pos[1], p.root.pos[2]];
    if (p.root.rot) out.root.rot = [p.root.rot[0], -p.root.rot[1], -p.root.rot[2]];
  }
  if (p.joints) {
    const j: Record<string, Record<string, number>> = {};
    for (const [k, spec] of Object.entries(p.joints as Record<string, Record<string, number>>)) {
      if (!spec) continue;
      let nk = k;
      if (k.endsWith('_R')) nk = k.slice(0, -2) + '_L';
      else if (k.endsWith('_L')) nk = k.slice(0, -2) + '_R';
      const ns: Record<string, number> = { ...spec };
      if ((AXIAL_JOINTS as readonly string[]).includes(k)) {
        if (ns.lat !== undefined) ns.lat = -ns.lat;
        if (ns.rot !== undefined) ns.rot = -ns.rot;
      }
      j[nk] = ns;
    }
    out.joints = j as JointAngles;
  }
  return out;
}

// ───────────────────────────────────────────── segments

export const AXIAL_SEGS = ['pelvis', 'lumbar', 'thorax', 'neck', 'head'] as const;
/** `clavicle` is an internal sub-frame of the shoulder girdle (public bone name: `scapula`). */
export const LIMB_SEGS = [
  'clavicle',
  'scapula',
  'humerus',
  'forearm',
  'hand',
  'femur',
  'patella',
  'tibia',
  'foot',
  'toes',
] as const;
export type AxialSeg = (typeof AXIAL_SEGS)[number];
export type LimbSeg = (typeof LIMB_SEGS)[number];
export type BaseSeg = AxialSeg | LimbSeg;
export type SegName = AxialSeg | `${LimbSeg}_${Side}`;

export const SEGMENTS: SegName[] = [
  ...AXIAL_SEGS,
  ...SIDES.flatMap((s) => LIMB_SEGS.map((l) => `${l}_${s}` as SegName)),
];
export const SEG_INDEX: Record<SegName, number> = Object.fromEntries(
  SEGMENTS.map((s, i) => [s, i]),
) as Record<SegName, number>;
export const isAxialSeg = (b: string): b is AxialSeg => (AXIAL_SEGS as readonly string[]).includes(b);

export function segName(base: BaseSeg, side: Side | null): SegName {
  return (isAxialSeg(base) ? base : `${base}_${side ?? 'R'}`) as SegName;
}
export function segBase(seg: SegName): BaseSeg {
  return seg.replace(/_(R|L)$/, '') as BaseSeg;
}
export function segSide(seg: SegName): Side | null {
  const m = /_(R|L)$/.exec(seg);
  return m ? (m[1] as Side) : null;
}

/** Segment frame origins in the reference pose, lateral-positive [lat, y, z]. */
export const REST_ORIGIN: Record<BaseSeg, Vec3> = {
  pelvis: [0, 0.92, 0], // midpoint of the hip joint centres
  lumbar: [0, 1.012, -0.04], // L5/S1
  thorax: [0, 1.158, -0.047], // T12/L1
  neck: [0, 1.453, -0.028], // C7/T1
  head: [0, 1.585, -0.005], // atlanto-occipital joint
  clavicle: [0.022, 1.43, 0.062], // sternoclavicular joint
  scapula: [0.175, 1.448, -0.012], // acromioclavicular joint (upward-rotation pivot)
  humerus: [0.175, 1.405, -0.008], // glenohumeral centre (humeral head centre)
  forearm: [0.195, 1.085, -0.015], // elbow centre
  hand: [0.24, 0.835, 0.0], // wrist centre
  femur: [0.085, 0.92, 0.0], // hip joint centre (femoral head centre)
  patella: [0.09, 0.528, 0.048], // patella centre (knee extended)
  tibia: [0.088, 0.49, 0.0], // knee centre
  foot: [0.09, 0.08, -0.005], // ankle (talocrural) centre
  toes: [0.09, 0.016, 0.13], // MTP line
};

/** Distal ends used for long-axis rotations (shoulder rot, forearm sup, hip rot). */
const AXIS_END: Partial<Record<BaseSeg, Vec3>> = {
  humerus: REST_ORIGIN.forearm,
  forearm: REST_ORIGIN.hand,
  femur: REST_ORIGIN.tibia,
};
/**
 * Patella track (femur sagittal plane). The patella centre moves on an arc around PAT_C whose radius shrinks
 * from the rest value (patella on the trochlea) to PAT_REND (on the anterior/distal condyles), and tilts with
 * it. The tilt for each knee angle was solved numerically so the patellar tendon (apex → tibial tuberosity)
 * keeps its rest length (it is inextensible) — the patella never floats away from the femur or the tendon.
 */
const PAT_C = { y: 0.512, z: -0.004 };
const PAT_REND = 0.046;
/** [knee flexion°, patella tilt°] */
const PAT_TILT: [number, number][] = [
  [0, 0], [10, 7.84], [20, 15.09], [30, 21.86], [40, 28.18], [50, 34.12], [60, 39.69], [70, 44.95], [80, 49.96],
  [90, 54.78], [100, 59.5], [110, 64.23], [120, 69.11], [130, 74.36], [140, 80.14], [150, 86.5], [160, 93.7],
];
function patellaTilt(knee: number): number {
  const k = Math.max(0, Math.min(160, knee)) / 10;
  const i = Math.min(15, Math.floor(k));
  const f = k - i;
  return PAT_TILT[i][1] + (PAT_TILT[i + 1][1] - PAT_TILT[i][1]) * f;
}

/** World rest position of a lateral-positive point for a given side (null = midline/bilateral-R?). */
export function restWorld(p: Vec3, side: Side | null, out = new Vector3()): Vector3 {
  const x = side === 'L' ? p[0] : side === 'R' ? -p[0] : p[0];
  return out.set(x, p[1], p[2]);
}
export function segRestOrigin(seg: SegName, out = new Vector3()): Vector3 {
  return restWorld(REST_ORIGIN[segBase(seg)], segSide(seg), out);
}

// ───────────────────────────────────────────── forward kinematics

export class RigState {
  readonly pos: Vector3[] = SEGMENTS.map(() => new Vector3());
  readonly quat: Quaternion[] = SEGMENTS.map(() => new Quaternion());
  /** Copy of the (clamped) pose vector last solved. */
  readonly vec: PoseVec = newPoseVec();
  /** World position of a point given in a segment's local frame. */
  toWorld(segIdx: number, local: Vector3, out: Vector3): Vector3 {
    return out.copy(local).applyQuaternion(this.quat[segIdx]).add(this.pos[segIdx]);
  }
  translate(dx: number, dy: number, dz: number) {
    for (const p of this.pos) {
      p.x += dx;
      p.y += dy;
      p.z += dz;
    }
    this.vec[0] += dx;
    this.vec[1] += dy;
    this.vec[2] += dz;
  }
  copyFrom(o: RigState) {
    for (let i = 0; i < this.pos.length; i++) {
      this.pos[i].copy(o.pos[i]);
      this.quat[i].copy(o.quat[i]);
    }
    this.vec.set(o.vec);
  }
}

const D2R = Math.PI / 180;
const AX = new Vector3(1, 0, 0);
const AY = new Vector3(0, 1, 0);
const AZ = new Vector3(0, 0, 1);

interface SideConst {
  off: Record<string, Vector3>;
  axis: Record<string, Vector3>;
  /** patella centre x relative to the femur origin (rest) */
  patX: number;
  scapNormal: Vector3;
  scapPivot: Vector3;
  acDir: Vector3;
}
// Precomputed offsets (child origin − parent origin, rest) per side.
const OFF_AXIAL = {
  lumbar: new Vector3(),
  thorax: new Vector3(),
  neck: new Vector3(),
  head: new Vector3(),
};
const SIDE_CONST: Record<Side, SideConst> = { R: null!, L: null! };
(() => {
  const o = (a: BaseSeg, b: BaseSeg, side: Side | null) =>
    restWorld(REST_ORIGIN[b], side).sub(restWorld(REST_ORIGIN[a], side));
  OFF_AXIAL.lumbar.copy(o('pelvis', 'lumbar', null));
  OFF_AXIAL.thorax.copy(o('lumbar', 'thorax', null));
  OFF_AXIAL.neck.copy(o('thorax', 'neck', null));
  OFF_AXIAL.head.copy(o('neck', 'head', null));
  for (const s of SIDES) {
    const W = (p: Vec3) => restWorld(p, s);
    const thoraxO = restWorld(REST_ORIGIN.thorax, null);
    const pelvisO = restWorld(REST_ORIGIN.pelvis, null);
    const off = {
      clavicle: W(REST_ORIGIN.clavicle).sub(thoraxO),
      scapula: o('clavicle', 'scapula', s),
      humerus: o('scapula', 'humerus', s),
      forearm: o('humerus', 'forearm', s),
      hand: o('forearm', 'hand', s),
      femur: W(REST_ORIGIN.femur).sub(pelvisO),
      tibia: o('femur', 'tibia', s),
      foot: o('tibia', 'foot', s),
      toes: o('foot', 'toes', s),
    };
    const axis: Record<string, Vector3> = {};
    for (const k of ['humerus', 'forearm', 'femur'] as const) {
      // proximal-pointing long axis (≈ +Y)
      axis[k] = W(REST_ORIGIN[k]).sub(W(AXIS_END[k]!)).normalize();
    }
    const patX = W(REST_ORIGIN.patella).x - W(REST_ORIGIN.femur).x;
    const sgn = s === 'R' ? 1 : -1;
    const scapNormal = new Vector3(-sgn * Math.sin(0.61), 0, -Math.cos(0.61)).normalize();
    const scapPivot = W([0.12, 1.41, -0.088]).sub(W(REST_ORIGIN.clavicle)); // spine of scapula, mid
    const acDir = off.scapula.clone().normalize();
    SIDE_CONST[s] = { off, axis, patX, scapNormal, scapPivot, acDir };
  }
})();

const PAT_A0 = Math.atan2(REST_ORIGIN.patella[1] - PAT_C.y, REST_ORIGIN.patella[2] - PAT_C.z);
const PAT_R0 = Math.hypot(REST_ORIGIN.patella[1] - PAT_C.y, REST_ORIGIN.patella[2] - PAT_C.z);

const _q = new Quaternion();
const _qa = new Quaternion();
const _qb = new Quaternion();
const _qc = new Quaternion();
const _v = new Vector3();
const _v2 = new Vector3();
const _eul = new Euler();

function qAxis(out: Quaternion, axis: Vector3, deg: number) {
  return out.setFromAxisAngle(axis, deg * D2R);
}
/** out = qx(a)·qz(b)·qy(c) intrinsic (X, then Z, then Y) — used for spine & limbs. */
function qXZY(out: Quaternion, x: number, z: number, y: number, yAxis: Vector3 = AY) {
  qAxis(out, AX, x);
  out.multiply(qAxis(_qa, AZ, z));
  out.multiply(qAxis(_qa, yAxis, y));
  return out;
}

function place(state: RigState, c: number, p: number, off: Vector3) {
  state.pos[c].copy(off).applyQuaternion(state.quat[p]).add(state.pos[p]);
}

/** Options for automatic couplings. */
export const RIG_OPTIONS = {
  /** Scapulohumeral rhythm: scapula upward rotation added automatically from arm elevation. */
  autoScapula: true,
  /** upRot_auto = clamp(gain · (elevation − 30°), 0, max); also adds protraction = protrGain · upRot_auto */
  scapGain: 0.22,
  scapMax: 30,
  protrGain: 0.3,
  /**
   * Retraction (protr −) saturates smoothly: effective girdle angle = −R·tanh(−protr / R). The girdle turns about
   * the sternoclavicular joint, ~18 cm in front of the medial border, so a linear −20° moved the border 6 cm and
   * onto the spinous processes; now −10 → −8.7°, −20 → −13°, −30 → −14.5° (border ≥ ~3 cm from the midline).
   */
  retractR: 15,
  /**
   * Share of the clavicle's elevation that also ROTATES the scapula. Shrug / depression mostly translate the
   * scapula (it slides up and down the back); rotating it rigidly with the clavicle swung the inferior angle ~8 cm
   * sideways per 25° of shrug.
   */
  elevRot: 0.2,
  /**
   * Share of the clavicle's PROTRACTION that also turns the scapula. Turning it fully with the clavicle lifted the
   * medial border ~5 cm off the ribs at protr +25 (winging); 0.65 keeps it gliding ~1 cm over the ribcage.
   * Retraction turns it fully (that keeps the border on the flat back).
   */
  protrRot: 0.65,
};

/** Arm elevation (deg, 0 = hanging, 180 = overhead) for given shoulder DOFs. */
function armElevation(flex: number, abd: number, sg: number) {
  qXZY(_qb, -flex, -sg * abd, 0);
  _v2.set(0, -1, 0).applyQuaternion(_qb);
  return Math.acos(Math.max(-1, Math.min(1, -_v2.y))) / D2R;
}

/** Forward kinematics: fills `state` from a pose vector (clamped copy kept in state.vec). */
export function solveFK(vecIn: PoseVec, state: RigState): RigState {
  const v = state.vec;
  v.set(vecIn);
  clampPose(v);
  const I = SEG_INDEX;
  // pelvis
  state.pos[I.pelvis].set(v[0], v[1], v[2]);
  _eul.set(v[3] * D2R, v[4] * D2R, v[5] * D2R, 'YXZ');
  state.quat[I.pelvis].setFromEuler(_eul);
  // spine chain: flex +X, lat +Z (toward the right), rot −Y (toward the right)
  const spine = (seg: AxialSeg, parent: AxialSeg, joint: AxialJoint) => {
    const b = slotIndex(joint, 'flex', null);
    const c = I[seg];
    const p = I[parent];
    place(state, c, p, OFF_AXIAL[seg as keyof typeof OFF_AXIAL]);
    qXZY(_q, v[b], v[b + 1], -v[b + 2]);
    state.quat[c].copy(state.quat[p]).multiply(_q);
  };
  spine('lumbar', 'pelvis', 'lumbar');
  spine('thorax', 'lumbar', 'thorax');
  spine('neck', 'thorax', 'neck');
  spine('head', 'neck', 'head');

  for (const s of SIDES) {
    const sg = s === 'R' ? 1 : -1;
    const K = SIDE_CONST[s];
    const seg = (b: LimbSeg) => I[`${b}_${s}` as SegName];
    const sl = (j: LimbJoint, d: string) => v[slotIndex(j, d, s)];
    // shoulder girdle
    const shFlex = sl('shoulder', 'flex');
    const shAbd = sl('shoulder', 'abd');
    let upRot = sl('scapula', 'upRot');
    let elev = sl('scapula', 'elev');
    let protr = sl('scapula', 'protr');
    if (RIG_OPTIONS.autoScapula) {
      const e = armElevation(shFlex, shAbd, sg);
      const auto = Math.max(0, Math.min(RIG_OPTIONS.scapMax, RIG_OPTIONS.scapGain * (e - 30)));
      upRot += auto;
      protr += RIG_OPTIONS.protrGain * auto;
    }
    const clav = seg('clavicle');
    const scap = seg('scapula');
    place(state, clav, I.thorax, K.off.clavicle);
    if (protr < 0) protr = -RIG_OPTIONS.retractR * Math.tanh(-protr / RIG_OPTIONS.retractR);
    // girdle base: explicit protraction / elevation about the sternoclavicular joint (the clavicle)
    qAxis(_qb, AY, sg * protr).multiply(qAxis(_qa, AZ, -sg * elev));
    // upward rotation about the scapular-plane normal through the middle of the scapular spine
    qAxis(_q, K.scapNormal, sg * upRot);
    _v.copy(K.off.scapula).sub(K.scapPivot).applyQuaternion(_q).add(K.scapPivot); // new AC (rel. SC, base frame)
    // the clavicle re-aims at the new AC so the AC joint stays connected (→ natural clavicle elevation)
    _qc.setFromUnitVectors(K.acDir, _v.normalize());
    state.quat[clav].copy(state.quat[I.thorax]).multiply(_qb).multiply(_qc);
    place(state, scap, clav, K.off.scapula);
    // the scapula turns with the clavicle's protraction (it slides around the ribcage) but only partly with its
    // elevation (it translates up / down the back): the AC joint stays connected, the AC is its frame origin
    qAxis(_qb, AY, sg * protr * (protr > 0 ? RIG_OPTIONS.protrRot : 1)).multiply(qAxis(_qa, AZ, -sg * elev * RIG_OPTIONS.elevRot));
    state.quat[scap].copy(state.quat[I.thorax]).multiply(_qb).multiply(_q);
    // humerus: orientation relative to the THORAX, position at the glenoid
    const hum = seg('humerus');
    place(state, hum, scap, K.off.humerus);
    qXZY(_q, -shFlex, -sg * shAbd, -sg * sl('shoulder', 'rot'), K.axis.humerus);
    state.quat[hum].copy(state.quat[I.thorax]).multiply(_q);
    // forearm: elbow flex then supination about the forearm axis
    const fa = seg('forearm');
    place(state, fa, hum, K.off.forearm);
    qAxis(_q, AX, -sl('elbow', 'flex')).multiply(qAxis(_qa, K.axis.forearm, -sg * sl('forearm', 'sup')));
    state.quat[fa].copy(state.quat[hum]).multiply(_q);
    const hand = seg('hand');
    place(state, hand, fa, K.off.hand);
    qAxis(_q, AX, -sl('wrist', 'flex'));
    state.quat[hand].copy(state.quat[fa]).multiply(_q);
    // leg
    const fem = seg('femur');
    place(state, fem, I.pelvis, K.off.femur);
    qXZY(_q, -sl('hip', 'flex'), -sg * sl('hip', 'abd'), -sg * sl('hip', 'rot'), K.axis.femur);
    state.quat[fem].copy(state.quat[I.pelvis]).multiply(_q);
    const knee = sl('knee', 'flex');
    const tib = seg('tibia');
    place(state, tib, fem, K.off.tibia);
    qAxis(_q, AX, knee);
    state.quat[tib].copy(state.quat[fem]).multiply(_q);
    // patella rides the trochlea → condyles (tendon length kept constant, see PAT_TILT)
    const pat = seg('patella');
    const tilt = patellaTilt(knee);
    const pa = PAT_A0 - tilt * D2R;
    const u = Math.min(1, tilt / 75);
    const pr = PAT_R0 + (PAT_REND - PAT_R0) * u * u * (3 - 2 * u);
    _v.set(K.patX, PAT_C.y + pr * Math.sin(pa) - REST_ORIGIN.femur[1], PAT_C.z + pr * Math.cos(pa) - REST_ORIGIN.femur[2]);
    state.pos[pat].copy(_v).applyQuaternion(state.quat[fem]).add(state.pos[fem]);
    state.quat[pat].copy(state.quat[fem]).multiply(qAxis(_q, AX, tilt));
    const foot = seg('foot');
    place(state, foot, tib, K.off.foot);
    qAxis(_q, AX, -sl('ankle', 'dorsi')).multiply(qAxis(_qa, AZ, sg * sl('ankle', 'inv')));
    state.quat[foot].copy(state.quat[tib]).multiply(_q);
    const toes = seg('toes');
    place(state, toes, foot, K.off.toes);
    qAxis(_q, AX, -sl('toes', 'ext'));
    state.quat[toes].copy(state.quat[foot]).multiply(_q);
  }
  return state;
}

// ───────────────────────────────────────────── skin shapes (mannequin) — also used for grounding

/** `loft: true` = covered visually by the smooth lofted skin (skin-loft.ts); still used for grounding/bounds. */
export type SkinShapeDef =
  | { seg: BaseSeg; kind: 'capsule'; a: Vec3; b: Vec3; ra: number; rb: number; pair?: boolean; loft?: boolean }
  | { seg: BaseSeg; kind: 'ellipsoid'; c: Vec3; r: Vec3; rot?: Vec3; pair?: boolean; loft?: boolean };

/**
 * Smooth mannequin volumes (lateral-positive rest coords). `pair` = axial shape duplicated on both sides.
 * Shapes without `loft` are drawn (together with the lofted trunk / arm / leg tubes of skin-loft.ts) and every shape
 * grounds the figure, so a drawn shape is also a contact surface. The drawn skin covers the bones with a few mm to
 * spare: probe it with shots/qa3-fix-body/probe/skin.ts (bone vertices outside the visible skin, per pose).
 */
export const SKIN_SHAPES: SkinShapeDef[] = [
  // head & neck (the back of the main ellipsoid is the supine head contact: the cranium was moved inside it instead)
  { seg: 'head', kind: 'ellipsoid', c: [0, 1.668, 0.006], r: [0.077, 0.1, 0.097] },
  { seg: 'head', kind: 'ellipsoid', c: [0, 1.584, 0.03], r: [0.068, 0.054, 0.07] },
  // occiput + mastoids (the lower back of the skull), jaw line down to the chin
  { seg: 'head', kind: 'ellipsoid', c: [0, 1.62, -0.03], r: [0.07, 0.05, 0.058] },
  { seg: 'head', kind: 'ellipsoid', c: [0, 1.552, 0.035], r: [0.056, 0.032, 0.062], rot: [19.3, 0, 0] },
  { seg: 'neck', kind: 'capsule', a: [0, 1.45, -0.03], b: [0, 1.6, -0.006], ra: 0.056, rb: 0.05, loft: true },
  // trunk
  { seg: 'thorax', kind: 'ellipsoid', c: [0, 1.302, -0.008], r: [0.148, 0.188, 0.116], loft: true },
  { seg: 'thorax', kind: 'ellipsoid', c: [0, 1.4, -0.02], r: [0.13, 0.07, 0.095], loft: true },
  // shoulder top (trapezius) and the clavicle ridge, both riding the clavicle
  { seg: 'clavicle', kind: 'capsule', a: [0.045, 1.462, -0.035], b: [0.17, 1.448, -0.022], ra: 0.042, rb: 0.04 },
  { seg: 'clavicle', kind: 'capsule', a: [0.03, 1.437, 0.064], b: [0.105, 1.449, 0.047], ra: 0.019, rb: 0.018 },
  { seg: 'clavicle', kind: 'capsule', a: [0.105, 1.449, 0.047], b: [0.168, 1.455, 0.0], ra: 0.018, rb: 0.02 },
  // over the spine of the scapula / supraspinatus (rides the scapula: shrug, protraction, upward rotation)
  { seg: 'scapula', kind: 'capsule', a: [0.08, 1.39, -0.098], b: [0.13, 1.42, -0.08], ra: 0.024, rb: 0.023 },
  { seg: 'scapula', kind: 'capsule', a: [0.13, 1.42, -0.08], b: [0.17, 1.445, -0.04], ra: 0.023, rb: 0.022 },
  // superior angle (levator scapulae), inferior angle + lateral border (teres major), coracoid (front of the shoulder)
  { seg: 'scapula', kind: 'capsule', a: [0.081, 1.428, -0.083], b: [0.08, 1.39, -0.098], ra: 0.014, rb: 0.016 },
  { seg: 'scapula', kind: 'capsule', a: [0.089, 1.242, -0.098], b: [0.128, 1.31, -0.062], ra: 0.012, rb: 0.016 },
  { seg: 'scapula', kind: 'capsule', a: [0.128, 1.31, -0.062], b: [0.147, 1.378, -0.031], ra: 0.016, rb: 0.014 },
  { seg: 'scapula', kind: 'capsule', a: [0.14, 1.425, 0.0], b: [0.152, 1.42, 0.035], ra: 0.016, rb: 0.014 },
  { seg: 'lumbar', kind: 'ellipsoid', c: [0, 1.095, -0.006], r: [0.128, 0.115, 0.098], loft: true },
  { seg: 'pelvis', kind: 'ellipsoid', c: [0, 0.958, -0.008], r: [0.163, 0.112, 0.108], loft: true },
  // buttocks: drawn (the lofted trunk alone was ~2 cm smaller, so seated / lying figures seemed to hover)
  { seg: 'pelvis', kind: 'ellipsoid', c: [0.068, 0.885, -0.05], r: [0.082, 0.082, 0.072], pair: true },
  // arm
  { seg: 'humerus', kind: 'ellipsoid', c: [0.182, 1.39, -0.006], r: [0.056, 0.068, 0.054], loft: true },
  { seg: 'humerus', kind: 'capsule', a: [0.186, 1.36, -0.008], b: [0.195, 1.105, -0.015], ra: 0.046, rb: 0.036, loft: true },
  { seg: 'forearm', kind: 'capsule', a: [0.197, 1.075, -0.012], b: [0.238, 0.85, 0.0], ra: 0.039, rb: 0.026, loft: true },
  { seg: 'hand', kind: 'ellipsoid', c: [0.246, 0.778, 0.006], r: [0.04, 0.058, 0.017] },
  { seg: 'hand', kind: 'capsule', a: [0.248, 0.735, 0.01], b: [0.254, 0.672, 0.014], ra: 0.019, rb: 0.016 },
  // thumb: in the palm plane, ~22° out from the index side (it used to stick 2 cm out palmar, so a palm flat on a
  // wall / floor pushed the thumb tip into it); palmar surface stays behind the palm & finger surfaces
  { seg: 'hand', kind: 'capsule', a: [0.272, 0.795, 0.005], b: [0.293, 0.743, 0.008], ra: 0.0115, rb: 0.0095 },
  // ring + little finger (inside the palm / finger surfaces palmar and dorsal)
  { seg: 'hand', kind: 'capsule', a: [0.232, 0.735, 0.009], b: [0.227, 0.685, 0.012], ra: 0.0145, rb: 0.012 },
  // leg
  { seg: 'femur', kind: 'capsule', a: [0.093, 0.875, -0.006], b: [0.09, 0.53, 0.0], ra: 0.086, rb: 0.055, loft: true },
  // knee: drawn rigid volumes on the femur (condyles), patella (kneecap) and tibia — the lofted knee rings blend
  // two bones and cut the corner when the knee bends, so a kneeling knee used to float ~2 cm off the floor
  { seg: 'femur', kind: 'ellipsoid', c: [0.09, 0.515, 0.0], r: [0.05, 0.045, 0.05] },
  { seg: 'patella', kind: 'ellipsoid', c: [0.09, 0.528, 0.043], r: [0.033, 0.036, 0.019] },
  { seg: 'tibia', kind: 'ellipsoid', c: [0.089, 0.497, 0.006], r: [0.052, 0.056, 0.052] },
  { seg: 'tibia', kind: 'capsule', a: [0.088, 0.455, -0.008], b: [0.09, 0.105, -0.01], ra: 0.049, rb: 0.032, loft: true },
  { seg: 'tibia', kind: 'ellipsoid', c: [0.087, 0.355, -0.03], r: [0.047, 0.1, 0.046], loft: true },
  { seg: 'foot', kind: 'ellipsoid', c: [0.09, 0.045, -0.04], r: [0.037, 0.045, 0.045] },
  // foot: the ball of the foot under the metatarsal heads (bottom exactly at the sole plane y = 0, like the heel and
  // the toes; the old sole curved up 2.5 cm under the heads). Medial heads: a capsule on the TOES segment centred on
  // the MTP axis (toes origin y 0.016, z 0.13), so toe extension / flexion and heel raises leave its bottom where it
  // is. Lateral heads (1–2 cm behind the axis): on the FOOT, which lifts them in a heel raise. (A single capsule on
  // either segment dipped 0.5–2 cm through the floor or step in heel raises / toe extension.)
  { seg: 'foot', kind: 'ellipsoid', c: [0.093, 0.04, 0.052], r: [0.045, 0.04, 0.092] },
  { seg: 'toes', kind: 'capsule', a: [0.064, 0.016, 0.132], b: [0.1, 0.016, 0.128], ra: 0.016, rb: 0.016 },
  { seg: 'foot', kind: 'capsule', a: [0.1, 0.0175, 0.122], b: [0.12, 0.0165, 0.112], ra: 0.0175, rb: 0.015 },
  { seg: 'toes', kind: 'ellipsoid', c: [0.093, 0.02, 0.165], r: [0.044, 0.02, 0.04] },
  // big toe and little toe (their tips stuck out of the toe volume); bottoms 1–3 mm above the sole plane
  { seg: 'toes', kind: 'capsule', a: [0.063, 0.0145, 0.15], b: [0.062, 0.0135, 0.188], ra: 0.0125, rb: 0.0125 },
  { seg: 'toes', kind: 'capsule', a: [0.124, 0.0125, 0.121], b: [0.125, 0.0115, 0.148], ra: 0.0085, rb: 0.0085 },
];

export type SkinPrim =
  | { segIdx: number; kind: 'capsule'; a: Vector3; b: Vector3; ra: number; rb: number; loft: boolean }
  | { segIdx: number; kind: 'ellipsoid'; c: Vector3; r: Vector3; q: Quaternion; loft: boolean };

/** Skin shapes compiled into segment-local frames (both sides). */
export const SKIN_PRIMS: SkinPrim[] = (() => {
  const out: SkinPrim[] = [];
  for (const d of SKIN_SHAPES) {
    const sides: (Side | null)[] = isAxialSeg(d.seg) ? (d.pair ? ['R', 'L'] : [null]) : ['R', 'L'];
    for (const side of sides) {
      const sn = segName(d.seg, isAxialSeg(d.seg) ? null : side);
      const o = segRestOrigin(sn);
      const segIdx = SEG_INDEX[sn];
      if (d.kind === 'capsule') {
        out.push({
          segIdx,
          kind: 'capsule',
          a: restWorld(d.a, side).sub(o),
          b: restWorld(d.b, side).sub(o),
          ra: d.ra,
          rb: d.rb,
          loft: !!d.loft,
        });
      } else {
        const rot = d.rot ?? [0, 0, 0];
        const sg = side === 'L' ? -1 : 1;
        const q = new Quaternion().setFromEuler(new Euler(rot[0] * D2R, sg * rot[1] * D2R, sg * rot[2] * D2R));
        out.push({ segIdx, kind: 'ellipsoid', c: restWorld(d.c, side).sub(o), r: new Vector3(...d.r), q, loft: !!d.loft });
      }
    }
  }
  return out;
})();

// ───────────────────────────────────────────── lofted skin rings (drawn by skin-loft.ts)

export interface LoftRingDef {
  /** rest centre, lateral-positive */
  c: Vec3;
  /** half-width (x) and half-depth (z, front half; also the back half unless `bb` is given) */
  a: number;
  b: number;
  w: [BaseSeg, number][];
  /** back half-depth (z−) when the ring is not front/back symmetric */
  bb?: number;
  /** superellipse exponent of this ring (default: the chain's) — > 2 = boxier corners (pelvis, shoulders) */
  n?: number;
}
export interface LoftChainDef {
  rings: LoftRingDef[];
  /** superellipse exponent (2 = ellipse) */
  n: number;
  sided: boolean;
}

const ring = (c: Vec3, a: number, b: number, w: [BaseSeg, number][], o: { bb?: number; n?: number } = {}): LoftRingDef => ({ c, a, b, w, ...o });

// Ring sizes cover the bones with a few mm of "soft tissue" (probe: shots/qa3-fix-body/probe/skin.ts): iliac crest &
// ASIS (boxier pelvis rings, n 2.8), lower ribs, lumbar / thoracic spinous processes (deeper back, `bb`), sternum and
// clavicles (deeper front at the top). The back (supine / wall contact) and the waist (where the towel clips squeeze a
// towel against the trunk) changed only ~3 mm: there the bones were made a little smaller instead.
export const LOFT_TRUNK: LoftChainDef = {
  n: 2.35,
  sided: false,
  rings: [
    ring([0, 0.818, -0.012], 0.02, 0.018, [['pelvis', 1]]),
    ring([0, 0.832, -0.012], 0.085, 0.06, [['pelvis', 1]]),
    ring([0, 0.862, -0.018], 0.138, 0.092, [['pelvis', 1]]),
    ring([0, 0.9, -0.02], 0.158, 0.106, [['pelvis', 1]]),
    ring([0, 0.95, -0.014], 0.162, 0.112, [['pelvis', 1]], { bb: 0.104 }),
    ring([0, 1.0, -0.008], 0.155, 0.108, [['pelvis', 0.8], ['lumbar', 0.2]], { bb: 0.097, n: 2.8 }),
    ring([0, 1.05, -0.004], 0.156, 0.094, [['pelvis', 0.65], ['lumbar', 0.35]], { bb: 0.102, n: 2.8 }),
    ring([0, 1.075, -0.004], 0.154, 0.093, [['pelvis', 0.4], ['lumbar', 0.6]], { bb: 0.103, n: 2.6 }),
    ring([0, 1.11, -0.004], 0.134, 0.094, [['pelvis', 0.08], ['lumbar', 0.92]], { bb: 0.104 }),
    ring([0, 1.15, -0.006], 0.136, 0.1, [['lumbar', 0.4], ['thorax', 0.6]], { bb: 0.103 }),
    ring([0, 1.2, -0.008], 0.153, 0.115, [['lumbar', 0.05], ['thorax', 0.95]], { bb: 0.11 }),
    ring([0, 1.26, -0.008], 0.156, 0.117, [['thorax', 1]], { bb: 0.117 }),
    ring([0, 1.32, -0.01], 0.153, 0.118, [['thorax', 1]], { bb: 0.118 }),
    ring([0, 1.375, -0.016], 0.149, 0.119, [['thorax', 1]], { bb: 0.11 }),
    ring([0, 1.415, -0.02], 0.14, 0.111, [['thorax', 1]], { bb: 0.098 }),
    ring([0, 1.448, -0.024], 0.098, 0.09, [['thorax', 0.7], ['neck', 0.3]], { bb: 0.078 }),
    ring([0, 1.475, -0.026], 0.06, 0.058, [['thorax', 0.25], ['neck', 0.75]]),
    ring([0, 1.53, -0.018], 0.05, 0.052, [['neck', 1]]),
    ring([0, 1.58, -0.01], 0.05, 0.053, [['neck', 0.5], ['head', 0.5]]),
    ring([0, 1.61, -0.005], 0.046, 0.05, [['head', 1]]),
  ],
};

export const LOFT_ARM: LoftChainDef = {
  n: 2,
  sided: true,
  rings: [
    ring([0.178, 1.448, -0.006], 0.012, 0.012, [['humerus', 1]]),
    ring([0.18, 1.437, -0.006], 0.036, 0.038, [['humerus', 1]]),
    ring([0.183, 1.41, -0.006], 0.054, 0.052, [['humerus', 1]]),
    ring([0.187, 1.37, -0.006], 0.053, 0.05, [['humerus', 1]]),
    ring([0.19, 1.31, -0.008], 0.047, 0.046, [['humerus', 1]]),
    ring([0.192, 1.23, -0.01], 0.043, 0.045, [['humerus', 1]]),
    ring([0.193, 1.16, -0.013], 0.041, 0.042, [['humerus', 1]]),
    // elbow: wide enough for both epicondyles (the medial one used to stick out ~1 cm)
    ring([0.191, 1.095, -0.015], 0.045, 0.039, [['humerus', 0.55], ['forearm', 0.45]]),
    ring([0.202, 1.04, -0.012], 0.04, 0.037, [['humerus', 0.1], ['forearm', 0.9]]),
    ring([0.214, 0.97, -0.008], 0.034, 0.03, [['forearm', 1]]),
    ring([0.228, 0.9, -0.003], 0.03, 0.022, [['forearm', 1]]),
    // wrist: radial styloid + ulnar head
    ring([0.238, 0.848, -0.001], 0.034, 0.019, [['forearm', 0.6], ['hand', 0.4]]),
    ring([0.241, 0.825, 0.002], 0.031, 0.016, [['hand', 1]]),
  ],
};

export const LOFT_LEG: LoftChainDef = {
  n: 2,
  sided: true,
  rings: [
    ring([0.098, 0.95, -0.012], 0.05, 0.055, [['femur', 1]]),
    ring([0.097, 0.9, -0.008], 0.082, 0.082, [['femur', 1]]),
    ring([0.096, 0.84, -0.004], 0.084, 0.083, [['femur', 1]]),
    ring([0.094, 0.76, 0.0], 0.077, 0.076, [['femur', 1]]),
    ring([0.092, 0.67, 0.002], 0.068, 0.066, [['femur', 1]]),
    ring([0.09, 0.59, 0.003], 0.057, 0.056, [['femur', 1]]),
    ring([0.09, 0.535, 0.005], 0.052, 0.052, [['femur', 0.85], ['tibia', 0.15]]),
    ring([0.089, 0.495, 0.006], 0.051, 0.053, [['femur', 0.45], ['tibia', 0.55]]),
    ring([0.088, 0.45, -0.003], 0.05, 0.052, [['femur', 0.05], ['tibia', 0.95]]),
    ring([0.088, 0.39, -0.014], 0.048, 0.057, [['tibia', 1]]),
    ring([0.088, 0.32, -0.017], 0.046, 0.054, [['tibia', 1]]),
    // lower leg & ankle: fibula, both malleoli and the Achilles tendon inside (deeper back `bb`)
    ring([0.09, 0.24, -0.012], 0.04, 0.043, [['tibia', 1]], { bb: 0.052 }),
    ring([0.092, 0.165, -0.012], 0.038, 0.034, [['tibia', 1]], { bb: 0.05 }),
    ring([0.092, 0.11, -0.016], 0.037, 0.038, [['tibia', 0.85], ['foot', 0.15]], { bb: 0.044 }),
    ring([0.091, 0.085, -0.014], 0.04, 0.038, [['tibia', 0.6], ['foot', 0.4]], { bb: 0.04 }),
  ],
};

/** Vertices per lofted ring (+1 seam duplicate in the drawn mesh). */
export const LOFT_AROUND = 36;

/** Rest world position of vertex `j` of a lofted ring (the drawn skin, skin-loft.ts, and the grounding use this). */
export function loftRingPoint(def: LoftChainDef, r: LoftRingDef, j: number, side: Side | null, out: Vector3): Vector3 {
  const t = (j / LOFT_AROUND) * Math.PI * 2;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const e = 2 / (r.n ?? def.n);
  const x = r.a * Math.sign(c) * Math.pow(Math.abs(c), e);
  const z = (s < 0 ? (r.bb ?? r.b) : r.b) * Math.sign(s) * Math.pow(Math.abs(s), e);
  // ring centre in world rest coords; mirror lateral offsets for the side
  return out.set((side === 'R' ? -1 : 1) * r.c[0] + (side === 'R' ? -x : x), r.c[1], r.c[2] + z);
}

/**
 * The back skin over the shoulder blades drapes over the blade (per-vertex, like a real back): the scapula glides
 * 3–6 cm over the ribcage (protraction, upward rotation in arm elevation) and lifts off it, and with a thorax-only back
 * its borders came 1–2 cm out of the skin (push-up plus, wall slide, lat stretch, cat-cow, dead bug…). The trunk-loft
 * vertices over the blade region (rings 1.2–1.415: back, flank, the side of the chest under the armpit) are pushed
 * out along their normal just far enough to stay BLADE_MARGIN outside every nearby blade sample point (BLADE_SAMPLES,
 * riding the scapula), with a smooth falloff by the sample's distance along the skin. Never inward, never sideways;
 * nothing moves at rest or while the blade stays under the soft tissue. Weight: SCAP_SKIN × region (scapulaSkinWeight).
 */
export const SCAP_SKIN = 1;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
/** Region share of a trunk-loft vertex at rest [lat, y, z]: 0 on the spine, the front of the chest and below the blade. */
export function scapulaSkinWeight(lat: number, y: number, z: number): number {
  // back and flank; in front only the side of the chest under the armpit (the girdle carries it forward in protraction)
  const zw = z < 0 ? 1 : smooth(0.1, 0.13, lat) * (1 - smooth(0.03, 0.08, z));
  return SCAP_SKIN * smooth(1.17, 1.24, y) * smooth(0.035, 0.07, lat) * zw;
}
/** Skin kept outside a moving blade sample point (m). */
const BLADE_MARGIN = 0.006;
/** Upper bound of a drape push (a sample within the falloff radius, plus the margin). */
const MAX_DRAPE = 0.075;
/** Falloff of a sample's push with its distance along the skin: horizontal / vertical radius (rings are ~5.5 cm apart). */
const BLADE_RH = 0.04;
const BLADE_RV = 0.06;
/**
 * Blade sample points (rest, lateral-positive) on the posterior surface of the scapula: a barycentric grid over the
 * triangle superior angle – inferior angle – lateral angle (= skeleton.ts), plus the spine's root and the neck.
 */
export const BLADE_SAMPLES: Vec3[] = (() => {
  const A: Vec3 = [0.077, 1.435, -0.09];
  const B: Vec3 = [0.086, 1.236, -0.104];
  const C: Vec3 = [0.144, 1.396, -0.032];
  const out: Vec3[] = [];
  const N = 4;
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= N - i; j++) {
      const a = i / N;
      const b = j / N;
      const c = 1 - a - b;
      out.push([A[0] * a + B[0] * b + C[0] * c, A[1] * a + B[1] * b + C[1] * c, A[2] * a + B[2] * b + C[2] * c]);
    }
  out.push([0.12, 1.413, -0.096], [0.132, 1.398, -0.048]);
  return out;
})();
const NB = BLADE_SAMPLES.length;
/** Blade sample points in their scapula frames (R then L), and their world positions for the current state. */
const BLADE_LOCAL = new Float32Array(2 * NB * 3);
for (const [k, s] of (['R', 'L'] as Side[]).entries()) {
  const o = segRestOrigin(segName('scapula', s));
  BLADE_SAMPLES.forEach((p, i) => {
    const w = restWorld(p, s).sub(o);
    BLADE_LOCAL.set([w.x, w.y, w.z], (k * NB + i) * 3);
  });
}
const _bw = new Vector3();
/** World positions of the blade samples (R then L) for `state` into `out` (2 · NB · 3). Allocation-free. */
export function bladeSamplesWorld(state: RigState, out: Float32Array): Float32Array {
  for (let k = 0; k < 2; k++) {
    const si = SEG_INDEX[k ? 'scapula_L' : 'scapula_R'];
    for (let i = 0; i < NB; i++) {
      const o = (k * NB + i) * 3;
      _bw.set(BLADE_LOCAL[o], BLADE_LOCAL[o + 1], BLADE_LOCAL[o + 2]).applyQuaternion(state.quat[si]).add(state.pos[si]);
      out[o] = _bw.x;
      out[o + 1] = _bw.y;
      out[o + 2] = _bw.z;
    }
  }
  return out;
}
export const newBladeSamples = () => new Float32Array(2 * NB * 3);

/** How a lofted skin vertex is skinned: rest point, the one or two segments it follows and the second one's weight. */
export interface LoftBinding {
  p: Vector3;
  segA: SegName;
  segB: SegName;
  w: number;
  /** drape: 0 none; 1 = back skin over the shoulder blade (base = thorax only, drapes over that side's blade samples) */
  drape: 0 | 1;
  /** drape weight (region falloff) */
  dw: number;
  /** rest outward normal (in segA's frame) */
  n: Vector3;
  /** drape push at rest (already part of the drawn rest shape) */
  push0: number;
}
const _l0 = new Vector3();
const _l1 = new Vector3();
const _l2 = new Vector3();
/** Binding of vertex `j` of ring `ri` (drawn loft and grounding share it, so they always agree). */
export function loftBinding(def: LoftChainDef, ri: number, j: number, side: Side | null, out: LoftBinding): LoftBinding {
  const r = def.rings[ri];
  loftRingPoint(def, r, j, side, out.p);
  const wsum = r.w.reduce((a, x) => a + x[1], 0);
  out.segA = segName(r.w[0][0], side);
  out.segB = segName((r.w[1] ?? r.w[0])[0], side);
  out.w = r.w[1] ? r.w[1][1] / wsum : 0;
  out.drape = 0;
  out.dw = 0;
  out.push0 = 0;
  if (def !== LOFT_TRUNK || ri === 0 || ri === def.rings.length - 1) return out;
  const th = r.w.find((x) => x[0] === 'thorax');
  const ws = th && th[1] / wsum >= 0.95 ? scapulaSkinWeight(Math.abs(out.p.x), out.p.y, out.p.z) : 0;
  if (ws <= 0.001) return out;
  // (ring 1.2 drops its 5 % lumbar share over the blade)
  out.segA = 'thorax';
  out.segB = 'thorax';
  out.w = 0;
  out.drape = 1;
  out.dw = ws;
  // rest surface normal of the drawn loft here (around tangent × ring-to-ring tangent), pointing outward
  const ta = loftRingPoint(def, r, (j + 1) % LOFT_AROUND, side, _l0).sub(loftRingPoint(def, r, (j + LOFT_AROUND - 1) % LOFT_AROUND, side, _l1));
  const tu = loftRingPoint(def, def.rings[ri + 1], j, side, _l1).sub(loftRingPoint(def, def.rings[ri - 1], j, side, _l2));
  out.n.crossVectors(ta, tu).normalize();
  if (out.n.dot(_l0.set(out.p.x, 0, out.p.z - r.c[2])) < 0) out.n.negate();
  out.push0 = drapeOf(out.p.x < 0, out.p, out.n, _l1.set(0, 1, 0), SAMPLES_REST);
  return out;
}
export const newLoftBinding = (): LoftBinding => ({ p: new Vector3(), segA: 'thorax', segB: 'thorax', w: 0, drape: 0, dw: 0, n: new Vector3(), push0: 0 });

/**
 * How far (m) a skin point at `a` with outward normal `n` must move out along `n` to stay `margin` outside the
 * samples `s[k0 … k1)` near it (`up` = trunk axis, for the anisotropic falloff along the skin).
 */
function drapePush(a: Vector3, n: Vector3, up: Vector3, s: Float32Array, k0: number, k1: number, margin: number): number {
  let push = 0;
  for (let k = k0; k < k1; k++) {
    const dx = s[k * 3] - a.x;
    const dy = s[k * 3 + 1] - a.y;
    const dz = s[k * 3 + 2] - a.z;
    const dn = dx * n.x + dy * n.y + dz * n.z;
    const h = dn + margin;
    if (h <= push) continue;
    // distance along the skin: vertical (trunk axis) and horizontal parts of the tangential offset
    const tx = dx - dn * n.x;
    const ty = dy - dn * n.y;
    const tz = dz - dn * n.z;
    const tv = tx * up.x + ty * up.y + tz * up.z;
    const th2 = Math.max(0, tx * tx + ty * ty + tz * tz - tv * tv);
    const q = Math.sqrt(th2 / (BLADE_RH * BLADE_RH) + (tv * tv) / (BLADE_RV * BLADE_RV));
    if (q >= 1) continue;
    const f = 1 - smooth(0.4, 1, q);
    if (h * f > push) push = h * f;
  }
  return push;
}
/** The drape push of a vertex over that side's blade samples. */
function drapeOf(right: boolean, a: Vector3, n: Vector3, up: Vector3, s: Float32Array): number {
  return drapePush(a, n, up, s, right ? 0 : NB, right ? NB : 2 * NB, BLADE_MARGIN);
}
/** Blade samples at rest (world, R then L) — the reference for each vertex's rest push (`push0`). */
const SAMPLES_REST = (() => {
  const out = newBladeSamples();
  BLADE_SAMPLES.forEach((p, i) => {
    for (const [k, s] of (['R', 'L'] as Side[]).entries()) out.set(restWorld(p, s).toArray(), (k * NB + i) * 3);
  });
  return out;
})();

const _sn = new Vector3();
const _su = new Vector3();
/**
 * World position of a lofted skin vertex (offset `o` = 3 × vertex into the per-vertex arrays): the linear blend of its
 * position on segment A and on segment B; a draped vertex (`drape` 1, rest normal `nrm` in segment A's frame,
 * `push0` = its push at rest, which the drawn rest shape already contains, `samples` = bladeSamplesWorld of this
 * state) is then pushed out along its normal by dw × (drape push − rest push), never inward. Allocation-free.
 */
export function skinVertex(
  state: RigState,
  ia: number,
  la: Float32Array,
  ib: number,
  lb: Float32Array,
  w: number,
  drape: number,
  dw: number,
  nrm: Float32Array | null,
  push0: Float32Array | null,
  samples: Float32Array | null,
  o: number,
  out: Vector3,
): Vector3 {
  out.set(la[o], la[o + 1], la[o + 2]).applyQuaternion(state.quat[ia]).add(state.pos[ia]);
  if (w > 0) out.lerp(_sn.set(lb[o], lb[o + 1], lb[o + 2]).applyQuaternion(state.quat[ib]).add(state.pos[ib]), w);
  if (!drape || !nrm || !push0 || !samples) return out;
  _sn.set(nrm[o], nrm[o + 1], nrm[o + 2]).applyQuaternion(state.quat[ia]);
  _su.set(0, 1, 0).applyQuaternion(state.quat[ia]);
  // blade side: a blade-draped vertex is bound to the thorax (origin on the midline), so its local x is its rest x
  const push = Math.min(MAX_DRAPE, drapeOf(la[o] < 0, out, _sn, _su, samples) - push0[o / 3]);
  return push > 0 ? out.addScaledVector(_sn, dw * push) : out;
}

/**
 * Trunk rings that also GROUND the figure, vertex for vertex (LOFT_TRUNK indices): the drawn back and chest — sacral
 * level (0.9) and the ribcage from the thoracolumbar junction to the upper back (1.15 … 1.448). The analytic trunk
 * volumes (`loft: true` ellipsoids) are smaller than the drawn skin at the back of the ribcage, so supine figures used to
 * sink 2.7–4 mm (and the sacrum ~2 mm) into the floor. The drawn loft is a triangle mesh, so its lowest point is
 * always one of these vertices: exact, and cheap (one rotated y per vertex in lowestSkinY).
 */
export const GROUND_RINGS: readonly number[] = [3, 9, 10, 11, 12, 13, 14, 15];

/** Ground-ring vertices compiled into segment-local offsets (one or two segments each, exactly like the drawn loft). */
const GR = (() => {
  const n = GROUND_RINGS.length * LOFT_AROUND;
  const out = {
    n,
    rings: GROUND_RINGS.length,
    segA: new Int16Array(n),
    segB: new Int16Array(n),
    w: new Float32Array(n),
    la: new Float32Array(n * 3),
    lb: new Float32Array(n * 3),
    drape: new Uint8Array(n),
    dw: new Float32Array(n),
    nrm: new Float32Array(n * 3),
    push0: new Float32Array(n),
    samples: newBladeSamples(),
  };
  const b = newLoftBinding();
  const oA = new Vector3();
  const oB = new Vector3();
  GROUND_RINGS.forEach((ri, k) => {
    for (let j = 0; j < LOFT_AROUND; j++) {
      const v = k * LOFT_AROUND + j;
      loftBinding(LOFT_TRUNK, ri, j, null, b);
      segRestOrigin(b.segA, oA);
      segRestOrigin(b.segB, oB);
      out.segA[v] = SEG_INDEX[b.segA];
      out.segB[v] = SEG_INDEX[b.segB];
      out.w[v] = b.w;
      out.la.set([b.p.x - oA.x, b.p.y - oA.y, b.p.z - oA.z], v * 3);
      out.lb.set([b.p.x - oB.x, b.p.y - oB.y, b.p.z - oB.z], v * 3);
      out.drape[v] = b.drape;
      out.dw[v] = b.dw;
      out.nrm.set([b.n.x, b.n.y, b.n.z], v * 3);
      out.push0[v] = b.push0;
    }
  });
  return out;
})();

/** World y of a segment-local point (rotated y component only — allocation-free). */
function worldY(state: RigState, seg: number, l: Float32Array, o: number) {
  const q = state.quat[seg];
  const vx = l[o], vy = l[o + 1], vz = l[o + 2];
  // v' = v + 2w(q×v) + 2 q×(q×v), y component
  const tx = 2 * (q.y * vz - q.z * vy);
  const ty = 2 * (q.z * vx - q.x * vz);
  const tz = 2 * (q.x * vy - q.y * vx);
  return vy + q.w * ty + (q.z * tx - q.x * tz) + state.pos[seg].y;
}
const _gv = new Vector3();
/** World position of ground-ring vertex v into `out`. */
function groundVertex(state: RigState, v: number, out: Vector3) {
  return skinVertex(state, GR.segA[v], GR.la, GR.segB[v], GR.lb, GR.w[v], GR.drape[v], GR.dw[v], GR.nrm, GR.push0, GR.samples, v * 3, out);
}
/** World AABB of ground ring k into _box. */
function ringBox(state: RigState, k: number) {
  _box[0] = _box[1] = _box[2] = Infinity;
  _box[3] = _box[4] = _box[5] = -Infinity;
  for (let j = 0; j < LOFT_AROUND; j++) {
    groundVertex(state, k * LOFT_AROUND + j, _gv);
    if (_gv.x < _box[0]) _box[0] = _gv.x;
    if (_gv.y < _box[1]) _box[1] = _gv.y;
    if (_gv.z < _box[2]) _box[2] = _gv.z;
    if (_gv.x > _box[3]) _box[3] = _gv.x;
    if (_gv.y > _box[4]) _box[4] = _gv.y;
    if (_gv.z > _box[5]) _box[5] = _gv.z;
  }
}

const _m4 = new Matrix4();
const _wa = new Vector3();
const _wb = new Vector3();
const _wq = new Quaternion();

/** Extent of an ellipsoid along world axes: half-sizes written to `out`. */
function ellipsoidHalf(q: Quaternion, r: Vector3, out: Vector3) {
  const e = _m4.makeRotationFromQuaternion(q).elements;
  out.set(
    Math.hypot(e[0] * r.x, e[4] * r.y, e[8] * r.z),
    Math.hypot(e[1] * r.x, e[5] * r.y, e[9] * r.z),
    Math.hypot(e[2] * r.x, e[6] * r.y, e[10] * r.z),
  );
  return out;
}

const _box = new Float64Array(6);
/** World AABB of one skin primitive into _box (minX, minY, minZ, maxX, maxY, maxZ). No allocations. */
function primBox(state: RigState, p: SkinPrim) {
  if (p.kind === 'capsule') {
    state.toWorld(p.segIdx, p.a, _wa);
    state.toWorld(p.segIdx, p.b, _wb);
    _box[0] = Math.min(_wa.x - p.ra, _wb.x - p.rb);
    _box[1] = Math.min(_wa.y - p.ra, _wb.y - p.rb);
    _box[2] = Math.min(_wa.z - p.ra, _wb.z - p.rb);
    _box[3] = Math.max(_wa.x + p.ra, _wb.x + p.rb);
    _box[4] = Math.max(_wa.y + p.ra, _wb.y + p.rb);
    _box[5] = Math.max(_wa.z + p.ra, _wb.z + p.rb);
  } else {
    state.toWorld(p.segIdx, p.c, _wa);
    _wq.copy(state.quat[p.segIdx]).multiply(p.q);
    ellipsoidHalf(_wq, p.r, _wb);
    _box[0] = _wa.x - _wb.x;
    _box[1] = _wa.y - _wb.y;
    _box[2] = _wa.z - _wb.z;
    _box[3] = _wa.x + _wb.x;
    _box[4] = _wa.y + _wb.y;
    _box[5] = _wa.z + _wb.z;
  }
}

/** Visit every skin primitive's world AABB: cb(minX,minY,minZ,maxX,maxY,maxZ). */
export function forEachSkinBox(
  state: RigState,
  cb: (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, segIdx: number) => void,
) {
  for (const p of SKIN_PRIMS) {
    primBox(state, p);
    cb(_box[0], _box[1], _box[2], _box[3], _box[4], _box[5], p.segIdx);
  }
  bladeSamplesWorld(state, GR.samples);
  for (let k = 0; k < GR.rings; k++) {
    ringBox(state, k);
    cb(_box[0], _box[1], _box[2], _box[3], _box[4], _box[5], GR.segA[k * LOFT_AROUND]);
  }
}

/** Lowest skin point (world y). Allocation-free (runs every frame for grounding). */
export function lowestSkinY(state: RigState): number {
  let m = Infinity;
  for (const p of SKIN_PRIMS) {
    primBox(state, p);
    if (_box[1] < m) m = _box[1];
  }
  // the drawn back / chest (GROUND_RINGS), vertex for vertex; a draped vertex (over the shoulder blade) only needs its
  // drape when it is within the largest possible push of the lowest point so far (standing: never)
  let samples = false;
  for (let v = 0; v < GR.n; v++) {
    let y = worldY(state, GR.segA[v], GR.la, v * 3);
    const w = GR.w[v];
    if (w > 0) y += (worldY(state, GR.segB[v], GR.lb, v * 3) - y) * w;
    if (GR.drape[v] && y - MAX_DRAPE < m) {
      if (!samples) bladeSamplesWorld(state, GR.samples);
      samples = true;
      y = groundVertex(state, v, _gv).y;
    }
    if (y < m) m = y;
  }
  return m;
}

export interface Bounds {
  min: Vector3;
  max: Vector3;
}
export function skinBounds(state: RigState, out: Bounds = { min: new Vector3(), max: new Vector3() }): Bounds {
  out.min.set(Infinity, Infinity, Infinity);
  out.max.set(-Infinity, -Infinity, -Infinity);
  const np = SKIN_PRIMS.length;
  bladeSamplesWorld(state, GR.samples);
  for (let i = 0; i < np + GR.rings; i++) {
    if (i < np) primBox(state, SKIN_PRIMS[i]);
    else ringBox(state, i - np);
    if (_box[0] < out.min.x) out.min.x = _box[0];
    if (_box[1] < out.min.y) out.min.y = _box[1];
    if (_box[2] < out.min.z) out.min.z = _box[2];
    if (_box[3] > out.max.x) out.max.x = _box[3];
    if (_box[4] > out.max.y) out.max.y = _box[4];
    if (_box[5] > out.max.z) out.max.z = _box[5];
  }
  return out;
}

/** Place the figure so that its lowest skin point is at height `y`. */
export function groundState(state: RigState, y = 0) {
  const low = lowestSkinY(state);
  if (Number.isFinite(low)) state.translate(0, y - low, 0);
}

// ───────────────────────────────────────────── base poses

export const BASE_POSE_NAMES = [
  'STAND',
  'SUPINE',
  'PRONE',
  'SIDE_LYING',
  'QUADRUPED',
  'HALF_KNEEL',
  'LONG_SIT',
  'SIT_CHAIR',
  'PLANK',
  'SIDE_PLANK',
  'STAND_STEP',
  'BIKE',
  'SWIM',
] as const;
export type BasePoseName = (typeof BASE_POSE_NAMES)[number] | 'ANATOMICAL';

export type CameraPresetName = 'front' | 'back' | 'left' | 'right' | 'top' | 'iso' | 'isoBack' | 'isoLeft';

export interface Anchor {
  /** 'bone:landmark' (side resolved: right unless the clip is mirrored), e.g. 'toes:toes_mid'. */
  point: `${string}:${string}`;
  /** 'xyz' pins the point completely; 'xz' pins it horizontally and lets `ground` set the height. */
  axes: 'xz' | 'xyz';
}

export interface BasePoseDef {
  pose: Pose;
  /** Height where the lowest skin point is placed (default 0). `false` = keep root.pos as written. */
  ground?: number | false;
  anchor?: Anchor;
  props?: Prop[];
  /** Nice default camera for this pose. */
  camera?: CameraPresetName;
  /** Japanese description for docs / dev. */
  ja: string;
}

const relaxedArms: JointAngles = {
  shoulder: { abd: 7 },
  elbow: { flex: 10 },
  forearm: { sup: -20 },
};

export const BASE_POSES: Record<BasePoseName, BasePoseDef> = {
  ANATOMICAL: { pose: { root: { pos: [0, 0.92, 0] } }, camera: 'front', ja: '解剖学的立位（基準姿勢・L0）' },
  STAND: {
    pose: { root: { pos: [0, 0.92, 0] }, joints: { ...relaxedArms } },
    camera: 'iso',
    ja: '立位',
  },
  SUPINE: {
    pose: {
      root: { pos: [0, 0.2, 0], rot: [-90, 0, 0] },
      // solved so the back of the head, the upper back, the sacrum and the heels all rest on the floor; arms by the sides
      // with the palms down on the floor (qa3-fix-clips: shoulder extension lowers the hands, which hovered 12 cm up)
      joints: {
        shoulder: { flex: -12.45, abd: 9.52 },
        elbow: { flex: 4.77 },
        forearm: { sup: -165 },
        wrist: { flex: -3.27 },
        ankle: { dorsi: -20 },
        hip: { flex: -2, rot: 8 },
        neck: { flex: -8 },
      },
    },
    camera: 'iso',
    ja: '仰向け（頭は −Z 方向）',
  },
  PRONE: {
    pose: {
      root: { pos: [0, 0.2, 0], rot: [90, 0, 0] },
      // solved so the chest and pelvis rest on the floor, thighs and the tops of the feet (nearly) too;
      // the face is just off the floor (it used to be the only contact, which left the body hovering)
      joints: {
        shoulder: { abd: 12 },
        elbow: { flex: 5 },
        forearm: { sup: -60 },
        hip: { flex: 3.5 },
        knee: { flex: 2 },
        ankle: { dorsi: -60 },
        toes: { ext: -30 },
        neck: { flex: -6 },
      },
    },
    camera: 'iso',
    ja: 'うつ伏せ（頭は +Z 方向）',
  },
  SIDE_LYING: {
    pose: {
      // solved (qa3-fix-clips) so the bottom shoulder, hip, knee and foot rest on the floor and the head rests on the
      // pillow with the neck nearly in line (it used to be propped on the bottom thumb with the pelvis 5 cm up and the
      // head 7 cm up despite a 40° neck side-bend): roll −81.9°, bottom hip adducted 5.6°, the top leg follows (−2.2°)
      // so the knees stay stacked; bottom forearm on the floor in front of the face
      root: { pos: [0, 0.2, 0], rot: [0, 0, -81.88] },
      joints: {
        hip: { flex: 40 },
        hip_L: { abd: -5.62 },
        hip_R: { abd: -2.2 },
        knee: { flex: 60 },
        ankle: { dorsi: -15 },
        neck: { lat: -19 },
        head: { lat: 0 },
        scapula_L: { protr: 12 },
        shoulder_L: { flex: 74.61, abd: -7.91 },
        elbow_L: { flex: 120.31 },
        forearm_L: { sup: -60 },
        shoulder_R: { flex: 45, abd: -8 },
        elbow_R: { flex: 70 },
        forearm_R: { sup: -90 },
        wrist_R: { flex: -20 },
      },
    },
    // head pillow: puffed top 4 mm above the head's lowest point (centre height = 1.35 × the 0.104 edge height)
    props: [{ kind: 'pillow', at: [0.75, 0.14, 0], size: [0.27, 0.104, 0.3] }],
    camera: 'front',
    ja: '横向き（左側が下・右側が上、頭は +X 方向）',
  },
  QUADRUPED: {
    pose: {
      // solved (= the k1 clips' QUAD): thighs vertical, hands under / just in front of the shoulders, palms, fingers,
      // knees, shins and the tops of the feet on the floor, flat back (qa3-fix-clips: the hands hovered 2 cm up)
      root: { pos: [0, 0.49, 0], rot: [78.42, 0, 0] },
      joints: {
        hip: { flex: 78.98 },
        knee: { flex: 89.73 },
        ankle: { dorsi: -60 },
        toes: { ext: 0 },
        shoulder: { flex: 80.72, abd: -11.92, rot: 15 },
        elbow: { flex: 3 },
        forearm: { sup: -150 },
        wrist: { flex: -85 },
        neck: { flex: -8 },
      },
    },
    camera: 'iso',
    ja: '四つ這い（手と膝をつく、頭は +Z 方向）',
  },
  HALF_KNEEL: {
    pose: {
      root: { pos: [0, 0.5, 0] },
      joints: {
        hip_R: { flex: -5 },
        knee_R: { flex: 100 },
        ankle_R: { dorsi: 20 },
        toes_R: { ext: 70 },
        hip_L: { flex: 92, abd: 3 },
        knee_L: { flex: 92 },
        ankle_L: { dorsi: 0 },
        shoulder: { abd: 6 },
        elbow: { flex: 15 },
        forearm: { sup: -30 },
      },
    },
    camera: 'right',
    ja: '片膝立ち（右膝が床、左足が前）',
  },
  LONG_SIT: {
    pose: {
      root: { pos: [0, 0.3, 0], rot: [-12, 0, 0] },
      joints: {
        hip: { flex: 76.5 },
        knee: { flex: 0 },
        ankle: { dorsi: -15 },
        lumbar: { flex: 12 },
        thorax: { flex: 8 },
        neck: { flex: 5 },
        shoulder: { flex: 25, abd: 12 },
        elbow: { flex: 35 },
        forearm: { sup: -110 },
      },
    },
    camera: 'right',
    ja: '長座（床に座り脚を伸ばす）',
  },
  SIT_CHAIR: {
    pose: {
      root: { pos: [0, 0.5, 0] },
      joints: {
        hip: { flex: 90, abd: 5 },
        knee: { flex: 90 },
        // hands hold the side edges of the seat (palm just outside the edge, fingers under it), arms hanging — they used
        // to hover ~19 cm above the thighs (qa3-fix-clips); also keeps the thighs free for the seated quadriceps demos
        shoulder: { flex: -2.61, abd: 3.49, rot: -0.51 },
        elbow: { flex: 3.94 },
        forearm: { sup: -88.65 },
        wrist: { flex: 36.65 },
      },
    },
    props: [
      {
        kind: 'chair',
        at: { at: { mix: ['pelvis:ischial_tuberosity_R', 'pelvis:ischial_tuberosity_L'], t: 0.5 }, off: [0, -0.035, -0.03] },
      },
    ],
    camera: 'iso',
    ja: '椅子座位',
  },
  PLANK: {
    pose: {
      root: { pos: [0, 0.4, 0], rot: [82, 0, 0] },
      joints: {
        shoulder: { flex: 82, abd: 6 },
        elbow: { flex: 90 },
        forearm: { sup: -150 },
        wrist: { flex: 0 },
        ankle: { dorsi: 5 },
        toes: { ext: 65 },
        neck: { flex: -10 },
      },
    },
    camera: 'right',
    ja: 'プランク（前腕とつま先で支える）',
  },
  SIDE_PLANK: {
    pose: {
      root: { pos: [0, 0.4, 0], rot: [0, 0, -74.3] },
      joints: {
        shoulder_L: { abd: 72.3, flex: 6 },
        elbow_L: { flex: 90 },
        forearm_L: { sup: -80 },
        shoulder_R: { abd: 4 },
        elbow_R: { flex: 5 },
        forearm_R: { sup: -80 },
        ankle: { dorsi: 0 },
        hip_R: { abd: -2 },
        hip_L: { abd: 2 },
      },
    },
    camera: 'front',
    ja: 'サイドプランク（左前腕で支える）',
  },
  STAND_STEP: {
    pose: { root: { pos: [0, 1.07, 0] }, joints: { ...relaxedArms } },
    ground: 0.15,
    anchor: { point: 'toes:toes_mid', axes: 'xyz' },
    // step edge 0.5 cm behind the MTP axis: the ball of the foot rests on the edge and the foot behind it hangs free, so
    // a heel drop (dorsiflexion about the toes) no longer sinks the forefoot into the step (qa3-fix-clips: the edge was
    // 3.5 cm behind the MTP — the calf-stretch demo's foot went 8 mm into it); front face unchanged
    props: [{ kind: 'step', at: [0, 0.15, 0.27], size: [0.75, 0.15, 0.29] }],
    camera: 'right',
    ja: '段差の縁に前足部で立つ（かかとは段差の外）',
  },
  BIKE: {
    pose: {
      root: { pos: [0, 0.98, 0], rot: [30, 0, 0] },
      joints: {
        lumbar: { flex: 16 },
        thorax: { flex: 14 },
        neck: { flex: -30 },
        head: { flex: -18 },
        scapula: { protr: 10 },
        shoulder: { flex: 72, abd: 8, rot: -10 },
        elbow: { flex: 18 },
        forearm: { sup: -85 },
        wrist: { flex: -10 },
        hip_R: { flex: 72, abd: 2 },
        knee_R: { flex: 105 },
        ankle_R: { dorsi: -8 },
        hip_L: { flex: 38, abd: 2 },
        knee_L: { flex: 50 },
        ankle_L: { dorsi: -22 },
      },
    },
    ground: false,
    props: [{ kind: 'bike' }],
    camera: 'right',
    ja: 'ロードバイク乗車姿勢（ブラケットを握る）',
  },
  SWIM: {
    pose: {
      root: { pos: [0, 0.3, 0], rot: [90, 0, -12] },
      joints: {
        shoulder_R: { flex: 172, abd: 4 },
        elbow_R: { flex: 5 },
        forearm_R: { sup: -150 },
        shoulder_L: { flex: -15, abd: 8 },
        elbow_L: { flex: 10 },
        forearm_L: { sup: -120 },
        neck: { flex: 12, rot: 0 },
        ankle: { dorsi: -50 },
        hip_R: { flex: 6 },
        hip_L: { flex: -6 },
      },
    },
    ground: 0.04,
    camera: 'iso',
    ja: 'スイム（うつ伏せ水平・右腕を前に伸ばす）',
  },
};

/** Pose vector of a base pose (unclamped, root as written). */
export function basePoseVec(name: BasePoseName, out = newPoseVec()): PoseVec {
  out.fill(0);
  applyPose(out, BASE_POSES[name]?.pose ?? BASE_POSES.STAND.pose);
  return out;
}

/** Reference pose vector (all DOFs 0 = anatomical position), used for L0. */
export function referencePoseVec(): PoseVec {
  return basePoseVec('ANATOMICAL');
}
