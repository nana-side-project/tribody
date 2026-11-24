// k3 — knee + foot exercise clips. Owner after the engine agent: clip agent k3. See docs/ENGINE.md.
import type { ExerciseId } from '../../data/registry';
import type { AttachRef } from '../landmarks';
import type { Clip, Prop } from './types';

// ───────────────────────────────────────────── knee strengthening (K3a)
// All joint values below were solved numerically on the engine rig (solveFK + skin primitives): soles flat on the
// floor / step / board (foot up-vector = surface normal), stance width and toe-out identical at every key (the
// feet never slide), knees over the 2nd toes (no valgus), centre of mass over the base of support. Props are placed
// from the solved t = 0 placement (world coordinates are the grounded t = 0 positions).

// Squat: feet ~shoulder width (heel centres 15 cm from the midline), toes out 12°.
const SQUAT_STAND = { hip: { abd: 4.6, rot: 15.3 }, ankle: { dorsi: -1.3, inv: 4.5 } };
// Bottom: thighs parallel to the floor, spine neutral (6° lumbar flexion as in a real squat), trunk ~46°,
// knees over the 2nd toes and just past the toe tips, heels down, centre of mass over the mid-foot.
const SQUAT_BOTTOM = {
  root: { rot: [40.4, 0, 0] as [number, number, number] },
  joints: {
    lumbar: { flex: 6 },
    neck: { flex: -16 },
    head: { flex: -6 },
    hip: { flex: 131, abd: 15.3, rot: -2 },
    knee: { flex: 122 },
    ankle: { dorsi: 31.4, inv: 1.9 },
    shoulder: { flex: 126, abd: -9 },
    elbow: { flex: 4 },
    forearm: { sup: -150 },
  },
};
// Pass-through keys at 25 / 50 / 75 % of the way down (eng-motion): trunk, spine, arms and knees as the straight
// blend; hips and ankles re-solved so both feet stay exactly where they are (the plain blend slid the left foot up
// to 2.6 cm sideways). Used on the way down and up as `pass` keys, so the squat stays one smooth 3 s movement.
const SQUAT_DOWN_25 = {
  root: { rot: [10.1, 0, 0] as [number, number, number] },
  joints: { lumbar: { flex: 1.5 }, neck: { flex: -4 }, head: { flex: -1.5 }, shoulder: { flex: 31.5, abd: 3 }, elbow: { flex: 8.5 }, forearm: { sup: -52.5 }, hip: { flex: 32.44, abd: 8.39, rot: 13.15 }, knee: { flex: 30.5 }, ankle: { dorsi: 6.77, inv: 2.64 } },
};
const SQUAT_DOWN_50 = {
  root: { rot: [20.2, 0, 0] as [number, number, number] },
  joints: { lumbar: { flex: 3 }, neck: { flex: -8 }, head: { flex: -3 }, shoulder: { flex: 63, abd: -1 }, elbow: { flex: 7 }, forearm: { sup: -85 }, hip: { flex: 64.99, abd: 11.77, rot: 9.99 }, knee: { flex: 61 }, ankle: { dorsi: 14.97, inv: 1.24 } },
};
const SQUAT_DOWN_75 = {
  root: { rot: [30.3, 0, 0] as [number, number, number] },
  joints: { lumbar: { flex: 4.5 }, neck: { flex: -12 }, head: { flex: -4.5 }, shoulder: { flex: 94.5, abd: -5 }, elbow: { flex: 5.5 }, forearm: { sup: -117.5 }, hip: { flex: 97.79, abd: 14.42, rot: 5.34 }, knee: { flex: 91.5 }, ankle: { dorsi: 23.25, inv: 0.58 } },
};

// Wall sit: back (thorax + sacrum) on the wall, heels 36 cm in front of it, feet ~shoulder width, toes out 10°.
// Start: leaning on the wall, knees 9°. Hold: knees 80° (the text allows a pain-free 45–90°), thighs ~22° below
// horizontal, shins 12° forward; the back stays on the wall and the feet do not move.
const WALL_START = { hip: { flex: 26.1, abd: 4.9, rot: 12.5 }, knee: { flex: 9 }, ankle: { dorsi: -17.6, inv: -1.2 } };
const WALL_HOLD = { joints: { hip: { flex: 67.8, abd: 11.8, rot: 6.6 }, knee: { flex: 80 }, ankle: { dorsi: 11.6, inv: -1.7 } } };
// Mid-slide key (knees 48°) solved with the same constraints: without it the interpolated hips bulge ~2 cm into
// the wall. It is a `pass` key (eng-motion), so the slide no longer stops halfway; the back and buttocks stay
// 0–5 mm off the wall plane throughout (never into it).
const WALL_MID = { joints: { hip: { flex: 47.1, abd: 8.9, rot: 10 }, knee: { flex: 48 }, ankle: { dorsi: 0.2, inv: -1.3 } } };

// Decline squat on a 25° slant board (heels high, toes low). Feet hip width (heel centres 11 cm from the midline),
// toes out 6°, both soles flat on the board (foot up-vector = board normal). Start: standing tall, knees 3°.
// Bottom: knees 60°, trunk only 13.6° forward ("上体をまっすぐ"), centre of mass over the mid-foot, knees over
// the 2nd toes; on the decline the ankle stays near neutral (−1°) so the load goes to the knee extensors.
// qa3-fix-clips: the weight goes onto the right (painful) leg as the text says (痛む側の脚に体重を乗せ、反対の脚は軽く
// 添える): the pelvis moves 6 cm over the right foot (right hip adduction 5° with equal eversion, sole flat) and the
// left leg was re-solved so its foot stays flat on its spot (forefoot ≤ 2 mm) — the two legs no longer move as one.
// (A straighter left knee is not possible with both feet on the board and a level pelvis: on the decline the left
// heel would have to sink into the board.)
const DECLINE_START = { hip: { flex: -1.3, abd: 1.9, rot: 8.8 }, knee: { flex: 3 }, ankle: { dorsi: -20.7, inv: -1.8 } };
const DECLINE_BOTTOM = {
  root: { rot: [13.6, 0, 0] as [number, number, number] },
  joints: {
    hip_R: { flex: 49.7, abd: 1.2, rot: 7.1 },
    knee_R: { flex: 60 },
    ankle_R: { dorsi: -1.2, inv: -8.3 },
    hip_L: { flex: 50.1, abd: 8.79, rot: 2.06 },
    knee_L: { flex: 59.26 },
    ankle_L: { dorsi: -4.09, inv: 2.86 },
    toes_L: { ext: 0.44 },
    shoulder: { flex: 88.6, abd: -6 },
    elbow: { flex: 10 },
    forearm: { sup: -90 },
  },
};

