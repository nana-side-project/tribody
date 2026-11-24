// MASTER ID REGISTRY — the contract between all content, 3D and illustration files.
// Every id used anywhere in the app must be listed here. Do not rename ids.
// `owner` = which content file (src/data/content/<owner>.ts) writes the full object.
//   A = shoulder.ts   (肩・首)
//   B = hip.ts        (股関節・お尻)
//   C = knee-calf.ts  (膝・ふくらはぎ・すね)
//   D = ankle-foot.ts (足首・足部)
//   E = global.ts     (regions, pain spots, structures, guides, 腰と体幹)

export const REGIONS = [
  { id: 'shoulder', ja: '肩' },
  { id: 'neck', ja: '首・肩上部' },
  { id: 'lowback', ja: '腰・体幹' },
  { id: 'hip', ja: '股関節・お尻' },
  { id: 'knee', ja: '膝' },
  { id: 'calf', ja: 'ふくらはぎ・すね' },
  { id: 'ankle', ja: '足首・アキレス腱' },
  { id: 'foot', ja: '足裏・足部' },
] as const;
export type RegionId = (typeof REGIONS)[number]['id'];

export const MUSCLES = [
  // ── A: shoulder / arm / neck
  { id: 'supraspinatus', ja: '棘上筋', owner: 'A' },
  { id: 'infraspinatus', ja: '棘下筋', owner: 'A' },
  { id: 'teres-minor', ja: '小円筋', owner: 'A' },
  { id: 'subscapularis', ja: '肩甲下筋', owner: 'A' },
  { id: 'deltoid', ja: '三角筋', owner: 'A' },
  { id: 'pectoralis-major', ja: '大胸筋', owner: 'A' },
  { id: 'pectoralis-minor', ja: '小胸筋', owner: 'A' },
  { id: 'latissimus-dorsi', ja: '広背筋', owner: 'A' },
  { id: 'serratus-anterior', ja: '前鋸筋', owner: 'A' },
  { id: 'trapezius', ja: '僧帽筋', owner: 'A' },
  { id: 'rhomboids', ja: '菱形筋', owner: 'A' },
  { id: 'levator-scapulae', ja: '肩甲挙筋', owner: 'A' },
  { id: 'biceps-brachii', ja: '上腕二頭筋', owner: 'A' },
  { id: 'triceps-brachii', ja: '上腕三頭筋', owner: 'A' },
  { id: 'deep-neck-flexors', ja: '頸部深層屈筋群', owner: 'A' },
  // ── E: trunk / low back
  { id: 'erector-spinae', ja: '脊柱起立筋', owner: 'E' },
  { id: 'multifidus', ja: '多裂筋', owner: 'E' },
  { id: 'transversus-abdominis', ja: '腹横筋', owner: 'E' },
  { id: 'obliques', ja: '腹斜筋（外腹斜筋・内腹斜筋）', owner: 'E' },
  { id: 'rectus-abdominis', ja: '腹直筋', owner: 'E' },
  { id: 'quadratus-lumborum', ja: '腰方形筋', owner: 'E' },
  // ── B: hip
  { id: 'gluteus-maximus', ja: '大殿筋', owner: 'B' },
  { id: 'gluteus-medius', ja: '中殿筋', owner: 'B' },
  { id: 'gluteus-minimus', ja: '小殿筋', owner: 'B' },
  { id: 'piriformis', ja: '梨状筋', owner: 'B' },
  { id: 'iliopsoas', ja: '腸腰筋（大腰筋・腸骨筋）', owner: 'B' },
  { id: 'tensor-fasciae-latae', ja: '大腿筋膜張筋', owner: 'B' },
  { id: 'adductor-longus', ja: '長内転筋', owner: 'B' },
  { id: 'adductor-magnus', ja: '大内転筋', owner: 'B' },
  { id: 'gracilis', ja: '薄筋', owner: 'B' },
  { id: 'sartorius', ja: '縫工筋', owner: 'B' },
  // ── C: thigh / calf / shin
  { id: 'rectus-femoris', ja: '大腿直筋', owner: 'C' },
  { id: 'vastus-lateralis', ja: '外側広筋', owner: 'C' },
  { id: 'vastus-medialis', ja: '内側広筋', owner: 'C' },
  { id: 'biceps-femoris', ja: '大腿二頭筋', owner: 'C' },
  { id: 'semitendinosus', ja: '半腱様筋', owner: 'C' },
  { id: 'semimembranosus', ja: '半膜様筋', owner: 'C' },
  { id: 'gastrocnemius', ja: '腓腹筋', owner: 'C' },
  { id: 'soleus', ja: 'ヒラメ筋', owner: 'C' },
  { id: 'tibialis-anterior', ja: '前脛骨筋', owner: 'C' },
  // ── D: ankle / foot
  { id: 'tibialis-posterior', ja: '後脛骨筋', owner: 'D' },
  { id: 'fibularis-longus', ja: '長腓骨筋', owner: 'D' },
  { id: 'fibularis-brevis', ja: '短腓骨筋', owner: 'D' },
  { id: 'flexor-hallucis-longus', ja: '長母趾屈筋', owner: 'D' },
  { id: 'abductor-hallucis', ja: '母趾外転筋', owner: 'D' },
  { id: 'flexor-digitorum-brevis', ja: '短趾屈筋', owner: 'D' },
] as const;
export type MuscleId = (typeof MUSCLES)[number]['id'];

