// Camera presets, region focus point sets and box framing.
import { type PerspectiveCamera, Vector3 } from 'three';
import type { RegionId } from '../data/registry';
import { compileRef, evalPoint } from './landmarks';
import type { CameraPresetName, RigState, Side } from './rig';

/** Direction from the target toward the camera. 'iso*' views look at the figure's RIGHT side (−X). */
export const PRESET_DIRS: Record<CameraPresetName, Vector3> = {
  front: new Vector3(0, 0.1, 1).normalize(),
  back: new Vector3(0, 0.12, -1).normalize(),
  left: new Vector3(1, 0.1, 0).normalize(),
  right: new Vector3(-1, 0.1, 0).normalize(),
  top: new Vector3(0, 1, 0.12).normalize(),
  iso: new Vector3(-0.72, 0.36, 0.9).normalize(),
  isoBack: new Vector3(-0.72, 0.34, -0.9).normalize(),
  isoLeft: new Vector3(0.72, 0.36, 0.9).normalize(),
};
export const CAMERA_PRESETS = Object.keys(PRESET_DIRS) as CameraPresetName[];

/** Landmarks (right side by default) that define each region's framing box. */
export const REGION_POINTS: Record<RegionId, string[]> = {
  shoulder: [
    'scapula:acromion',
    'humerus:head',
    'scapula:superior_angle',
    'scapula:inferior_angle',
    'humerus:deltoid_tuberosity',
    'scapula:clavicle_medial',
    'scapula:spine_medial',
    'thorax:rib5_ant',
    'humerus:shaft_post_mid',
  ],
  neck: ['head:occiput', 'head:mastoid', 'head:chin', 'neck:spinous_C7', 'thorax:clavicle_notch', 'scapula:acromion', 'scapula_L:acromion', 'thorax:spinous_T3'],
  lowback: ['thorax:spinous_T10', 'lumbar:spinous_L1', 'lumbar:spinous_L5', 'pelvis:iliac_crest_mid', 'pelvis:iliac_crest_mid_L', 'pelvis:sacrum_post', 'pelvis:psis', 'thorax:rib12_post'],
  hip: [
    'pelvis:iliac_crest_mid',
    'pelvis:iliac_crest_mid_L',
    'pelvis:asis',
    'pelvis:psis',
    'pelvis:coccyx',
    'femur:greater_trochanter',
    'pelvis:ischial_tuberosity',
    'femur:linea_aspera_mid',
    'femur:lateral_epicondyle',
  ],
  knee: ['femur:linea_aspera_dist', 'femur:lateral_epicondyle', 'femur:medial_epicondyle', 'patella:base', 'tibia:tibial_tuberosity', 'tibia:fibular_head', 'tibia:pes_anserinus', 'tibia:medial_border_mid'],
  calf: ['femur:medial_condyle_post', 'femur:lateral_condyle_post', 'tibia:fibular_head', 'tibia:medial_malleolus', 'foot:calcaneus_post', 'tibia:interosseous_mid', 'foot:navicular_tuberosity'],
  ankle: ['tibia:medial_malleolus', 'tibia:lateral_malleolus', 'foot:calcaneus_post', 'foot:navicular_tuberosity', 'tibia:medial_border_dist', 'foot:fifth_met_base', 'foot:calcaneus_plantar'],
  foot: ['foot:calcaneus_post', 'foot:met_head_1', 'foot:met_head_5', 'toes:toe_tips', 'tibia:medial_malleolus', 'tibia:lateral_malleolus', 'foot:calcaneus_plantar'],
};

/** Minimum framing box size per region (metres) so close-ups don't get too tight. */
const REGION_MIN: Record<RegionId, number> = {
  shoulder: 0.36,
  neck: 0.36,
  lowback: 0.46,
  hip: 0.5,
  knee: 0.34,
  calf: 0.5,
  ankle: 0.26,
  foot: 0.3,
};
/** Preferred camera direction per region when nothing else is specified. */
export const REGION_CAMERA: Record<RegionId, CameraPresetName> = {
  shoulder: 'iso',
  neck: 'isoBack',
  lowback: 'isoBack',
  hip: 'iso',
  knee: 'iso',
  calf: 'isoBack',
  ankle: 'iso',
  foot: 'iso',
};

export function regionPoints(region: RegionId, state: RigState, side: Side, out: Vector3[] = []): Vector3[] {
  for (const r of REGION_POINTS[region] ?? []) {
    try {
      out.push(evalPoint(compileRef(r as `${string}:${string}`, side), state, new Vector3()));
    } catch {
      /* ignore */
    }
  }
  return out;
}

export function regionMinSize(region: RegionId) {
  return REGION_MIN[region] ?? 0.4;
}

/**
 * Distance & target so that all points are visible from direction `dir` (unit, target→camera).
 * `minSize` enlarges the box around its centre.
 */
export function framePoints(
  points: Vector3[],
  dir: Vector3,
  camera: PerspectiveCamera,
  aspect: number,
  opts: { margin?: number; minSize?: number; up?: Vector3; insetTop?: number; insetBottom?: number; heightPx?: number } = {},
): { position: Vector3; target: Vector3 } {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const p of points) {
    min.min(p);
    max.max(p);
  }
  if (!points.length) {
    min.set(-0.3, 0, -0.2);
    max.set(0.3, 1.8, 0.2);
  }
  const target = new Vector3().addVectors(min, max).multiplyScalar(0.5);
  const ms = opts.minSize ?? 0;
  for (const k of ['x', 'y', 'z'] as const) {
    const half = (max[k] - min[k]) / 2;
    if (half * 2 < ms) {
      min[k] = target[k] - ms / 2;
      max[k] = target[k] + ms / 2;
    }
  }
  const up = opts.up ?? new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(up, dir).normalize();
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  const camUp = new Vector3().crossVectors(dir, right).normalize();
  const tanV0 = Math.tan(((camera.fov * Math.PI) / 180) / 2);
  const tanH = tanV0 * aspect;
  // overlay insets (phase pill on top, player bar at the bottom) shrink the usable height
  const H = Math.max(1, opts.heightPx ?? 1);
  const iTop = opts.heightPx ? (opts.insetTop ?? 0) : 0;
  const iBot = opts.heightPx ? (opts.insetBottom ?? 0) : 0;
  const free = Math.max(0.4, (H - iTop - iBot) / H);
  const tanV = tanV0 * free;
  const margin = opts.margin ?? 1.12;
  // corners
  let d = 0;
  const c = new Vector3();
  // re-centre in screen space
  let sx0 = Infinity,
    sx1 = -Infinity,
    sy0 = Infinity,
    sy1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    c.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).sub(target);
    const x = c.dot(right);
    const y = c.dot(camUp);
    sx0 = Math.min(sx0, x);
    sx1 = Math.max(sx1, x);
    sy0 = Math.min(sy0, y);
    sy1 = Math.max(sy1, y);
  }
  target.addScaledVector(right, (sx0 + sx1) / 2).addScaledVector(camUp, (sy0 + sy1) / 2);
  for (let i = 0; i < 8; i++) {
    c.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).sub(target);
    const x = Math.abs(c.dot(right)) * margin;
    const y = Math.abs(c.dot(camUp)) * margin;
    const z = c.dot(dir);
    d = Math.max(d, z + x / tanH, z + y / tanV);
  }
  d = Math.max(d, 0.25);
  // shift so the box is centred in the free area
  const shiftPx = (iBot - iTop) / 2;
  target.addScaledVector(camUp, -(shiftPx / (H / 2)) * d * tanV0);
  return { position: target.clone().addScaledVector(dir, d), target };
}
