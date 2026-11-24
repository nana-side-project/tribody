// r2 — trunk / neck + thigh muscles; spine + knee structures.
// Owner after the engine agent: rigging agent r2. See docs/ENGINE.md.
import type { MuscleId, StructureId } from '../../data/registry';
import type { AttachRef, MuscleRig, StructureRig } from './types';
import type { Vec3 } from '../rig';

// R2a helper — a point in the abdominal / flank wall that rides the pelvis, lumbar and thorax segments with the
// same height-dependent blend as the mannequin's trunk skin, so flat abdominal muscles stay under the skin when the
// trunk bends or turns. Blend position: 0 = pelvis, 1 = lumbar, 2 = thorax.
const AB_WALL_Y = [0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.26];
const AB_WALL_S = [0, 0.25, 0.7, 1, 1.5, 1.85, 2];
function abWall(rest: Vec3): AttachRef {
  const y = rest[1];
  let s = y <= AB_WALL_Y[0] ? 0 : 2;
  for (let i = 0; i < AB_WALL_Y.length - 1; i++) {
    if (y > AB_WALL_Y[i] && y <= AB_WALL_Y[i + 1]) {
      s = AB_WALL_S[i] + ((AB_WALL_S[i + 1] - AB_WALL_S[i]) * (y - AB_WALL_Y[i])) / (AB_WALL_Y[i + 1] - AB_WALL_Y[i]);
    }
  }
  if (s < 0.01) return { bone: 'pelvis', rest };
  if (s > 1.99) return { bone: 'thorax', rest };
  if (Math.abs(s - 1) < 0.01) return { bone: 'lumbar', rest };
  return s < 1
    ? { mix: [{ bone: 'pelvis', rest }, { bone: 'lumbar', rest }], t: s }
    : { mix: [{ bone: 'lumbar', rest }, { bone: 'thorax', rest }], t: s - 1 };
}

// R2a helper — a point on the linea alba just right of the midline, deep to the rectus (the chord from the xiphoid
// to the pubic symphysis; t = 0 at the xiphoid), where the transversus aponeurosis ends.
const lineaAlba = (t: number): AttachRef => ({
  mix: [
    { ref: 'thorax:xiphoid', off: [0.006, 0, -0.02] },
    { ref: 'pelvis:pubic_symphysis', off: [0.006, 0, -0.012] },
  ],
  t,
});