// All structures are written by owner E (src/data/content/global.ts).
export const STRUCTURES = [
  // shoulder / thorax
  { id: 'acromion', ja: '肩峰', region: 'shoulder' },
  { id: 'subacromial-bursa', ja: '肩峰下滑液包', region: 'shoulder' },
  { id: 'biceps-long-head-tendon', ja: '上腕二頭筋長頭腱', region: 'shoulder' },
  { id: 'posterior-capsule', ja: '肩関節の後方関節包', region: 'shoulder' },
  { id: 'glenoid-labrum', ja: '肩関節唇', region: 'shoulder' },
  { id: 'scapula', ja: '肩甲骨', region: 'shoulder' },
  { id: 'humeral-head', ja: '上腕骨頭', region: 'shoulder' },
  { id: 'thoracic-spine', ja: '胸椎', region: 'shoulder' },
  // neck
  { id: 'cervical-spine', ja: '頸椎', region: 'neck' },
  // low back
  { id: 'lumbar-spine', ja: '腰椎', region: 'lowback' },
  { id: 'intervertebral-disc', ja: '椎間板', region: 'lowback' },
  { id: 'sacroiliac-joint', ja: '仙腸関節', region: 'lowback' },
  { id: 'thoracolumbar-fascia', ja: '胸腰筋膜', region: 'lowback' },
  // hip
  { id: 'hip-joint', ja: '股関節', region: 'hip' },
  { id: 'hip-labrum', ja: '股関節唇', region: 'hip' },
  { id: 'greater-trochanter', ja: '大転子', region: 'hip' },
  { id: 'trochanteric-bursa', ja: '大転子滑液包', region: 'hip' },
  { id: 'gluteal-tendons', ja: '中殿筋・小殿筋の腱', region: 'hip' },
  { id: 'ischial-tuberosity', ja: '坐骨結節', region: 'hip' },
  { id: 'proximal-hamstring-tendon', ja: 'ハムストリングの付け根の腱', region: 'hip' },
  { id: 'sciatic-nerve', ja: '坐骨神経', region: 'hip' },
  { id: 'pubic-symphysis', ja: '恥骨結合', region: 'hip' },
  { id: 'asis', ja: '上前腸骨棘', region: 'hip' },
  // knee
  { id: 'patella', ja: '膝蓋骨（お皿）', region: 'knee' },
  { id: 'patellar-tendon', ja: '膝蓋腱', region: 'knee' },
  { id: 'quadriceps-tendon', ja: '大腿四頭筋腱', region: 'knee' },
  { id: 'patellofemoral-cartilage', ja: '膝蓋大腿関節の軟骨', region: 'knee' },
  { id: 'iliotibial-band', ja: '腸脛靱帯', region: 'knee' },
  { id: 'lateral-femoral-epicondyle', ja: '大腿骨外側上顆', region: 'knee' },
  { id: 'pes-anserinus', ja: '鵞足', region: 'knee' },
  { id: 'pes-anserine-bursa', ja: '鵞足包', region: 'knee' },
  { id: 'meniscus', ja: '半月板', region: 'knee' },
  { id: 'mcl', ja: '内側側副靱帯', region: 'knee' },
  // calf / shin
  { id: 'tibia', ja: '脛骨', region: 'calf' },
  { id: 'medial-tibial-border', ja: '脛骨内側縁（骨膜）', region: 'calf' },
  { id: 'fibula', ja: '腓骨', region: 'calf' },
  // ankle
  { id: 'achilles-tendon', ja: 'アキレス腱', region: 'ankle' },
  { id: 'calcaneus', ja: '踵骨', region: 'ankle' },
  { id: 'retrocalcaneal-bursa', ja: '踵骨後部滑液包', region: 'ankle' },
  { id: 'talus', ja: '距骨', region: 'ankle' },
  { id: 'atfl', ja: '前距腓靱帯', region: 'ankle' },
  { id: 'cfl', ja: '踵腓靱帯', region: 'ankle' },
  { id: 'lateral-malleolus', ja: '外果（外くるぶし）', region: 'ankle' },
  { id: 'medial-malleolus', ja: '内果（内くるぶし）', region: 'ankle' },
  { id: 'tibialis-posterior-tendon', ja: '後脛骨筋腱', region: 'ankle' },
  { id: 'peroneal-tendons', ja: '腓骨筋腱', region: 'ankle' },
  // foot
  { id: 'plantar-fascia', ja: '足底腱膜', region: 'foot' },
  { id: 'heel-fat-pad', ja: '踵の脂肪体（ヒールパッド）', region: 'foot' },
  { id: 'navicular', ja: '舟状骨', region: 'foot' },
  { id: 'medial-arch', ja: '内側縦アーチ（土踏まず）', region: 'foot' },
  { id: 'metatarsals', ja: '中足骨', region: 'foot' },
  { id: 'interdigital-nerve', ja: '趾間神経', region: 'foot' },
] as const;
export type StructureId = (typeof STRUCTURES)[number]['id'];

