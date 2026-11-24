// r2 — trunk / neck + thigh muscles; spine + knee structures.
// Owner after the engine agent: rigging agent r2. See docs/ENGINE.md.
import type { MuscleId, StructureId } from '../../data/registry';
import type { MuscleRig, StructureRig } from './types';

export const muscles: Partial<Record<MuscleId, MuscleRig>> = {};

export const structures: Partial<Record<StructureId, StructureRig>> = {
  // SAMPLE — iliotibial band: wide flat fascia from the iliac crest (via TFL / gluteus maximus) over the
  // greater trochanter and the lateral femoral epicondyle to Gerdy's tubercle.
  'iliotibial-band': {
    id: 'iliotibial-band',
    parts: [
      {
        type: 'fascia',
        path: [
          { ref: 'pelvis:iliac_crest_mid', off: [0.012, -0.035, 0.022] },
          { ref: 'femur:greater_trochanter_lat', off: [0.014, 0.012, 0.006] },
          { bone: 'femur', rest: [0.168, 0.76, 0.0] },
          { bone: 'femur', rest: [0.158, 0.62, -0.002] },
          { ref: 'femur:lateral_epicondyle', off: [0.011, 0.0, 0.0] },
          { ref: 'tibia:gerdy_tubercle', off: [0.005, 0.0, 0.0] },
        ],
        radius: 0.0022,
        flat: { width: 0.032, normal: 'lateral' },
      },
    ],
    labelAt: { bone: 'femur', rest: [0.168, 0.7, 0.0] },
    camera: 'right',
    focus: 'knee',
  },
  // SAMPLE — patellar tendon: patella apex → tibial tuberosity.
  'patellar-tendon': {
    id: 'patellar-tendon',
    parts: [
      {
        type: 'tendon',
        path: [
          { ref: 'patella:apex', off: [0, 0.002, 0.0] },
          { ref: 'tibia:tibial_tuberosity', off: [0, 0.002, 0.0] },
        ],
        radius: 0.0038,
        flat: { width: 0.024, normal: 'anterior' },
      },
    ],
    camera: 'iso',
    focus: 'knee',
  },
};