export const muscles: Partial<Record<MuscleId, MuscleRig>> = {
  // ═══════════════════════════════════════ R2a — trunk / neck muscles
  // Note: the rig's lumbar spine is one rigid segment (joints only at L5/S1 and T12/L1) and the cervical spine
  // another (C7/T1 and C0/C1), so every strand below crosses at least one of those joints to change length.

  // 頸部深層屈筋群 — on the front of the cervical spine, behind the pharynx: longus capitis (C3–C6 transverse
  // processes → basilar occiput) and longus colli (vertical part T1–T3 / C5–C7 bodies → C2–C4 bodies; superior
  // oblique C3–C5 transverse processes → anterior tubercle of the atlas; inferior oblique T1–T3 bodies → C5–C6
  // transverse processes). Craniocervical flexion (the nod / chin tuck) shortens them.
  'deep-neck-flexors': {
    id: 'deep-neck-flexors',
    strands: [
      {
        name: '頭長筋',
        path: [
          { ref: 'neck:transverse_C5', off: [-0.005, 0, 0.008] },
          { bone: 'neck', rest: [0.017, 1.535, 0.018] },
          { bone: 'neck', rest: [0.014, 1.575, 0.017] },
          { ref: 'head:skull_base_ant', off: [0.002, 0.012, -0.002] },
        ],
        radius: 0.0048,
        tendon: [0.1, 0.18],
      },
      {
        name: '頸長筋（垂直部）',
        path: [
          { ref: 'thorax:body_T2', off: [-0.01, 0, 0.005] },
          { bone: 'neck', rest: [0.007, 1.462, -0.003] },
          { bone: 'neck', rest: [0.007, 1.497, 0.011] },
          { ref: 'neck:body_C3', off: [-0.002, 0.004, 0.004] },
        ],
        radius: 0.0042,
        tendon: [0.1, 0.18],
      },
      {
        name: '頸長筋（上斜部）',
        path: [
          { ref: 'neck:transverse_C4', off: [-0.006, 0, 0.007] },
          { bone: 'neck', rest: [0.011, 1.55, 0.016] },
          { ref: 'neck:body_C1', off: [-0.004, 0, 0.0] },
        ],
        radius: 0.0032,
        tendon: [0.08, 0.12],
      },
      {
        name: '頸長筋（下斜部）',
        path: [
          { ref: 'thorax:body_T1', off: [-0.008, -0.004, 0.003] },
          { bone: 'neck', rest: [0.014, 1.462, -0.003] },
          { ref: 'neck:transverse_C6', off: [-0.006, 0, 0.01] },
        ],
        radius: 0.0032,
        tendon: [0.08, 0.12],
      },
    ],
    // nod + neck flexion (chin to chest) / looking up (head and neck extension)
    actionPose: { joints: { head: { flex: 26 }, neck: { flex: 26 } } },
    stretchPose: { joints: { head: { flex: -26 }, neck: { flex: -38 } } },
    camera: { dir: [-1, 0.05, 0.3] },
    focus: 'neck',
  },

  // 脊柱起立筋 — 3 columns from the sacrum / iliac crest (common aponeurosis) up the back:
  // iliocostalis (lateral, → rib angles), longissimus (middle, → thoracic TPs / ribs; capitis → mastoid),
  // spinalis (medial, T11–L2 spinous → upper thoracic spinous). Extension shortens, flexion lengthens.
  'erector-spinae': {
    id: 'erector-spinae',
    strands: [
      {
        name: '腸肋筋',
        path: [
          { bone: 'pelvis', rest: [0.074, 1.068, -0.075] },
          { bone: 'lumbar', rest: [0.058, 1.105, -0.075] },
          { bone: 'thorax', rest: [0.041, 1.165, -0.1015] },
          { bone: 'thorax', rest: [0.04, 1.195, -0.109] },
          { bone: 'thorax', rest: [0.038, 1.24, -0.114] },
          { bone: 'thorax', rest: [0.041, 1.278, -0.117] },
          // angle of the 7th rib (the highest lumbar slips; the column continues as iliocostalis thoracis)
          { bone: 'thorax', rest: [0.05, 1.293, -0.1185] },
        ],
        radius: 0.0095,
        tendon: [0.04, 0.55],
      },
      {
        name: '最長筋（胸部）',
        path: [
          { bone: 'pelvis', rest: [0.03, 1.0, -0.079] },
          { bone: 'lumbar', rest: [0.032, 1.07, -0.084] },
          { bone: 'lumbar', rest: [0.03, 1.13, -0.09] },
          { bone: 'thorax', rest: [0.027, 1.2, -0.104] },
          { bone: 'thorax', rest: [0.028, 1.3, -0.11] },
          { ref: 'thorax:transverse_T3', off: [0, 0, -0.012] },
        ],
        radius: 0.0105,
        tendon: [0.05, 0.25],
      },
      {
        name: '最長筋（頭部）',
        path: [
          // continues from the upper thoracic transverse processes (T1–T5) to the mastoid process
          { ref: 'thorax:transverse_T3', off: [0, 0, -0.012] },
          { bone: 'thorax', rest: [0.032, 1.44, -0.082] },
          { bone: 'neck', rest: [0.034, 1.5, -0.045] },
          { bone: 'neck', rest: [0.04, 1.56, -0.036] },
          { ref: 'head:mastoid', off: [-0.009, 0, -0.007] },
        ],
        radius: 0.0045,
        tendon: [0.08, 0.1],
      },
      {
        name: '棘筋',
        path: [
          { ref: 'lumbar:spinous_L1', off: [0.009, 0, 0.01] },
          { bone: 'thorax', rest: [0.01, 1.22, -0.108] },
          { bone: 'thorax', rest: [0.01, 1.3, -0.113] },
          { ref: 'thorax:spinous_T4', off: [0.007, -0.01, 0.006] },
        ],
        radius: 0.005,
        tendon: [0.1, 0.1],
      },
    ],
    // standing back extension (arms kept hanging) / forward bend (chin to chest)
    actionPose: {
      joints: { lumbar: { flex: -25 }, thorax: { flex: -18 }, neck: { flex: -15 }, shoulder: { flex: -40 } },
    },
    stretchPose: {
      joints: {
        hip: { flex: 25 },
        lumbar: { flex: 38 },
        thorax: { flex: 28 },
        neck: { flex: 30 },
        shoulder: { flex: 90 },
      },
    },
    camera: { dir: [-0.9, 0.2, -0.75] },
    focus: 'lowback',
  },

  // 多裂筋 — deep segmental slips in the gutter beside the spinous processes, thickest in the lumbar region:
  // from the dorsal sacrum / PSIS (and the mamillary processes) up to the spinous processes 2–4 levels above.
  multifidus: {
    id: 'multifidus',
    strands: [
      {
        name: '仙骨→L5棘突起',
        path: [
          { bone: 'pelvis', rest: [0.018, 0.968, -0.099] },
          { bone: 'pelvis', rest: [0.014, 0.995, -0.097] },
          { bone: 'lumbar', rest: [0.009, 1.022, -0.087] },
        ],
        radius: 0.0075,
        tendon: [0.04, 0.1],
      },
      {
        name: '仙骨→L4棘突起',
        path: [
          { bone: 'pelvis', rest: [0.026, 0.983, -0.09] },
          { bone: 'pelvis', rest: [0.02, 1.006, -0.089] },
          { bone: 'lumbar', rest: [0.008, 1.05, -0.083] },
        ],
        radius: 0.0078,
        tendon: [0.04, 0.12],
      },
      {
        name: '仙骨→L3棘突起',
        path: [
          { bone: 'pelvis', rest: [0.034, 0.998, -0.08] },
          { bone: 'lumbar', rest: [0.022, 1.04, -0.082] },
          { bone: 'lumbar', rest: [0.008, 1.079, -0.083] },
        ],
        radius: 0.0075,
        tendon: [0.04, 0.12],
      },
      {
        name: '上後腸骨棘→L2棘突起',
        path: [
          { bone: 'pelvis', rest: [0.037, 1.02, -0.09] },
          { bone: 'lumbar', rest: [0.026, 1.06, -0.084] },
          { bone: 'lumbar', rest: [0.008, 1.109, -0.087] },
        ],
        radius: 0.0068,
        tendon: [0.04, 0.12],
      },
      {
        name: 'L2乳頭突起→T12棘突起',
        path: [
          { ref: 'lumbar:lamina_L2', off: [0.002, 0, 0.012] },
          { bone: 'thorax', rest: [0.007, 1.163, -0.099] },
        ],
        radius: 0.005,
        tendon: [0.05, 0.12],
      },
    ],
    // extension with a little rotation to the opposite side (left) / forward bend. The rig bends the whole lumbar
    // spine at L5/S1, so moderate angles keep these one-segment slips in a realistic range.
    actionPose: { joints: { lumbar: { flex: -12, rot: -8 }, thorax: { flex: -14 }, shoulder: { flex: -26 } } },
    stretchPose: {
      joints: {
        hip: { flex: 40 },
        lumbar: { flex: 20 },
        thorax: { flex: 22 },
        neck: { flex: 20 },
        shoulder: { flex: 82 },
      },
    },
    camera: { dir: [-0.9, 0.25, -0.75] },
    focus: 'lowback',
  },

  // 腰方形筋 — deep posterior abdominal wall, in front of the erector spinae: from the posterior iliac crest
  // (inner lip, iliolumbar ligament) up to the inferior border of rib 12 and the tips of the L1–L4 transverse
  // processes.
  'quadratus-lumborum': {
    id: 'quadratus-lumborum',
    strands: [
      {
        name: '腸肋部（外側）',
        path: [
          { bone: 'pelvis', rest: [0.114, 1.078, -0.05] },
          {
            mix: [
              { bone: 'pelvis', rest: [0.1, 1.112, -0.058] },
              { bone: 'thorax', rest: [0.1, 1.112, -0.058] },
            ],
            t: 0.5,
          },
          { bone: 'thorax', rest: [0.086, 1.153, -0.08] },
        ],
        radius: 0.005,
        tendon: [0.06, 0.1],
        flat: { width: 0.02, normal: 'posterior' },
      },
      {
        name: '腸肋部（内側）',
        path: [
          { bone: 'pelvis', rest: [0.1, 1.074, -0.058] },
          {
            mix: [
              { bone: 'pelvis', rest: [0.084, 1.112, -0.064] },
              { bone: 'thorax', rest: [0.084, 1.112, -0.064] },
            ],
            t: 0.5,
          },
          { bone: 'thorax', rest: [0.068, 1.157, -0.088] },
        ],
        radius: 0.005,
        tendon: [0.06, 0.1],
        flat: { width: 0.02, normal: 'posterior' },
      },
      {
        name: '腸腰部（→L3横突起）',
        path: [
          { bone: 'pelvis', rest: [0.104, 1.072, -0.054] },
          { ref: 'lumbar:transverse_L3', off: [0.008, 0.001, 0.0] },
        ],
        radius: 0.0042,
        tendon: [0.06, 0.12],
        flat: { width: 0.014, normal: 'posterior' },
      },
      {
        name: '腸腰部（→L1横突起）',
        path: [
          { bone: 'pelvis', rest: [0.108, 1.074, -0.052] },
          { ref: 'lumbar:transverse_L1', off: [0.008, 0.001, 0.002] },
        ],
        radius: 0.0042,
        tendon: [0.06, 0.12],
        flat: { width: 0.014, normal: 'posterior' },
      },
    ],
    // side bend to the same (right) side / side bend away with the right arm overhead
    // (the other arm is re-hung so it stays beside the body)
    actionPose: {
      joints: { lumbar: { lat: 6 }, thorax: { lat: 6 }, shoulder_R: { abd: 18 }, shoulder_L: { abd: -3 } },
    },
    stretchPose: {
      joints: {
        lumbar: { lat: -7 },
        thorax: { lat: -10 },
        shoulder_R: { abd: 165 },
        elbow_R: { flex: 20 },
        shoulder_L: { abd: 22 },
      },
    },
    camera: 'back',
    focus: 'lowback',
  },

  // 腹直筋 — flat band on each side of the linea alba: pubic crest / symphysis → costal cartilages 5–7 and the
  // xiphoid. Two flat strands (medial → xiphoid / 7th cartilage, lateral → 5th–6th cartilages) widen upward.
  'rectus-abdominis': {
    id: 'rectus-abdominis',
    strands: [
      {
        name: '内側（→剣状突起・第7肋軟骨）',
        path: [
          { ref: 'pelvis:pubic_crest', off: [-0.006, -0.002, 0.004] },
          abWall([0.012, 0.95, 0.082]),
          abWall([0.016, 1.03, 0.08]),
          abWall([0.02, 1.11, 0.082]),
          abWall([0.026, 1.19, 0.09]),
          { bone: 'thorax', rest: [0.033, 1.25, 0.101] },
        ],
        radius: 0.0045,
        tendon: [0.05, 0.03],
        flat: { width: 0.03, normal: 'anterior' },
      },
      {
        name: '外側（→第5・6肋軟骨）',
        path: [
          { ref: 'pelvis:pubic_crest', off: [0.008, 0.0, 0.003] },
          abWall([0.035, 0.95, 0.081]),
          abWall([0.048, 1.03, 0.077]),
          abWall([0.058, 1.11, 0.076]),
          abWall([0.064, 1.19, 0.082]),
          { bone: 'thorax', rest: [0.066, 1.287, 0.099] },
        ],
        radius: 0.0045,
        tendon: [0.05, 0.03],
        flat: { width: 0.034, normal: 'anterior' },
      },
    ],
    // standing curl (trunk flexion, arms kept hanging) / back bend with the arms overhead
    actionPose: { joints: { lumbar: { flex: 22 }, thorax: { flex: 24 }, neck: { flex: 15 }, shoulder: { flex: 46 } } },
    stretchPose: {
      joints: { lumbar: { flex: -24 }, thorax: { flex: -18 }, neck: { flex: -12 }, shoulder: { flex: 165 } },
    },
    camera: { dir: [-1, 0.2, 0.55] },
    focus: 'lowback',
  },

  // 腹斜筋 — external oblique (superficial; ribs 5–12 → anterior iliac crest, linea alba via the aponeurosis,
  // pubic tubercle via the inguinal ligament; fibres run down and in) and internal oblique (deeper; thoracolumbar
  // fascia / iliac crest / inguinal ligament → ribs 10–12, linea alba, pubic crest; fibres run up and in).
  obliques: {
    id: 'obliques',
    strands: [
      {
        name: '外腹斜筋（後部：第11肋→腸骨稜）',
        path: [
          { bone: 'thorax', rest: [0.131, 1.152, -0.012] },
          abWall([0.126, 1.09, -0.009]),
          { bone: 'pelvis', rest: [0.128, 1.058, 0.009] },
        ],
        radius: 0.0035,
        tendon: [0.04, 0.08],
        flat: { width: 0.034, normal: 'lateral' },
      },
      {
        name: '外腹斜筋（第9肋→恥骨結節）',
        path: [
          { bone: 'thorax', rest: [0.134, 1.174, 0.027] },
          abWall([0.114, 1.09, 0.036]),
          abWall([0.098, 1.0, 0.065]),
          abWall([0.088, 0.95, 0.072]),
          { ref: 'pelvis:pubic_tubercle', off: [0.004, 0.004, 0.006] },
        ],
        radius: 0.0042,
        tendon: [0.04, 0.35],
      },
      {
        name: '外腹斜筋（第7肋→白線下部）',
        path: [
          { bone: 'thorax', rest: [0.129, 1.22, 0.041] },
          abWall([0.096, 1.13, 0.063]),
          abWall([0.062, 1.05, 0.076]),
          abWall([0.006, 0.99, 0.084]),
        ],
        radius: 0.0045,
        tendon: [0.04, 0.45],
      },
      {
        name: '外腹斜筋（第5肋→白線上部）',
        path: [
          { bone: 'thorax', rest: [0.109, 1.287, 0.065] },
          abWall([0.077, 1.2, 0.083]),
          abWall([0.006, 1.12, 0.087]),
        ],
        radius: 0.0032,
        tendon: [0.04, 0.5],
        flat: { width: 0.032, normal: 'anterior' },
      },
      {
        name: '内腹斜筋（後部：腸骨稜→第11・12肋）',
        path: [
          { bone: 'pelvis', rest: [0.131, 1.068, -0.014] },
          abWall([0.12, 1.11, -0.004]),
          { bone: 'thorax', rest: [0.12, 1.138, -0.004] },
        ],
        radius: 0.0035,
        tendon: [0.04, 0.06],
        flat: { width: 0.034, normal: 'lateral' },
      },
      {
        name: '内腹斜筋（腸骨稜→白線）',
        path: [
          { bone: 'pelvis', rest: [0.13, 1.048, 0.032] },
          abWall([0.102, 1.1, 0.047]),
          abWall([0.006, 1.16, 0.084]),
        ],
        radius: 0.0048,
        tendon: [0.04, 0.45],
      },
      {
        name: '内腹斜筋（鼠径靱帯→恥骨稜）',
        path: [
          { bone: 'pelvis', rest: [0.121, 1.0, 0.045] },
          { bone: 'pelvis', rest: [0.072, 0.98, 0.071] },
          { ref: 'pelvis:pubic_crest', off: [0.006, 0.006, 0.008] },
        ],
        radius: 0.0032,
        tendon: [0.04, 0.35],
        flat: { width: 0.018, normal: 'anterior' },
      },
    ],
    // side bend + slight flexion to the same (right) side / side bend away and back with the arm overhead
    actionPose: {
      joints: {
        lumbar: { lat: 4, flex: 10 },
        thorax: { lat: 4, flex: 12 },
        shoulder: { flex: 22 },
        shoulder_R: { abd: 12 },
      },
    },
    stretchPose: {
      joints: {
        lumbar: { lat: -4, flex: -8 },
        thorax: { lat: -5, flex: -8 },
        shoulder_R: { abd: 165 },
        elbow_R: { flex: 20 },
        shoulder_L: { abd: 16, flex: -14 },
      },
    },
    camera: { dir: [-1, 0.2, 0.5] },
    focus: 'lowback',
  },

  // 腹横筋 — deepest layer: horizontal fibres from the inner costal cartilages 7–12, the thoracolumbar fascia
  // (lateral raphe), the anterior iliac crest and the lateral inguinal ligament, wrapping round the flank into the
  // linea alba (via the rectus sheath) and the pubic crest (conjoint tendon). Thin flat sheets.
  'transversus-abdominis': {
    id: 'transversus-abdominis',
    strands: [
      {
        name: '上部（肋軟骨内面→白線）',
        path: [
          { bone: 'thorax', rest: [0.103, 1.165, 0.055] },
          abWall([0.062, 1.172, 0.072]),
          lineaAlba(0.18),
        ],
        radius: 0.0025,
        tendon: [0.04, 0.45],
        flat: { width: 0.04, normal: 'anterior' },
      },
      {
        name: '中部（胸腰筋膜→白線）',
        path: [
          { bone: 'lumbar', rest: [0.098, 1.12, -0.058] },
          abWall([0.112, 1.12, -0.031]),
          abWall([0.116, 1.12, -0.005]),
          abWall([0.11, 1.12, 0.028]),
          abWall([0.092, 1.12, 0.051]),
          abWall([0.059, 1.12, 0.067]),
          lineaAlba(0.35),
        ],
        radius: 0.0025,
        tendon: [0.1, 0.38],
        flat: { width: 0.044, normal: 'lateral' },
      },
      {
        name: '中下部（胸腰筋膜→白線）',
        path: [
          abWall([0.1, 1.065, -0.055]),
          abWall([0.115, 1.065, -0.028]),
          abWall([0.118, 1.065, -0.004]),
          abWall([0.113, 1.065, 0.027]),
          abWall([0.094, 1.065, 0.049]),
          abWall([0.06, 1.065, 0.064]),
          lineaAlba(0.5),
        ],
        radius: 0.0025,
        tendon: [0.1, 0.38],
        flat: { width: 0.044, normal: 'lateral' },
      },
      {
        name: '下部（腸骨稜→白線）',
        path: [
          { bone: 'pelvis', rest: [0.126, 1.04, 0.03] },
          abWall([0.106, 1.01, 0.048]),
          abWall([0.067, 1.0, 0.064]),
          lineaAlba(0.7),
        ],
        radius: 0.0025,
        tendon: [0.04, 0.35],
        flat: { width: 0.04, normal: 'anterior' },
      },
      {
        name: '最下部（鼠径靱帯→恥骨稜）',
        path: [
          { bone: 'pelvis', rest: [0.097, 0.97, 0.067] },
          { bone: 'pelvis', rest: [0.06, 0.94, 0.074] },
          { ref: 'pelvis:pubic_crest', off: [0.0, 0.004, 0.004] },
        ],
        radius: 0.0022,
        tendon: [0.04, 0.35],
        flat: { width: 0.018, normal: 'anterior' },
      },
    ],
    // Its main action (drawing the abdominal wall in) has no skeletal motion in the rig, so the demo uses trunk
    // rotation to the same side, where its middle / lower fibres shorten together with the internal oblique;
    // the stretch is extension with rotation away and the arms overhead.
    actionPose: { joints: { lumbar: { rot: 12 }, thorax: { rot: 35 } } },
    stretchPose: {
      joints: { lumbar: { rot: -12, flex: -12 }, thorax: { rot: -30, flex: -14 }, shoulder: { flex: 165 } },
    },
    camera: { dir: [-1, 0.2, 0.5] },
    focus: 'lowback',
  },

  // ═══════════════════════════════════════ R2b — thigh muscles
  // Rest coordinates are lateral-positive [lat, y, z]. Femoral shaft axis ≈ (0.138, 0.88) → (0.096, 0.565), radius
  // ~1.4–1.7 cm; the mannequin's thigh skin is ~7 cm round it, so the bellies are kept 0.5–1 cm under the skin.
  // The quadriceps insert on the PATELLA (base / borders: the patella frame glides on the trochlea, so the common
  // tendon wraps the front of the femur in deep flexion by itself); the hamstrings cross behind the knee via points
  // on the femoral condyles (the pulley) and insert on the tibia / fibula.

  // 大腿直筋 — straight head from the AIIS + reflected head from the superior acetabular rim, joining in front of
  // the hip; fusiform belly down the middle of the front of the thigh → quadriceps tendon → base of the patella.
  // Two-joint: hip flexion + knee extension shorten it; hip extension + knee flexion (standing quad stretch) stretch it.
  'rectus-femoris': {
    id: 'rectus-femoris',
    strands: [
      {
        name: '直頭（下前腸骨棘）',
        path: [
          { ref: 'pelvis:aiis', off: [0.0, -0.006, 0.007] },
          { bone: 'femur', rest: [0.108, 0.87, 0.054] },
          { bone: 'femur', rest: [0.102, 0.74, 0.05] },
          { bone: 'femur', rest: [0.094, 0.625, 0.044] },
          { ref: 'patella:base', off: [0.0, 0.002, 0.004] },
        ],
        radius: 0.017,
        tendon: [0.1, 0.2],
      },
      {
        name: '反転頭（寛骨臼上縁）',
        path: [
          { ref: 'pelvis:acetabulum_rim_sup', off: [0.002, 0.004, 0.002] },
          { bone: 'pelvis', rest: [0.108, 0.942, 0.04] },
          { bone: 'femur', rest: [0.107, 0.87, 0.05] },
          { bone: 'femur', rest: [0.101, 0.74, 0.046] },
          { bone: 'femur', rest: [0.094, 0.625, 0.042] },
          { ref: 'patella:base', off: [0.0, 0.002, 0.002] },
        ],
        radius: 0.008,
        tendon: [0.12, 0.2],
      },
    ],
    // kick forward: hip flexion with the knee straight / standing quad stretch (heel to buttock, thigh behind vertical,
    // right hand holding the instep — arm angles from the K3 quad-stretch clip)
    actionPose: { joints: { hip_R: { flex: 50 }, knee_R: { flex: 0 } } },
    stretchPose: {
      joints: {
        hip_R: { flex: -8, abd: -5 },
        knee_R: { flex: 142 },
        ankle_R: { dorsi: -25 },
        scapula_R: { elev: -10 },
        shoulder_R: { flex: -24.2, abd: -6.7, rot: -49.8 },
        elbow_R: { flex: -5 },
        forearm_R: { sup: -76.3 },
        wrist_R: { flex: 37.4 },
      },
    },
    // right side, slightly anterior: hip → knee with the swinging shank (kick forward / heel to buttock) in view
    camera: { position: [-1.76, 0.86, 0.66], target: [-0.1, 0.66, 0.16] },
    focus: 'knee',
  },

  // 外側広筋 — the largest head: from the upper intertrochanteric line, the anterior / inferior border of the greater
  // trochanter, the lateral lip of the gluteal tuberosity and of the linea aspera (it wraps the lateral femur from
  // behind) → quadriceps tendon at the superolateral patella (the lowest, oblique fibres to the lateral border).
  // Flat bands (facing laterally) between the femur and the ITB.
  'vastus-lateralis': {
    id: 'vastus-lateralis',
    strands: [
      {
        name: '上部（大転子・転子間線）',
        path: [
          { ref: 'femur:greater_trochanter_ant', off: [-0.004, -0.022, 0.004] },
          { bone: 'femur', rest: [0.149, 0.8, 0.024] },
          { bone: 'femur', rest: [0.138, 0.69, 0.034] },
          { bone: 'femur', rest: [0.116, 0.6, 0.043] },
          { ref: 'patella:base', off: [0.011, 0.001, -0.004] },
        ],
        radius: 0.008,
        tendon: [0.03, 0.2],
        flat: { width: 0.03, normal: 'lateral' },
      },
      {
        name: '中部（殿筋粗面外側）',
        path: [
          { ref: 'femur:gluteal_tuberosity', off: [0.006, -0.012, 0.004] },
          { bone: 'femur', rest: [0.153, 0.74, 0.004] },
          { bone: 'femur', rest: [0.145, 0.65, 0.016] },
          { bone: 'femur', rest: [0.127, 0.585, 0.032] },
          { ref: 'patella:lateral', off: [0.0, 0.015, -0.004] },
        ],
        radius: 0.0095,
        tendon: [0.02, 0.14],
        flat: { width: 0.034, normal: 'lateral' },
      },
      {
        name: '下部（粗線外側唇・斜走線維）',
        path: [
          { ref: 'femur:linea_aspera_mid', off: [0.012, 0.04, 0.0] },
          { bone: 'femur', rest: [0.138, 0.68, -0.008] },
          { bone: 'femur', rest: [0.136, 0.61, 0.01] },
          { bone: 'femur', rest: [0.124, 0.56, 0.029] },
          { ref: 'patella:lateral', off: [0.002, 0.003, -0.002] },
        ],
        radius: 0.009,
        tendon: [0.02, 0.1],
        flat: { width: 0.03, normal: 'lateral' },
      },
    ],
    // seated (knees 90°): leg extension — straighten the knee / bend it further, the foot drawn back under the seat.
    // One-joint muscle: in anatomical position (knee straight) it is already at its shortest, so the demo starts
    // from the seated knee angle (rest ≈ 1.2 × L0) and the action returns it to L0.
    base: 'SIT_CHAIR',
    actionPose: { joints: { knee_R: { flex: 0 } } },
    stretchPose: { joints: { knee_R: { flex: 125 }, ankle_R: { dorsi: 10 } } },
    // from the right side, a little below the forearms: thigh + the swinging shank (seat edge → foot) in view
    camera: { position: [-1.55, 0.5, 0.64], target: [-0.12, 0.43, 0.42] },
    focus: 'knee',
  },

  // 内側広筋 — from the lower intertrochanteric line, the spiral line / medial lip of the linea aspera and the medial
  // intermuscular septum; its lowest fibres (VMO) arise from the adductor magnus tendon and run obliquely (~50°) to
  // the upper medial border of the patella, forming the teardrop bulge above the inner knee.
  'vastus-medialis': {
    id: 'vastus-medialis',
    strands: [
      {
        name: '長頭（転子間線下部）',
        path: [
          { ref: 'femur:intertrochanteric_line', off: [-0.02, -0.022, -0.004] },
          { bone: 'femur', rest: [0.09, 0.78, 0.034] },
          { bone: 'femur', rest: [0.078, 0.68, 0.036] },
          { bone: 'femur', rest: [0.074, 0.6, 0.04] },
          { ref: 'patella:base', off: [-0.011, 0.001, -0.004] },
        ],
        radius: 0.0105,
        tendon: [0.03, 0.15],
        flat: { width: 0.032, normal: 'anterior' },
      },
      {
        name: '中部（粗線内側唇）',
        path: [
          { ref: 'femur:linea_aspera_mid', off: [-0.012, 0.03, 0.002] },
          { bone: 'femur', rest: [0.08, 0.68, -0.008] },
          { bone: 'femur', rest: [0.068, 0.62, 0.012] },
          { bone: 'femur', rest: [0.07, 0.575, 0.034] },
          { ref: 'patella:medial', off: [0.0, 0.016, -0.004] },
        ],
        radius: 0.013,
        tendon: [0.02, 0.08],
      },
      {
        name: '斜頭 VMO（大内転筋腱）',
        path: [
          { bone: 'femur', rest: [0.056, 0.615, -0.016] },
          { bone: 'femur', rest: [0.05, 0.59, 0.006] },
          { bone: 'femur', rest: [0.058, 0.562, 0.03] },
          { ref: 'patella:medial', off: [-0.002, 0.006, 0.0] },
        ],
        radius: 0.0115,
        tendon: [0.03, 0.08],
      },
      {
        name: '斜頭 VMO 下部',
        path: [
          { bone: 'femur', rest: [0.054, 0.588, -0.014] },
          { bone: 'femur', rest: [0.05, 0.566, 0.01] },
          { bone: 'femur', rest: [0.058, 0.545, 0.032] },
          { ref: 'patella:medial', off: [-0.002, -0.005, 0.0] },
        ],
        radius: 0.009,
        tendon: [0.03, 0.1],
      },
    ],
    // seated leg extension, as for the vastus lateralis
    base: 'SIT_CHAIR',
    actionPose: { joints: { knee_R: { flex: 0 } } },
    stretchPose: { joints: { knee_R: { flex: 125 }, ankle_R: { dorsi: 10 } } },
    camera: { dir: [0.15, 1, 0.3] },
    focus: 'knee',
  },

  // 大腿二頭筋 — long head from the ischial tuberosity (common tendon with semitendinosus), down and out across the
  // back of the thigh; short head from the lower half of the lateral lip of the linea aspera. Both join a round tendon
  // that passes behind the lateral femoral condyle to the head of the fibula. Long head: hip extension + knee
  // flexion; short head: knee flexion only (so the hip-flexion stretch does not lengthen it).
  'biceps-femoris': {
    id: 'biceps-femoris',
    strands: [
      {
        name: '長頭（坐骨結節）',
        path: [
          { ref: 'pelvis:ischial_tuberosity', off: [0.004, -0.01, -0.008] },
          { bone: 'femur', rest: [0.108, 0.66, -0.04] },
          { bone: 'femur', rest: [0.114, 0.585, -0.034] },
          // behind the lateral femoral condyle (posterolateral corner of the popliteal fossa)
          { mix: [{ bone: 'femur', rest: [0.106, 0.511, -0.0405] }, { bone: 'tibia', rest: [0.106, 0.511, -0.0405] }], t: 0.5 },
          { ref: 'tibia:fibular_head', off: [0.002, 0.0095, -0.001] },
        ],
        radius: 0.012,
        tendon: [0.12, 0.25],
      },
      {
        name: '短頭（粗線外側唇）',
        path: [
          { ref: 'femur:linea_aspera_mid', off: [0.01, -0.035, -0.002] },
          { bone: 'femur', rest: [0.12, 0.6, -0.027] },
          { bone: 'femur', rest: [0.113, 0.548, -0.029] },
          { mix: [{ bone: 'femur', rest: [0.108, 0.512, -0.039] }, { bone: 'tibia', rest: [0.108, 0.512, -0.039] }], t: 0.5 },
          { ref: 'tibia:fibular_head', off: [0.003, 0.009, 0.001] },
        ],
        radius: 0.0095,
        tendon: [0.03, 0.33],
      },
    ],
    // standing leg curl with the thigh drawn back / straight leg raised forward (= the supine towel stretch's angles)
    actionPose: { joints: { hip_R: { flex: -20 }, knee_R: { flex: 90 } } },
    stretchPose: { joints: { hip_R: { flex: 55 }, knee_R: { flex: 0 }, ankle_R: { dorsi: 10 } } },
    camera: { dir: [-1, 0.15, -0.55] },
    focus: 'knee',
  },

  // 半腱様筋 — from the ischial tuberosity (common tendon with the biceps long head); fusiform belly in the upper half,
  // long round tendon in the lower half behind the medial femoral condyle, curving forward under the medial tibial
  // condyle to the pes anserinus (below / behind the gracilis).
  semitendinosus: {
    id: 'semitendinosus',
    strands: [
      {
        path: [
          { ref: 'pelvis:ischial_tuberosity', off: [-0.002, -0.012, -0.008] },
          { bone: 'femur', rest: [0.066, 0.66, -0.042] },
          { bone: 'femur', rest: [0.067, 0.57, -0.038] },
          // behind the medial femoral condyle, down the posteromedial tibia, then forward under the medial condyle
          { mix: [{ bone: 'femur', rest: [0.0735, 0.509, -0.041] }, { bone: 'tibia', rest: [0.0735, 0.509, -0.041] }], t: 0.5 },
          { bone: 'tibia', rest: [0.058, 0.458, -0.03] },
          { bone: 'tibia', rest: [0.058, 0.435, -0.006] },
          { ref: 'tibia:pes_anserinus', off: [0.003, -0.014, -0.008] },
        ],
        radius: 0.0115,
        tendon: [0.05, 0.42],
      },
    ],
    actionPose: { joints: { hip_R: { flex: -20 }, knee_R: { flex: 90 } } },
    stretchPose: { joints: { hip_R: { flex: 55 }, knee_R: { flex: 0 }, ankle_R: { dorsi: 10 } } },
    camera: { dir: [-0.6, 0.15, -1] },
    focus: 'knee',
  },

  // 半膜様筋 — deep to the semitendinosus: a flat, membranous tendon from the superolateral facet of the ischial
  // tuberosity runs down the medial back of the thigh; the broad belly lies in the lower half and its tendon inserts
  // on the back of the medial tibial condyle (+ expansions to the oblique popliteal ligament / medial meniscus).
  semimembranosus: {
    id: 'semimembranosus',
    strands: [
      {
        path: [
          { ref: 'pelvis:ischial_tuberosity', off: [0.008, 0.006, -0.004] },
          { bone: 'femur', rest: [0.072, 0.64, -0.034] },
          { bone: 'femur', rest: [0.07, 0.56, -0.032] },
          { mix: [{ bone: 'femur', rest: [0.0705, 0.51, -0.0385] }, { bone: 'tibia', rest: [0.0705, 0.51, -0.0385] }], t: 0.5 },
          { ref: 'tibia:medial_condyle_post', off: [0.0, -0.002, 0.002] },
        ],
        radius: 0.011,
        tendon: [0.34, 0.17],
        flat: { width: 0.03, normal: 'posterior' },
      },
    ],
    actionPose: { joints: { hip_R: { flex: -20 }, knee_R: { flex: 90 } } },
    stretchPose: { joints: { hip_R: { flex: 55 }, knee_R: { flex: 0 }, ankle_R: { dorsi: 10 } } },
    camera: { dir: [-0.6, 0.15, -1] },
    focus: 'knee',
  },
};