export const CONDITIONS = [
  // A
  { id: 'swimmers-shoulder', ja: '水泳肩（肩峰下の痛み・腱板腱障害）', region: 'shoulder', owner: 'A' },
  { id: 'biceps-tendinopathy', ja: '上腕二頭筋長頭腱障害', region: 'shoulder', owner: 'A' },
  { id: 'scapular-dyskinesis', ja: '肩甲骨ジスキネジア（肩甲骨の動きの乱れ）', region: 'shoulder', owner: 'A' },
  { id: 'cyclist-neck-pain', ja: '首・肩上部の痛み（バイク姿勢）', region: 'neck', owner: 'A' },
  // B
  { id: 'gluteal-tendinopathy', ja: '殿筋腱障害（大転子疼痛症候群）', region: 'hip', owner: 'B' },
  { id: 'hip-flexor-pain', ja: '股関節前面の痛み（腸腰筋・大腿直筋）', region: 'hip', owner: 'B' },
  { id: 'deep-gluteal-syndrome', ja: '深殿部症候群（梨状筋症候群）', region: 'hip', owner: 'B' },
  { id: 'proximal-hamstring-tendinopathy', ja: '近位ハムストリング腱障害', region: 'hip', owner: 'B' },
  { id: 'adductor-groin-pain', ja: '内転筋関連の鼠径部痛', region: 'hip', owner: 'B' },
  // C
  { id: 'patellofemoral-pain', ja: '膝蓋大腿疼痛症候群', region: 'knee', owner: 'C' },
  { id: 'itb-syndrome', ja: '腸脛靱帯症候群（ITBS）', region: 'knee', owner: 'C' },
  { id: 'patellar-tendinopathy', ja: '膝蓋腱障害（ジャンパー膝）', region: 'knee', owner: 'C' },
  { id: 'pes-anserine-pain', ja: '鵞足炎（鵞足部の痛み）', region: 'knee', owner: 'C' },
  { id: 'calf-strain', ja: 'ふくらはぎの肉離れ（腓腹筋・ヒラメ筋）', region: 'calf', owner: 'C' },
  { id: 'mtss', ja: 'シンスプリント（内側脛骨ストレス症候群）', region: 'calf', owner: 'C' },
  { id: 'tibial-stress-fracture', ja: '脛骨疲労骨折', region: 'calf', owner: 'C' },
  { id: 'muscle-cramps', ja: '運動中の足のつり（運動関連性筋けいれん）', region: 'calf', owner: 'C' },
  // D
  { id: 'achilles-midportion', ja: 'アキレス腱障害（腱の中央部）', region: 'ankle', owner: 'D' },
  { id: 'achilles-insertional', ja: 'アキレス腱付着部症（かかとの後ろ）', region: 'ankle', owner: 'D' },
  { id: 'ankle-sprain', ja: '足首の捻挫・慢性足関節不安定症', region: 'ankle', owner: 'D' },
  { id: 'posterior-tibial-tendinopathy', ja: '後脛骨筋腱障害（内くるぶしの痛み）', region: 'ankle', owner: 'D' },
  { id: 'peroneal-tendinopathy', ja: '腓骨筋腱障害（外くるぶしの痛み）', region: 'ankle', owner: 'D' },
  { id: 'plantar-heel-pain', ja: '足底腱膜炎（足底の踵の痛み）', region: 'foot', owner: 'D' },
  { id: 'metatarsal-stress-fracture', ja: '中足骨疲労骨折', region: 'foot', owner: 'D' },
  { id: 'mortons-neuroma', ja: 'モートン病（趾間神経の痛み）', region: 'foot', owner: 'D' },
  // E
  { id: 'low-back-pain', ja: '腰痛（バイク・ラン姿勢による非特異的腰痛）', region: 'lowback', owner: 'E' },
] as const;
export type ConditionId = (typeof CONDITIONS)[number]['id'];

