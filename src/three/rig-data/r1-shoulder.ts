// r1 — shoulder / arm / neck muscles + shoulder structures.
// Owner after the engine agent: rigging agent r1. See docs/ENGINE.md.
import type { MuscleId, StructureId } from '../../data/registry';
import type { MuscleRig, StructureRig } from './types';

export const muscles: Partial<Record<MuscleId, MuscleRig>> = {
  // SAMPLE — supraspinatus: supraspinous fossa → under the acromion, over the humeral head → greater tubercle (superior facet).
  supraspinatus: {
    id: 'supraspinatus',
    strands: [
      {
        name: '後部（棘上窩 内側）',
        path: [
          { ref: 'scapula:supraspinous_fossa', off: [-0.03, 0.002, -0.006] },
          { ref: 'scapula:supraspinous_fossa', off: [0.004, 0.006, 0.004] },
          { bone: 'scapula', rest: [0.135, 1.436, -0.052] },
          { bone: 'humerus', rest: [0.172, 1.438, -0.014] },
          { ref: 'humerus:greater_tubercle_sup', off: [0.0, 0.002, -0.004] },
        ],
        radius: 0.0085,
        tendon: [0.0, 0.3],
      },
      {
        name: '前部',
        path: [
          { ref: 'scapula:supraspinous_fossa', off: [-0.016, -0.006, 0.008] },
          { ref: 'scapula:supraspinous_fossa', off: [0.016, -0.0, 0.016] },
          { bone: 'scapula', rest: [0.138, 1.433, -0.04] },
          { bone: 'humerus', rest: [0.174, 1.437, -0.003] },
          { ref: 'humerus:greater_tubercle_sup', off: [0.0, 0.0, 0.004] },
        ],
        radius: 0.0078,
        tendon: [0.0, 0.34],
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
