// k2 — hip exercise clips. Owner after the engine agent: clip agent k2. See docs/ENGINE.md.
import type { ExerciseId } from '../../data/registry';
import type { Clip } from './types';

// hook-lying: hips 45°, knees 104°, feet flat (values solved so heels and pelvis both touch the floor)
const HOOK = { hip: { flex: 45, abd: 4 }, knee: { flex: 104 }, ankle: { dorsi: -32 } };
// bridge top: trunk 20° off the floor; feet & shoulders stay on the floor
const TOP = { root: { rot: [-110, 0, 0] as [number, number, number] }, joints: { hip: { flex: 5 }, knee: { flex: 90 }, ankle: { dorsi: -25 }, neck: { flex: 20 } } };

// clamshell "open": the top leg rotates 35° about the hip–heel axis (heels stay together, knee rises ~17 cm).
// Solved numerically: equivalent to hip flex 42.8 / abd 18.3 / external rotation 23.2 from the start
// (flex 48, knee 88, and SIDE_LYING's top-leg adduction of −8° so the knees rest on each other).
const OPEN = { joints: { hip_R: { flex: 42.8, abd: 18.3, rot: 23.2 } } };

export const clips: Partial<Record<ExerciseId, Clip>> = {
  // SAMPLE — glute bridge from hook-lying (SUPINE, knees bent, feet flat). Feet pinned in xz, body grounded.
  'ex-glute-bridge': {
    id: 'ex-glute-bridge',
    duration: 5,
    base: 'SUPINE',
    pose: { joints: { ...HOOK, shoulder: { abd: 14 }, forearm: { sup: -80 } } },
    keys: [
      { t: 0, label: 'お尻を持ち上げる' },
      { t: 0.3, pose: TOP, hold: 0.8, label: '肩〜膝を一直線にキープ' },
      { t: 0.5, pose: TOP, label: 'ゆっくり下ろす' },
      { t: 0.9 },
    ],
    loop: 'loop',
    anchor: { point: 'foot:calcaneus_plantar', axes: 'xz' },
    ground: true,
    props: [{ kind: 'mat' }],
    camera: { dir: [-1, 0.32, 0.22] },
    sides: 'both',
    highlights: { 'gluteus-maximus': 'primary', 'gluteus-medius': 'secondary', 'biceps-femoris': 'secondary' },
  },
  // SAMPLE — clamshell: SIDE_LYING (left side down), hips ~45°, knees ~90°; the top (right) knee opens.
  'ex-clamshell': {
    id: 'ex-clamshell',
    duration: 4.5,
    base: 'SIDE_LYING',
    pose: { joints: { hip: { flex: 48 }, knee: { flex: 88 }, ankle: { dorsi: -10 } } },
    keys: [
      { t: 0, label: 'かかとをつけたまま膝をひらく' },
      { t: 0.32, pose: OPEN, hold: 0.5, label: '1秒キープ' },
      { t: 0.45, pose: OPEN, label: 'ゆっくり閉じる' },
      { t: 0.92 },
    ],
    loop: 'loop',
    props: [{ kind: 'mat', rotY: 90 }],
    // from the front (the side the knees point to), a little above: the top knee visibly lifts off the bottom one
    camera: { dir: [-0.22, 0.42, 1] },
    focus: 'hip',
    frame: ['femur:lateral_epicondyle', 'femur_L:lateral_epicondyle', 'foot:calcaneus_post', 'pelvis:iliac_crest_mid'],
    sides: 'R',
    highlights: { 'gluteus-medius': 'primary', 'gluteus-minimus': 'secondary', piriformis: 'secondary' },
  },
};
