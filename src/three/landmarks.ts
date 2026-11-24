// Named bony landmarks. Muscles, structures, props and anchors reference them as 'bone:landmark'.
//
// Coordinates are REST coordinates, lateral-positive: [lat, y, z] in metres
//   lat = distance from the midline (+ = lateral), y = height above the floor in the reference pose,
//   z = anterior (+) / posterior (−).
// Bone-local coordinates are derived automatically (rest − segment origin), so a landmark rides
// rigidly on its bone. Bilateral landmarks on midline bones (pelvis, spine, thorax, head) get
// _R / _L variants; a right-side muscle uses _R automatically.
import { Vector3 } from 'three';
import {
  type BaseSeg,
  type RigState,
  type SegName,
  type Side,
  type Vec3,
  isAxialSeg,
  restWorld,
  SEG_INDEX,
  segName,
  segRestOrigin,
} from './rig';

/** Public bone names usable in refs. (`clavicle` is an alias that resolves to the shoulder girdle.) */
export const BONES = [
  'pelvis',
  'lumbar',
  'thorax',
  'neck',
  'head',
  'scapula',
  'clavicle',
  'humerus',
  'forearm',
  'hand',
  'femur',
  'patella',
  'tibia',
  'foot',
  'toes',
] as const;
export type BoneName = (typeof BONES)[number];

export interface LandmarkDef {
  bone: BoneName;
  name: string;
  /** rest coords, lateral-positive */
  p: Vec3;
  desc: string;
  /** internal frame if different from the bone (scapula → clavicle sub-frame) */
  frame?: BaseSeg;
}

const L: LandmarkDef[] = [];
function def(bone: BoneName, list: [string, Vec3, string, BaseSeg?][]) {
  for (const [name, p, desc, frame] of list) L.push({ bone, name, p, desc, frame });
}

// ── pelvis (frame: pelvis)
def('pelvis', [
  ['asis', [0.12, 1.0, 0.065], '上前腸骨棘 ASIS (sartorius, TFL)'],
  ['aiis', [0.103, 0.968, 0.058], '下前腸骨棘 AIIS (rectus femoris straight head)'],
  ['iliac_crest_ant', [0.135, 1.045, 0.038], '腸骨稜 前部 (obliques, TFL)'],
  ['iliac_crest_mid', [0.142, 1.07, -0.012], '腸骨稜 中部・腸骨結節 (obliques, QL lateral)'],
  ['iliac_crest_post', [0.092, 1.066, -0.068], '腸骨稜 後部 (QL, lats, erector)'],
  ['iliac_fossa', [0.085, 1.015, 0.02], '腸骨窩（内面） (iliacus)'],
  ['gluteal_surface_ant', [0.135, 1.01, 0.02], '腸骨外面 前部 (gluteus minimus / medius anterior)'],
  ['gluteal_surface_mid', [0.132, 1.015, -0.03], '腸骨外面 中部 (gluteus medius)'],
  ['gluteal_surface_post', [0.098, 1.0, -0.072], '腸骨外面 後部 (gluteus medius posterior, gluteus maximus)'],
  ['psis', [0.045, 1.018, -0.092], '上後腸骨棘 PSIS'],
  ['sacrum_post', [0, 0.968, -0.098], '仙骨後面（正中仙骨稜） (multifidus, gluteus maximus)'],
  ['sacrum_post_lat', [0.03, 0.955, -0.096], '仙骨後面 外側 (gluteus maximus, piriformis area)'],
  ['sacrum_ant', [0.022, 0.975, -0.06], '仙骨前面 (piriformis origin)'],
  ['sacral_promontory', [0, 1.006, -0.046], '仙骨岬角'],
  ['coccyx', [0, 0.885, -0.08], '尾骨'],
  ['ischial_tuberosity', [0.062, 0.835, -0.035], '坐骨結節 (hamstrings, adductor magnus)'],
  ['ischial_spine', [0.045, 0.882, -0.058], '坐骨棘'],
  ['ischial_ramus', [0.048, 0.84, -0.005], '坐骨枝 (adductor magnus)'],
  ['pubic_tubercle', [0.03, 0.893, 0.07], '恥骨結節 (adductor longus, inguinal ligament)'],
  ['pubic_body', [0.02, 0.88, 0.066], '恥骨体 (adductor longus, gracilis)'],
  ['pubic_crest', [0.015, 0.897, 0.072], '恥骨稜 (rectus abdominis)'],
  ['inferior_pubic_ramus', [0.035, 0.853, 0.045], '恥骨下枝 (gracilis, adductor magnus)'],
  ['superior_pubic_ramus', [0.055, 0.905, 0.058], '恥骨上枝 (pectineus)'],
  ['acetabulum', [0.085, 0.92, 0.0], '寛骨臼（股関節中心）'],
  ['acetabulum_rim_sup', [0.105, 0.948, 0.005], '寛骨臼上縁（関節唇）'],
  ['acetabulum_rim_ant', [0.092, 0.925, 0.032], '寛骨臼前縁（関節唇）'],
  ['pubic_symphysis', [0, 0.886, 0.07], '恥骨結合'],
  ['sacroiliac_joint', [0.04, 0.99, -0.075], '仙腸関節'],
  ['greater_sciatic_notch', [0.07, 0.93, -0.06], '大坐骨切痕 (piriformis exits, sciatic nerve)'],
  ['ilium_inner_post', [0.06, 1.035, -0.07], '腸骨内面 後部 (iliolumbar ligament area)'],
]);

