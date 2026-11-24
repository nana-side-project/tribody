// k2 — hip exercise clips. Owner after the engine agent: clip agent k2. See docs/ENGINE.md.
import type { ExerciseId } from '../../data/registry';
import type { Pose } from '../rig';
import type { Clip, Prop } from './types';

// hook-lying: hips 45°, knees 104°, feet flat (values solved so heels and pelvis both touch the floor)
const HOOK = { hip: { flex: 45, abd: 4 }, knee: { flex: 104 }, ankle: { dorsi: -32 } };
// bridge top: trunk 20° off the floor; feet & shoulders stay on the floor
const TOP = { root: { rot: [-110, 0, 0] as [number, number, number] }, joints: { hip: { flex: 5 }, knee: { flex: 90 }, ankle: { dorsi: -25 }, neck: { flex: 20 } } };

// clamshell "open": the top leg rotates 35° about the hip–heel axis (heels stay together, knee rises ~17 cm).
// Solved numerically: equivalent to hip flex 42.8 / abd 18.3 / external rotation 23.2 from the start
// (flex 48, knee 88, and SIDE_LYING's top-leg adduction of −8° so the knees rest on each other).
const OPEN = { joints: { hip_R: { flex: 42.8, abd: 18.3, rot: 23.2 } } };

// ── K2a: bridges (solved numerically with FK + grounding, see the clip comments) ──────────────────────
// Hook-lying for bridges: heels ~2 fists from the buttocks (heel → ischial tuberosity 0.30 m), feet hip-width
// and flat (heel and metatarsal heads on the floor), pelvis on the floor.
const BR_HOOK = { hip: { flex: 51.5, abd: 4 }, knee: { flex: 120.3 }, ankle: { dorsi: -21.6 } };
// Arms by the sides, palms down on the floor (shoulder extension keeps the hands on the mat).
const BR_ARMS = { shoulder: { flex: -13, abd: 12 }, elbow: { flex: 8 }, forearm: { sup: -165 } };
// Bridge top: trunk 22° off the floor, hips 3° short of a straight shoulder–hip–knee line (no lumbar extension),
// shins ~11° from vertical. Solved so the heels stay put (anchor), the soles stay flat, the head and upper back
// stay on the floor and the shoulders slide < 1.2 cm; shoulder flex −34 keeps the palms on the floor.
const BR_TOP_ROOT = { rot: [-112, 0, 0] as [number, number, number] };
const BR_TOP_LEG = { hip: { flex: 3, abd: 4 }, knee: { flex: 104.4 }, ankle: { dorsi: -10.5 } };
const BR_TOP_UPPER = { neck: { flex: 20.7 }, shoulder: { flex: -34, abd: 12 } };

// ── K2a: loop band / belt around both thighs just above the knees ───────────────────────────────────────
// Drawn as a front strap + a back strap (tangent to both thighs) + 4 short pieces wrapping each thigh's lateral
// side (5 points every 45° on a circle 6 mm outside the skin loft; rings ride the femur so the loop follows the legs).
function kneeLoop(y: number, r: number, width = 0.04, color?: string): Prop[] {
  const c = [0.0903, 0.003]; // thigh centre (lat, z) at y ≈ 0.6 (skin loft ring radius ≈ 0.058)
  const at = (deg: number): [number, number, number] => [
    c[0] + r * Math.cos((deg * Math.PI) / 180),
    y,
    c[1] + r * Math.sin((deg * Math.PI) / 180),
  ];
  const out: Prop[] = [
    { kind: 'band', from: { bone: 'femur', rest: at(90) }, to: { bone: 'femur_L', rest: at(90) }, width, color },
    { kind: 'band', from: { bone: 'femur', rest: at(-90) }, to: { bone: 'femur_L', rest: at(-90) }, width, color },
  ];
  for (const bone of ['femur', 'femur_L'] as const) {
    for (const a of [90, 45, 0, -45]) out.push({ kind: 'band', from: { bone, rest: at(a) }, to: { bone, rest: at(a - 45) }, width, color });
  }
  return out;
}

// ── K2a: band walk — athletic stance (trunk 15° forward, hips 35°, knees 40°, feet flat, toes forward) ──
// Solved per stance: hip-width (heels ±0.105 m) and wide (+0.2 m step); hip rot / ankle inversion keep the soles
// flat and the toes pointing forward; the pelvis stays centred between the feet (no lateral trunk sway).
const BW_BASE = { root: { rot: [15, 0, 0] as [number, number, number] }, joints: { hip: { flex: 35 }, knee: { flex: 40 }, ankle: { dorsi: 20 } } };
const bwNarrow = (x: number) => ({
  root: { pos: [x, 0.87, 0] as [number, number, number] },
  joints: { hip: { flex: 35, abd: 1.03, rot: -0.37 }, ankle: { dorsi: 20, inv: 1.09 } },
});
const bwWide = (x: number) => ({
  root: { pos: [x, 0.86, 0] as [number, number, number] },
  joints: { hip: { flex: 35, abd: 7.7, rot: -3.25 }, ankle: { dorsi: 20, inv: 8.02 } },
});

// ── K2a: half-kneeling hip flexor stretch — weight shifted forward with the pelvis kept posteriorly tilted ──
const HF_SHIFT = {
  root: { pos: [0, 0.484, 0.07] as [number, number, number], rot: [-10, 0, 0] as [number, number, number] },
  joints: {
    lumbar: { flex: 10 },
    hip_R: { flex: -24.5 },
    knee_R: { flex: 89.98 },
    hip_L: { flex: 80.93, abd: 3 },
    knee_L: { flex: 100.82 },
    ankle_L: { dorsi: 9.95 },
  },
};
// + right arm overhead and a gentle side bend to the left (lumbar −6°, thorax −8°)
const HF_DEEP = {
  root: HF_SHIFT.root,
  joints: {
    ...HF_SHIFT.joints,
    lumbar: { flex: 10, lat: -6 },
    thorax: { lat: -8 },
    shoulder_R: { flex: 165, abd: 8 },
    elbow_R: { flex: 8 },
    forearm_R: { sup: -60 },
  },
};

