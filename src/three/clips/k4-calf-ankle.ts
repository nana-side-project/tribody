// k4 — calf + ankle exercise clips. Owner after the engine agent: clip agent k4. See docs/ENGINE.md.
import type { ExerciseId } from '../../data/registry';
import type { Pose, Vec3 } from '../rig';
import type { Clip, ClipKey, Prop } from './types';

// ───────────────────────────────────────────── shared pieces (k4a: calf clips)

/**
 * Hands on a wall in front (palms toward the wall, fingers up). Arm + wrist angles were solved per key so the
 * fingers lie flat on the wall (finger capsule touching along its length), the palm skin is 3–7 mm off it, the
 * forearm stays ≥ 1.2 cm in front of it and the wrist stays within −82.5° (no clamping). The thumb lies in the palm
 * plane (eng-motion), so a flat hand no longer pushes the thumb tip into the wall.
 */
const HANDS_ON_WALL = (flex: number, abd: number, elbow: number, wrist: number) => ({
  shoulder: { flex, abd },
  elbow: { flex: elbow },
  forearm: { sup: -165 },
  wrist: { flex: wrist },
});
/** Standing upright, palms on the wall at z 0.58 (start of the straight-knee raise and the isometric hold). */
const WALL_STAND = { joints: HANDS_ON_WALL(69.7, -5.3, 20.3, -82.5) };

/** Top of a calf raise with the toes kept flat: foot 34° heel-up, body ~1° forward over the forefoot. */
const RAISE_TOP = {
  root: { rot: [1, 0, 0] as [number, number, number] },
  joints: { ankle: { dorsi: -33 }, toes: { ext: 34 }, ...HANDS_ON_WALL(49.9, -7.1, 57.7, -67.8) },
};

/** Bent-knee raise (clip.pose: trunk 18° forward, knees 35°): feet flat / heel up, palms on a wall at z 0.72. */
const BENT_BOTTOM = { joints: { hip: { flex: 40.4 }, ankle: { dorsi: 12.6 }, ...HANDS_ON_WALL(79.2, -5.6, 27.2, -82.5) } };
const BENT_TOP = { joints: { hip: { flex: 39.2 }, ankle: { dorsi: -15.8 }, toes: { ext: 30 }, ...HANDS_ON_WALL(63.6, -6.3, 46.7, -81.7) } };

/** Isometric hold: heel ~4 cm up (foot 15° heel-up), palms still on the wall at z 0.58. */
const ISO_HOLD = {
  root: { rot: [0.5, 0, 0] as [number, number, number] },
  joints: { ankle: { dorsi: -14.5 }, toes: { ext: 15 }, ...HANDS_ON_WALL(60.1, -5.8, 35.9, -78.6) },
};

/**
 * Wall calf stretch (right leg back). The trunk and the straight back leg form one line tilted `lean`° forward
 * (root pitch = lean, hip_R 0 → no arching, hips not left behind); the back foot stays flat, so the back ankle
 * dorsiflexes by the same angle. The front (left) leg angles were solved so its foot stays flat and planted
 * ahead (heel to heel: 0.46 m gastrocnemius, 0.30 m soleus), and the arms so the palms stay on the wall.
 */
const WALL_LEAN = (lean: number, front: [number, number, number], arm: [number, number, number, number], backKnee = 0, backHip = 0) => ({
  root: { rot: [lean, 0, 0] as [number, number, number] },
  joints: {
    hip_R: { flex: backHip },
    knee_R: { flex: backKnee },
    ankle_R: { dorsi: lean - backHip + backKnee },
    hip_L: { flex: front[0] },
    knee_L: { flex: front[1] },
    ankle_L: { dorsi: front[2] },
    neck: { flex: -0.6 * lean },
    ...HANDS_ON_WALL(arm[0], arm[1], arm[2], arm[3]),
  },
});
// gastrocnemius: back knee straight; start 16° (weight between the feet) → stretch 22° (front knee 39°)
// (arms of START / HOLD solved together so the hands stay on the wall along the whole eased lean, ≤ 6 mm in)
const GASTROC_START = WALL_LEAN(16, [36.6, 9.8, -10.9], [78.1, -7.8, 45.3, -63.9]);
const GASTROC_HOLD = WALL_LEAN(22, [51.7, 39.2, 9.5], [71.9, -13, 87.6, -43.9]);
// pass keys at 25 / 50 / 75 % of the lean (eng-motion): lean as the blend, front leg and arms re-solved so both feet
// stay flat on their spots and the palms on the wall (the plain blend lifted the back heel ~7 mm mid-lean)
const GASTROC_25 = WALL_LEAN(17.5, [42.33, 21.1, -3.82], [75, -8.88, 58.33, -57.83]);
const GASTROC_50 = WALL_LEAN(19, [46.06, 28.36, 1.2], [73.08, -10.07, 69.26, -52.77]);
const GASTROC_75 = WALL_LEAN(20.5, [49.08, 34.19, 5.51], [72.07, -11.43, 78.88, -48.22]);
// soleus: shorter stance (0.30 m heel to heel), trunk ~upright. Knees straight → both knees bent (back knee 18°,
// back ankle 20°) → back knee pushed forward over the toes, hips lower (back knee 36°, back ankle 31°, front knee 40°)
const SOLEUS_START = WALL_LEAN(10, [21.8, 2.5, -9.3], [58, -6.8, 52.7, -73.5]);
const SOLEUS_BEND = WALL_LEAN(9, [29.3, 20.8, 0.5], [57.5, -7, 54.5, -71.2], 18, 7);
const SOLEUS_HOLD = WALL_LEAN(9, [37.9, 40.3, 11.4], [56.8, -7.9, 65.1, -62], 36, 14);

/**
 * Pogo hops (ground: false — the root is placed explicitly so the body can leave the floor).
 * Stance poses were solved numerically: the whole body is pitched `p`° forward so the centre of mass is over the
 * ball of the foot, the toes stay flat on the floor, and root y / z put the forefoot on the floor at the same spot
 * (1st metatarsal head at z 0.13) in every contact pose. Knees stay ≤ 15°, the heel never comes below ~3.4 cm.
 */
