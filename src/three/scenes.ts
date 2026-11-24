// Teaching scenes for highlights mode (condition & region pages): which posture, camera and crop show an injury
// best, which superficial parts turn translucent, which context parts stay out of the framing / go into 「+N」.
//
// Used when `<AnatomyViewer highlights condition=…>` (condition page) or `highlights` + `focus` without a condition
// (region page). Exercise and muscle pages never use them. Values were tried in the harness: see docs/ENGINE.md
// § Condition & region scenes.
import type { ConditionId, RegionId } from '../data/registry';
import type { Highlight3DRole } from './contract';
import type { PartId } from './anatomy';
import type { AttachRef } from './landmarks';
import type { BasePoseName, CameraPresetName, Pose } from './rig';
import { REGION_POINTS } from './camera';

export interface Scene3D {
  /** base pose (default: the injured structure rig's base, else STAND) */
  base?: BasePoseName;
  /** joint changes on top of the base: the posture the condition is about (flexed knee, adducted hip, bike…) */
  joints?: Pose['joints'];
  /** preset or auto-fitted direction (target → camera). 'rig' = the injured structure rig's own camera, kept as
   *  authored (its exact close-ups were made for condition pages). Muscle-demo cameras are never used here. */
  camera?: CameraPresetName | { dir: [number, number, number] } | 'rig';
  /** body points that define the crop (right side unless suffixed _L). Highlighted context parts do NOT widen the
   *  frame: they may run off the card (their label then sits on a visible bit of them, or goes into 「+N」). */
  frame?: AttachRef[];
  /** also frame the injured parts themselves (default: true without `frame`, false with it) */
  frameInjured?: boolean;
  /** minimum size of the framed box (m) */
  minSize?: number;
  /** draw these parts on both sides (central / bilateral problems) */
  both?: PartId[];
  /** translucent parts (opacity) — superficial tissue that would hide the injured part */
  fade?: Partial<Record<PartId, number>>;
  /** role overrides for this scene (e.g. a nerve the text says is only rarely irritated) */
  roles?: Partial<Record<PartId, Highlight3DRole>>;
  /** context parts whose labels start collapsed in 「+N」 */
  minor?: PartId[];
}

const THIGH_PULL_LEFT_LEG: Pose['joints'] = { hip_L: { flex: 25 }, knee_L: { flex: 30 } };