// ── spine
const LUMBAR: [number, number, number][] = [
  // [y, body z, spinous z]
  [1.145, -0.044, -0.104],
  [1.115, -0.036, -0.099],
  [1.085, -0.03, -0.095],
  [1.056, -0.03, -0.095],
  [1.028, -0.036, -0.098],
];
def(
  'lumbar',
  LUMBAR.flatMap(([y, zb, zs], i): [string, Vec3, string][] => [
    [`spinous_L${i + 1}`, [0, y, zs], `L${i + 1} 棘突起`],
    [`transverse_L${i + 1}`, [0.045, y, zb - 0.032], `L${i + 1} 横突起 (QL, psoas, multifidus)`],
    [`body_L${i + 1}`, [0.024, y, zb + 0.012], `L${i + 1} 椎体 前外側 (psoas)`],
    [`lamina_L${i + 1}`, [0.014, y, zb - 0.045], `L${i + 1} 椎弓・乳頭突起 (multifidus)`],
  ]),
);
def('lumbar', [['disc_L4_L5', [0, 1.042, -0.028], 'L4/L5 椎間板']]);
def('lumbar', [['disc_L5_S1', [0, 1.014, -0.036], 'L5/S1 椎間板']]);

const THORACIC: [number, number, number][] = [
  [1.445, -0.03, -0.085],
  [1.425, -0.04, -0.098],
  [1.402, -0.048, -0.108],
  [1.378, -0.055, -0.115],
  [1.353, -0.06, -0.12],
  [1.327, -0.063, -0.123],
  [1.3, -0.064, -0.125],
  [1.273, -0.064, -0.125],
  [1.247, -0.062, -0.123],
  [1.222, -0.059, -0.12],
  [1.197, -0.055, -0.115],
  [1.172, -0.05, -0.11],
];
def(
  'thorax',
  THORACIC.flatMap(([y, zb, zs], i): [string, Vec3, string][] => [
    [`spinous_T${i + 1}`, [0, y, zs], `T${i + 1} 棘突起 (trapezius, rhomboids, lats)`],
    [`transverse_T${i + 1}`, [0.034 + i * 0.0006, y, zb - 0.035], `T${i + 1} 横突起`],
    [`body_T${i + 1}`, [0.018, y, zb + 0.012], `T${i + 1} 椎体 前外側`],
  ]),
);
// ribs — lateral points on the mid-axillary line (serratus anterior digitations), anterior points
const RIB_LAT: [number, number, number][] = [
  // [lat, y, z]
  [0.06, 1.405, 0.03], // rib 1 (upper surface)
  [0.105, 1.385, 0.035],
  [0.122, 1.358, 0.03],
  [0.133, 1.328, 0.026],
  [0.141, 1.298, 0.022],
  [0.146, 1.268, 0.018],
  [0.148, 1.238, 0.012],
  [0.148, 1.208, 0.006],
  [0.145, 1.178, 0.0],
  [0.139, 1.152, -0.012],
  [0.128, 1.13, -0.035],
];
def(
  'thorax',
  RIB_LAT.map(([x, y, z], i): [string, Vec3, string] => [`rib${i + 1}_lat`, [x, y, z], `第${i + 1}肋骨 外側面`]),
);
def('thorax', [
  ['rib1_ant', [0.035, 1.413, 0.06], '第1肋骨 前端（胸骨柄の外側） (subclavius, scalenes area)'],
  ['rib3_ant', [0.072, 1.362, 0.094], '第3肋骨 前面 (pectoralis minor)'],
  ['rib4_ant', [0.078, 1.333, 0.1], '第4肋骨 前面 (pectoralis minor)'],
  ['rib5_ant', [0.083, 1.302, 0.102], '第5肋骨 前面 (pectoralis minor)'],
  ['rib6_ant', [0.085, 1.27, 0.1], '第6肋骨 前面 (pectoralis major lower fibres, rectus)'],
  ['costal_cartilage_5_7', [0.062, 1.246, 0.104], '第5〜7肋軟骨 (rectus abdominis insertion)'],
  ['costal_margin', [0.105, 1.2, 0.085], '肋骨弓 (external oblique, transversus)'],
  ['rib12_post', [0.075, 1.142, -0.098], '第12肋骨 下縁 (quadratus lumborum)'],
  ['rib_angle_6', [0.06, 1.3, -0.118], '第6肋骨角（背面） (iliocostalis)'],
  ['sternum_manubrium', [0, 1.412, 0.076], '胸骨柄 (pectoralis major clavicular/sternal)'],
  ['sternum_body', [0, 1.33, 0.094], '胸骨体 (pectoralis major sternal)'],
  ['xiphoid', [0, 1.244, 0.095], '剣状突起 (rectus abdominis)'],
  ['clavicle_notch', [0, 1.438, 0.07], '頸切痕（胸骨上縁）'],
  ['sternum_lat', [0.018, 1.36, 0.092], '胸骨外側縁 (pectoralis major)'],
]);

