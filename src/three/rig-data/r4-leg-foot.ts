// r4 — leg / foot muscles + calf / ankle / foot structures.
// Owner after the engine agent: rigging agent r4. See docs/ENGINE.md.
import type { MuscleId, StructureId } from '../../data/registry';
import type { MuscleRig, StructureRig } from './types';

export const muscles: Partial<Record<MuscleId, MuscleRig>> = {
  // SAMPLE — gastrocnemius: two heads from the posterior femoral condyles, joining the Achilles tendon
  // to the calcaneal tuberosity. Crosses knee AND ankle → shortened by plantarflexion (+ knee flexion).
  gastrocnemius: {
    id: 'gastrocnemius',
    strands: [
      {
        name: '内側頭',
        path: [
          'femur:medial_condyle_post',
          { bone: 'tibia', rest: [0.07, 0.42, -0.058] },
          { bone: 'tibia', rest: [0.078, 0.33, -0.064] },
          { bone: 'tibia', rest: [0.088, 0.2, -0.048] },
          { bone: 'tibia', rest: [0.09, 0.115, -0.05] },
          'foot:calcaneus_post',
        ],
        radius: 0.019,
        tendon: [0.05, 0.47],
      },
      {
        name: '外側頭',
        path: [
          'femur:lateral_condyle_post',
          { bone: 'tibia', rest: [0.11, 0.42, -0.054] },
          { bone: 'tibia', rest: [0.104, 0.34, -0.058] },
          { bone: 'tibia', rest: [0.093, 0.2, -0.048] },
          { bone: 'tibia', rest: [0.09, 0.115, -0.05] },
          'foot:calcaneus_post',
        ],
        radius: 0.016,
        tendon: [0.05, 0.52],
      },
    ],
    base: 'STAND_STEP',
    // heel raise on the step edge (toes stay flat: toe extension = plantarflexion)
    actionPose: { joints: { ankle: { dorsi: -30 }, toes: { ext: 30 } } },
    // heel drop with straight knees
    stretchPose: { joints: { ankle: { dorsi: 28 }, toes: { ext: -28 } } },
    camera: 'isoBack',
    focus: 'calf',
  },
  // SAMPLE — soleus: deep to gastrocnemius, from the fibular head / upper fibula and the soleal line of the tibia
  // to the Achilles tendon. Crosses only the ankle → best shown with bent knees.
  soleus: {
    id: 'soleus',
    strands: [
      {
        name: '外側（腓骨）',
        path: [
          'tibia:fibula_post_prox',
          { bone: 'tibia', rest: [0.112, 0.33, -0.044] },
          { bone: 'tibia', rest: [0.097, 0.2, -0.042] },
          { bone: 'tibia', rest: [0.09, 0.115, -0.048] },
          'foot:calcaneus_post',
        ],
        radius: 0.0155,
        tendon: [0.04, 0.3],
      },
      {
        name: '中央',
        path: [
          { ref: 'tibia:posterior_prox', off: [0.0, -0.01, -0.008] },
          { bone: 'tibia', rest: [0.092, 0.3, -0.046] },
          { bone: 'tibia', rest: [0.09, 0.19, -0.044] },
          { bone: 'tibia', rest: [0.09, 0.115, -0.048] },
          'foot:calcaneus_post',
        ],
        radius: 0.014,
        tendon: [0.04, 0.3],
      },
      {
        name: '内側（脛骨）',
        path: [
          'tibia:soleal_line',
          { bone: 'tibia', rest: [0.072, 0.32, -0.04] },
          { bone: 'tibia', rest: [0.084, 0.2, -0.042] },
          { bone: 'tibia', rest: [0.09, 0.115, -0.048] },
          'foot:calcaneus_post',
        ],
        radius: 0.0155,
        tendon: [0.04, 0.3],
      },
    ],
    base: 'STAND_STEP',
    restPose: { joints: { knee: { flex: 28 }, hip: { flex: 12 }, lumbar: { flex: 5 } } },
    actionPose: { joints: { ankle: { dorsi: -28 }, toes: { ext: 28 } } },
    stretchPose: { joints: { ankle: { dorsi: 30 }, toes: { ext: -30 } } },
    camera: 'isoBack',
    focus: 'calf',
  },
};

export const structures: Partial<Record<StructureId, StructureRig>> = {
  // SAMPLE — Achilles tendon: flat cord from the gastrocnemius/soleus junction to the calcaneal tuberosity.
  'achilles-tendon': {
    id: 'achilles-tendon',
    parts: [
      {
        type: 'tendon',
        path: [
          { bone: 'tibia', rest: [0.09, 0.25, -0.05] },
          { bone: 'tibia', rest: [0.09, 0.115, -0.05] },
          { ref: 'foot:calcaneus_post', off: [0, 0.006, -0.002] },
        ],
        radius: 0.005,
        flat: { width: 0.016, normal: 'posterior' },
      },
    ],
    camera: 'isoBack',
    focus: 'ankle',
  },
};