// Lateral step-down from a 15 cm step: stand on the right leg near the step's edge, the left leg hangs beside it.
// Single-leg balance: the centre of mass is kept over the right foot (the right hip adducts ~7°, so the leg plane is
// tilted and the knee sits a few cm lateral of the 2nd-toe line — no valgus); the pelvis stays level (no roll).
// Bottom: right knee 67°, trunk 20° forward ("少し前に傾けて構いません"); the knee travels straight toward the
// 2nd toe (≤ 1.2 cm lateral drift, never medial) and the free heel just reaches the floor.
const STEP_START = {
  hip_R: { flex: -1.4, abd: -7, rot: 8.1 },
  knee_R: { flex: 5 },
  ankle_R: { dorsi: 7.3, inv: -6.7 },
  hip_L: { flex: 5, abd: 6 },
  knee_L: { flex: 3 },
  ankle_L: { dorsi: 8 },
};
const STEP_BOTTOM = {
  root: { rot: [19.6, 0, 0] as [number, number, number] },
  joints: {
    hip_R: { flex: 56.7, abd: -2.1, rot: 11.6 },
    knee_R: { flex: 66.6 },
    ankle_R: { dorsi: 30.6, inv: -8.8 },
    // free leg stays ~vertical in space while the trunk leans; heel first (ankle dorsiflexed)
    hip_L: { flex: 24.6, abd: 6 },
    knee_L: { flex: 3 },
    ankle_L: { dorsi: 12 },
    shoulder: { flex: 48, abd: 4 },
    elbow: { flex: 25 },
    forearm: { sup: -80 },
  },
};

// Split squat, right leg in front. Stride (front heel → rear toe tips) 0.63 m, i.e. ~leg length from toe to toe;
// feet ~hip width (heel centres 12 / 11 cm from the midline), toes 4° out; rear heel up. Top: knees softly bent
// (front 12°, rear 16°), trunk upright. Bottom: front knee 90° (shin 5° forward, knee over the 2nd toe), rear
// knee 101° and 5.5 cm above the floor straight under the hip, trunk 4°, centre of mass 57 % toward the front foot.
const SPLIT_TOP = {
  hip_R: { flex: 28.5, abd: 3.1, rot: 6.7 },
  knee_R: { flex: 12 },
  ankle_R: { dorsi: -16.7, inv: -0.5 },
  hip_L: { flex: -25.8, abd: 2.9, rot: 4.8 },
  knee_L: { flex: 16 },
  ankle_L: { dorsi: -11.5, inv: 7.8 },
  toes_L: { ext: 52.7 },
};
// Pass-through keys at 25 / 50 / 75 / 87.5 % of the way down (eng-motion; replace the old 55 % stop key): front knee and
// trunk as the straight blend, both hips, the rear knee, both ankles and the rear toes solved so the front foot and
// the rear toes stay exactly where they are (the straight blend slid the rear foot ~9 cm, the old mid key 2.2 cm).
// Used as `pass` keys on the way down and up, so there is no stop halfway.
const SPLIT_25 = {
  root: { rot: [1, 0, 0] as [number, number, number] },
  joints: { hip_R: { flex: 40.53, abd: 4.14, rot: 6.13 }, knee_R: { flex: 31.5 }, ankle_R: { dorsi: -8.25, inv: -0.73 }, hip_L: { flex: -15.68, abd: 3.83, rot: 3.94 }, knee_L: { flex: 36.24 }, ankle_L: { dorsi: -0.84, inv: 8.23 }, toes_L: { ext: 53.15 } },
};
const SPLIT_50 = {
  root: { rot: [2, 0, 0] as [number, number, number] },
  joints: { hip_R: { flex: 54.07, abd: 5.12, rot: 5.42 }, knee_R: { flex: 51 }, ankle_R: { dorsi: -1.28, inv: -1.15 }, hip_L: { flex: -6.13, abd: 4.69, rot: 2.72 }, knee_L: { flex: 57.35 }, ankle_L: { dorsi: 11.12, inv: 8.97 }, toes_L: { ext: 53.76 } },
};
const SPLIT_75 = {
  root: { rot: [3, 0, 0] as [number, number, number] },
  joints: { hip_R: { flex: 69.01, abd: 6.59, rot: 3.28 }, knee_R: { flex: 70.5 }, ankle_R: { dorsi: 4.29, inv: -0.33 }, hip_L: { flex: 2.94, abd: 3.61, rot: 0.05 }, knee_L: { flex: 79.64 }, ankle_L: { dorsi: 18.23, inv: 10.53 }, toes_L: { ext: 61.71 } },
};
const SPLIT_88 = {
  root: { rot: [3.5, 0, 0] as [number, number, number] },
  joints: { hip_R: { flex: 77.61, abd: 6.94, rot: 2.49 }, knee_R: { flex: 80.25 }, ankle_R: { dorsi: 6, inv: -0.51 }, hip_L: { flex: 6.3, abd: 3.27, rot: -1.29 }, knee_L: { flex: 90.56 }, ankle_L: { dorsi: 23.37, inv: 11.64 }, toes_L: { ext: 64.98 } },
};
// (eng-motion: the bottom was re-solved with the same constraints — the rear toes had slid 7.5 mm and the outer
// forefoot lifted 4 mm; now ≤ 1.6 mm)
const SPLIT_BOTTOM = {
  root: { rot: [4, 0, 0] as [number, number, number] },
  joints: {
    hip_R: { flex: 86.87, abd: 7.18, rot: 1.66 },
    knee_R: { flex: 90 },
    ankle_R: { dorsi: 7.06, inv: -0.76 },
    hip_L: { flex: 8.78, abd: 3.33, rot: -2.02 },
    knee_L: { flex: 101.33 },
    ankle_L: { dorsi: 27.2, inv: 13.58 },
    toes_L: { ext: 70.45 },
  },
};