// ── K2a: figure-4 stretch (supine). Solved numerically: the right lateral malleolus rests on the anterior left
// thigh ~7 cm above the knee, the right shin crosses the left thigh at ~90°, and the right knee stays open (16 cm
// lateral to the hip — the thigh never crosses the midline). Hands hold the back of the left thigh (mid-thigh,
// scapulae protracted 25° to reach) while the head, upper back and pelvis stay on the floor.
const F4_FORMED = {
  joints: { hip_R: { flex: 94.5, abd: 22.6, rot: 64 }, knee_R: { flex: 118.8 }, ankle_R: { dorsi: 0 } },
};
const F4_GRAB = {
  joints: {
    hip_L: { flex: 84, abd: 4 },
    knee_L: { flex: 100 },
    ankle_L: { dorsi: -15 },
    hip_R: { flex: 127, abd: 22.6, rot: 64 },
    knee_R: { flex: 118.8 },
    ankle_R: { dorsi: 0 },
    scapula: { protr: 25 },
    shoulder_R: { flex: 12.3, abd: -27.6, rot: -38.3 },
    elbow_R: { flex: 0 },
    forearm_R: { sup: -51.8 },
    // left arm re-solved (same grip ≤ 2 cm) so the forearm runs along the outside of the thigh instead of through it
    shoulder_L: { flex: 10.4, abd: 11.6, rot: -84.3 },
    elbow_L: { flex: 34.5 },
    forearm_L: { sup: 10 },
  },
};
// Via keys (verified with a skin self-collision sweep): plain interpolation hook-lying ⇄ formed swept the right foot
// / shin through the left knee and the right forearm through the right thigh. The right leg is first raised on its own
// side (F4_UP), carried over the left knee (F4_OVER, lateral malleolus ~14 cm above the left thigh), then lowered onto
// the thigh; the right arm is lifted (F4_REACH, shoulder 65° / elbow 80°, hand above the belly) before it reaches
// through the window between the legs from the head side. The way back runs the same path in reverse.
const F4_UP = { joints: { hip_R: { flex: 95, abd: 15, rot: 15 }, knee_R: { flex: 95 }, ankle_R: { dorsi: -10 } } };
const F4_OVER = { joints: { hip_R: { flex: 97.5, abd: 18.4, rot: 56 }, knee_R: { flex: 97.8 }, ankle_R: { dorsi: -10 } } };
const F4_REACH = {
  joints: {
    ...F4_FORMED.joints,
    scapula: { protr: 15 },
    shoulder_R: { flex: 65, abd: 0, rot: -10 },
    elbow_R: { flex: 80 },
    forearm_R: { sup: -52 },
  },
};
const F4_PULL = {
  joints: {
    hip_L: { flex: 92, abd: 4 },
    knee_L: { flex: 95 },
    ankle_L: { dorsi: -10 },
    hip_R: { flex: 134, abd: 22.8, rot: 64 },
    knee_R: { flex: 118.6 },
    ankle_R: { dorsi: 0 },
    scapula: { protr: 25 },
    shoulder_R: { flex: 13.9, abd: -18.6, rot: -88 },
    elbow_R: { flex: 13.6 },
    forearm_R: { sup: 9.5 },
    shoulder_L: { flex: 10.6, abd: 16.2, rot: -84 },
    elbow_L: { flex: 45.6 },
    forearm_L: { sup: 10 },
  },
};

// ── K2b: adductor squeeze — hook-lying with hips 45°, feet hip-width (heels ±12 cm, hip rot 0), soles flat:
// knee/ankle solved so pelvis, upper back, heels and forefeet all touch. Knees ~16.6 cm apart (skin to skin) for an
// 8.3 cm-radius soft ball; the squeeze (abd 7 → 6.2) presses each knee ~4 mm into the ball (isometric: no visible
// joint movement beyond that).
const SQ_HOOK = { hip: { flex: 45, abd: 7, rot: 0 }, knee: { flex: 101.8 }, ankle: { dorsi: -32.9 } };
const SQ_PRESS = { joints: { hip: { flex: 45, abd: 6.2, rot: 0 } } };

// ── K2b: seated sciatic nerve glide (slider) on SIT_CHAIR (its chair = seat under the sit bones, the thighs mostly
// overhanging = 浅めに座る). Slumped: pelvis tilted back 8° (hips 82° keep the thighs on the seat), lumbar 14° and
// thorax 14° flexion. Palms rest on the distal thighs (solved: palm on the anterior thigh, fingers toward the knee).
const NG_SIT = {
  root: { rot: [-8, 0, 0] as [number, number, number] },
  joints: {
    hip: { flex: 82, abd: 5 },
    knee: { flex: 90 },
    lumbar: { flex: 14 },
    thorax: { flex: 14 },
    shoulder: { flex: 5.3, abd: 2.2, rot: -26.2 },
    elbow: { flex: 91.3 },
    forearm: { sup: -175 },
    wrist: { flex: -9.9 },
  },
};
// head down (chin toward the chest) with the knee bent / face up toward the ceiling with the knee straightening
// (stops ~28° short of full extension). The ankle stays relaxed — no dorsiflexion in this (slider) version.
const NG_DOWN = { joints: { neck: { flex: 28 }, head: { flex: 10 } } };
const NG_UP = { joints: { neck: { flex: -42 }, head: { flex: -20 }, knee_R: { flex: 28 }, ankle_R: { dorsi: -12 } } };

// ── K2b: banded standing knee drive — left palm flat on a wall at the left side at 1.2 m (arm solved for the palm
// position + palm facing the wall; the wall prop is placed at the palm).
// Top: right thigh 13° above horizontal (hip 102°, knee 95°, ankle neutral), trunk upright, pelvis level and shifted
// 8.8 cm over the left foot (solved: centre of mass over the left foot, left sole flat → hip add 6°, ankle ev 6°),
// left knee soft (10°).
// Stance: weight shifted onto the left leg with both feet still down (right foot at its place, sole flat: right hip
// abd 6°, ankle inv 6°) — the left palm on the wall, the pelvis already over the left foot, so the right foot can
// leave the floor without losing balance (centre of mass over the left foot in every frame).
const KD_ARM = {
  shoulder_L: { flex: 5.5, abd: 13.6, rot: 69.6 },
  elbow_L: { flex: 79.1 },
  forearm_L: { sup: -175 },
  wrist_L: { flex: -77.3 },
};
const KD_LEFT = { hip_L: { flex: 5.69, abd: -6.07 }, knee_L: { flex: 10 }, ankle_L: { dorsi: 4.28, inv: -6.04 } };
const KD_SHIFT = {
  ...KD_ARM,
  ...KD_LEFT,
  hip_R: { flex: 4.81, abd: 6, rot: -0.5 },
  knee_R: { flex: 8.2 },
  ankle_R: { dorsi: 3.42, inv: 6.02 },
};
const KD_TOP = {
  joints: {
    ...KD_ARM,
    ...KD_LEFT,
    hip_R: { flex: 102, abd: 2, rot: 0 },
    knee_R: { flex: 95 },
    ankle_R: { dorsi: 0, inv: 0 },
  },
};
// Mini loop band around both forefeet: over each dorsum (2 pieces via the top) and two strands between the feet (the
// upper strand from dorsum to dorsum, the lower one from sole edge to sole edge). Points 6 mm outside the foot skin.
function feetLoop(width = 0.028): Prop[] {
  const P = (lat: number, y: number): [number, number, number] => [lat, y, 0.06];
  const top = P(0.093, 0.086);
  const medD = P(0.056, 0.074);
  const latD = P(0.13, 0.074);
  const medP = P(0.05, 0.016);
  const out: Prop[] = [
    { kind: 'band', from: { bone: 'foot', rest: medD }, to: { bone: 'foot_L', rest: medD }, width },
    { kind: 'band', from: { bone: 'foot', rest: medP }, to: { bone: 'foot_L', rest: medP }, width },
  ];
  for (const bone of ['foot', 'foot_L'] as const) {
    out.push({ kind: 'band', from: { bone, rest: medD }, to: { bone, rest: top }, width });
    out.push({ kind: 'band', from: { bone, rest: top }, to: { bone, rest: latD }, width });
  }
  return out;
}

