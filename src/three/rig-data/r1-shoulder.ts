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
          { ref: 'humerus:greater_tubercle_sup', off: [0.0, 0.002, -0.004] },
        ],
        radius: 0.0088,
        tendon: [0.0, 0.3],
      },
      {
        name: '中央',
        path: [
          { ref: 'scapula:supraspinous_fossa', off: [-0.014, -0.001, 0.003] },
          { ref: 'scapula:supraspinous_fossa', off: [0.012, 0.004, 0.012] },
          { bone: 'scapula', rest: [0.138, 1.435, -0.044] },
          { bone: 'scapula', rest: [0.163, 1.441, -0.01] },
          { ref: 'humerus:greater_tubercle_sup', off: [0.0, 0.002, 0.0] },
        ],
        radius: 0.0105,
        tendon: [0.0, 0.3],
      },
      {
        name: '内側下部（肩甲棘寄り）',
        path: [
          { ref: 'scapula:spine_medial', off: [0.008, 0.03, 0.012] },
          { bone: 'scapula', rest: [0.112, 1.42, -0.068] },
          { bone: 'scapula', rest: [0.14, 1.432, -0.04] },
          { bone: 'scapula', rest: [0.164, 1.44, -0.004] },
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
};

export const structures: Partial<Record<StructureId, StructureRig>> = {
  // SAMPLE — subacromial bursa: flat sac between the acromion and the supraspinatus tendon / humeral head.
  'subacromial-bursa': {
    id: 'subacromial-bursa',
    parts: [{ type: 'bursa', at: 'scapula:acromion_under', radii: [0.019, 0.0045, 0.021], off: [0.002, -0.0045, 0.002] }],
    camera: 'iso',
    focus: 'shoulder',
  },
};