// cervical (frame: neck) — C1..C7
const CERVICAL: [number, number, number][] = [
  [1.575, 0.0, -0.045],
  [1.555, 0.0, -0.056],
  [1.535, 0.0, -0.05],
  [1.515, -0.002, -0.05],
  [1.497, -0.006, -0.053],
  [1.479, -0.012, -0.06],
  [1.462, -0.02, -0.076],
];
def(
  'neck',
  CERVICAL.flatMap(([y, zb, zs], i): [string, Vec3, string][] => {
    const n = i + 1;
    const out: [string, Vec3, string][] = [[`body_C${n}`, [0.008, y, zb + 0.012], `C${n} 椎体 前面 (deep neck flexors)`]];
    if (n >= 2) out.push([`spinous_C${n}`, [0, y, zs], `C${n} 棘突起`]);
    if (n <= 6) out.push([`transverse_C${n}`, [n === 1 ? 0.036 : 0.026, y, zb - 0.008], `C${n} 横突起 (levator scapulae, scalenes)`]);
    return out;
  }),
);
def('neck', [['spinous_C1', [0, 1.575, -0.045], 'C1 後結節']]);
def('head', [
  ['occiput', [0, 1.625, -0.09], '外後頭隆起'],
  ['nuchal_line_sup', [0.04, 1.625, -0.083], '上項線 (trapezius upper fibres)'],
  ['nuchal_line_inf', [0.03, 1.605, -0.07], '下項線 (suboccipitals, semispinalis)'],
  ['mastoid', [0.052, 1.6, -0.028], '乳様突起 (SCM)'],
  ['skull_base_ant', [0.01, 1.598, 0.002], '後頭骨底部 前面 (longus capitis)'],
  ['vertex', [0, 1.75, 0.0], '頭頂'],
  ['chin', [0, 1.528, 0.075], 'おとがい'],
]);