// Terminal knee extension: facing a post, loop band behind the right knee, right foot flat, left foot half a step
// behind on its forefoot. Start: right knee 30°, trunk 8° forward, centre of mass over the right foot. End: knee fully
// straight (0°, not hyperextended), hip extended, trunk upright; the knee moves 8.5 cm back and 2 cm up. Both feet
// stay where they are (left forefoot ≤ 3 mm).
const TKE_START = {
  root: { rot: [8, 0, 0] as [number, number, number] },
  joints: {
    hip_R: { flex: 19.1, rot: 3 },
    knee_R: { flex: 30 },
    ankle_R: { dorsi: 18.8 },
    hip_L: { flex: -0.7, rot: 3 },
    knee_L: { flex: 28.3 },
    ankle_L: { dorsi: 7 },
    toes_L: { ext: 30 },
  },
};
const TKE_END = {
  root: { rot: [3.1, 0, 0] as [number, number, number] },
  joints: {
    hip_R: { flex: -2.5, rot: 3 },
    knee_R: { flex: 0 },
    ankle_R: { dorsi: 5.6 },
    hip_L: { flex: -17.9, abd: -1.2, rot: 3 },
    knee_L: { flex: 4.9 },
    ankle_L: { dorsi: -8.3, inv: -0.1 },
    toes_L: { ext: 34.1 },
  },
};

// ───────────────────────────────────────────── thigh stretches + foot (K3b)
// Values solved numerically on the engine rig (solveFK + skin primitives + the clip placement), like K3a.

// Standing quadriceps stretch (right leg). Left palm flat on a wall in front (z 0.55, palm at x +0.25 / y 1.34,
// fingers up); the arm angles were re-solved per key so the palm stays on the same spot of the wall. Standing on the
// left leg: the pelvis shifts over the left foot (left hip adduction 5° with equal eversion so the sole stays flat,
// pelvis level) and the right thigh adducts the same 5° so both knees stay together. The right hand holds the
// lateral side of the right instep (palm on the skin). Hold: posterior pelvic tilt 6° (glutes squeezed) with the
// lumbar spine flexed by the same 6° — the trunk stays upright, the low back does not arch — so the right hip
// extends to 9° (thigh ~3° behind vertical, knee pointing straight down) and the heel comes to the buttock
// (knee 148°). The left heel is pinned (xyz); heel-off keys keep the right forefoot on the floor (≤ 2 mm) while
// the weight shifts, and the hand reaches the foot from the side so it never passes through the ankle.
const QS_WALL = (a: [number, number, number, number]) => ({
  shoulder_L: { flex: a[0], abd: a[1] },
  elbow_L: { flex: a[2] },
  forearm_L: { sup: -165 },
  wrist_L: { flex: a[3] },
});
const QS_ONE_LEG = (tilt: number) => ({
  hip_L: { flex: tilt, abd: -5 },
  knee_L: { flex: 4 },
  ankle_L: { dorsi: 4, inv: -5 },
});
const QS_START = { joints: QS_WALL([60.5, -1.2, 33, -79]) };
// Heel off: weight moving onto the left leg, the right heel rises while the right toes stay where they were.
const QS_HEEL_OFF = {
  joints: {
    hip_L: { abd: -3 },
    knee_L: { flex: 2.4 },
    ankle_L: { dorsi: 2.4, inv: -3 },
    hip_R: { flex: 14.7, abd: 2.8 },
    knee_R: { flex: 30 },
    ankle_R: { dorsi: 2 },
    toes_R: { ext: 13.2 },
    shoulder_R: { flex: -5, abd: 3, rot: -10 },
    elbow_R: { flex: 12 },
    forearm_R: { sup: -35 },
    ...QS_WALL([55.9, -6.7, 44.1, -73.8]),
  },
};
// half-way to heel off (keeps the right forefoot on the floor during the weight shift, ≤ 2 mm)
const QS_HEEL_HALF = {
  joints: {
    hip_L: { abd: -1.5 },
    knee_L: { flex: 1.2 },
    ankle_L: { dorsi: 1.2, inv: -1.5 },
    hip_R: { flex: 6.5, abd: 1.4 },
    knee_R: { flex: 14 },
    ankle_R: { dorsi: 4.7 },
    toes_R: { ext: 2.8 },
    shoulder_R: { flex: -2, abd: 5, rot: -5 },
    elbow_R: { flex: 11 },
    forearm_R: { sup: -28 },
    ...QS_WALL([57.9, -3.9, 39.1, -76]),
  },
};
// Foot off: the weight is on the left leg and the right foot is lifted (hip 25°, knee 70°, ankle neutral) so the toes
// clear the floor; the right hand starts to reach back.
const QS_LIFT = {
  joints: {
    ...QS_ONE_LEG(0),
    hip_R: { flex: 25, abd: -5 },
    knee_R: { flex: 70 },
    ankle_R: { dorsi: 0 },
    shoulder_R: { flex: -12, abd: 0, rot: -20 },
    elbow_R: { flex: 15 },
    forearm_R: { sup: -50 },
    wrist_R: { flex: 10 },
    ...QS_WALL([53.7, -10.7, 49.5, -71.7]),
  },
};
const QS_GRAB = {
  joints: {
    ...QS_ONE_LEG(0),
    hip_R: { flex: -2, abd: -5 },
    knee_R: { flex: 142 },
    ankle_R: { dorsi: -25 },
    scapula_R: { elev: -10 },
    shoulder_R: { flex: -24.2, abd: -6.7, rot: -49.8 },
    elbow_R: { flex: -5 },
    forearm_R: { sup: -76.3 },
    wrist_R: { flex: 37.4 },
    ...QS_WALL([53.7, -10.7, 49.5, -71.7]),
  },
};
// approach / release: the leg as in GRAB, the right hand ~12 cm lateral to the foot (not yet holding it), so
// the hand never passes through the ankle on the way in or out
const QS_REACH = {
  joints: {
    ...QS_GRAB.joints,
    shoulder_R: { flex: -24.2, abd: 9, rot: -49.8 },
    elbow_R: { flex: 2 },
    wrist_R: { flex: 15 },
  },
};
const QS_HOLD = {
  root: { rot: [-6, 0, 0] as [number, number, number] },
  joints: {
    lumbar: { flex: 6 },
    ...QS_ONE_LEG(-6),
    hip_R: { flex: -9, abd: -5 },
    knee_R: { flex: 148 },
    ankle_R: { dorsi: -25 },
    scapula_R: { elev: -10 },
    shoulder_R: { flex: -31.1, abd: 4.5, rot: -45.1 },
    elbow_R: { flex: 24.9 },
    forearm_R: { sup: -76.6 },
    wrist_R: { flex: 65.1 },
    ...QS_WALL([55.9, -10.4, 45.8, -73.1]),
  },
};

