// r4 — leg / foot muscles + calf / ankle / foot structures.
// Owner after the engine agent: rigging agent r4. See docs/ENGINE.md.
import type { MuscleId, StructureId } from '../../data/registry';
import type { MuscleRig, StructureRig } from './types';

export const muscles: Partial<Record<MuscleId, MuscleRig>> = {
  // SAMPLE — gastrocnemius: two heads from the posterior femoral condyles, joining the Achilles tendon
  // to the calcaneal tuberosity. Crosses knee AND ankle → shortened by plantarflexion (+ knee flexion).
  // R4a refinement: the heads are broad, flattish bands (thickness front-to-back, width side-to-side) so they form the
  // calf contour under the skin; the medial head is the larger one and reaches lower (shorter tendon fraction).
  gastrocnemius: {
    id: 'gastrocnemius',
    strands: [
      {
        name: '内側頭',
        path: [
          // origin = the femoral landmark exactly (t: 1); the tibia leaf only makes the flat band's normal follow the
          // shank (a flat strand's normal uses the first point's bone), so the band stays face-on when the knee bends
          { mix: [{ bone: 'tibia', rest: [0.06, 0.47, -0.03] }, 'femur:medial_condyle_post'], t: 1 },
          { bone: 'tibia', rest: [0.072, 0.43, -0.046] },
          { bone: 'tibia', rest: [0.074, 0.33, -0.055] },
          // heel cord (r4 verify): the mannequin's ankle skin is thin (back surface z ≈ −0.04 at y 0.10–0.15), so the
          // tendon hugs the inside of it down to y 0.125 (a straight cord would float 1–2 cm behind the leg), then
          // passes BEHIND the posterosuperior calcaneus / retrocalcaneal bursa to the tuberosity — the same line as the
          // achilles-tendon structure. Limitation: in deep plantarflexion (≥ 45°, prone / supine bases) the heel rises
          // to the level of the lowest tibia via and the cord bends there.
          { bone: 'tibia', rest: [0.087, 0.2, -0.0445] },
          { bone: 'tibia', rest: [0.09, 0.125, -0.0355] },
          { bone: 'foot', rest: [0.09, 0.054, -0.0755] }, // behind the posterosuperior calcaneus (retrocalcaneal bursa in front)
          { ref: 'foot:calcaneus_post', off: [0, 0.004, -0.003] },
        ],
        radius: 0.011,
        tendon: [0.05, 0.5],
        flat: { width: 0.03, normal: 'posterior' },
      },
      {
        name: '外側頭',
        path: [
          { mix: [{ bone: 'tibia', rest: [0.118, 0.47, -0.03] }, 'femur:lateral_condyle_post'], t: 1 },
          { bone: 'tibia', rest: [0.11, 0.43, -0.047] },
          { bone: 'tibia', rest: [0.106, 0.34, -0.052] },
          { bone: 'tibia', rest: [0.093, 0.2, -0.0445] },
          { bone: 'tibia', rest: [0.09, 0.125, -0.0355] },
          { bone: 'foot', rest: [0.09, 0.054, -0.0755] }, // behind the posterosuperior calcaneus (retrocalcaneal bursa in front)
          { ref: 'foot:calcaneus_post', off: [0, 0.004, -0.003] },
        ],
        radius: 0.0095,
        tendon: [0.05, 0.56], // the lateral head's belly ends ~3 cm higher than the medial head's
        flat: { width: 0.026, normal: 'posterior' },
      },
    ],
    base: 'STAND_STEP',
    // heel raise on the step edge (toes stay flat: toe extension = plantarflexion), as in ex-calf-raise-straight
    actionPose: { joints: { ankle: { dorsi: -34 }, toes: { ext: 34 } } },
    // heel drop with straight knees (≈30° is about the loaded end range with the knee straight)
    stretchPose: { joints: { ankle: { dorsi: 30 }, toes: { ext: -30 } } },
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
          { bone: 'tibia', rest: [0.098, 0.2, -0.0385] },
          { bone: 'tibia', rest: [0.09, 0.125, -0.0345] },
          { bone: 'foot', rest: [0.09, 0.054, -0.0755] },
          { ref: 'foot:calcaneus_post', off: [0, 0.004, -0.003] },
        ],
        radius: 0.0155,
        tendon: [0.04, 0.36],
      },
      {
        name: '中央',
        path: [
          { ref: 'tibia:posterior_prox', off: [0.0, -0.01, -0.008] },
          { bone: 'tibia', rest: [0.092, 0.3, -0.046] },
          { bone: 'tibia', rest: [0.09, 0.19, -0.0395] },
          { bone: 'tibia', rest: [0.09, 0.125, -0.0345] },
          { bone: 'foot', rest: [0.09, 0.054, -0.0755] },
          { ref: 'foot:calcaneus_post', off: [0, 0.004, -0.003] },
        ],
        radius: 0.014,
        tendon: [0.04, 0.36],
      },
      {
        name: '内側（脛骨）',
        path: [
          'tibia:soleal_line',
          { bone: 'tibia', rest: [0.072, 0.32, -0.04] },
          { bone: 'tibia', rest: [0.082, 0.2, -0.0385] },
          { bone: 'tibia', rest: [0.09, 0.125, -0.0345] },
          { bone: 'foot', rest: [0.09, 0.054, -0.0755] },
          { ref: 'foot:calcaneus_post', off: [0, 0.004, -0.003] },
        ],
        radius: 0.0155,
        tendon: [0.04, 0.36],
      },
    ],
    base: 'STAND_STEP',
    restPose: { joints: { knee: { flex: 28 }, hip: { flex: 12 }, lumbar: { flex: 5 } } },
    // bent-knee heel raise / bent-knee heel drop (soleus fibres reach low: the free Achilles part is short, but the
    // aponeurosis on its back is tendon too → 0.36)
    actionPose: { joints: { ankle: { dorsi: -34 }, toes: { ext: 34 } } },
    stretchPose: { joints: { ankle: { dorsi: 35 }, toes: { ext: -35 } } },
    camera: 'isoBack',
    focus: 'calf',
  },

  // ── R4a: anterior / deep posterior / lateral leg muscles and the plantar intrinsics ──────────────────────
  // Rest coordinates are lateral-positive [lat, y, z]. Every via point sits on the bone it wraps around
  // (retinacula / malleoli → tibia, calcaneus / cuboid / sustentaculum / MT heads → foot, phalanges → toes).

  // tibialis anterior: lateral condyle + upper lateral tibia + interosseous membrane → tendon in FRONT of the
  // ankle (under the extensor retinacula, the most medial anterior tendon) → medial cuneiform + 1st MT base.
  // Demo in long sitting (ankle pumps): dorsiflexion + inversion shortens it, pointing the foot (+ eversion) stretches it.
  'tibialis-anterior': {
    id: 'tibialis-anterior',
    strands: [
      {
        name: '上部（外側顆・脛骨外側面）→ 内側楔状骨',
        path: [
          { ref: 'tibia:anterior_lat_prox', off: [0.001, 0.03, -0.002] },
          { bone: 'tibia', rest: [0.109, 0.37, 0.019] },
          { bone: 'tibia', rest: [0.106, 0.27, 0.019] },
          { bone: 'tibia', rest: [0.096, 0.17, 0.023] },
          { bone: 'tibia', rest: [0.08, 0.112, 0.019] }, // superior extensor retinaculum
          { bone: 'foot', rest: [0.071, 0.071, 0.046] }, // inferior extensor retinaculum (over the talar neck)
          { bone: 'foot', rest: [0.059, 0.056, 0.066] }, // medial to the navicular
          { ref: 'foot:medial_cuneiform_dorsal', off: [-0.008, -0.014, -0.002] },
        ],
        radius: 0.01,
        tendon: [0.0, 0.45],
      },
      {
        name: '下部（骨間膜）→ 第1中足骨底',
        path: [
          { ref: 'tibia:anterior_lat_mid', off: [0.008, 0.03, -0.006] },
          { bone: 'tibia', rest: [0.11, 0.28, 0.013] },
          { bone: 'tibia', rest: [0.099, 0.2, 0.0215] },
          { bone: 'tibia', rest: [0.08, 0.112, 0.0195] },
          { bone: 'foot', rest: [0.07, 0.071, 0.047] },
          { bone: 'foot', rest: [0.058, 0.052, 0.072] },
          { ref: 'foot:first_met_base', off: [-0.009, 0.0, -0.004] },
        ],
        radius: 0.0085,
        tendon: [0.0, 0.5],
      },
    ],
    base: 'LONG_SIT',
    actionPose: { joints: { ankle_R: { dorsi: 30, inv: 15 } } },
    stretchPose: { joints: { ankle_R: { dorsi: -45, inv: -10 } } },
    camera: { dir: [-0.35, 0.85, 0.4] },
    focus: 'ankle',
  },

  // tibialis posterior: deepest calf muscle (posterior tibia, interosseous membrane, posterior fibula) → tendon
  // crosses behind the tibia, runs in the groove BEHIND the medial malleolus (pulley on the tibia) → navicular
  // tuberosity, with plantar slips to the cuneiforms. Plantarflexion + inversion (sole turned in) shortens it;
  // dorsiflexion + eversion (arch dropping) stretches it.
  'tibialis-posterior': {
    id: 'tibialis-posterior',
    strands: [
      {
        name: '脛骨部 → 舟状骨粗面',
        path: [
          { ref: 'tibia:posterior_prox', off: [0.001, -0.04, 0.007] },
          { bone: 'tibia', rest: [0.096, 0.31, -0.022] },
          { bone: 'tibia', rest: [0.088, 0.2, -0.022] },
          { bone: 'tibia', rest: [0.072, 0.13, -0.019] },
          { bone: 'tibia', rest: [0.058, 0.09, -0.012] }, // groove behind the medial malleolus
          { bone: 'tibia', rest: [0.052, 0.068, -0.006] }, // around the malleolar tip
          { ref: 'foot:navicular_tuberosity', off: [-0.005, -0.003, -0.001] },
        ],
        radius: 0.0095,
        tendon: [0.04, 0.55],
      },
      {
        name: '腓骨部 → 舟状骨粗面',
        path: [
          { ref: 'tibia:fibula_post_prox', off: [-0.011, -0.03, 0.004] },
          { bone: 'tibia', rest: [0.106, 0.3, -0.027] },
          { bone: 'tibia', rest: [0.094, 0.2, -0.024] },
          { bone: 'tibia', rest: [0.073, 0.13, -0.02] },
          { bone: 'tibia', rest: [0.059, 0.09, -0.013] },
          { bone: 'tibia', rest: [0.053, 0.068, -0.007] },
          { ref: 'foot:navicular_tuberosity', off: [-0.005, -0.001, -0.003] },
        ],
        radius: 0.009,
        tendon: [0.04, 0.55],
      },
      {
        name: '骨間膜部 → 足底（楔状骨・中足骨底）',
        path: [
          { ref: 'tibia:interosseous_mid', off: [0.0, 0.07, -0.008] },
          { bone: 'tibia', rest: [0.102, 0.28, -0.021] },
          { bone: 'tibia', rest: [0.09, 0.19, -0.022] },
          { bone: 'tibia', rest: [0.072, 0.13, -0.019] },
          { bone: 'tibia', rest: [0.058, 0.09, -0.012] },
          { bone: 'tibia', rest: [0.052, 0.068, -0.006] },
          { bone: 'foot', rest: [0.063, 0.036, 0.054] }, // under the navicular tuberosity
          { ref: 'foot:medial_cuneiform_plantar', off: [0.008, -0.003, -0.006] },
        ],
        radius: 0.0078,
        tendon: [0.04, 0.6],
      },
    ],
    // prone with the knee bent 90° (shank vertical, foot free): the medial side is unobstructed
    base: 'PRONE',
    restPose: { joints: { knee_R: { flex: 90 }, ankle_R: { dorsi: -10 }, toes_R: { ext: 0 } } },
    actionPose: { joints: { ankle_R: { dorsi: -45, inv: 35 } } },
    stretchPose: { joints: { ankle_R: { dorsi: 30, inv: -30 } } },
    camera: { dir: [0.75, 0.45, 0.48] },
    focus: 'ankle',
  },

  // fibularis (peroneus) longus: fibular head + upper lateral fibula → tendon behind the lateral malleolus
  // (superficial to brevis) → below the peroneal trochlea → cuboid groove → obliquely across the sole →
  // 1st MT base / medial cuneiform (plantar). Eversion + plantarflexion shortens; inversion + dorsiflexion stretches.
  'fibularis-longus': {
    id: 'fibularis-longus',
    strands: [
      {
        name: '上部（腓骨頭）',
        path: [
          { ref: 'tibia:fibular_head', off: [0.006, -0.012, 0.004] },
          { bone: 'tibia', rest: [0.132, 0.37, -0.01] },
          { bone: 'tibia', rest: [0.134, 0.29, -0.016] },
          { bone: 'tibia', rest: [0.133, 0.21, -0.027] },
          { ref: 'tibia:retro_lateral_malleolus', off: [0.002, -0.002, 0.001] }, // behind the lateral malleolus
          { bone: 'tibia', rest: [0.128, 0.05, -0.028] }, // around the malleolar tip
          { bone: 'foot', rest: [0.113, 0.026, -0.008] }, // lateral calcaneus (below the peroneal trochlea)
          { bone: 'foot', rest: [0.124, 0.016, 0.04] }, // into the cuboid groove
          { bone: 'foot', rest: [0.11, 0.014, 0.054] }, // under the cuboid
          { ref: 'foot:first_met_base', off: [0.003, -0.008, -0.004] },
        ],
        radius: 0.0078,
        tendon: [0.03, 0.55],
      },
      {
        name: '下部（腓骨外側面 上2/3）',
        path: [
          { ref: 'tibia:fibula_lat_prox', off: [0.0, -0.06, 0.01] },
          { bone: 'tibia', rest: [0.134, 0.27, -0.018] },
          { bone: 'tibia', rest: [0.133, 0.21, -0.027] },
          { ref: 'tibia:retro_lateral_malleolus', off: [0.002, -0.002, 0.001] },
          { bone: 'tibia', rest: [0.128, 0.05, -0.028] },
          { bone: 'foot', rest: [0.113, 0.026, -0.008] },
          { bone: 'foot', rest: [0.124, 0.016, 0.04] },
          { bone: 'foot', rest: [0.11, 0.014, 0.054] },
          { ref: 'foot:first_met_base', off: [0.004, -0.009, -0.006] },
        ],
        radius: 0.007,
        tendon: [0.03, 0.6],
      },
    ],
    base: 'LONG_SIT',
    actionPose: { joints: { ankle_R: { dorsi: -32, inv: -18 } } },
    stretchPose: { joints: { ankle_R: { dorsi: 15, inv: 30 } } },
    camera: { dir: [-0.7, 0.3, 0.65] },
    focus: 'ankle',
  },

  // fibularis (peroneus) brevis: lower 2/3 of the lateral fibula (deep to longus, belly reaches the ankle) →
  // tendon directly in the groove behind the lateral malleolus → above the peroneal trochlea → 5th MT tuberosity.
  'fibularis-brevis': {
    id: 'fibularis-brevis',
    strands: [
      // a flat band lying on the lateral → posterolateral surface of the fibula (the surface spirals backward toward
      // the malleolar groove); both slips end in one tendon behind the malleolus
      {
        name: '上部',
        path: [
          { ref: 'tibia:fibula_lat_mid', off: [0.002, 0.04, 0.004] },
          { bone: 'tibia', rest: [0.1315, 0.24, -0.024] },
          { bone: 'tibia', rest: [0.129, 0.17, -0.028] },
          { bone: 'tibia', rest: [0.125, 0.11, -0.034] },
          { bone: 'tibia', rest: [0.121, 0.068, -0.034] }, // groove behind the lateral malleolus
          { bone: 'tibia', rest: [0.124, 0.05, -0.02] }, // around the malleolar tip
          { bone: 'foot', rest: [0.117, 0.036, 0.004] }, // lateral calcaneus (above the peroneal trochlea)
          { ref: 'foot:fifth_met_base', off: [0.006, 0.004, -0.006] },
        ],
        radius: 0.0045,
        tendon: [0.02, 0.38],
        flat: { width: 0.016, normal: 'lateral' },
      },
      {
        name: '下部',
        path: [
          { ref: 'tibia:fibula_lat_mid', off: [0.0, -0.05, -0.004] },
          { bone: 'tibia', rest: [0.129, 0.165, -0.029] },
          { bone: 'tibia', rest: [0.125, 0.11, -0.034] },
          { bone: 'tibia', rest: [0.121, 0.068, -0.034] },
          { bone: 'tibia', rest: [0.124, 0.05, -0.02] },
          { bone: 'foot', rest: [0.117, 0.036, 0.004] },
          { ref: 'foot:fifth_met_base', off: [0.006, 0.003, -0.004] },
        ],
        radius: 0.004,
        tendon: [0.02, 0.45],
        flat: { width: 0.013, normal: 'lateral' },
      },
    ],
    base: 'LONG_SIT',
    actionPose: { joints: { ankle_R: { dorsi: -30, inv: -18 } } },
    stretchPose: { joints: { ankle_R: { dorsi: 15, inv: 30 } } },
    camera: { dir: [-0.85, 0.35, 0.3] },
    focus: 'ankle',
  },

  // flexor hallucis longus: lower 2/3 of the posterior fibula (low-lying belly) → behind the distal tibia →
  // groove on the posterior talus → under the sustentaculum tali → along the medial sole → under the 1st MT head →
  // base of the hallux distal phalanx. Demo prone with the knee bent: pointing the foot + curling the big toe shortens
  // it; pulling the foot and the big toe up stretches it.
  'flexor-hallucis-longus': {
    id: 'flexor-hallucis-longus',
    strands: [
      {
        name: '上部（腓骨後面）',
        path: [
          { ref: 'tibia:fibula_post_mid', off: [0.0, 0.09, -0.002] },
          { bone: 'tibia', rest: [0.11, 0.26, -0.04] },
          { bone: 'tibia', rest: [0.094, 0.17, -0.032] },
          { bone: 'tibia', rest: [0.084, 0.108, -0.03] }, // behind the distal tibia
          { bone: 'foot', rest: [0.082, 0.064, -0.031] }, // groove on the posterior talus
          { bone: 'foot', rest: [0.071, 0.046, -0.023] }, // medial to the calcaneus, behind the sustentaculum
          { bone: 'foot', rest: [0.068, 0.038, -0.004] }, // under the sustentaculum tali
          { bone: 'foot', rest: [0.066, 0.003, 0.138] }, // under the 1st MT head (between the sesamoids)
          { bone: 'toes', rest: [0.0635, 0.0035, 0.16] }, // under the proximal phalanx
          { ref: 'toes:hallux_distal', off: [0.0005, -0.0065, -0.01] },
        ],
        radius: 0.0095,
        tendon: [0.03, 0.53],
      },
      {
        name: '下部（腓骨後面・骨間膜）',
        path: [
          { ref: 'tibia:fibula_post_mid', off: [-0.004, -0.04, -0.003] },
          { bone: 'tibia', rest: [0.1, 0.16, -0.036] },
          { bone: 'tibia', rest: [0.085, 0.108, -0.03] },
          { bone: 'foot', rest: [0.083, 0.064, -0.031] },
          { bone: 'foot', rest: [0.071, 0.046, -0.023] },
          { bone: 'foot', rest: [0.068, 0.038, -0.004] },
          { bone: 'foot', rest: [0.066, 0.003, 0.138] },
          { bone: 'toes', rest: [0.0635, 0.0035, 0.16] },
          { ref: 'toes:hallux_distal', off: [0.0005, -0.0065, -0.01] },
        ],
        radius: 0.0085,
        tendon: [0.03, 0.62],
      },
    ],
    // prone with the knee bent 90°: shank vertical, sole facing up, nothing in front of the medial side
    base: 'PRONE',
    restPose: { joints: { knee_R: { flex: 90 }, ankle_R: { dorsi: -10 }, toes_R: { ext: 0 } } },
    actionPose: { joints: { ankle_R: { dorsi: -40 }, toes_R: { ext: -35 } } },
    stretchPose: { joints: { ankle_R: { dorsi: 20 }, toes_R: { ext: 45 } } },
    camera: { dir: [0.75, 0.3, 0.6] },
    focus: 'ankle',
  },

  // abductor hallucis: medial process of the calcaneal tuberosity (+ flexor retinaculum, plantar aponeurosis) →
  // along the medial border of the sole (superficial to the FHL tendon) → medial sesamoid → medial base of the
  // hallux proximal phalanx. The rig has no hallux-abduction DOF, so the demo uses its secondary action: toe (MTP)
  // flexion shortens it; toe extension (as in the plantar-fascia stretch) lengthens it. Prone, knee bent, sole up.
  'abductor-hallucis': {
    id: 'abductor-hallucis',
    strands: [
      {
        path: [
          { ref: 'foot:calcaneus_plantar_medial', off: [-0.006, 0.002, -0.002] },
          { bone: 'foot', rest: [0.066, 0.021, 0.008] }, // medial arch (under the sustentaculum / navicular)
          { bone: 'foot', rest: [0.062, 0.018, 0.085] }, // medial to the 1st MT base
          { bone: 'foot', rest: [0.055, 0.004, 0.137] }, // medial-plantar to the 1st MT head (medial sesamoid)
          { ref: 'toes:hallux_prox', off: [-0.006, -0.002, -0.01] },
        ],
        radius: 0.0045,
        tendon: [0.0, 0.33],
        flat: { width: 0.017, normal: 'medial' },
      },
    ],
    base: 'PRONE',
    restPose: { joints: { knee_R: { flex: 90 }, ankle_R: { dorsi: -10 }, toes_R: { ext: 0 } } },
    actionPose: { joints: { toes_R: { ext: -40 } } },
    // windlass position of the plantar-fascia stretch (toes pulled back)
    stretchPose: { joints: { toes_R: { ext: 70 }, ankle_R: { dorsi: 15 } } },
    camera: { dir: [0.55, 0.75, 0.35] },
    focus: 'ankle',
  },

  // flexor digitorum brevis: medial process of the calcaneal tuberosity + central plantar aponeurosis → belly in the
  // middle of the sole → 4 tendons under the MT heads → sides of the middle phalanges of toes 2–5. The toes are one
  // segment (no PIP joint), so the demo shows MTP flexion / extension. Prone, knee bent, sole up.
  // Layering: the belly lies DEEP (dorsal) to the plantar aponeurosis (y ≈ 0.0145 / 0.0115 vs. fascia ≈ 0.007 / 0.0045).
  'flexor-digitorum-brevis': {
    id: 'flexor-digitorum-brevis',
    strands: [
      {
        name: '第2趾',
        path: [
          { ref: 'foot:calcaneus_plantar_medial', off: [0.0, -0.003, 0.012] },
          { bone: 'foot', rest: [0.083, 0.0145, 0.02] },
          { bone: 'foot', rest: [0.082, 0.0115, 0.085] },
          { bone: 'foot', rest: [0.08, 0.0045, 0.132] },
          { bone: 'toes', rest: [0.0805, 0.004, 0.151] },
          { bone: 'toes', rest: [0.081, 0.0055, 0.166] },
        ],
        radius: 0.0048,
        tendon: [0.0, 0.45],
      },
      {
        name: '第3趾',
        path: [
          { ref: 'foot:calcaneus_plantar_medial', off: [0.002, -0.003, 0.012] },
          { bone: 'foot', rest: [0.09, 0.0145, 0.02] },
          { bone: 'foot', rest: [0.095, 0.0115, 0.085] },
          { bone: 'foot', rest: [0.095, 0.0045, 0.126] },
          { bone: 'toes', rest: [0.0955, 0.004, 0.143] },
          { bone: 'toes', rest: [0.096, 0.005, 0.158] },
        ],
        radius: 0.005,
        tendon: [0.0, 0.45],
      },
      {
        name: '第4趾',
        path: [
          { ref: 'foot:calcaneus_plantar_medial', off: [0.004, -0.003, 0.012] },
          { bone: 'foot', rest: [0.097, 0.0145, 0.02] },
          { bone: 'foot', rest: [0.108, 0.0115, 0.085] },
          { bone: 'foot', rest: [0.11, 0.0045, 0.118] },
          { bone: 'toes', rest: [0.1105, 0.004, 0.133] },
          { bone: 'toes', rest: [0.111, 0.005, 0.148] },
        ],
        radius: 0.0046,
        tendon: [0.0, 0.45],
      },
      {
        name: '第5趾',
        path: [
          { ref: 'foot:calcaneus_plantar_medial', off: [0.006, -0.003, 0.012] },
          { bone: 'foot', rest: [0.104, 0.0145, 0.02] },
          { bone: 'foot', rest: [0.121, 0.0115, 0.085] },
          { bone: 'foot', rest: [0.125, 0.0045, 0.108] },
          { bone: 'toes', rest: [0.1255, 0.003, 0.127] },
          { bone: 'toes', rest: [0.126, 0.005, 0.136] },
        ],
        radius: 0.0042,
        tendon: [0.0, 0.45],
      },
    ],
    base: 'PRONE',
    restPose: { joints: { knee_R: { flex: 90 }, ankle_R: { dorsi: -10 }, toes_R: { ext: 0 } } },
    actionPose: { joints: { toes_R: { ext: -40 } } },
    stretchPose: { joints: { toes_R: { ext: 70 }, ankle_R: { dorsi: 15 } } },
    camera: { dir: [0.25, 0.9, 0.35] },
    focus: 'ankle',
  },
};