// ── shoulder girdle (bone: scapula; clavicle landmarks ride the clavicle sub-frame)
def('scapula', [
  ['sc_joint', [0.022, 1.43, 0.062], '胸鎖関節', 'clavicle'],
  ['clavicle_medial', [0.038, 1.436, 0.062], '鎖骨 内側1/3 (SCM, pectoralis major clavicular)', 'clavicle'],
  ['clavicle_mid', [0.1, 1.446, 0.05], '鎖骨 中央', 'clavicle'],
  ['clavicle_lateral', [0.16, 1.452, 0.008], '鎖骨 外側1/3 (deltoid anterior, trapezius)', 'clavicle'],
  ['acromion', [0.192, 1.452, -0.006], '肩峰 外側端 (deltoid middle, trapezius)'],
  ['acromion_ant', [0.188, 1.448, 0.012], '肩峰 前縁 (coracoacromial arch)'],
  ['acromion_under', [0.18, 1.438, -0.004], '肩峰 下面 (subacromial space)'],
  ['coracoid', [0.15, 1.418, 0.035], '烏口突起 (pec minor, biceps short head)'],
  ['spine_medial', [0.075, 1.382, -0.106], '肩甲棘 内側端（棘三角）'],
  ['spine_mid', [0.12, 1.41, -0.088], '肩甲棘 中央 (deltoid posterior, trapezius)'],
  ['spine_lateral', [0.165, 1.437, -0.05], '肩甲棘 外側'],
  ['supraspinous_fossa', [0.108, 1.425, -0.08], '棘上窩 (supraspinatus)'],
  ['infraspinous_fossa', [0.112, 1.33, -0.092], '棘下窩 (infraspinatus)'],
  ['subscapular_fossa', [0.108, 1.335, -0.072], '肩甲下窩（前面） (subscapularis)'],
  ['superior_angle', [0.077, 1.435, -0.09], '上角 (levator scapulae)'],
  ['medial_border_mid', [0.07, 1.33, -0.112], '内側縁 中央 (rhomboids, serratus anterior)'],
  ['inferior_angle', [0.086, 1.236, -0.104], '下角 (serratus, teres major)'],
  ['lateral_border', [0.135, 1.3, -0.075], '外側縁 (teres minor, teres major)'],
  ['glenoid', [0.154, 1.405, -0.012], '関節窩'],
  ['supraglenoid_tubercle', [0.155, 1.43, -0.006], '関節上結節 (biceps long head)'],
  ['infraglenoid_tubercle', [0.15, 1.376, -0.022], '関節下結節 (triceps long head)'],
]);

// ── humerus
def('humerus', [
  ['head', [0.168, 1.408, -0.006], '上腕骨頭'],
  ['greater_tubercle_sup', [0.193, 1.424, 0.0], '大結節 上面 (supraspinatus)'],
  ['greater_tubercle_mid', [0.2, 1.405, -0.013], '大結節 中面 (infraspinatus)'],
  ['greater_tubercle_inf', [0.196, 1.384, -0.022], '大結節 下面 (teres minor)'],
  ['lesser_tubercle', [0.178, 1.395, 0.022], '小結節 (subscapularis)'],
  ['bicipital_groove', [0.19, 1.385, 0.02], '結節間溝 (biceps long head tendon)'],
  ['crest_greater_tubercle', [0.196, 1.33, 0.016], '大結節稜 (pectoralis major)'],
  ['crest_lesser_tubercle', [0.183, 1.34, 0.012], '小結節稜 (latissimus, teres major)'],
  ['deltoid_tuberosity', [0.207, 1.27, 0.0], '三角筋粗面'],
  ['shaft_post_mid', [0.19, 1.25, -0.019], '上腕骨後面 中央 (triceps medial/lateral heads)'],
  ['shaft_post_prox', [0.198, 1.33, -0.018], '上腕骨後面 上部 (triceps lateral head)'],
  ['shaft_ant_dist', [0.192, 1.16, 0.01], '上腕骨前面 下部 (brachialis)'],
  ['lateral_epicondyle', [0.226, 1.093, -0.015], '外側上顆 (wrist extensors)'],
  ['medial_epicondyle', [0.155, 1.093, -0.02], '内側上顆 (wrist flexors)'],
]);
def('forearm', [
  ['radial_tuberosity', [0.205, 1.053, 0.006], '橈骨粗面 (biceps)'],
  ['ulna_tuberosity', [0.19, 1.058, 0.004], '尺骨粗面 (brachialis)'],
  ['olecranon', [0.186, 1.098, -0.04], '肘頭 (triceps)'],
  ['ulna_mid', [0.205, 0.965, -0.016], '尺骨 中央'],
  ['radius_mid', [0.228, 0.965, 0.002], '橈骨 中央'],
  ['radius_distal', [0.262, 0.842, 0.002], '橈骨 遠位端（茎状突起）'],
  ['ulna_distal', [0.218, 0.842, -0.01], '尺骨 遠位端（尺骨頭）'],
]);
def('hand', [
  ['palm', [0.246, 0.775, 0.016], '手掌 中央（グリップ点）'],
  ['knuckles', [0.248, 0.735, -0.004], 'MP関節 背側'],
  ['fingertips', [0.254, 0.665, 0.012], '指先'],
]);