interface PogoPose {
  p: number;
  h: number;
  k: number;
  ankle: number;
  toes: number;
  y: number;
  z: number;
}
const POGO: Record<'STAND' | 'PRE' | 'TD' | 'MS' | 'PUSH' | 'TO' | 'FLY', PogoPose> = {
  STAND: { p: 1.5, h: 3, k: 6, ankle: 4.5, toes: 0, y: 0.9182, z: 0.0109 }, // feet flat, knees soft
  PRE: { p: 4.35, h: 5, k: 10.5, ankle: 4.85, toes: 5, y: 0.9246, z: 0.0618 }, // STAND → MS halfway, contact re-solved
  TD: { p: 5.8, h: 3, k: 7, ankle: -10.2, toes: 20, y: 0.955, z: 0.1124 }, // touchdown on the forefoot (foot 20°)
  MS: { p: 7.2, h: 7, k: 15, ankle: 5.2, toes: 10, y: 0.9268, z: 0.1127 }, // deepest point (foot 10°, heel 3.4 cm up)
  PUSH: { p: 6.35, h: 4.5, k: 9.5, ankle: -8.65, toes: 20, y: 0.9531, z: 0.1161 }, // MS→TO halfway, contact re-solved
  TO: { p: 5.5, h: 2, k: 4, ankle: -22.5, toes: 30, y: 0.974, z: 0.1227 }, // take-off (foot 30°)
  FLY: { p: 6, h: 3, k: 5, ankle: -17, toes: 5, y: 0, z: 0 }, // mid-air (y / z come from the flight path)
};
const pogoPose = (a: PogoPose): Pose => ({
  root: { pos: [0, a.y, a.z], rot: [a.p, 0, 0] },
  joints: {
    hip: { flex: a.h },
    knee: { flex: a.k },
    ankle: { dorsi: a.ankle },
    toes: { ext: a.toes },
    shoulder: { abd: 8, flex: 5 },
    elbow: { flex: 25 },
    forearm: { sup: -40 },
  },
});
const mixPogo = (a: PogoPose, b: PogoPose, u: number): PogoPose => ({
  p: a.p + (b.p - a.p) * u,
  h: a.h + (b.h - a.h) * u,
  k: a.k + (b.k - a.k) * u,
  ankle: a.ankle + (b.ankle - a.ankle) * u,
  toes: a.toes + (b.toes - a.toes) * u,
  y: a.y + (b.y - a.y) * u,
  z: a.z + (b.z - a.z) * u,
});
/**
 * Stand 0.4 s → onto the forefoot → 8 hops (contact 0.17 s, flight 0.25 s, ~6 cm clearance) → land, stand.
 * qa3-fix-clips: the three airborne keys of every flight and the push-off key are `pass` keys, so a hop is one
 * ballistic arc (it used to stop three times in the air, 40–60 ms apart); the velocity stops left are take-off and
 * touchdown (the joints reverse there) and the deepest point of each contact.
 */
function pogoKeys(): { keys: ClipKey[]; duration: number } {
  const FLIGHT = 0.25;
  const RISE = (9.81 * FLIGHT * FLIGHT) / 8; // apex rise of a 0.25 s ballistic flight (≈ 7.7 cm → ~6 cm clearance)
  const HOPS = 8;
  const raw: { s: number; a: PogoPose; label?: string; pass?: boolean }[] = [];
  let s = 0;
  raw.push({ s, a: POGO.STAND, label: '足を腰幅に、膝を軽くゆるめて立つ' }, { s: (s += 0.4), a: POGO.STAND });
  raw.push({ s: (s += 0.125), a: POGO.PRE, pass: true }, { s: (s += 0.125), a: POGO.MS, label: '足首のバネで小さく連続ジャンプ' });
  raw.push({ s: (s += 0.0425), a: POGO.PUSH, pass: true }, { s: (s += 0.0425), a: POGO.TO });
  for (let i = 0; i < HOPS; i++) {
    const t0 = s;
    for (const f of [0.25, 0.5, 0.75]) {
      const pose = f <= 0.5 ? mixPogo(POGO.TO, POGO.FLY, f * 2) : mixPogo(POGO.FLY, POGO.TD, (f - 0.5) * 2);
      const base = mixPogo(POGO.TO, POGO.TD, f);
      raw.push({ s: t0 + f * FLIGHT, a: { ...pose, y: base.y + 4 * RISE * f * (1 - f), z: base.z }, pass: true });
    }
    s = t0 + FLIGHT;
    raw.push(i === 3 ? { s, a: POGO.TD, label: '母趾球で着地し、すぐ跳び返る' } : { s, a: POGO.TD });
    raw.push({ s: (s += 0.085), a: POGO.MS });
    if (i < HOPS - 1) raw.push({ s: (s += 0.0425), a: POGO.PUSH, pass: true }, { s: (s += 0.0425), a: POGO.TO });
  }
  raw.push({ s: (s += 0.125), a: POGO.PRE, pass: true }, { s: (s += 0.125), a: POGO.STAND, label: '着地して休む' });
  const duration = s + 0.45;
  return {
    duration,
    keys: raw.map((r) => ({ t: r.s / duration, pose: pogoPose(r.a), ...(r.label ? { label: r.label } : {}), ...(r.pass ? { pass: true } : {}) })),
  };
}
const POGO_CLIP = pogoKeys();

// ───────────────────────────────────────────── shared pieces (k4b: ankle clips)
// All contact geometry below was solved numerically (FK + placement of the engine, skin primitives) and checked over
// the whole clip: supporting feet / hands / knees within a few mm of the floor, step, wall or prop, nothing inside.

