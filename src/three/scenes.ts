// Teaching scenes for highlights mode (condition & region pages): which posture, camera and crop show an injury
// best, which superficial parts turn translucent, which context parts stay out of the framing / go into 「+N」.
//
// Used when `<AnatomyViewer highlights condition=…>` (condition page) or `highlights` + `focus` without a condition
// (region page). Exercise and muscle pages never use them. Values were tried in the harness: see docs/ENGINE.md
// § Condition & region scenes.
import type { ConditionId, PainSpotId, RegionId, StructureId } from '../data/registry';
import type { Highlight3DRole } from './contract';
import type { PartId, StructureOverride, ZoneSpec } from './anatomy';
import type { AttachRef } from './landmarks';
import type { BasePoseName, CameraPresetName, Pose } from './rig';
import { REGION_POINTS } from './camera';
import type { BonePartId } from './skeleton-parts';

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
  /** see-through bone pieces (`Figure.ghost`, opacity 0..1): a bone in front of the tissue the view is about (the
   *  patella over the patellofemoral cartilage). Bone part names as in skeleton-parts.ts (sided parts: the scene's
   *  side; midline parts: the one piece). A ghosted injured bone keeps its red tint (rim in the tint colour). */
  ghost?: Partial<Record<BonePartId, number>>;
  /** per-view overrides of structure rigs (a rig cannot vary by condition): `bones` = the bone pieces its `bone` part
   *  tints instead, `labelAt` = its label anchor. The `metatarsals` rig tints the stress-fracture rays 2–3; Morton's
   *  neuroma needs rays 3–4 around the nerve. */
  structures?: Partial<Record<StructureId, StructureOverride>>;
  /** role overrides for this scene (e.g. a nerve the text says is only rarely irritated) */
  roles?: Partial<Record<PartId, Highlight3DRole>>;
  /** context parts whose labels start collapsed in 「+N」 */
  minor?: PartId[];
  /** the injured part (or zone key) that carries the view's ONE pulse + halo. Default: the first zone, else the first
   *  injured part (content order: the condition page lists the 'injured' tissue first). The other injured parts are
   *  steady red (same hue, no halo). */
  primary?: PartId | string;
  /** non-damage condition (the content's anatomyNote says no tissue is damaged: low back, neck, cramps): the red
   *  marks where it hurts / cramps (the page's legend 「痛みやすい場所」), not a lesion — steady red, nothing pulses.
   *  Default: from the content (a condition with an anatomyNote), like the page's own legend. */
  sensitive?: boolean;
  /** lesion zones: where in a part the problem sits (the Achilles midportion vs its insertion). The zone is drawn
   *  injured red over that stretch, carries the part's label (`label`) and the pulse; the rest of the part takes
   *  `partRole` ('plain' = its own colour, default). */
  zones?: SceneZone[];
  /** central / bilateral problem drawn on both sides (low back, the neck on the bike): the page's `side` does not
   *  change the view. Every other scene is mirrored for `side: 'left'` (posture, crop, camera, props, parts on the left) */
  bilateral?: boolean;
  /** per pain-spot variants: when the user tapped this spot on the body map (`AnatomyViewerProps.spot`), these fields
   *  replace the scene's own (a camera / crop that shows that part of the problem: 水泳肩 from 肩の後ろ → the back of the
   *  shoulder). Spots that the default camera already shows have no entry. */
  spots?: Partial<Record<PainSpotId, SceneVariant>>;
  /** region scenes: the variant a learning guide's 3D block gets (highlights + focus without a condition, with
   *  'primary' parts — the guide's focus parts; region pages only use 'secondary' / 'selected'). The guide teaches a
   *  few parts at once (the hip's front, back and side muscles), where the region page shows all its key muscles. */
  teaching?: SceneVariant;
}

/** A per-spot variant of a scene: any scene field (they replace the scene's, shallowly). */
export type SceneVariant = Omit<Scene3D, 'spots' | 'bilateral' | 'teaching'>;

/** The scene for a view: the scene itself, or with the guide's teaching variant and / or the tapped spot's variant
 *  merged in (in that order). */
