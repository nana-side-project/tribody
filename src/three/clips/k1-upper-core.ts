// k1 — shoulder / neck / core exercise clips. Owner after the engine agent: clip agent k1. See docs/ENGINE.md.
import type { ExerciseId } from '../../data/registry';
import type { Pose } from '../rig';
import type { Clip } from './types';

// ── K1b shared poses ──
// hook-lying (SUPINE): hips 45°, knees 104°, feet flat — pelvis, upper back, heels and forefeet on the floor
const HOOK_LYING = { hip: { flex: 45, abd: 4 }, knee: { flex: 104 }, ankle: { dorsi: -32 } };
// cross-body stretch: right arm forward at shoulder height and across the chest (horizontal adduction `abd`)
const CROSS_ARM_R = (abd: number) => ({
  scapula_R: { protr: -6, elev: -4 },
  shoulder_R: { flex: 90, abd, rot: 0 },
  elbow_R: { flex: 8 },
  forearm_R: { sup: -90 },
});
// left hand on the outside of the right arm just above the elbow (solved per arm position)
const CROSS_HAND_L_START = { shoulder_L: { flex: 45, abd: -25.6, rot: -66 }, elbow_L: { flex: 86.8 }, forearm_L: { sup: 10 }, wrist_L: { flex: 22.2 } };
const CROSS_HAND_L_PULL = { shoulder_L: { flex: 32.7, abd: -21.5, rot: -56.9 }, elbow_L: { flex: 106.8 }, forearm_L: { sup: -10.2 }, wrist_L: { flex: 22 } };
// doorway pec stretch: staggered stance (left foot forward) with the right forearm on the door jamb (90/90).
// Solved: heels fixed (R z −0.17, L z +0.20), feet flat; forearm vertical, palm flat toward +z on the jamb face.
const DOOR_START: Pose = {
  root: { pos: [0, 0.9, 0.043], rot: [0, 0, 0] },
  joints: {
    shoulder_R: { flex: 92.41, abd: 79.66, rot: -13.09 },
    elbow_R: { flex: 86.8 },
    forearm_R: { sup: -99.97 },
    hip_R: { flex: -12.61 },
    knee_R: { flex: 0 },
    ankle_R: { dorsi: 12.61 },
    hip_L: { flex: 15.79 },
    knee_L: { flex: 6 },
    ankle_L: { dorsi: -9.79 },
  },
};
// weight on the front leg: pelvis +8 cm, 6° forward lean of the whole (straight) body, blade back & down
const DOOR_STRETCH: Pose = {
  root: { pos: [0, 0.88, 0.123], rot: [6, 0, 0] },
  joints: {
    scapula_R: { protr: -10, elev: -4 },
    shoulder_R: { flex: 68.82, abd: 99.5, rot: 15.62 },
    elbow_R: { flex: 77.79 },
    forearm_R: { sup: -80.87 },
    hip_R: { flex: -12.28 },
    knee_R: { flex: 0 },
    ankle_R: { dorsi: 18.28 },
    hip_L: { flex: 30.06 },
    knee_L: { flex: 33.68 },
    ankle_L: { dorsi: 9.63 },
  },
};
// open book (side-lying, left side down): per-key trunk / arms / neck (solved, see the clip comment)
const OB_START: Pose = {
  joints: {
    neck: { lat: -16.96, rot: 0 },
    head: { rot: 0 },
    scapula_L: { protr: 12 },
    shoulder_L: { flex: 93.67, abd: 0.13, rot: 0 },
    scapula_R: { protr: 35 },
    shoulder_R: { flex: 94.92, abd: -39.67, rot: 0 },
  },
};
const OB_MID: Pose = {
  joints: {
    thorax: { rot: 18, lat: -3.09 },
    lumbar: { rot: 4, lat: -2.48 },
    neck: { lat: -9.87, rot: 22 },
    head: { rot: 6 },
    scapula_L: { protr: -9.75 },
    shoulder_L: { flex: 96.68, abd: 22.39, rot: 0 },
    scapula_R: { protr: -10 },
    shoulder_R: { flex: 90, abd: 50, rot: 0 },
  },
};
const OB_OPEN: Pose = {
  joints: {
    thorax: { rot: 40, lat: -6.89 },
    lumbar: { rot: 8, lat: -5.78 },
    neck: { lat: 11.4, rot: 50 },
    head: { rot: 15 },
    scapula_L: { protr: -29.46 },
    shoulder_L: { flex: 104.54, abd: 46.92, rot: 0 },
    scapula_R: { protr: -10 },
    shoulder_R: { flex: 90, abd: 115, rot: 0 },
  },
};
// quadruped (improved neutral): thighs vertical, hands under / just in front of the shoulders (shoulder width),
// shins and the tops of the feet on the mat, flat back. Solved with FK + grounding. (eng-motion: re-solved after the
// thumb was moved into the palm plane — the hands had rested on the drooping thumb with the palms 2.2 cm up; trunk
// pitch, hips and shoulders +3.4° bring the palms and fingers flat onto the mat.)
const QUAD: Pose = {
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
};
// cat / cow with hands & knees pinned (solved; see the clip comment; re-solved with QUAD by eng-motion)
const CAT: Pose = {
  root: { pos: [0, 0.49, -0.0232], rot: [48.77, 0, 0] },
  joints: {
    hip: { flex: 52.41 },
    knee: { flex: 92.77 },
    lumbar: { flex: 20 },
    thorax: { flex: 6 },
    neck: { flex: 20 },
    head: { flex: 12 },
    scapula: { protr: 30 },
    shoulder: { flex: 81.96, abd: -12.88, rot: 15 },
    wrist: { flex: -85 },
  },
};
const COW: Pose = {
  root: { pos: [0, 0.49, 0.0095], rot: [99.9, 0, 0] },
  joints: {
    hip: { flex: 99.19 },
    knee: { flex: 88.75 },
    lumbar: { flex: -20 },
    thorax: { flex: -4 },
    neck: { flex: -15 },
    head: { flex: -6 },
    scapula: { protr: -12 },
    shoulder: { flex: 76.75, abd: -10.27, rot: 15 },
    wrist: { flex: -85 },
  },
};
// `pass` keys halfway neutral → cat and cat → cow (eng-motion), pinned the same way (hands and knees stay on their
// spots within 3 mm; the plain blend slid the palms 1.5 cm and lifted them 7 mm mid-way)
const QUAD_CAT_MID: Pose = {
  root: { pos: [0, 0.49, -0.01], rot: [63.55, 0, 0] },
  joints: { lumbar: { flex: 10 }, thorax: { flex: 3 }, neck: { flex: 6 }, head: { flex: 6 }, scapula: { protr: 15 }, shoulder: { flex: 81.11, abd: -12.95, rot: 15 }, wrist: { flex: -85 }, hip: { flex: 65.4 }, knee: { flex: 91.25 } },
};
const CAT_COW_MID: Pose = {
  root: { pos: [0, 0.49, -0.0058], rot: [74.84, 0, 0] },
  joints: { lumbar: { flex: 0 }, thorax: { flex: 1 }, neck: { flex: 2.5 }, head: { flex: 3 }, scapula: { protr: 9 }, shoulder: { flex: 78.97, abd: -12.65, rot: 15 }, wrist: { flex: -85 }, hip: { flex: 76.17 }, knee: { flex: 90.76 } },
};
// bird dog: right arm forward + left leg back, both parallel to the floor (on top of QUAD)
const BIRD_R: Pose = {
  joints: {
    shoulder_R: { flex: 165, abd: 0, rot: 0 },
    elbow_R: { flex: 0 },
    forearm_R: { sup: -90 },
    wrist_R: { flex: 0 },
    hip_L: { flex: -15, abd: 0, rot: 0 },
    knee_L: { flex: 0 },
    ankle_L: { dorsi: -45 },
  },
};
const BIRD_L: Pose = {
  joints: {
    shoulder_L: { flex: 165, abd: 0, rot: 0 },
    elbow_L: { flex: 0 },
    forearm_L: { sup: -90 },
    wrist_L: { flex: 0 },
    hip_R: { flex: -15, abd: 0, rot: 0 },
    knee_R: { flex: 0 },
    ankle_R: { dorsi: -45 },
  },
};
// dead bug: opposite arm overhead + leg straight just above the floor (on top of the hook position in the clip)
const DEADBUG_R: Pose = { joints: { shoulder_R: { flex: 180, abd: 0, rot: 0 }, hip_L: { flex: 0, abd: 3, rot: 0 }, knee_L: { flex: 0 } } };
const DEADBUG_L: Pose = { joints: { shoulder_L: { flex: 180, abd: 0, rot: 0 }, hip_R: { flex: 0, abd: 3, rot: 0 }, knee_R: { flex: 0 } } };
// side plank (knees bent 90°) on the RIGHT forearm (right side down, head toward −X): hips down (start) / lifted
// to a straight line. Exact mirror of the solved left-forearm version (root rot [x, −y, −z], axial lat negated,
// R ⇄ L), so the working bottom side is the clip's 'R' side (the engine labels the clip's R side).
const SP_DOWN: Pose = {
  root: { pos: [0, 0.4, 0], rot: [2.05, 0, 88.06] },
  joints: { lumbar: { lat: -24 }, thorax: { lat: -30 }, shoulder_R: { abd: 17.07, flex: 8.35 } },
};
const SP_UP: Pose = {
  root: { pos: [0, 0.4, 0], rot: [5.36, 0, 66.12] },
  joints: { shoulder_R: { abd: 61.56, flex: 18.1 } },
};
// foam-roller thoracic extension (solved: pelvis down, back tangent to the roller at z −0.399, feet planted)
const ROLL_START: Pose = {
  root: { pos: [0, 0.3, 0], rot: [-71.63, 0, 0] },
  joints: { thorax: { flex: 0 }, hip: { flex: 58.87, abd: 4 }, knee: { flex: 95 }, ankle: { dorsi: -36.49 } },
};
const ROLL_EXT: Pose = {
  root: { pos: [0, 0.3, 0.01], rot: [-63.69, 0, 0] },
  joints: { thorax: { flex: -24 }, hip: { flex: 67.25, abd: 4 }, knee: { flex: 96.77 }, ankle: { dorsi: -35.17 } },
};
// kneeling bench lat stretch (solved with the knees pinned; elbows on the bench at the same spot in both keys;
// qa3-fix-clips: knee flexion +0.3…0.9° so the drawn knees rest on the mat together with the toes, shoulder flexion so the backs
// of the upper arms rest on the bench top (0.5 mm) in every key — they had sunk 5 mm into it / hovered 15 mm above)
const LAT_START: Pose = {
  root: { pos: [0, 0.49, 0], rot: [60, 0, 0] },
  joints: {
    thorax: { flex: 0 },
    neck: { flex: 0 },
    hip: { flex: 60.57 },
    knee: { flex: 90.26 },
    shoulder: { flex: 104.18, abd: -8.3, rot: -44.11 },
    elbow: { flex: 115.01 },
    forearm: { sup: -118.98 },
  },
};
// trunk down (as LAT_STRETCH) with the joined hands still above the head
const LAT_MID: Pose = {
  root: { pos: [0, 0.44, -0.19], rot: [84.13, 0, 0] },
  joints: {
    thorax: { flex: -9.97 },
    neck: { flex: 0 },
    hip: { flex: 110.31 },
    knee: { flex: 115.87 },
    shoulder: { flex: 163.65, abd: -7.54, rot: -36.21 },
    elbow: { flex: 55 },
    forearm: { sup: -76.63 },
  },
};
const LAT_STRETCH: Pose = {
  root: { pos: [0, 0.44, -0.19], rot: [84.13, 0, 0] },
  joints: {
    thorax: { flex: -9.97 },
    neck: { flex: 0 },
    hip: { flex: 110.31 },
    knee: { flex: 115.87 },
    shoulder: { flex: 160.3, abd: -8.49, rot: -47.06 },
    elbow: { flex: 119.79 },
    forearm: { sup: -123.72 },
  },
};
// upper trapezius stretch: head tilted to the left; left hand resting on the right side of the head
const TRAP_TILT = { neck: { lat: -30 }, head: { lat: -12 } };
const TRAP_HAND_L = {
  shoulder_L: { flex: 159, abd: 32.9, rot: -78 },
  elbow_L: { flex: 114.1 },
  forearm_L: { sup: -12.4 },
  wrist_L: { flex: 28.3 },
};

