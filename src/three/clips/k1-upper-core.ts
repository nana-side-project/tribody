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
// shins and the tops of the feet on the mat, flat back. Solved with FK + grounding.
const QUAD: Pose = {
  root: { pos: [0, 0.49, 0], rot: [74.99, 0, 0] },
  joints: {
    hip: { flex: 75.55 },
    knee: { flex: 89.73 },
    ankle: { dorsi: -60 },
    toes: { ext: 0 },
    shoulder: { flex: 77.19, abd: -11.92, rot: 15 },
    elbow: { flex: 3 },
    forearm: { sup: -150 },
    wrist: { flex: -81.9 },
    neck: { flex: -8 },
  },
};
// cat / cow with hands & knees pinned (solved; see the clip comment)
const CAT: Pose = {
  root: { pos: [0, 0.49, -0.02], rot: [45.7, 0, 0] },
  joints: {
    hip: { flex: 49.35 },
    knee: { flex: 92.77 },
    lumbar: { flex: 20 },
    thorax: { flex: 6 },
    neck: { flex: 20 },
    head: { flex: 12 },
    scapula: { protr: 30 },
    shoulder: { flex: 78.53, abd: -12.96, rot: 15 },
    wrist: { flex: -85 },
  },
};
const COW: Pose = {
  root: { pos: [0, 0.49, 0.01], rot: [96.89, 0, 0] },
  joints: {
    hip: { flex: 96.2 },
    knee: { flex: 88.75 },
    lumbar: { flex: -20 },
    thorax: { flex: -4 },
    neck: { flex: -15 },
    head: { flex: -6 },
    scapula: { protr: -12 },
    shoulder: { flex: 73.34, abd: -10.31, rot: 15 },
    wrist: { flex: -85 },
  },
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
// side plank (knees bent 90°): hips down (start) / lifted to a straight line (solved, see the clip comment)
const SP_DOWN: Pose = {
  root: { pos: [0, 0.4, 0], rot: [2.19, 0, -88.14] },
  joints: { lumbar: { lat: 32 }, thorax: { lat: 18.75 }, shoulder_L: { abd: 21.19, flex: 8.64 } },
};
const SP_UP: Pose = {
  root: { pos: [0, 0.4, 0], rot: [5.36, 0, -66.12] },
  joints: { shoulder_L: { abd: 61.56, flex: 18.1 } },
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
// upper trapezius stretch: head tilted to the left; left hand resting on the right side of the head
const TRAP_TILT = { neck: { lat: -30 }, head: { lat: -12 } };
const TRAP_HAND_L = {
  shoulder_L: { flex: 159, abd: 32.9, rot: -78 },
  elbow_L: { flex: 114.1 },
  forearm_L: { sup: -12.4 },
  wrist_L: { flex: 28.3 },
};

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
      // folded towel between the elbow and the trunk
      { kind: 'ball', at: { bone: 'lumbar', rest: [0.157, 1.13, -0.012] }, radius: 0.03, color: '#cfdde8' },
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
      joints: {
        // head on a pillow, neck neutral (the base tilts the head down toward the floor)
        neck: { lat: -6 },
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
      { kind: 'mat', rotY: 90 },
      // pillow: its top touches the side of the head (y 0.177), clear of the bottom shoulder and hand
      { kind: 'box', at: [0.75, 0.177, 0], size: [0.27, 0.177, 0.27], color: '#9aaebe' },
      { kind: 'dumbbell', hand: 'R', size: 0.7 },
      // folded towel between the elbow and the waist
      { kind: 'ball', at: { bone: 'lumbar', rest: [0.155, 1.13, -0.02] }, radius: 0.028, color: '#cfdde8' },
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
  // each top. Tempo compressed to fit one 9 s loop (≈1 s up, 0.6 s hold, 1.2 s down per letter).
  'ex-prone-ytw': {
    id: 'ex-prone-ytw',
    duration: 9,
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
      { t: 0.11, pose: { joints: { scapula: { protr: -12, elev: -5 }, shoulder: { flex: 176, abd: 38, rot: 15 } } }, hold: 0.6, label: '止めて、ゆっくり下ろす' },
      { t: 0.31 },
      { t: 0.333, label: 'T：親指を上にして真横へ' },
      { t: 0.443, pose: { joints: { scapula: { protr: -15, elev: -5 }, shoulder: { flex: 90, abd: 90, rot: 90 } } }, hold: 0.6, label: '止めて、ゆっくり下ろす' },
      { t: 0.643 },
      { t: 0.667, label: 'W：ひじを後ろに引き前腕を外へ' },
      {
        t: 0.777,
        pose: { joints: { scapula: { protr: -15, elev: -6 }, shoulder: { flex: -25, abd: 50, rot: 95 }, elbow: { flex: 90 } } },
        hold: 0.6,
        label: '止めて、ゆっくり下ろす',
      },
      { t: 0.977 },
    ],
    loop: 'loop',
    ground: false,
    props: [{ kind: 'box', at: [0, 0.68, -0.225], size: [0.26, 0.68, 1.55] }],
    // from above the feet end: the back (trapezius / rhomboids) and both arms tracing the letters
    camera: { dir: [-0.12, 1.5, -0.6] },
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
  // forearms and hands on the wall. Solved so the forearm (elbow end) and the hand edge stay on the wall plane
  // (z 0.358): start elbows 87°; pressing (scapulae protracted +12) leans the body back 1.5°; at the top
  // (flex 145 / abd 15 = a V, ER 30 so the ulnar border still faces the wall, elbows 37°) the body leans 3.5°
  // toward the wall over the planted heels (lean = root pitch + equal ankle dorsiflexion, feet flat).
  // The wall sits 6 mm beyond that plane: interpolating between the solved keys lets the forearm overlap the
  // wall by ≤ 2 cm mid-slide (a mid key would fix it but makes the slide stop halfway).
  'ex-wall-slide': {
    id: 'ex-wall-slide',
    duration: 8,
    base: 'STAND',
    pose: { joints: { forearm: { sup: -90 }, wrist: { flex: 0 } } },
    keys: [
      {
        t: 0,
        pose: { joints: { shoulder: { flex: 90, abd: 3, rot: 0 }, elbow: { flex: 87.2 } } },
        label: '前腕で壁を軽く押し、肩甲骨を前へ',
      },
      {
        t: 0.1,
        pose: { root: { rot: [-1.46, 0, 0] }, joints: { ankle: { dorsi: -1.46 }, scapula: { protr: 12 }, shoulder: { flex: 90, abd: 3, rot: 0 }, elbow: { flex: 85.7 } } },
        label: '押したまま斜め上へ滑らせる（3秒）',
      },
      {
        t: 0.475,
        pose: { root: { rot: [3.55, 0, 0] }, joints: { ankle: { dorsi: 3.55 }, scapula: { protr: 12 }, shoulder: { flex: 145, abd: 15, rot: 30.5 }, elbow: { flex: 36.8 } } },
        hold: 0.4,
        label: '肩甲骨を下げながらゆっくり戻す（3秒）',
      },
      {
        t: 0.9,
        pose: { root: { rot: [-1.46, 0, 0] }, joints: { ankle: { dorsi: -1.46 }, scapula: { protr: 12 }, shoulder: { flex: 90, abd: 3, rot: 0 }, elbow: { flex: 85.7 } } },
      },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    props: [{ kind: 'wall', at: [0, 0, 0.364], normal: [0, 0, -1], width: 1.4, height: 2.2 }],
    // from behind-right: the shoulder blades rotating upward and the forearms tracing a V on the wall
    camera: { dir: [-0.5, 0.35, -0.8] },
    frame: ['hand:fingertips', 'hand_L:fingertips', 'scapula:inferior_angle', 'scapula_L:inferior_angle', 'forearm:olecranon', 'forearm_L:olecranon', 'thorax:spinous_T12'],
    sides: 'both',
    highlights: { 'serratus-anterior': 'primary', trapezius: 'primary', deltoid: 'secondary' },
  },
  // push-up plus, incline version on a knee-height box (台, 0.45 m: the text starts on the wall or a box before
  // progressing to the knees / floor). Straight body from head to heels on the toes, elbows locked, hands
  // flat on the box (wrists 85° extended) just in front of the shoulders. Toes are pinned; for each scapula
  // setting the body pitch & shoulder flexion were solved so the palms stay exactly on the box:
  // (pitch / flex / abd) neutral 48.9° / 55.0 / 8, retracted (protr −15, chest sinks 3 cm) 50.9 / 55.9 / 10.3,
  // plus (protr +25, upper back rounded 4°: T4 rises 8 cm) 44.7 / 56.8 / 6.7. Toe extension follows the pitch.
  'ex-push-up-plus': {
    id: 'ex-push-up-plus',
    duration: 7,
    base: 'STAND',
    pose: {
      joints: {
        shoulder: { abd: 8, rot: 0 },
        elbow: { flex: 0 },
        forearm: { sup: -160 },
        wrist: { flex: -85 },
        ankle: { dorsi: 0 },
        neck: { flex: 0 },
      },
    },
    keys: [
      {
        t: 0,
        pose: { root: { rot: [48.91, 0, 0] }, joints: { shoulder: { flex: 55.02 }, toes: { ext: 46.9 } } },
        label: '肘を伸ばしたまま肩甲骨を寄せる',
      },
      {
        t: 0.13,
        pose: { root: { rot: [50.92, 0, 0] }, joints: { shoulder: { flex: 55.91, abd: 10.27 }, scapula: { protr: -15 }, toes: { ext: 48.9 } } },
        hold: 0.2,
        label: '台を押して肩甲骨を前へ押し出す',
      },
      {
        t: 0.33,
        pose: { root: { rot: [44.71, 0, 0] }, joints: { shoulder: { flex: 56.76, abd: 6.66 }, scapula: { protr: 25 }, thorax: { flex: 4 }, toes: { ext: 42.7 } } },
        hold: 1.9,
        label: '背中の上を丸めて2秒キープ',
      },
      {
        t: 0.62,
        pose: { root: { rot: [44.71, 0, 0] }, joints: { shoulder: { flex: 56.76, abd: 6.66 }, scapula: { protr: 25 }, thorax: { flex: 4 }, toes: { ext: 42.7 } } },
        label: 'ゆっくり戻す',
      },
      { t: 0.88, pose: { root: { rot: [48.91, 0, 0] }, joints: { shoulder: { flex: 55.02 }, toes: { ext: 46.9 } } } },
    ],
    loop: 'loop',
    anchor: { point: 'toes:toes_mid', axes: 'xyz' },
    ground: true,
    // box top at the palms' lowest skin point (y 0.45), wide enough for both hands
    props: [{ kind: 'box', at: [0, 0.45, 0.52], size: [0.95, 0.45, 0.4] }],
    camera: { dir: [-1, 0.35, 0.05] },
    frame: ['hand:palm', 'head:vertex', 'scapula:inferior_angle', 'scapula_L:acromion', 'pelvis:psis', 'thorax:spinous_T4'],
    sides: 'both',
    highlights: { 'serratus-anterior': 'primary', 'pectoralis-major': 'secondary', 'triceps-brachii': 'secondary', subscapularis: 'secondary', deltoid: 'secondary' },
  },
  // band row: facing a post, band anchored at lower-chest height (1.13 m), thumbs-up grip, arms forward.
  // Pull: elbows travel back close to the sides (shoulder ext 15 / abd 15, elbows 105°) while the shoulder
  // blades retract (protr +8 → −20) and stay down (elev −3/−4); 2 s pull, 2 s hold, 3 s return, then the
  // blades open forward slightly (last second). Trunk and neck stay still. Hand path 1.15 → 1.12 m (≤ 7 cm arc).
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
      // folded towel between the elbow and the trunk
      { kind: 'ball', at: { bone: 'lumbar', rest: [0.157, 1.13, -0.012] }, radius: 0.03, color: '#cfdde8' },
    ],
    // from above-front: the forearm swinging out like a door while the elbow stays at the side
    camera: { dir: [-0.2, 1.1, 0.6] },
    // the post (a rest point on the pelvis frame, which does not move here) stays in view
    frame: ['hand:palm', 'scapula:acromion', 'thorax:xiphoid', 'forearm:olecranon', 'scapula_L:acromion', { bone: 'pelvis_L', rest: [0.42, 1.1, 0.24] }],
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
      { kind: 'box', at: [0, 0.022, -0.69], size: [0.3, 0.022, 0.22], color: '#cfdde8' },
    ],
    // from above-right: the face nodding (chin toward the throat) and the deep neck flexors in front of the spine
    camera: { dir: [-1, 0.75, 0.05] },
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
      { t: 0, label: '腕を肩の高さで前に出す' },
      { t: 0.12, pose: { joints: { ...CROSS_ARM_R(-20) } }, label: '反対の手で肘のすぐ上を持つ' },
      { t: 0.2, pose: { joints: { ...CROSS_ARM_R(-20), ...CROSS_HAND_L_START } }, label: '胸へゆっくり引き寄せる' },
      { t: 0.32, pose: { joints: { ...CROSS_ARM_R(-42), ...CROSS_HAND_L_PULL } }, label: '30秒キープ（肩は下げたまま）' },
      { t: 0.76, pose: { joints: { ...CROSS_ARM_R(-42), ...CROSS_HAND_L_PULL } }, label: 'ゆっくり戻す' },
      { t: 0.84, pose: { joints: { ...CROSS_ARM_R(-20), ...CROSS_HAND_L_START } } },
      { t: 0.94 },
    ],
    loop: 'loop',
    // from behind-right, above: the back of the right shoulder (stretched) and the arm across the chest
    camera: { dir: [-1, 0.6, -0.3] },
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
    camera: { dir: [0.3, 0.5, 1] },
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
    props: [
      { kind: 'mat', rotY: 90 },
      // cushion under the head (top 0.14 m)
      { kind: 'box', at: [0.75, 0.14, 0], size: [0.27, 0.14, 0.3], color: '#9aaebe' },
    ],
    // from above the feet end: the arm traces its arc face-on (forward → ceiling → toward the floor behind)
    camera: { dir: [-0.9, 1, 0.45] },
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
      { t: 0.3, pose: CAT, label: '床を押して肩甲骨の間を広げる' },
      { t: 0.38, pose: CAT, label: '息を吸いながら胸を前へ、背中を反らす' },
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
  // Hold shortened to fit one 9 s loop for both sides (label says the real 5 s).
  'ex-bird-dog': {
    id: 'ex-bird-dog',
    duration: 9,
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
  // then the left arm with the right leg. Tempo compressed to fit both sides in one 9 s loop.
  'ex-dead-bug': {
    id: 'ex-dead-bug',
    duration: 9,
    base: 'SUPINE',
    pose: {
      root: { pos: [0, 0.2, 0], rot: [-93, 0, 0] },
      joints: {
        lumbar: { flex: 3 },
        thorax: { flex: 2 },
        neck: { flex: -8 },
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
      { t: 0, label: '息を吐き、右腕と左脚をゆっくり伸ばす' },
      { t: 0.2, pose: DEADBUG_R, hold: 0.3, label: '腰を浮かせずに、ゆっくり戻す' },
      { t: 0.45 },
      { t: 0.5, label: '左腕と右脚も同様に伸ばす' },
      { t: 0.7, pose: DEADBUG_L, hold: 0.3, label: '腰を浮かせずに、ゆっくり戻す' },
      { t: 0.95 },
    ],
    loop: 'loop',
    ground: true,
    props: [{ kind: 'mat' }],
    camera: { dir: [-1, 0.75, 0.2] },
    frame: ['head:vertex', 'hand:fingertips', 'hand_L:fingertips', 'toes:toe_tips', 'toes_L:toe_tips', 'femur:lateral_epicondyle'],
    sides: 'both',
    highlights: { 'transversus-abdominis': 'primary', 'rectus-abdominis': 'primary', obliques: 'primary', iliopsoas: 'secondary', 'rectus-femoris': 'secondary' },
  },
  // side plank, basic (knee) version, on the left side: elbow directly under the shoulder, knees bent 90° and stacked,
  // the top arm resting along the body. From lying on the side (hip on the mat, trunk propped on the forearm —
  // side-bend lumbar 32° / thorax 19°) the hips lift ~13 cm until head–hip–knee form one straight line (body 24°
  // off the floor),
  // then hold and lower slowly. Solved: forearm, the bottom knee and shin stay on the mat at the same spots in both
  // keys (elbow anchored; elbow→knee vector identical), the upper arm vertical at the top, shoulder blade drawn
  // down (no shrug). Working side = the bottom (left) side.
  'ex-side-plank': {
    id: 'ex-side-plank',
    duration: 8,
    base: 'SIDE_PLANK',
    pose: {
      joints: {
        hip: { flex: 0 },
        hip_R: { abd: -2 },
        hip_L: { abd: 2 },
        knee: { flex: 90 },
        ankle: { dorsi: -20 },
        scapula_L: { elev: -4 },
        elbow_L: { flex: 90 },
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
    anchor: { point: 'forearm_L:olecranon', axes: 'xz' },
    ground: true,
    props: [{ kind: 'mat', rotY: 90 }],
    camera: { dir: [0, 0.35, 1] },
    frame: ['head:vertex', 'hand_L:fingertips', 'femur_L:lateral_epicondyle', 'toes_L:toe_tips', 'pelvis:iliac_crest_mid', 'hand:fingertips'],
    sides: 'L',
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
