// r3 — hip muscles + hip structures.
// Owner after the engine agent: rigging agent r3. See docs/ENGINE.md.
import type { MuscleId, StructureId } from '../../data/registry';
import type { Pose } from '../rig';
import type { MuscleRig, StructureRig } from './types';

// ── R3b: stretch poses shared by the adductors / sartorius (solved numerically with FK + grounding).
// Side lunge to the LEFT (classic adductor stretch): weight on the bent left leg, right leg straight and 38° out to
// the side, trunk upright, pelvis level (drops ~18 cm). Both soles touch the floor, heels side by side; the right
// ankle needs ~38° of inversion to keep the sole flat, so at the 35° limit the foot rolls a little onto its inner
// border, as it does in a real deep side lunge.
const SIDE_LUNGE: Pose = {
  joints: {
    hip_R: { flex: 10, abd: 38, rot: 5 },
    knee_R: { flex: 0 },
    ankle_R: { dorsi: -19.4, inv: 35 },
    hip_L: { flex: 46.8 },
    knee_L: { flex: 75.8 },
    ankle_L: { dorsi: 26.6 },
  },
};
// A side lunge with the trunk leaning 30° forward (hips flexed, right leg 30° out): adds hip flexion, which
// lengthens the hamstring part of the adductor magnus as well. Both soles flat (right ankle inversion 30°).
const SIDE_LUNGE_LEAN: Pose = {
  root: { rot: [30, 0, 0] },
  joints: {
    hip_R: { flex: 25.9, abd: 30, rot: 10 },
    knee_R: { flex: 0 },
    ankle_R: { dorsi: -4, inv: 30.4 },
    hip_L: { flex: 55 },
    knee_L: { flex: 59.8 },
    ankle_L: { dorsi: 32.4 },
  },
};
// Runner's lunge with the back (right) leg straight, on the ball of the foot: hip extended to the 35° limit with a
// little adduction and internal rotation (heel turned out) — the hip-flexor stretch that reaches the sartorius.
// Left foot flat, right toes on the floor, pelvis ~8 cm lower.
const BACK_LEG_LUNGE: Pose = {
  joints: {
    hip_R: { flex: -35, abd: -8, rot: -20 },
    knee_R: { flex: 0 },
    ankle_R: { dorsi: -10 },
    toes_R: { ext: 35 },
    hip_L: { flex: 35 },
    knee_L: { flex: 45 },
    ankle_L: { dorsi: 10 },
    lumbar: { flex: -8 },
  },
};