// wall slide pass keys (see the clip): 25 / 50 / 75 % of the way from the pressed start to the top (qa3-fix-clips:
// scapula as the blend protr 5 → 0 / elev −2 → −6; elbow, lean and ER re-solved for the wall contact)
const WS_25: Pose = { root: { rot: [-0.13, 0, 0] }, joints: { scapula: { protr: 3.75, elev: -3 }, shoulder: { flex: 103.75, abd: 6, rot: 7.67 }, elbow: { flex: 72.45 }, ankle: { dorsi: -0.13 } } };
const WS_50: Pose = { root: { rot: [1.06, 0, 0] }, joints: { scapula: { protr: 2.5, elev: -4 }, shoulder: { flex: 117.5, abd: 9, rot: 15.4 }, elbow: { flex: 59.32 }, ankle: { dorsi: 1.06 } } };
const WS_75: Pose = { root: { rot: [2.76, 0, 0] }, joints: { scapula: { protr: 1.25, elev: -5 }, shoulder: { flex: 131.25, abd: 12, rot: 23.08 }, elbow: { flex: 48.1 }, ankle: { dorsi: 2.76 } } };
// pressed start (shoulder blades forward a little, not shrugged) and top of the slide (blades set down)
const WS_PUSH: Pose = { root: { rot: [-0.64, 0, 0] }, joints: { ankle: { dorsi: -0.64 }, scapula: { protr: 5, elev: -2 }, shoulder: { flex: 90, abd: 3, rot: 0.2 }, elbow: { flex: 87.02 } } };
const WS_TOP: Pose = { root: { rot: [4.86, 0, 0] }, joints: { ankle: { dorsi: 4.86 }, scapula: { protr: 0, elev: -6 }, shoulder: { flex: 145, abd: 15, rot: 30.11 }, elbow: { flex: 38.58 } } };

// band row pass keys (see the clip): the palms move on the straight line between the arms-forward and the pulled
// positions (shoulder flex / abd and elbow solved, scapulae as the blend) — the plain blend dipped the hands ~6 cm
const ROW_PULL_25: Pose = { joints: { scapula: { elev: -3.25, protr: 1 }, shoulder: { flex: 35.08, abd: 9 }, elbow: { flex: 51.95 } } };
const ROW_PULL_50: Pose = { joints: { scapula: { elev: -3.5, protr: -6 }, shoulder: { flex: 18.31, abd: 10.38 }, elbow: { flex: 74.73 } } };
const ROW_PULL_75: Pose = { joints: { scapula: { elev: -3.75, protr: -13 }, shoulder: { flex: 2.17, abd: 12.29 }, elbow: { flex: 91.77 } } };
const ROW_BACK_25: Pose = { joints: { scapula: { elev: -3.75, protr: -15 }, shoulder: { flex: 1.96, abd: 12.68 }, elbow: { flex: 91.83 } } };
const ROW_BACK_50: Pose = { joints: { scapula: { elev: -3.5, protr: -10 }, shoulder: { flex: 18.09, abd: 10.79 }, elbow: { flex: 74.85 } } };
const ROW_BACK_75: Pose = { joints: { scapula: { elev: -3.25, protr: -5 }, shoulder: { flex: 34.93, abd: 9.26 }, elbow: { flex: 52.08 } } };