// ── femur
def('femur', [
  ['head', [0.085, 0.92, 0.0], '大腿骨頭'],
  ['neck', [0.11, 0.905, 0.005], '大腿骨頸部'],
  ['greater_trochanter', [0.152, 0.905, -0.01], '大転子 外側の頂点'],
  ['greater_trochanter_ant', [0.148, 0.905, 0.012], '大転子 前面 (gluteus minimus)'],
  ['greater_trochanter_lat', [0.16, 0.896, -0.006], '大転子 外側面 (gluteus medius)'],
  ['greater_trochanter_sup', [0.143, 0.925, -0.014], '大転子 上後面 (gluteus medius posterior, piriformis)'],
  ['trochanteric_fossa', [0.128, 0.912, -0.02], '転子窩 (deep rotators)'],
  ['lesser_trochanter', [0.097, 0.855, -0.012], '小転子 (iliopsoas)'],
  ['intertrochanteric_line', [0.125, 0.885, 0.02], '転子間線 (vastus medialis origin)'],
  ['gluteal_tuberosity', [0.137, 0.83, -0.02], '殿筋粗面 (gluteus maximus)'],
  ['shaft_ant_prox', [0.118, 0.82, 0.02], '大腿骨前面 上部 (vastus intermedius)'],
  ['shaft_lat_prox', [0.138, 0.852, 0.004], '大腿骨外側 上部 (vastus lateralis)'],
  ['shaft_med_prox', [0.102, 0.84, 0.012], '大腿骨内側 上部 (vastus medialis)'],
  ['shaft_ant_mid', [0.11, 0.7, 0.024], '大腿骨前面 中央'],
  ['linea_aspera_prox', [0.117, 0.8, -0.026], '粗線 上部 (adductors, vastus)'],
  ['linea_aspera_mid', [0.107, 0.7, -0.026], '粗線 中央 (adductor longus/magnus, biceps short head)'],
  ['linea_aspera_dist', [0.099, 0.6, -0.022], '粗線 下部 (adductor magnus)'],
  ['adductor_tubercle', [0.052, 0.54, -0.012], '内転筋結節 (adductor magnus)'],
  ['lateral_epicondyle', [0.132, 0.515, -0.004], '外側上顆 (ITB passes over, LCL)'],
  ['medial_epicondyle', [0.046, 0.515, -0.004], '内側上顆 (MCL)'],
  ['lateral_condyle_post', [0.118, 0.522, -0.03], '外側顆 後上部 (gastrocnemius lateral head)'],
  ['medial_condyle_post', [0.06, 0.522, -0.03], '内側顆 後上部 (gastrocnemius medial head)'],
  ['trochlear_groove', [0.09, 0.512, 0.032], '滑車溝（膝蓋大腿関節）'],
  ['popliteal_surface', [0.09, 0.545, -0.024], '膝窩面 (plantaris)'],
  ['condyle_lat_dist', [0.115, 0.49, 0.0], '外側顆 遠位（脛骨関節面）'],
  ['condyle_med_dist', [0.065, 0.49, 0.0], '内側顆 遠位（脛骨関節面）'],
]);
// patella frame (rides the trochlea)
def('patella', [
  ['base', [0.09, 0.552, 0.047], '膝蓋骨底（上縁） (quadriceps tendon)'],
  ['apex', [0.09, 0.505, 0.05], '膝蓋骨尖（下縁） (patellar tendon)'],
  ['center', [0.09, 0.528, 0.056], '膝蓋骨 前面中央'],
  ['medial', [0.07, 0.53, 0.048], '膝蓋骨 内側縁 (vastus medialis)'],
  ['lateral', [0.11, 0.53, 0.048], '膝蓋骨 外側縁 (vastus lateralis)'],
  ['articular', [0.09, 0.528, 0.038], '膝蓋骨 関節面（軟骨）'],
]);
// tibia + fibula
def('tibia', [
  ['tibial_tuberosity', [0.09, 0.448, 0.034], '脛骨粗面 (patellar tendon)'],
  ['pes_anserinus', [0.068, 0.432, 0.022], '鵞足（脛骨内側上部） (sartorius, gracilis, semitendinosus)'],
  ['gerdy_tubercle', [0.114, 0.462, 0.026], 'ガーディー結節 (iliotibial band)'],
  ['medial_condyle', [0.054, 0.474, 0.0], '脛骨内側顆'],
  ['medial_condyle_post', [0.06, 0.468, -0.022], '脛骨内側顆 後面 (semimembranosus)'],
  ['lateral_condyle', [0.122, 0.474, 0.0], '脛骨外側顆'],
  ['plateau', [0.088, 0.484, 0.0], '脛骨高原（半月板）'],
  ['fibular_head', [0.126, 0.455, -0.022], '腓骨頭 (biceps femoris, LCL, soleus)'],
  ['soleal_line', [0.082, 0.42, -0.026], 'ヒラメ筋線 (soleus)'],
  ['posterior_prox', [0.092, 0.44, -0.026], '脛骨後面 上部 (popliteus, tib post)'],
  ['interosseous_mid', [0.105, 0.3, -0.01], '骨間膜 中央 (tibialis posterior)'],
  ['medial_border_mid', [0.07, 0.28, 0.0], '脛骨内側縁 中央 (soleus, MTSS)'],
  ['medial_border_dist', [0.068, 0.17, 0.0], '脛骨内側縁 遠位1/3 (MTSS)'],
  ['anterior_crest_mid', [0.086, 0.3, 0.02], '脛骨前縁 中央（すね）'],
  ['anterior_lat_prox', [0.103, 0.415, 0.02], '脛骨外側面 上部 (tibialis anterior)'],
  ['anterior_lat_mid', [0.1, 0.32, 0.017], '脛骨外側面 中央 (tibialis anterior)'],
  ['fibula_lat_prox', [0.132, 0.4, -0.02], '腓骨外側 上部 (fibularis longus)'],
  ['fibula_lat_mid', [0.127, 0.27, -0.022], '腓骨外側 中央〜下部 (fibularis brevis)'],
  ['fibula_post_mid', [0.117, 0.26, -0.03], '腓骨後面 中央〜下部 (flexor hallucis longus)'],
  ['fibula_post_prox', [0.122, 0.42, -0.03], '腓骨後面 上部 (soleus)'],
  ['medial_malleolus', [0.062, 0.072, 0.002], '内果'],
  ['lateral_malleolus', [0.118, 0.06, -0.02], '外果'],
  ['retro_medial_malleolus', [0.064, 0.078, -0.022], '内果の後方 (tibialis posterior / FHL tendons)'],
  ['retro_lateral_malleolus', [0.122, 0.068, -0.04], '外果の後方 (fibularis tendons)'],
  ['distal_ant', [0.088, 0.11, 0.022], '脛骨遠位 前面 (extensor retinaculum)'],
  ['distal_post', [0.088, 0.11, -0.022], '脛骨遠位 後面'],
]);
// foot (rearfoot + midfoot)
def('foot', [
  ['calcaneus_post', [0.09, 0.034, -0.071], '踵骨隆起 後面 (Achilles insertion)'],
  ['calcaneus_post_sup', [0.09, 0.056, -0.06], '踵骨 後上部 (retrocalcaneal bursa)'],
  ['calcaneus_plantar_medial', [0.076, 0.008, -0.036], '踵骨隆起 内側突起 (plantar fascia, abductor hallucis, FDB)'],
  ['calcaneus_plantar', [0.09, 0.006, -0.03], '踵骨 足底面（踵の脂肪体）'],
  ['calcaneus_lat', [0.114, 0.03, -0.034], '踵骨 外側面 (CFL)'],
  ['sustentaculum_tali', [0.066, 0.048, -0.012], '載距突起 (FHL groove, spring ligament)'],
  ['talus', [0.09, 0.066, 0.004], '距骨 滑車'],
  ['talus_neck_lat', [0.11, 0.058, 0.025], '距骨頸 外側 (ATFL)'],
  ['navicular_tuberosity', [0.062, 0.047, 0.056], '舟状骨粗面 (tibialis posterior)'],
  ['medial_cuneiform_plantar', [0.066, 0.024, 0.086], '内側楔状骨 足底 (tib post, fib longus, tib ant)'],
  ['medial_cuneiform_dorsal', [0.064, 0.05, 0.082], '内側楔状骨 内背側 (tibialis anterior)'],
  ['cuboid_groove', [0.114, 0.02, 0.05], '立方骨 長腓骨筋腱溝'],
  ['first_met_base', [0.066, 0.03, 0.096], '第1中足骨底 (fibularis longus, tib ant)'],
  ['fifth_met_base', [0.13, 0.02, 0.062], '第5中足骨底（粗面） (fibularis brevis)'],
  ['met_head_1', [0.064, 0.013, 0.14], '第1中足骨頭（母趾球）'],
  ['met_head_2', [0.08, 0.012, 0.142], '第2中足骨頭'],
  ['met_head_3', [0.095, 0.012, 0.134], '第3中足骨頭'],
  ['met_head_5', [0.125, 0.012, 0.114], '第5中足骨頭（小趾球）'],
  ['met_2_3_shaft', [0.088, 0.03, 0.11], '第2・3中足骨 骨幹（疲労骨折の好発部位）'],
  ['interspace_3_4', [0.102, 0.012, 0.13], '第3–4趾間（モートン病）'],
  ['arch_mid', [0.075, 0.028, 0.04], '内側縦アーチ 中央（足底）'],
  ['dorsum_mid', [0.088, 0.062, 0.07], '足背 中央'],
]);
def('toes', [
  ['hallux_distal', [0.062, 0.011, 0.188], '母趾 末節骨底 (FHL)'],
  ['hallux_prox', [0.064, 0.012, 0.158], '母趾 基節骨 (abductor hallucis)'],
  ['toes_mid', [0.095, 0.011, 0.162], '第2〜4趾 中節骨（FDB停止・接地点）'],
  ['toe_tips', [0.095, 0.009, 0.185], '趾先'],
]);