// ── K2b: single-leg RDL on the right leg. Solved (FK + volume-weighted centre of mass): the right sole stays flat with
// the toes forward, the centre of mass stays over the right mid-foot, the right knee stays in the hip–ankle–foot plane
// (no knee valgus), pelvis square and level (no yaw / roll). Start: single-leg stance, knee soft 18°, pelvis shifted
// 9 cm over the right foot, free (left) foot hovering behind. Bottom: neutral spine, trunk 82° (nearly parallel to the
// floor), hips pushed back 14 cm, the free leg in line with the trunk (head → back heel one line), arms hang.
const RDL_TOP = {
  hip_R: { flex: 5.41, abd: -6.34, rot: 0.6 },
  knee_R: { flex: 18 },
  ankle_R: { dorsi: 12.62, inv: -6.39 },
  hip_L: { flex: 4, abd: 0 },
  knee_L: { flex: 62 },
  ankle_L: { dorsi: -15 },
};
const RDL_BOTTOM = {
  root: { rot: [82, 0, 0] as [number, number, number] },
  joints: {
    hip_R: { flex: 100.78, abd: -6.1, rot: 2.09 },
    knee_R: { flex: 18 },
    ankle_R: { dorsi: -0.68, inv: -6.46 },
    hip_L: { flex: -2, abd: 0 },
    knee_L: { flex: 0 },
    ankle_L: { dorsi: 0 },
    neck: { flex: -12 },
    shoulder: { flex: 77, abd: 6 },
    elbow: { flex: 8 },
    forearm: { sup: -80 },
  },
};

// ── K2b: Copenhagen adduction plank, short lever: left forearm on the floor (elbow under the shoulder), the right
// (top) knee bent 90° with the inner knee + shin lying on a bench (38 cm), the bottom leg straight. Solved with FK:
// the forearm stays pinned (anchor), the top knee/shin stay at the same spot on the bench (≤ 1 mm) and the shin stays
// horizontal along the bench. Top: body straight from head to knee (top hip neutral), body line 12° above horizontal,
// the bottom leg lifted (hip add 3°) to just under the bench seat. Bottom: the pelvis just touches the floor — the top
// hip abducts 46° (adductors lengthen) and the trunk side-bends 23°, the bottom leg rests on the floor.
// Top hand on the iliac crest. The bottom pose has its own arm (solved): with the trunk side-bent 25° the top-pose arm
// would sink the hand ~4 cm into the pelvis; this one keeps the palm on the same spot of the crest (≤ 8 mm).
const CP_ARM_TOP = { shoulder_R: { flex: -24.8, abd: 47.3, rot: -72.7 }, elbow_R: { flex: 112.7 }, forearm_R: { sup: -154.8 } };
const CP_ARM_BOTTOM = { shoulder_R: { flex: -46.1, abd: 33.9, rot: -51.3 }, elbow_R: { flex: 126.9 }, forearm_R: { sup: -147.1 } };
const CP_COMMON = {
  wrist_R: { flex: 0 },
  elbow_L: { flex: 90 },
  forearm_L: { sup: -175 },
  wrist_L: { flex: 0 },
  knee_R: { flex: 90 },
  ankle_R: { dorsi: 0 },
  knee_L: { flex: 0 },
  ankle_L: { dorsi: -10 },
};
const CP_BOTTOM = {
  root: { rot: [0, 0, -69.47] as [number, number, number] },
  joints: {
    ...CP_ARM_BOTTOM,
    lumbar: { lat: 25 },
    hip_R: { flex: -0.53, abd: 45.09, rot: -1.93 },
    hip_L: { flex: 0, abd: -25 },
    shoulder_L: { flex: -1.4, abd: 45.9, rot: -9.2 },
    forearm_L: { sup: -169 },
  },
};
const CP_TOP = {
  root: { rot: [0, 0, -78] as [number, number, number] },
  joints: {
    ...CP_ARM_TOP,
    lumbar: { lat: 0 },
    hip_R: { flex: 0, abd: 0, rot: -2.62 },
    hip_L: { flex: 0, abd: -3 },
    shoulder_L: { flex: -4.8, abd: 73.7, rot: -6.4 },
    forearm_L: { sup: -175 },
  },
};