export function sceneFor(scene: Scene3D | undefined, spot?: PainSpotId, teaching = false): Scene3D | null {
  if (!scene) return null;
  const t = teaching ? scene.teaching : undefined;
  const v = spot ? scene.spots?.[spot] : undefined;
  return t || v ? { ...scene, ...t, ...v } : scene;
}

export interface SceneZone extends Omit<ZoneSpec, 'key'> {
  /** label shown for the part (replaces its name), e.g. 'アキレス腱の中央部' */
  label: string;
  /** how the rest of the part is drawn: its own colour ('plain', default), amber ('involved') or red ('injured') */
  partRole?: 'plain' | 'involved' | 'injured';
  key?: string;
}

const THIGH_PULL_LEFT_LEG: Pose['joints'] = { hip_L: { flex: 25 }, knee_L: { flex: 30 } };

export const CONDITION_SCENES: Partial<Record<ConditionId, Scene3D>> = {
  // ── shoulder / neck
  'swimmers-shoulder': {
    // arm raised to 65° (inside the painful arc): the supraspinatus tendon and the bursa are squeezed between the
    // humeral head and the acromion. Close-up from the front-lateral, a little above (like the biceps-tendinopathy
    // view): humeral head, acromion / clavicle and the red tendon + bursa in the space between them; the arm runs off
    // to the lower left. (It used to be an overhead view from behind: skull, spine and ribs filled the card and the
    // shoulder joint was hard to find.)
    base: 'STAND',
    joints: { shoulder_R: { abd: 65 } },
    camera: { dir: [-0.75, 0.45, 0.75] },
    frame: ['scapula:acromion', 'humerus:head', 'humerus:greater_tubercle_sup', 'scapula:supraspinous_fossa', 'scapula:coracoid', 'scapula:clavicle_mid'],
    minSize: 0.17,
    fade: { trapezius: 0.2, 'latissimus-dorsi': 0.2, 'serratus-anterior': 0.2 },
    minor: ['latissimus-dorsi', 'thoracic-spine', 'serratus-anterior'],
    spots: {
      // 肩の後ろ: the same posture from behind-lateral, a little above: the infraspinatus (amber) over the back of the
      // blade, the posterior capsule at the back of the humeral head, the red supraspinatus / bursa above them
      'shoulder-back': {
        camera: { dir: [-0.75, 0.2, -0.9] },
        frame: ['scapula:acromion', 'humerus:head', 'humerus:greater_tubercle_inf', 'scapula:infraspinous_fossa', 'scapula:lateral_border', 'scapula:infraglenoid_tubercle', 'scapula:spine_lateral'],
        minSize: 0.16,
      },
    },
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
    // fatigue / stiffness, nothing damaged (content's anatomyNote): steady red where it hurts, no pulse
    sensitive: true,
    // both sides of the neck are drawn (and the bike's drive side faces the camera): the same view for either side
    bilateral: true,
    spots: {
      // 肩甲骨の内側: the upper back from behind and above (the rider leans forward): the rhomboids between the blades
      // under the two red trapezii (the side view hides them behind the shoulder)
      'scapula-medial': {
        camera: { dir: [-0.4, 0.8, -0.6] },
        frame: ['neck:spinous_C5', 'thorax:spinous_T8', 'scapula:superior_angle', 'scapula:medial_border_mid', 'scapula:inferior_angle', 'scapula:acromion', 'scapula_L:medial_border_mid', 'scapula_L:superior_angle'],
      },
    },
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
    // (the sciatic nerve is amber from the content itself — role 'overloaded': the text says it is irritated only
    // rarely — so the 2D figure, the list and this view agree; the tendon and its bony origin carry the red)
  },
  'adductor-groin-pain': {
    base: 'STAND',
    joints: { hip_R: { abd: 12 }, hip_L: { abd: 8 } },
    camera: { dir: [0.3, 0.12, 1] },
    frame: ['pelvis:pubic_symphysis', 'pelvis:pubic_tubercle', 'pelvis:pubic_crest', 'pelvis:asis', 'pelvis:asis_L', 'femur:linea_aspera_mid', 'femur:adductor_tubercle'],
    minSize: 0.3,
  },
  'hip-impingement': {
    // the pinch direction (engine3d): seated, the right thigh drawn up past 90° (hip flexion 108°), a little across the
    // body and turned in (adduction 10°, internal rotation 18°) — putting on a sock, a low chair, the thigh near the
    // chest at the top of the pedal stroke — which brings the femoral neck to the front-upper rim of the socket.
    // Close-up from the right side, a little from the front: the red labrum ring around the femoral head with the neck
    // leaving it toward the front-upper rim, the iliopsoas crossing in front of the joint (amber), the chair and the
    // raised thigh for context. The gluteals (amber: weak) are see-through so they do not cover the joint; the right arm
    // hangs a little behind the hip (holding the seat edge it stood between the camera and the joint).
    base: 'SIT_CHAIR',
    joints: { hip_R: { flex: 108, abd: -10, rot: -18 }, knee_R: { flex: 100 }, shoulder_R: { flex: -20, abd: 14 } },
    camera: { dir: [-1, 0.12, 0.25] },
    frame: ['femur:head', 'pelvis:asis', 'pelvis:aiis', 'femur:greater_trochanter', 'femur:lesser_trochanter', 'pelvis:acetabulum_rim_ant', 'pelvis:acetabulum_rim_sup'],
    minSize: 0.24,
    fade: { 'gluteus-maximus': 0.15, 'gluteus-medius': 0.2, 'gluteus-minimus': 0.3 },
    spots: {
      // 股関節の前: the same posture from the front-lateral: the front of the joint, the iliopsoas over it, the labrum's
      // front part where the neck meets the rim
      'hip-front': { camera: { dir: [-0.45, 0.05, 1] } },
      // 鼠径部（内側）: from the front, framed down to the pubic symphysis: the iliopsoas running over the front of the
      // joint toward the inner groin (the lesser trochanter) — a straight front view is blocked by the raised knee
      'groin-inner': {
        camera: { dir: [-0.35, 0.02, 1] },
        frame: ['femur:head', 'pelvis:asis', 'pelvis:aiis', 'pelvis:pubic_symphysis', 'femur:lesser_trochanter', 'pelvis:acetabulum_rim_ant', 'femur:greater_trochanter'],
        minSize: 0.26,
      },
    },
  },

  // ── knee
  'patellofemoral-pain': {
    // seated, knee bent (rig base SIT_CHAIR: the more the knee bends under load, the higher the patellofemoral
    // pressure); the hand lifted off the thigh. Close-up of the knee from front-lateral, above: the quadriceps converge
    // on the patella, which is drawn see-through (red glass, rim in the injured red) so the amber patellofemoral
    // cartilage on its back — 「お皿の裏」 in the text — shows through it
    joints: { shoulder_R: { abd: 18 }, elbow_R: { flex: 15 } },
    camera: { dir: [-0.75, 0.4, 0.55] },
    frame: ['patella:center', 'patella:base', 'patella:apex', 'femur:trochlear_groove', 'femur:lateral_epicondyle', 'femur:medial_epicondyle', 'tibia:tibial_tuberosity'],
    minSize: 0.13,
    ghost: { patella: 0.5 },
    // the cartilage label on what shows through the glass (the back of the patella), not on the trochlea under the
    // quadriceps tendon (its rig anchor)
    structures: { 'patellofemoral-cartilage': { labelAt: { ref: 'patella:articular', off: [0, -0.01, 0] } } },
    minor: ['gluteus-medius', 'gluteus-maximus'],
  },
  'itb-syndrome': {
    // 20–30° knee flexion: the band rubs over the lateral femoral epicondyle (impingement zone)
    base: 'STAND',
    joints: { hip_R: { flex: 20 }, knee_R: { flex: 30 } },
    camera: { dir: [-1, 0.12, 0.12] },
    frame: ['femur:lateral_epicondyle', 'tibia:gerdy_tubercle', 'femur:linea_aspera_dist', 'patella:center', 'tibia:fibular_head', 'femur:shaft_ant_mid'],
    minSize: 0.22,
    // see-through over the epicondyle, but still amber (a faded involved structure keeps an amber glow, anatomy.ts):
    // the band rubbing over the bone is the other half of the message
    fade: { 'iliotibial-band': 0.45 },
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
    minSize: 0.26,
    // a strain tears a stretch of the muscle, not all of it (the content: 「筋肉全体が傷むわけではありません」). Two lesion
    // zones, one per type: the lower end of the medial head where it turns into the aponeurosis (tennis leg; arc
    // 0.36–0.52 of strand 0 = rest y ≈ 0.35 → 0.27, the end of its belly) carries the pulse; the soleus one (the
    // gradual runner's type: lower half, deep, just above the Achilles; arc 0.45–0.66 of the medial strand = rest
    // y ≈ 0.25 → 0.17) is steady red. The rest of both muscles in their own colour, see-through so the zones read
    zones: [
      { on: 'gastrocnemius', strand: 0, range: [0.36, 0.52], label: '腓腹筋 内側頭の下端' },
      { on: 'soleus', strand: 2, range: [0.45, 0.66], label: 'ヒラメ筋 下半分の奥' },
    ],
    fade: { gastrocnemius: 0.45, soleus: 0.6 },
  },
  mtss: { camera: 'rig' },
  'tibial-stress-fracture': {
    base: 'STAND',
    joints: { hip_L: { flex: 20 }, knee_L: { flex: 20 } },
    camera: { dir: [0.75, 0.2, -0.6] },
    frame: ['tibia:medial_border_mid', 'tibia:medial_border_dist', 'tibia:medial_malleolus', 'tibia:posterior_prox', 'tibia:medial_condyle'],
    minSize: 0.3,
    // one point of bone is the message (vs the diffuse strip of shin splints): the periosteum strip is amber (the
    // content's role 'overloaded', the same in 2D and the list) so the fracture spot is the only red
    // the tibia rig's spot (posteromedial, distal third: where most of these crack) is the pulsing lesion and carries
    // the label; the rest of the bone a steady light red
    zones: [{ on: 'tibia', label: '脛骨のひび', partRole: 'injured' }],
  },
  'muscle-cramps': {
    // the cramp position: calf short, foot pointed. The right leg is lifted (knee bent, which shortens the gastrocnemius
    // further) so the pointed toes stay off the floor: standing on them lifted the whole figure, the left foot floated
    base: 'STAND',
    joints: { ankle_R: { dorsi: -35 }, toes_R: { ext: -15 }, knee_R: { flex: 55 }, hip_R: { flex: 20 } },
    camera: { dir: [0.2, 0.25, -1] },
    frame: ['femur:medial_condyle_post', 'femur:lateral_condyle_post', 'tibia:fibular_head', 'tibia:medial_malleolus', 'foot:calcaneus_post', 'foot:met_head_1'],
    minSize: 0.24,
    minor: ['biceps-femoris'],
    // a cramp is a strong temporary contraction, the fibres are not damaged (content's anatomyNote): steady red marks the
    // muscle that cramps, no pulse
    sensitive: true,
  },

  // ── ankle / foot
  'achilles-midportion': {
    // close-up of the right heel cord from behind (slightly medial), the left leg forward out of the view: the whole
    // tendon from the calf muscles down to the heel, so the red zone reads as a stretch OF it
    base: 'STAND',
    joints: { hip_L: { flex: 20 }, knee_L: { flex: 25 } },
    camera: { dir: [0.15, 0.15, -1] },
    frame: ['foot:calcaneus_post', 'foot:calcaneus_plantar', 'tibia:medial_malleolus', 'tibia:lateral_malleolus', 'tibia:medial_border_dist', 'tibia:distal_post', 'tibia:fibula_post_mid'],
    minSize: 0.2,
    // the problem sits 2–6 cm above the insertion (the insertion footprint ends at rest y 0.045; arc 0.655–0.845 of the
    // tendon's main cord = rest y 0.105–0.065): that stretch is the red zone, the rest of the tendon its own cream
    zones: [{ on: 'achilles-tendon', range: [0.655, 0.845], label: 'アキレス腱の中央部' }],
    spots: {
      // ふくらはぎの下のほう: the crop reaches up to the middle of the shin, so the lower calf muscles above the tendon
      // are in view (their labels on the bellies, not on the card's top edge)
      'calf-lower': {
        frame: ['foot:calcaneus_post', 'foot:calcaneus_plantar', 'tibia:medial_malleolus', 'tibia:lateral_malleolus', 'tibia:medial_border_mid', 'tibia:distal_post', 'tibia:fibula_post_mid', 'tibia:interosseous_mid'],
        minSize: 0.26,
      },
    },
  },
  'achilles-insertional': {
    // dorsiflexion presses the tendon onto the bursa and the heel bone (lateral view; the bursa shows through)
    base: 'STAND',
    joints: { ankle_R: { dorsi: 15 }, knee_R: { flex: 15 } },
    // (posterolateral: the insertion zone and the bursa in front of it side by side, not one blob)
    camera: { dir: [-1, 0.15, -0.6] },
    frame: ['foot:calcaneus_post', 'foot:calcaneus_post_sup', 'tibia:lateral_malleolus', 'foot:calcaneus_plantar', 'tibia:distal_post'],
    minSize: 0.12,
    // the problem sits where the tendon meets the heel bone (arc 0.87–1 of the main cord = rest y 0.06 down to the
    // insertion footprint), next to the retrocalcaneal bursa (steady red)
    zones: [{ on: 'achilles-tendon', range: [0.87, 1], label: 'アキレス腱の付着部' }],
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
    // the pain sits where the fascia starts on the heel bone (medial calcaneal tubercle), not along the whole sheet to
    // the toes: arc 0–0.28 of the central band (rest z −0.046 → ≈ −0.012) is the red zone, the rest its own cream
    zones: [{ on: 'plantar-fascia', range: [0, 0.28], label: '足底腱膜の付け根（かかと）' }],
  },
  'metatarsal-stress-fracture': {
    // top of the foot, like the 2D 足の甲 view
    base: 'STAND',
    camera: { dir: [-0.25, 1, 0.45] },
    frame: ['foot:calcaneus_post', 'foot:met_head_1', 'foot:met_head_5', 'toes:toe_tips', 'foot:navicular_tuberosity'],
    minSize: 0.2,
    // the metatarsals rig's spot (2nd / 3rd shaft–neck, the classic runner's site) is the pulsing lesion with the label
    zones: [{ on: 'metatarsals', label: '中足骨のひび', partRole: 'injured' }],
    spots: {
      // 足指の付け根: the sole of the forefoot (seated, legs out, toes a little up, like Morton's neuroma): the fracture
      // spot at the 2nd metatarsal neck shows through the ball of the foot
      'forefoot-ball': {
        base: 'LONG_SIT',
        joints: { toes_R: { ext: 20 } },
        camera: { dir: [-0.15, 0.1, 1] },
        frame: ['foot:met_head_1', 'foot:met_head_5', 'toes:toe_tips', 'foot:met_2_3_shaft', 'foot:arch_mid'],
        minSize: 0.15,
      },
    },
  },
  'mortons-neuroma': {
    // toe extension squeezes the nerve between the metatarsal heads
    base: 'LONG_SIT',
    // the nerve runs between the 3rd and 4th metatarsal heads: those two rays are the amber context (the metatarsals
    // rig itself tints the stress-fracture rays 2–3)
    structures: { metatarsals: { bones: ['metatarsal_3', 'metatarsal_4'], labelAt: 'foot:met_3_neck' } },
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
    both: ['erector-spinae', 'multifidus', 'quadratus-lumborum'],
    // the fascia on the LEFT half only (its rig draws both halves: parts 0–1 right, 2–3 left), like the 2D figure's
    // 「左半身：表層 / 右半身：深層」: drawn on both sides the red sheet covered the multifidus, quadratus lumborum, lumbar
    // spine and disc that the amber labels point at; now the near (right) half shows them uncovered
    structures: { 'thoracolumbar-fascia': { parts: [2, 3], labelAt: { bone: 'lumbar_L', rest: [0.045, 1.08, -0.095] } } },
    minor: ['iliopsoas', 'gluteus-maximus'],
    // non-specific low back pain: sensitised, not damaged (content's anatomyNote): steady red, no pulse
    sensitive: true,
    // a central problem drawn on both sides of the spine: the same view for either side
    bilateral: true,
    spots: {
      // お尻の奥 (pain referred into the buttock): the crop from T12 down to the sit bone, a little more from the side, so
      // the gluteus maximus is in view and labelled (not in 「+N」)
      'buttock-deep': {
        camera: { dir: [-0.8, 0.2, -1] },
        frame: ['thorax:spinous_T12', 'lumbar:spinous_L5', 'pelvis:iliac_crest_mid', 'pelvis:iliac_crest_mid_L', 'pelvis:sacrum_post', 'pelvis:ischial_tuberosity', 'femur:greater_trochanter'],
        minor: ['iliopsoas'],
      },
    },
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
  hip: {
    base: 'STAND',
    camera: { dir: [-1, 0.28, -0.62] },
    frame: region('hip'),
    minSize: 0.5,
    // learning guide (engine3d): 「前の腸腰筋、後ろの大殿筋、横の中殿筋・小殿筋」 in one view — straight from the right side
    // (the back-oblique region view hid the iliopsoas and the joint behind the gluteus maximus): the iliopsoas coming
    // down in front of the joint, the gluteus medius / minimus fan over the side of the pelvis, the gluteus maximus
    // behind (a little see-through, so the fan under it reads). Crop from L3 to the lesser trochanter; the right forearm
    // is lifted in front of the waist (hanging, it covered the hip in a side view).
    teaching: {
      joints: { shoulder_R: { flex: 40, abd: 8 }, elbow_R: { flex: 95 }, forearm_R: { sup: -60 } },
      camera: { dir: [-1, 0.15, 0.1] },
      frame: [
        'pelvis:iliac_crest_mid',
        'pelvis:asis',
        'pelvis:psis',
        'pelvis:coccyx',
        'femur:greater_trochanter',
        'pelvis:ischial_tuberosity',
        'femur:lesser_trochanter',
        'lumbar:body_L3',
      ],
      minSize: 0.36,
      fade: { 'gluteus-maximus': 0.45 },
    },
  },
  // the knee's key muscles have their bellies in the thigh: framed from the top of the calf up to the upper thigh, so
  // their labels sit on the bellies instead of crowding the top edge at the tail ends of strands that run out of the
  // card. The tensor fasciae latae (its belly at the hip, it reaches the knee through the ITB) starts in 「+N」
  knee: {
    base: 'STAND',
    camera: 'iso',
    frame: [
      'femur:linea_aspera_dist',
      'femur:lateral_epicondyle',
      'femur:medial_epicondyle',
      'patella:base',
      'tibia:tibial_tuberosity',
      'tibia:fibular_head',
      'tibia:pes_anserinus',
      'tibia:soleal_line',
      'femur:shaft_ant_mid',
      'femur:linea_aspera_prox',
    ],
    minor: ['tensor-fasciae-latae'],
  },
  // the right calf from behind (a little from the right), large enough that its six key muscles' labels spread out
  calf: { base: 'STAND', camera: { dir: [-0.55, 0.25, -1] }, frame: region('calf'), minSize: 0.3 },
  ankle: { base: 'STAND', camera: 'iso', frame: region('ankle') },
  foot: {
    base: 'STAND',
    joints: THIGH_PULL_LEFT_LEG,
    camera: { dir: [1, 0.25, -0.1] },
    frame: ['foot:calcaneus_post', 'foot:met_head_1', 'toes:toe_tips', 'tibia:medial_malleolus', 'foot:calcaneus_plantar'],
  },
};