// Supine hamstring stretch with a towel (right leg), left leg straight on the floor. The towel runs under the ball of
// the right foot (a short band across the sole) and its two ends go to the hands (right hand: lateral end, left hand:
// medial end). Start: leg on the floor (right heel and sacrum both on the mat, hip −2.6°), foot up, hands by the
// thighs. Hold: hip 76° / knee 10° ("膝は少し曲がっていても構いません"), ankle 5° up; the elbows rest on the floor beside
// the trunk and the forearms pull the towel. The pelvis, the low back and the left leg stay on the floor at every key.
// Palm positions solved numerically; the towel strands stay clear of the body (≥ 1 cm) at every key and keep about the
// same length (0.67–0.82 m), so the towel stays taut.
const HS_ARMS = (r: number[], l: number[]) => ({
  shoulder_R: { flex: r[0], abd: r[1], rot: r[2] },
  elbow_R: { flex: r[3] },
  forearm_R: { sup: r[4] },
  wrist_R: { flex: r[5] },
  shoulder_L: { flex: l[0], abd: l[1], rot: l[2] },
  elbow_L: { flex: l[3] },
  forearm_L: { sup: l[4] },
  wrist_L: { flex: l[5] },
});
const HS_START = {
  joints: {
    hip_R: { flex: -2.6, rot: 8 },
    ankle_R: { dorsi: 0 },
    ...HS_ARMS([8, -0.2, -3.4, -4.2, -55.8, -8.7], [10.2, -6, -0.3, -4.1, -56.5, -8.6]),
  },
};
const HS_MID = {
  joints: {
    hip_R: { flex: 40, rot: 4 },
    knee_R: { flex: 4 },
    ankle_R: { dorsi: 2 },
    ...HS_ARMS([-2.8, -0.1, -3, 56.5, -52.8, 3.3], [0.6, -6.5, -0.1, 53.9, -53.7, 2.7]),
  },
};
const HS_HOLD = {
  joints: {
    hip_R: { flex: 76, rot: 0 },
    knee_R: { flex: 10 },
    ankle_R: { dorsi: 5 },
    ...HS_ARMS([6.6, -2.3, -5.1, 77.6, -51.6, 7.2], [8.6, -7.1, -1.2, 75.8, -52.5, 6.6]),
  },
};
const TOWEL = '#6fb7b0';
// the towel's medial / lateral edges under the ball of the foot (4 mm outside the plantar skin)
const SOLE_MED: AttachRef = { bone: 'foot', rest: [0.05, 0.004, 0.125] };
const SOLE_LAT: AttachRef = { bone: 'foot', rest: [0.135, 0.004, 0.105] };
const HS_TOWEL: Prop[] = [
  { kind: 'band', from: SOLE_MED, to: SOLE_LAT, width: 0.07, color: TOWEL },
  { kind: 'band', from: 'hand:palm', to: SOLE_LAT, width: 0.05, color: TOWEL },
  { kind: 'band', from: 'hand_L:palm', to: SOLE_MED, width: 0.05, color: TOWEL },
];