export const muscles: Partial<Record<MuscleId, MuscleRig>> = {
  // ── R3a: gluteus maximus — 6 strands, superior → inferior. Origin: posterior ilium (behind the posterior gluteal
  // line), sacrum, coccyx, sacrotuberous ligament. Upper + superficial lower fibres → posterior border of the ITB
  // (strands 1, 2, 3, 5); deep lower fibres → gluteal tuberosity (4, 6).
  // Every strand: origin → pelvis via (the buttock bulge behind the hip) → femur via (behind the greater trochanter,
  // so the muscle wraps the back of the hip in flexion) → insertion.
  'gluteus-maximus': {
    id: 'gluteus-maximus',
    strands: [
      {
        name: '上部線維（腸骨）',
        path: [
          { ref: 'pelvis:gluteal_surface_post', off: [-0.012, 0.028, -0.006] },
          { bone: 'pelvis', rest: [0.124, 0.955, -0.058] },
          { bone: 'femur', rest: [0.16, 0.893, -0.034] },
          { bone: 'femur', rest: [0.172, 0.865, -0.016] },
        ],
        radius: 0.015,
        tendon: [0.0, 0.15],
      },
      {
        name: '上部線維（仙骨上部）',
        path: [
          { ref: 'pelvis:psis', off: [0.006, -0.012, -0.003] },
          { bone: 'pelvis', rest: [0.11, 0.935, -0.072] },
          { bone: 'femur', rest: [0.158, 0.879, -0.039] },
          { bone: 'femur', rest: [0.171, 0.848, -0.02] },
        ],
        radius: 0.018,
        tendon: [0.0, 0.14],
      },
      {
        name: '中部線維（仙骨）',
        path: [
          { ref: 'pelvis:sacrum_post_lat', off: [0.004, 0.0, -0.006] },
          { bone: 'pelvis', rest: [0.095, 0.905, -0.081] },
          { bone: 'femur', rest: [0.153, 0.862, -0.042] },
          { bone: 'femur', rest: [0.169, 0.828, -0.022] },
        ],
        radius: 0.019,
        tendon: [0.0, 0.13],
      },
      {
        name: '下部深層線維（仙骨下部）',
        path: [
          { ref: 'pelvis:sacrum_post_lat', off: [-0.006, -0.042, -0.004] },
          { bone: 'pelvis', rest: [0.085, 0.875, -0.077] },
          { bone: 'femur', rest: [0.145, 0.845, -0.042] },
          { ref: 'femur:gluteal_tuberosity', off: [0.002, 0.0, -0.006] },
        ],
        radius: 0.018,
        tendon: [0.0, 0.12],
      },
      {
        name: '下部浅層線維（尾骨）',
        path: [
          { ref: 'pelvis:coccyx', off: [0.012, 0.004, -0.008] },
          { bone: 'pelvis', rest: [0.08, 0.86, -0.067] },
          { bone: 'femur', rest: [0.148, 0.825, -0.036] },
          { bone: 'femur', rest: [0.166, 0.8, -0.024] },
        ],
        radius: 0.016,
        tendon: [0.0, 0.14],
      },
      {
        name: '下部深層線維（仙結節靱帯）',
        path: [
          { bone: 'pelvis', rest: [0.042, 0.866, -0.07] },
          { bone: 'pelvis', rest: [0.085, 0.85, -0.062] },
          { bone: 'femur', rest: [0.14, 0.82, -0.033] },
          { ref: 'femur:gluteal_tuberosity', off: [-0.003, -0.025, -0.004] },
        ],
        radius: 0.014,
        tendon: [0.0, 0.12],
      },
    ],
    // hip extension (leg back, knee bent so the hamstrings don't take over) shortens every strand
    actionPose: { joints: { hip_R: { flex: -30, rot: 8 }, knee_R: { flex: 45 } } },
    // knee toward the opposite shoulder (hip flexion + adduction) lengthens it. 50° is enough: the lower fibres wrap
    // under the buttock and already lengthen ~35–55 % (their moment arm is large; mean belly ≈ +34 %).
    stretchPose: { joints: { hip_R: { flex: 50, abd: -12 }, knee_R: { flex: 110 } } },
    // posterolateral (more from the side than 'isoBack'): the whole fan stays visible and the leg swinging back /
    // forward is seen across the view instead of toward the camera
    camera: { dir: [-1, 0.28, -0.62] },
    focus: 'hip',
  },
  // SAMPLE (refined by R3a) — gluteus medius: fan from the outer ilium (between the anterior and posterior gluteal
  // lines, just below the crest) to the lateral facet (anterior + middle fibres) and the superoposterior facet
  // (posterior fibres) of the greater trochanter. The mannequin's skin is only a few mm outside the iliac crest, so the
  // origins sit 1–2 cm below the crest and the bellies are FLAT bands (facing laterally) that hug the ilium — a thin
  // fan sheet that stays inside the skin (via points ~1.5 cm off the bone).
  'gluteus-medius': {
    id: 'gluteus-medius',
    strands: [
      {
        name: '前部線維',
        path: [
          { ref: 'pelvis:gluteal_surface_ant', off: [0.003, -0.01, 0.006] },
          { bone: 'pelvis', rest: [0.141, 0.962, 0.016] },
          { ref: 'femur:greater_trochanter_lat', off: [0.004, 0.008, 0.012] },
        ],
        radius: 0.0065,
        tendon: [0.0, 0.17],
        flat: { width: 0.026, normal: 'lateral' },
      },
      {
        name: '中部線維（前）',
        path: [
          { ref: 'pelvis:gluteal_surface_ant', off: [0.007, 0.002, -0.016] },
          { bone: 'pelvis', rest: [0.143, 0.962, -0.004] },
          { ref: 'femur:greater_trochanter_lat', off: [0.004, 0.006, 0.004] },
        ],
        radius: 0.007,
        tendon: [0.0, 0.16],
        flat: { width: 0.03, normal: 'lateral' },
      },
      {
        name: '中部線維',
        path: [
          { ref: 'pelvis:gluteal_surface_mid', off: [0.008, 0.007, 0.008] },
          { bone: 'pelvis', rest: [0.141, 0.964, -0.026] },
          { ref: 'femur:greater_trochanter_lat', off: [0.003, 0.008, -0.006] },
        ],
        radius: 0.007,
        tendon: [0.0, 0.16],
        flat: { width: 0.03, normal: 'lateral' },
      },
      {
        name: '後部線維（前）',
        path: [
          { ref: 'pelvis:gluteal_surface_mid', off: [0.0, 0.015, -0.015] },
          { bone: 'pelvis', rest: [0.134, 0.962, -0.047] },
          { ref: 'femur:greater_trochanter_sup', off: [0.006, 0.002, -0.004] },
        ],
        radius: 0.0065,
        tendon: [0.0, 0.18],
        flat: { width: 0.028, normal: 'lateral' },
      },
      {
        name: '後部線維',
        path: [
          { ref: 'pelvis:gluteal_surface_post', off: [0.014, 0.025, 0.009] },
          { bone: 'pelvis', rest: [0.12, 0.955, -0.062] },
          { ref: 'femur:greater_trochanter_sup', off: [0.002, 0.0, -0.01] },
        ],
        radius: 0.006,
        tendon: [0.0, 0.2],
        flat: { width: 0.024, normal: 'lateral' },
      },
    ],
    // hip abduction shortens all fibres
    actionPose: { joints: { hip_R: { abd: 25 } } },
    // adduction (leg crossed behind) lengthens them
    stretchPose: { joints: { hip_R: { abd: -24, flex: -8, rot: 8 }, knee_R: { flex: 8 } } },
    // posterolateral close-up: the fan faces laterally, and the leg's abduction / adduction stays readable
    camera: { position: [-1.12, 1.24, -0.78], target: [-0.12, 0.9, -0.02] },
    focus: 'hip',
  },
  // ── R3a: gluteus minimus — deepest gluteal fan, under the medius: outer ilium between the anterior and inferior
  // gluteal lines (lower, more anterior than the medius) → anterior facet of the greater trochanter.
  'gluteus-minimus': {
    id: 'gluteus-minimus',
    strands: [
      {
        name: '前部線維',
        path: [
          { ref: 'pelvis:gluteal_surface_ant', off: [-0.003, -0.025, 0.014] },
          { bone: 'pelvis', rest: [0.137, 0.95, 0.025] },
          { ref: 'femur:greater_trochanter_ant', off: [0.003, 0.002, 0.0] },
        ],
        radius: 0.0075,
        tendon: [0.0, 0.2],
      },
      {
        name: '中部線維',
        path: [
          { ref: 'pelvis:gluteal_surface_ant', off: [0.002, -0.025, -0.02] },
          { bone: 'pelvis', rest: [0.137, 0.945, 0.008] },
          { ref: 'femur:greater_trochanter_ant', off: [0.002, 0.006, -0.003] },
        ],
        radius: 0.008,
        tendon: [0.0, 0.2],
      },
      {
        name: '後部線維',
        path: [
          { ref: 'pelvis:gluteal_surface_mid', off: [-0.01, -0.04, 0.0] },
          { bone: 'pelvis', rest: [0.13, 0.94, -0.012] },
          { ref: 'femur:greater_trochanter_ant', off: [0.0, 0.01, -0.006] },
        ],
        radius: 0.0075,
        tendon: [0.0, 0.22],
      },
    ],
    // abduction (+ a little internal rotation for the anterior fibres) shortens it
    actionPose: { joints: { hip_R: { abd: 22, rot: -8 } } },
    // adduction behind the other leg with slight extension + external rotation lengthens it
    stretchPose: { joints: { hip_R: { abd: -20, flex: -10, rot: 12 }, knee_R: { flex: 8 } } },
    // anterolateral close-up (the auto framing's 42 cm box makes this small, deep fan tiny): shows the fan under
    // the iliac wing, its insertion on the FRONT of the trochanter and the upper thigh moving
    camera: { position: [-1.04, 1.17, 0.55], target: [-0.12, 0.9, 0.01] },
    focus: 'hip',
  },
  // ── R3a: piriformis — pear-shaped: broad origin on the ANTERIOR sacrum (S2–S4, lateral to the foramina),
  // out of the pelvis through the greater sciatic notch (via on the pelvis), behind the hip joint, to the upper
  // border of the greater trochanter (medial to its tip). Two strands give the pear shape.
  piriformis: {
    id: 'piriformis',
    strands: [
      {
        name: '上部（S2）',
        path: [
          { ref: 'pelvis:sacrum_ant', off: [0.006, -0.007, -0.002] },
          { bone: 'pelvis', rest: [0.07, 0.931, -0.071] },
          { bone: 'pelvis', rest: [0.104, 0.936, -0.05] },
          { ref: 'femur:greater_trochanter_sup', off: [-0.004, 0.003, 0.002] },
        ],
        radius: 0.0085,
        tendon: [0.0, 0.22],
      },
      {
        name: '下部（S3–S4）',
        path: [
          { ref: 'pelvis:sacrum_ant', off: [0.004, -0.035, -0.004] },
          { bone: 'pelvis', rest: [0.068, 0.926, -0.07] },
          { bone: 'pelvis', rest: [0.104, 0.928, -0.052] },
          { ref: 'femur:greater_trochanter_sup', off: [-0.004, 0.0, 0.0] },
        ],
        radius: 0.008,
        tendon: [0.0, 0.24],
      },
    ],
    // external rotation (hip extended) shortens it
    actionPose: { joints: { hip_R: { rot: 30 } } },
    // knee to the opposite shoulder with the shin turned in (flexion + adduction + external rotation, the figure-4
    // / piriformis stretch position: Gulledge et al. — longest at ~115° flexion, 40° ER, 10° adduction)
    stretchPose: { joints: { hip_R: { flex: 110, abd: -10, rot: 40 }, knee_R: { flex: 110 } } },
    // posterolateral close-up from slightly above: sacrum → notch → trochanter all visible, plus the thigh (25 %
    // closer than before: the small muscle filled only ~1/7 of the card width)
    camera: { position: [-0.6, 1.29, -0.7], target: [-0.07, 0.9, -0.02] },
    focus: 'hip',
  },
  // ── R3a: iliopsoas — psoas major (2 strands: T12–L2 and L2–L4 bodies / transverse processes) + iliacus
  // (2 strands: iliac fossa / inner lip of the crest). Both run down the inside of the pelvis, over the
  // superior pubic ramus (iliopubic eminence — via on the PELVIS), in front of the hip joint (via on the femur,
  // in front of the neck) and turn back to the lesser trochanter (common tendon).
  iliopsoas: {
    id: 'iliopsoas',
    // qa3-fix-body: the last via (in front of the femoral head, y 0.904) was dropped — in deep flexion the lesser
    // trochanter swings up past it and the path doubled back, so the muscle was shortest at 60–90° and lengthened
    // again toward 125°. From the pubic-ramus via (y 0.93) the tendon now runs straight to the lesser trochanter.
    strands: [
      {
        name: '大腰筋（T12–L2）',
        path: [
          { ref: 'lumbar:body_L1', off: [0.008, 0.012, -0.004] },
          { bone: 'lumbar', rest: [0.042, 1.06, -0.016] },
          { bone: 'pelvis', rest: [0.06, 0.975, 0.018] },
          { bone: 'pelvis', rest: [0.07, 0.928, 0.05] },
          { ref: 'femur:lesser_trochanter', off: [-0.002, 0.002, 0.007] },
        ],
        radius: 0.014,
        tendon: [0.0, 0.16],
      },
      {
        name: '大腰筋（L2–L4）',
        path: [
          { ref: 'lumbar:transverse_L3', off: [0.0, 0.0, 0.03] },
          { bone: 'lumbar', rest: [0.05, 1.045, -0.008] },
          { bone: 'pelvis', rest: [0.066, 0.975, 0.024] },
          { bone: 'pelvis', rest: [0.076, 0.928, 0.052] },
          { ref: 'femur:lesser_trochanter', off: [-0.001, 0.004, 0.007] },
        ],
        radius: 0.013,
        tendon: [0.0, 0.18],
      },
      {
        name: '腸骨筋（外側）',
        path: [
          { ref: 'pelvis:iliac_fossa', off: [0.033, 0.025, -0.02] },
          { bone: 'pelvis', rest: [0.088, 0.972, 0.037] },
          { bone: 'pelvis', rest: [0.084, 0.93, 0.055] },
          { ref: 'femur:lesser_trochanter', off: [0.0, 0.006, 0.008] },
        ],
        radius: 0.013,
        tendon: [0.0, 0.16],
      },
      {
        name: '腸骨筋（内側）',
        path: [
          { ref: 'pelvis:iliac_fossa', off: [-0.005, 0.0, -0.012] },
          { bone: 'pelvis', rest: [0.08, 0.97, 0.032] },
          { bone: 'pelvis', rest: [0.081, 0.928, 0.053] },
          { ref: 'femur:lesser_trochanter', off: [-0.001, 0.003, 0.008] },
        ],
        radius: 0.012,
        tendon: [0.0, 0.17],
      },
    ],
    // standing knee drive (hip flexion) shortens it
    actionPose: { joints: { hip_R: { flex: 90 }, knee_R: { flex: 90 } } },
    // standing lunge (hip-flexor stretch): right hip extended behind on the toes, left knee bent in front. Solved
    // numerically so both feet touch (right toes, left foot flat; pelvis drops ~8 cm). The trunk leans back a little
    // and AWAY from the stretched side (lumbar extension + side-bend to the left) — the usual cue that brings in the
    // psoas from the lumbar spine (mean belly +11 % → +13 %).
    stretchPose: {
      joints: {
        hip_R: { flex: -30 },
        knee_R: { flex: 20 },
        ankle_R: { dorsi: -5 },
        hip_L: { flex: 35 },
        knee_L: { flex: 40 },
        ankle_L: { dorsi: 5 },
        lumbar: { flex: -12, lat: -10 },
        thorax: { lat: -6 },
      },
    },
    // front, a little from the figure's right, framed down to the knees (exact camera: the muscle-only auto framing
    // cut the legs off, so the lunge was unreadable). Psoas in front of the lumbar spine + iliacus in the fossa stay
    // visible, the knee drive comes toward the viewer and the lunge (right leg back, trunk leaning away) reads clearly.
    camera: { position: [-0.62, 1.1, 1.95], target: [-0.04, 0.85, 0.0] },
    focus: 'hip',
  },
  // ── R3a: tensor fasciae latae — ASIS + anterior outer lip of the iliac crest → anterolateral over the hip, in
  // front of the greater trochanter → joins the ITB at the upper third of the thigh (cream "tendon" = ITB part).
  'tensor-fasciae-latae': {
    id: 'tensor-fasciae-latae',
    strands: [
      {
        name: '上前腸骨棘から',
        path: [
          { ref: 'pelvis:asis', off: [0.004, -0.01, -0.012] },
          { bone: 'pelvis', rest: [0.13, 0.948, 0.036] },
          { bone: 'femur', rest: [0.153, 0.89, 0.032] },
          { bone: 'femur', rest: [0.167, 0.8, 0.014] },
        ],
        radius: 0.0095,
        tendon: [0.0, 0.14],
      },
      {
        name: '腸骨稜外唇から',
        path: [
          { ref: 'pelvis:gluteal_surface_ant', off: [0.002, -0.005, 0.02] },
          { bone: 'pelvis', rest: [0.134, 0.953, 0.026] },
          { bone: 'femur', rest: [0.157, 0.89, 0.025] },
          { bone: 'femur', rest: [0.169, 0.8, 0.008] },
        ],
        radius: 0.0075,
        tendon: [0.0, 0.14],
      },
    ],
    // hip flexion + abduction + internal rotation shortens it
    actionPose: { joints: { hip_R: { flex: 35, abd: 20, rot: -15 } } },
    // hip extension + adduction (leg crossed behind) + external rotation lengthens it
    stretchPose: { joints: { hip_R: { flex: -20, abd: -15, rot: 15 }, knee_R: { flex: 10 } } },
    // anterolateral close-up: ASIS → front of the trochanter → ITB, with the thigh moving
    camera: { position: [-0.95, 1.28, 1.02], target: [-0.14, 0.88, 0.03] },
    focus: 'hip',
  },
  // ── R3b: adductor longus — narrow, rounded tendon from the front of the pubic body (below the pubic tubercle,
  // between the crest and the symphysis) fanning out into a triangle that runs down, out and back, in front of
  // the brevis / magnus, round the medial side of the shaft to the medial lip of the linea aspera (middle third).
  'adductor-longus': {
    id: 'adductor-longus',
    strands: [
      {
        name: '上部（→粗線 中1/3 上端）',
        path: [
          { ref: 'pelvis:pubic_body', off: [0.006, 0.0, 0.007] },
          { bone: 'femur', rest: [0.062, 0.828, 0.038] },
          { bone: 'femur', rest: [0.095, 0.79, 0.008] },
          { ref: 'femur:linea_aspera_mid', off: [0.003, 0.06, -0.004] },
        ],
        radius: 0.0105,
        tendon: [0.12, 0.08],
      },
      {
        name: '中部（→粗線 中央）',
        path: [
          { ref: 'pelvis:pubic_body', off: [0.004, -0.002, 0.007] },
          { bone: 'femur', rest: [0.058, 0.82, 0.04] },
          { bone: 'femur', rest: [0.082, 0.755, 0.014] },
          { bone: 'femur', rest: [0.094, 0.715, -0.005] },
          { ref: 'femur:linea_aspera_mid', off: [-0.005, 0.0, -0.001] },
        ],
        radius: 0.0115,
        tendon: [0.11, 0.07],
      },
      {
        name: '下部（→粗線 中1/3 下端）',
        path: [
          { ref: 'pelvis:pubic_body', off: [0.002, -0.004, 0.007] },
          { bone: 'femur', rest: [0.054, 0.812, 0.04] },
          { bone: 'femur', rest: [0.074, 0.725, 0.014] },
          { bone: 'femur', rest: [0.088, 0.665, -0.005] },
          { ref: 'femur:linea_aspera_mid', off: [-0.013, -0.055, -0.002] },
        ],
        radius: 0.0105,
        tendon: [0.1, 0.07],
      },
    ],
    // adduction across the front of the other leg (with a little flexion, which it also helps) shortens it
    actionPose: { joints: { hip_R: { abd: -15, flex: 20 } } },
    // side lunge (right leg straight out to the side) lengthens it
    stretchPose: SIDE_LUNGE,
    // front, slightly from the figure's left: looks onto the anteromedial thigh (origin at the pubis, the fan
    // turning back toward the linea aspera) and shows the leg crossing in / swinging out
    camera: { dir: [0.35, 0.08, 1] },
    focus: 'hip',
  },
  // ── R3b: adductor magnus — adductor part (inferior pubic ramus + ischial ramus → the whole medial lip of the linea
  // aspera; uppermost = 'adductor minimus', nearly horizontal) + hamstring part (ischial tuberosity → straight down
  // the posteromedial thigh → tendon to the adductor tubercle). The adductor hiatus lies between the two parts.
  'adductor-magnus': {
    id: 'adductor-magnus',
    strands: [
      {
        name: '内転筋部 上部（小内転筋）',
        path: [
          { ref: 'pelvis:inferior_pubic_ramus', off: [0.0, -0.009, -0.003] },
          { bone: 'femur', rest: [0.072, 0.808, 0.014] },
          { ref: 'femur:linea_aspera_prox', off: [-0.004, 0.008, 0.0] },
        ],
        radius: 0.0105,
        tendon: [0.04, 0.06],
      },
      {
        name: '内転筋部 中部',
        path: [
          { ref: 'pelvis:ischial_ramus', off: [0.002, -0.007, -0.004] },
          { bone: 'femur', rest: [0.09, 0.765, -0.02] },
          { ref: 'femur:linea_aspera_prox', off: [-0.013, -0.06, 0.001] },
        ],
        radius: 0.0135,
        tendon: [0.04, 0.06],
      },
      {
        name: '内転筋部 中下部',
        path: [
          { ref: 'pelvis:ischial_ramus', off: [0.006, -0.009, -0.014] },
          { bone: 'femur', rest: [0.078, 0.72, -0.03] },
          { ref: 'femur:linea_aspera_mid', off: [-0.006, -0.03, -0.003] },
        ],
        radius: 0.0135,
        tendon: [0.04, 0.06],
      },
      {
        name: '内転筋部 下部',
        path: [
          { ref: 'pelvis:ischial_tuberosity', off: [-0.008, -0.01, 0.01] },
          { bone: 'femur', rest: [0.07, 0.7, -0.034] },
          { bone: 'femur', rest: [0.088, 0.63, -0.026] },
          { ref: 'femur:linea_aspera_dist', off: [-0.002, 0.0, 0.0] },
        ],
        radius: 0.0135,
        tendon: [0.04, 0.07],
      },
      {
        name: 'ハムストリング部（坐骨結節→内転筋結節）',
        path: [
          { ref: 'pelvis:ischial_tuberosity', off: [-0.004, -0.01, -0.006] },
          { bone: 'femur', rest: [0.055, 0.66, -0.03] },
          { ref: 'femur:adductor_tubercle', off: [-0.002, 0.002, -0.004] },
        ],
        radius: 0.017,
        tendon: [0.08, 0.35],
      },
    ],
    // Demo rest = relaxed stance with the feet apart (both hips 8° out, soles kept flat): from there the right leg
    // sweeps in across the midline (adduction, a touch of flexion so it passes in front of the standing leg).
    // Why not the anatomical position: the origins lie only ~10 cm below the hip centre and this skeleton's femur is
    // vertical (no valgus), so the adduction moment arms vanish after ~10° of adduction — from feet-together the best
    // any pose reaches is −9 % (extension lengthens the upper, flexor-side adductor fibres; the hamstring part's belly
    // changes only 3–4 %). From the stance the sweep shortens the belly ~14 % (rest 1.07 → 0.92).
    restPose: { joints: { hip: { abd: 8 }, ankle: { inv: 8 } } },
    actionPose: { joints: { hip_R: { abd: -15, flex: 4 }, ankle_R: { inv: 0 } } },
    // side lunge with the trunk leaning forward: abduction + hip flexion lengthen both parts (left hip / ankle reset
    // from the stance so the solved lunge contacts hold)
    stretchPose: {
      root: SIDE_LUNGE_LEAN.root,
      joints: { ...SIDE_LUNGE_LEAN.joints, hip_L: { flex: 55, abd: 0 }, ankle_L: { dorsi: 32.4, inv: 0 } },
    },
    // from behind, slightly from the figure's left: the posteromedial thigh with the whole fan and the hamstring part
    camera: { dir: [0.32, 0.12, -1] },
    focus: 'hip',
  },
  // ── R3b: gracilis — thin strap from the inferior pubic body / ramus beside the symphysis, down the most medial
  // part of the thigh, behind the medial femoral condyle (a knee flexor), forward under the medial tibial condyle to
  // the pes anserinus (between sartorius in front and semitendinosus behind). Long distal tendon.
  gracilis: {
    id: 'gracilis',
    strands: [
      {
        path: [
          { ref: 'pelvis:pubic_body', off: [-0.004, -0.018, -0.01] },
          { bone: 'femur', rest: [0.028, 0.79, 0.006] },
          { bone: 'femur', rest: [0.037, 0.67, -0.01] },
          { bone: 'femur', rest: [0.049, 0.565, -0.016] },
          { bone: 'femur', rest: [0.047, 0.508, -0.019] },
          { bone: 'tibia', rest: [0.05, 0.462, -0.012] },
          { bone: 'tibia', rest: [0.071, 0.427, 0.013] },
        ],
        radius: 0.0075,
        tendon: [0.05, 0.38],
        flat: { width: 0.022, normal: 'medial' },
      },
    ],
    // adduction + knee flexion shortens it
    actionPose: { joints: { hip_R: { abd: -12, flex: 10 }, knee_R: { flex: 70 } } },
    // side lunge: abduction with the knee straight lengthens it
    stretchPose: SIDE_LUNGE,
    camera: { dir: [0.3, 0.08, 1] },
    focus: 'hip',
  },
  // ── R3b: sartorius — the longest muscle: ASIS → obliquely down and in across the front of the thigh (lateral
  // border of the femoral triangle) → medial thigh → behind the medial femoral condyle → forward to the most
  // anterior part of the pes anserinus.
  sartorius: {
    id: 'sartorius',
    strands: [
      {
        path: [
          { ref: 'pelvis:asis', off: [-0.004, -0.012, -0.009] },
          { bone: 'femur', rest: [0.112, 0.86, 0.056] },
          { bone: 'femur', rest: [0.085, 0.74, 0.054] },
          { bone: 'femur', rest: [0.058, 0.64, 0.032] },
          { bone: 'femur', rest: [0.05, 0.56, 0.004] },
          { bone: 'femur', rest: [0.046, 0.51, -0.012] },
          { bone: 'tibia', rest: [0.048, 0.465, -0.004] },
          { bone: 'tibia', rest: [0.073, 0.436, 0.017] },
        ],
        radius: 0.0085,
        tendon: [0.03, 0.22],
      },
    ],
    // 'tailor' position: hip flexion + abduction + external rotation with the knee bent (ankle toward the other knee)
    actionPose: { joints: { hip_R: { flex: 55, abd: 25, rot: 35 }, knee_R: { flex: 85 } } },
    // lunge with the back leg straight (hip extension + adduction + internal rotation, knee extended). The belly only
    // lengthens ~8 %: the knee is already straight at rest and the hip is at its −35° extension limit; more adduction /
    // internal rotation adds < 1 % (a 59 cm muscle with a ~5 cm hip moment arm — the real sartorius changes little too).
    stretchPose: BACK_LEG_LUNGE,
    // front, slightly from the right: the oblique course across the thigh from the ASIS to the medial knee
    camera: { dir: [-0.4, 0.12, 1] },
    focus: 'hip',
  },
};