// ── R4b: calf / ankle / foot structures ───────────────────────────────────────────────────────────────────
// Rest coordinates are lateral-positive [lat, y, z]. The fibula and both malleoli belong to the `tibia` segment.
// Bone-only structures produce no framing points and no label anchor of their own → they always set `labelAt`.
// "bone tint first, then a spot": the spot glows (halo) only when the structure is `injured`; as `involved` it
// renders as a small amber blob that blends into the amber bone tint (so a stress-fracture site shows on the
// fracture page without distracting on pages where the bone is only overloaded).
// Cameras: most are exact { position, target } close-ups in world coords of the base pose (STAND: x = −lat, y/z as
// rest). Auto framing would include every highlighted visual, and several condition pages list a hip muscle
// (gluteus medius / maximus) next to a small ankle structure, which would shrink the injured part to a few pixels.
// plantar-fascia / interdigital-nerve use base PRONE (sole up, like a clinical exam); as the first structure on
// plantar-heel-pain / mortons-neuroma that base applies to the whole condition view.
export const structures: Partial<Record<StructureId, StructureRig>> = {
  // ── calf / shin ─────────────────────────────────────────────────────────────────────────────────────────
  // tibia: the whole bone (shaft + plateau + medial malleolus). Spot = the typical (low-risk) tibial stress-fracture
  // site: posteromedial cortex at the junction of the middle and distal thirds.
  tibia: {
    id: 'tibia',
    parts: [
      { type: 'bone', parts: ['tibia', 'tibial_plateau', 'medial_malleolus'] },
      { type: 'spot', at: { bone: 'tibia', rest: [0.0745, 0.215, -0.0065] }, radius: 0.009 },
    ],
    labelAt: { bone: 'tibia', rest: [0.074, 0.3, 0.0] },
    camera: { position: [0.616, 0.517, -0.684], target: [-0.08, 0.27, -0.01] },
    focus: 'calf',
  },
  // medial tibial border (periosteum): a thin strip along the posteromedial border of the distal 2/3 of the tibia,
  // where the soleus / FDL / deep crural fascia attach (MTSS pain runs along ≥ 5 cm of it).
  'medial-tibial-border': {
    id: 'medial-tibial-border',
    parts: [
      {
        type: 'fascia',
        path: [
          { bone: 'tibia', rest: [0.0727, 0.335, -0.0036] },
          { bone: 'tibia', rest: [0.0721, 0.26, -0.0031] },
          { bone: 'tibia', rest: [0.0703, 0.19, -0.0055] },
          { bone: 'tibia', rest: [0.0688, 0.125, -0.0078] },
        ],
        radius: 0.002,
        flat: { width: 0.013, normal: 'medial' },
      },
    ],
    labelAt: { bone: 'tibia', rest: [0.0718, 0.23, -0.004] },
    camera: { position: [0.512, 0.465, -0.583], target: [-0.08, 0.255, -0.01] },
    focus: 'calf',
  },
  // fibula: the slender lateral bone, head to lateral malleolus.
  fibula: {
    id: 'fibula',
    parts: [{ type: 'bone', parts: ['fibula', 'fibular_head', 'lateral_malleolus'] }],
    labelAt: { bone: 'tibia', rest: [0.129, 0.3, -0.022] },
    camera: { position: [-1.009, 0.469, -0.281], target: [-0.12, 0.26, -0.02] },
    focus: 'calf',
  },

  // ── ankle ───────────────────────────────────────────────────────────────────────────────────────────────
  // Achilles tendon: gastrocnemius + soleus → posterior calcaneus. Flat band (≈15 mm wide, 7 mm thick at the
  // midportion); just above the insertion it passes BEHIND the posterosuperior calcaneus (the retrocalcaneal bursa
  // lies in between) and spreads into a broad footprint on the middle of the posterior calcaneal surface.
  'achilles-tendon': {
    id: 'achilles-tendon',
    parts: [
      {
        type: 'tendon',
        path: [
          // same line as the gastrocnemius / soleus tendons: just inside the (thin) ankle skin, then down to the heel
          { bone: 'tibia', rest: [0.09, 0.25, -0.0505] },
          { bone: 'tibia', rest: [0.09, 0.18, -0.041] },
          { bone: 'tibia', rest: [0.09, 0.125, -0.0355] },
          { bone: 'foot', rest: [0.09, 0.054, -0.0755] }, // behind the posterosuperior calcaneus (bursa in between)
          { bone: 'foot', rest: [0.09, 0.031, -0.0765] },
        ],
        radius: 0.0034,
        flat: { width: 0.015, normal: 'posterior' },
      },
      {
        // insertion footprint (middle third of the posterior calcaneal surface)
        type: 'tendon',
        path: [
          { bone: 'foot', rest: [0.09, 0.045, -0.0748] },
          { bone: 'foot', rest: [0.09, 0.033, -0.0756] },
          { bone: 'foot', rest: [0.09, 0.021, -0.0745] },
        ],
        radius: 0.002,
        flat: { width: 0.022, normal: 'posterior' },
      },
    ],
    labelAt: { bone: 'tibia', rest: [0.09, 0.1, -0.056] },
    camera: { position: [-0.642, 0.345, -0.37], target: [-0.09, 0.15, -0.045] },
    focus: 'ankle',
  },
  // calcaneus: heel bone.
  calcaneus: {
    id: 'calcaneus',
    parts: [{ type: 'bone', parts: ['calcaneus'] }],
    labelAt: { bone: 'foot', rest: [0.112, 0.03, -0.045] },
    camera: { position: [-0.366, 0.162, -0.234], target: [-0.095, 0.035, -0.035] },
    focus: 'ankle',
  },
  // retrocalcaneal bursa: thin wedge-shaped sac between the anterior surface of the distal Achilles tendon and the
  // posterosuperior corner of the calcaneus (pinched in dorsiflexion).
  'retrocalcaneal-bursa': {
    id: 'retrocalcaneal-bursa',
    parts: [{ type: 'bursa', at: 'foot:calcaneus_post_sup', radii: [0.0075, 0.0085, 0.003], off: [0, 0.002, -0.0075] }],
    camera: { position: [-0.366, 0.121, -0.164], target: [-0.09, 0.055, -0.068] },
    focus: 'ankle',
  },
  // talus: between the malleoli (mortise), on top of the calcaneus; no muscle attaches to it.
  talus: {
    id: 'talus',
    parts: [{ type: 'bone', parts: ['talus'] }],
    labelAt: { bone: 'foot', rest: [0.104, 0.064, 0.016] },
    camera: { position: [-0.3125, 0.228, 0.2456], target: [-0.095, 0.065, 0.01] },
    focus: 'ankle',
  },
  // ATFL: flat band from the anterior margin of the lateral malleolus, anteromedially (nearly horizontal in neutral)
  // to the lateral talar neck. Taut in plantarflexion + inversion → the first ligament to tear in a sprain.
  atfl: {
    id: 'atfl',
    parts: [
      {
        type: 'ligament',
        path: [
          { bone: 'tibia', rest: [0.1195, 0.064, -0.0085] },
          { bone: 'foot', rest: [0.1065, 0.0615, 0.0125] },
        ],
        radius: 0.0014,
        flat: { width: 0.008, normal: 'lateral' },
      },
    ],
    camera: { position: [-0.414, 0.218, 0.244], target: [-0.112, 0.058, 0.0] },
    focus: 'ankle',
  },
  // CFL: round cord from the tip of the lateral malleolus downward and backward to the lateral calcaneus (deep to
  // the peroneal tendons).
  cfl: {
    id: 'cfl',
    parts: [
      {
        type: 'ligament',
        path: [
          { bone: 'tibia', rest: [0.1195, 0.0545, -0.0165] },
          { bone: 'foot', rest: [0.1185, 0.042, -0.0255] },
          { bone: 'foot', rest: [0.1135, 0.0305, -0.0335] },
        ],
        radius: 0.0023,
      },
    ],
    camera: { position: [-0.411, 0.144, -0.1], target: [-0.117, 0.048, -0.02] },
    focus: 'ankle',
  },
  // lateral malleolus: distal fibula.
  'lateral-malleolus': {
    id: 'lateral-malleolus',
    parts: [{ type: 'bone', parts: ['lateral_malleolus'] }],
    labelAt: 'tibia:lateral_malleolus',
    camera: { position: [-0.44, 0.184, 0.094], target: [-0.118, 0.07, -0.02] },
    focus: 'ankle',
  },
  // medial malleolus: distal tibia.
  'medial-malleolus': {
    id: 'medial-malleolus',
    parts: [{ type: 'bone', parts: ['medial_malleolus'] }],
    labelAt: 'tibia:medial_malleolus',
    camera: { position: [0.155, 0.208, 0.256], target: [-0.064, 0.08, 0.0] },
    focus: 'ankle',
  },
  // tibialis posterior tendon: from the distal leg in the groove BEHIND the medial malleolus (pulley on the tibia),
  // around its tip, forward to the navicular tuberosity; plantar slips fan to the cuneiforms / MT bases.
  // Follows the tibialis-posterior muscle rig so both coincide on the condition page.
  'tibialis-posterior-tendon': {
    id: 'tibialis-posterior-tendon',
    parts: [
      {
        type: 'tendon',
        path: [
          { bone: 'tibia', rest: [0.08, 0.17, -0.0215] },
          { bone: 'tibia', rest: [0.072, 0.13, -0.019] },
          { bone: 'tibia', rest: [0.058, 0.09, -0.012] }, // groove behind the medial malleolus
          { bone: 'tibia', rest: [0.052, 0.068, -0.006] }, // around the malleolar tip
          { bone: 'foot', rest: [0.054, 0.055, 0.024] },
          { bone: 'foot', rest: [0.0575, 0.0455, 0.0535] }, // navicular tuberosity
        ],
        radius: 0.0028,
      },
      {
        // plantar slips → cuneiforms / bases of MT 2–3
        type: 'tendon',
        path: [
          { bone: 'foot', rest: [0.06, 0.041, 0.054] },
          { bone: 'foot', rest: [0.07, 0.032, 0.064] },
          { bone: 'foot', rest: [0.086, 0.028, 0.077] },
        ],
        radius: 0.0017,
      },
    ],
    labelAt: { bone: 'tibia', rest: [0.055, 0.085, -0.013] },
    camera: { position: [0.258, 0.2745, -0.254], target: [-0.065, 0.09, 0.0] },
    focus: 'ankle',
  },
  // peroneal (fibularis) tendons: brevis directly in the groove behind the lateral malleolus → above the peroneal
  // trochlea → 5th MT base; longus posterolateral to it → below the trochlea → cuboid groove → across the sole →
  // 1st MT base. Same course as the fibularis muscle rigs.
  'peroneal-tendons': {
    id: 'peroneal-tendons',
    parts: [
      {
        // fibularis brevis tendon
        type: 'tendon',
        path: [
          { bone: 'tibia', rest: [0.1255, 0.12, -0.033] },
          { bone: 'tibia', rest: [0.121, 0.068, -0.034] }, // groove behind the lateral malleolus
          { bone: 'tibia', rest: [0.124, 0.05, -0.02] }, // around the malleolar tip
          { bone: 'foot', rest: [0.117, 0.036, 0.004] }, // above the peroneal trochlea
          { bone: 'foot', rest: [0.136, 0.024, 0.056] }, // 5th MT tuberosity
        ],
        radius: 0.0024,
      },
      {
        // fibularis longus tendon
        type: 'tendon',
        path: [
          { bone: 'tibia', rest: [0.1285, 0.125, -0.038] },
          { bone: 'tibia', rest: [0.124, 0.066, -0.039] },
          { bone: 'tibia', rest: [0.128, 0.05, -0.028] },
          { bone: 'foot', rest: [0.113, 0.026, -0.008] }, // below the peroneal trochlea
          { bone: 'foot', rest: [0.124, 0.016, 0.04] }, // into the cuboid groove
          { bone: 'foot', rest: [0.11, 0.014, 0.054] }, // under the cuboid
          { bone: 'foot', rest: [0.069, 0.022, 0.092] }, // 1st MT base / medial cuneiform (plantar)
        ],
        radius: 0.0022,
      },
    ],
    labelAt: { bone: 'tibia', rest: [0.124, 0.075, -0.038] },
    camera: { position: [-0.516, 0.21, -0.178], target: [-0.12, 0.07, -0.015] },
    focus: 'ankle',
  },

  // ── foot ────────────────────────────────────────────────────────────────────────────────────────────────
  // plantar fascia: thick fascia from the medial calcaneal tubercle (underside of the heel bone) fanning forward:
  // central band → slips to toes 2–5 (MT heads), medial band → big toe, lateral band → 5th MT base.
  'plantar-fascia': {
    id: 'plantar-fascia',
    parts: [
      {
        // central band
        type: 'fascia',
        path: [
          { bone: 'foot', rest: [0.084, 0.0155, -0.046] },
          { bone: 'foot', rest: [0.087, 0.0125, -0.012] },
          { bone: 'foot', rest: [0.09, 0.0055, 0.03] },
          { bone: 'foot', rest: [0.093, 0.0045, 0.085] },
        ],
        radius: 0.0015,
        flat: { width: 0.018, normal: 'inferior' },
      },
      {
        // medial band → big toe
        type: 'fascia',
        path: [
          { bone: 'foot', rest: [0.08, 0.016, -0.043] },
          { bone: 'foot', rest: [0.077, 0.0125, -0.01] },
          { bone: 'foot', rest: [0.072, 0.007, 0.04] },
          { bone: 'foot', rest: [0.066, 0.004, 0.1] },
          { bone: 'foot', rest: [0.064, 0.003, 0.135] },
        ],
        radius: 0.0012,
        flat: { width: 0.01, normal: 'inferior' },
      },
      {
        // lateral band → 5th MT base
        type: 'fascia',
        path: [
          { bone: 'foot', rest: [0.088, 0.0155, -0.045] },
          { bone: 'foot', rest: [0.098, 0.0125, -0.012] },
          { bone: 'foot', rest: [0.114, 0.0085, 0.03] },
          { bone: 'foot', rest: [0.129, 0.0115, 0.056] },
        ],
        radius: 0.0012,
        flat: { width: 0.009, normal: 'inferior' },
      },
      // digital slips of the central band (toes 2–5)
      ...(
        [
          [0.08, 0.135],
          [0.095, 0.128],
          [0.109, 0.12],
          [0.123, 0.11],
        ] as const
      ).map(([lat, z]) => ({
        type: 'fascia' as const,
        path: [
          { bone: 'foot' as const, rest: [0.093, 0.0045, 0.08] as [number, number, number] },
          { bone: 'foot' as const, rest: [lat, 0.0035, z] as [number, number, number] },
        ],
        radius: 0.001,
        flat: { width: 0.006, normal: 'inferior' as const },
      })),
    ],
    labelAt: { bone: 'foot', rest: [0.082, 0.014, -0.04] },
    base: 'PRONE',
    camera: { position: [0.031, 0.62, -1.208], target: [-0.088, 0.115, -0.91] },
    focus: 'foot',
  },
  // heel fat pad: compartmented fat cushion under the calcaneal tuberosity (between the bone and the heel skin).
  'heel-fat-pad': {
    id: 'heel-fat-pad',
    parts: [{ type: 'fatpad', at: 'foot:calcaneus_plantar', radii: [0.016, 0.0062, 0.025], off: [0, 0.001, -0.016] }],
    camera: { position: [-0.398, 0.103, -0.208], target: [-0.09, 0.012, -0.045] },
    focus: 'foot',
  },
  // navicular: keystone of the medial arch, in front of and below the medial malleolus; tuberosity = tib post insertion.
  navicular: {
    id: 'navicular',
    parts: [{ type: 'bone', parts: ['navicular'] }],
    labelAt: 'foot:navicular_tuberosity',
    camera: { position: [0.132, 0.21, 0.307], target: [-0.066, 0.048, 0.055] },
    focus: 'foot',
  },
  // medial longitudinal arch: the bones of the arch (calcaneus → talus → navicular → cuneiforms → metatarsals) plus
  // the spring (plantar calcaneonavicular) ligament, the sling under the talar head at the apex of the arch.
  'medial-arch': {
    id: 'medial-arch',
    parts: [
      {
        type: 'ligament',
        path: [
          { bone: 'foot', rest: [0.067, 0.045, 0.0] },
          { bone: 'foot', rest: [0.07, 0.041, 0.03] },
          { bone: 'foot', rest: [0.065, 0.041, 0.05] },
        ],
        radius: 0.0018,
        flat: { width: 0.009, normal: 'inferior' },
      },
      { type: 'bone', parts: ['calcaneus', 'talus', 'navicular', 'cuneiforms', 'metatarsals'] },
    ],
    labelAt: { bone: 'foot', rest: [0.064, 0.042, 0.046] },
    camera: { position: [0.1563, 0.0931, 0.3799], target: [-0.075, 0.03, 0.035] },
    focus: 'foot',
  },
  // metatarsals: the five long bones. Spot = the classic runner's stress-fracture site (2nd/3rd MT shaft–neck).
  metatarsals: {
    id: 'metatarsals',
    parts: [
      { type: 'bone', parts: ['metatarsals'] },
      { type: 'spot', at: 'foot:met_2_3_shaft', radius: 0.0065 },
    ],
    labelAt: 'foot:met_2_3_shaft',
    camera: { position: [-0.2185, 0.325, 0.249], target: [-0.095, 0.025, 0.09] },
    focus: 'foot',
  },
  // interdigital nerve: common plantar digital nerve of the 3rd web space (medial + lateral plantar nerve branches),
  // running forward on the sole, under the deep transverse metatarsal ligament between the 3rd and 4th MT heads,
  // splitting into the digital nerves of toes 3 and 4. The thickening (Morton's neuroma) sits between the heads.
  'interdigital-nerve': {
    id: 'interdigital-nerve',
    parts: [
      {
        type: 'nerve',
        path: [
          { bone: 'foot', rest: [0.1, 0.012, 0.075] },
          { bone: 'foot', rest: [0.1025, 0.008, 0.112] },
          { bone: 'foot', rest: [0.1025, 0.0075, 0.13] }, // between the 3rd and 4th MT heads
          { bone: 'toes', rest: [0.1025, 0.009, 0.142] },
        ],
        radius: 0.0018,
      },
      {
        // neuroma: spindle-shaped thickening in the 3rd web space
        type: 'nerve',
        path: [
          { bone: 'foot', rest: [0.1025, 0.008, 0.12] },
          { bone: 'foot', rest: [0.1025, 0.0075, 0.134] },
        ],
        radius: 0.0034,
      },
      {
        // digital branches to the adjacent sides of toes 3 and 4
        type: 'nerve',
        path: [
          { bone: 'toes', rest: [0.1025, 0.009, 0.142] },
          { bone: 'toes', rest: [0.099, 0.008, 0.156] },
        ],
        radius: 0.0011,
      },
      {
        type: 'nerve',
        path: [
          { bone: 'toes', rest: [0.1025, 0.009, 0.142] },
          { bone: 'toes', rest: [0.107, 0.008, 0.152] },
        ],
        radius: 0.0011,
      },
    ],
    labelAt: 'foot:interspace_3_4',
    base: 'PRONE',
    camera: { position: [-0.068, 0.346, -1.144], target: [-0.1, 0.07, -0.985] },
    focus: 'foot',
  },
};