export const EXERCISES = [
  // ── A: shoulder / neck (14)
  { id: 'ex-isometric-er', ja: '肩の外旋アイソメトリック', owner: 'A' },
  { id: 'ex-sidelying-er', ja: '横向き外旋（サイドライイング外旋）', owner: 'A' },
  { id: 'ex-band-er', ja: 'チューブ外旋', owner: 'A' },
  { id: 'ex-prone-ytw', ja: 'うつ伏せY・T・W', owner: 'A' },
  { id: 'ex-wall-slide', ja: 'ウォールスライド', owner: 'A' },
  { id: 'ex-push-up-plus', ja: 'プッシュアッププラス', owner: 'A' },
  { id: 'ex-band-row', ja: 'チューブロウ', owner: 'A' },
  { id: 'ex-cross-body-stretch', ja: 'クロスボディストレッチ（肩の後ろ）', owner: 'A' },
  { id: 'ex-doorway-pec-stretch', ja: 'ドア枠での胸のストレッチ', owner: 'A' },
  { id: 'ex-lat-stretch', ja: '広背筋ストレッチ', owner: 'A' },
  { id: 'ex-thoracic-extension', ja: 'フォームローラー胸椎伸展', owner: 'A' },
  { id: 'ex-open-book', ja: 'オープンブック（胸椎回旋）', owner: 'A' },
  { id: 'ex-chin-tuck', ja: 'チンタック（あご引き）', owner: 'A' },
  { id: 'ex-upper-trap-stretch', ja: '首の横のストレッチ（僧帽筋上部）', owner: 'A' },
  // ── B: hip (15)
  { id: 'ex-glute-bridge', ja: 'グルートブリッジ', owner: 'B' },
  { id: 'ex-single-leg-bridge', ja: '片脚ブリッジ', owner: 'B' },
  { id: 'ex-clamshell', ja: 'クラムシェル', owner: 'B' },
  { id: 'ex-sidelying-abduction', ja: '横向き脚上げ（股関節外転）', owner: 'B' },
  { id: 'ex-band-walk', ja: 'チューブ横歩き', owner: 'B' },
  { id: 'ex-isometric-abduction', ja: '立位の外転アイソメトリック', owner: 'B' },
  { id: 'ex-hip-flexor-stretch', ja: '片膝立ちの腸腰筋ストレッチ', owner: 'B' },
  { id: 'ex-figure4-stretch', ja: 'フィギュア4ストレッチ（お尻）', owner: 'B' },
  { id: 'ex-copenhagen-plank', ja: 'コペンハーゲンプランク', owner: 'B' },
  { id: 'ex-adductor-squeeze', ja: '内転筋スクイーズ（ボール挟み）', owner: 'B' },
  { id: 'ex-single-leg-rdl', ja: 'シングルレッグ・ルーマニアンデッドリフト', owner: 'B' },
  { id: 'ex-hamstring-bridge-iso', ja: 'ハムストリング・ブリッジ保持', owner: 'B' },
  { id: 'ex-90-90', ja: '90/90 ヒップモビリティ', owner: 'B' },
  { id: 'ex-sciatic-nerve-glide', ja: '坐骨神経グライド', owner: 'B' },
  { id: 'ex-standing-knee-drive', ja: 'チューブ・ニードライブ（腸腰筋）', owner: 'B' },
  // ── C: knee / calf (15)
  { id: 'ex-wall-sit', ja: 'ウォールシット（空気椅子）', owner: 'C' },
  { id: 'ex-decline-squat', ja: '傾斜台スクワット', owner: 'C' },
  { id: 'ex-step-down', ja: 'ステップダウン', owner: 'C' },
  { id: 'ex-split-squat', ja: 'スプリットスクワット', owner: 'C' },
  { id: 'ex-terminal-knee-ext', ja: 'ターミナルニーエクステンション', owner: 'C' },
  { id: 'ex-squat', ja: 'スクワット', owner: 'C' },
  { id: 'ex-quad-stretch', ja: '太もも前のストレッチ', owner: 'C' },
  { id: 'ex-hamstring-stretch', ja: 'ハムストリングストレッチ', owner: 'C' },
  { id: 'ex-calf-raise-straight', ja: 'カーフレイズ（膝を伸ばして）', owner: 'C' },
  { id: 'ex-calf-raise-bent', ja: '膝曲げカーフレイズ（ヒラメ筋）', owner: 'C' },
  { id: 'ex-isometric-calf-hold', ja: 'カーフ・アイソメトリック保持', owner: 'C' },
  { id: 'ex-gastroc-stretch', ja: '腓腹筋ストレッチ（膝を伸ばして）', owner: 'C' },
  { id: 'ex-soleus-stretch', ja: 'ヒラメ筋ストレッチ（膝を曲げて）', owner: 'C' },
  { id: 'ex-tibialis-raise', ja: 'つま先上げ（前脛骨筋）', owner: 'C' },
  { id: 'ex-pogo-hops', ja: 'ポゴジャンプ', owner: 'C' },
  // ── D: ankle / foot (9)
  { id: 'ex-eccentric-heel-drop', ja: 'エキセントリック・ヒールドロップ', owner: 'D' },
  { id: 'ex-heel-drop-floor', ja: 'ヒールドロップ（床の高さで）', owner: 'D' },
  { id: 'ex-band-eversion', ja: 'チューブ外がえし（腓骨筋）', owner: 'D' },
  { id: 'ex-band-inversion', ja: 'チューブ内がえし（後脛骨筋）', owner: 'D' },
  { id: 'ex-single-leg-balance', ja: '片脚バランス', owner: 'D' },
  { id: 'ex-knee-to-wall', ja: 'ニー・トゥ・ウォール（足首の柔軟性）', owner: 'D' },
  { id: 'ex-short-foot', ja: 'ショートフット（アーチを作る）', owner: 'D' },
  { id: 'ex-plantar-fascia-stretch', ja: '足底腱膜ストレッチ', owner: 'D' },
  { id: 'ex-towel-heel-raise', ja: 'タオルを使ったヒールレイズ', owner: 'D' },
  // ── E: core (4)
  { id: 'ex-dead-bug', ja: 'デッドバグ', owner: 'E' },
  { id: 'ex-bird-dog', ja: 'バードドッグ', owner: 'E' },
  { id: 'ex-side-plank', ja: 'サイドプランク', owner: 'E' },
  { id: 'ex-cat-cow', ja: 'キャット＆カウ', owner: 'E' },
] as const;
export type ExerciseId = (typeof EXERCISES)[number]['id'];