export const clips: Partial<Record<ExerciseId, Clip>> = {
  // ───────────── K1a: shoulder strengthening (rotator cuff / scapula) ─────────────
  // isometric external rotation: standing just behind a door frame, painful (right) arm toward the frame,
  // elbow 90° at the side with a towel roll; the back of the hand rests on the inner face of the jamb
  // (forearm pointing forward, wrist straight) and pushes outward without moving.
  'ex-isometric-er': {
    id: 'ex-isometric-er',
    duration: 7,
    base: 'STAND',
    pose: {
      joints: {
        shoulder_R: { abd: 7, flex: 0 },
        elbow_R: { flex: 90 },
        forearm_R: { sup: -85 },
        wrist_R: { flex: 0 },
      },
    },
    keys: [
      { t: 0, pose: { joints: { shoulder_R: { rot: -22 } } }, label: '手の甲をドア枠に当てる' },
      // back of the hand touches the jamb (hand dorsum x −0.285)
      { t: 0.12, pose: { joints: { shoulder_R: { rot: -5 } } }, label: '手の甲で外へ押す（力は30〜50%）' },
      { t: 0.22, pose: { joints: { shoulder_R: { rot: -5 } } }, label: '30秒キープ（呼吸は止めない）' },
      { t: 0.78, pose: { joints: { shoulder_R: { rot: -5 } } }, label: 'ゆっくり力を抜く' },
      { t: 0.9, pose: { joints: { shoulder_R: { rot: -22 } } } },
    ],
    loop: 'loop',
    props: [
      // edge of a door frame: its inner face is at x −0.285, level with the back of the hand
      { kind: 'box', at: [-0.325, 2.0, 0.33], size: [0.08, 2.0, 0.13] },
      // rolled towel squeezed between the upper arm just above the elbow and the trunk (lies front-to-back, follows the
      // trunk; solved so it presses ~1–1.5 mm into both; qa3-fix-clips: radius 34 → 32 mm for the 3 mm wider drawn waist,
      // which it had cut 3.5 mm into)
      { kind: 'towel', at: { bone: 'lumbar', rest: [0.1625, 1.135, -0.012] }, axis: 'z', radius: 0.032, length: 0.17 },
    ],
    // from behind-right: the posterior cuff, the 90° elbow at the side and the hand on the jamb
    camera: { dir: [-0.7, 0.55, -0.6] },
    frame: ['hand:knuckles', 'scapula:acromion', 'thorax:xiphoid', 'forearm:olecranon', 'scapula_L:acromion', 'humerus_L:lateral_epicondyle'],
    sides: 'R',
    highlights: { infraspinatus: 'primary', 'teres-minor': 'primary', supraspinatus: 'secondary' },
  },
  // side-lying external rotation: SIDE_LYING (left side down, painful right side up). Top elbow bent 90° on a
  // towel roll at the waist, light dumbbell; the forearm turns from in front of the belly (rot −65) up to just
  // short of vertical (rot +65 ≈ 20° from vertical) like a door on its hinge; pelvis and chest stay stacked.
  'ex-sidelying-er': {
    id: 'ex-sidelying-er',
    duration: 6,
    base: 'SIDE_LYING',
    pose: {
      // solved so the bottom shoulder, hip (greater trochanter), knee and foot all rest on the mat: roll −82.0°,
      // bottom hip adducted 5.5°, the top leg follows (−2.3°) so the knees stay together (qa3-fix-clips: re-solved with
      // the base pose's head cushion)
      root: { pos: [0, 0.2, 0], rot: [0, 0, -81.97] },
      joints: {
        hip_L: { abd: -5.47 },
        hip_R: { abd: -2.34 },
        // head on the base pose's cushion, neck nearly neutral
        neck: { lat: -4.81 },
        head: { lat: 0 },
        shoulder_R: { flex: 0, abd: 3 },
        elbow_R: { flex: 90 },
        forearm_R: { sup: -85 },
        wrist_R: { flex: 0 },
      },
    },
    keys: [
      { t: 0, pose: { joints: { shoulder_R: { rot: -65 } } }, label: 'ひじを脇につけたまま上げる（2秒）' },
      { t: 0.33, pose: { joints: { shoulder_R: { rot: 65 } } }, hold: 0.3, label: '3秒かけてゆっくり下ろす' },
      { t: 0.88, pose: { joints: { shoulder_R: { rot: -65 } } } },
    ],
    loop: 'loop',
    props: [
      // (the head cushion comes with the SIDE_LYING base pose)
      { kind: 'mat', rotY: 90 },
      { kind: 'dumbbell', hand: 'R', size: 0.7 },
      // rolled towel between the elbow and the waist (lies front-to-back along the trunk; solved so it touches the trunk
      // (1.8 mm) and the upper arm (0–3 mm) all through the rotation; qa3-fix-clips: re-solved for the wider drawn waist,
      // which it had cut 2.7 mm into)
      { kind: 'towel', at: { bone: 'lumbar', rest: [0.155, 1.135, -0.02] }, axis: 'z', radius: 0.026, length: 0.17 },
    ],
    camera: { dir: [-0.4, 0.45, 1] },
    frame: ['hand:palm', 'humerus:head', 'forearm:olecranon', 'pelvis:iliac_crest_mid', 'thorax:sternum_body', 'head:vertex'],
    sides: 'R',
    highlights: { infraspinatus: 'primary', 'teres-minor': 'primary', supraspinatus: 'secondary', deltoid: 'secondary' },
  },
  // prone Y-T-W on a narrow bench (top 0.68 m, 0.26 m wide) so the arms hang free over its sides; the head
  // stays neutral beyond the bench end (chin slightly tucked). Placement is fixed (ground off): the chest rests
  // on the bench top (thorax low point 0.680), fingertips ~4 cm above the floor when hanging. Arm DOFs were
  // solved for "thumbs up" (radial styloid toward the ceiling): Y = flex 176 / abd 38 / ER 15 (arm in line with
  // the trunk, 37° out); T = flex 90 / horizontal abd 90 / ER 90; W = ext 25 / abd 50 / ER 95 with elbows 90°
  // (forearms point forward-out, level). Shoulder blades: slightly protracted when hanging, set back & down at
  // each top. Tempo compressed to fit all three letters in one 12 s loop (≈1.3 s up, 0.8 s hold, 1.6 s down per
  // letter; the dose is 2 s / 2 s / 3 s).
  'ex-prone-ytw': {
    id: 'ex-prone-ytw',
    duration: 12,
    base: 'PRONE',
    pose: {
      root: { pos: [0, 0.788, 0], rot: [90, 0, 0] },
      joints: {
        neck: { flex: 2 },
        head: { flex: 6 },
        scapula: { protr: 8 },
        shoulder: { flex: 90, abd: 5, rot: 0 },
        elbow: { flex: 2 },
        forearm: { sup: -90 },
        wrist: { flex: 0 },
      },
    },
    keys: [
      { t: 0, label: 'Y：親指を上にして斜め前へ' },
      { t: 0.11, pose: { joints: { scapula: { protr: -12, elev: -5 }, shoulder: { flex: 176, abd: 38, rot: 15 } } }, hold: 0.8, label: '止めて、ゆっくり下ろす' },
      { t: 0.31 },
      { t: 0.333, label: 'T：親指を上にして真横へ' },
      { t: 0.443, pose: { joints: { scapula: { protr: -15, elev: -5 }, shoulder: { flex: 90, abd: 90, rot: 90 } } }, hold: 0.8, label: '止めて、ゆっくり下ろす' },
      { t: 0.643 },
      { t: 0.667, label: 'W：ひじを後ろに引き前腕を外へ' },
      {
        t: 0.777,
        pose: { joints: { scapula: { protr: -15, elev: -6 }, shoulder: { flex: -25, abd: 50, rot: 95 }, elbow: { flex: 90 } } },
        hold: 0.8,
        label: '止めて、ゆっくり下ろす',
      },
      { t: 0.977 },
    ],
    loop: 'loop',
    ground: false,
    // slate-coloured bench so it stands out from the skin (a beige bench vanished under the body and the figure read
    // as standing)
    props: [{ kind: 'box', at: [0, 0.68, -0.225], size: [0.26, 0.68, 1.55], color: '#8d9cab' }],
    // from above the feet end, slightly to the right: the back (trapezius / rhomboids), both arms tracing the letters
    // and the side of the bench under the body (straight from above the narrow bench is hidden by the body)
    camera: { dir: [-0.25, 1.5, -0.65] },
    // the engine frames 5 sample times only, so fixed thorax points mark the Y and T fingertip extents
    frame: [
      'hand:fingertips',
      'hand_L:fingertips',
      'head:vertex',
      'thorax:spinous_T12',
      { bone: 'thorax', rest: [0.93, 1.42, -0.04] },
      { bone: 'thorax_L', rest: [0.93, 1.42, -0.04] },
      { bone: 'thorax', rest: [0.72, 1.97, -0.04] },
      { bone: 'thorax_L', rest: [0.72, 1.97, -0.04] },
    ],
    sides: 'both',
    highlights: { trapezius: 'primary', rhomboids: 'primary', infraspinatus: 'secondary', supraspinatus: 'secondary', 'teres-minor': 'secondary', deltoid: 'secondary' },
  },
  // wall slide: facing the wall, elbows at shoulder height and shoulder width, the little-finger side of the
  // forearms and hands on the wall. Solved so the forearm (elbow end) and the ulnar edge of the hand stay on the wall
  // plane (z 0.3595, gap ≤ 0.5 mm, never inside): start elbows 88°; pressing (scapulae protracted +5, not shrugged)
  // leans the body back 0.6°; at the top (flex 145 / abd 15 = a V, ER 30 so the ulnar border still faces the wall,
  // elbows 39°) the body leans 4.9° toward the wall over the planted heels (lean = root pitch + equal ankle
  // dorsiflexion, feet flat). The scapula setting follows the cues (qa3-fix-clips): a small forward push, then the
  // blades are set DOWN (elev −6) while the arm rotates them upward by itself (autoScapula adds upRot 25 / protr 7.6
  // at 145°), so the trapezius (a primary here) stays at its resting length or shortens (mean 1.00 → 1.07 push →
  // 1.02 top) instead of being stretched like in a stretch (it used to reach 1.20 with protr 12 on every key) while the
  // serratus anterior shortens (0.79 → 0.65).
  // Between the press and the top, three `pass` keys (25 / 50 / 75 %: shoulder flex/abd and scapula as the straight
  // blend; elbow, lean and ER solved) keep the forearm and the hand edge on the wall plane all the way, and the slide
  // stays one smooth movement.
  'ex-wall-slide': {
    id: 'ex-wall-slide',
    duration: 8,
    base: 'STAND',
    pose: { joints: { forearm: { sup: -90 }, wrist: { flex: 0 } } },
    keys: [
      {
        t: 0,
        pose: { root: { rot: [-0.04, 0, 0] }, joints: { ankle: { dorsi: -0.04 }, shoulder: { flex: 90, abd: 3, rot: 0.05 }, elbow: { flex: 87.64 } } },
        label: '前腕で壁を軽く押し、肩甲骨を前へ',
      },
      { t: 0.1, pose: WS_PUSH, label: '押したまま斜め上へ滑らせる（3秒）' },
      { t: 0.19375, pose: WS_25, pass: true },
      { t: 0.2875, pose: WS_50, pass: true },
      { t: 0.38125, pose: WS_75, pass: true },
      { t: 0.475, pose: WS_TOP, hold: 0.4, label: '肩甲骨を下げながらゆっくり戻す（3秒）' },
      { t: 0.61875, pose: WS_75, pass: true },
      { t: 0.7125, pose: WS_50, pass: true },
      { t: 0.80625, pose: WS_25, pass: true },
      { t: 0.9, pose: WS_PUSH },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    // the wall plane touches the forearms and the ulnar edge of the hands (0–0.5 mm over the whole slide)
    props: [{ kind: 'wall', at: [0, 0, 0.3595], normal: [0, 0, -1], width: 1.4, height: 2.2 }],
    // from behind-right: the shoulder blades rotating upward and the forearms tracing a V on the wall
    camera: { dir: [-0.5, 0.35, -0.8] },
    frame: ['hand:fingertips', 'hand_L:fingertips', 'scapula:inferior_angle', 'scapula_L:inferior_angle', 'forearm:olecranon', 'forearm_L:olecranon', 'thorax:spinous_T12'],
    sides: 'both',
    highlights: { 'serratus-anterior': 'primary', trapezius: 'primary', deltoid: 'secondary' },
  },
  // push-up plus, incline version on a knee-height box (台, 0.45 m: the text starts on the wall or a box before
  // progressing to the knees / floor). Straight body from head to heels on the toes, elbows locked, hands
  // flat on the box (palm and fingers on it, wrists ~70° extended) just in front of the shoulders. Toes are pinned;
  // for each scapula setting the body pitch, shoulder flexion / abduction and wrist were solved so both hands lie flat
  // at the same spot of the box (qa3-fix-clips, after the shoulder-girdle change moved the glenoid: the palms had sunk
  // 4.7 mm into the box when retracting and the fingers hovered 14 mm above it):
  // (pitch / flex / abd / wrist) neutral 49.0° / 62.9 / 2.1 / −69.7, retracted (protr −15, chest sinks) 50.5 / 63.8 /
  // 3.8 / −70.0, plus (protr +25, upper back rounded 4°) 44.9 / 64.5 / 0.7 / −69.4, plus a `pass` key halfway through
  // each push (solved the same way: the plain blend lifted the hands 7 mm). Toe extension follows the pitch.
  'ex-push-up-plus': {
    id: 'ex-push-up-plus',
    duration: 7,
    base: 'STAND',
    pose: {
      joints: {
        shoulder: { rot: 0 },
        elbow: { flex: 0 },
        forearm: { sup: -160 },
        ankle: { dorsi: 0 },
        neck: { flex: 0 },
      },
    },
    keys: [
      {
        t: 0,
        pose: { root: { rot: [48.96, 0, 0] }, joints: { shoulder: { flex: 62.88, abd: 2.06 }, wrist: { flex: -69.74 }, toes: { ext: 46.96 } } },
        label: '肘を伸ばしたまま肩甲骨を寄せる',
      },
      { t: 0.065, pose: { root: { rot: [49.85, 0, 0] }, joints: { shoulder: { flex: 63.46, abd: 2.98 }, wrist: { flex: -69.91 }, scapula: { protr: -7.5 }, toes: { ext: 47.85 } } }, pass: true },
      {
        t: 0.13,
        pose: { root: { rot: [50.47, 0, 0] }, joints: { shoulder: { flex: 63.84, abd: 3.79 }, wrist: { flex: -70.02 }, scapula: { protr: -15 }, toes: { ext: 48.47 } } },
        hold: 0.2,
        label: '台を押して肩甲骨を前へ押し出す',
      },
      { t: 0.244, pose: { root: { rot: [47.92, 0, 0] }, joints: { shoulder: { flex: 64.28, abd: 1.54 }, wrist: { flex: -69.75 }, scapula: { protr: 5 }, thorax: { flex: 2 }, toes: { ext: 45.92 } } }, pass: true },
      {
        t: 0.33,
        pose: { root: { rot: [44.92, 0, 0] }, joints: { shoulder: { flex: 64.45, abd: 0.71 }, wrist: { flex: -69.38 }, scapula: { protr: 25 }, thorax: { flex: 4 }, toes: { ext: 42.92 } } },
        hold: 1.9,
        label: '背中の上を丸めて2秒キープ',
      },
      {
        t: 0.62,
        pose: { root: { rot: [44.92, 0, 0] }, joints: { shoulder: { flex: 64.45, abd: 0.71 }, wrist: { flex: -69.38 }, scapula: { protr: 25 }, thorax: { flex: 4 }, toes: { ext: 42.92 } } },
        label: 'ゆっくり戻す',
      },
      { t: 0.88, pose: { root: { rot: [48.96, 0, 0] }, joints: { shoulder: { flex: 62.88, abd: 2.06 }, wrist: { flex: -69.74 }, toes: { ext: 46.96 } } } },
    ],
    loop: 'loop',
    anchor: { point: 'toes:toes_mid', axes: 'xyz' },
    ground: true,
    // box top at the palms' lowest skin point (y 0.4645 — it used to be the drooping thumb tip, 1.5 cm lower than the
    // palm), wide enough for both hands
    props: [{ kind: 'box', at: [0, 0.4645, 0.52], size: [0.95, 0.4645, 0.4] }],
    camera: { dir: [-1, 0.35, 0.05] },
    frame: ['hand:palm', 'head:vertex', 'scapula:inferior_angle', 'scapula_L:acromion', 'pelvis:psis', 'thorax:spinous_T4', 'toes:toe_tips'],
    sides: 'both',
    highlights: { 'serratus-anterior': 'primary', 'pectoralis-major': 'secondary', 'triceps-brachii': 'secondary', subscapularis: 'secondary', deltoid: 'secondary' },
  },
  // band row: facing a post, band anchored at lower-chest height (1.13 m), thumbs-up grip, arms forward.
  // Pull: elbows travel back close to the sides (shoulder ext 15 / abd 15, elbows 105°) while the shoulder
  // blades retract (protr +8 → −20) and stay down (elev −3/−4); 2 s pull, 2 s hold, 3 s return, then the
  // blades open forward slightly (last second). Trunk and neck stay still. Hand path 1.15 → 1.12 m: `pass` keys
  // (eng-motion) keep the palms on the straight line toward / away from the post (the plain blend dipped ~6 cm).
  'ex-band-row': {
    id: 'ex-band-row',
    duration: 8,
    base: 'STAND',
    pose: { joints: { forearm: { sup: -90 }, wrist: { flex: 0 } } },
    keys: [
      {
        t: 0,
        pose: { joints: { shoulder: { flex: 62, abd: 8 }, elbow: { flex: 5 }, scapula: { protr: 8, elev: -3 } } },
        label: 'ひじを後ろへ引き、肩甲骨を寄せる（2秒）',
      },
      { t: 0.0625, pose: ROW_PULL_25, pass: true },
      { t: 0.125, pose: ROW_PULL_50, pass: true },
      { t: 0.1875, pose: ROW_PULL_75, pass: true },
      {
        t: 0.25,
        pose: { joints: { shoulder: { flex: -15, abd: 15 }, elbow: { flex: 105 }, scapula: { protr: -20, elev: -4 } } },
        label: '引ききって2秒止める',
      },
      {
        t: 0.5,
        pose: { joints: { shoulder: { flex: -15, abd: 15 }, elbow: { flex: 105 }, scapula: { protr: -20, elev: -4 } } },
        label: '3秒かけて腕を前へ戻す',
      },
      { t: 0.59375, pose: ROW_BACK_25, pass: true },
      { t: 0.6875, pose: ROW_BACK_50, pass: true },
      { t: 0.78125, pose: ROW_BACK_75, pass: true },
      {
        t: 0.875,
        pose: { joints: { shoulder: { flex: 62, abd: 8 }, elbow: { flex: 5 }, scapula: { protr: 0, elev: -3 } } },
        label: '最後に肩甲骨を軽く前へ開く',
      },
    ],
    loop: 'loop',
    props: [
      { kind: 'box', at: [0, 1.6, 0.97], size: [0.06, 1.6, 0.06] },
      { kind: 'band', from: [0, 1.13, 0.94], to: 'hand:palm' },
      { kind: 'band', from: [0, 1.13, 0.94], to: 'hand_L:palm' },
    ],
    // from behind-right: the shoulder blades squeezing together, elbows going back, bands to the post
    camera: { dir: [-0.75, 0.45, -0.55] },
    frame: ['hand:palm', 'hand_L:palm', 'scapula:acromion', 'scapula_L:acromion', 'scapula:inferior_angle', 'forearm:olecranon', { bone: 'pelvis', rest: [0, 1.13, 0.94] }],
    sides: 'both',
    highlights: { rhomboids: 'primary', trapezius: 'primary', 'latissimus-dorsi': 'secondary', deltoid: 'secondary', 'biceps-brachii': 'secondary' },
  },
  // band external rotation (sample, refined): elbow at the side bent ~90° with a towel roll, band anchored on
  // the figure's left at navel height. Rotating about a slightly abducted humerus lifts the hand ~9 cm, so the
  // elbow opens 96° → 84° over the arc to keep the hand on a level path (hand height 1.10–1.12 m throughout).
  'ex-band-er': {
    id: 'ex-band-er',
    duration: 6,
    base: 'STAND',
    pose: {
      joints: {
        shoulder_R: { abd: 7, flex: 0 },
        forearm_R: { sup: -85 },
        wrist_R: { flex: 0 },
      },
    },
    keys: [
      // forearm in front of the belly
      { t: 0, pose: { joints: { shoulder_R: { rot: -45 }, elbow_R: { flex: 96 } } }, label: 'ひじを脇につけたまま外へ開く（2秒）' },
      // forearm points obliquely forward-out
      { t: 0.33, pose: { joints: { shoulder_R: { rot: 45 }, elbow_R: { flex: 84 } } }, hold: 0.3, label: '3秒かけてゆっくり戻す' },
      { t: 0.88, pose: { joints: { shoulder_R: { rot: -45 }, elbow_R: { flex: 96 } } } },
    ],
    loop: 'loop',
    props: [
      // post on the figure's left; band at navel height, horizontal to the hand
      { kind: 'box', at: [0.42, 1.25, 0.24], size: [0.05, 1.25, 0.05] },
      { kind: 'band', from: [0.395, 1.1, 0.24], to: 'hand:palm' },
      // rolled towel between the elbow and the trunk (lies front-to-back, follows the trunk; solved so it touches the
      // trunk (1.5 mm) and the upper arm (1–2.7 mm) all through the rotation, the forearm clear; qa3-fix-clips: re-solved
      // for the wider drawn waist, which it had cut 3.5 mm into)
      { kind: 'towel', at: { bone: 'lumbar', rest: [0.1625, 1.135, -0.012] }, axis: 'z', radius: 0.032, length: 0.14 },
    ],
    // from above-front: the forearm swinging out like a door while the elbow stays at the side
    camera: { dir: [-0.2, 1.1, 0.6] },
    // the post (a rest point on the pelvis frame, which does not move here) stays in view
    frame: ['hand:palm', 'scapula:acromion', 'thorax:xiphoid', 'forearm:olecranon', 'scapula_L:acromion', 'head:vertex', { bone: 'pelvis_L', rest: [0.42, 1.1, 0.24] }],
    sides: 'R',
    highlights: { infraspinatus: 'primary', 'teres-minor': 'primary', supraspinatus: 'secondary' },
  },

  // ───────────── K1b: shoulder / neck stretches & mobility, core ─────────────
  // chin tuck (craniocervical flexion): hook-lying, thin folded towel (2.2 cm) under the head, eyes to the ceiling.
  // A gentle nod (head flex +13) about the occiput resting on the towel: solved so the back of the head stays
  // on the towel (head low point 0.022 at both keys) — the upper neck drops toward the towel (neck −3.8 → −8.75
  // at C7/T1 = the lordosis flattening) instead of the head lifting or pressing down.
  'ex-chin-tuck': {
    id: 'ex-chin-tuck',
    duration: 7,
    base: 'SUPINE',
    pose: { joints: { ...HOOK_LYING, neck: { flex: -3.8 }, head: { flex: 0 } } },
    keys: [
      { t: 0, label: 'あごを軽く引いてうなずく' },
      { t: 0.14, pose: { joints: { neck: { flex: -8.75 }, head: { flex: 13 } } }, label: '10秒キープ（呼吸は止めない）' },
      { t: 0.74, pose: { joints: { neck: { flex: -8.75 }, head: { flex: 13 } } }, label: 'ゆっくり力を抜く' },
      { t: 0.9 },
    ],
    loop: 'loop',
    ground: true,
    props: [
      { kind: 'mat' },
      // thin folded towel under the head (top = the head's low point)
      { kind: 'towel', at: [0, 0.022, -0.69], size: [0.3, 0.022, 0.22] },
    ],
    // near-profile from the right: the nod (chin toward the throat) happens in the image plane, with the deep neck
    // flexors in front of the cervical spine and the head staying on the towel
    camera: { dir: [-1, 0.3, 0.12] },
    focus: 'neck',
    sides: 'both',
    highlights: { 'deep-neck-flexors': 'primary' },
  },
  // cross-body posterior shoulder stretch (right): standing tall, facing forward (no trunk rotation). The right arm
  // is raised forward to shoulder height and across the chest (flex 90 → horizontal adduction −20, then −42 when
  // pulled), elbow nearly straight, thumb up; the shoulder blade is held back and down (protr −6 / elev −4) so the
  // stretch stays in the back of the shoulder instead of the blade sliding forward. Left hand solved for each arm
  // position: palm on the outside of the right arm just above the elbow, pressing toward the chest, left elbow
  // below the arm in front of the chest.
  'ex-cross-body-stretch': {
    id: 'ex-cross-body-stretch',
    duration: 8,
    base: 'STAND',
    keys: [
      // setup: the arm is already forward at shoulder height, pointing across the body
      { t: 0, pose: { joints: { ...CROSS_ARM_R(-20) } }, label: '反対の手で肘のすぐ上を持つ' },
      { t: 0.12, pose: { joints: { ...CROSS_ARM_R(-20), ...CROSS_HAND_L_START } }, label: '胸へゆっくり引き寄せる' },
      { t: 0.26, pose: { joints: { ...CROSS_ARM_R(-42), ...CROSS_HAND_L_PULL } }, label: '30秒キープ（肩は下げたまま）' },
      { t: 0.74, pose: { joints: { ...CROSS_ARM_R(-42), ...CROSS_HAND_L_PULL } }, label: 'ゆっくり戻す' },
      { t: 0.86, pose: { joints: { ...CROSS_ARM_R(-20), ...CROSS_HAND_L_START } } },
    ],
    loop: 'loop',
    // 3/4 front-right, slightly above: the arm across the chest at shoulder height, the left hand holding it just
    // above the elbow, and the stretched posterior shoulder at the edge of the silhouette (a steep top view hid the
    // left hand and the shoulder height)
    camera: { dir: [-0.6, 0.5, 1] },
    focus: 'shoulder',
    frame: ['hand:fingertips', 'forearm_L:olecranon', 'scapula_L:acromion', 'head:vertex'],
    sides: 'R',
    highlights: { infraspinatus: 'primary', 'teres-minor': 'primary', deltoid: 'primary', 'posterior-capsule': 'secondary' },
  },
  // doorway pec stretch (right): staggered stance in a door frame (left foot forward, heels 0.37 m apart), right
  // elbow bent 90° at shoulder height with the forearm and palm flat on the jamb's face. Shifting the weight onto
  // the front leg moves the pelvis 8 cm forward with a 6° whole-body lean (neutral spine, no lumbar extension);
  // the shoulder blade sets back and down (protr −10 / elev −4) and the shoulder horizontally abducts ≈ 19°.
  // Solved numerically: both feet stay flat at the same spot (heels anchored), and the forearm stays on the jamb
  // face (front z 0.124, same height; slides < 1.5 cm sideways) at both keys.
  'ex-doorway-pec-stretch': {
    id: 'ex-doorway-pec-stretch',
    duration: 8,
    base: 'STAND',
    keys: [
      { t: 0, pose: DOOR_START, label: '前の脚に体重を移し、体を前に出す' },
      { t: 0.22, pose: DOOR_STRETCH, label: '肩甲骨を軽く後ろ・下へ、30秒キープ' },
      { t: 0.76, pose: DOOR_STRETCH, label: 'ゆっくり戻す' },
      { t: 0.94, pose: DOOR_START },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    // right jamb centred on the forearm (x −0.492), its face toward the figure at z 0.124
    props: [{ kind: 'doorframe', at: [-0.032, 0, 0.184], width: 0.85, height: 2.05 }],
    // from above the front-right: the chest (pectorals) moving forward through the doorway while the arm stays
    // back on the jamb, so the shoulder visibly opens (horizontal abduction); a low front view hid the forearm
    // behind the jamb and the change was barely visible
    camera: { dir: [-0.25, 1.3, 0.6] },
    focus: 'shoulder',
    frame: ['hand:fingertips', 'forearm:olecranon', 'scapula_L:acromion', 'thorax:xiphoid', 'head:vertex'],
    sides: 'R',
    highlights: { 'pectoralis-minor': 'primary', 'pectoralis-major': 'primary', subscapularis: 'secondary', deltoid: 'secondary' },
  },
  // open book (right arm opens): side-lying on the left, hips & knees 90°, knees stacked, head on a cushion,
  // both arms straight forward at shoulder height (right hand resting on the left). The top arm lifts to the
  // ceiling and opens toward the floor behind while the eyes follow the hand: thorax rotates 40° + lumbar 8°,
  // the arm horizontally abducts to 115° (≈ 25° past the frontal plane, hand stays ~38 cm above the floor).
  // Solved at each key: the pelvis and knees stay put; the upper trunk settles toward the floor (small side-bend,
  // bottom shoulder stays on the floor); the bottom arm stays on the floor (it horizontally abducts as the chest
  // turns away); the head stays on the 14 cm cushion (neck side-bend −17° → +11° as the head turns).
  'ex-open-book': {
    id: 'ex-open-book',
    duration: 8,
    base: 'SIDE_LYING',
    pose: {
      root: { pos: [0, 0.2, 0], rot: [-2.96, 0, -81.98] },
      joints: {
        hip: { flex: 90 },
        hip_L: { abd: 0 },
        hip_R: { abd: -8 },
        knee: { flex: 90 },
        ankle: { dorsi: -10 },
        head: { lat: 0 },
        elbow: { flex: 0 },
        forearm: { sup: -90 },
        wrist: { flex: 0 },
      },
    },
    keys: [
      { t: 0, pose: OB_START, label: '上の手を天井の方へ持ち上げる' },
      { t: 0.14, pose: OB_MID, label: '目で手を追いながら胸を開く' },
      { t: 0.34, pose: OB_OPEN, label: '息を吐きながら3秒キープ' },
      { t: 0.64, pose: OB_OPEN, label: 'ゆっくり元に戻す' },
      { t: 0.8, pose: OB_MID },
      { t: 0.94, pose: OB_START },
    ],
    loop: 'loop',
    ground: true,
    // the cushion under the head (top 0.14 m = 1.35 × the 0.104 edge height) comes with the SIDE_LYING base pose
    props: [{ kind: 'mat', rotY: 90 }],
    // from above the feet end: the arm traces its arc (forward → ceiling → toward the floor behind) and the two arms
    // visibly separate like the covers of a book, the stacked knees still in view (steeper than before so the
    // figure is larger in the card)
    camera: { dir: [-0.75, 1.2, 0.3] },
    focus: 'shoulder',
    frame: ['hand:fingertips', 'hand_L:fingertips', 'head:vertex', 'pelvis:iliac_crest_mid', 'femur:lateral_epicondyle', 'femur_L:lateral_epicondyle'],
    sides: 'R',
    highlights: { 'pectoralis-major': 'primary', obliques: 'primary', 'pectoralis-minor': 'secondary' },
  },
  // cat-cow: quadruped (hands just in front of the shoulders, knees under the hips, shins & tops of the feet on
  // the mat). Hands and knees are pinned: for each spine shape the pelvic tilt, hips and shoulders were solved so
  // the palms (≤ 4 mm) and knees stay put. With a rigid rib cage and straight arms the chest keeps its tilt, so the
  // rounding / arching shows where it really happens most — pelvis + lumbar (cat: posterior tilt, lumbar +20,
  // thoracolumbar +6, back rises ~6 cm; cow: anterior tilt, lumbar −20, back sinks ~3.5 cm, chest forward),
  // plus the shoulder blades spreading (protr +30) / drawing together (−12) and a moderate head nod / lift.
  // One breath cycle ≈ 6 s.
  'ex-cat-cow': {
    id: 'ex-cat-cow',
    duration: 6,
    base: 'QUADRUPED',
    pose: QUAD,
    keys: [
      { t: 0, label: '息を吐きながら背中を丸める' },
      { t: 0.15, pose: QUAD_CAT_MID, pass: true },
      { t: 0.3, pose: CAT, label: '床を押して肩甲骨の間を広げる' },
      { t: 0.38, pose: CAT, label: '息を吸いながら胸を前へ、背中を反らす' },
      { t: 0.55, pose: CAT_COW_MID, pass: true },
      { t: 0.72, pose: COW },
      { t: 0.8, pose: COW },
    ],
    loop: 'loop',
    ground: true,
    props: [{ kind: 'mat', rotY: 0 }],
    camera: { dir: [-1, 0.35, 0.25] },
    frame: ['head:vertex', 'hand:fingertips', 'toes:toe_tips', 'pelvis:coccyx', 'thorax:spinous_T7'],
    sides: 'both',
    highlights: { 'erector-spinae': 'primary', multifidus: 'primary', 'rectus-abdominis': 'primary', obliques: 'secondary', 'serratus-anterior': 'secondary' },
  },
  // bird dog: from the quadruped neutral (flat back, eyes to the floor) the right arm reaches forward and the left
  // leg back until both are parallel to the floor (trunk pitch 75° → arm flex 165°, thigh −15° = horizontal),
  // thumb up, knee straight, foot relaxed in line with the shin (ankle −45: the toes clear the mat as the knee
  // straightens); the spine and pelvis stay exactly as in the neutral (no lumbar
  // extension, no pelvic rotation), supported on the left hand and the right knee. Then the other side.
  // Hold shortened to fit one 11 s loop for both sides (≈1.6 s reach, 1.9 s hold, 1.4 s return; the label says the
  // real 5 s).
  'ex-bird-dog': {
    id: 'ex-bird-dog',
    duration: 11,
    base: 'QUADRUPED',
    pose: QUAD,
    keys: [
      { t: 0, label: '右腕を前へ、左脚を後ろへ伸ばす' },
      { t: 0.15, pose: BIRD_R, label: '5秒キープ（背中は平らに）' },
      { t: 0.32, pose: BIRD_R, label: 'ゆっくり戻す' },
      { t: 0.45 },
      { t: 0.5, label: '左腕と右脚も同様に伸ばす' },
      { t: 0.65, pose: BIRD_L, label: '5秒キープ（背中は平らに）' },
      { t: 0.82, pose: BIRD_L, label: 'ゆっくり戻す' },
      { t: 0.95 },
    ],
    loop: 'loop',
    ground: true,
    props: [{ kind: 'mat', rotY: 0 }],
    camera: { dir: [-1, 0.6, 0.35] },
    frame: ['head:vertex', 'hand:fingertips', 'hand_L:fingertips', 'toes:toe_tips', 'toes_L:toe_tips', 'pelvis:coccyx'],
    sides: 'both',
    highlights: { 'erector-spinae': 'primary', multifidus: 'primary', 'gluteus-maximus': 'primary', 'transversus-abdominis': 'secondary', obliques: 'secondary', 'gluteus-medius': 'secondary', deltoid: 'secondary', trapezius: 'secondary' },
  },
  // dead bug: supine, arms straight up to the ceiling, hips & knees 90° (shins ≈ parallel to the floor). Ribs
  // down with a slight posterior pelvic tilt (3°) so the low back stays close to the mat (gap ≈ 1.5 cm, head,
  // upper back and sacrum on the mat throughout). The right arm lowers overhead (flex 180, hand ~11 cm above the
  // floor) while the opposite (left) leg straightens to hover just above the floor (heel ~8 cm up), then back;
  // then the left arm with the right leg. Real tempo of the dose (one 13 s loop for both sides): ≈ 2.9 s to extend,
  // 0.4 s pause, ≈ 2.9 s back, short rest — slow and controlled (moving fast is one of the listed mistakes).
  'ex-dead-bug': {
    id: 'ex-dead-bug',
    duration: 13,
    base: 'SUPINE',
    pose: {
      root: { pos: [0, 0.2, 0], rot: [-93, 0, 0] },
      joints: {
        lumbar: { flex: 3 },
        thorax: { flex: 2 },
        // −11.5 (not the base −8): the rounded upper back would otherwise lift the head 1.6 cm off the mat
        // ("頭が浮く" is a listed mistake); now the back of the head rests on it
        neck: { flex: -11.5 },
        hip: { flex: 87, abd: 3, rot: 0 },
        knee: { flex: 90 },
        ankle: { dorsi: -10 },
        shoulder: { flex: 92, abd: 0, rot: 0 },
        elbow: { flex: 0 },
        forearm: { sup: -90 },
        wrist: { flex: 0 },
      },
    },
    keys: [
      { t: 0, label: '息を吐き、右腕と左脚を伸ばす（3秒）' },
      { t: 0.223, pose: DEADBUG_R, hold: 0.4, label: '腰を浮かせずに3秒で戻す' },
      { t: 0.48 },
      { t: 0.5, label: '左腕と右脚も同様に伸ばす（3秒）' },
      { t: 0.723, pose: DEADBUG_L, hold: 0.4, label: '腰を浮かせずに3秒で戻す' },
      { t: 0.98 },
    ],
    loop: 'loop',
    ground: true,
    props: [{ kind: 'mat' }],
    camera: { dir: [-1, 0.75, 0.2] },
    frame: ['head:vertex', 'hand:fingertips', 'hand_L:fingertips', 'toes:toe_tips', 'toes_L:toe_tips', 'femur:lateral_epicondyle'],
    sides: 'both',
    highlights: { 'transversus-abdominis': 'primary', 'rectus-abdominis': 'primary', obliques: 'primary', iliopsoas: 'secondary', 'rectus-femoris': 'secondary' },
  },
  // side plank, basic (knee) version, on the right forearm: elbow directly under the shoulder, knees bent 90° and
  // stacked, the top arm resting along the body. From lying on the side (hip on the mat, trunk propped on the
  // forearm — side-bend lumbar 24° / thoracic 30°) the hips lift ~15 cm until head–hip–knee form one straight line
  // (bend < 2°, pelvis < 1 cm off the knee–head line; body 24° off the floor), then hold and lower slowly. Solved:
  // forearm, the bottom knee and shin stay on the mat at the same spots in both keys (elbow anchored; elbow→knee
  // vector identical), the upper arm vertical at the top, shoulder blade drawn down (no shrug).
  // Working side = the bottom (right) side: the base SIDE_PLANK props on the LEFT forearm, so its arm DOFs are reset
  // here and the right arm takes the support (mirrored: the engine only labels the clip's R side).
  'ex-side-plank': {
    id: 'ex-side-plank',
    duration: 8,
    base: 'SIDE_PLANK',
    pose: {
      joints: {
        hip: { flex: 0 },
        hip_R: { abd: 2 },
        hip_L: { abd: -2 },
        knee: { flex: 90 },
        ankle: { dorsi: -20 },
        scapula_R: { elev: -4 },
        elbow_R: { flex: 90 },
        forearm_R: { sup: -80 },
        // top (left) arm along the body = the base's top-arm values
        shoulder_L: { flex: 0, abd: 4, rot: 0 },
        elbow_L: { flex: 5 },
        forearm_L: { sup: -80 },
      },
    },
    keys: [
      { t: 0, pose: SP_DOWN, label: '前腕と膝で床を押し、お尻を持ち上げる' },
      { t: 0.17, pose: SP_UP, label: '頭から膝まで一直線で30秒キープ' },
      { t: 0.76, pose: SP_UP, label: 'ゆっくりお尻を下ろす' },
      { t: 0.93, pose: SP_DOWN },
    ],
    loop: 'loop',
    anchor: { point: 'forearm:olecranon', axes: 'xz' },
    ground: true,
    props: [{ kind: 'mat', rotY: 90 }],
    camera: { dir: [0, 0.35, 1] },
    frame: ['head:vertex', 'hand:fingertips', 'femur:lateral_epicondyle', 'toes:toe_tips', 'pelvis:iliac_crest_mid_L', 'hand_L:fingertips'],
    sides: 'R',
    highlights: {
      obliques: 'primary',
      'quadratus-lumborum': 'primary',
      'gluteus-medius': 'primary',
      'transversus-abdominis': 'secondary',
      'rectus-abdominis': 'secondary',
      'gluteus-minimus': 'secondary',
      'serratus-anterior': 'secondary',
    },
  },
  // foam-roller thoracic extension: hook-lying with a roller (Ø 15 cm) across the back under the shoulder blades
  // (tangent at ~T7), fingers laced behind the head with the elbows pointing up, buttocks on the mat. Exhaling,
  // the upper back extends over the roller (thorax −24° at T12/L1 — the rig's thoracic hinge) while the low back
  // stays as it was (lumbar +4°, no arching), the buttocks stay down and the neck stays neutral in the hands (head
  // drops ~10 cm toward the floor). Solved: pelvis on the mat and at the same spot, back tangent to the roller,
  // heels planted & feet flat at both keys.
  'ex-thoracic-extension': {
    id: 'ex-thoracic-extension',
    duration: 8,
    base: 'SUPINE',
    pose: {
      joints: {
        lumbar: { flex: 4 },
        neck: { flex: 6 },
        head: { flex: 0 },
        shoulder: { flex: 162.96, abd: 11.41, rot: -62.39 },
        elbow: { flex: 129.06 },
        forearm: { sup: -79.74 },
      },
    },
    keys: [
      { t: 0, pose: ROLL_START, label: '息を吐きながら背中の上を反らす（3秒）' },
      { t: 0.36, pose: ROLL_EXT, label: '3秒キープ（お尻は床につけたまま）' },
      { t: 0.72, pose: ROLL_EXT, label: 'ゆっくり戻す' },
      { t: 0.92, pose: ROLL_START },
    ],
    loop: 'loop',
    ground: true,
    props: [
      { kind: 'mat' },
      { kind: 'roller', at: [0, 0.075, -0.399], axis: 'x', radius: 0.075, length: 0.9 },
    ],
    camera: { dir: [-1, 0.3, 0.1] },
    frame: ['head:vertex', 'forearm:olecranon', 'pelvis:sacrum_post', 'toes:toe_tips', 'femur:lateral_epicondyle'],
    sides: 'both',
    highlights: { 'erector-spinae': 'primary', 'rectus-abdominis': 'secondary', 'pectoralis-major': 'secondary' },
  },
  // kneeling bench lat stretch: kneeling in front of a 45 cm bench (chair / bed height), both elbows on it shoulder-
  // width apart, palms together. The hips move back toward the heels (hip joint 20 cm back, knees 89° → 117°)
  // and the chest sinks until the trunk is about level (shoulders flexed 106° → 162°, slight upper-back extension
  // −10°, low back unchanged at +3°, head in line between the arms — no neck extension), while the elbows bend
  // so the joined hands come to the back of the head (via a key with the hands still above the head, so they never
  // pass through it). Solved: the backs of the upper arms rest on the bench top at the same spot in every key,
  // knees, shins and the tops of the feet stay on the mat, the head stays above the bench top.
  'ex-lat-stretch': {
    id: 'ex-lat-stretch',
    duration: 8,
    base: 'QUADRUPED',
    pose: {
      joints: {
        lumbar: { flex: 3 },
        toes: { ext: 0 },
        ankle: { dorsi: -60 },
        wrist: { flex: 0 },
        scapula: { protr: 0 },
      },
    },
    keys: [
      { t: 0, pose: LAT_START, label: 'お尻を後ろへ引き、胸を沈める' },
      // trunk already down, hands still above the head (keeps the hands clear of the head)
      { t: 0.13, pose: LAT_MID, label: '肘を曲げて手を頭の後ろへ' },
      { t: 0.23, pose: LAT_STRETCH, label: '脇の下〜背中の横を伸ばし30秒キープ' },
      { t: 0.72, pose: LAT_STRETCH, label: 'ゆっくり戻す' },
      { t: 0.8, pose: LAT_MID },
      { t: 0.93, pose: LAT_START },
    ],
    loop: 'loop',
    anchor: { point: 'tibia:tibial_tuberosity', axes: 'xz' },
    ground: true,
    props: [
      { kind: 'mat' },
      // bench across in front (top 0.456 m = under the elbows after grounding); near edge 3.5 cm behind the elbows
      { kind: 'bench', at: [0, 0.456, 0.783], rotY: 90 },
    ],
    camera: { dir: [-1, 0.45, 0.35] },
    frame: ['head:vertex', 'hand:fingertips', 'forearm:olecranon', 'pelvis:coccyx', 'toes:toe_tips', 'thorax:spinous_T7'],
    sides: 'both',
    highlights: { 'latissimus-dorsi': 'primary', 'triceps-brachii': 'secondary' },
  },
  // upper trapezius stretch (right side): sitting tall, the right hand grips the right side edge of the seat
  // (straight arm, fingers under the edge; solved: palm 2 cm outside the edge, just below the seat top) with the
  // shoulder blade drawn down (elev −8). The head tilts straight to the left (ear toward the left shoulder, no
  // rotation, trunk upright: neck lat −30 / head lat −12); the left hand then rests over the top of the head on its
  // right side (solved: palm on the right parietal area, palm toward the head, elbow out to the left at head height).
  'ex-upper-trap-stretch': {
    id: 'ex-upper-trap-stretch',
    duration: 9,
    base: 'SIT_CHAIR',
    pose: {
      joints: {
        scapula_R: { elev: -8 },
        shoulder_R: { flex: -1.5, abd: 5.7, rot: -1.8 },
        elbow_R: { flex: 2.4 },
        forearm_R: { sup: -94.2 },
        wrist_R: { flex: 54.9 },
        // left hand resting on the left thigh between the holds (solved: palm flat on the front of the mid-thigh,
        // 1.2 cm, fingers toward the knee, elbow clear of the trunk) — the base left it hovering ~19 cm above
        shoulder_L: { flex: -4.7, abd: 2, rot: -31.5 },
        elbow_L: { flex: 77 },
        forearm_L: { sup: -160 },
        wrist_L: { flex: -10.9 },
      },
    },
    keys: [
      { t: 0, label: '頭を反対側へゆっくり倒す' },
      { t: 0.17, pose: { joints: TRAP_TILT }, label: '反対の手を頭に軽く添える' },
      // lift the hand out to the side first so it comes over the top of the head (not across the face)
      { t: 0.25, pose: { joints: { ...TRAP_TILT, shoulder_L: { flex: 60, abd: 75, rot: -20 }, elbow_L: { flex: 100 }, forearm_L: { sup: -60 } } } },
      { t: 0.33, pose: { joints: { ...TRAP_TILT, ...TRAP_HAND_L } }, label: '30秒キープ（息を吐いて力を抜く）' },
      { t: 0.74, pose: { joints: { ...TRAP_TILT, ...TRAP_HAND_L } }, label: '手を離し、ゆっくり戻す' },
      { t: 0.84, pose: { joints: TRAP_TILT } },
      { t: 0.95 },
    ],
    loop: 'loop',
    // from the front-right, slightly above: the right side of the neck lengthening, the hand on the seat
    camera: { dir: [-0.4, 0.3, 1] },
    focus: 'neck',
    frame: ['head:vertex', 'hand_L:fingertips', 'forearm_L:olecranon', 'humerus:lateral_epicondyle', 'thorax:xiphoid'],
    sides: 'R',
    highlights: { trapezius: 'primary', 'levator-scapulae': 'secondary' },
  },
};