export const CONDITION_SCENES: Partial<Record<ConditionId, Scene3D>> = {
  // ── shoulder / neck
  'swimmers-shoulder': {
    // arm raised to 60°: the supraspinatus runs from its fossa under the acromion to the greater tubercle
    base: 'STAND',
    joints: { shoulder_R: { abd: 60 } },
    camera: { dir: [-0.8, 0.55, -0.3] },
    frame: ['scapula:acromion', 'humerus:head', 'scapula:supraspinous_fossa', 'humerus:greater_tubercle_sup', 'scapula:spine_medial', 'scapula:coracoid'],
    minSize: 0.26,
    fade: { trapezius: 0.2, 'latissimus-dorsi': 0.2, 'serratus-anterior': 0.2 },
    minor: ['latissimus-dorsi', 'thoracic-spine', 'serratus-anterior'],
  },
  'biceps-tendinopathy': {
    camera: 'rig',
    // a little external rotation opens the bicipital groove toward the camera
    joints: { shoulder_R: { rot: 20 } },
  },
  'scapular-dyskinesis': {
    // right arm raised, left arm down for comparison: the scapula's upward rotation is the point
    base: 'STAND',
    joints: { shoulder_R: { flex: 120 } },
    camera: { dir: [0, 0.3, -1] },
    frame: [
      'scapula:superior_angle',
      'scapula:inferior_angle',
      'scapula:acromion',
      'scapula_L:superior_angle',
      'scapula_L:inferior_angle',
      'scapula_L:acromion',
      'thorax:spinous_T2',
      'thorax:spinous_T9',
    ],
    minSize: 0.3,
    fade: { trapezius: 0.2 },
    minor: ['pectoralis-minor', 'thoracic-spine'],
  },
  'cyclist-neck-pain': {
    base: 'BIKE',
    camera: { dir: [-1, 0.15, 0.05] },
    frame: ['head:occiput', 'head:chin', 'neck:spinous_C2', 'neck:spinous_C7', 'thorax:spinous_T3', 'scapula:superior_angle', 'thorax:clavicle_notch'],
    minSize: 0.3,
    both: ['trapezius', 'levator-scapulae'],
    minor: ['pectoralis-minor', 'thoracic-spine'],
  },

  // ── hip
  'gluteal-tendinopathy': {
    // adduction presses the ITB onto the tendons at the greater trochanter
    base: 'STAND',
    joints: { hip_R: { abd: -12 }, hip_L: { abd: 6 }, shoulder_R: { flex: 20 } },
    camera: { dir: [-1, 0.12, -0.12] },
    frame: ['femur:greater_trochanter', 'pelvis:iliac_crest_mid', 'femur:shaft_lat_prox', 'pelvis:asis', 'pelvis:psis', 'femur:gluteal_tuberosity'],
    minSize: 0.3,
    fade: { 'iliotibial-band': 0.3 },
  },
  'hip-flexor-pain': {
    // slight hip extension: the iliopsoas under stretch
    base: 'STAND',
    joints: { hip_R: { flex: -12 } },
    camera: { dir: [-0.45, 0.15, 1] },
    frame: ['pelvis:asis', 'pelvis:asis_L', 'femur:lesser_trochanter', 'lumbar:body_L1', 'pelvis:pubic_symphysis', 'femur:shaft_ant_mid'],
    minSize: 0.3,
  },
  'deep-gluteal-syndrome': {
    // gluteus maximus see-through: the sciatic nerve leaving below the piriformis
    base: 'STAND',
    camera: { dir: [-0.45, 0.3, -1] },
    frame: [
      'pelvis:sacrum_post',
      'pelvis:greater_sciatic_notch',
      'femur:greater_trochanter',
      'pelvis:ischial_tuberosity',
      'pelvis:iliac_crest_post',
      'pelvis:iliac_crest_mid',
      'femur:linea_aspera_prox',
    ],
    minSize: 0.3,
    fade: { 'gluteus-maximus': 0.22 },
  },
  'proximal-hamstring-tendinopathy': {
    // hip flexion wraps the tendon around the ischial tuberosity (compression)
    base: 'STAND',
    joints: { hip_R: { flex: 35 } },
    camera: { dir: [-0.7, 0.05, -1] },
    frame: ['pelvis:ischial_tuberosity', 'pelvis:coccyx', 'femur:greater_trochanter', 'femur:linea_aspera_mid', 'pelvis:psis'],
    minSize: 0.3,
    fade: { 'gluteus-maximus': 0.22 },
    // the text: the nerve is irritated only rarely — amber, so the tendon and its bony origin carry the red
    roles: { 'sciatic-nerve': 'involved' },
  },
  'adductor-groin-pain': {
    base: 'STAND',
    joints: { hip_R: { abd: 12 }, hip_L: { abd: 8 } },
    camera: { dir: [0.3, 0.12, 1] },
    frame: ['pelvis:pubic_symphysis', 'pelvis:pubic_tubercle', 'pelvis:pubic_crest', 'pelvis:asis', 'pelvis:asis_L', 'femur:linea_aspera_mid', 'femur:adductor_tubercle'],
    minSize: 0.3,
  },

  // ── knee
  'patellofemoral-pain': {
    // seated, knee bent (rig base SIT_CHAIR + its anterolateral close-up); the hand lifted off the thigh
    camera: 'rig',
    joints: { shoulder_R: { abd: 18 }, elbow_R: { flex: 15 } },
    minor: ['gluteus-medius', 'gluteus-maximus'],
  },
  'itb-syndrome': {
    // 20–30° knee flexion: the band rubs over the lateral femoral epicondyle (impingement zone)
    base: 'STAND',
    joints: { hip_R: { flex: 20 }, knee_R: { flex: 30 } },
    camera: { dir: [-1, 0.12, 0.12] },
    frame: ['femur:lateral_epicondyle', 'tibia:gerdy_tubercle', 'femur:linea_aspera_dist', 'patella:center', 'tibia:fibular_head', 'femur:shaft_ant_mid'],
    minSize: 0.22,
    fade: { 'iliotibial-band': 0.35 },
    minor: ['tensor-fasciae-latae', 'gluteus-medius', 'gluteus-maximus'],
  },
  'patellar-tendinopathy': { camera: 'rig' },
  'pes-anserine-pain': {
    camera: 'rig',
    // the left knee out of the foreground of the medial view
    joints: { hip_L: { abd: 15 } },
  },

  // ── calf / shin
  'calf-strain': {
    // posteromedial: the medial head (tennis leg); left leg forward out of the view
    base: 'STAND',
    joints: { hip_L: { flex: 20 }, knee_L: { flex: 25 } },
    camera: { dir: [0.9, 0.2, -0.6] },
    frame: ['femur:medial_condyle_post', 'tibia:medial_condyle', 'tibia:fibular_head', 'tibia:medial_malleolus', 'foot:calcaneus_post'],
    minSize: 0.3,
  },
  mtss: { camera: 'rig' },
  'tibial-stress-fracture': {
    base: 'STAND',
    joints: { hip_L: { flex: 20 }, knee_L: { flex: 20 } },
    camera: { dir: [0.75, 0.2, -0.6] },
    frame: ['tibia:medial_border_mid', 'tibia:medial_border_dist', 'tibia:medial_malleolus', 'tibia:posterior_prox', 'tibia:medial_condyle'],
    minSize: 0.3,
    // one point of bone is the message (vs the diffuse strip of shin splints): the irritated periosteum strip in amber
    // so the fracture spot is the only red
    roles: { 'medial-tibial-border': 'involved' },
  },
  'muscle-cramps': {
    // the cramp position: calf short, foot pointed
    base: 'STAND',
    joints: { ankle_R: { dorsi: -35 }, toes_R: { ext: -15 }, knee_R: { flex: 10 }, hip_R: { flex: 10 } },
    camera: { dir: [0.45, 0.2, -1] },
    frame: ['femur:medial_condyle_post', 'femur:lateral_condyle_post', 'tibia:fibular_head', 'tibia:medial_malleolus', 'foot:calcaneus_post', 'toes:toe_tips'],
    minSize: 0.3,
    minor: ['biceps-femoris'],
  },

  // ── ankle / foot
  'achilles-midportion': { camera: 'rig' },
  'achilles-insertional': {
    // dorsiflexion presses the tendon onto the bursa and the heel bone (lateral view; the bursa shows through)
    base: 'STAND',
    joints: { ankle_R: { dorsi: 15 }, knee_R: { flex: 15 } },
    camera: { dir: [-1, 0.15, -0.35] },
    frame: ['foot:calcaneus_post', 'foot:calcaneus_post_sup', 'tibia:lateral_malleolus', 'foot:calcaneus_plantar', 'tibia:distal_post'],
    minSize: 0.16,
  },
  'ankle-sprain': {
    // the injury position: inversion + plantarflexion, foot off the floor
    base: 'STAND',
    joints: { ankle_R: { inv: 25, dorsi: -20 }, knee_R: { flex: 25 }, hip_R: { flex: 15 } },
    camera: { dir: [-0.9, 0.35, 0.45] },
    frame: ['tibia:lateral_malleolus', 'foot:talus_neck_lat', 'foot:calcaneus_lat', 'foot:fifth_met_base', 'foot:calcaneus_post'],
    minSize: 0.13,
  },
  'posterior-tibial-tendinopathy': {
    base: 'STAND',
    joints: { hip_L: { flex: 28 }, knee_L: { flex: 35 } },
    camera: { dir: [1, 0.3, -0.25] },
    frame: ['tibia:retro_medial_malleolus', 'foot:navicular_tuberosity', 'tibia:medial_malleolus', 'foot:calcaneus_post', 'tibia:medial_border_dist', 'foot:medial_cuneiform_plantar'],
    minSize: 0.2,
  },
  'peroneal-tendinopathy': { camera: 'rig' },
  'plantar-heel-pain': {
    // seated with the legs out, sole toward the viewer; toes slightly up (windlass)
    base: 'LONG_SIT',
    joints: { toes_R: { ext: 30 } },
    camera: { dir: [-0.25, 0.15, 1] },
    frame: ['foot:calcaneus_plantar', 'foot:calcaneus_plantar_medial', 'foot:met_head_1', 'foot:met_head_5', 'toes:toe_tips', 'foot:calcaneus_post'],
    minSize: 0.26,
    minor: ['gastrocnemius', 'soleus'],
  },
  'metatarsal-stress-fracture': {
    // top of the foot, like the 2D 足の甲 view
    base: 'STAND',
    camera: { dir: [-0.25, 1, 0.45] },
    frame: ['foot:calcaneus_post', 'foot:met_head_1', 'foot:met_head_5', 'toes:toe_tips', 'tibia:medial_malleolus', 'tibia:lateral_malleolus'],
    minSize: 0.26,
  },
  'mortons-neuroma': {
    // toe extension squeezes the nerve between the metatarsal heads
    base: 'LONG_SIT',
    joints: { toes_R: { ext: 25 } },
    camera: { dir: [-0.15, 0.1, 1] },
    frame: ['foot:met_head_1', 'foot:met_head_5', 'toes:toe_tips', 'foot:interspace_3_4', 'foot:arch_mid'],
    minSize: 0.15,
  },

  // ── low back
  'low-back-pain': {
    base: 'STAND',
    camera: { dir: [-0.7, 0.25, -1] },
    frame: [
      'thorax:spinous_T10',
      'lumbar:spinous_L1',
      'lumbar:spinous_L5',
      'pelvis:iliac_crest_mid',
      'pelvis:iliac_crest_mid_L',
      'pelvis:sacrum_post',
      'pelvis:psis',
      'thorax:rib12_post',
    ],
    minSize: 0.4,
    both: ['erector-spinae', 'multifidus', 'quadratus-lumborum', 'thoracolumbar-fascia'],
    minor: ['iliopsoas', 'gluteus-maximus'],
  },
};