export const structures: Partial<Record<StructureId, StructureRig>> = {
  // ═══════════════════════════════════════ R2a — spine structures
  // 頸椎 — the seven cervical vertebrae, shown in the riding position (its description is about the bike posture:
  // lower neck flexed, upper neck strongly extended); glow on the posterior facet joints that take the load.
  'cervical-spine': {
    id: 'cervical-spine',
    parts: [
      { type: 'bone', parts: ['cervical'] },
      { type: 'spot', at: { bone: 'neck', rest: [0.017, 1.548, -0.026] }, radius: 0.0075 },
      { type: 'spot', at: { bone: 'neck', rest: [0.019, 1.488, -0.034] }, radius: 0.0075 },
    ],
    labelAt: { bone: 'neck', rest: [0.0, 1.515, -0.05] },
    base: 'BIKE',
    camera: { dir: [-1, 0.15, 0.25] },
    focus: 'neck',
  },
  // 胸椎 — the twelve thoracic vertebrae (bone tint; framed with an explicit camera because a tint has no points).
  'thoracic-spine': {
    id: 'thoracic-spine',
    parts: [{ type: 'bone', parts: ['thoracic'] }],
    labelAt: { bone: 'thorax', rest: [0.0, 1.31, -0.13] },
    camera: { position: [-0.62, 1.42, -0.62], target: [0, 1.31, -0.07] },
  },
  // 腰椎 — the five lumbar vertebrae (tint) + glow on the lower facet joints (L4/5, L5/S1) that extension and
  // fatigue irritate.
  'lumbar-spine': {
    id: 'lumbar-spine',
    parts: [
      { type: 'bone', parts: ['lumbar'] },
      { type: 'spot', at: { bone: 'lumbar', rest: [0.019, 1.042, -0.066] }, radius: 0.0075 },
      { type: 'spot', at: { bone: 'lumbar', rest: [0.021, 1.015, -0.069] }, radius: 0.0075 },
    ],
    labelAt: { bone: 'lumbar', rest: [0.0, 1.085, -0.1] },
    camera: { position: [-0.48, 1.2, -0.52], target: [0, 1.07, -0.06] },
  },
  // 椎間板 — the lumbar discs: the two lowest (L4/5, L5/S1), where most problems sit, are outlined by their annulus
  // fibrosus (a ring round the disc, coloured by role); the other lumbar discs are tinted.
  'intervertebral-disc': {
    id: 'intervertebral-disc',
    parts: [
      {
        type: 'ligament',
        path: [
          { bone: 'lumbar', rest: [0, 1.042, -0.0555] },
          { bone: 'lumbar', rest: [0.0159, 1.042, -0.0489] },
          { bone: 'lumbar', rest: [0.0225, 1.042, -0.0330] },
          { bone: 'lumbar', rest: [0.0159, 1.042, -0.0171] },
          { bone: 'lumbar', rest: [0, 1.042, -0.0105] },
        ],
        radius: 0.0032,
      },
      {
        type: 'ligament',
        path: [
          { bone: 'lumbar_L', rest: [0, 1.042, -0.0105] },
          { bone: 'lumbar_L', rest: [0.0159, 1.042, -0.0171] },
          { bone: 'lumbar_L', rest: [0.0225, 1.042, -0.0330] },
          { bone: 'lumbar_L', rest: [0.0159, 1.042, -0.0489] },
          { bone: 'lumbar_L', rest: [0, 1.042, -0.0555] },
        ],
        radius: 0.0032,
      },
      {
        type: 'ligament',
        path: [
          { bone: 'lumbar', rest: [0, 1.015, -0.0625] },
          { bone: 'lumbar', rest: [0.0159, 1.015, -0.0559] },
          { bone: 'lumbar', rest: [0.0225, 1.015, -0.0400] },
          { bone: 'lumbar', rest: [0.0159, 1.015, -0.0241] },
          { bone: 'lumbar', rest: [0, 1.015, -0.0175] },
        ],
        radius: 0.0032,
      },
      {
        type: 'ligament',
        path: [
          { bone: 'lumbar_L', rest: [0, 1.015, -0.0175] },
          { bone: 'lumbar_L', rest: [0.0159, 1.015, -0.0241] },
          { bone: 'lumbar_L', rest: [0.0225, 1.015, -0.0400] },
          { bone: 'lumbar_L', rest: [0.0159, 1.015, -0.0559] },
          { bone: 'lumbar_L', rest: [0, 1.015, -0.0625] },
        ],
        radius: 0.0032,
      },
      { type: 'bone', parts: ['discs'] },
    ],
    labelAt: { bone: 'lumbar', rest: [0.0, 1.03, -0.01] },
    // close view from the front-right (no abdominal organs in the model, so the discs show between the bodies)
    camera: { position: [-0.34, 1.13, 0.56], target: [0, 1.05, -0.03] },
  },
  // 仙腸関節 — the joint between the sacrum and the ilium (auricular surfaces), seen from behind: glow along the
  // joint line + the joint cushion.
  'sacroiliac-joint': {
    id: 'sacroiliac-joint',
    parts: [
      { type: 'spot', at: { bone: 'pelvis', rest: [0.045, 0.99, -0.078] }, radius: 0.009 },
      { type: 'spot', at: { bone: 'pelvis', rest: [0.04, 0.955, -0.08] }, radius: 0.008 },
      { type: 'cartilage', at: { bone: 'pelvis', rest: [0.043, 0.975, -0.072] }, radii: [0.003, 0.03, 0.012] },
    ],
    labelAt: { bone: 'pelvis', rest: [0.045, 0.975, -0.085] },
    camera: { position: [-0.3, 1.2, -0.75], target: [-0.03, 0.99, -0.08] },
  },
  // 胸腰筋膜 — posterior layer over the lumbar erector spinae, both halves: from the sacrum / posterior iliac crest
  // up to the lower ribs (T12), with the lateral raphe at its outer edge.
  'thoracolumbar-fascia': {
    id: 'thoracolumbar-fascia',
    parts: [
      {
        type: 'fascia',
        path: [
          { bone: 'pelvis', rest: [0.024, 0.95, -0.1155] },
          { bone: 'pelvis', rest: [0.025, 1.0, -0.1025] },
          { bone: 'lumbar', rest: [0.025, 1.05, -0.0935] },
          { bone: 'lumbar', rest: [0.025, 1.1, -0.0955] },
          { bone: 'lumbar', rest: [0.025, 1.15, -0.1035] },
          { bone: 'thorax', rest: [0.025, 1.2, -0.1135] },
        ],
        radius: 0.0015,
        flat: { width: 0.046, normal: 'posterior' },
      },
      {
        type: 'fascia',
        path: [
          { bone: 'pelvis', rest: [0.068, 1.0, -0.0965] },
          { bone: 'lumbar', rest: [0.07, 1.05, -0.0875] },
          { bone: 'lumbar', rest: [0.07, 1.1, -0.0855] },
          { bone: 'lumbar', rest: [0.07, 1.15, -0.0945] },
          { bone: 'thorax', rest: [0.068, 1.19, -0.103] },
        ],
        radius: 0.0015,
        flat: { width: 0.046, normal: 'posterior' },
      },
      {
        type: 'fascia',
        path: [
          { bone: 'pelvis_L', rest: [0.024, 0.95, -0.1155] },
          { bone: 'pelvis_L', rest: [0.025, 1.0, -0.1025] },
          { bone: 'lumbar_L', rest: [0.025, 1.05, -0.0935] },
          { bone: 'lumbar_L', rest: [0.025, 1.1, -0.0955] },
          { bone: 'lumbar_L', rest: [0.025, 1.15, -0.1035] },
          { bone: 'thorax_L', rest: [0.025, 1.2, -0.1135] },
        ],
        radius: 0.0015,
        flat: { width: 0.046, normal: 'posterior' },
      },
      {
        type: 'fascia',
        path: [
          { bone: 'pelvis_L', rest: [0.068, 1.0, -0.0965] },
          { bone: 'lumbar_L', rest: [0.07, 1.05, -0.0875] },
          { bone: 'lumbar_L', rest: [0.07, 1.1, -0.0855] },
          { bone: 'lumbar_L', rest: [0.07, 1.15, -0.0945] },
          { bone: 'thorax_L', rest: [0.068, 1.19, -0.103] },
        ],
        radius: 0.0015,
        flat: { width: 0.046, normal: 'posterior' },
      },
    ],
    labelAt: { bone: 'lumbar', rest: [0.045, 1.08, -0.095] },
    camera: 'back',
    focus: 'lowback',
  },
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