export const structures: Partial<Record<StructureId, StructureRig>> = {
  // SAMPLE — greater trochanter: bone piece tint + glow spot on its lateral facet.
  'greater-trochanter': {
    id: 'greater-trochanter',
    parts: [
      { type: 'bone', parts: ['greater_trochanter'] },
      { type: 'spot', at: 'femur:greater_trochanter_lat', radius: 0.016 },
    ],
    labelAt: 'femur:greater_trochanter_lat',
    // closer front-right oblique ('iso' direction): the default iso framing showed the whole trunk and legs, so the
    // trochanter was a small dot; a pure side view puts the hanging arm in front of it
    camera: { position: [-0.98, 1.22, 0.92], target: [-0.12, 0.9, 0.0] },
    focus: 'hip',
  },
  // ── R3a: trochanteric (subgluteus maximus) bursa — thin sac on the posterolateral greater trochanter, between the
  // bone / gluteal tendons and the overlying gluteus maximus–ITB junction.
  'trochanteric-bursa': {
    id: 'trochanteric-bursa',
    parts: [{ type: 'bursa', at: 'femur:greater_trochanter_lat', radii: [0.0045, 0.022, 0.015], off: [0.01, -0.011, -0.01] }],
    labelAt: { ref: 'femur:greater_trochanter_lat', off: [0.014, -0.01, -0.01] },
    // same posterolateral close-up on the trochanter as 'gluteal-tendons'
    camera: { position: [-1.1, 1.18, -0.62], target: [-0.14, 0.91, -0.01] },
    focus: 'hip',
  },
  // ── R3a: gluteus medius & minimus tendons at the greater trochanter — medius → lateral facet (main) and
  // superoposterior facet, minimus → anterior facet. Each cord overlays the tendon end of the matching strands.
  'gluteal-tendons': {
    id: 'gluteal-tendons',
    parts: [
      {
        // gluteus medius → lateral facet
        type: 'tendon',
        path: [
          { bone: 'pelvis', rest: [0.151, 0.942, -0.002] },
          { bone: 'femur', rest: [0.161, 0.918, -0.003] },
          { ref: 'femur:greater_trochanter_lat', off: [0.005, 0.007, 0.002] },
        ],
        radius: 0.0026,
        flat: { width: 0.02, normal: 'lateral' },
      },
      {
        // gluteus medius posterior fibres → superoposterior facet
        type: 'tendon',
        path: [
          { bone: 'pelvis', rest: [0.137, 0.952, -0.042] },
          { bone: 'femur', rest: [0.143, 0.937, -0.03] },
          { ref: 'femur:greater_trochanter_sup', off: [0.004, 0.002, -0.008] },
        ],
        radius: 0.0024,
        flat: { width: 0.014, normal: 'lateral' },
      },
      {
        // gluteus minimus → anterior facet
        type: 'tendon',
        path: [
          { bone: 'pelvis', rest: [0.141, 0.938, 0.016] },
          { bone: 'femur', rest: [0.147, 0.92, 0.015] },
          { ref: 'femur:greater_trochanter_ant', off: [0.003, 0.002, 0.0] },
        ],
        radius: 0.0024,
        flat: { width: 0.014, normal: 'anterior' },
      },
    ],
    labelAt: { ref: 'femur:greater_trochanter_lat', off: [0.006, 0.02, 0.0] },
    // posterolateral close-up on the trochanter: the tendons beside (not behind) the ITB, the medius fan above.
    // Exact camera because the auto framing also fits the whole ITB down to the knee on condition pages.
    camera: { position: [-1.1, 1.18, -0.62], target: [-0.14, 0.91, -0.01] },
    focus: 'hip',
  },
  // ── R3a: sciatic nerve (L4–S3) — sacral plexus on the front of the piriformis → out of the pelvis through the
  // greater sciatic notch BELOW the piriformis → between the ischial tuberosity and the greater trochanter →
  // down the back of the thigh (on the femur) → splits above the knee into the tibial and common fibular nerves.
  'sciatic-nerve': {
    id: 'sciatic-nerve',
    parts: [
      {
        type: 'nerve',
        path: [
          { bone: 'pelvis', rest: [0.035, 0.958, -0.052] },
          { bone: 'pelvis', rest: [0.058, 0.916, -0.066] },
          { bone: 'pelvis', rest: [0.08, 0.892, -0.074] },
          { bone: 'pelvis', rest: [0.094, 0.86, -0.07] },
          { bone: 'femur', rest: [0.103, 0.79, -0.058] },
          { bone: 'femur', rest: [0.099, 0.68, -0.052] },
          { bone: 'femur', rest: [0.093, 0.585, -0.045] },
        ],
        radius: 0.0048,
      },
      {
        // tibial nerve: straight down through the popliteal fossa
        type: 'nerve',
        path: [
          { bone: 'femur', rest: [0.093, 0.586, -0.045] },
          { bone: 'femur', rest: [0.09, 0.535, -0.037] },
          { bone: 'tibia', rest: [0.089, 0.49, -0.04] },
        ],
        radius: 0.0034,
      },
      {
        // common fibular nerve: laterally along the biceps femoris toward the back of the fibular head
        type: 'nerve',
        path: [
          { bone: 'femur', rest: [0.093, 0.586, -0.045] },
          { bone: 'femur', rest: [0.112, 0.53, -0.036] },
          { bone: 'tibia', rest: [0.122, 0.478, -0.033] },
        ],
        radius: 0.0028,
      },
    ],
    labelAt: { bone: 'pelvis', rest: [0.094, 0.862, -0.07] },
    camera: 'back',
    focus: 'hip',
  },
  // ── R3a: anterior superior iliac spine — glow spot on the bony point (sartorius / TFL origin).
  asis: {
    id: 'asis',
    parts: [{ type: 'spot', at: 'pelvis:asis', radius: 0.015 }],
    labelAt: 'pelvis:asis',
    // front-right close-up (a small bony point is lost in the 42 cm auto framing)
    camera: { position: [-0.84, 1.36, 0.96], target: [-0.1, 0.97, 0.04] },
    focus: 'hip',
  },
  // ── R3b: hip joint — the ball (femoral head) in the deep socket (acetabulum): both bone pieces tinted + a glow on
  // the front of the joint, where hip-joint pain is felt (deep in the front of the groin).
  'hip-joint': {
    id: 'hip-joint',
    parts: [
      { type: 'spot', at: { ref: 'femur:head', off: [0.006, -0.002, 0.02] }, radius: 0.012 },
      { type: 'bone', parts: ['femoral_head', 'acetabulum'] },
    ],
    labelAt: { ref: 'femur:head', off: [0.008, 0.0, 0.026] },
    // front-right close-up of the joint (the 42 cm auto framing makes a 5 cm joint tiny)
    camera: { position: [-0.62, 1.1, 0.66], target: [-0.09, 0.915, 0.01] },
    focus: 'hip',
  },
  // ── R3b: acetabular labrum — horseshoe of fibrocartilage on the rim of the socket (11 small cushions + a thin
  // ring through them, which carries the role colour). The beads follow the engine's acetabular rim (cup opening
  // normal (lat 0.43, −0.88, 0.22), rim ~0.03 m from the head centre), sitting on its inner edge just off the
  // femoral head; the gap is the acetabular notch (bridged by the transverse ligament, not part of the labrum).
  'hip-labrum': {
    id: 'hip-labrum',
    parts: [
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.0665, 0.8984, -0.0092] }, radii: [0.0042, 0.0042, 0.0042] },  // 後下
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.0760, 0.9001, -0.0204] }, radii: [0.0042, 0.0042, 0.0042] },
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.0888, 0.9051, -0.0256] }, radii: [0.0042, 0.0042, 0.0042] },  // 後
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.1017, 0.9119, -0.0234] }, radii: [0.0042, 0.0042, 0.0042] },
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.1112, 0.9188, -0.0144] }, radii: [0.0042, 0.0042, 0.0042] },
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.1146, 0.9239, -0.0010] }, radii: [0.0042, 0.0042, 0.0042] },  // 上（外側）
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.1112, 0.9259, 0.0132] }, radii: [0.0042, 0.0042, 0.0042] },
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.1017, 0.9241, 0.0244] }, radii: [0.0042, 0.0042, 0.0042] },  // 前上
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.0888, 0.9192, 0.0296] }, radii: [0.0042, 0.0042, 0.0042] },  // 前
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.0760, 0.9123, 0.0274] }, radii: [0.0042, 0.0042, 0.0042] },
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.0665, 0.9054, 0.0184] }, radii: [0.0042, 0.0042, 0.0042] },  // 前下
      {
        type: 'ligament',
        path: [
          { bone: 'pelvis', rest: [0.0665, 0.8984, -0.0092] },
          { bone: 'pelvis', rest: [0.0760, 0.9001, -0.0204] },
          { bone: 'pelvis', rest: [0.0888, 0.9051, -0.0256] },
          { bone: 'pelvis', rest: [0.1017, 0.9119, -0.0234] },
          { bone: 'pelvis', rest: [0.1112, 0.9188, -0.0144] },
          { bone: 'pelvis', rest: [0.1146, 0.9239, -0.0010] },
          { bone: 'pelvis', rest: [0.1112, 0.9259, 0.0132] },
          { bone: 'pelvis', rest: [0.1017, 0.9241, 0.0244] },
          { bone: 'pelvis', rest: [0.0888, 0.9192, 0.0296] },
          { bone: 'pelvis', rest: [0.0760, 0.9123, 0.0274] },
          { bone: 'pelvis', rest: [0.0665, 0.9054, 0.0184] },
        ],
        radius: 0.0036,
      },
    ],
    labelAt: { bone: 'pelvis', rest: [0.104, 0.926, 0.026] },
    // anterolateral close-up from slightly below the rim: the anterosuperior labrum (where tears usually are) is
    // in front of the femoral neck
    camera: { position: [-0.62, 0.9, 0.46], target: [-0.095, 0.915, 0.005] },
    focus: 'hip',
  },
  // ── R3b: ischial tuberosity (sit bone) — bone tint + glow on its posteroinferior surface, where the hamstring
  // tendons attach and where the saddle / chair pushes.
  'ischial-tuberosity': {
    id: 'ischial-tuberosity',
    parts: [
      { type: 'bone', parts: ['ischial_tuberosity'] },
      { type: 'spot', at: { ref: 'pelvis:ischial_tuberosity', off: [0.0, -0.01, -0.012] }, radius: 0.013 },
    ],
    labelAt: { ref: 'pelvis:ischial_tuberosity', off: [0.0, -0.012, -0.018] },
    // from behind and slightly below on the right: the sit bone under the buttock
    camera: { position: [-0.42, 0.9, -0.66], target: [-0.06, 0.835, -0.035] },
    focus: 'hip',
  },
  // ── R3b: proximal hamstring tendons at the ischial tuberosity — the common (conjoint) tendon of the biceps femoris
  // long head + semitendinosus from the inferomedial facet, and the flat semimembranosus tendon from the
  // superolateral facet running down deep to it. Distal ends ride the femur (they follow the muscles), so in hip
  // flexion the tendons wrap round the tuberosity — the compression the description talks about.
  'proximal-hamstring-tendon': {
    id: 'proximal-hamstring-tendon',
    parts: [
      {
        // conjoint tendon (biceps femoris long head + semitendinosus)
        type: 'tendon',
        path: [
          { ref: 'pelvis:ischial_tuberosity', off: [0.0, -0.01, -0.01] },
          { bone: 'femur', rest: [0.066, 0.8, -0.05] },
          { bone: 'femur', rest: [0.073, 0.765, -0.051] },
        ],
        radius: 0.0036,
        flat: { width: 0.014, normal: 'posterior' },
      },
      {
        // semimembranosus tendon
        type: 'tendon',
        path: [
          { ref: 'pelvis:ischial_tuberosity', off: [0.008, 0.006, -0.006] },
          { bone: 'femur', rest: [0.074, 0.8, -0.043] },
          { bone: 'femur', rest: [0.074, 0.755, -0.041] },
        ],
        radius: 0.0028,
        flat: { width: 0.012, normal: 'posterior' },
      },
    ],
    labelAt: { bone: 'femur', rest: [0.068, 0.79, -0.054] },
    // from behind, below and to the right: looks up under the buttock at the tendons leaving the sit bone. Far enough
    // back to show the pelvis, buttock and thigh too (on the condition page the gluteus maximus / hamstrings around the
    // tendon otherwise filled the whole card and the body context was lost)
    camera: { position: [-0.6, 0.7, -0.98], target: [-0.07, 0.83, -0.04] },
    focus: 'hip',
  },
  // ── R3b: pubic symphysis — the fibrocartilage disc between the two pubic bones at the front midline (tinted) + a
  // glow on it. The adductor longus / gracilis pull from below, the rectus abdominis from above.
  'pubic-symphysis': {
    id: 'pubic-symphysis',
    parts: [
      { type: 'spot', at: { ref: 'pelvis:pubic_symphysis', off: [0.0, -0.002, 0.002] }, radius: 0.012 },
      { type: 'bone', parts: ['pubic_symphysis'] },
    ],
    labelAt: { ref: 'pelvis:pubic_symphysis', off: [0.0, -0.004, 0.01] },
    // front close-up, slightly from below and from the right
    camera: { position: [-0.2, 0.98, 0.74], target: [-0.01, 0.885, 0.06] },
    focus: 'hip',
  },
};