// Rathleff high-load plantar fascia heel raise on a 15 cm step, right leg, a rolled towel (Ø 2.8 cm) on the step
// under the toes. Single-leg stance: right hip adducted 6° with 6° eversion (pelvis over the foot, sole flat), left
// foot lifted behind (knee 80°), both palms flat on the wall at the step's front (z 0.54; they slide up 7 cm as the
// body rises). Solved numerically: foot −8° (heel just below the step top, toes extended 42° over the towel) → +30°
// at the top (heel 9 cm higher, MTP extension 78°: the windlass tightens the plantar fascia); the body leans
// 6.9° → 3.1° so the centre of mass stays over the ball of the foot. The foot pivots about the ball of the foot
// (anchor foot:met_head_3, next to the MTP axis that the drawn ball-of-the-foot volume is centred on; qa3-fix-clips —
// the old pivot foot:met_2_3_shaft, 2.4 cm behind it, pushed the ball of the foot 15 mm into the step once the forefoot
// sole was drawn), so the ball of the foot stays on the step (0…+1.7 mm) while the toes rest on the towel (MTP
// extension 37° → 76°: 0.5–0.6 mm off the soft roll). ground: false — root.pos at t = 0 puts the ball of the foot on
// the step top.
const TR_LEGS = (lean: number, ankle: number, toes: number) => ({
  hip_R: { flex: 1, abd: -6 },
  knee_R: { flex: 2 },
  ankle_R: { dorsi: ankle, inv: -6 },
  toes_R: { ext: toes },
  hip_L: { flex: 12, abd: 2 },
  knee_L: { flex: 80 },
  ankle_L: { dorsi: -20 },
  lean,
});
const TR_WALL = (r: number[], l: number[]) => ({
  shoulder_R: { flex: r[0], abd: r[1] },
  elbow_R: { flex: r[2] },
  wrist_R: { flex: r[3] },
  shoulder_L: { flex: l[0], abd: l[1] },
  elbow_L: { flex: l[2] },
  wrist_L: { flex: l[3] },
  forearm: { sup: -165 },
});
const trPose = (legs: ReturnType<typeof TR_LEGS>, arms: ReturnType<typeof TR_WALL>) => {
  const { lean, ...joints } = legs;
  return {
    root: { pos: [0, 1.0461, 0] as [number, number, number], rot: [lean, 0, 0] as [number, number, number] },
    joints: { ...joints, ...arms },
  };
};
const TR_BOTTOM = trPose(TR_LEGS(6.86, 13.95, 36.58), TR_WALL([54.52, -9.14, 63.64, -67.03], [54.52, -9.14, 63.64, -67.03]));
const TR_TOP = trPose(TR_LEGS(3.06, -28.24, 75.77), TR_WALL([54.81, -9.28, 54.16, -72.19], [54.68, -7.23, 54.36, -71.2]));
// halfway (`pass` key on the way up and down): legs as the blend, arms solved so the palms stay on the wall
const TR_MID = trPose(TR_LEGS(4.96, -7.145, 56.175), TR_WALL([55.73, -8.98, 56.57, -70.72], [55.68, -7.98, 56.64, -70.29]));

// Plantar fascia-specific stretch (DiGiovanni), seated on a chair, right (painful) foot crossed over the left knee:
// the right lateral malleolus rests on top of the left knee (solved numerically; pelvis tilted back 8°, so the right
// hip is flexed 125° / horizontally abducted 22° / externally rotated 65° with the knee at 117°; the lowest point of
// the ankle rests 2 mm above the knee's skin), left foot flat on the floor. Trunk bent forward and turned slightly
// left to reach the foot. The left hand lies across the plantar
// base of the toes and pulls them back toward the shin (MTP extension 60°, ankle 10° dorsiflexed: windlass → the
// fascia tightens); the right hand's palm rests on the medial arch to feel the tense fascia. Both palms were solved
// numerically onto the skin (palm normal into the foot) at rest and at full stretch.
const PF_SIT = {
  root: { rot: [-8, 0, 0] as [number, number, number] },
  joints: {
    lumbar: { flex: 18 },
    thorax: { flex: 10, rot: -12 },
    neck: { flex: 22, rot: 8 },
    hip_L: { flex: 82, abd: 5 },
    ankle_L: { dorsi: 0 },
    hip_R: { flex: 125.3, abd: 21.7, rot: 65 },
    knee_R: { flex: 116.8 },
    ankle_R: { dorsi: 0 },
  },
};
const PF_ARMS = (r: number[], l: number[]) => ({
  shoulder_R: { flex: r[0], abd: r[1], rot: r[2] },
  elbow_R: { flex: r[3] },
  forearm_R: { sup: r[4] },
  wrist_R: { flex: r[5] },
  shoulder_L: { flex: l[0], abd: l[1], rot: l[2] },
  elbow_L: { flex: l[3] },
  forearm_L: { sup: l[4] },
  wrist_L: { flex: l[5] },
});
const PF_REST = {
  joints: {
    toes_R: { ext: 0 },
    ...PF_ARMS([55, -49.6, 37.5, 19.4, 4.7, 49.9], [49.6, -10.3, -1.9, 55.5, -88, 31.5]),
  },
};
const PF_PULL = {
  joints: {
    toes_R: { ext: 60 },
    ankle_R: { dorsi: 10 },
    ...PF_ARMS([58.9, -48.5, 38.4, 16.2, 9.7, 61.4], [57.1, -5.7, -24.2, 59.8, -117.7, 57.9]),
  },
};

// Short foot (seated, barefoot, both feet flat, knees and ankles ~90°). The rig's foot is one rigid segment (no
// midfoot joint), so the arch itself cannot dome (engine limitation, reported). What is shown truthfully: heel, ball of
// the foot and the straight, relaxed toes stay on the floor (no toe curling), and the intrinsic muscles that raise the
// arch (abductor hallucis along the medial arch, flexor digitorum brevis) are highlighted in a close-up of the medial
// side of the right foot. The −3° MTP change is only a token (below what the eye can see, toes still flat on the floor)
// so the clip is animated and the phase labels (set → 5 s hold → relax) are shown.
const SF_ON = { joints: { toes: { ext: -3 } } };