// ── K2b: 90/90 hip mobility (windshield-wiper switch with the hands planted behind). Solved with FK + grounding:
// the ankles stay planted at (±0.42, 0.37) m and both palms at (±0.25, −0.20) m in EVERY key, so the knees swing
// over from one side to the other while the feet and hands stay put (the mirrored position has the same contacts).
// N_P (right leg in front): right hip flex 89° / abd 40° / ER 65°, knee 97° — lateral knee & ankle on the floor, the
// shin runs in front of the body; left hip flex 41° / abd 28° / IR 47°, knee 108° — medial knee on the floor, to the
// side; thighs ~90° apart. The pelvis turns 53° toward the front leg and tilts 24° (sitting on the front-leg
// buttock); the lumbar spine side-bends 20° and the trunk counter-rotates 22° (chest faces ~33° toward the front
// leg) so the chest stays upright, leaning back ~10° with a straight back.
// N_MID: both knees up toward the ceiling (hips 135°, knees 107°, soles flat on the same spots).
// N_LEAN: from N_P the pelvis tilts forward 35° with the spine straight, the chest turns to the front shin, the hips
// are re-solved so the knees/feet stay within 2 cm; the hands rest on the front shin.
type Joints = NonNullable<Pose['joints']>;
function mirrorLR(p: { root?: Pose['root']; joints: Joints }): { root?: Pose['root']; joints: Joints } {
  const j: Record<string, Record<string, number>> = {};
  for (const [k, v] of Object.entries(p.joints as Record<string, Record<string, number>>)) {
    const nk = k.endsWith('_R') ? k.slice(0, -2) + '_L' : k.endsWith('_L') ? k.slice(0, -2) + '_R' : k;
    const nv = { ...v };
    if (k === 'lumbar' || k === 'thorax' || k === 'neck' || k === 'head') {
      if (nv.lat !== undefined) nv.lat = -nv.lat;
      if (nv.rot !== undefined) nv.rot = -nv.rot;
    }
    j[nk] = nv;
  }
  const r = p.root?.rot;
  return { root: r ? { ...p.root, rot: [r[0], -r[1], -r[2]] } : p.root, joints: j as Joints };
}
const N_ROOT_POS: [number, number, number] = [0, 0.3, 0];
const N_LEGS_P: Joints = {
  lumbar: { flex: -7.91, lat: -19.54, rot: -10.35 },
  thorax: { rot: -12 },
  neck: { flex: 12 },
  hip_R: { flex: 89.17, abd: 40.06, rot: 65 },
  hip_L: { flex: 40.51, abd: 27.5, rot: -47.16 },
  knee_R: { flex: 96.9 },
  knee_L: { flex: 108.12 },
  ankle: { dorsi: -10, inv: 0 },
};
const N_P = {
  root: { pos: N_ROOT_POS, rot: [-10.69, -52.97, 24.42] as [number, number, number] },
  joints: {
    ...N_LEGS_P,
    shoulder_R: { flex: 5.2, abd: 2.9, rot: 105 },
    elbow_R: { flex: 0 },
    forearm_R: { sup: -173.7 },
    wrist_R: { flex: -75.1 },
    shoulder_L: { flex: -20.2, abd: -12.3, rot: 72 },
    elbow_L: { flex: 3.5 },
    forearm_L: { sup: -51.4 },
    wrist_L: { flex: -69.9 },
  } as Joints,
};
const N_P_MIRROR = mirrorLR(N_P);
const N_MID = {
  root: { pos: N_ROOT_POS, rot: [-10.7, 0, 0] as [number, number, number] },
  joints: {
    lumbar: { flex: -7.9, lat: 0, rot: 0 },
    thorax: { rot: 0 },
    neck: { flex: 12 },
    hip: { flex: 135, abd: 28.07, rot: -32.56 },
    knee: { flex: 106.66 },
    ankle: { dorsi: -29.94, inv: -1.35 },
    shoulder: { flex: -6.2, abd: -11, rot: 105 },
    elbow: { flex: 25.5 },
    forearm: { sup: -135.1 },
    wrist: { flex: -68.3 },
  } as Joints,
};
// N_HALF: halfway between N_P and N_MID (root/trunk/arms interpolated), legs re-solved so the ankles stay planted
// and the feet just clear the floor (~3 cm, as when the feet pivot) with the buttocks down — plain interpolation
// would push the feet through the floor and lift the whole body ~13 cm.
const N_HALF = {
  root: { pos: N_ROOT_POS, rot: [-10.69, -26.49, 12.21] as [number, number, number] },
  joints: {
    lumbar: { flex: -7.9, lat: -9.77, rot: -5.18 },
    thorax: { rot: -6 },
    neck: { flex: 12 },
    hip_R: { flex: 131.71, abd: 43.61, rot: 15.79 },
    knee_R: { flex: 102.85 },
    ankle_R: { dorsi: -19.97, inv: -0.68 },
    hip_L: { flex: 124.5, abd: 41.24, rot: -50 },
    knee_L: { flex: 108.25 },
    ankle_L: { dorsi: -19.97, inv: -0.68 },
    shoulder_R: { flex: -0.5, abd: -4.05, rot: 105 },
    elbow_R: { flex: 12.75 },
    forearm_R: { sup: -154.4 },
    wrist_R: { flex: -71.7 },
    shoulder_L: { flex: -13.2, abd: -11.65, rot: 88.5 },
    elbow_L: { flex: 14.5 },
    forearm_L: { sup: -93.25 },
    wrist_L: { flex: -69.1 },
  } as Joints,
};
const N_HALF_MIRROR = mirrorLR(N_HALF);
// halfway between N_HALF and N_MID (eng-motion `pass` key): hips, knees, ankles and toes re-solved so the buttocks stay
// on the mat (≤ 1 mm) with the ankles within 2 cm of the blend — the plain blend let the toes sweep the floor and prop
// the pelvis ~3 cm up for a moment.
const N_QUARTER = {
  root: { pos: N_ROOT_POS, rot: [-10.69, -13.24, 6.11] as [number, number, number] },
  joints: {
    lumbar: { flex: -7.9, lat: -4.89, rot: -2.59 },
    thorax: { rot: -3 },
    neck: { flex: 12 },
    shoulder_R: { flex: -3.35, abd: -7.53, rot: 105 },
    elbow_R: { flex: 19.13 },
    forearm_R: { sup: -144.75 },
    wrist_R: { flex: -70 },
    hip_R: { flex: 135, abd: 35.84, rot: -8.39 },
    knee_R: { flex: 100.91 },
    ankle_R: { dorsi: -30.02, inv: -1.01 },
    toes_R: { ext: 0.64 },
    shoulder_L: { flex: -9.7, abd: -11.32, rot: 96.75 },
    elbow_L: { flex: 20 },
    forearm_L: { sup: -114.18 },
    wrist_L: { flex: -68.7 },
    hip_L: { flex: 130.55, abd: 34.65, rot: -41.28 },
    knee_L: { flex: 106.87 },
    ankle_L: { dorsi: -27.59, inv: -1.01 },
    toes_L: { ext: 0.32 },
  } as Joints,
};
const N_QUARTER_MIRROR = mirrorLR(N_QUARTER);
// hands lifted off the floor (palms ~25 cm up beside the hips, elbows soft) between "hands behind" and "hands on the
// shin". Chosen with a skin self-collision sweep: the previous via (shoulders extended / adducted behind the back) swept
// the left arm through the lower back and both hands through the thighs on the way to / from the shin.
const N_HANDS_UP = {
  root: N_P.root,
  joints: {
    ...N_LEGS_P,
    shoulder_R: { flex: 10, abd: 25, rot: 0 },
    elbow_R: { flex: 50 },
    forearm_R: { sup: -90 },
    wrist_R: { flex: 0 },
    shoulder_L: { flex: 10, abd: 25, rot: 0 },
    elbow_L: { flex: 50 },
    forearm_L: { sup: -90 },
    wrist_L: { flex: 0 },
  } as Joints,
};
// hands just lifted off the floor (elbows bent 60°, wrists kept extended): a `pass` key on the way from "hands
// behind" to N_HANDS_UP and back (eng-motion) — straightening the wrists while the hands were still down swept the
// left fingers through the floor and the grounding lifted the whole body ~6 cm for a moment.
const N_HANDS_LIFT = {
  root: N_P.root,
  joints: {
    ...N_P.joints,
    elbow_R: { flex: 60 },
    wrist_R: { flex: -80 },
    elbow_L: { flex: 60 },
    wrist_L: { flex: -80 },
  } as Joints,
};
const N_LEAN = {
  root: { pos: N_ROOT_POS, rot: [24.31, -52.97, 24.42] as [number, number, number] },
  joints: {
    ...N_LEGS_P,
    lumbar: { flex: -7.91, lat: -19.54, rot: 0 },
    thorax: { rot: -10 },
    neck: { flex: -5 },
    hip_R: { flex: 122.9, abd: 22.92, rot: 65 },
    hip_L: { flex: 67.1, abd: 43.12, rot: -37.05 },
    knee_R: { flex: 93.57 },
    knee_L: { flex: 108.18 },
    shoulder_R: { flex: 8.2, abd: 10.5, rot: -11.1 },
    elbow_R: { flex: 85.4 },
    forearm_R: { sup: -174.4 },
    wrist_R: { flex: -14.7 },
    shoulder_L: { flex: 44.9, abd: -17.3, rot: -48.7 },
    elbow_L: { flex: 31.2 },
    forearm_L: { sup: -156.3 },
    wrist_L: { flex: -32 },
  } as Joints,
};