/**
 * Eccentric heel drop (Alfredson) on STAND_STEP, palms flat on a wall at the step's front face (z 0.415, palms at
 * x ±0.215, y 1.45). `rot` = whole-body lean (root pitch); `R` = right leg [hip flex, knee flex, ankle dorsi, toes ext],
 * derived from world angles (thigh / shank / foot) so the right toes always lie flat on the step (toes ext = −foot
 * angle); the MTP line sits ~2 cm in front of the step edge so the heel can drop freely (~6 cm below the step top).
 * `shift` = weight moved over the right foot (right hip adduction with equal eversion so the sole stays flat, pelvis
 * level). Left leg: on the step (same as the right) or `L: [hip, knee, ankle, toes]` (lifted behind, heel toward the
 * buttock). UP / OVER = the left foot lifted straight up off the step / hovering above its landing spot, so it never
 * scrapes the step edge (A_OVER already bends the right knee for the B rep, B_OVER already straightens it).
 * `arms` = [shoulder flex, shoulder abd, elbow, wrist] per side (R, L), solved for every key so both palms stay on the
 * same spot of the wall; `pass` keys (A_RISE, A_DOWN*, B_RISE, B_DOWN*) keep them there mid-movement (≤ 2.5 mm).
 */
interface HeelDropKey {
  rot: number;
  R: [number, number, number, number];
  shift?: number;
  L?: [number, number, number, number];
  arms: [number, number, number, number][];
}
const HD: Record<string, HeelDropKey> = {
  // straight knee: both heels below the step (t = 0; ground 0.09 puts the toes on the step top at y 0.15) → top
  A_LOW: { rot: 4, R: [4, 4, 24, -20], arms: [[37.1, -10.9, 95.5, -46.9], [37.1, -10.9, 95.5, -46.9]] },
  A_TOP: { rot: 2, R: [2, 2, -31, 33], arms: [[19, -10.1, 91.3, -65], [19, -10.1, 91.3, -65]] },
  A_UP: { rot: 2, R: [2, 2, -31, 33], shift: 4, L: [19.8, 38.3, -12.4, 20], arms: [[19.6, -24.3, 91.4, -66.8], [18.8, 4.3, 88, -67]] },
  A_TOP1: { rot: 2, R: [2, 2, -31, 33], shift: 6, L: [0, 100, -15, 0], arms: [[19.6, -30.8, 90, -69.5], [18.9, 11.2, 85, -69.7]] },
  A_BOT1: { rot: 4, R: [4, 4, 24, -20], shift: 6, L: [0, 100, -15, 0], arms: [[37.7, -29.2, 94, -53.9], [36.6, 7.8, 91.5, -47.4]] },
  A_OVER: { rot: 7, R: [19, 25, 30, -17], shift: 4, L: [7.8, 1.9, 33, 0], arms: [[42, -24, 96.4, -48.7], [41.1, 1.7, 94.8, -43.7]] },
  // knees bent 25° (soleus)
  B_LOW: { rot: 7, R: [19, 25, 30, -17], arms: [[41.5, -11.2, 96.8, -44.6], [41.5, -11.2, 96.8, -44.6]] },
  B_TOP: { rot: 5, R: [17, 25, -17, 30], arms: [[22.9, -11.3, 97, -58.9], [22.9, -11.3, 97, -58.9]] },
  B_UP: { rot: 5, R: [17, 25, -17, 30], shift: 4, L: [27.1, 45.5, -6.5, 20], arms: [[23.3, -26.5, 97.1, -61.3], [22.3, 4.2, 93.9, -60.7]] },
  B_TOP1: { rot: 5, R: [17, 25, -17, 30], shift: 6, L: [15, 105, -15, 0], arms: [[23.1, -33.6, 95.8, -64.3], [22, 11.6, 91, -63.5]] },
  B_BOT1: { rot: 7, R: [19, 25, 30, -17], shift: 6, L: [15, 105, -15, 0], arms: [[42.1, -30.1, 95.3, -52.1], [40.8, 8, 92.9, -44.8]] },
  B_OVER: { rot: 4, R: [4, 4, 24, -20], shift: 4, L: [5.7, 7.3, 33, 0], arms: [[37.6, -23.4, 95.2, -50.7], [36.8, 1.7, 93.5, -46.2]] },
  // `pass` keys (eng-motion): body and legs as the straight blend of their neighbours, arms re-solved so both palms
  // stay exactly on their spot of the wall (the plain blend let them come ~1 cm off it mid-rise / mid-lowering)
  A_RISE: { rot: 3, R: [3, 3, -3.5, 6.5], arms: [[28.9, -9.8, 90.2, -58], [28.9, -9.8, 90.2, -58]] },
  A_DOWN25: { rot: 2.5, R: [2.5, 2.5, -17.25, 19.75], shift: 6, L: [0, 100, -15, 0], arms: [[24.6, -29.2, 88.6, -67.2], [24.1, 10.1, 84.3, -65.6]] },
  A_DOWN50: { rot: 3, R: [3, 3, -3.5, 6.5], shift: 6, L: [0, 100, -15, 0], arms: [[29.3, -28.5, 88.8, -63.7], [28.8, 9.2, 85.2, -60.3]] },
  A_DOWN75: { rot: 3.5, R: [3.5, 3.5, 10.25, -6.75], shift: 6, L: [0, 100, -15, 0], arms: [[33.6, -28.5, 90.7, -59.2], [32.9, 8.4, 87.6, -54.3]] },
  B_RISE: { rot: 6, R: [18, 25, 6.5, 6.5], arms: [[32.8, -10.7, 94.5, -53.3], [32.8, -10.7, 94.5, -53.3]] },
  B_DOWN25: { rot: 5.5, R: [17.5, 25, -5.25, 18.25], shift: 6, L: [15, 105, -15, 0], arms: [[28.2, -31.8, 93.9, -62.5], [27.4, 10.5, 89.8, -59.7]] },
  B_DOWN50: { rot: 6, R: [18, 25, 6.5, 6.5], shift: 6, L: [15, 105, -15, 0], arms: [[33.1, -30.6, 93.2, -59.8], [32.2, 9.5, 89.7, -55.4]] },
  B_DOWN75: { rot: 6.5, R: [18.5, 25, 18.25, -5.25], shift: 6, L: [15, 105, -15, 0], arms: [[37.7, -30.1, 93.7, -56.3], [36.7, 8.7, 90.8, -50.4]] },
};
function heelDrop(k: keyof typeof HD): Pose {
  const d = HD[k];
  const s = d.shift ?? 0;
  const L = d.L ?? d.R;
  const [ar, al] = d.arms;
  return {
    root: { pos: [0, 1.07, 0], rot: [d.rot, 0, 0] },
    joints: {
      hip_R: { flex: d.R[0], abd: -s },
      knee_R: { flex: d.R[1] },
      ankle_R: { dorsi: d.R[2], inv: -s },
      toes_R: { ext: d.R[3] },
      hip_L: { flex: L[0], abd: d.L ? 2 : 0 },
      knee_L: { flex: L[1] },
      ankle_L: { dorsi: L[2] },
      toes_L: { ext: L[3] },
      shoulder_R: { flex: ar[0], abd: ar[1] },
      elbow_R: { flex: ar[2] },
      wrist_R: { flex: ar[3] },
      shoulder_L: { flex: al[0], abd: al[1] },
      elbow_L: { flex: al[2] },
      wrist_L: { flex: al[3] },
      forearm: { sup: -165 },
    },
  };
}