export const clips: Partial<Record<ExerciseId, Clip>> = {
  // Wall sit (isometric, 45 s holds): slide down 2 s, hold, stand up 2 s.
  'ex-wall-sit': {
    id: 'ex-wall-sit',
    duration: 8,
    base: 'STAND',
    pose: { joints: WALL_START },
    keys: [
      { t: 0, label: '背中を壁につけたまま滑り下りる' },
      { t: 0.13, pose: WALL_MID, pass: true },
      { t: 0.26, pose: WALL_HOLD, label: 'この角度で45秒キープ' },
      { t: 0.68, pose: WALL_HOLD, label: 'ゆっくり立ち上がる' },
      { t: 0.81, pose: WALL_MID, pass: true },
      { t: 0.94 },
    ],
    loop: 'loop',
    anchor: { point: 'foot:dorsum_mid', axes: 'xz' },
    ground: true,
    // the wall touches the back of the thorax: the lower thoracic skin is the most posterior point (since the drawn
    // back / buttocks of qa3-fix-body it is 10 mm behind the T6 spinous process; the wall used to cut 10 mm into the
    // back and 8 mm into the buttocks). Back 0.1–3.4 mm and buttocks 2–5 mm off the wall over the whole slide.
    props: [{ kind: 'wall', at: { at: 'thorax:spinous_T6', off: [0, 0, -0.0134] }, normal: [0, 0, 1], height: 1.85 }],
    camera: { dir: [-1, 0.2, 0.3] },
    sides: 'both',
    highlights: {
      'vastus-lateralis': 'primary',
      'vastus-medialis': 'primary',
      'rectus-femoris': 'secondary',
      'gluteus-maximus': 'secondary',
    },
  },
  // Decline squat: 3 s down on the right (painful) leg, both legs push back up (~1 s). The right foot is pinned on
  // the board; the board is placed under the solved soles (ground 0.0432 at t = 0, the feet centred on the board).
  'ex-decline-squat': {
    id: 'ex-decline-squat',
    duration: 5.5,
    base: 'STAND',
    pose: { joints: DECLINE_START },
    keys: [
      { t: 0, label: '右脚に体重を乗せ3秒で膝を曲げる' },
      { t: 0.545, pose: DECLINE_BOTTOM, hold: 0.3, label: '両脚で押して戻る' },
      { t: 0.78 },
    ],
    loop: 'loop',
    anchor: { point: 'foot:dorsum_mid', axes: 'xyz' },
    // soles on the board (0.2–0.3 mm; qa3-fix-clips: 0.048 left them 4.6 mm above it once the forefoot sole was drawn)
    ground: 0.0432,
    props: [{ kind: 'slant', at: { at: 'foot:dorsum_mid', off: [0.1234, -0.1502, -0.0245] }, angle: 25, size: [0.4, 0.42], rotY: 180 }],
    camera: { dir: [-1, 0.16, 0.28] },
    sides: 'R',
    highlights: {
      'vastus-lateralis': 'primary',
      'vastus-medialis': 'primary',
      'rectus-femoris': 'secondary',
      'gluteus-maximus': 'secondary',
    },
  },
  // Lateral step-down (eccentric 3 s, back up ~1 s). The right foot is pinned on the step; ground 0.142 puts the right
  // sole on the 15 cm step top at t = 0 (the free left foot hangs 8 mm lower, beside the step).
  'ex-step-down': {
    id: 'ex-step-down',
    duration: 5.5,
    base: 'STAND',
    pose: { joints: STEP_START },
    keys: [
      { t: 0, label: '膝を第2趾へ向けて3秒で下ろす' },
      { t: 0.545, pose: STEP_BOTTOM, hold: 0.3, label: 'かかとが触れたら右脚で戻る' },
      { t: 0.78 },
    ],
    loop: 'loop',
    anchor: { point: 'foot:dorsum_mid', axes: 'xyz' },
    ground: 0.142,
    props: [{ kind: 'step', at: [-0.13, 0.15, 0.05], size: [0.4, 0.15, 0.36] }],
    camera: { dir: [-0.45, 0.22, 1] },
    sides: 'R',
    highlights: {
      'vastus-medialis': 'primary',
      'vastus-lateralis': 'primary',
      'gluteus-medius': 'primary',
      'rectus-femoris': 'secondary',
      'gluteus-maximus': 'secondary',
    },
  },
  // Split squat: 2.5 s down, ~1 s up through the whole front foot. Front foot pinned (xz), body grounded.
  'ex-split-squat': {
    id: 'ex-split-squat',
    duration: 5,
    base: 'STAND',
    pose: { joints: SPLIT_TOP },
    keys: [
      { t: 0, label: '後ろの膝を真下へ2〜3秒で下ろす' },
      { t: 0.125, pose: SPLIT_25, pass: true },
      { t: 0.25, pose: SPLIT_50, pass: true },
      { t: 0.375, pose: SPLIT_75, pass: true },
      { t: 0.4375, pose: SPLIT_88, pass: true },
      { t: 0.5, pose: SPLIT_BOTTOM, hold: 0.25, label: '前足の足裏全体で押して戻る' },
      { t: 0.57875, pose: SPLIT_88, pass: true },
      { t: 0.6075, pose: SPLIT_75, pass: true },
      { t: 0.665, pose: SPLIT_50, pass: true },
      { t: 0.7225, pose: SPLIT_25, pass: true },
      { t: 0.78 },
    ],
    loop: 'loop',
    anchor: { point: 'foot:dorsum_mid', axes: 'xz' },
    ground: true,
    camera: { dir: [-1, 0.18, 0.22] },
    sides: 'R',
    highlights: {
      'vastus-lateralis': 'primary',
      'vastus-medialis': 'primary',
      'gluteus-maximus': 'primary',
      'rectus-femoris': 'secondary',
      'gluteus-medius': 'secondary',
      'adductor-magnus': 'secondary',
    },
  },
  // Terminal knee extension: extend ~1 s, hold 2 s, bend back slowly ~2 s. Right foot pinned (xz), body grounded.
  'ex-terminal-knee-ext': {
    id: 'ex-terminal-knee-ext',
    duration: 5.5,
    base: 'STAND',
    pose: TKE_START,
    keys: [
      { t: 0, label: '膝裏を後ろへ押して伸ばしきる' },
      { t: 0.18, pose: TKE_END, label: '2秒キープ（太もも前を固める）' },
      { t: 0.545, pose: TKE_END, label: 'ゆっくり膝を軽く曲げて戻す' },
      { t: 0.91 },
    ],
    loop: 'loop',
    anchor: { point: 'foot:dorsum_mid', axes: 'xz' },
    ground: true,
    // a post (pillar) 62 cm in front of the right knee; the loop band is tied to it at knee height and runs around
    // the back of the knee (two strands past the medial / lateral side, one behind the popliteal fossa). It stretches
    // (thins / darkens) as the knee is pushed back into extension.
    props: [
      { kind: 'box', at: [-0.085, 2.0, 0.7], size: [0.1, 2.0, 0.1] },
      { kind: 'band', from: [-0.115, 0.5, 0.648], to: { bone: 'femur', rest: [0.152, 0.515, -0.045] } },
      { kind: 'band', from: { bone: 'femur', rest: [0.152, 0.515, -0.045] }, to: { bone: 'femur', rest: [0.09, 0.515, -0.075] } },
      { kind: 'band', from: { bone: 'femur', rest: [0.09, 0.515, -0.075] }, to: { bone: 'femur', rest: [0.028, 0.515, -0.045] } },
      { kind: 'band', from: [-0.055, 0.5, 0.648], to: { bone: 'femur', rest: [0.028, 0.515, -0.045] } },
    ],
    camera: { dir: [-1, 0.2, 0.35] },
    // knee close-up: frame from the lower chest to the feet plus the band's anchor on the post (not the 2 m post and
    // the head), so the knee and the band fill the card while the trunk's lean (no arching back) stays visible
    frame: ['thorax:xiphoid', 'toes:toe_tips', 'foot:calcaneus_post', 'toes_L:toe_tips', 'foot_L:calcaneus_post', { bone: 'pelvis', rest: [0.085, 0.5, 0.66] }],
    sides: 'R',
    highlights: { 'vastus-medialis': 'primary', 'vastus-lateralis': 'primary', 'rectus-femoris': 'secondary' },
  },
  // Squat (tendon-rehab tempo 3 s down / 3 s up). Feet pinned, body grounded; arms reach forward as counterweight.
  'ex-squat': {
    id: 'ex-squat',
    duration: 8,
    base: 'STAND',
    pose: { joints: SQUAT_STAND },
    keys: [
      { t: 0, label: 'お尻を引きながら3秒でしゃがむ' },
      { t: 0.09375, pose: SQUAT_DOWN_25, pass: true },
      { t: 0.1875, pose: SQUAT_DOWN_50, pass: true },
      { t: 0.28125, pose: SQUAT_DOWN_75, pass: true },
      { t: 0.375, pose: SQUAT_BOTTOM, hold: 0.4, label: '足裏全体で押して3秒で立つ' },
      { t: 0.51875, pose: SQUAT_DOWN_75, pass: true },
      { t: 0.6125, pose: SQUAT_DOWN_50, pass: true },
      { t: 0.70625, pose: SQUAT_DOWN_25, pass: true },
      { t: 0.8 },
    ],
    loop: 'loop',
    anchor: { point: 'foot:dorsum_mid', axes: 'xz' },
    ground: true,
    camera: { dir: [-1, 0.22, 0.45] },
    sides: 'both',
    highlights: {
      'vastus-lateralis': 'primary',
      'vastus-medialis': 'primary',
      'gluteus-maximus': 'primary',
      'rectus-femoris': 'secondary',
      'adductor-magnus': 'secondary',
      'erector-spinae': 'secondary',
    },
  },
  // Standing quadriceps stretch (right leg): lift the foot and take hold of it (~1.4 s), knees together + glutes →
  // posterior pelvic tilt, 30 s hold shown as ~3.8 s, let go and put the foot down slowly (~1.9 s).
  'ex-quad-stretch': {
    id: 'ex-quad-stretch',
    duration: 8.5,
    base: 'STAND',
    keys: [
      { t: 0, pose: QS_START, label: '右足首を持ち、かかとをお尻へ' },
      { t: 0.018, pose: QS_HEEL_HALF, pass: true },
      { t: 0.036, pose: QS_HEEL_OFF, pass: true },
      { t: 0.075, pose: QS_LIFT, pass: true },
      { t: 0.13, pose: QS_REACH },
      { t: 0.17, pose: QS_GRAB, label: '膝をそろえ、お尻を締める' },
      { t: 0.27, pose: QS_HOLD, label: '太もも前が伸びたら30秒キープ' },
      { t: 0.72, pose: QS_HOLD, label: 'ゆっくり戻す' },
      { t: 0.76, pose: QS_REACH },
      { t: 0.83, pose: QS_LIFT, pass: true },
      { t: 0.885, pose: QS_HEEL_OFF, pass: true },
      { t: 0.912, pose: QS_HEEL_HALF, pass: true },
      { t: 0.94, pose: QS_START },
    ],
    loop: 'loop',
    // the standing (left) foot is pinned completely, so the free foot can never lift the body
    anchor: { point: 'foot_L:calcaneus_plantar', axes: 'xyz' },
    ground: true,
    props: [{ kind: 'wall', at: [0.12, 0, 0.55], normal: [0, 0, -1], width: 0.9, height: 1.9 }],
    camera: { dir: [-1, 0.14, 0.12] },
    sides: 'R',
    highlights: {
      'rectus-femoris': 'primary',
      'vastus-lateralis': 'secondary',
      'vastus-medialis': 'secondary',
      iliopsoas: 'secondary',
    },
  },
  // Supine hamstring stretch with a towel (right leg): raise the leg ~1.9 s, 30 s hold shown as ~3.7 s, lower ~1.9 s.
  'ex-hamstring-stretch': {
    id: 'ex-hamstring-stretch',
    duration: 8,
    base: 'SUPINE',
    keys: [
      { t: 0, pose: HS_START, label: '膝を伸ばしたまま、脚を天井へ上げる' },
      { t: 0.12, pose: HS_MID },
      { t: 0.24, pose: HS_HOLD, label: '太もも裏が伸びたら30秒キープ' },
      { t: 0.7, pose: HS_HOLD, label: 'ゆっくり下ろす' },
      { t: 0.82, pose: HS_MID },
      { t: 0.94, pose: HS_START },
    ],
    loop: 'loop',
    ground: true,
    props: [{ kind: 'mat', at: [0, 0, -0.05] }, ...HS_TOWEL],
    camera: { dir: [-1, 0.32, 0.12] },
    sides: 'R',
    highlights: {
      'biceps-femoris': 'primary',
      semitendinosus: 'primary',
      semimembranosus: 'primary',
      'adductor-magnus': 'secondary',
    },
  },
  // Rathleff heel raise: 3 s up, 2 s hold, 3 s down, 1 s rest at the bottom (toes stay extended on the towel).
  'ex-towel-heel-raise': {
    id: 'ex-towel-heel-raise',
    duration: 9,
    base: 'STAND',
    keys: [
      { t: 0, pose: TR_BOTTOM, label: '3秒かけてかかとを上げる' },
      { t: 0.1665, pose: TR_MID, pass: true },
      { t: 0.333, pose: TR_TOP, label: '一番上で2秒止める' },
      { t: 0.556, pose: TR_TOP, label: '3秒かけてかかとを下ろす' },
      { t: 0.7225, pose: TR_MID, pass: true },
      { t: 0.889, pose: TR_BOTTOM, label: '指はタオルで反らしたまま' },
    ],
    loop: 'loop',
    anchor: { point: 'foot:met_head_3', axes: 'xyz' },
    ground: false,
    props: [
      // step: top at 0.15, back edge 4.5 cm behind the 1st MT head (the heel hangs free), front face at the wall
      { kind: 'step', at: [-0.01, 0.15, 0.271], size: [0.34, 0.15, 0.538] },
      // rolled towel lying on the step under the toes
      { kind: 'towel', at: [-0.011, 0.164, 0.077], axis: 'x', radius: 0.014, length: 0.16 },
      { kind: 'wall', at: [0, 0, 0.54], normal: [0, 0, -1], width: 1.0 },
    ],
    // side view (from the right, slightly behind): the heel rising, the ankle plantarflexing and the toes kept
    // extended over the towel (windlass) are all seen in profile, with the step and the hanging heel
    camera: { dir: [-1, 0.22, -0.1] },
    focus: 'ankle',
    frame: ['toes:toe_tips', 'foot:calcaneus_post', 'tibia:fibular_head'],
    sides: 'R',
    highlights: {
      gastrocnemius: 'primary',
      soleus: 'primary',
      'flexor-digitorum-brevis': 'secondary',
      'abductor-hallucis': 'secondary',
      'flexor-hallucis-longus': 'secondary',
      'tibialis-posterior': 'secondary',
    },
  },
  // Plantar fascia-specific stretch: pull the toes back ~1.4 s, 10 s hold shown as ~3.9 s, release ~1.2 s (10 reps).
  'ex-plantar-fascia-stretch': {
    id: 'ex-plantar-fascia-stretch',
    duration: 7,
    base: 'SIT_CHAIR',
    pose: PF_SIT,
    keys: [
      { t: 0, pose: PF_REST, label: '足の指の付け根を持ち、すねの方へ反らす' },
      { t: 0.2, pose: PF_PULL, label: '土踏まずの張りを確かめて10秒キープ' },
      { t: 0.75, pose: PF_PULL, label: 'ゆっくり緩める' },
      { t: 0.92, pose: PF_REST },
    ],
    loop: 'loop',
    ground: true,
    // over the left shoulder, roughly along the foot's medial–lateral axis (the person's own view): the toes bending
    // back toward the shin turn in the image plane instead of toward the camera (the old front view saw the foot
    // end-on); close-up of the foot and both hands, with the supporting left shin below it
    camera: { dir: [0.5, 0.8, -0.4] },
    focus: 'foot',
    frame: ['hand:palm', 'hand_L:palm'],
    sides: 'R',
    highlights: {
      'flexor-digitorum-brevis': 'primary',
      'abductor-hallucis': 'primary',
      'flexor-hallucis-longus': 'secondary',
    },
  },
  // Short foot: ~1 s to set the arch, 5 s hold, ~1.2 s relax (10 reps).
  'ex-short-foot': {
    id: 'ex-short-foot',
    duration: 8,
    base: 'SIT_CHAIR',
    pose: { joints: { ankle: { dorsi: 0 } } },
    keys: [
      { t: 0, label: '指を伸ばしたまま、母趾球をかかとへ引き寄せる' },
      { t: 0.13, pose: SF_ON, label: '土踏まずを持ち上げて5秒キープ' },
      { t: 0.75, pose: SF_ON, label: 'ゆっくり力を抜く' },
      { t: 0.9 },
    ],
    loop: 'loop',
    ground: true,
    // close-up of the medial arch of the right foot from the front-medial side, low; the line of sight passes in front
    // of the left toes, so the left foot does not hide the right one (exact camera: the default region framing
    // would leave half of the card empty below the floor)
    camera: { position: [0.255, 0.22, 0.942], target: [-0.115, 0.035, 0.48] },
    sides: 'both',
    highlights: {
      'abductor-hallucis': 'primary',
      'flexor-digitorum-brevis': 'primary',
      'tibialis-posterior': 'secondary',
    },
  },
};
