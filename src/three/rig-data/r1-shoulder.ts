// r1 — shoulder / arm / neck muscles + shoulder structures.
// Owner after the engine agent: rigging agent r1. See docs/ENGINE.md.
import type { MuscleId, StructureId } from '../../data/registry';
import type { MuscleRig, StructureRig } from './types';

export const muscles: Partial<Record<MuscleId, MuscleRig>> = {
  // SAMPLE — supraspinatus: supraspinous fossa → under the acromion, over the humeral head → greater tubercle (superior facet).
  supraspinatus: {
    id: 'supraspinatus',
    strands: [
      // 3 strands fill the supraspinous fossa (medial 2/3) and converge under the acromion onto the greater tubercle.
      {
        name: '内側上部（上角寄り）',
        path: [
          { ref: 'scapula:superior_angle', off: [0.007, -0.009, 0.007] },
          { bone: 'scapula', rest: [0.108, 1.432, -0.07] },
          { bone: 'scapula', rest: [0.137, 1.438, -0.05] },
          { bone: 'scapula', rest: [0.162, 1.442, -0.016] },
          { mix: [{ bone: 'scapula', rest: [0.178, 1.438, -0.009] }, { bone: 'humerus', rest: [0.178, 1.438, -0.009] }], t: 0.5 },
          { ref: 'humerus:greater_tubercle_sup', off: [0.0, 0.002, -0.004] },
        ],
        radius: 0.0088,
        tendon: [0.0, 0.3],
      },
      {
        name: '中央',
        path: [
          { ref: 'scapula:supraspinous_fossa', off: [-0.012, 0.003, -0.002] },
          { ref: 'scapula:supraspinous_fossa', off: [0.012, 0.004, 0.012] },
          { bone: 'scapula', rest: [0.138, 1.435, -0.044] },
          { bone: 'scapula', rest: [0.163, 1.441, -0.01] },
          { mix: [{ bone: 'scapula', rest: [0.179, 1.438, -0.004] }, { bone: 'humerus', rest: [0.179, 1.438, -0.004] }], t: 0.5 },
          { ref: 'humerus:greater_tubercle_sup', off: [0.0, 0.002, 0.0] },
        ],
        radius: 0.0105,
        tendon: [0.0, 0.3],
      },
      {
        name: '内側下部（肩甲棘寄り）',
        path: [
          { ref: 'scapula:spine_medial', off: [0.01, 0.034, 0.006] },
          { bone: 'scapula', rest: [0.114, 1.426, -0.075] },
          { bone: 'scapula', rest: [0.14, 1.432, -0.04] },
          { bone: 'scapula', rest: [0.164, 1.44, -0.004] },
          { mix: [{ bone: 'scapula', rest: [0.18, 1.437, 0.001] }, { bone: 'humerus', rest: [0.18, 1.437, 0.001] }], t: 0.5 },
          { ref: 'humerus:greater_tubercle_sup', off: [0.0, 0.0, 0.004] },
        ],
        radius: 0.0088,
        tendon: [0.0, 0.32],
      },
    ],
    // abduction shortens it (it starts abduction)
    actionPose: { joints: { shoulder_R: { abd: 75 } } },
    // hand behind the back: extension + adduction + internal rotation
    stretchPose: { joints: { shoulder_R: { flex: -35, abd: -12, rot: -75 }, elbow_R: { flex: 95 }, forearm_R: { sup: -90 } } },
    camera: 'isoBack',
    focus: 'shoulder',
  },

  // ── R1a ────────────────────────────────────────────────────────────────────────────────────────
  // infraspinatus: infraspinous fossa (below the spine) → behind the glenohumeral joint → greater tubercle (middle facet).
  // 4 strands fan from the fossa (the engine's scapula is narrow: medial border ≈ 0.085, lateral border ≈ 0.10–0.14).
  // Via points: lateral fossa + behind the glenoid neck (scapula = pulley), posterior humeral head (humerus) so the tendon
  // wraps the head in internal rotation / cross-body. The lateral 40 % is tendon (the part draped over the head).
  infraspinatus: {
    id: 'infraspinatus',
    strands: [
      {
        name: '上部（肩甲棘の下）',
        path: [
          { bone: 'scapula', rest: [0.09, 1.368, -0.1] },
          { bone: 'scapula', rest: [0.132, 1.374, -0.068] },
          { bone: 'scapula', rest: [0.158, 1.398, -0.046] },
          { mix: [{ bone: 'scapula', rest: [0.187, 1.404, -0.042] }, { bone: 'humerus', rest: [0.187, 1.404, -0.042] }], t: 0.4 },
          { ref: 'humerus:greater_tubercle_mid', off: [0.002, 0.003, -0.004] },
        ],
        radius: 0.0075,
        tendon: [0.0, 0.4],
      },
      {
        name: '中部',
        path: [
          { bone: 'scapula', rest: [0.093, 1.328, -0.104] },
          { bone: 'scapula', rest: [0.126, 1.354, -0.076] },
          { bone: 'scapula', rest: [0.156, 1.386, -0.048] },
          { mix: [{ bone: 'scapula', rest: [0.187, 1.396, -0.044] }, { bone: 'humerus', rest: [0.187, 1.396, -0.044] }], t: 0.4 },
          { ref: 'humerus:greater_tubercle_mid', off: [0.002, -0.002, -0.004] },
        ],
        radius: 0.008,
        tendon: [0.0, 0.4],
      },
      {
        name: '中下部',
        path: [
          { bone: 'scapula', rest: [0.092, 1.303, -0.106] },
          { bone: 'scapula', rest: [0.12, 1.333, -0.083] },
          { bone: 'scapula', rest: [0.155, 1.381, -0.049] },
          { mix: [{ bone: 'scapula', rest: [0.186, 1.392, -0.045] }, { bone: 'humerus', rest: [0.186, 1.392, -0.045] }], t: 0.4 },
          { ref: 'humerus:greater_tubercle_mid', off: [0.001, -0.005, -0.005] },
        ],
        radius: 0.0075,
        tendon: [0.0, 0.4],
      },
      {
        name: '下部',
        path: [
          { bone: 'scapula', rest: [0.092, 1.272, -0.108] },
          { bone: 'scapula', rest: [0.112, 1.305, -0.09] },
          { bone: 'scapula', rest: [0.152, 1.372, -0.052] },
          { mix: [{ bone: 'scapula', rest: [0.186, 1.385, -0.047] }, { bone: 'humerus', rest: [0.186, 1.385, -0.047] }], t: 0.4 },
          { ref: 'humerus:greater_tubercle_mid', off: [0.0, -0.009, -0.006] },
        ],
        radius: 0.007,
        tendon: [0.0, 0.4],
      },
    ],
    // external rotation with the elbow at the side
    actionPose: { joints: { shoulder_R: { abd: 10, rot: 60 }, elbow_R: { flex: 90 }, forearm_R: { sup: -85 } } },
    // cross-body stretch (ex-cross-body-stretch): arm forward at shoulder height pulled across the chest
    stretchPose: { joints: { shoulder_R: { flex: 90, abd: -40, rot: -25 }, elbow_R: { flex: 5 }, forearm_R: { sup: -70 } } },
    camera: { dir: [-0.8, 0.12, -0.75] },
    focus: 'shoulder',
  },
  // teres minor: upper lateral border (dorsal surface; on the engine's scapula the border runs ≈ 0.13 → 0.11 lateral
  // between y 1.35 and 1.31 — the 'scapula:lateral_border' landmark lies ~2.5 cm lateral of the bone, so rest points
  // are used) → behind the joint → greater tubercle (inferior facet). Same ER action / cross-body stretch as infraspinatus.
  'teres-minor': {
    id: 'teres-minor',
    strands: [
      {
        name: '上部',
        path: [
          { bone: 'scapula', rest: [0.128, 1.345, -0.064] },
          { bone: 'scapula', rest: [0.15, 1.362, -0.054] },
          { bone: 'humerus', rest: [0.184, 1.382, -0.04] },
          { ref: 'humerus:greater_tubercle_inf', off: [0.002, 0.002, -0.004] },
        ],
        radius: 0.0065,
        tendon: [0.0, 0.18],
      },
      {
        name: '下部',
        path: [
          { bone: 'scapula', rest: [0.118, 1.318, -0.075] },
          { bone: 'scapula', rest: [0.145, 1.348, -0.06] },
          { bone: 'humerus', rest: [0.183, 1.375, -0.042] },
          { ref: 'humerus:greater_tubercle_inf', off: [0.0, -0.005, -0.004] },
        ],
        radius: 0.006,
        tendon: [0.0, 0.18],
      },
    ],
    actionPose: { joints: { shoulder_R: { abd: 10, rot: 60 }, elbow_R: { flex: 90 }, forearm_R: { sup: -85 } } },
    stretchPose: { joints: { shoulder_R: { flex: 90, abd: -40 }, elbow_R: { flex: 5 }, forearm_R: { sup: -70 } } },
    camera: { dir: [-0.8, 0.12, -0.75] },
    focus: 'shoulder',
  },
  // subscapularis: subscapular fossa (costal surface, between scapula and ribs) → in front of the scapular neck → wraps
  // the front of the humeral head (scapula point + a scapula/humerus mix so it neither cuts the head in external rotation
  // nor kinks in internal rotation) → lesser tubercle. Thin strands: the engine's scapula lies almost on the ribs.
  subscapularis: {
    id: 'subscapularis',
    strands: [
      {
        name: '上部',
        path: [
          { bone: 'scapula', rest: [0.084, 1.42, -0.079] },
          { bone: 'scapula', rest: [0.115, 1.4, -0.053] },
          { bone: 'scapula', rest: [0.142, 1.402, 0.008] },
          { mix: [{ bone: 'scapula', rest: [0.162, 1.403, 0.028] }, { bone: 'humerus', rest: [0.162, 1.403, 0.028] }], t: 0.65 },
          { ref: 'humerus:lesser_tubercle', off: [0.0, 0.004, 0.003] },
        ],
        radius: 0.0055,
        tendon: [0.0, 0.3],
      },
      {
        name: '中部',
        path: [
          { bone: 'scapula', rest: [0.086, 1.354, -0.087] },
          { bone: 'scapula', rest: [0.115, 1.37, -0.057] },
          { bone: 'scapula', rest: [0.145, 1.387, 0.008] },
          { mix: [{ bone: 'scapula', rest: [0.162, 1.392, 0.028] }, { bone: 'humerus', rest: [0.162, 1.392, 0.028] }], t: 0.65 },
          { ref: 'humerus:lesser_tubercle', off: [0.0, -0.002, 0.003] },
        ],
        radius: 0.006,
        tendon: [0.0, 0.3],
      },
      {
        name: '下部',
        path: [
          { bone: 'scapula', rest: [0.089, 1.3, -0.09] },
          { bone: 'scapula', rest: [0.103, 1.326, -0.073] },
          { bone: 'scapula', rest: [0.146, 1.374, 0.008] },
          { mix: [{ bone: 'scapula', rest: [0.162, 1.382, 0.028] }, { bone: 'humerus', rest: [0.162, 1.382, 0.028] }], t: 0.65 },
          { ref: 'humerus:lesser_tubercle', off: [0.0, -0.008, 0.002] },
        ],
        radius: 0.0055,
        tendon: [0.0, 0.3],
      },
    ],
    // internal rotation (forearm toward the belly)
    actionPose: { joints: { shoulder_R: { abd: 10, rot: -55 }, elbow_R: { flex: 90 }, forearm_R: { sup: -85 } } },
    // external rotation
    stretchPose: { joints: { shoulder_R: { abd: 20, rot: 60 }, elbow_R: { flex: 90 }, forearm_R: { sup: -85 } } },
    // front view through the rib cage (the subscapular fossa faces antero-medially), low enough to show the forearm
    // swinging in to the belly (internal rotation) and out (external rotation)
    camera: { position: [0.03, 1.36, 1.06], target: [-0.12, 1.255, 0.03] },
    focus: 'shoulder',
  },
  // deltoid: lateral third of the clavicle (anterior) / acromion (middle) / spine of the scapula (posterior)
  // → draped over the humeral head & greater tubercle → deltoid tuberosity.
  deltoid: {
    id: 'deltoid',
    strands: [
      {
        name: '前部（鎖骨部・内側）',
        path: [
          { bone: 'scapula', rest: [0.128, 1.445, 0.047] },
          { bone: 'scapula', rest: [0.15, 1.43, 0.052] },
          { bone: 'humerus', rest: [0.183, 1.393, 0.042] },
          { bone: 'humerus', rest: [0.192, 1.37, 0.032] },
          { ref: 'humerus:deltoid_tuberosity', off: [0.002, 0.006, 0.007] },
        ],
        radius: 0.011,
        tendon: [0.03, 0.12],
      },
      {
        name: '前部（鎖骨部・外側）',
        path: [
          { bone: 'scapula', rest: [0.162, 1.448, 0.022] },
          { bone: 'humerus', rest: [0.209, 1.395, 0.032] },
          { bone: 'humerus', rest: [0.208, 1.37, 0.024] },
          { ref: 'humerus:deltoid_tuberosity', off: [0.003, 0.003, 0.004] },
        ],
        radius: 0.012,
        tendon: [0.03, 0.12],
      },
      {
        name: '中部（肩峰部）',
        path: [
          { ref: 'scapula:acromion', off: [0.007, -0.005, 0.0] },
          { bone: 'humerus', rest: [0.223, 1.37, -0.005] },
          { ref: 'humerus:deltoid_tuberosity', off: [0.004, 0.0, 0.0] },
        ],
        radius: 0.013,
        tendon: [0.03, 0.12],
      },
      {
        name: '後部（肩甲棘部・外側）',
        path: [
          { bone: 'scapula', rest: [0.168, 1.432, -0.058] },
          { bone: 'humerus', rest: [0.208, 1.393, -0.050] },
          { ref: 'humerus:deltoid_tuberosity', off: [0.003, 0.003, -0.004] },
        ],
        radius: 0.012,
        tendon: [0.03, 0.12],
      },
      {
        name: '後部（肩甲棘部・内側）',
        path: [
          { bone: 'scapula', rest: [0.135, 1.415, -0.09] },
          { bone: 'humerus', rest: [0.185, 1.391, -0.058] },
          { ref: 'humerus:deltoid_tuberosity', off: [0.002, 0.006, -0.007] },
        ],
        radius: 0.011,
        tendon: [0.03, 0.12],
      },
    ],
    // abduction: the middle part shortens most (the clavicular / spinal fibres closest to the axis change little)
    actionPose: { joints: { shoulder_R: { abd: 80 } } },
    // hand behind the back (extension + adduction + internal rotation): lengthens the middle & anterior parts and,
    // through the internal rotation, keeps the posterior part from shortening. (The cross-body stretch lengthens only
    // the posterior / middle parts and shortens the anterior part, so it is not used for the whole-muscle demo.)
    stretchPose: { joints: { shoulder_R: { flex: -40, abd: -10, rot: -45 }, elbow_R: { flex: 90 }, forearm_R: { sup: -90 } } },
    camera: 'iso',
    focus: 'shoulder',
  },
  // pectoralis major: clavicular → sternocostal → abdominal parts (flat bands) converging on the crest of the greater
  // tubercle. Bilaminar twist: the clavicular / upper sternal fibres insert lowest, the lower sternal / abdominal highest.
  'pectoralis-major': {
    id: 'pectoralis-major',
    strands: [
      {
        name: '鎖骨部',
        path: [
          { bone: 'scapula', rest: [0.065, 1.434, 0.078] },
          { bone: 'scapula', rest: [0.13, 1.39, 0.062] },
          { mix: [{ bone: 'scapula', rest: [0.168, 1.35, 0.045] }, { bone: 'humerus', rest: [0.168, 1.35, 0.045] }], t: 0.5 },
          { ref: 'humerus:crest_greater_tubercle', off: [0.002, -0.022, 0.004] },
        ],
        radius: 0.0055,
        tendon: [0.02, 0.1],
        flat: { width: 0.032, normal: 'anterior' },
      },
      {
        name: '胸肋部（上部）',
        path: [
          { bone: 'thorax', rest: [0.016, 1.395, 0.088] },
          { bone: 'thorax', rest: [0.075, 1.375, 0.066] },
          { mix: [{ bone: 'scapula', rest: [0.17, 1.34, 0.04] }, { bone: 'humerus', rest: [0.17, 1.34, 0.04] }], t: 0.5 },
          { ref: 'humerus:crest_greater_tubercle', off: [0.002, -0.012, 0.004] },
        ],
        radius: 0.0055,
        tendon: [0.02, 0.1],
        flat: { width: 0.034, normal: 'anterior' },
      },
      {
        name: '胸肋部（中部）',
        path: [
          { bone: 'thorax', rest: [0.018, 1.345, 0.103] },
          { bone: 'thorax', rest: [0.095, 1.338, 0.062] },
          { ref: 'humerus:crest_greater_tubercle', off: [0.0, -0.003, 0.002] },
        ],
        radius: 0.006,
        tendon: [0.02, 0.1],
        flat: { width: 0.036, normal: 'anterior' },
      },
      {
        name: '胸肋部（下部）',
        path: [
          { bone: 'thorax', rest: [0.035, 1.29, 0.104] },
          { bone: 'thorax', rest: [0.113, 1.29, 0.064] },
          { ref: 'humerus:crest_greater_tubercle', off: [0.0, 0.006, -0.001] },
        ],
        radius: 0.0055,
        tendon: [0.02, 0.12],
        flat: { width: 0.034, normal: 'anterior' },
      },
      {
        name: '腹部',
        path: [
          { bone: 'thorax', rest: [0.062, 1.232, 0.102] },
          { bone: 'thorax', rest: [0.131, 1.263, 0.047] },
          { ref: 'humerus:crest_greater_tubercle', off: [-0.001, 0.014, -0.003] },
        ],
        radius: 0.0045,
        tendon: [0.03, 0.14],
        flat: { width: 0.028, normal: 'anterior' },
      },
    ],
    // adduction + internal rotation in front of the body (all parts shorten; raising the arm would lengthen the lower fibres)
    actionPose: { joints: { shoulder_R: { flex: 20, abd: -25, rot: -30 }, elbow_R: { flex: 90 }, forearm_R: { sup: -80 } } },
    // doorway stretch: arm at shoulder height, elbow 90° with the forearm up, horizontally abducted 10° behind the body
    stretchPose: { joints: { shoulder_R: { abd: 70, flex: -10, rot: 50 }, elbow_R: { flex: 90 }, forearm_R: { sup: -90 }, scapula_R: { protr: -8 } } },
    camera: 'iso',
    focus: 'shoulder',
  },
  // pectoralis minor: anterior surfaces of ribs 3–5 (near the costal cartilages) → coracoid process (medial border).
  // Origins are rest points on the engine's rib tubes (the thorax:rib3_ant…rib5_ant landmarks float 2–3 cm in front of
  // the modelled ribs). No via points: the muscle bridges straight to the coracoid, so protraction shortens it.
  'pectoralis-minor': {
    id: 'pectoralis-minor',
    strands: [
      {
        name: '第3肋骨から',
        path: [
          { bone: 'thorax', rest: [0.083, 1.351, 0.057] },
          { ref: 'scapula:coracoid', off: [-0.006, -0.001, 0.002] },
        ],
        radius: 0.006,
        tendon: [0.04, 0.15],
      },
      {
        name: '第4肋骨から',
        path: [
          { bone: 'thorax', rest: [0.096, 1.319, 0.062] },
          { ref: 'scapula:coracoid', off: [-0.005, -0.004, 0.0] },
        ],
        radius: 0.0068,
        tendon: [0.04, 0.15],
      },
      {
        name: '第5肋骨から',
        path: [
          { bone: 'thorax', rest: [0.105, 1.287, 0.064] },
          { ref: 'scapula:coracoid', off: [-0.003, -0.007, -0.002] },
        ],
        radius: 0.006,
        tendon: [0.04, 0.15],
      },
    ],
    // pulls the scapula forward and down (protraction + depression; the rig has no anterior-tilt DOF)
    actionPose: { joints: { scapula_R: { protr: 25, elev: -10 } } },
    // doorway stretch with the shoulder blade drawn back (retraction) — the coracoid moves away from the ribs
    stretchPose: { joints: { shoulder_R: { flex: 90, abd: 100 }, elbow_R: { flex: 90 }, forearm_R: { sup: -90 }, scapula_R: { protr: -20 } } },
    camera: 'iso',
    focus: 'shoulder',
  },
  // biceps brachii: long head (supraglenoid tubercle → over the humeral head → bicipital groove) + short head (coracoid)
  // → common distal tendon in front of the elbow → radial tuberosity.
  'biceps-brachii': {
    id: 'biceps-brachii',
    strands: [
      {
        name: '長頭',
        path: [
          { ref: 'scapula:supraglenoid_tubercle', off: [0.002, 0.003, 0.002] },
          { mix: [{ bone: 'scapula', rest: [0.174, 1.43, 0.009] }, { bone: 'humerus', rest: [0.174, 1.43, 0.009] }], t: 0.5 },
          { bone: 'humerus', rest: [0.188, 1.395, 0.025] },
          { bone: 'humerus', rest: [0.191, 1.36, 0.025] },
          { bone: 'humerus', rest: [0.199, 1.24, 0.021] },
          { bone: 'humerus', rest: [0.203, 1.13, 0.02] },
          { ref: 'forearm:radial_tuberosity', off: [0.0, 0.002, 0.002] },
        ],
        radius: 0.0095,
        tendon: [0.3, 0.18],
      },
      {
        name: '短頭',
        path: [
          { ref: 'scapula:coracoid', off: [0.002, -0.006, 0.004] },
          { bone: 'humerus', rest: [0.176, 1.34, 0.034] },
          { bone: 'humerus', rest: [0.183, 1.24, 0.024] },
          { bone: 'humerus', rest: [0.199, 1.13, 0.02] },
          { ref: 'forearm:radial_tuberosity', off: [-0.002, 0.0, 0.002] },
        ],
        radius: 0.009,
        tendon: [0.14, 0.18],
      },
    ],
    // elbow flexion with supination (+ a little shoulder flexion)
    actionPose: { joints: { shoulder_R: { flex: 20 }, elbow_R: { flex: 110 }, forearm_R: { sup: 0 } } },
    // arm reaching back (shoulder extension), elbow straight, forearm pronated
    stretchPose: { joints: { shoulder_R: { flex: -45 }, elbow_R: { flex: 0 }, forearm_R: { sup: -150 } } },
    camera: { dir: [-1, 0.15, 0.35] },
    focus: 'shoulder',
  },
  // triceps brachii: long head (infraglenoid tubercle) + lateral head (posterior humerus above the radial groove)
  // + medial head (posterior humerus below the groove) → olecranon.
  'triceps-brachii': {
    id: 'triceps-brachii',
    strands: [
      {
        name: '長頭',
        path: [
          { ref: 'scapula:infraglenoid_tubercle', off: [0.0, -0.004, -0.005] },
          { bone: 'humerus', rest: [0.182, 1.3, -0.037] },
          { bone: 'humerus', rest: [0.184, 1.22, -0.042] },
          { bone: 'humerus', rest: [0.186, 1.13, -0.046] },
          { ref: 'forearm:olecranon', off: [0.0, 0.004, -0.006] },
        ],
        radius: 0.0115,
        tendon: [0.08, 0.2],
      },
      {
        name: '外側頭',
        path: [
          { ref: 'humerus:shaft_post_prox', off: [0.004, 0.0, -0.008] },
          { bone: 'humerus', rest: [0.2, 1.22, -0.038] },
          { bone: 'humerus', rest: [0.192, 1.13, -0.046] },
          { ref: 'forearm:olecranon', off: [0.003, 0.004, -0.006] },
        ],
        radius: 0.011,
        tendon: [0.03, 0.22],
      },
      {
        name: '内側頭',
        path: [
          { ref: 'humerus:shaft_post_mid', off: [-0.008, 0.0, -0.006] },
          { bone: 'humerus', rest: [0.18, 1.165, -0.037] },
          { bone: 'humerus', rest: [0.183, 1.128, -0.047] },
          { ref: 'forearm:olecranon', off: [-0.003, 0.004, -0.005] },
        ],
        radius: 0.01,
        tendon: [0.0, 0.15],
      },
    ],
    // demo starts with the elbow bent 60°
    restPose: { joints: { elbow_R: { flex: 60 } } },
    // elbow extension + shoulder extension (kick-back / push finish)
    actionPose: { joints: { shoulder_R: { flex: -30 }, elbow_R: { flex: 0 } } },
    // overhead triceps stretch: arm raised, elbow fully bent
    stretchPose: { joints: { shoulder_R: { flex: 140 }, elbow_R: { flex: 140 } } },
    camera: { dir: [-1, 0.15, -0.45] },
    focus: 'shoulder',
  },

  // ── R1b: scapular & back muscles ───────────────────────────────────────────────────────────────
  // trapezius: occiput (superior nuchal line) / nuchal ligament / C7–T12 spinous processes → lateral third of the
  // clavicle (upper part), acromion & spine of the scapula (middle), root of the spine (lower).
  trapezius: {
    id: 'trapezius',
    strands: [
      // upper (descending) part: occiput & nuchal ligament → lateral third of the clavicle (posterior border)
      {
        name: '上部（後頭骨から）',
        path: [
          { ref: 'head:nuchal_line_sup', off: [-0.012, -0.003, 0.004] },
          { bone: 'neck', rest: [0.028, 1.565, -0.05] },
          { bone: 'neck', rest: [0.04, 1.5, -0.046] },
          { bone: 'clavicle', rest: [0.095, 1.478, -0.034] },
          { ref: 'scapula:clavicle_lateral', off: [-0.025, 0.007, 0.012] },
        ],
        radius: 0.007,
        tendon: [0.06, 0.06],
      },
      {
        name: '上部（項靱帯 C2〜C4）',
        path: [
          { bone: 'neck', rest: [0.003, 1.545, -0.062] },
          { bone: 'neck', rest: [0.032, 1.505, -0.056] },
          { bone: 'clavicle', rest: [0.1, 1.478, -0.04] },
          { ref: 'scapula:clavicle_lateral', off: [-0.012, 0.007, 0.006] },
        ],
        radius: 0.008,
        tendon: [0.04, 0.06],
      },
      {
        name: '上部（項靱帯 C5〜C6）',
        path: [
          { bone: 'neck', rest: [0.003, 1.49, -0.066] },
          { bone: 'neck', rest: [0.04, 1.478, -0.062] },
          { bone: 'clavicle', rest: [0.12, 1.47, -0.048] },
          { ref: 'scapula:clavicle_lateral', off: [0.004, 0.006, -0.006] },
        ],
        radius: 0.008,
        tendon: [0.04, 0.06],
      },
      // middle (transverse) part: C7–T4 → medial margin of the acromion & upper lip of the spine of the scapula
      {
        name: '中部（C7〜T1）',
        path: [
          { ref: 'neck:spinous_C7', off: [0.004, 0.0, -0.008] },
          { bone: 'thorax', rest: [0.06, 1.455, -0.08] },
          { bone: 'clavicle', rest: [0.13, 1.458, -0.054] },
          { ref: 'scapula:acromion', off: [-0.021, 0.006, -0.01] },
        ],
        radius: 0.0035,
        tendon: [0.04, 0.06],
        flat: { width: 0.03, normal: 'posterior' },
      },
      {
        name: '中部（T1〜T2）',
        path: [
          { ref: 'thorax:spinous_T2', off: [0.005, 0.006, -0.002] },
          { bone: 'thorax', rest: [0.06, 1.435, -0.09] },
          { bone: 'scapula', rest: [0.12, 1.443, -0.066] },
          { bone: 'scapula', rest: [0.163, 1.446, -0.058] },
        ],
        radius: 0.003,
        tendon: [0.04, 0.08],
        flat: { width: 0.036, normal: 'posterior' },
      },
      {
        name: '中部（T3〜T4）',
        path: [
          { ref: 'thorax:spinous_T3', off: [0.005, -0.006, -0.004] },
          { bone: 'thorax', rest: [0.05, 1.405, -0.108] },
          { bone: 'scapula', rest: [0.1, 1.415, -0.104] },
          { bone: 'scapula', rest: [0.125, 1.422, -0.099] },
        ],
        radius: 0.003,
        tendon: [0.04, 0.1],
        flat: { width: 0.04, normal: 'posterior' },
      },
      // lower (ascending) part: T5–T12 → aponeurosis over the root of the spine → tubercle at its medial end
      {
        name: '下部（T5〜T7）',
        path: [
          { ref: 'thorax:spinous_T6', off: [0.005, -0.004, -0.003] },
          { bone: 'thorax', rest: [0.045, 1.35, -0.119] },
          { bone: 'scapula', rest: [0.09, 1.395, -0.111] },
        ],
        radius: 0.003,
        tendon: [0.04, 0.12],
        flat: { width: 0.04, normal: 'posterior' },
      },
      {
        name: '下部（T8〜T10）',
        path: [
          { ref: 'thorax:spinous_T9', off: [0.005, -0.004, -0.003] },
          { bone: 'thorax', rest: [0.045, 1.31, -0.121] },
          { bone: 'thorax', rest: [0.068, 1.36, -0.117] },
          { ref: 'scapula:spine_medial', off: [0.004, 0.0, -0.005] },
        ],
        radius: 0.003,
        tendon: [0.04, 0.15],
        flat: { width: 0.04, normal: 'posterior' },
      },
      {
        name: '下部（T11〜T12）',
        path: [
          { ref: 'thorax:spinous_T12', off: [0.005, 0.002, -0.002] },
          { bone: 'thorax', rest: [0.027, 1.245, -0.121] },
          { bone: 'thorax', rest: [0.054, 1.315, -0.121] },
          { ref: 'scapula:spine_medial', off: [0.0, -0.004, -0.005] },
        ],
        radius: 0.003,
        tendon: [0.04, 0.15],
        flat: { width: 0.034, normal: 'posterior' },
      },
    ],
    // all three parts rotate the scapula upward: arm raised in a Y (thumb up) with the shoulder blade drawn back and down
    actionPose: { joints: { shoulder_R: { flex: 150, abd: 30 }, forearm_R: { sup: -90 }, scapula_R: { protr: -18, elev: -3 } } },
    // head bent forward and to the opposite side (upper fibres) + arm across the chest, shoulder blade forward and down
    stretchPose: {
      joints: { neck: { flex: 15, lat: -20 }, head: { flex: 8, lat: -8 }, shoulder_R: { flex: 90, abd: -30 }, scapula_R: { protr: 6, elev: -6 } },
    },
    camera: { dir: [-0.35, 0.22, -1] },
    focus: 'shoulder',
  },
  // rhomboids: minor (lower nuchal ligament, C7–T1) and major (T2–T5) → medial border of the scapula
  // (root of the spine → inferior angle). Thin sheets on the ribs, deep to the trapezius.
  rhomboids: {
    id: 'rhomboids',
    strands: [
      {
        name: '小菱形筋（C7〜T1）',
        path: [
          { ref: 'thorax:spinous_T1', off: [0.005, 0.004, -0.003] },
          { bone: 'thorax', rest: [0.04, 1.425, -0.089] },
          { bone: 'scapula', rest: [0.079, 1.39, -0.098] },
        ],
        radius: 0.003,
        tendon: [0.05, 0.05],
        flat: { width: 0.02, normal: 'posterior' },
      },
      {
        name: '大菱形筋（T2〜T3）',
        path: [
          { ref: 'thorax:spinous_T2', off: [0.005, -0.004, -0.002] },
          { bone: 'thorax', rest: [0.04, 1.39, -0.101] },
          { mix: [{ bone: 'thorax', rest: [0.066, 1.36, -0.111] }, { bone: 'scapula', rest: [0.066, 1.36, -0.111] }], t: 0.5 },
          { bone: 'scapula', rest: [0.083, 1.345, -0.1] },
        ],
        radius: 0.0032,
        tendon: [0.05, 0.05],
        flat: { width: 0.024, normal: 'posterior' },
      },
      {
        name: '大菱形筋（T3〜T4）',
        path: [
          { ref: 'thorax:spinous_T4', off: [0.005, -0.005, 0.0] },
          { bone: 'thorax', rest: [0.045, 1.335, -0.115] },
          { mix: [{ bone: 'thorax', rest: [0.066, 1.307, -0.119] }, { bone: 'scapula', rest: [0.066, 1.307, -0.119] }], t: 0.5 },
          { bone: 'scapula', rest: [0.085, 1.29, -0.104] },
        ],
        radius: 0.0032,
        tendon: [0.05, 0.05],
        flat: { width: 0.024, normal: 'posterior' },
      },
      {
        name: '大菱形筋（T4〜T5）',
        path: [
          { ref: 'thorax:spinous_T5', off: [0.005, -0.006, 0.0] },
          { bone: 'thorax', rest: [0.045, 1.29, -0.118] },
          { mix: [{ bone: 'thorax', rest: [0.066, 1.262, -0.12] }, { bone: 'scapula', rest: [0.066, 1.262, -0.12] }], t: 0.5 },
          { ref: 'scapula:inferior_angle', off: [-0.002, 0.004, -0.004] },
        ],
        radius: 0.003,
        tendon: [0.05, 0.06],
        flat: { width: 0.022, normal: 'posterior' },
      },
    ],
    actionPose: { joints: { scapula_R: { protr: -10, elev: 6, upRot: -8 } } },
    stretchPose: { joints: { shoulder_R: { flex: 90, abd: -25 }, elbow_R: { flex: 10 } } },
    camera: 'back',
    focus: 'shoulder',
  },
  // levator scapulae: transverse processes C1–C4 → superior angle & medial border above the root of the spine.
  // The slips twist: the C1 slip inserts lowest, the C3–C4 slips on the superior angle.
  'levator-scapulae': {
    id: 'levator-scapulae',
    strands: [
      {
        name: 'C1から',
        path: [
          { ref: 'neck:transverse_C1', off: [0.004, -0.004, -0.008] },
          { bone: 'neck', rest: [0.042, 1.52, -0.04] },
          { bone: 'neck', rest: [0.054, 1.475, -0.062] },
          { bone: 'scapula', rest: [0.078, 1.403, -0.097] },
        ],
        radius: 0.0055,
        tendon: [0.14, 0.05],
      },
      {
        name: 'C2から',
        path: [
          { ref: 'neck:transverse_C2', off: [0.006, -0.004, -0.008] },
          { bone: 'neck', rest: [0.042, 1.51, -0.042] },
          { bone: 'neck', rest: [0.05, 1.475, -0.06] },
          { bone: 'scapula', rest: [0.077, 1.42, -0.095] },
        ],
        radius: 0.0055,
        tendon: [0.14, 0.05],
      },
      {
        name: 'C3〜C4から',
        path: [
          { ref: 'neck:transverse_C3', off: [0.004, -0.008, -0.008] },
          { bone: 'neck', rest: [0.044, 1.49, -0.046] },
          { ref: 'scapula:superior_angle', off: [0.0, 0.002, -0.004] },
        ],
        radius: 0.0055,
        tendon: [0.14, 0.05],
      },
    ],
    // shrug with downward rotation and the head bent to the same side
    actionPose: { joints: { scapula_R: { elev: 25, upRot: -10 }, neck: { lat: 12 } } },
    // nose toward the opposite armpit: neck flexed, bent and turned to the left, shoulder blade down
    stretchPose: { joints: { neck: { flex: 15, lat: -16, rot: -25 }, head: { flex: 6, lat: -5 }, scapula_R: { elev: -6 } } },
    camera: { dir: [-0.5, 0.22, -0.9] },
    focus: 'neck',
  },

  // latissimus dorsi: T7–T12 spinous processes, thoracolumbar fascia (L1–L5), posterior iliac crest, ribs 10–12
  // (+ a slip over the inferior angle) → posterior axillary fold → twists round the medial side of the humerus →
  // floor of the intertubercular groove (the lowest fibres insert highest). Thin sheets on the ribs.
  'latissimus-dorsi': {
    id: 'latissimus-dorsi',
    strands: [
      {
        name: '上部（T7〜T9・下角）',
        path: [
          { ref: 'thorax:spinous_T8', off: [0.005, 0.0, -0.001] },
          { bone: 'thorax', rest: [0.051, 1.262, -0.122] },
          { mix: [{ bone: 'thorax', rest: [0.096, 1.237, -0.113] }, { bone: 'scapula', rest: [0.096, 1.237, -0.113] }], t: 0.5 },
          { mix: [{ bone: 'thorax', rest: [0.134, 1.265, -0.074] }, { bone: 'scapula', rest: [0.134, 1.265, -0.074] }], t: 0.5 },
          { mix: [{ bone: 'thorax', rest: [0.142, 1.300, -0.040] }, { bone: 'humerus', rest: [0.142, 1.300, -0.040] }], t: 0.4 },
          { mix: [{ bone: 'scapula', rest: [0.155, 1.335, -0.006] }, { bone: 'humerus', rest: [0.155, 1.335, -0.006] }], t: 0.6 },
          { ref: 'humerus:crest_lesser_tubercle', off: [0.004, 0.000, 0.0] },
        ],
        radius: 0.003,
        tendon: [0.08, 0.16],
        flat: { width: 0.044, normal: 'posterior' },
      },
      {
        name: '中部（T10〜T12）',
        path: [
          { ref: 'thorax:spinous_T11', off: [0.005, 0.0, -0.001] },
          { bone: 'thorax', rest: [0.062, 1.200, -0.115] },
          { bone: 'thorax', rest: [0.114, 1.225, -0.090] },
          { mix: [{ bone: 'thorax', rest: [0.144, 1.260, -0.059] }, { bone: 'scapula', rest: [0.144, 1.260, -0.059] }], t: 0.5 },
          { mix: [{ bone: 'thorax', rest: [0.145, 1.300, -0.030] }, { bone: 'humerus', rest: [0.145, 1.300, -0.030] }], t: 0.4 },
          { mix: [{ bone: 'scapula', rest: [0.155, 1.335, -0.006] }, { bone: 'humerus', rest: [0.155, 1.335, -0.006] }], t: 0.6 },
          { ref: 'humerus:crest_lesser_tubercle', off: [0.004, 0.004, 0.0] },
        ],
        radius: 0.003,
        tendon: [0.12, 0.16],
        flat: { width: 0.046, normal: 'posterior' },
      },
      {
        name: '下部（胸腰筋膜 L1〜L5）',
        path: [
          { ref: 'lumbar:spinous_L2', off: [0.005, 0.0, -0.001] },
          { bone: 'lumbar', rest: [0.068, 1.125, -0.091] },
          { bone: 'thorax', rest: [0.126, 1.190, -0.077] },
          { bone: 'thorax', rest: [0.149, 1.245, -0.044] },
          { mix: [{ bone: 'thorax', rest: [0.146, 1.295, -0.023] }, { bone: 'humerus', rest: [0.146, 1.295, -0.023] }], t: 0.4 },
          { mix: [{ bone: 'scapula', rest: [0.155, 1.335, -0.006] }, { bone: 'humerus', rest: [0.155, 1.335, -0.006] }], t: 0.6 },
          { ref: 'humerus:crest_lesser_tubercle', off: [0.004, 0.008, 0.0] },
        ],
        radius: 0.003,
        tendon: [0.3, 0.14],
        flat: { width: 0.044, normal: 'posterior' },
      },
      {
        name: '下部（腸骨稜）',
        path: [
          { bone: 'pelvis', rest: [0.118, 1.076, -0.054] },
          { bone: 'lumbar', rest: [0.123, 1.140, -0.054] },
          { bone: 'thorax', rest: [0.148, 1.200, -0.050] },
          { bone: 'thorax', rest: [0.153, 1.250, -0.026] },
          { mix: [{ bone: 'thorax', rest: [0.148, 1.290, -0.015] }, { bone: 'humerus', rest: [0.148, 1.290, -0.015] }], t: 0.4 },
          { mix: [{ bone: 'scapula', rest: [0.155, 1.335, -0.006] }, { bone: 'humerus', rest: [0.155, 1.335, -0.006] }], t: 0.6 },
          { ref: 'humerus:crest_lesser_tubercle', off: [0.004, 0.012, 0.0] },
        ],
        radius: 0.003,
        tendon: [0.06, 0.14],
        flat: { width: 0.034, normal: 'lateral' },
      },
      {
        name: '外側部（第10〜12肋骨）',
        path: [
          { bone: 'thorax', rest: [0.143, 1.180, -0.046] },
          { bone: 'thorax', rest: [0.152, 1.235, -0.031] },
          { mix: [{ bone: 'thorax', rest: [0.150, 1.285, -0.015] }, { bone: 'humerus', rest: [0.150, 1.285, -0.015] }], t: 0.4 },
          { mix: [{ bone: 'scapula', rest: [0.155, 1.335, -0.006] }, { bone: 'humerus', rest: [0.155, 1.335, -0.006] }], t: 0.6 },
          { ref: 'humerus:crest_lesser_tubercle', off: [0.004, 0.015, 0.0] },
        ],
        radius: 0.003,
        tendon: [0.04, 0.16],
        flat: { width: 0.03, normal: 'lateral' },
      },
    ],
    // demo starts with the arm reaching forward-up (like the catch of the swim stroke)
    restPose: { joints: { shoulder_R: { flex: 60 }, elbow_R: { flex: 15 }, forearm_R: { sup: -90 } } },
    // pull: arm drawn down and back past the hip with internal rotation (extension + adduction + IR = the swim pull)
    actionPose: { joints: { shoulder_R: { flex: -10, rot: -25 }, elbow_R: { flex: 15 } } },
    // overhead reach with a side bend to the opposite side (ex-lat-stretch: arms overhead, chest sinking)
    stretchPose: { joints: { shoulder_R: { flex: 150, abd: 10, rot: 10 }, elbow_R: { flex: 20 }, thorax: { lat: -10 } } },
    camera: { dir: [-0.75, 0.2, -0.7] },
    focus: 'shoulder',
  },
  // serratus anterior: one digitation per rib (1–9) on the lateral chest wall → wraps backward round the ribs, deep to
  // the scapula → costal (front) surface of the medial border: rib 1–2 to the superior angle, ribs 2–3 along the border,
  // ribs 4–9 converging on the inferior angle. (The engine's scapula lies on the ribs, so the part under the blade is hidden.)
  'serratus-anterior': {
    id: 'serratus-anterior',
    strands: [
      {
        name: '第1〜2肋骨から',
        path: [
          { bone: 'thorax', rest: [0.088, 1.413, 0.006] },
          { mix: [{ bone: 'thorax', rest: [0.086, 1.425, -0.045] }, { bone: 'scapula', rest: [0.086, 1.425, -0.045] }], t: 0.4 },
          { bone: 'scapula', rest: [0.082, 1.428, -0.085] },
        ],
        radius: 0.0029,
        tendon: [0.04, 0.1],
        flat: { width: 0.016, normal: 'lateral' },
      },
      {
        name: '第2肋骨から',
        path: [
          { bone: 'thorax', rest: [0.094, 1.397, 0.008] },
          { bone: 'scapula', rest: [0.090, 1.403, -0.058] },
          { bone: 'scapula', rest: [0.084, 1.405, -0.087] },
        ],
        radius: 0.003,
        tendon: [0.04, 0.1],
        flat: { width: 0.0168, normal: 'lateral' },
      },
      {
        name: '第3肋骨から',
        path: [
          { bone: 'thorax', rest: [0.110, 1.362, 0.022] },
          { mix: [{ bone: 'thorax', rest: [0.115, 1.366, -0.037] }, { bone: 'scapula', rest: [0.115, 1.366, -0.037] }], t: 0.35 },
          { bone: 'scapula', rest: [0.087, 1.372, -0.089] },
        ],
        radius: 0.0032,
        tendon: [0.04, 0.1],
        flat: { width: 0.0176, normal: 'lateral' },
      },
      {
        name: '第4肋骨から',
        path: [
          { bone: 'thorax', rest: [0.124, 1.331, 0.024] },
          { mix: [{ bone: 'thorax', rest: [0.130, 1.331, -0.040] }, { bone: 'scapula', rest: [0.130, 1.331, -0.040] }], t: 0.35 },
          { bone: 'scapula', rest: [0.090, 1.330, -0.092] },
        ],
        radius: 0.0032,
        tendon: [0.04, 0.1],
        flat: { width: 0.0176, normal: 'lateral' },
      },
      {
        name: '第5肋骨から',
        path: [
          { bone: 'thorax', rest: [0.133, 1.300, 0.026] },
          { mix: [{ bone: 'thorax', rest: [0.143, 1.295, -0.037] }, { bone: 'scapula', rest: [0.143, 1.295, -0.037] }], t: 0.35 },
          { bone: 'scapula', rest: [0.091, 1.288, -0.095] },
        ],
        radius: 0.0034,
        tendon: [0.04, 0.1],
        flat: { width: 0.0189, normal: 'lateral' },
      },
      {
        name: '第6肋骨から',
        path: [
          { bone: 'thorax', rest: [0.141, 1.269, 0.026] },
          { mix: [{ bone: 'thorax', rest: [0.149, 1.266, -0.038] }, { bone: 'scapula', rest: [0.149, 1.266, -0.038] }], t: 0.35 },
          { bone: 'scapula', rest: [0.090, 1.262, -0.097] },
        ],
        radius: 0.0036,
        tendon: [0.04, 0.1],
        flat: { width: 0.0202, normal: 'lateral' },
      },
      {
        name: '第7肋骨から',
        path: [
          { bone: 'thorax', rest: [0.146, 1.237, 0.025] },
          { mix: [{ bone: 'thorax', rest: [0.152, 1.242, -0.038] }, { bone: 'scapula', rest: [0.152, 1.242, -0.038] }], t: 0.35 },
          { bone: 'scapula', rest: [0.090, 1.250, -0.098] },
        ],
        radius: 0.0036,
        tendon: [0.04, 0.1],
        flat: { width: 0.0202, normal: 'lateral' },
      },
      {
        name: '第8肋骨から',
        path: [
          { bone: 'thorax', rest: [0.150, 1.210, 0.016] },
          { mix: [{ bone: 'thorax', rest: [0.155, 1.219, -0.033] }, { bone: 'scapula', rest: [0.155, 1.219, -0.033] }], t: 0.35 },
          { bone: 'scapula', rest: [0.090, 1.243, -0.099] },
        ],
        radius: 0.0036,
        tendon: [0.04, 0.1],
        flat: { width: 0.0202, normal: 'lateral' },
      },
      {
        name: '第9肋骨から',
        path: [
          { bone: 'thorax', rest: [0.151, 1.189, 0.001] },
          { mix: [{ bone: 'thorax', rest: [0.155, 1.197, -0.028] }, { bone: 'scapula', rest: [0.155, 1.197, -0.028] }], t: 0.35 },
          { bone: 'scapula', rest: [0.090, 1.239, -0.099] },
        ],
        radius: 0.0034,
        tendon: [0.04, 0.1],
        flat: { width: 0.0189, normal: 'lateral' },
      },
    ],
    // pushing the shoulder blade forward round the chest (protraction + upward rotation: punch / push-up plus)
    // the arm is held a little away from the side so the digitations on the chest wall stay in view
    restPose: { joints: { shoulder_R: { abd: 45 } } },
    actionPose: { joints: { shoulder_R: { flex: 90, abd: 0 }, elbow_R: { flex: 0 }, forearm_R: { sup: -90 }, scapula_R: { protr: 5 } } },
    // shoulder blade drawn back toward the spine and rotated downward
    stretchPose: { joints: { scapula_R: { protr: -10, upRot: -8 } } },
    camera: { dir: [-0.85, 0.18, 0.65] },
    focus: 'shoulder',
  },
};