/**
 * Single-leg balance on the right foot (anchor: right heel, xz, + ground). Soft knee 12° (hip 8°, ankle 6°, trunk 2°
 * forward), pelvis level and moved ~9 cm over the right foot (right hip adduction 7° with equal eversion so the sole
 * stays flat) → centre of mass over the right foot (solved numerically). The weight is shifted first with both feet
 * down (both legs tilt as a parallelogram), then the left foot is lifted ~9 cm (hip 25°, knee 80°), 9 cm clear of the
 * right leg. The hold shows small balance corrections: the whole body sways ±1–1.5° over the ankle (root roll / pitch,
 * cancelled at the right ankle so the sole stays flat) — the "細かく揺れて立て直す" of the cues.
 */
const SLB_ARMS = { shoulder: { abd: 8 }, elbow: { flex: 15 }, forearm: { sup: -30 } };
/** left leg: 'down' (on the floor), 'hover' (foot flat 2.5 cm above its spot — lift-off / landing), 'lift' */
function slb(left: 'down' | 'hover' | 'lift', shift: number, roll = 0, pitch = 0): Pose {
  const soft = shift > 0;
  const L =
    left === 'lift'
      ? { hip_L: { flex: 25, abd: 4 }, knee_L: { flex: 80 }, ankle_L: { dorsi: 5, inv: 0 } }
      : left === 'hover'
        ? { hip_L: { flex: 16.8, abd: 7.7 }, knee_L: { flex: 29.9 }, ankle_L: { dorsi: 15, inv: 7.7 } }
        : { hip_L: { flex: soft ? 8 : 0, abd: shift }, knee_L: { flex: soft ? 12 : 0 }, ankle_L: { dorsi: soft ? 6 : 0, inv: shift } };
  return {
    root: { rot: [(soft ? 2 : 0) + pitch, 0, roll] },
    joints: {
      ...SLB_ARMS,
      hip_R: { flex: soft ? 8 : 0, abd: -shift },
      knee_R: { flex: soft ? 12 : 0 },
      ankle_R: { dorsi: (soft ? 6 : 0) + pitch, inv: -shift - roll },
      ...L,
    },
  };
}

/**
 * Knee-to-wall (right foot forward), solved numerically: right toes 6 cm from the wall (z 0.342), right heel pinned
 * (anchor xz) and flat. Left foot ~35 cm behind on the ball of the foot (its MTP line stays on the same spot; the heel
 * is 20° up and rises to 35° as the hips come forward). End: right shin 30° forward (ankle dorsiflexion 29.8°) so the
 * front of the knee just touches the wall, knee straight over the 2nd–3rd toes (no hip rotation / adduction), trunk
 * upright, pelvis 10 cm forward / 9 cm down (chest ~9 cm from the wall). Palms on the wall at chest height, slightly
 * wider than the shoulders; the elbows bend down-and-out as the body comes closer.
 */
const KTW_START: Pose = {
  root: { rot: [3, 0, 0] },
  joints: {
    hip_R: { flex: 12.2 }, knee_R: { flex: 8 }, ankle_R: { dorsi: -1.2 },
    hip_L: { flex: -14 }, knee_L: { flex: 4 }, ankle_L: { dorsi: 1 }, toes_L: { ext: 20 },
    shoulder: { flex: 26.3, abd: 12.4 }, elbow: { flex: 106 }, forearm: { sup: -165 }, wrist: { flex: -42.4 },
  },
};
const KTW_TOUCH: Pose = {
  root: { rot: [4, 0, 0] },
  joints: {
    hip_R: { flex: 28.8 }, knee_R: { flex: 54.6 }, ankle_R: { dorsi: 29.8 },
    hip_L: { flex: 1.3 }, knee_L: { flex: 49.4 }, ankle_L: { dorsi: 17.1 }, toes_L: { ext: 35 },
    shoulder: { flex: 21.4, abd: 37.2 }, elbow: { flex: 131.3 }, forearm: { sup: -165 }, wrist: { flex: -24.9 },
  },
};

/**
 * Long sitting for the band exercises (solved numerically): pelvis 22° back, hips ~65°, legs straight, neutral spine,
 * leaning back on the hands (33 cm behind the hips, fingers pointing back, elbows 15°). Buttocks, both heels and both
 * hands touch the floor. `extra` = per-exercise changes (ankle angle, the left leg).
 */
const bandSit = (hip: number, ankle: number, extra: Pose['joints'] = {}): Pose => ({
  root: { rot: [-22, 0, 0] },
  joints: {
    hip: { flex: hip },
    knee: { flex: 0 },
    ankle: { dorsi: ankle },
    lumbar: { flex: 5 },
    thorax: { flex: 3 },
    neck: { flex: 4 },
    shoulder: { flex: -34.5, abd: 0.3 },
    elbow: { flex: 15 },
    forearm: { sup: 0 },
    wrist: { flex: -85 },
    ...extra,
  },
});
/**
 * Elastic band hooked around the right forefoot (metatarsal level, ~4 mm outside the skin): short band segments on
 * the foot wrap the `around` side, and the two strands leave from the opposite side to a furniture leg at `anchor`.
 */