// Pain spots — full objects written by owner E (global.ts).
// `views` tells the body map where the spot is drawn: front / back / sole (foot-sole inset).
export const PAIN_SPOTS = [
  { id: 'shoulder-front', ja: '肩の前（腕の付け根の前側）', region: 'shoulder', views: ['front'] },
  { id: 'shoulder-top', ja: '肩の上〜外側', region: 'shoulder', views: ['front', 'back'] },
  { id: 'shoulder-back', ja: '肩の後ろ', region: 'shoulder', views: ['back'] },
  { id: 'scapula-medial', ja: '肩甲骨の内側', region: 'shoulder', views: ['back'] },
  { id: 'neck-base', ja: '首の付け根〜肩の上', region: 'neck', views: ['back'] },
  { id: 'neck-back', ja: '首の後ろ', region: 'neck', views: ['back'] },
  { id: 'lowback-center', ja: '腰（背骨の両わき）', region: 'lowback', views: ['back'] },
  { id: 'hip-outer', ja: 'お尻の横（大転子のあたり）', region: 'hip', views: ['front', 'back'] },
  { id: 'hip-front', ja: '脚の付け根の前', region: 'hip', views: ['front'] },
  { id: 'groin-inner', ja: '内ももの付け根（鼠径部の内側）', region: 'hip', views: ['front'] },
  { id: 'buttock-deep', ja: 'お尻の奥', region: 'hip', views: ['back'] },
  { id: 'sit-bone', ja: '坐骨（座ったときに当たる骨）', region: 'hip', views: ['back'] },
  { id: 'knee-front', ja: '膝のお皿のまわり・奥', region: 'knee', views: ['front'] },
  { id: 'knee-below', ja: 'お皿のすぐ下', region: 'knee', views: ['front'] },
  { id: 'knee-outer', ja: '膝の外側', region: 'knee', views: ['front', 'back'] },
  { id: 'knee-inner', ja: '膝の内側の少し下', region: 'knee', views: ['front'] },
  { id: 'calf-upper', ja: 'ふくらはぎの上〜中央', region: 'calf', views: ['back'] },
  { id: 'calf-lower', ja: 'ふくらはぎの下のほう', region: 'calf', views: ['back'] },
  { id: 'shin-inner', ja: 'すねの内側', region: 'calf', views: ['front'] },
  { id: 'achilles-mid', ja: 'アキレス腱（かかとの少し上）', region: 'ankle', views: ['back'] },
  { id: 'heel-back', ja: 'かかとの後ろ（腱の付け根）', region: 'ankle', views: ['back'] },
  { id: 'ankle-outer', ja: '外くるぶしのまわり', region: 'ankle', views: ['front', 'back'] },
  { id: 'ankle-inner', ja: '内くるぶしの後ろ〜下', region: 'ankle', views: ['front', 'back'] },
  { id: 'heel-bottom', ja: 'かかとの裏', region: 'foot', views: ['sole'] },
  { id: 'arch', ja: '土踏まず', region: 'foot', views: ['sole'] },
  { id: 'forefoot-top', ja: '足の甲', region: 'foot', views: ['front'] },
  { id: 'forefoot-ball', ja: '足指の付け根・指の間', region: 'foot', views: ['sole'] },
] as const;
export type PainSpotId = (typeof PAIN_SPOTS)[number]['id'];

export const GUIDES = [
  { id: 'pain-monitoring', ja: '痛みのモニタリング（どこまで動いてよい？）' },
  { id: 'load-management', ja: '練習量の増やし方（負荷管理）' },
  { id: 'red-flags', ja: 'すぐに受診すべきサイン' },
  { id: 'return-to-run', ja: 'ラン復帰プログラム' },
  { id: 'strength-basics', ja: '補強トレーニングの基本' },
  { id: 'bike-fit', ja: 'バイクポジションと痛み' },
] as const;
export type GuideId = (typeof GUIDES)[number]['id'];

export type ContentOwner = 'A' | 'B' | 'C' | 'D' | 'E';