export const LANDMARKS: readonly LandmarkDef[] = L;

// ───────────────────────────────────────────── ref types & compilation

export type LandmarkRef = `${string}:${string}`;
/**
 * An attachment / via point:
 * - `'femur:greater_trochanter'` landmark (side from context; explicit `femur_L:...` or `pelvis:asis_L` = that side,
 *   and when a muscle is mirrored the explicit sides swap too, so "_L" in a right muscle means "contralateral").
 * - `{ ref, off }` landmark + offset [lat, y, z] in the bone's frame (lateral-positive, metres).
 * - `{ bone, rest }` any point rigidly on a bone, given in rest coordinates [lat, y, z].
 * - `{ mix: [a, b], t }` world-space interpolation between two attachments (may be on different bones).
 */
export type AttachRef =
  | LandmarkRef
  | { ref: LandmarkRef; off: Vec3 }
  | { bone: BoneName | `${BoneName}_${Side}`; rest: Vec3 }
  | { mix: [AttachRef, AttachRef]; t: number };

export type CompiledPoint =
  | { k: 0; seg: number; local: Vector3 }
  | { k: 1; a: CompiledPoint; b: CompiledPoint; t: number };

const byKey = new Map<string, LandmarkDef>();
for (const l of L) byKey.set(`${l.bone}:${l.name}`, l);
// clavicle alias
for (const l of L) if (l.frame === 'clavicle') byKey.set(`clavicle:${l.name}`, l);