function forefootBand(around: 'lateral' | 'medial', anchor: Vec3): Prop[] {
  const at = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    const rest: Vec3 = [+(0.093 + 0.041 * Math.cos(a)).toFixed(4), +(0.04 + 0.036 * Math.sin(a)).toFixed(4), 0.1];
    return { bone: 'foot' as const, rest };
  };
  // angles in the forefoot cross-section: 0 = lateral, 90 = dorsal, 180 = medial, 270 = plantar
  const loop = around === 'lateral' ? [135, 90, 45, 0, -45, -90, -135] : [45, 90, 135, 180, 225, 270, 315];
  const out: Prop[] = [];
  for (let i = 0; i < loop.length - 1; i++) out.push({ kind: 'band', from: at(loop[i]), to: at(loop[i + 1]), width: 0.02 });
  out.push({ kind: 'band', from: at(loop[0]), to: anchor, width: 0.02 }, { kind: 'band', from: at(loop[loop.length - 1]), to: anchor, width: 0.02 });
  // the furniture leg the band is tied to (its inner face at the anchor)
  const side = anchor[0] > 0 ? 1 : -1;
  out.push({ kind: 'box', at: [anchor[0] + side * 0.0225, 0.45, anchor[2]], size: [0.045, 0.45, 0.045] });
  return out;
}