const region = (r: RegionId) => REGION_POINTS[r] as AttachRef[];

/** Region pages (key muscles, all 'involved'): framed on the region's landmarks only. */
export const REGION_SCENES: Record<RegionId, Scene3D> = {
  shoulder: { base: 'STAND', camera: 'iso', frame: region('shoulder') },
  neck: {
    base: 'STAND',
    camera: { dir: [-0.6, 0.3, -1] },
    frame: ['head:occiput', 'head:mastoid', 'neck:spinous_C2', 'neck:spinous_C7', 'thorax:spinous_T4', 'scapula:superior_angle', 'scapula_L:superior_angle', 'scapula:acromion'],
  },
  lowback: { base: 'STAND', camera: 'isoBack', frame: region('lowback') },
  hip: { base: 'STAND', camera: { dir: [-1, 0.28, -0.62] }, frame: region('hip'), minSize: 0.5 },
  knee: { base: 'STAND', camera: 'iso', frame: region('knee') },
  calf: { base: 'STAND', camera: 'isoBack', frame: region('calf'), minSize: 0.42 },
  ankle: { base: 'STAND', camera: 'iso', frame: region('ankle') },
  foot: {
    base: 'STAND',
    joints: THIGH_PULL_LEFT_LEG,
    camera: { dir: [1, 0.25, -0.1] },
    frame: ['foot:calcaneus_post', 'foot:met_head_1', 'toes:toe_tips', 'tibia:medial_malleolus', 'foot:calcaneus_plantar'],
  },
};