// ── K2b: isometric hamstring bridge — heels far from the hips (heel ~0.85 m in front of the hip joints), knees 35°,
// ankles neutral (resting on the heels, toes up), pelvis / upper back / head on the floor. Hold: pelvis ~5 cm up
// (trunk 5° off the floor, hips 9°, knees 40° — the heels pull slightly toward the body), solved with the heels
// pinned, the upper back not sliding, head and palms staying on the floor (shoulder ext / neck flex compensate).
const HB_START = { hip: { flex: 14.9, abd: 3, rot: 0 }, knee: { flex: 35 }, ankle: { dorsi: 0 } };
const HB_HOLD = {
  root: { rot: [-95.25, 0, 0] as [number, number, number] },
  joints: {
    hip: { flex: 8.9, abd: 3, rot: 0 },
    knee: { flex: 40 },
    ankle: { dorsi: 6 },
    shoulder: { flex: -17.8, abd: 12 },
    neck: { flex: -2.2 },
  },
};

export const clips: Partial<Record<ExerciseId, Clip>> = {
  // Glute bridge (sample, refined by K2a): hook-lying → push through the heels → 2 s hold with shoulders–hips–knees
  // in line → lower over ~2.8 s. Feet pinned in xz, body grounded.
  'ex-glute-bridge': {
    id: 'ex-glute-bridge',
    duration: 6.5,
    base: 'SUPINE',
    pose: { joints: { ...BR_HOOK, ...BR_ARMS } },
    keys: [
      { t: 0, label: 'かかとで床を押してお尻を上げる' },
      { t: 0.16, pose: { root: BR_TOP_ROOT, joints: { ...BR_TOP_LEG, ...BR_TOP_UPPER } }, hold: 2, label: '肩〜膝を一直線にして2秒キープ' },
      { t: 0.47, pose: { root: BR_TOP_ROOT, joints: { ...BR_TOP_LEG, ...BR_TOP_UPPER } }, label: 'ゆっくり下ろす（2〜3秒）' },
      { t: 0.9, label: 'お腹に軽く力を入れる' },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    props: [{ kind: 'mat' }],
    camera: { dir: [-1, 0.32, 0.22] },
    sides: 'both',
    highlights: {
      'gluteus-maximus': 'primary',
      'biceps-femoris': 'secondary',
      semitendinosus: 'secondary',
      semimembranosus: 'secondary',
      'gluteus-medius': 'secondary',
    },
  },
  // Single-leg bridge: right foot on the floor, the left leg straight with the thighs parallel (knees level).
  // Same right-leg geometry as the bridge (right heel pinned); the pelvis stays level (no roll).
  'ex-single-leg-bridge': {
    id: 'ex-single-leg-bridge',
    duration: 6.5,
    base: 'SUPINE',
    pose: { joints: { ...BR_HOOK, ...BR_ARMS, hip_L: { flex: 51.5, abd: 4 }, knee_L: { flex: 0 }, ankle_L: { dorsi: 0 } } },
    keys: [
      { t: 0, label: '床についた足のかかとで押して上げる' },
      {
        t: 0.16,
        pose: { root: BR_TOP_ROOT, joints: { ...BR_TOP_LEG, ...BR_TOP_UPPER, hip_L: { flex: 3, abd: 4 }, knee_L: { flex: 0 }, ankle_L: { dorsi: 0 } } },
        hold: 2,
        label: '骨盤を水平に保って2秒キープ',
      },
      {
        t: 0.47,
        pose: { root: BR_TOP_ROOT, joints: { ...BR_TOP_LEG, ...BR_TOP_UPPER, hip_L: { flex: 3, abd: 4 }, knee_L: { flex: 0 }, ankle_L: { dorsi: 0 } } },
        label: 'ゆっくり下ろす（2〜3秒）',
      },
      { t: 0.9, label: 'お腹に軽く力を入れる' },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    props: [{ kind: 'mat' }],
    camera: { dir: [-1, 0.32, 0.22] },
    sides: 'R',
    highlights: {
      'gluteus-maximus': 'primary',
      'gluteus-medius': 'primary',
      'biceps-femoris': 'secondary',
      semitendinosus: 'secondary',
      semimembranosus: 'secondary',
      'gluteus-minimus': 'secondary',
    },
  },
  // Clamshell (sample, refined by K2a): SIDE_LYING (left side down), hips 48° / knees 88°, feet together; the head
  // rests on a cushion (neck in line with the spine), the top hand is on the iliac crest (solved: palm on the crest,
  // elbow pointing up) to keep the pelvis vertical. The top (right) knee opens ~1 s, holds 1.5 s, closes ~2.5 s.
  'ex-clamshell': {
    id: 'ex-clamshell',
    duration: 5.5,
    base: 'SIDE_LYING',
    pose: {
      joints: {
        hip: { flex: 48 },
        knee: { flex: 88 },
        ankle: { dorsi: -10 },
        neck: { lat: -15 },
        head: { lat: -5 },
        shoulder_R: { flex: -24.8, abd: 47.3, rot: -72.7 },
        elbow_R: { flex: 112.7 },
        forearm_R: { sup: -154.8 },
        wrist_R: { flex: 0 },
      },
    },
    keys: [
      { t: 0, label: 'かかとをつけたまま膝をひらく' },
      { t: 0.18, pose: OPEN, hold: 1.5, label: '骨盤を倒さずに1〜2秒キープ' },
      { t: 0.46, pose: OPEN, label: 'ゆっくり閉じる' },
      { t: 0.9 },
    ],
    loop: 'loop',
    props: [
      { kind: 'mat', rotY: 90 },
      // head cushion: top = the head's lowest point with the neck in line (0.129 m)
      { kind: 'box', at: [0.75, 0.127, -0.01], size: [0.26, 0.125, 0.22] },
    ],
    // from the front (the side the knees point to), a little above: the top knee visibly lifts off the bottom one
    camera: { dir: [-0.22, 0.6, 1] },
    focus: 'hip',
    frame: ['femur:lateral_epicondyle', 'femur_L:lateral_epicondyle', 'foot:calcaneus_post', 'toes_L:toe_tips', 'pelvis:iliac_crest_mid', 'forearm:olecranon', 'scapula:acromion'],
    sides: 'R',
    highlights: { 'gluteus-medius': 'primary', 'gluteus-maximus': 'secondary', piriformis: 'secondary' },
  },
  // Side-lying hip abduction: bottom (left) leg slightly bent for stability, top (right) leg straight, a little
  // behind the body (hip ext 10°) with the toes forward / slightly down (IR 10°). The leg rises 35° (from just above
  // the floor, abd −7°, to abd 28°) in 2 s, holds 1 s, lowers over 3 s and turns round before touching the floor.
  // The top hand rests on the floor in front of the chest; head on a cushion (neck in line).
  'ex-sidelying-abduction': {
    id: 'ex-sidelying-abduction',
    duration: 6.2,
    base: 'SIDE_LYING',
    pose: {
      joints: {
        hip_L: { flex: 35, abd: 0 },
        knee_L: { flex: 50 },
        hip_R: { flex: -10, abd: -7, rot: -10 },
        knee_R: { flex: 0 },
        ankle_R: { dorsi: 0 },
        neck: { lat: -15 },
        head: { lat: -5 },
        // top hand on the floor in front of the chest (shoulder 75° keeps the upper arm off the ribs)
        shoulder_R: { flex: 75, abd: -52 },
        elbow_R: { flex: 10 },
        forearm_R: { sup: -150 },
        wrist_R: { flex: -50 },
      },
    },
    keys: [
      { t: 0, label: 'かかとから脚を上げる（2秒）' },
      { t: 0.32, pose: { joints: { hip_R: { flex: -10, abd: 28, rot: -10 } } }, hold: 1, label: '1秒キープ' },
      { t: 0.48, pose: { joints: { hip_R: { flex: -10, abd: 28, rot: -10 } } }, label: 'ゆっくり下ろす（3秒）' },
      { t: 0.97 },
    ],
    loop: 'loop',
    props: [
      { kind: 'mat', rotY: 90 },
      { kind: 'box', at: [0.75, 0.135, -0.01], size: [0.26, 0.133, 0.22] },
    ],
    camera: { dir: [-0.12, 0.42, 1] },
    focus: 'hip',
    frame: ['foot:calcaneus_post', 'toes:toe_tips', 'foot_L:calcaneus_post', 'scapula:acromion', 'hand:palm'],
    sides: 'R',
    highlights: { 'gluteus-medius': 'primary', 'gluteus-minimus': 'primary', 'tensor-fasciae-latae': 'secondary' },
  },
  // Lateral band walk: loop band just above the knees, athletic stance. One step to the right (right foot out,
  // left foot follows to hip width), pause, then the same back to the left — a seamless loop. Feet slide low
  // (「すり足のように」); the stance foot stays put because pelvis shift and hip angles ease together.
  'ex-band-walk': {
    id: 'ex-band-walk',
    duration: 6,
    base: 'STAND',
    pose: { ...BW_BASE, joints: { ...BW_BASE.joints, shoulder: { flex: 25, abd: 8 }, elbow: { flex: 70 }, forearm: { sup: -80 } } },
    keys: [
      { t: 0, pose: bwNarrow(0), hold: 0.6, label: '張りを保ったまま横へ一歩' },
      { t: 0.3, pose: bwWide(-0.1), label: '反対の脚を腰幅まで寄せる' },
      { t: 0.5, pose: bwNarrow(-0.2), hold: 0.6, label: '反対方向へも同じように一歩' },
      { t: 0.8, pose: bwWide(-0.1), label: '腰幅まで寄せる' },
    ],
    loop: 'loop',
    ground: true,
    anchor: null,
    props: kneeLoop(0.6, 0.064),
    camera: { dir: [-0.45, 0.25, 1] },
    focus: 'hip',
    frame: ['foot:calcaneus_post', 'foot_L:calcaneus_post', 'toes:toe_tips', 'toes_L:toe_tips', 'head:vertex', 'head:chin'],
    sides: 'both',
    highlights: {
      'gluteus-medius': 'primary',
      'gluteus-maximus': 'secondary',
      'gluteus-minimus': 'secondary',
      'tensor-fasciae-latae': 'secondary',
    },
  },
  // Standing isometric hip abduction: belt just above both knees, feet hip-width, knees soft (10°), pelvis level,
  // arms relaxed. The knees press outward against the belt (only ~1° of abduction — the legs hardly move, the
  // belt tightens), hold, then relax. Ankle inversion follows the hip angle so the soles stay flat (no rolling onto
  // the outer edge of the foot).
  'ex-isometric-abduction': {
    id: 'ex-isometric-abduction',
    duration: 8,
    base: 'STAND',
    pose: { joints: { hip: { flex: 5, abd: 2 }, knee: { flex: 10 }, ankle: { dorsi: 5, inv: 2 } } },
    keys: [
      { t: 0, label: '両膝を外へ押し広げる' },
      { t: 0.12, pose: { joints: { hip: { flex: 5, abd: 3 }, ankle: { dorsi: 5, inv: 3 } } }, label: '30秒キープ（力は5〜7割）' },
      { t: 0.76, pose: { joints: { hip: { flex: 5, abd: 3 }, ankle: { dorsi: 5, inv: 3 } } }, label: '力を抜いて休む' },
      { t: 0.88 },
    ],
    loop: 'loop',
    ground: true,
    props: kneeLoop(0.6, 0.064, 0.036, '#6a86a8'),
    camera: { dir: [-0.3, 0.22, 1] },
    focus: 'hip',
    frame: ['foot:calcaneus_post', 'foot_L:calcaneus_post', 'toes:toe_tips', 'toes_L:toe_tips', 'head:vertex', 'head:chin'],
    sides: 'both',
    highlights: {
      'gluteus-medius': 'primary',
      'gluteus-minimus': 'primary',
      'tensor-fasciae-latae': 'secondary',
      'gluteus-maximus': 'secondary',
    },
  },
  // Half-kneeling hip flexor stretch (right knee down on a mat, left foot forward, front knee 90°, trunk upright).
  // 1) squeeze the back-leg glute → posterior pelvic tilt 10° (lumbar flexes 10° so the trunk stays upright);
  // 2) keeping that tilt, shift the pelvis 7 cm forward (right hip −24.5° extension) → 30 s hold;
  // 3) right arm overhead + gentle side bend to the left → deeper stretch; 4) return.
  // Solved so the right knee, the right toes and the whole front foot stay on the mat (no sliding).
  'ex-hip-flexor-stretch': {
    id: 'ex-hip-flexor-stretch',
    duration: 9,
    base: 'HALF_KNEEL',
    pose: {
      root: { pos: [0, 0.496, 0] },
      joints: {
        hip_R: { flex: -5.03 },
        knee_R: { flex: 99.46 },
        ankle_R: { dorsi: 19.93 },
        hip_L: { flex: 90.25, abd: 3 },
        knee_L: { flex: 90.28 },
        ankle_L: { dorsi: 0.06 },
      },
    },
    keys: [
      { t: 0, label: '後ろ脚のお尻を締め、骨盤を後ろに傾ける' },
      { t: 0.1, pose: { root: { rot: [-10, 0, 0] }, joints: { lumbar: { flex: 10 }, hip_R: { flex: -15.03 }, hip_L: { flex: 80.25, abd: 3 } } }, label: '骨盤の向きのまま体重を少し前へ' },
      { t: 0.22, pose: HF_SHIFT, label: '30秒キープ' },
      { t: 0.5, pose: HF_SHIFT, label: '腕を上げ、反対側へ軽く傾ける' },
      { t: 0.6, pose: HF_DEEP, label: 'さらに伸ばしてキープ' },
      { t: 0.78, pose: HF_DEEP, label: 'ゆっくり戻る' },
      { t: 0.95 },
    ],
    loop: 'loop',
    ground: 0.008, // on the mat (8 mm)
    anchor: null,
    props: [{ kind: 'mat' }],
    camera: { dir: [-1, 0.2, 0.45] },
    focus: 'hip',
    frame: ['toes:toe_tips', 'toes_L:toe_tips', 'foot:calcaneus_post', 'head:vertex', 'hand:fingertips'],
    sides: 'R',
    highlights: {
      iliopsoas: 'primary',
      'rectus-femoris': 'secondary',
      'tensor-fasciae-latae': 'secondary',
      sartorius: 'secondary',
    },
  },
  // Supine figure-4 stretch (right side stretched): hook-lying → right ankle onto the left knee, right knee open →
  // hands behind the left thigh → pull gently toward the chest → 30 s hold → lower the foot → uncross.
  'ex-figure4-stretch': {
    id: 'ex-figure4-stretch',
    duration: 10,
    base: 'SUPINE',
    pose: { joints: { ...BR_HOOK, ...BR_ARMS } },
    keys: [
      { t: 0, label: '足首を反対の膝に乗せ、膝を外へ開く' },
      { t: 0.05, pose: F4_UP },
      { t: 0.1, pose: F4_OVER },
      { t: 0.15, pose: F4_FORMED, label: '太ももの裏を両手で抱える' },
      { t: 0.2, pose: F4_REACH },
      { t: 0.26, pose: F4_GRAB, label: 'ゆっくり胸へ引き寄せる' },
      { t: 0.34, pose: F4_PULL, label: '30秒キープ' },
      { t: 0.68, pose: F4_PULL, label: 'ゆっくり戻す' },
      { t: 0.74, pose: F4_GRAB },
      { t: 0.79, pose: F4_REACH },
      { t: 0.84, pose: F4_FORMED },
      { t: 0.89, pose: F4_OVER },
      { t: 0.94, pose: F4_UP },
      { t: 0.99 },
    ],
    loop: 'loop',
    ground: true,
    props: [{ kind: 'mat' }],
    camera: { dir: [-1, 0.42, 0.42] },
    focus: 'hip',
    frame: ['foot:calcaneus_post', 'foot_L:calcaneus_post', 'toes:toe_tips', 'toes_L:toe_tips', 'tibia:plateau', 'tibia_L:plateau', 'scapula:acromion', 'scapula_L:acromion'],
    sides: 'R',
    highlights: { piriformis: 'primary', 'gluteus-maximus': 'primary', 'gluteus-medius': 'secondary' },
  },

  // ── K2b ───────────────────────────────────────────────────────────────────────────────────────────────
  // Adductor squeeze (isometric): hook-lying (hips 45°), soft ball between the knees, arms by the sides.
  // Brace → squeeze slowly (~1.3 s) → 30 s hold (shown ~3.8 s) → release slowly → rest.
  'ex-adductor-squeeze': {
    id: 'ex-adductor-squeeze',
    duration: 8,
    base: 'SUPINE',
    pose: { joints: { ...SQ_HOOK, ...BR_ARMS } },
    keys: [
      { t: 0, label: 'お腹に軽く力を入れ、腰を床につける' },
      { t: 0.1, label: '両膝でボールをゆっくり押しつぶす' },
      { t: 0.26, pose: SQ_PRESS, label: '30秒キープ（痛みは3/10以下）' },
      { t: 0.74, pose: SQ_PRESS, label: 'ゆっくり力を抜く' },
      { t: 0.86, label: '30秒休んで繰り返す' },
    ],
    loop: 'loop',
    ground: true,
    props: [
      { kind: 'mat' },
      { kind: 'ball', at: { mix: ['femur_R:medial_epicondyle', 'femur_L:medial_epicondyle'], t: 0.5 }, radius: 0.083 },
    ],
    camera: { dir: [-0.6, 0.5, 1] },
    focus: 'hip',
    // knees + a point 9 cm above each knee (the ball's top) stay clear of the phase pill
    frame: ['tibia:plateau', 'tibia_L:plateau', 'pelvis:pubic_symphysis', { bone: 'femur', rest: [0.09, 0.52, 0.14] }, { bone: 'femur_L', rest: [0.09, 0.52, 0.14] }],
    sides: 'both',
    highlights: { 'adductor-longus': 'primary', 'adductor-magnus': 'primary', gracilis: 'secondary' },
  },
  // Isometric hamstring bridge: heels far away, knees 35–40°. Press the heels down & pull toward the body → lift the
  // pelvis a few cm (~1.2 s) → 30–45 s hold (shown ~4 s) → lower slowly → rest. Heels pinned (xz), body grounded.
  'ex-hamstring-bridge-iso': {
    id: 'ex-hamstring-bridge-iso',
    duration: 8,
    base: 'SUPINE',
    pose: { joints: { ...HB_START, ...BR_ARMS } },
    keys: [
      { t: 0, label: 'かかとで床を押し、手前に引くように力を入れる' },
      { t: 0.1, label: 'お尻を床から数cm持ち上げる' },
      { t: 0.25, pose: HB_HOLD, label: '30〜45秒キープ（腰は反らさない）' },
      { t: 0.74, pose: HB_HOLD, label: 'ゆっくり下ろす' },
      { t: 0.88, label: '1分休んで繰り返す' },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    props: [{ kind: 'mat' }],
    camera: { dir: [-1, 0.14, 0.2] },
    focus: 'hip',
    frame: ['thorax:spinous_T8', 'foot:calcaneus_post', 'toes:toe_tips', 'tibia:plateau'],
    sides: 'both',
    highlights: {
      'biceps-femoris': 'primary',
      semitendinosus: 'primary',
      semimembranosus: 'primary',
      'gluteus-maximus': 'secondary',
    },
  },
  // Seated sciatic nerve glide (slider): two smooth round trips (2.5 s each). Knee straightens while the face turns
  // up; knee bends while the face turns down — the two always move in opposite directions (no holding at the end).
  'ex-sciatic-nerve-glide': {
    id: 'ex-sciatic-nerve-glide',
    duration: 5,
    base: 'SIT_CHAIR',
    pose: { ...NG_SIT, joints: { ...NG_SIT.joints, ...NG_DOWN.joints } },
    keys: [
      { t: 0, label: '膝を伸ばしながら顔を上げる' },
      { t: 0.25, pose: NG_UP, label: '膝を曲げながら顔を下げる' },
      { t: 0.5, label: '膝を伸ばしながら顔を上げる' },
      { t: 0.75, pose: NG_UP, label: '膝を曲げながら顔を下げる' },
    ],
    loop: 'loop',
    camera: { dir: [-1, 0.15, 0.4] },
    frame: ['head:vertex', 'head:chin', 'toes:toe_tips', 'foot:calcaneus_post', 'pelvis:sacrum_post'],
    sides: 'R',
    highlights: {
      'biceps-femoris': 'primary',
      semitendinosus: 'primary',
      semimembranosus: 'primary',
      gastrocnemius: 'secondary',
    },
  },
  // Banded standing knee drive: standing on the left leg (knee soft, pelvis level, left hand on the wall), loop band
  // around both forefeet → drive the right knee above hip height (~1 s) → 3–5 s hold (trunk upright) → lower over 3 s
  // until the toes touch lightly → repeat. Left foot pinned (xz), body grounded.
  'ex-standing-knee-drive': {
    id: 'ex-standing-knee-drive',
    duration: 8,
    base: 'STAND',
    pose: { joints: KD_SHIFT },
    keys: [
      { t: 0, hold: 0.4, label: '膝を腰より高く引き上げる' },
      { t: 0.18, pose: KD_TOP, label: '3〜5秒止める（上体は起こしたまま）' },
      { t: 0.56, pose: KD_TOP, label: '3秒かけて下ろす' },
      { t: 0.94, label: '床に軽く触れたら繰り返す' },
    ],
    loop: 'loop',
    anchor: { point: 'foot_L:calcaneus_plantar', axes: 'xz' },
    ground: true,
    // the wall surface touches the left palm (palm skin ~7 mm beyond the palm landmark)
    props: [{ kind: 'wall', at: { at: 'hand_L:palm', off: [0.007, 0, 0] }, normal: [-1, 0, 0], width: 0.9, height: 1.9 }, ...feetLoop()],
    camera: { dir: [-1, 0.14, 0.32] },
    frame: ['head:vertex', 'toes:toe_tips', 'foot_L:calcaneus_post', 'hand_L:palm'],
    sides: 'R',
    highlights: {
      iliopsoas: 'primary',
      'rectus-femoris': 'secondary',
      'tensor-fasciae-latae': 'secondary',
      sartorius: 'secondary',
      'gluteus-medius': 'secondary',
    },
  },
  // Single-leg RDL (right leg): hinge at the hip with a long spine over 3 s → brief pause → squeeze the glute and push
  // through the heel to stand up over 2 s → single-leg stance. Right foot pinned (xz), body grounded.
  'ex-single-leg-rdl': {
    id: 'ex-single-leg-rdl',
    duration: 7,
    base: 'STAND',
    pose: { joints: RDL_TOP },
    keys: [
      { t: 0, hold: 0.3, label: '背すじを伸ばしたまま股関節から倒す（3秒）' },
      { t: 0.47, pose: RDL_BOTTOM, hold: 0.4, label: 'お尻を締め、かかとで押して起き上がる（2秒）' },
      { t: 0.82, label: '骨盤を水平に保って片脚で立つ' },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    camera: { dir: [-1, 0.18, -0.15] },
    frame: ['head:vertex', 'foot_L:calcaneus_post', 'toes:toe_tips', 'hand:fingertips'],
    sides: 'R',
    highlights: {
      'gluteus-maximus': 'primary',
      'biceps-femoris': 'primary',
      semitendinosus: 'primary',
      semimembranosus: 'primary',
      'gluteus-medius': 'secondary',
      'adductor-magnus': 'secondary',
      'erector-spinae': 'secondary',
    },
  },
  // Copenhagen plank (short lever): from the bottom (pelvis touching the floor) press the bench down with the top leg
  // and lift the hips over 3 s into a straight line, bringing the bottom leg up under the bench → 1 s hold → lower
  // over 3 s until the pelvis touches lightly. The left forearm is pinned (xyz); the bench is placed under the top knee.
  'ex-copenhagen-plank': {
    id: 'ex-copenhagen-plank',
    duration: 8,
    base: 'SIDE_PLANK',
    pose: { ...CP_BOTTOM, joints: { ...CP_COMMON, ...CP_BOTTOM.joints } },
    keys: [
      { t: 0, label: '上の脚でベンチを押し、腰を持ち上げる（3秒）' },
      { t: 0.37, pose: CP_TOP, hold: 1, label: '頭から膝まで一直線、下の脚も引き上げる' },
      { t: 0.5, pose: CP_TOP, label: '3秒かけて下ろす' },
      { t: 0.87, label: '腰が床に軽く触れたら繰り返す' },
    ],
    loop: 'loop',
    ground: true,
    anchor: { point: 'forearm_L:ulna_mid', axes: 'xyz' },
    props: [
      { kind: 'mat', rotY: 90 },
      { kind: 'bench', at: { at: 'tibia:plateau', off: [-0.213, -0.052, -0.188] } },
    ],
    camera: { dir: [0.15, 0.14, 1] },
    frame: ['head:vertex', 'foot_L:calcaneus_post', 'toes:toe_tips', 'forearm_L:olecranon', 'hand_L:fingertips'],
    sides: 'R',
    highlights: {
      'adductor-longus': 'primary',
      'adductor-magnus': 'secondary',
      gracilis: 'secondary',
      obliques: 'secondary',
    },
  },
  // 90/90 hip mobility: hands behind, spine tall → both knees up and over to the other side (left leg in front) →
  // back to the right-leg-front position → hands onto the front shin, lean forward from the hips with a straight back
  // → 20 s hold (shown ~2 s) → back up. Body grounded (buttocks / legs on the mat).
  'ex-90-90': {
    id: 'ex-90-90',
    duration: 9,
    base: 'LONG_SIT',
    pose: N_P,
    keys: [
      { t: 0, hold: 0.3, label: '手を後ろにつき、両膝を反対側へ倒し替える' },
      { t: 0.08, pose: N_HALF, pass: true },
      { t: 0.11, pose: N_QUARTER, pass: true },
      { t: 0.14, pose: N_MID, pass: true },
      { t: 0.17, pose: N_QUARTER_MIRROR, pass: true },
      { t: 0.2, pose: N_HALF_MIRROR, pass: true },
      { t: 0.26, pose: N_P_MIRROR, hold: 0.3, label: '同じように元の側へ倒し替える' },
      { t: 0.34, pose: N_HALF_MIRROR, pass: true },
      { t: 0.37, pose: N_QUARTER_MIRROR, pass: true },
      { t: 0.4, pose: N_MID, pass: true },
      { t: 0.43, pose: N_QUARTER, pass: true },
      { t: 0.46, pose: N_HALF, pass: true },
      { t: 0.52, hold: 0.2, label: '背すじを伸ばしたまま前のすねへ倒す' },
      { t: 0.565, pose: N_HANDS_LIFT, pass: true },
      { t: 0.6, pose: N_HANDS_UP, pass: true },
      { t: 0.67, pose: N_LEAN, label: '20秒キープ' },
      { t: 0.86, pose: N_LEAN, label: 'ゆっくり戻る' },
      { t: 0.91, pose: N_HANDS_UP, pass: true },
      { t: 0.945, pose: N_HANDS_LIFT, pass: true },
      { t: 0.97 },
    ],
    loop: 'loop',
    ground: true,
    props: [{ kind: 'mat', size: [1.5, 1.3], at: [0, 0, 0.12] }],
    camera: { dir: [-0.12, 1.5, 1] },
    frame: ['head:vertex', 'tibia:plateau', 'tibia_L:plateau', 'foot:talus', 'foot_L:talus', 'hand:palm', 'hand_L:palm'],
    sides: 'R',
    highlights: { piriformis: 'primary', 'gluteus-maximus': 'primary', 'gluteus-medius': 'secondary', 'gluteus-minimus': 'secondary' },
  },
};