const swap = (s: Side): Side => (s === 'R' ? 'L' : 'R');

function frameFor(bone: string): BaseSeg {
  if (bone === 'clavicle') return 'clavicle';
  return bone as BaseSeg;
}

export class RefError extends Error {}

function suggest(bone: string, name: string): string {
  const cands = L.filter((l) => l.bone === bone).map((l) => l.name);
  const near = cands.filter((c) => c.includes(name.slice(0, 4)) || name.includes(c.slice(0, 4))).slice(0, 5);
  return near.length ? ` (did you mean ${near.join(', ')}?)` : cands.length ? '' : ` (unknown bone "${bone}")`;
}

/** Compile a ref for a side ('R' for right-side muscles; 'L' when mirrored). */
export function compileRef(ref: AttachRef, side: Side): CompiledPoint {
  if (typeof ref === 'string') return compileLandmark(ref, side, null);
  if ('mix' in ref) return { k: 1, a: compileRef(ref.mix[0], side), b: compileRef(ref.mix[1], side), t: ref.t };
  if ('ref' in ref) return compileLandmark(ref.ref, side, ref.off);
  // { bone, rest }
  const m = /^([a-z]+)(?:_(R|L))?$/.exec(ref.bone);
  if (!m) throw new RefError(`bad bone "${ref.bone}"`);
  const bone = m[1];
  const s = m[2] ? (side === 'L' ? swap(m[2] as Side) : (m[2] as Side)) : side;
  const base = frameFor(bone);
  const sn = segName(base, isAxialSeg(base) ? null : s);
  const xside = isAxialSeg(base) ? (ref.rest[0] === 0 ? null : s) : s;
  const local = restWorld(ref.rest, xside).sub(segRestOrigin(sn));
  return { k: 0, seg: SEG_INDEX[sn], local };
}