export const clips: Partial<Record<ExerciseId, Clip>> = {
  // SAMPLE (refined) — straight-knee calf raise on the floor, hands lightly on a wall in front.
  // The toes are pinned (anchor) so the heel rises (~9 cm) and the body rises straight up over the forefoot.
  // Tempo from the dose: 2 s up, 1 s hold, 3 s down. Arm angles solved so the hands stay flat on the wall
  // (they slide up a few cm as the body rises).
  'ex-calf-raise-straight': {
    id: 'ex-calf-raise-straight',
    duration: 6.6,
    base: 'STAND',
    keys: [
      { t: 0, pose: WALL_STAND, label: '膝を伸ばしたまま、かかとを上げる（2秒）' },
      { t: 0.303, pose: RAISE_TOP, label: '一番上で1秒キープ' },
      { t: 0.455, pose: RAISE_TOP, label: 'ゆっくり下ろす（3秒）' },
      { t: 0.909, pose: WALL_STAND },
    ],
    loop: 'loop',
    anchor: { point: 'toes:toes_mid', axes: 'xyz' },
    ground: true,
    props: [{ kind: 'wall', at: [0, 0, 0.58], normal: [0, 0, -1] }],
    camera: 'isoBack',
    focus: 'calf',
    sides: 'both',
    highlights: {
      gastrocnemius: 'primary',
      soleus: 'primary',
      'fibularis-longus': 'secondary',
      'tibialis-posterior': 'secondary',
      'flexor-hallucis-longus': 'secondary',
    },
  },
  // Bent-knee calf raise (soleus): light squat (knees 35°, trunk 18° forward, neutral spine), hands on a wall.
  // The knee angle stays 35° all the way up. Solved numerically: feet flat at the bottom (ankle +12.6°),
  // heel ~8 cm up at the top (ankle −15.8°), the centre of mass over the foot / forefoot, palms on the wall (z 0.72).
  'ex-calf-raise-bent': {
    id: 'ex-calf-raise-bent',
    duration: 6.6,
    base: 'STAND',
    pose: { root: { rot: [18, 0, 0] }, joints: { knee: { flex: 35 }, neck: { flex: -12 } } },
    keys: [
      { t: 0, pose: BENT_BOTTOM, label: '膝の角度を保ってかかとを上げる（2秒）' },
      { t: 0.303, pose: BENT_TOP, label: '一番上で1秒キープ' },
      { t: 0.455, pose: BENT_TOP, label: 'ゆっくり下ろす（3秒）' },
      { t: 0.909, pose: BENT_BOTTOM },
    ],
    loop: 'loop',
    anchor: { point: 'toes:toes_mid', axes: 'xyz' },
    ground: true,
    props: [{ kind: 'wall', at: [0, 0, 0.72], normal: [0, 0, -1] }],
    camera: { dir: [-0.9, 0.3, -0.55] },
    focus: 'calf',
    frame: ['femur:linea_aspera_prox', 'toes:toe_tips'],
    sides: 'both',
    highlights: {
      soleus: 'primary',
      gastrocnemius: 'secondary',
      'tibialis-posterior': 'secondary',
      'flexor-hallucis-longus': 'secondary',
      'fibularis-longus': 'secondary',
    },
  },
  // Isometric calf hold: both heels ~4 cm off the floor (foot 15° heel-up, a low painless height), held.
  // Same wall set-up as the straight-knee raise; the 30–45 s hold is shown as a ~4.5 s 「30秒キープ」 phase.
  'ex-isometric-calf-hold': {
    id: 'ex-isometric-calf-hold',
    duration: 8,
    base: 'STAND',
    keys: [
      { t: 0, pose: WALL_STAND, label: 'かかとを3〜5cmだけ上げる' },
      { t: 0.15, pose: ISO_HOLD, label: '30秒キープ（呼吸は止めない）' },
      { t: 0.72, pose: ISO_HOLD, label: 'ゆっくり下ろして休む' },
      { t: 0.9, pose: WALL_STAND },
    ],
    loop: 'loop',
    anchor: { point: 'toes:toes_mid', axes: 'xyz' },
    ground: true,
    props: [{ kind: 'wall', at: [0, 0, 0.58], normal: [0, 0, -1] }],
    // more from the side than isoBack so the small heel height reads clearly
    camera: { dir: [-0.95, 0.28, -0.5] },
    focus: 'calf',
    sides: 'both',
    highlights: {
      gastrocnemius: 'primary',
      soleus: 'primary',
      'tibialis-posterior': 'secondary',
      'fibularis-longus': 'secondary',
    },
  },
  // Gastrocnemius wall stretch: both hands on the wall, right leg back with the knee straight, toes forward.
  // The front knee bends and the body moves forward in one line; the back heel stays on the floor.
  // Back heel pinned (xz) + grounded; `pass` keys keep both feet flat and the palms on the wall during the lean.
  'ex-gastroc-stretch': {
    id: 'ex-gastroc-stretch',
    duration: 9,
    base: 'STAND',
    keys: [
      { t: 0, pose: GASTROC_START, label: '後ろの膝を伸ばし、かかとを床につける' },
      { t: 0.06, pose: GASTROC_START, label: '前の膝を曲げ、体重をゆっくり前へ' },
      { t: 0.115, pose: GASTROC_25, pass: true },
      { t: 0.17, pose: GASTROC_50, pass: true },
      { t: 0.225, pose: GASTROC_75, pass: true },
      { t: 0.28, pose: GASTROC_HOLD, label: 'ふくらはぎの上が伸びたら30秒キープ' },
      { t: 0.78, pose: GASTROC_HOLD, label: 'ゆっくり戻す' },
      { t: 0.825, pose: GASTROC_75, pass: true },
      { t: 0.87, pose: GASTROC_50, pass: true },
      { t: 0.915, pose: GASTROC_25, pass: true },
      { t: 0.96, pose: GASTROC_START },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    props: [{ kind: 'wall', at: [0, 0, 0.694], normal: [0, 0, -1] }],
    camera: { dir: [-1, 0.22, -0.45] },
    frame: ['thorax:spinous_T6', 'foot:calcaneus_post', 'toes_L:toe_tips', 'femur_L:lateral_epicondyle'],
    sides: 'R',
    highlights: { gastrocnemius: 'primary', soleus: 'secondary' },
  },
  // Soleus wall stretch: hands on the wall, right leg a little back (shorter stance than the gastrocnemius
  // stretch). Bend both knees with the back heel down, then push the back knee forward (over the toes, in line
  // with the foot) and lower the hips. Back heel pinned (xz) + grounded; both feet stay flat at every frame.
  'ex-soleus-stretch': {
    id: 'ex-soleus-stretch',
    duration: 9,
    base: 'STAND',
    keys: [
      { t: 0, pose: SOLEUS_START, label: 'かかとを床につけたまま両膝を曲げる' },
      { t: 0.04, pose: SOLEUS_START },
      { t: 0.16, pose: SOLEUS_BEND, label: '後ろの膝を前へ押し出し、腰を落とす' },
      { t: 0.19, pose: SOLEUS_BEND },
      { t: 0.33, pose: SOLEUS_HOLD, label: 'ふくらはぎの下が伸びたら30秒キープ' },
      { t: 0.8, pose: SOLEUS_HOLD, label: 'ゆっくり戻す' },
      { t: 0.97, pose: SOLEUS_START },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    props: [{ kind: 'wall', at: [0, 0, 0.589], normal: [0, 0, -1] }],
    camera: { dir: [-1, 0.16, -0.12] },
    frame: ['lumbar:spinous_L1', 'foot:calcaneus_post', 'toes_L:toe_tips', 'femur_L:lateral_epicondyle'],
    sides: 'R',
    highlights: { soleus: 'primary', 'tibialis-posterior': 'secondary', 'flexor-hallucis-longus': 'secondary' },
  },
  // Tibialis raise: back and buttocks against the wall, legs straight, heels ~30 cm in front of the wall.
  // The trunk stays vertical (pelvis & upper back touch the wall), the hips flex 17.4° so the straight legs angle
  // forward (solved for a 30 cm heel-to-wall gap); the foot is flat at ankle −17.4°. Toes rise 32° (ankle +14.6°)
  // and come down to ~5° without touching. The body is pinned at the ankle (xz) so it stays against the wall.
  'ex-tibialis-raise': {
    id: 'ex-tibialis-raise',
    duration: 4.5,
    base: 'STAND',
    pose: { joints: { hip: { flex: 17.4 }, knee: { flex: 0 } } },
    keys: [
      { t: 0, pose: { joints: { ankle: { dorsi: -12.4 } } }, label: 'かかとをつけたまま、つま先を上げる（1秒）' },
      { t: 0.222, pose: { joints: { ankle: { dorsi: 14.6 } } }, label: '一番上で1秒キープ' },
      { t: 0.444, pose: { joints: { ankle: { dorsi: 14.6 } } }, label: 'ゆっくり下ろす（床につけきらない）' },
      { t: 0.889, pose: { joints: { ankle: { dorsi: -12.4 } } } },
    ],
    loop: 'loop',
    anchor: { point: 'tibia:medial_malleolus', axes: 'xz' },
    ground: true,
    // the wall plane touches the back (lower thoracic skin 0 mm, buttocks 2 mm off — it used to cut 5 / 3 mm into them)
    props: [{ kind: 'wall', at: [0, 0, -0.128], normal: [0, 0, 1] }],
    camera: { dir: [-1, 0.18, 0.16] },
    frame: ['thorax:spinous_T4', 'pelvis:sacrum_post', 'toes:toe_tips', 'foot:calcaneus_post'],
    sides: 'both',
    highlights: { 'tibialis-anterior': 'primary' },
  },
  // Pogo hops: feet hip-width, knees soft; small (~6 cm), quick, stiff-ankle hops on the balls of the feet,
  // real tempo (contact 0.17 s, flight 0.25 s, ~2.4 hops/s), 8 hops then a soft landing. Root placed explicitly (see POGO).
  'ex-pogo-hops': {
    id: 'ex-pogo-hops',
    duration: POGO_CLIP.duration,
    base: 'STAND',
    keys: POGO_CLIP.keys,
    loop: 'loop',
    ground: false,
    anchor: null,
    camera: { dir: [-1, 0.2, -0.32] },
    frame: ['pelvis:sacrum_post', 'pelvis:asis', 'toes:toe_tips', 'foot:calcaneus_post', 'femur_L:lateral_epicondyle'],
    sides: 'both',
    highlights: {
      gastrocnemius: 'primary',
      soleus: 'primary',
      'fibularis-longus': 'secondary',
      'tibialis-posterior': 'secondary',
      'tibialis-anterior': 'secondary',
    },
  },

  // ───────────── K4b: ankle exercises ─────────────
  // Eccentric heel drop (Alfredson), right = painful side: forefeet on the step edge, palms on the wall in front.
  // Up with BOTH legs (~1 s), shift onto the right leg (left foot lifted behind), lower the right heel below the
  // step in ~3 s (2.8 s), put the left foot back down. First rep with the knee straight (gastrocnemius), second with
  // the knees bent 25° (soleus) — as in the text. The right toes are pinned (anchor) and stay flat on the step.
  'ex-eccentric-heel-drop': {
    id: 'ex-eccentric-heel-drop',
    duration: 9,
    base: 'STAND_STEP',
    keys: [
      { t: 0, pose: heelDrop('A_LOW'), label: '膝を伸ばし、両脚でつま先立ち' },
      { t: 0.05, pose: heelDrop('A_RISE'), pass: true },
      { t: 0.1, pose: heelDrop('A_TOP'), label: '痛む側の片脚に乗る' },
      { t: 0.1167, pose: heelDrop('A_UP'), pass: true },
      { t: 0.1444, pose: heelDrop('A_TOP1'), label: '3秒かけて段差より下まで下ろす' },
      { t: 0.2222, pose: heelDrop('A_DOWN25'), pass: true },
      { t: 0.3, pose: heelDrop('A_DOWN50'), pass: true },
      { t: 0.3778, pose: heelDrop('A_DOWN75'), pass: true },
      { t: 0.4556, pose: heelDrop('A_BOT1'), label: '反対の足を下ろす' },
      { t: 0.4833, pose: heelDrop('A_OVER') },
      { t: 0.5, pose: heelDrop('B_LOW'), label: '膝を軽く曲げ、両脚でつま先立ち' },
      { t: 0.55, pose: heelDrop('B_RISE'), pass: true },
      { t: 0.6, pose: heelDrop('B_TOP'), label: '片脚に乗る' },
      { t: 0.6167, pose: heelDrop('B_UP'), pass: true },
      { t: 0.6444, pose: heelDrop('B_TOP1'), label: '膝を曲げたまま3秒かけて下ろす' },
      { t: 0.7222, pose: heelDrop('B_DOWN25'), pass: true },
      { t: 0.8, pose: heelDrop('B_DOWN50'), pass: true },
      { t: 0.8778, pose: heelDrop('B_DOWN75'), pass: true },
      { t: 0.9556, pose: heelDrop('B_BOT1'), label: '反対の足を下ろし、膝を伸ばす' },
      { t: 0.9833, pose: heelDrop('B_OVER') },
    ],
    loop: 'loop',
    anchor: { point: 'toes:toes_mid', axes: 'xyz' },
    ground: 0.09,
    props: [{ kind: 'wall', at: [0, 0, 0.415], normal: [0, 0, -1] }],
    // low back-oblique view: the step's top edge reads as a line, so the heel visibly sinks below it
    camera: { dir: [-1, 0.18, -0.3] },
    // a point ~0.35 m ahead of the (pinned) toes keeps the working calf left of centre, so the labels fall into the
    // empty space behind the figure instead of over the heel and the step edge; a point ~0.2 m under the toes leaves
    // room below the calf so the 5-label stack stays clear of the player bar. (The toes stay level all clip long, so
    // points on the toes bone don't move.)
    frame: [
      'pelvis:iliac_crest_mid',
      'foot_L:calcaneus_post',
      'foot:calcaneus_post',
      'toes:toe_tips',
      { bone: 'toes', rest: [0.09, 0.0, 0.52] },
      { bone: 'toes', rest: [0.09, -0.2, 0.0] },
    ],
    sides: 'R',
    highlights: {
      gastrocnemius: 'primary',
      soleus: 'primary',
      'tibialis-posterior': 'secondary',
      'fibularis-longus': 'secondary',
      'flexor-hallucis-longus': 'secondary',
    },
  },
  // Single-leg balance (right leg), barefoot, a chair back within reach on the right. Shift the weight, lift the
  // left foot, soft knee, pelvis level, eyes forward; hold (the 30 s are shown as ~5 s) with small ankle corrections,
  // then put the foot down. See `slb`.
  'ex-single-leg-balance': {
    id: 'ex-single-leg-balance',
    duration: 8,
    base: 'STAND',
    keys: [
      { t: 0, pose: slb('down', 0), label: '片脚に体重を移し、反対の脚を浮かせる' },
      { t: 0.08, pose: slb('down', 7) },
      { t: 0.11, pose: slb('hover', 7) },
      { t: 0.16, pose: slb('lift', 7), label: '膝を軽く曲げ、骨盤を水平に30秒キープ' },
      { t: 0.28, pose: slb('lift', 7, 1.3, 0.6) },
      { t: 0.41, pose: slb('lift', 7, -1, -0.4) },
      { t: 0.54, pose: slb('lift', 7, 0.9, -0.3) },
      { t: 0.67, pose: slb('lift', 7, -1.2, 0.5) },
      { t: 0.77, pose: slb('lift', 7), label: 'ゆっくり足を下ろす' },
      { t: 0.83, pose: slb('hover', 7) },
      { t: 0.87, pose: slb('down', 7) },
      { t: 0.94, pose: slb('down', 0) },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    // a chair back within reach of the right hand (safety, as in the setup); the back faces the figure
    props: [{ kind: 'chair', at: [-0.72, 0.45, 0], rotY: -90 }],
    // front-right: the level pelvis, the knee over the foot and the lateral (fibular) side of the standing leg.
    // Framed from the pelvis to ~25 cm below the floor (a point under the pinned right foot): the 7 muscle labels all
    // stack beside the shank, and this keeps that stack above the player bar.
    camera: { dir: [-0.6, 0.22, 0.8] },
    frame: [
      'pelvis:iliac_crest_mid',
      'pelvis:iliac_crest_mid_L',
      'toes:toe_tips',
      'foot:calcaneus_post',
      'toes_L:toe_tips',
      'foot_L:calcaneus_post',
      { bone: 'foot', rest: [0.09, -0.25, 0.05] },
    ],
    sides: 'R',
    highlights: {
      'fibularis-longus': 'primary',
      'fibularis-brevis': 'primary',
      'tibialis-posterior': 'primary',
      'gluteus-medius': 'secondary',
      soleus: 'secondary',
      'tibialis-anterior': 'secondary',
      'abductor-hallucis': 'secondary',
    },
  },
  // Knee-to-wall ankle dorsiflexion (right): facing the wall, right foot forward with the toes 6 cm from the wall.
  // Push the knee forward over the 2nd–3rd toes until it touches the wall with the heel down, hold 2 s, come back.
  'ex-knee-to-wall': {
    id: 'ex-knee-to-wall',
    duration: 5,
    base: 'STAND',
    keys: [
      { t: 0, pose: KTW_START, label: 'かかとをつけたまま膝を壁へ押し出す' },
      { t: 0.24, pose: KTW_TOUCH, label: '膝が壁に触れたら2秒キープ' },
      { t: 0.64, pose: KTW_TOUCH, label: 'ゆっくり戻す' },
      { t: 0.88, pose: KTW_START },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    props: [{ kind: 'wall', at: [0, 0, 0.342], normal: [0, 0, -1] }],
    camera: { dir: [-1, 0.22, -0.12] },
    // the last point (on the pinned right foot, ~0.3 m ahead of the toes) keeps the leg left of centre so the labels
    // fall behind the calf, not over the knee-to-wall contact
    frame: ['thorax:xiphoid', 'pelvis:sacrum_post', 'toes:toe_tips', 'foot:calcaneus_post', 'toes_L:toe_tips', 'foot_L:calcaneus_post', 'patella:center', { bone: 'foot', rest: [0.09, 0.02, 0.5] }],
    sides: 'R',
    highlights: { soleus: 'primary', 'flexor-hallucis-longus': 'secondary', 'tibialis-posterior': 'secondary' },
  },
  // Band eversion (right): long sitting, leaning back on the hands; band hooked around the lateral forefoot, tied to a
  // furniture leg on the inner side (left knee bent, foot flat, out of the band's way). Heel on the floor, shin still:
  // only the foot turns the sole outward (little-toe side up) 20°, 1 s hold, 3 s back. Ankle near neutral (−10°) so
  // tibialis anterior does not take over.
  'ex-band-eversion': {
    id: 'ex-band-eversion',
    duration: 5.5,
    base: 'LONG_SIT',
    pose: bandSit(65.3, -10, { hip_L: { flex: 121.3 }, knee_L: { flex: 125 }, ankle_L: { dorsi: -20.3 } }),
    keys: [
      { t: 0, label: 'すねを動かさず、足裏を外へ向ける（1秒）' },
      { t: 0.182, pose: { joints: { ankle_R: { inv: -22 } } }, label: '一番外側で1秒止める' },
      { t: 0.364, pose: { joints: { ankle_R: { inv: -22 } } }, label: '3秒かけてゆっくり戻す' },
      { t: 0.909 },
    ],
    loop: 'loop',
    ground: true,
    props: forefootBand('lateral', [0.22, 0.185, 0.9]),
    // from the front-right, above, close on the shank + foot (ankle focus; without it the frame minimum of 0.4 m left
    // the foot tiny and the 22° turn invisible): the lateral (fibular) side of the leg, the sole turning outward toward
    // the camera, the band to the post
    camera: { dir: [-0.45, 0.8, 0.6] },
    focus: 'ankle',
    frame: ['toes:toe_tips', 'tibia:fibula_lat_mid', { bone: 'tibia', rest: [-0.22, 0.029, 0.21] }],
    sides: 'R',
    highlights: { 'fibularis-longus': 'primary', 'fibularis-brevis': 'primary' },
  },
  // Band inversion (right): same seat (left knee bent, foot flat — as in the eversion clip, so the medial view of the
  // working leg is not blocked by the other leg); band around the medial forefoot, tied to a furniture leg on the outer
  // side. Toes pointed slightly down (ankle −25°) so tibialis posterior, not tibialis anterior, works; from the heel the
  // inner border of the foot lifts and the toes turn in (inversion 25°), 1 s hold, 3 s back. The rig has no forefoot
  // adduction DOF, so the "toes in" part is shown by the inversion only.
  'ex-band-inversion': {
    id: 'ex-band-inversion',
    duration: 5.5,
    base: 'LONG_SIT',
    pose: bandSit(65.6, -25, { hip_L: { flex: 121.3 }, knee_L: { flex: 125 }, ankle_L: { dorsi: -20.3 } }),
    keys: [
      { t: 0, label: 'つま先を少し下に向け、足の内側を上げる（1秒）' },
      { t: 0.182, pose: { joints: { ankle_R: { inv: 25 } } }, label: '一番内側で1秒止める' },
      { t: 0.364, pose: { joints: { ankle_R: { inv: 25 } } }, label: '3秒かけてゆっくり戻す' },
      { t: 0.909 },
    ],
    loop: 'loop',
    ground: true,
    props: forefootBand('medial', [-0.4, 0.167, 0.923]),
    // from the front-left, above, close on the shank + foot (ankle focus): the medial side of the leg (tibialis
    // posterior behind the medial malleolus), the sole turning inward toward the camera, the band to the post outside
    camera: { dir: [0.45, 0.8, 0.6] },
    focus: 'ankle',
    frame: ['toes:toe_tips', 'tibia:medial_border_mid', { bone: 'tibia', rest: [0.4, 0.005, 0.206] }],
    sides: 'R',
    highlights: { 'tibialis-posterior': 'primary', 'tibialis-anterior': 'secondary', 'flexor-hallucis-longus': 'secondary' },
  },
};