export const structures: Partial<Record<StructureId, StructureRig>> = {
  // SAMPLE — subacromial bursa: flat sac between the acromion and the supraspinatus tendon / humeral head.
  'subacromial-bursa': {
    id: 'subacromial-bursa',
    // R1b: a little wider laterally (the sac continues under the deltoid beyond the acromion edge) and framed close
    parts: [{ type: 'bursa', at: 'scapula:acromion_under', radii: [0.021, 0.0045, 0.021], off: [0.005, -0.0045, 0.002] }],
    labelAt: { ref: 'scapula:acromion_under', off: [0.016, -0.006, 0.012] },
    camera: { position: [-0.44, 1.6, 0.4], target: [-0.175, 1.425, -0.004] },
    focus: 'shoulder',
  },
  // ── R1a ────────────────────────────────────────────────────────────────────────────────────────
  // humeral head: the ball of the glenohumeral joint (bone tint).
  'humeral-head': {
    id: 'humeral-head',
    parts: [{ type: 'bone', parts: ['humeral_head'] }],
    labelAt: { ref: 'humerus:head', off: [0.006, 0.006, 0.022] },
    camera: { position: [-0.53, 1.585, 0.44], target: [-0.168, 1.405, -0.006] },
    focus: 'shoulder',
  },
  // glenoid labrum: fibrocartilage ring on the rim of the glenoid (12 small cushions). The rim follows the engine's
  // glenoid ellipsoid; where the humeral head overlaps it (anterior rim) the beads are pushed just outside the head.
  'glenoid-labrum': {
    id: 'glenoid-labrum',
    parts: [
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1533, 1.4288, -0.0128] }, radii: [0.0026, 0.003, 0.003] },  // 上
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1563, 1.4270, -0.0046] }, radii: [0.0026, 0.003, 0.003] },
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1585, 1.4177, 0.0015] }, radii: [0.0026, 0.003, 0.003] },
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1593, 1.4050, 0.0037] }, radii: [0.0026, 0.003, 0.003] },  // 前
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1585, 1.3923, 0.0015] }, radii: [0.0026, 0.003, 0.003] },
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1557, 1.3868, -0.0060] }, radii: [0.0026, 0.003, 0.003] },
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1533, 1.3855, -0.0128] }, radii: [0.0026, 0.003, 0.003] },  // 下
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1509, 1.3881, -0.0192] }, radii: [0.0026, 0.003, 0.003] },
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1493, 1.3953, -0.0238] }, radii: [0.0026, 0.003, 0.003] },
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1486, 1.4050, -0.0255] }, radii: [0.0026, 0.003, 0.003] },  // 後
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1493, 1.4147, -0.0238] }, radii: [0.0026, 0.003, 0.003] },
      { type: 'cartilage', at: { bone: 'scapula', rest: [0.1508, 1.4229, -0.0195] }, radii: [0.0026, 0.003, 0.003] },
      // thin ring through the beads (drawn in the cartilage colour of this structure, and tinted by its role)
      {
        type: 'ligament',
        path: [
          { bone: 'scapula', rest: [0.1533, 1.4288, -0.0128] },
          { bone: 'scapula', rest: [0.1563, 1.4270, -0.0046] },
          { bone: 'scapula', rest: [0.1585, 1.4177, 0.0015] },
          { bone: 'scapula', rest: [0.1593, 1.4050, 0.0037] },
          { bone: 'scapula', rest: [0.1585, 1.3923, 0.0015] },
          { bone: 'scapula', rest: [0.1557, 1.3868, -0.0060] },
          { bone: 'scapula', rest: [0.1533, 1.3855, -0.0128] },
          { bone: 'scapula', rest: [0.1509, 1.3881, -0.0192] },
          { bone: 'scapula', rest: [0.1493, 1.3953, -0.0238] },
          { bone: 'scapula', rest: [0.1486, 1.4050, -0.0255] },
          { bone: 'scapula', rest: [0.1493, 1.4147, -0.0238] },
          { bone: 'scapula', rest: [0.1508, 1.4229, -0.0195] },
          { bone: 'scapula', rest: [0.1533, 1.4288, -0.0128] },
        ],
        radius: 0.0034,
      },
    ],
    labelAt: { bone: 'scapula', rest: [0.152, 1.39, -0.024] },
    camera: { position: [-0.48, 1.56, -0.42], target: [-0.158, 1.405, -0.012] },
    focus: 'shoulder',
  },
  // posterior capsule: ligamentous sheet from the posterior glenoid rim over the back of the humeral head to the
  // anatomical neck (3 flat bands: postero-superior, posterior, postero-inferior = posterior band of the IGHL).
  'posterior-capsule': {
    id: 'posterior-capsule',
    parts: [
      {
        type: 'ligament',
        path: [
          { bone: 'scapula', rest: [0.147, 1.418, -0.026] },
          { mix: [{ bone: 'scapula', rest: [0.165, 1.42, -0.033] }, { bone: 'humerus', rest: [0.165, 1.42, -0.033] }], t: 0.5 },
          { bone: 'humerus', rest: [0.182, 1.415, -0.025] },
        ],
        radius: 0.0016,
        flat: { width: 0.016, normal: 'posterior' },
      },
      {
        type: 'ligament',
        path: [
          { bone: 'scapula', rest: [0.146, 1.405, -0.028] },
          { mix: [{ bone: 'scapula', rest: [0.166, 1.404, -0.035] }, { bone: 'humerus', rest: [0.166, 1.404, -0.035] }], t: 0.5 },
          { bone: 'humerus', rest: [0.184, 1.4, -0.026] },
        ],
        radius: 0.0016,
        flat: { width: 0.016, normal: 'posterior' },
      },
      {
        type: 'ligament',
        path: [
          { bone: 'scapula', rest: [0.147, 1.392, -0.026] },
          { mix: [{ bone: 'scapula', rest: [0.166, 1.388, -0.034] }, { bone: 'humerus', rest: [0.166, 1.388, -0.034] }], t: 0.5 },
          { bone: 'humerus', rest: [0.183, 1.385, -0.023] },
        ],
        radius: 0.0016,
        flat: { width: 0.016, normal: 'posterior' },
      },
    ],
    labelAt: { bone: 'humerus', rest: [0.166, 1.404, -0.037] },
    camera: { position: [-0.49, 1.56, -0.44], target: [-0.165, 1.405, -0.028] },
    focus: 'shoulder',
  },
  // long head of biceps tendon: supraglenoid tubercle / superior labrum → over the humeral head (intra-articular)
  // → bicipital groove → musculotendinous junction in the upper arm.
  'biceps-long-head-tendon': {
    id: 'biceps-long-head-tendon',
    parts: [
      {
        type: 'tendon',
        path: [
          { ref: 'scapula:supraglenoid_tubercle', off: [0.002, 0.003, 0.002] },
          { mix: [{ bone: 'scapula', rest: [0.174, 1.43, 0.009] }, { bone: 'humerus', rest: [0.174, 1.43, 0.009] }], t: 0.5 },
          { bone: 'humerus', rest: [0.188, 1.395, 0.025] },
          { bone: 'humerus', rest: [0.191, 1.36, 0.025] },
          { bone: 'humerus', rest: [0.194, 1.3, 0.024] },
        ],
        radius: 0.0028,
      },
    ],
    labelAt: { bone: 'humerus', rest: [0.191, 1.37, 0.026] },
    camera: 'iso',
    focus: 'shoulder',
  },
  // ── R1b ────────────────────────────────────────────────────────────────────────────────────────
  // acromion: the lateral end of the spine of the scapula — the bony "roof" over the supraspinatus tendon & bursa.
  acromion: {
    id: 'acromion',
    parts: [{ type: 'bone', parts: ['acromion'] }],
    labelAt: { ref: 'scapula:acromion', off: [0.002, 0.008, 0.004] },
    camera: { position: [-0.44, 1.64, 0.36], target: [-0.175, 1.43, -0.006] },
    focus: 'shoulder',
  },
  // scapula: the whole shoulder blade (body + spine, acromion, coracoid) seen from behind.
  scapula: {
    id: 'scapula',
    parts: [{ type: 'bone', parts: ['scapula', 'acromion', 'coracoid'] }],
    labelAt: { ref: 'scapula:infraspinous_fossa', off: [0.0, 0.0, -0.006] },
    camera: { dir: [-0.45, 0.22, -1] },
    focus: 'shoulder',
  },
};