function compileLandmark(key: string, side: Side, off: Vec3 | null): CompiledPoint {
  const i = key.indexOf(':');
  if (i < 0) throw new RefError(`bad ref "${key}" (expected "bone:landmark")`);
  let bone = key.slice(0, i);
  let name = key.slice(i + 1);
  let s: Side = side;
  const bm = /^([a-z]+)_(R|L)$/.exec(bone);
  if (bm) {
    bone = bm[1];
    s = side === 'L' ? swap(bm[2] as Side) : (bm[2] as Side);
  }
  let def = byKey.get(`${bone}:${name}`);
  if (!def) {
    const nm = /^(.*)_(R|L)$/.exec(name);
    if (nm && byKey.get(`${bone}:${nm[1]}`)) {
      name = nm[1];
      s = side === 'L' ? swap(nm[2] as Side) : (nm[2] as Side);
      def = byKey.get(`${bone}:${name}`);
    }
  }
  if (!def) throw new RefError(`unknown landmark "${key}"${suggest(bone, name)}`);
  const base = def.frame ?? frameFor(def.bone);
  const axial = isAxialSeg(base);
  const sn = segName(base, axial ? null : s);
  const midline = def.p[0] === 0;
  const p: Vec3 = off ? [def.p[0] + off[0], def.p[1] + off[1], def.p[2] + off[2]] : def.p;
  const xside = axial && midline && !(off && off[0] !== 0) ? null : s;
  const local = restWorld(p, xside).sub(segRestOrigin(sn));
  return { k: 0, seg: SEG_INDEX[sn], local };
}

/** Evaluate a compiled point in world space (no allocation). */
export function evalPoint(cp: CompiledPoint, state: RigState, out: Vector3): Vector3 {
  if (cp.k === 0) return state.toWorld(cp.seg, cp.local, out);
  evalPoint(cp.a, state, out);
  const ax = out.x,
    ay = out.y,
    az = out.z;
  evalPoint(cp.b, state, out);
  out.set(ax + (out.x - ax) * cp.t, ay + (out.y - ay) * cp.t, az + (out.z - az) * cp.t);
  return out;
}

/** The segment a compiled point is rigid on (first leaf for mixes). */
export function pointSeg(cp: CompiledPoint): number {
  return cp.k === 0 ? cp.seg : pointSeg(cp.a);
}

/** Convenience: compile a ref and swallow errors (returns null + warns once). */
const warned = new Set<string>();
export function tryCompile(ref: AttachRef, side: Side, ctx: string): CompiledPoint | null {
  try {
    return compileRef(ref, side);
  } catch (e) {
    const msg = `[tribody] ${ctx}: ${(e as Error).message}`;
    if (!warned.has(msg)) {
      warned.add(msg);
      console.warn(msg);
    }
    return null;
  }
}

/** All landmark keys (for docs / debug). */
export function landmarkKeys(): string[] {
  return L.map((l) => `${l.bone}:${l.name}`);
}
