// Owner E — see docs/ARCHITECTURE.md and docs/CONTENT_GUIDE.md.
// Regions, pain spots, structures, guides + trunk muscles, low-back condition, core exercises.
import type { Condition, Exercise, Guide, Muscle, PainSpot, Region, Structure } from '../types';

// ═════════════════════════════════════════════════════════════ regions
export const regions: Region[] = [
  {
    id: 'shoulder',
    nameJa: '肩',
    nameEn: 'Shoulder',
    description:
      '肩関節（上腕骨頭と肩甲骨）と、それを支える回旋筋腱板（ローテーターカフ）・肩甲骨まわりの筋肉を扱います。トライアスロンではスイムで最も痛めやすい部位です。',
    disciplineStress: {
      swim: '1時間泳ぐと、片腕で1,000〜2,000回ほど腕を回します。キャッチ〜プルの内旋・内転と、リカバリーで腕を上げる動きが、腱板と滑液包にくり返し負荷をかけます。',
      bike: 'ハンドルやDHバーで上体の重さを支え、肩甲骨が前に出た姿勢が続きます。肩の前や肩甲骨の内側が張りやすくなります。',
      run: '腕振りで使う程度で負荷は小さめです。猫背で肩をすくめた腕振りは、首や肩の上の張りにつながります。',
    },
    keyMuscles: [
      'supraspinatus',
      'infraspinatus',
      'teres-minor',
      'subscapularis',
      'deltoid',
      'pectoralis-major',
      'pectoralis-minor',
      'latissimus-dorsi',
      'serratus-anterior',
      'trapezius',
      'rhomboids',
      'biceps-brachii',
    ],
    keyStructures: [
      'acromion',
      'subacromial-bursa',
      'biceps-long-head-tendon',
      'posterior-capsule',
      'glenoid-labrum',
      'scapula',
      'humeral-head',
      'thoracic-spine',
    ],
  },
  {
    id: 'neck',
    nameJa: '首・肩上部',
    nameEn: 'Neck & upper shoulder',
    description:
      '頸椎（けいつい）と、首から肩の上・肩甲骨の内側へつながる筋肉を扱います。バイクの前傾姿勢と、スイムの呼吸・ヘッドアップで負担がかかる部位です。',
    disciplineStress: {
      swim: '呼吸のたびに首を回し、オープンウォーターのヘッドアップ（前を見る動作）では首を反らします。片側だけの呼吸は左右差の原因になります。',
      bike: '前傾・DHポジションでは、前を見るために首を反らしたまま何時間も保ちます。首の後ろ〜肩の上の筋肉が疲れやすくなります。',
      run: '疲れて頭が前に出る、肩をすくめて走ると、首の付け根が張りやすくなります。',
    },
    keyMuscles: ['trapezius', 'levator-scapulae', 'deep-neck-flexors', 'rhomboids', 'erector-spinae'],
    keyStructures: ['cervical-spine', 'thoracic-spine', 'scapula'],
  },
  {
    id: 'lowback',
    nameJa: '腰・体幹',
    nameEn: 'Low back & trunk',
    description:
      '腰椎・椎間板・仙腸関節（せんちょうかんせつ）と、それを支える体幹の筋肉（脊柱起立筋・多裂筋・腹筋群・腰方形筋）を扱います。3種目すべての姿勢と、力の伝達の土台になる部位です。',
    disciplineStress: {
      swim: '体を水平に保とうとして腰を反らしすぎる、呼吸のたびに大きく体をひねる、下半身が沈んで強いキックで補うと、腰に負担がかかります。',
      bike: '前傾で腰を丸めた姿勢を何時間も保ちます。ハンドルが遠い・低い、サドルが高すぎて骨盤が左右に揺れると、腰の筋肉が疲れやすくなります。',
      run: '着地の衝撃を体幹で受け止めます。疲れて体幹が崩れると腰が反りやすく、バイク直後のランでは股関節前面の硬さがそれを強めます。',
    },
    keyMuscles: [
      'erector-spinae',
      'multifidus',
      'transversus-abdominis',
      'obliques',
      'rectus-abdominis',
      'quadratus-lumborum',
      'iliopsoas',
      'gluteus-maximus',
      'latissimus-dorsi',
    ],
    keyStructures: ['lumbar-spine', 'intervertebral-disc', 'sacroiliac-joint', 'thoracolumbar-fascia'],
  },
  {
    id: 'hip',
    nameJa: '股関節・お尻',
    nameEn: 'Hip & buttock',
    description:
      '股関節と、お尻（殿筋群・深層外旋筋）、脚の付け根の前（腸腰筋）、内もも（内転筋）、坐骨のまわりを扱います。ランの片脚支持とバイクの長時間の股関節屈曲を支える部位です。',
    disciplineStress: {
      swim: '負荷は小さめですが、プルブイを挟むと内ももを使い続けます。平泳ぎのキックは内ももの付け根に負担をかけます。',
      bike: '股関節を深く曲げたまま何時間もペダルを回すため、腸腰筋は縮んだ位置で働き続け、降りた直後は股関節の前がこわばりやすくなります。サドルの圧迫は坐骨やお尻の奥にかかります。',
      run: '片脚支持の連続で、中殿筋が着地のたびに骨盤を水平に支えます。バイク直後は股関節前面が硬く、脚が後ろへ伸びにくくなります。',
    },
    keyMuscles: [
      'gluteus-maximus',
      'gluteus-medius',
      'gluteus-minimus',
      'piriformis',
      'iliopsoas',
      'tensor-fasciae-latae',
      'adductor-longus',
      'adductor-magnus',
      'gracilis',
      'sartorius',
      'rectus-femoris',
      'biceps-femoris',
      'semitendinosus',
      'semimembranosus',
    ],
    keyStructures: [
      'hip-joint',
      'hip-labrum',
      'greater-trochanter',
      'trochanteric-bursa',
      'gluteal-tendons',
      'ischial-tuberosity',
      'proximal-hamstring-tendon',
      'sciatic-nerve',
      'pubic-symphysis',
      'asis',
    ],
  },
  {
    id: 'knee',
    nameJa: '膝',
    nameEn: 'Knee',
    description:
      'お皿（膝蓋骨）と膝蓋腱、膝の外側の腸脛靱帯、内側の鵞足（がそく）などを扱います。バイクでもランでも、くり返し曲げ伸ばしされる関節です。',
    disciplineStress: {
      swim: '負荷は小さめです。ただし平泳ぎのキックは、膝の内側（内側側副靱帯）に負担をかけます。',
      bike: 'ケイデンス80〜90なら、1時間に約5,000回曲げ伸ばしします。サドルが低いとお皿まわり、高いと膝の外側や裏に負担がかかり、クリートの向きは膝の通り道を左右します。',
      run: '着地のたびに体重の数倍の力を受けます。下り坂はお皿まわりと膝の外側に、坂道やスピード練習の急な増加は膝蓋腱に負担をかけます。',
    },
    keyMuscles: [
      'rectus-femoris',
      'vastus-lateralis',
      'vastus-medialis',
      'biceps-femoris',
      'semitendinosus',
      'semimembranosus',
      'gracilis',
      'sartorius',
      'tensor-fasciae-latae',
      'gastrocnemius',
      'gluteus-medius',
    ],
    keyStructures: [
      'patella',
      'patellar-tendon',
      'quadriceps-tendon',
      'patellofemoral-cartilage',
      'iliotibial-band',
      'lateral-femoral-epicondyle',
      'pes-anserinus',
      'pes-anserine-bursa',
      'meniscus',
      'mcl',
    ],
  },
  {
    id: 'calf',
    nameJa: 'ふくらはぎ・すね',
    nameEn: 'Calf & shin',
    description:
      'ふくらはぎ（腓腹筋・ヒラメ筋）と、すね（脛骨・前脛骨筋）を扱います。ランの着地と蹴り出しを担い、肉離れ・シンスプリント・疲労骨折が起こる部位です。',
    disciplineStress: {
      swim: 'つま先を伸ばしたキックでは、ふくらはぎが縮んだ位置で働き続けます。疲れてくると、つりやすくなります。',
      bike: 'ペダルを踏み込む最後に足首を固め、ふくらはぎが働きます。サドルが高すぎるとつま先で踏みがちになり、負担が増えます。',
      run: 'ヒラメ筋は着地のたびに体重の数倍の力を受け止めます。距離・スピード・坂の急な増加や、シューズの急な変更が骨と筋肉に負担をかけます。',
    },
    keyMuscles: [
      'gastrocnemius',
      'soleus',
      'tibialis-anterior',
      'tibialis-posterior',
      'flexor-hallucis-longus',
      'fibularis-longus',
    ],
    keyStructures: ['tibia', 'medial-tibial-border', 'fibula', 'achilles-tendon'],
  },
  {
    id: 'ankle',
    nameJa: '足首・アキレス腱',
    nameEn: 'Ankle & Achilles',
    description:
      'アキレス腱と、くるぶしのまわりの靱帯・腱（腓骨筋腱・後脛骨筋腱）を扱います。ランの「バネ」と、足首の安定を担う部位です。',
    disciplineStress: {
      swim: '足首を伸ばした（底屈した）キックが続くため、ふくらはぎ〜アキレス腱がつりやすい姿勢です。足首が硬いとキックの推進力が落ちます。',
      bike: 'ペダリングで足首をくり返し動かします。クリートが前すぎる、サドルが高すぎるとアキレス腱の負担が増えます。',
      run: 'アキレス腱は着地のたびに体重の数倍の力を受けるバネです。坂道・スピード練習・シューズの急な変更、トレイルや不整地での捻挫に注意が必要です。',
    },
    keyMuscles: [
      'gastrocnemius',
      'soleus',
      'tibialis-posterior',
      'fibularis-longus',
      'fibularis-brevis',
      'flexor-hallucis-longus',
      'tibialis-anterior',
    ],
    keyStructures: [
      'achilles-tendon',
      'calcaneus',
      'retrocalcaneal-bursa',
      'talus',
      'atfl',
      'cfl',
      'lateral-malleolus',
      'medial-malleolus',
      'tibialis-posterior-tendon',
      'peroneal-tendons',
    ],
  },
  {
    id: 'foot',
    nameJa: '足裏・足部',
    nameEn: 'Foot & sole',
    description:
      '足底腱膜・踵の脂肪体・土踏まず（内側縦アーチ）・中足骨・足の指の付け根の神経を扱います。地面からの衝撃を最初に受ける部位です。',
    disciplineStress: {
      swim: '負荷は小さめですが、つま先を伸ばしたキックで足の裏がつることがあります。',
      bike: 'ペダルの圧力が足の指の付け根（中足骨の頭）に集中します。幅の狭いシューズや締めすぎは趾間神経を圧迫し、しびれの原因になります。',
      run: '着地で踵とアーチに、蹴り出しで中足骨に大きな負荷がかかります。距離の急な増加や、薄底・厚底シューズへの急な変更で負担が変わります。',
    },
    keyMuscles: [
      'abductor-hallucis',
      'flexor-digitorum-brevis',
      'flexor-hallucis-longus',
      'tibialis-posterior',
      'fibularis-longus',
      'gastrocnemius',
      'soleus',
    ],
    keyStructures: [
      'plantar-fascia',
      'heel-fat-pad',
      'calcaneus',
      'navicular',
      'medial-arch',
      'metatarsals',
      'interdigital-nerve',
    ],
  },
];

// ═════════════════════════════════════════════════════════════ pain spots
// conditions: exactly as docs/PAIN_SPOT_MAP.md (order & likelihood).
export const painSpots: PainSpot[] = [
  // ── shoulder
  {
    id: 'shoulder-front',
    region: 'shoulder',
    label: '肩の前（腕の付け根の前側）',
    hint: 'クロールのキャッチ〜プル、腕を前や上に上げる、重い物を持ち上げる動作で痛む',
    conditions: [
      { id: 'biceps-tendinopathy', likelihood: 'common' },
      { id: 'swimmers-shoulder', likelihood: 'common' },
    ],
  },
  {
    id: 'shoulder-top',
    region: 'shoulder',
    label: '肩の上〜外側',
    hint: '腕を横から上げる途中（60〜120°あたり）やリカバリーで痛む、痛い側を下にして寝ると痛む',
    conditions: [{ id: 'swimmers-shoulder', likelihood: 'common' }],
  },
  {
    id: 'shoulder-back',
    region: 'shoulder',
    label: '肩の後ろ',
    hint: 'リカバリーで腕を前へ回す、腕を体の前で反対側へ回すと詰まる・痛む',
    conditions: [
      { id: 'swimmers-shoulder', likelihood: 'possible' },
      { id: 'scapular-dyskinesis', likelihood: 'possible' },
    ],
  },
  {
    id: 'scapula-medial',
    region: 'shoulder',
    label: '肩甲骨の内側',
    hint: '長いスイムやバイクの後に、背骨と肩甲骨の間が張る・重だるい',
    conditions: [
      { id: 'scapular-dyskinesis', likelihood: 'common' },
      { id: 'cyclist-neck-pain', likelihood: 'possible' },
    ],
  },
  // ── neck
  {
    id: 'neck-base',
    region: 'neck',
    label: '首の付け根〜肩の上',
    hint: 'DHポジションで前を見続ける、呼吸のたびに首を回す、肩をすくめて走ると張る',
    conditions: [
      { id: 'cyclist-neck-pain', likelihood: 'common' },
      { id: 'scapular-dyskinesis', likelihood: 'possible' },
    ],
  },
  {
    id: 'neck-back',
    region: 'neck',
    label: '首の後ろ',
    hint: 'バイクで前を見るために首を反らし続ける、オープンウォーターのヘッドアップで痛む',
    conditions: [{ id: 'cyclist-neck-pain', likelihood: 'common' }],
  },
  // ── low back
  {
    id: 'lowback-center',
    region: 'lowback',
    label: '腰（背骨の両わき）',
    hint: '長いライドの後半やDHポジション、ブリックランの走り始め、長く座った後の立ち上がりで痛む',
    conditions: [{ id: 'low-back-pain', likelihood: 'common' }],
  },
  // ── hip
  {
    id: 'hip-outer',
    region: 'hip',
    label: 'お尻の横（大転子のあたり）',
    hint: '痛い側を下にして寝る、脚を組む、片脚立ちや階段の上りで痛む',
    conditions: [{ id: 'gluteal-tendinopathy', likelihood: 'common' }],
  },
  {
    id: 'hip-front',
    region: 'hip',
    label: '脚の付け根の前',
    hint: '脚を前に振り出す、バイク後のラン、坂道ダッシュやスピード練習で痛む。走ると付け根の奥が痛み、歩くだけでも痛む場合は疲労骨折に注意',
    conditions: [
      { id: 'hip-flexor-pain', likelihood: 'common' },
      { id: 'adductor-groin-pain', likelihood: 'possible' },
    ],
  },
  {
    id: 'groin-inner',
    region: 'hip',
    label: '内ももの付け根（鼠径部の内側）',
    hint: '脚を閉じる力を入れる、平泳ぎのキック、スピード練習や坂道で痛む',
    conditions: [
      { id: 'adductor-groin-pain', likelihood: 'common' },
      { id: 'hip-flexor-pain', likelihood: 'possible' },
    ],
  },
  {
    id: 'buttock-deep',
    region: 'hip',
    label: 'お尻の奥',
    hint: '長く座る・サドルに座り続けると痛む、お尻から太ももの裏へ響く、腰の動きで変わることもある',
    conditions: [
      { id: 'deep-gluteal-syndrome', likelihood: 'common' },
      { id: 'proximal-hamstring-tendinopathy', likelihood: 'possible' },
      { id: 'low-back-pain', likelihood: 'possible' },
    ],
  },
  {
    id: 'sit-bone',
    region: 'hip',
    label: '坐骨（座ったときに当たる骨）',
    hint: '硬い椅子やサドルに座る、坂道を上る、前屈やスピード走で痛む',
    conditions: [
      { id: 'proximal-hamstring-tendinopathy', likelihood: 'common' },
      { id: 'deep-gluteal-syndrome', likelihood: 'possible' },
    ],
  },
  // ── knee
  {
    id: 'knee-front',
    region: 'knee',
    label: '膝のお皿のまわり・奥',
    hint: '階段や坂の下り、しゃがむ動作、長く座った後の立ち上がりで痛む',
    conditions: [
      { id: 'patellofemoral-pain', likelihood: 'common' },
      { id: 'patellar-tendinopathy', likelihood: 'possible' },
    ],
  },
  {
    id: 'knee-below',
    region: 'knee',
    label: 'お皿のすぐ下',
    hint: '坂道ダッシュや重いギアの踏み込みで痛む、走り始めに痛み、温まると軽くなる',
    conditions: [
      { id: 'patellar-tendinopathy', likelihood: 'common' },
      { id: 'patellofemoral-pain', likelihood: 'possible' },
    ],
  },
  {
    id: 'knee-outer',
    region: 'knee',
    label: '膝の外側',
    hint: '走り始めて一定の距離・時間で決まって痛み出す、下り坂で悪化する',
    conditions: [{ id: 'itb-syndrome', likelihood: 'common' }],
  },
  {
    id: 'knee-inner',
    region: 'knee',
    label: '膝の内側の少し下',
    hint: '階段の上り下りや椅子からの立ち上がり、膝が内に入るペダリングや走り方で痛む、押すと痛い',
    conditions: [{ id: 'pes-anserine-pain', likelihood: 'common' }],
  },
  // ── calf / shin
  {
    id: 'calf-upper',
    region: 'calf',
    label: 'ふくらはぎの上〜中央',
    hint: 'スピードを上げた瞬間や坂道で急にピキッと痛む、レース中や水中で急につる',
    conditions: [
      { id: 'calf-strain', likelihood: 'common' },
      { id: 'muscle-cramps', likelihood: 'common' },
    ],
  },
  {
    id: 'calf-lower',
    region: 'calf',
    label: 'ふくらはぎの下のほう',
    hint: '長い距離の後半やつま先立ち・蹴り出しで痛む、夜間やスイム中につる',
    conditions: [
      { id: 'calf-strain', likelihood: 'common' },
      { id: 'achilles-midportion', likelihood: 'possible' },
      { id: 'muscle-cramps', likelihood: 'possible' },
    ],
  },
  {
    id: 'shin-inner',
    region: 'calf',
    label: 'すねの内側',
    hint: 'ランの量を急に増やした後、走り始めに痛む。一点が強く痛む・歩くだけで痛む場合は疲労骨折に注意',
    conditions: [
      { id: 'mtss', likelihood: 'common' },
      { id: 'tibial-stress-fracture', likelihood: 'possible' },
    ],
  },
  // ── ankle
  {
    id: 'achilles-mid',
    region: 'ankle',
    label: 'アキレス腱（かかとの少し上）',
    hint: '朝の最初の数歩や走り始めにこわばって痛む、坂道やスピード練習の翌日に悪化する',
    conditions: [{ id: 'achilles-midportion', likelihood: 'common' }],
  },
  {
    id: 'heel-back',
    region: 'ankle',
    label: 'かかとの後ろ（腱の付け根）',
    hint: '靴のかかとが当たると痛む、坂道の上りや、ふくらはぎを伸ばすストレッチで悪化する',
    conditions: [{ id: 'achilles-insertional', likelihood: 'common' }],
  },
  {
    id: 'ankle-outer',
    region: 'ankle',
    label: '外くるぶしのまわり',
    hint: '足首をひねった後に腫れて痛む、トレイルや傾いた路面で痛む・不安定に感じる',
    conditions: [
      { id: 'ankle-sprain', likelihood: 'common' },
      { id: 'peroneal-tendinopathy', likelihood: 'common' },
    ],
  },
  {
    id: 'ankle-inner',
    region: 'ankle',
    label: '内くるぶしの後ろ〜下',
    hint: '長く歩く・走る、つま先立ちで痛む、土踏まずが下がってきた感じがする',
    conditions: [{ id: 'posterior-tibial-tendinopathy', likelihood: 'common' }],
  },
  // ── foot
  {
    id: 'heel-bottom',
    region: 'foot',
    label: 'かかとの裏',
    hint: '朝起きて最初の一歩や、長く座った後の歩き始めに痛む、硬い地面で悪化する',
    conditions: [{ id: 'plantar-heel-pain', likelihood: 'common' }],
  },
  {
    id: 'arch',
    region: 'foot',
    label: '土踏まず',
    hint: '長い距離を走った後や、底の薄い靴で痛む、つま先を反らすと張る',
    conditions: [
      { id: 'plantar-heel-pain', likelihood: 'possible' },
      { id: 'posterior-tibial-tendinopathy', likelihood: 'possible' },
    ],
  },
  {
    id: 'forefoot-top',
    region: 'foot',
    label: '足の甲',
    hint: 'ランの量やスピードを急に増やした後に痛む、甲が腫れる。骨の一点を押すと強く痛む場合は疲労骨折に注意',
    conditions: [{ id: 'metatarsal-stress-fracture', likelihood: 'common' }],
  },
  {
    id: 'forefoot-ball',
    region: 'foot',
    label: '足指の付け根・指の間',
    hint: '幅の狭い靴やきついバイクシューズで指の間がしびれる・焼けるように痛む、小石を踏んでいる感じがする',
    conditions: [
      { id: 'mortons-neuroma', likelihood: 'common' },
      { id: 'metatarsal-stress-fracture', likelihood: 'possible' },
    ],
  },
];

// ═════════════════════════════════════════════════════════════ structures
export const structures: Structure[] = [
  // ── shoulder / thorax
  {
    id: 'acromion',
    nameJa: '肩峰',
    kana: 'けんぽう',
    nameEn: 'Acromion',
    kind: 'bone',
    regions: ['shoulder'],
    description:
      '肩甲骨の外側の端が張り出した、肩の「屋根」にあたる骨です。その下を腱板（棘上筋の腱）と滑液包が通ります。腱板が弱って負荷に耐えにくくなると、腕を上げる途中でこのすき間の組織が痛むことがあります。',
  },
  {
    id: 'subacromial-bursa',
    nameJa: '肩峰下滑液包',
    kana: 'けんぽうかかつえきほう',
    nameEn: 'Subacromial bursa',
    kind: 'bursa',
    regions: ['shoulder'],
    description:
      '肩峰と腱板の間にある、液体の入った薄い袋です。腱が骨の下をなめらかに滑るためのクッションです。腱板に負担がかかり続けると一緒に刺激され、肩の上〜外側の痛みの原因になります。',
  },
  {
    id: 'biceps-long-head-tendon',
    nameJa: '上腕二頭筋長頭腱',
    kana: 'じょうわんにとうきんちょうとうけん',
    nameEn: 'Long head of biceps tendon',
    kind: 'tendon',
    regions: ['shoulder'],
    description:
      '上腕二頭筋の長いほうの腱で、肩の前の骨の溝（結節間溝）を通って関節の中に入り、肩甲骨の上に付きます。スイムのキャッチで肩の前に負担が続くと、溝の中で刺激されて肩の前の痛みになります。',
  },
  {
    id: 'posterior-capsule',
    nameJa: '肩関節の後方関節包',
    kana: 'かたかんせつのこうほうかんせつほう',
    nameEn: 'Posterior shoulder capsule',
    kind: 'capsule',
    regions: ['shoulder'],
    description:
      '肩関節を後ろ側から包む膜です。硬くなると、腕を内側にひねる動き（内旋）や、腕を体の前で反対側へ回す動きが小さくなります。その分、上腕骨頭が前や上にずれやすくなると考えられています。',
  },
  {
    id: 'glenoid-labrum',
    nameJa: '肩関節唇',
    kana: 'かたかんせつしん',
    nameEn: 'Glenoid labrum',
    kind: 'cartilage',
    regions: ['shoulder'],
    description:
      '肩甲骨の浅い受け皿（関節窩）のふちを囲む、線維軟骨のリングです。受け皿を深くして上腕骨頭を安定させます。転倒やくり返しの大きな負荷で傷むと、引っかかり感や肩の奥の痛みが出ることがあります。',
  },
  {
    id: 'scapula',
    nameJa: '肩甲骨',
    kana: 'けんこうこつ',
    nameEn: 'Scapula (shoulder blade)',
    kind: 'bone',
    regions: ['shoulder', 'neck'],
    description:
      '背中の上にある三角形の平たい骨で、17の筋肉が付きます。腕を動かす土台として、肋骨の上を滑るように動きます。この動きが乱れると、肩や首の痛みにつながります。',
  },
  {
    id: 'humeral-head',
    nameJa: '上腕骨頭',
    kana: 'じょうわんこっとう',
    nameEn: 'Humeral head',
    kind: 'bone',
    regions: ['shoulder'],
    description:
      '二の腕の骨（上腕骨）の上端にある丸い部分で、肩甲骨の浅い受け皿にはまって肩関節をつくります。受け皿に比べて大きいため、腱板の筋肉が中心に引き寄せて安定させています。',
  },
  {
    id: 'thoracic-spine',
    nameJa: '胸椎',
    kana: 'きょうつい',
    nameEn: 'Thoracic spine',
    kind: 'bone',
    regions: ['shoulder', 'neck', 'lowback'],
    description:
      '背中の部分にある12個の背骨で、肋骨とつながって胸郭をつくります。ここが丸まって硬いと、腕を上げる・前を見る・体をひねる動きを、肩や首や腰が代わりに担うことになり、負担が増えます。',
  },
  // ── neck
  {
    id: 'cervical-spine',
    nameJa: '頸椎',
    kana: 'けいつい',
    nameEn: 'Cervical spine',
    kind: 'bone',
    regions: ['neck'],
    description:
      '首の部分にある7個の背骨で、約5kgある頭を支えています。バイクの前傾姿勢で前を見続けると、首の付け根は前に倒れ、頭の付け根は強く反った位置に保たれます。首の後ろの筋肉や小さな関節（椎間関節）に負担がかかります。',
  },
  // ── low back
  {
    id: 'lumbar-spine',
    nameJa: '腰椎',
    kana: 'ようつい',
    nameEn: 'Lumbar spine',
    kind: 'bone',
    regions: ['lowback'],
    description:
      '腰の部分にある5個の背骨で、上半身の重さを支える太く大きな椎骨です。後ろ側の小さな関節（椎間関節）は、腰を反らす・ひねる動きで負担がかかります。',
  },
  {
    id: 'intervertebral-disc',
    nameJa: '椎間板',
    kana: 'ついかんばん',
    nameEn: 'Intervertebral disc',
    kind: 'cartilage',
    regions: ['lowback', 'neck'],
    description:
      '背骨と背骨の間のクッションで、外側の丈夫な線維輪と、中心のゼリー状の髄核からできています。長時間の前かがみで負担が増えます。MRIで見つかる変性や膨らみは痛みのない人にも多く、それだけで痛みの原因とは限りません。',
  },
  {
    id: 'sacroiliac-joint',
    nameJa: '仙腸関節',
    kana: 'せんちょうかんせつ',
    nameEn: 'Sacroiliac joint',
    kind: 'joint',
    regions: ['lowback', 'hip'],
    description:
      '背骨の土台である仙骨と、骨盤の腸骨をつなぐ関節です。強い靱帯で固められて動きはごくわずかですが、上半身と脚の間で力を伝えます。片側のお尻の上や奥の痛みとして感じられることがあります。',
  },
  {
    id: 'thoracolumbar-fascia',
    nameJa: '胸腰筋膜',
    kana: 'きょうようきんまく',
    nameEn: 'Thoracolumbar fascia',
    kind: 'fascia',
    regions: ['lowback'],
    description:
      '腰の筋肉を包み、広背筋・大殿筋・腹横筋などをつなぐ厚い膜です。腕と反対側の脚の力を、体幹を通して伝えるつなぎ役です。感覚神経が豊富で、腰の痛みの発生源の一つと考えられています。',
  },
  // ── hip
  {
    id: 'hip-joint',
    nameJa: '股関節',
    kana: 'こかんせつ',
    nameEn: 'Hip joint',
    kind: 'joint',
    regions: ['hip'],
    description:
      '太ももの骨の丸い頭（大腿骨頭）が、骨盤の深い受け皿（寛骨臼）にはまった関節です。ランでは着地のたびに体重の数倍の力を受けます。脚の付け根の前の深い痛みは、股関節そのものの問題のこともあります。',
  },
  {
    id: 'hip-labrum',
    nameJa: '股関節唇',
    kana: 'こかんせつしん',
    nameEn: 'Hip labrum (acetabular labrum)',
    kind: 'cartilage',
    regions: ['hip'],
    description:
      '股関節の受け皿のふちを囲む線維軟骨のリングで、関節を密閉して安定させます。大腿骨や受け皿の形に特徴（FAIと呼ばれる形）がある人が深く曲げる動作をくり返すと傷むことがあり、脚の付け根の前の引っかかり感や痛みの原因になります。',
  },
  {
    id: 'greater-trochanter',
    nameJa: '大転子',
    kana: 'だいてんし',
    nameEn: 'Greater trochanter',
    kind: 'bone',
    regions: ['hip'],
    description:
      '太ももの骨の上の外側にある大きな出っ張りで、お尻の横で触れられます。中殿筋・小殿筋・梨状筋などが付き、その上を腸脛靱帯が覆っています。',
  },
  {
    id: 'trochanteric-bursa',
    nameJa: '大転子滑液包',
    kana: 'だいてんしかつえきほう',
    nameEn: 'Trochanteric bursa',
    kind: 'bursa',
    regions: ['hip'],
    description:
      '大転子と、その上を覆う大殿筋・腸脛靱帯の間にある滑液包です。以前はお尻の横の痛みの主な原因と考えられていましたが、現在は殿筋の腱の問題が主で、滑液包は一緒に刺激される脇役と考えられています。',
  },
  {
    id: 'gluteal-tendons',
    nameJa: '中殿筋・小殿筋の腱',
    kana: 'ちゅうでんきん・しょうでんきんのけん',
    nameEn: 'Gluteus medius & minimus tendons',
    kind: 'tendon',
    regions: ['hip'],
    description:
      '中殿筋・小殿筋が大転子に付く部分の腱です。片脚で立つたびに、骨盤を支える大きな力がかかります。脚を組む、骨盤が横に落ちるなど太ももが内側に入る姿勢で腱が大転子に押し付けられ、負荷の急増と重なると腱障害を起こします。',
  },
  {
    id: 'ischial-tuberosity',
    nameJa: '坐骨結節',
    kana: 'ざこつけっせつ',
    nameEn: 'Ischial tuberosity (sit bone)',
    kind: 'bone',
    regions: ['hip'],
    description:
      '骨盤の一番下にある出っ張りで、座ったときに座面に当たる骨です。ハムストリングスの腱が付き、サドルに座るとここに体重がかかります。',
  },
  {
    id: 'proximal-hamstring-tendon',
    nameJa: 'ハムストリングの付け根の腱',
    nameEn: 'Proximal hamstring tendon',
    kind: 'tendon',
    regions: ['hip'],
    description:
      '太ももの裏の筋肉（ハムストリングス）が坐骨結節に付く部分の腱です。前かがみで股関節を深く曲げると、腱が引き伸ばされながら骨に押し付けられます。坂道・スピード走・サドルの圧迫で痛みやすい部分です。',
  },
  {
    id: 'sciatic-nerve',
    nameJa: '坐骨神経',
    kana: 'ざこつしんけい',
    nameEn: 'Sciatic nerve',
    kind: 'nerve',
    regions: ['hip', 'lowback'],
    description:
      '腰と仙骨から出る神経（L4–S3）が集まった、体で最も太い神経です。お尻の奥で梨状筋の下を通り、太ももの裏を下って膝の裏の少し上で2本（脛骨神経・総腓骨神経）に分かれます。圧迫や刺激を受けると、お尻から脚へ広がる痛みやしびれが出ます。',
  },
  {
    id: 'pubic-symphysis',
    nameJa: '恥骨結合',
    kana: 'ちこつけつごう',
    nameEn: 'Pubic symphysis',
    kind: 'joint',
    regions: ['hip'],
    description:
      '左右の恥骨が、体の前で線維軟骨の円板によってつながる部分です。上から腹直筋、下から内転筋が付き、反対向きに引っ張り合います。負荷が重なると、鼠径部（脚の付け根の内側）の痛みの原因になります。',
  },
  {
    id: 'asis',
    nameJa: '上前腸骨棘',
    kana: 'じょうぜんちょうこつきょく',
    nameEn: 'Anterior superior iliac spine (ASIS)',
    kind: 'bone',
    regions: ['hip'],
    description:
      '腰骨の前に出っ張った部分で、ベルトの前あたりで触れられます。縫工筋と大腿筋膜張筋が付き、すぐ内側を太ももの外側の感覚を伝える神経（外側大腿皮神経）が通ります。深い前傾や締め付けで、この神経が圧迫されることがあります。',
  },
  // ── knee
  {
    id: 'patella',
    nameJa: '膝蓋骨（お皿）',
    kana: 'しつがいこつ',
    nameEn: 'Patella (kneecap)',
    kind: 'bone',
    regions: ['knee'],
    description:
      '膝の前にある「お皿」で、大腿四頭筋の腱の中にある骨です。てこの支点のように働き、膝を伸ばす力を効率よく伝えます。裏側は太ももの骨の溝にはまり、曲げ伸ばしのたびに滑ります。',
  },
  {
    id: 'patellar-tendon',
    nameJa: '膝蓋腱',
    kana: 'しつがいけん',
    nameEn: 'Patellar tendon',
    kind: 'tendon',
    regions: ['knee'],
    description:
      'お皿の下の端から、すねの骨の前の出っ張りである脛骨粗面（けいこつそめん）までをつなぐ太い腱です（膝蓋靱帯とも呼ばれます）。ジャンプや坂道ダッシュ、重いギアの踏み込みなど、膝を曲げた位置から強く伸ばす動きで大きな負荷がかかります。',
  },
  {
    id: 'quadriceps-tendon',
    nameJa: '大腿四頭筋腱',
    kana: 'だいたいしとうきんけん',
    nameEn: 'Quadriceps tendon',
    kind: 'tendon',
    regions: ['knee'],
    description:
      '太ももの前の4つの筋肉（大腿四頭筋）がまとまり、お皿の上の端に付く腱です。膝を伸ばす力をお皿に伝えます。負担が続くと、お皿のすぐ上の痛みとして出ることがあります。',
  },
  {
    id: 'patellofemoral-cartilage',
    nameJa: '膝蓋大腿関節の軟骨',
    kana: 'しつがいだいたいかんせつのなんこつ',
    nameEn: 'Patellofemoral joint cartilage',
    kind: 'cartilage',
    regions: ['knee'],
    description:
      'お皿の裏側と、太ももの骨の溝を覆うなめらかな軟骨です。体の中で最も厚い軟骨の一つで、しゃがむ・階段を下りるときに大きな圧力を受けます。軟骨そのものには神経がなく、痛みは周りの骨や組織から出ると考えられています。',
  },
  {
    id: 'iliotibial-band',
    nameJa: '腸脛靱帯',
    kana: 'ちょうけいじんたい',
    nameEn: 'Iliotibial band (ITB)',
    kind: 'fascia',
    regions: ['knee', 'hip'],
    description:
      '骨盤の横から膝の外側（脛骨の外側の出っ張り）まで、太ももの外側を走る厚い帯状の筋膜です。大腿筋膜張筋と大殿筋がつながっています。非常に丈夫な組織で、ストレッチやフォームローラーで長さを変えることはほぼできません。',
  },
  {
    id: 'lateral-femoral-epicondyle',
    nameJa: '大腿骨外側上顆',
    kana: 'だいたいこつがいそくじょうか',
    nameEn: 'Lateral femoral epicondyle',
    kind: 'bone',
    regions: ['knee'],
    description:
      '太ももの骨の下の端、膝の外側にある出っ張りです。膝を30°前後曲げたとき、腸脛靱帯の下にある神経の多い脂肪の層がこの骨との間で圧迫され、ランの膝の外側の痛みが出ると考えられています。',
  },
  {
    id: 'pes-anserinus',
    nameJa: '鵞足',
    kana: 'がそく',
    nameEn: 'Pes anserinus',
    kind: 'tendon',
    regions: ['knee'],
    description:
      '縫工筋・薄筋・半腱様筋の3つの腱が、膝の内側の少し下で脛骨に並んで付く部分です。形がガチョウの足に似ていることから名付けられました。膝が内に入る動きや、くり返しの曲げ伸ばしで負担がかかります。',
  },
  {
    id: 'pes-anserine-bursa',
    nameJa: '鵞足包',
    kana: 'がそくほう',
    nameEn: 'Pes anserine bursa',
    kind: 'bursa',
    regions: ['knee'],
    description:
      '鵞足の腱と脛骨（および内側側副靱帯）の間にある滑液包です。腱がなめらかに滑るためのクッションで、刺激されると膝の内側の少し下が押して痛むようになります。',
  },
  {
    id: 'meniscus',
    nameJa: '半月板',
    kana: 'はんげつばん',
    nameEn: 'Meniscus',
    kind: 'cartilage',
    regions: ['knee'],
    description:
      '太ももの骨とすねの骨の間に、内側・外側1つずつある三日月形の線維軟骨です。衝撃を吸収し、関節を安定させます。ひねりながらしゃがむ動作で傷むことがあり、腫れ・引っかかり・膝が伸びきらない症状が出ます。',
  },
  {
    id: 'mcl',
    nameJa: '内側側副靱帯',
    kana: 'ないそくそくふくじんたい',
    nameEn: 'Medial collateral ligament (MCL)',
    kind: 'ligament',
    regions: ['knee'],
    description:
      '膝の内側で、太ももの骨とすねの骨をつなぐ靱帯です。膝が内側に折れる（X脚方向の）力を止めます。平泳ぎのキックで負担がかかることがあり、鵞足の痛みと場所が近いため区別が必要です。',
  },
  // ── calf / shin
  {
    id: 'tibia',
    nameJa: '脛骨',
    kana: 'けいこつ',
    nameEn: 'Tibia (shin bone)',
    kind: 'bone',
    regions: ['calf', 'knee', 'ankle'],
    description:
      'すねの太い骨で、体重のほとんどを支えます。ランでは着地のたびにしなる力がかかります。回復が追いつかないと骨の小さな傷みがたまり、骨のストレス反応や疲労骨折につながります。',
  },
  {
    id: 'medial-tibial-border',
    nameJa: '脛骨内側縁（骨膜）',
    kana: 'けいこつないそくえん（こつまく）',
    nameEn: 'Medial tibial border (periosteum)',
    kind: 'bone',
    regions: ['calf'],
    description:
      'すねの骨の内側のふちと、骨を覆う膜（骨膜）です。ヒラメ筋などが筋膜を介して付いています。ランの負荷がくり返されると骨と骨膜が反応し、シンスプリントの痛みが出ます。',
  },
  {
    id: 'fibula',
    nameJa: '腓骨',
    kana: 'ひこつ',
    nameEn: 'Fibula',
    kind: 'bone',
    regions: ['calf', 'ankle'],
    description:
      'すねの外側にある細い骨です。体重を支える割合は小さいものの、足首の外側（外くるぶし）をつくり、腓骨筋などが付きます。下のほうに疲労骨折が起こることがあります。',
  },
  // ── ankle
  {
    id: 'achilles-tendon',
    nameJa: 'アキレス腱',
    nameEn: 'Achilles tendon',
    kind: 'tendon',
    regions: ['ankle', 'calf'],
    description:
      '腓腹筋とヒラメ筋がまとまって踵骨に付く、体で最も太く強い腱です。ランでは体重の数倍の力を受け止め、バネのようにエネルギーをためて返します。かかとの2〜6cm上の中央部と、骨に付く部分が痛みやすい場所です。',
  },
  {
    id: 'calcaneus',
    nameJa: '踵骨',
    kana: 'しょうこつ',
    nameEn: 'Calcaneus (heel bone)',
    kind: 'bone',
    regions: ['ankle', 'foot'],
    description:
      '足で一番大きな骨で、かかとをつくります。後ろにアキレス腱が付き、底には足底腱膜や足の裏の筋肉が付きます。着地で最初に地面に当たる骨です。',
  },
  {
    id: 'retrocalcaneal-bursa',
    nameJa: '踵骨後部滑液包',
    kana: 'しょうこつこうぶかつえきほう',
    nameEn: 'Retrocalcaneal bursa',
    kind: 'bursa',
    regions: ['ankle'],
    description:
      'アキレス腱と踵骨の上の角の間にある滑液包です。足首を強く反らす（背屈する）と、腱と骨の間で挟まれます。靴のかかとの圧迫や坂道で刺激され、かかとの後ろの痛みの原因になります。',
  },
  {
    id: 'talus',
    nameJa: '距骨',
    kana: 'きょこつ',
    nameEn: 'Talus',
    kind: 'bone',
    regions: ['ankle'],
    description:
      'すねの骨と踵骨の間にあり、足首の関節をつくる骨です。筋肉が1つも付かない珍しい骨で、表面の多くが軟骨に覆われています。強い捻挫で軟骨が傷むことがあります。',
  },
  {
    id: 'atfl',
    nameJa: '前距腓靱帯',
    kana: 'ぜんきょひじんたい',
    nameEn: 'Anterior talofibular ligament (ATFL)',
    kind: 'ligament',
    regions: ['ankle'],
    description:
      '外くるぶしの前から距骨へつながる靱帯で、足首を内側にひねる捻挫で最も傷みやすい部分です。不整地やトレイルでの着地、疲れた状態でのランで捻りやすくなります。',
  },
  {
    id: 'cfl',
    nameJa: '踵腓靱帯',
    kana: 'しょうひじんたい',
    nameEn: 'Calcaneofibular ligament (CFL)',
    kind: 'ligament',
    regions: ['ankle'],
    description:
      '外くるぶしの先から踵骨へ、下向きにつながる靱帯です。強い捻挫では前距腓靱帯に続いて傷み、足首の不安定さが残る原因になります。',
  },
  {
    id: 'lateral-malleolus',
    nameJa: '外果（外くるぶし）',
    kana: 'がいか',
    nameEn: 'Lateral malleolus',
    kind: 'bone',
    regions: ['ankle'],
    description:
      '腓骨の下端で、足首の外側の出っ張り（外くるぶし）です。前距腓靱帯と踵腓靱帯が付き、後ろを腓骨筋腱が回り込みます。捻挫の後、この骨の後ろのふちや先端を押して強く痛む場合は骨折の可能性があります。',
  },
  {
    id: 'medial-malleolus',
    nameJa: '内果（内くるぶし）',
    kana: 'ないか',
    nameEn: 'Medial malleolus',
    kind: 'bone',
    regions: ['ankle'],
    description:
      '脛骨の下端で、足首の内側の出っ張り（内くるぶし）です。後ろを後脛骨筋腱などの腱と、神経・血管が通ります。下には内側の丈夫な靱帯（三角靱帯）が付きます。',
  },
  {
    id: 'tibialis-posterior-tendon',
    nameJa: '後脛骨筋腱',
    kana: 'こうけいこつきんけん',
    nameEn: 'Tibialis posterior tendon',
    kind: 'tendon',
    regions: ['ankle', 'foot'],
    description:
      'ふくらはぎの深い筋肉（後脛骨筋）の腱で、内くるぶしの後ろを回って舟状骨など足の裏の骨に付きます。土踏まずを下から引き上げて支えます。傷むと内くるぶしの後ろ〜下が痛み、アーチが下がることがあります。',
  },
  {
    id: 'peroneal-tendons',
    nameJa: '腓骨筋腱',
    kana: 'ひこつきんけん',
    nameEn: 'Peroneal (fibularis) tendons',
    kind: 'tendon',
    regions: ['ankle'],
    description:
      '長腓骨筋・短腓骨筋の2本の腱で、外くるぶしの後ろの溝を回って足の外側と裏に付きます。足首が内側にひねられないよう支えます。捻挫の後や、傾いた路面を走ると負担がかかります。',
  },
  // ── foot
  {
    id: 'plantar-fascia',
    nameJa: '足底腱膜',
    kana: 'そくていけんまく',
    nameEn: 'Plantar fascia',
    kind: 'fascia',
    regions: ['foot'],
    description:
      '踵骨から足の指の付け根まで、足の裏に張っている厚い膜です。弓の弦のように土踏まずを支え、つま先が反ると引き締まって蹴り出しを助けます（ウインドラス機構）。踵の付け根で負荷に耐える力が落ちると痛みが出ます。',
  },
  {
    id: 'heel-fat-pad',
    nameJa: '踵の脂肪体（ヒールパッド）',
    kana: 'かかとのしぼうたい',
    nameEn: 'Heel fat pad',
    kind: 'fat-pad',
    regions: ['foot'],
    description:
      'かかとの骨の下にある、小部屋に分かれた弾力のある脂肪のクッションです。着地の衝撃を和らげます。薄くなったり傷んだりすると、かかとの中央が硬い地面で痛むようになります。',
  },
  {
    id: 'navicular',
    nameJa: '舟状骨',
    kana: 'しゅうじょうこつ',
    nameEn: 'Navicular',
    kind: 'bone',
    regions: ['foot', 'ankle'],
    description:
      '土踏まずの頂点にある舟の形をした骨で、内くるぶしの前下方で触れられます。後脛骨筋腱の主な付着部です。中央部は血流が少なく疲労骨折が起こりやすい一方、見逃されやすいので注意が必要です。',
  },
  {
    id: 'medial-arch',
    nameJa: '内側縦アーチ（土踏まず）',
    kana: 'ないそくじゅうあーち',
    nameEn: 'Medial longitudinal arch',
    kind: 'bone',
    regions: ['foot'],
    description:
      'かかとから母趾の付け根まで、骨・靱帯・足底腱膜・筋肉がつくる弓形の構造です。着地では衝撃を吸収し、蹴り出しでは硬いてこに変わります。アーチの高さには個人差が大きく、低いこと自体が悪いわけではありません。',
  },
  {
    id: 'metatarsals',
    nameJa: '中足骨',
    kana: 'ちゅうそくこつ',
    nameEn: 'Metatarsals',
    kind: 'bone',
    regions: ['foot'],
    description:
      '足の甲にある5本の長い骨で、足の指の付け根につながります。蹴り出しのたびに曲げる力がかかり、とくに第2・第3中足骨は、ランの量や速さを急に増やすと疲労骨折が起こりやすい骨です。',
  },
  {
    id: 'interdigital-nerve',
    nameJa: '趾間神経',
    kana: 'しかんしんけい',
    nameEn: 'Interdigital nerve',
    kind: 'nerve',
    regions: ['foot'],
    description:
      '足の裏から足の指の間へ向かう細い感覚神経です。中足骨の頭の間で靱帯の下を通るため、幅の狭い靴やつま先立ちで圧迫されやすい神経です。とくに第3・第4趾の間で厚くなると（モートン病）、しびれや焼けるような痛みが出ます。',
  },
];

// ═════════════════════════════════════════════════════════════ guides
export const guides: Guide[] = [
  // ───────────────────────────────────────────── 痛みのモニタリング
  {
    id: 'pain-monitoring',
    title: '痛みのモニタリング（どこまで動いてよい？）',
    summary:
      '痛みがあっても、完全に休む必要がないことは多いです。0〜10の物差しで痛みを点数にし、「運動中」「運動後」「翌朝」の3つの時点で判断すれば、動きながら回復を進められます。',
    sections: [
      {
        heading: '痛みを0〜10の点数ではかる',
        body: [
          '0は「まったく痛くない」、10は「想像できる最悪の痛み」です。感覚で構わないので、毎回同じ物差しで点数をつけます。',
          '0〜2は「安全」です。運動中の痛みは3まで（腱障害は5まで）を「許容できる範囲」、それを超えたら「多すぎる」と考えます。',
          'マイメニューの痛みログに、運動中（スイム・バイク・ラン）と翌朝の点数を記録すると、変化が見えやすくなります。',
        ],
      },
      {
        heading: '運動中のルール：3/10以下（腱は5/10まで）',
        body: [
          '運動中の痛みは、基本的に10段階で3以下にとどめます。',
          'アキレス腱障害の研究では、痛みを5/10までに抑えれば、走り続けても休んだ場合と回復に差がありませんでした（Silbernagel 2007）。腱は適度な負荷で強くなるためです。',
          'ただし5/10を許容できるのは、翌朝に悪化しないことが条件です。膝蓋腱など、ほかの腱障害にも同じ考え方が応用されています。',
          '運動を続けるうちに痛みがどんどん強くなる場合は、その日はそこで中止します。',
          '痛みでフォームが変わる（かばって走る、足を引きずる）なら、点数にかかわらず負荷が大きすぎます。',
        ],
      },
      {
        heading: '24時間ルール：翌朝に悪化していないか',
        body: [
          '運動後から翌朝までに痛みやこわばりが落ち着き、いつもの朝より悪くなっていなければ、その負荷は合っています。',
          '翌朝に悪化していたら、次の練習は量か強度を一段階下げます。痛みが落ち着いてから、少しずつ戻します。',
          '同じ負荷で2〜3回続けて問題がなければ、距離・回数・重さのどれか1つを少しだけ増やします。',
        ],
      },
      {
        heading: '「許容できない痛み」の見分け方',
        body: [
          'しびれ、電気が走るような痛み、焼けるような痛みは神経からの痛みです。点数が低くても「許容できる痛み」ではないので、その動きは中止します。',
          '骨の一点を押すと強く痛む、歩くだけで痛い、着地のたびに同じ一点が痛む場合は、疲労骨折の可能性があります。このルールの対象外です。確かめるために跳んだりせず、走らずに受診します。',
          '夜間や安静時の痛み、急な腫れや熱感、外傷の後の痛みも同様です。「すぐに受診すべきサイン」のガイドを確認してください。',
        ],
      },
      {
        heading: '痛みと「壊れている」は同じではない',
        body: [
          '長く続く痛みでは、組織の傷みの程度よりも、神経の過敏さが痛みの強さを左右していることがあります。',
          '睡眠不足、ストレス、痛みへの不安でも痛みは強く感じられます。点数が少し上下しても、慌てず数日単位の傾向で判断します。',
          '多くの使いすぎの障害では、完全に休むより、このルールの範囲で動き続けるほうが回復を助けます。',
        ],
      },
    ],
  },
  // ───────────────────────────────────────────── 負荷管理
  {
    id: 'load-management',
    title: '練習量の増やし方（負荷管理）',
    summary:
      '使いすぎのケガは、体にかかる負荷が「組織が耐えられる力」を上回ったときに起こります。急な増加を避け、3種目の合計と回復を合わせて考えることが、ケガなく強くなる近道です。',
    sections: [
      {
        heading: 'ケガは「負荷 > 耐える力」で起こる',
        body: [
          '筋肉・腱・骨は、適度な負荷をかけて回復させると強くなります。ただし強くなる速さは組織ごとに違います。',
          '心肺や筋肉は数週間で適応しますが、腱や骨は数か月かかります。「息は楽なのに脚が痛む」のはこのずれが原因です。',
          '距離・スピード・坂道・頻度・シューズ・路面の変化は、すべて「負荷の変化」です。一度に変えるのは1つだけにします。',
        ],
      },
      {
        heading: '急な増加（スパイク）を避ける',
        body: [
          '「週10%まで」というルールは目安として役立ちますが、科学的な根拠は限られています。大切なのは、急な跳ね上がりを避けることです。',
          '初心者ランナーの研究では、2週間で週の距離を30%以上増やした人に、使いすぎのケガが多い傾向がありました（Nielsen 2014）。',
          '約5,200人のランナーの研究では、1回のランの距離が過去30日間の最長ランを10%以上上回ると、ケガが増えました。週ごとの距離の比較では、はっきりした関係は見られませんでした（Frandsen 2025）。',
          'ロング走は、過去1か月の最長距離から少しずつ伸ばします。レースや練習会で急に長く走るのは避けます。',
        ],
      },
      {
        heading: '3種目の合計で考える',
        body: [
          'スイムとバイクは体重がかからない分、脚の骨や腱への負担は小さめですが、疲労としては積み上がります。',
          'ラン・バイク・スイムの量を同時に増やさず、1つずつ増やします。',
          'きつい練習（インターバル、ロング、ブリック）は連日にせず、間に軽い日や休みを入れます。',
          '疲れた脚でのランは、着地の衝撃をうまく吸収できません。ブリックランの量は単独ランとは別に、慎重に増やします。',
        ],
      },
      {
        heading: '回復と睡眠',
        body: [
          '体は練習中ではなく、回復している間に強くなります。3〜4週に1回は、量を3〜4割減らした回復週を入れます。',
          '睡眠は1日7〜9時間が目安です。中高生のアスリートでは、睡眠が8時間未満だとケガが約1.7倍多かったという報告があります。',
          '仕事が忙しい、寝不足が続く、体調が悪い週は、予定より練習を減らすことも「負荷管理」です。',
        ],
      },
      {
        heading: 'エネルギー不足（RED-S）に注意',
        body: [
          '練習量に見合った食事がとれていない状態（エネルギー不足）が続くと、骨・ホルモン・免疫の働きが落ちます。これをRED-S（相対的エネルギー不足）と呼びます。',
          '減量中や食事を抜きがちな人、長時間の練習が多い人は、男女を問わず起こりえます。',
          '月経が止まる・不規則になる、疲れが取れない、体重が減り続ける、疲労骨折をくり返す場合は、スポーツドクターやスポーツ栄養士に相談してください。',
          '長い練習の前後と最中には、炭水化物を中心にしっかり補給します。',
        ],
      },
    ],
  },
  // ───────────────────────────────────────────── レッドフラッグ
  {
    id: 'red-flags',
    title: 'すぐに受診すべきサイン',
    summary:
      '次のようなサインがあるときは、このアプリのセルフケアではなく医療機関を受診してください。命に関わるもの、早めの診断が回復を大きく左右するものがあります。',
    sections: [
      {
        heading: 'すぐに救急車・救急外来へ',
        body: [
          '運動中や直後の胸の痛み・締め付け感、強い息苦しさ、動悸、失神やふらつきがある。',
          '急な激しい頭痛、ろれつが回らない、顔や片側の手足の力が入らない・しびれる。',
          'スイム中や後に強い息苦しさやせきが続き、泡や血の混じった痰が出る（水泳誘発性肺水腫の疑い）。',
          '腰痛や脚の症状があり、股間やお尻のまわりのしびれが自転車を降りても続く、尿が出にくい・漏れる、便が漏れる（馬尾症候群の疑い）。',
          '暑さの中で意識がもうろうとする、話がかみ合わない（熱中症の疑い）。長いレースの途中や後の頭痛・吐き気・混乱は、水分のとりすぎによる低ナトリウム血症のこともあります。',
          'ふくらはぎの腫れや痛みに加えて、急な息苦しさや胸の痛みがある（血栓が肺に詰まった疑い）。',
          '落車や転倒で骨が変形している、頭を打った後に意識が乱れる・吐き気をくり返す。',
        ],
      },
      {
        heading: '当日中に受診',
        body: [
          'ケガの直後から体重をかけられない、4歩続けて歩けない。',
          '片側のふくらはぎが腫れて熱を持ち、痛む。長時間の移動の後や、ケガで動けなかった後はとくに血栓に注意します。',
          '激しい練習やレースの後に強い筋肉の痛みと腫れがあり、尿がコーラのような濃い色になる（横紋筋融解症の疑い）。',
          '関節が赤く腫れて熱を持ち、発熱や寒気を伴う。',
          '手足のしびれや力の入りにくさ（つまずきやすい、足首が上がらない）が出てきた、または広がっている。',
        ],
      },
      {
        heading: '数日以内に受診',
        body: [
          '骨の一点を押すと強く痛む、歩くだけでも痛む、走るたびに同じ一点が痛む（疲労骨折の疑い）。確かめるために跳ばず、走るのをやめて受診します。',
          '走ると脚の付け根の奥が痛み、歩くだけでも痛むようになった。大腿骨の付け根の疲労骨折は見逃すと重大なため、早めに受診します。',
          '夜間や安静時にも痛みが続き、姿勢を変えても楽にならない。',
          '原因の分からない体重減少、がんの治療歴、ステロイドの長期使用があり、痛みが続いている。',
          '練習量を調整しながら2〜3週間セルフケアをしても良くならない、睡眠や日常生活に支障がある、同じケガをくり返す。',
        ],
      },
      {
        heading: '外傷の後に気をつけること',
        body: [
          '落車や転倒で頭を打った、ヘルメットが割れた場合は、症状が軽くても脳しんとうの可能性があります。その日は運動に戻らず、医療機関で評価を受けます。',
          '「ブチッ」という音や、ふくらはぎを後ろから蹴られたような感覚の後につま先立ちができない場合は、アキレス腱断裂の可能性があります。その日のうちに受診します。',
          'ひねった後に膝がすぐ腫れる、膝が抜ける感じがある場合は、靱帯や半月板の損傷の可能性があります。',
          '捻挫の後、くるぶしの後ろのふちや先端、足の外側の骨（第5中足骨の付け根）、土踏まずの骨（舟状骨）を押して強く痛む場合は、レントゲンで骨折を確認することがあります。',
          'すねやふくらはぎを強く打った後や骨折の後、パンパンに張って痛みがどんどん強くなる場合は、すぐに救急へ（コンパートメント症候群の疑い）。',
        ],
      },
      {
        heading: 'どこに相談する？',
        body: [
          '骨・関節・筋肉・腱の痛みは、整形外科（できればスポーツ整形外科）が基本です。運動療法は理学療法士と一緒に進めると安心です。',
          '胸の痛みや動悸は循環器内科、月経の異常やエネルギー不足は婦人科やスポーツドクターに相談します。',
          '救急車を呼ぶか迷うときは、救急安心センター（#7119、実施地域のみ）に電話で相談できます。',
          '受診するときは、いつから・何をすると痛いか・最近の練習量の変化を伝えます。痛みログの記録が役立ちます。',
        ],
      },
    ],
  },
  // ───────────────────────────────────────────── ラン復帰
  {
    id: 'return-to-run',
    title: 'ラン復帰プログラム',
    summary:
      'ケガで休んだ後のランは、「痛みなく歩けること」から段階的に戻します。基準を満たしてから始め、ウォークとランを組み合わせて少しずつ走る時間を延ばします。',
    sections: [
      {
        heading: '走り始める前のチェック',
        body: [
          '日常生活での痛みがほぼない（0〜2/10）。',
          '速歩きを30分、痛みの悪化なく続けられる。',
          '片脚のカーフレイズ（かかと上げ）を20回以上でき、左右差が小さい。',
          '片脚スクワットを10回、膝が内に入らずにきれいにできる。',
          'ほかの基準をすべて満たしたら、その場での両脚ジャンプ、続いて片脚ホップを10〜20回、痛みなくできるか確かめる。',
          '疲労骨折の後は、医師から走る許可が出ていることが前提です。ホップの確認も、許可が出てから行います。',
        ],
      },
      {
        heading: 'ウォーク・ランの段階表（1回30分）',
        body: [
          '段階1：1分ラン＋4分ウォーク × 6回',
          '段階2：2分ラン＋3分ウォーク × 6回',
          '段階3：3分ラン＋2分ウォーク × 6回',
          '段階4：4分ラン＋1分ウォーク × 6回',
          '段階5：30分の連続ラン',
          'ペースは会話ができるくらいのゆっくりで、平らで走り慣れた道を選びます。',
        ],
      },
      {
        heading: '進め方のルール',
        body: [
          '走るのは1日おきにします。間の日は、スイム・バイクや補強に充てます。',
          '同じ段階を2〜3回、痛み3/10以下・翌朝の悪化なしでこなせたら、次の段階へ進みます。',
          '翌朝に悪化した場合は、1つ前の段階に戻します。',
          '30分走れるようになったら、時間 → 回数 → スピード・坂道の順に増やします。スピードと坂道は最後です。',
        ],
      },
      {
        heading: 'ブリックラン（バイク後のラン）の再開',
        body: [
          '単独のランで30分以上を問題なく走れるようになってから、ブリックを再開します。',
          '最初はバイクの後に5〜10分のジョグから始めます。',
          '最初の5分はゆっくり、ピッチを高めにして、股関節の前が伸びるまで待ちます。',
          '疲れた脚では衝撃を吸収しにくいため、ブリックの距離は単独ランより控えめに増やします。',
        ],
      },
      {
        heading: '走れない間も体力を保つ',
        body: [
          '痛みが出なければ、スイム・バイク・アクアジョギング（深いプールでの水中ランニング）で心肺機能を保てます。',
          'どの種目が大丈夫かは、痛みのルール（3/10以下、翌朝の悪化なし）で判断します。',
          '疲労骨折の場合は、どこまで動いてよいかを医師に確認してください。',
        ],
      },
    ],
  },
  // ───────────────────────────────────────────── 補強の基本
  {
    id: 'strength-basics',
    title: '補強トレーニングの基本',
    summary:
      '筋力トレーニングはスポーツのケガを減らし、持久系のパフォーマンスも高めます。忙しいエイジグループ選手でも、週2回・20〜40分から効果が期待できます。',
    sections: [
      {
        heading: 'なぜトライアスリートに補強が必要か',
        body: [
          '25の比較試験をまとめた研究では、筋力トレーニングでスポーツのケガが3分の1以下に減りました。ストレッチにはケガを減らす効果が見られませんでした（Lauersen 2014）。',
          'この研究の多くは球技などの選手が対象で、ランナーやトライアスリートでの効果の大きさはまだはっきりしません。',
          '筋力トレーニングで、同じペースを少ないエネルギーで走れる（ランニングエコノミーが良くなる）ことが、多くの研究で示されています。',
          '腱と骨は「重さ」に反応して強くなります。泳ぐ・こぐ・走るだけでは、この刺激が足りないことがあります。',
        ],
      },
      {
        heading: '頻度・回数・セットの目安',
        body: [
          '週2〜3回、1回20〜40分。6〜8種目を選びます。',
          '筋力を高める種目は、6〜12回で「あと2〜3回できる」くらいの重さで2〜4セット行います。',
          '体幹や足まわりの持久力を高める種目は、15〜20回、または30〜45秒保持を2〜3セット行います。',
          'セット間の休みは1〜3分。同じ部位の重い補強は48時間空けます。',
        ],
      },
      {
        heading: '少しずつ負荷を上げる（漸進性過負荷）',
        body: [
          '同じ負荷のままでは体は強くなりません。全セットを良いフォームでこなせ、翌日に痛みが残らなければ、次の段階に進みます。',
          '増やす順番は、回数 → セット数 → 重さや難しさ（片脚にする、テンポを遅くする）です。',
          '2週間に1回くらいのペースで、メニューを見直します。',
        ],
      },
      {
        heading: '腱を鍛えるときのコツ',
        body: [
          '腱は、ゆっくりで重めの負荷によく反応します。「3秒で上げて3秒で下ろす」テンポが基本です。',
          '腱は回復に時間がかかるので、腱の運動は1日おき（週3回程度）にします。痛みは5/10まで、翌朝に悪化しないことが条件です。',
          '痛みが強い時期は、関節を動かさずに力を入れ続けるアイソメトリック（例：45秒×5回）から始めます。痛みを和らげる効果は研究によって結果がまちまちです。',
          'かかとの後ろ（アキレス腱の付け根）、お尻の横、坐骨の付け根の腱は、深い姿勢で骨に押しつけられると痛みやすい場所です。痛む時期は範囲を浅くし、まず重さで負荷を上げます（例：ヒールドロップは段差を使わず床の高さで）。',
          '腱の適応には時間がかかります。効果を感じるまで、最低でも12週間は続けます。',
        ],
      },
      {
        heading: '練習への組み込み方',
        body: [
          '重い補強は、きつい練習と同じ日（練習の後）に行い、軽い日は軽いままにします。「きつい日はきつく、楽な日は楽に」が基本です。',
          '重要なポイント練習やロング走の前日に、脚の重い補強は入れません。',
          '肩や体幹の軽い補強は、スイムやランの前のウォームアップに組み込むと続けやすくなります。',
        ],
      },
      {
        heading: 'シーズンに合わせた進め方',
        body: [
          'オフ〜準備期：週2〜3回。重さを使って筋力の土台をつくります。',
          'レースシーズン：週1〜2回。回数やセットを減らし、重さは保って筋力を維持します。',
          'レース前7〜10日は軽めにするか休みます。レース後1〜2週間は、軽い可動域の運動と体幹から再開します。',
        ],
      },
    ],
  },
  // ───────────────────────────────────────────── バイクフィット
  {
    id: 'bike-fit',
    title: 'バイクポジションと痛み',
    summary:
      'バイクのポジションは、首・肩・腰・股関節・膝・足の痛みに直結します。数ミリの調整で痛みが減ることもあります。ここでは、調整する場所ごとに関わりやすい痛みをまとめます。',
    sections: [
      {
        heading: 'サドルの高さ',
        body: [
          '目安は、ペダルが一番下にあるときに膝が25〜35°曲がる高さです。',
          '低すぎると、膝を深く曲げたまま踏むため、お皿まわり（膝蓋大腿関節）と膝蓋腱の負担が増えます。',
          '高すぎると、脚が伸びきって膝の裏・外側（腸脛靱帯）、ハムストリングス、アキレス腱に負担がかかり、骨盤が左右に揺れて腰や坐骨が痛みやすくなります。',
          '調整は2〜5mmずつ。変えたら数回乗ってから評価します。',
        ],
      },
      {
        heading: 'サドルの前後・角度・形',
        body: [
          'サドルが後ろすぎると、ハムストリングスと腰が引き伸ばされた位置でこぐことになります。前すぎると膝の前の負担が増えます。',
          'トライアスロンバイクはサドルを前寄りにして、DHでも股関節の角度が詰まりすぎないようにしています。ロードバイクにDHバーを付けた場合も、この点を確認します。',
          '前下がりが強すぎると、手や肩に体重が乗って首・肩・手のしびれにつながります。',
          'DHでは骨盤が前に倒れ、坐骨より前の股間に体重が乗ります。先端が短い、中央に溝や穴があるサドルが合うことがあります。',
          '降りるとすぐ消える股間のしびれはよくありますが、サドルの形や角度を見直すサインです。降りてもしびれが続く場合は受診します。',
        ],
      },
      {
        heading: 'クリートの位置と向き',
        body: [
          '前後位置は、母趾の付け根（母趾球）がペダル軸の真上か少し前にくるのが目安です。クリートが前すぎると、ふくらはぎ・アキレス腱・足の裏の負担が増えます。',
          '向きは、自然に立ったときのつま先の向きに合わせます。合っていないと、膝が内や外にねじれ、膝の内側（鵞足）や外側（腸脛靱帯）が痛みやすくなります。',
          'クリートを少しかかと側に下げると、ふくらはぎの仕事が減り、バイク後のランが楽になると感じる選手もいます（専門家の経験に基づく工夫です）。',
          'ペダルの遊び（フロート）は、膝の痛みがある人には役立つことがあります。左右のペダルの間の幅（スタンス幅）が合わないと、膝が内や外にずれます。',
          '足の指のしびれや焼ける痛みは、シューズの幅・締めすぎ・クリートの位置を見直します。',
        ],
      },
      {
        heading: 'ハンドルの遠さと高さ（リーチ・スタック）',
        body: [
          'ハンドルが遠すぎる・低すぎると、前を見るために首を強く反らし、肩甲骨まわりや手首、腰に負担がかかります。',
          '肘は軽く曲がる程度の遠さが目安です。首がつらい場合は、ハンドルを高くする、ステムを短くするなどで上体を少し起こします。',
        ],
      },
      {
        heading: 'DH（エアロ）ポジション',
        body: [
          'DHは空気抵抗を減らしますが、首の反り、腰の丸まり、股関節前面の詰まりが強くなります。速さより「レースの距離を保てるか」で選びます。',
          'アームレストは肘が肩のほぼ真下にくる位置が基本です。前すぎると首と腰の負担が増えます。',
          'DHで乗る時間は、10〜15分ずつ段階的に延ばします。長距離レースの前に、本番と同じ時間で試しておきます。',
          'エアロヘルメットは、前を見るために首をより反らす形のものがあります。練習で試してから本番に使います。',
        ],
      },
      {
        heading: 'クランク長と専門家のバイクフィット',
        body: [
          'クランクを短くすると、ペダルが一番上にきたときの股関節と膝の曲がりが小さくなります。DHで股関節の前が詰まる人や、小柄な人で選ばれることがあります（ケガ予防の根拠はまだ限られます）。',
          'ポジションの変更も「負荷の変化」です。一度に変えるのは1か所だけにします。',
          '痛みが続く場合や、大きく変更したい場合は、専門のバイクフィッターに相談することをおすすめします。痛みの場所と、いつ痛むかを伝えると調整しやすくなります。',
        ],
      },
    ],
  },
];

// ═════════════════════════════════════════════════════════════ conditions
export const conditions: Condition[] = [
  // ───────────────────────────────────────────── 腰痛（非特異的腰痛）
  {
    id: 'low-back-pain',
    nameJa: '腰痛（バイク・ラン姿勢による非特異的腰痛）',
    nameEn: 'Non-specific low back pain',
    aka: ['非特異的腰痛', '筋・筋膜性腰痛', 'ぎっくり腰（急性腰痛）'],
    region: 'lowback',
    painSpots: ['lowback-center', 'buttock-deep'],
    disciplines: ['bike', 'run', 'swim'],
    summary:
      '背骨の両わきが痛む腰痛の多くは、骨折や神経の病気などの特定の原因がない「非特異的腰痛」です。バイクの前傾、疲れたランでの体幹の崩れ、スイムの反り腰が負担を増やします。安静にしすぎず動き続け、運動を習慣にすることが回復と再発予防の近道です。',
    whatHappens: [
      '腰痛の大部分は、検査をしても痛みの原因を一つに特定できない「非特異的腰痛」です。筋肉・筋膜・椎間関節・椎間板など複数の組織が少しずつ関わると考えられ、どこか一か所が「壊れている」わけではありません。',
      '同じ姿勢を長く続けたり、急に練習量が増えたりして、腰の筋肉（脊柱起立筋・多裂筋・腰方形筋）や関節が耐えられる負荷を超えると、神経が過敏になります。筋肉がこわばって体を「守る」反応も起こります。睡眠不足やストレス、痛みへの不安も痛みを強めます。',
      'バイクの前傾では腰が丸まった位置で何時間も保たれ、ランでは着地の衝撃を体幹で受けます。股関節の前（腸腰筋）が硬い、お尻（大殿筋）の筋力が弱いと、代わりに腰が反ったり丸まったりして負担が増えると考えられています（直接の根拠はまだ限られます）。',
      'MRIで見つかる椎間板の変性や膨らみは、痛みのない人にも多く見られ、それだけで痛みの原因とは言えません。多くの腰痛は数週間でかなり良くなり、安静よりも痛みの範囲で動き続けるほうが早く回復します。',
    ],
    involved: [
      {
        ref: 'erector-spinae',
        kind: 'muscle',
        role: 'overloaded',
        note: '前傾姿勢で上体を支え続けて疲れやすく、腰の張りやこわばりとして感じやすい筋肉です。',
      },
      {
        ref: 'multifidus',
        kind: 'muscle',
        role: 'weak',
        note: '椎骨を一つずつ安定させる深い筋肉。腰痛があると働きが落ち、痛みが引いても戻りにくいという報告があります。',
      },
      {
        ref: 'quadratus-lumborum',
        kind: 'muscle',
        role: 'overloaded',
        note: 'ペダリングやランで骨盤を左右に支えます。サドルが高すぎて骨盤が揺れると働きすぎて、片側の腰の奥が痛むことがあります。',
      },
      {
        ref: 'thoracolumbar-fascia',
        kind: 'structure',
        role: 'irritated',
        note: '腰の筋肉を包む厚い膜で、感覚神経が豊富です。壊れているのではなく、こわばりや神経の過敏さで痛みを感じやすくなっていると考えられています。',
      },
      {
        ref: 'lumbar-spine',
        kind: 'structure',
        role: 'overloaded',
        note: '背骨の後ろの小さな関節（椎間関節）は、反り腰や疲れで負担が増えると痛みに関わることがあります。骨が壊れているわけではありません。',
      },
      {
        ref: 'intervertebral-disc',
        kind: 'structure',
        role: 'overloaded',
        note: '長時間の前かがみで前側が圧迫されます。変性や膨らみがあっても、それが痛みの原因とは限りません。',
      },
      {
        ref: 'iliopsoas',
        kind: 'muscle',
        role: 'tight',
        note: 'バイクで縮んだ位置が続くとこわばり、立つ・走るときに腰椎を前へ引いて腰を反らせやすくすると考えられています。',
      },
      {
        ref: 'gluteus-maximus',
        kind: 'muscle',
        role: 'weak',
        note: '股関節を伸ばす主役。弱いと腰を反らして代わりに脚を後ろへ送ろうとし、腰の負担が増えると考えられています。',
      },
    ],
    anatomyNote:
      '多くの腰痛では、特定の組織が壊れているわけではありません。赤い部分は、疲れやこわばりで痛みを感じやすくなっている（過敏になっている）場所を示しています。',
    whyTriathlon: [
      {
        discipline: 'bike',
        text: 'DHポジションでは腰を丸め、首を反らした姿勢を何時間も保ちます。ハンドルが遠い・低い、サドルが高すぎて骨盤が左右に揺れる、低いケイデンスで重いギアを踏み続けると、腰の筋肉が疲れ切ります。ロングライドの後半に痛みが出やすいのが特徴です。',
      },
      {
        discipline: 'run',
        text: '着地のたびに体幹が衝撃を受け止めます。疲れて体幹が崩れると腰が反りやすく、バイク直後のランでは股関節の前がこわばったまま走るため、さらに腰が反ります。長い下り坂や、ロング走の後半に悪化しやすいです。',
      },
      {
        discipline: 'swim',
        text: '体を水平に保とうとして腰を反らす、沈んだ下半身を強いキックで持ち上げる、呼吸のたびに頭を上げる・大きくひねると、腰が反って椎間関節に負担がかかります。オープンウォーターのヘッドアップ（前を見る動作）も腰を反らせます。',
      },
    ],
    symptoms: [
      '背骨の両わき（ベルトの高さ付近）が重い、鈍く痛む',
      '前かがみ、長く座った後の立ち上がり、腰を反らす動作で痛む',
      'ロングライドやランの後半に痛みが強くなる',
      '朝や動き始めに腰がこわばり、動くと少し楽になる',
      '痛みがお尻や太ももの裏に広がることがある（膝より下まで、しびれが広がることは少ない）',
    ],
    patterns: [
      '同じ姿勢が続くと悪化し、姿勢を変える・歩くと軽くなる',
      '動き始めに硬く、体が温まると楽になることが多い',
      '練習量の急増、ロングライドやDHポジションの練習を増やした時期に出やすい',
      '疲れ・睡眠不足・ストレスが強いときに悪化しやすい',
    ],
    selfChecks: [
      {
        name: '動く方向で痛みがどう変わるか',
        how: '立った状態で、前かがみ・後ろへの反らし・左右への傾きを、痛みの出ない範囲でゆっくり行い、どの方向で痛むかを確かめます。',
        suggests:
          '動きや姿勢で痛みが変わり、姿勢を変えると楽になるなら、筋肉や関節からの非特異的腰痛の可能性があります。楽な方向が分かると、日常で取る姿勢の目安になります。',
        caution: '鋭い痛みや脚へのしびれが出たら、すぐにやめます。',
      },
      {
        name: 'あお向けでの脚上げ（神経の痛みの確認）',
        how: 'あお向けに寝て、膝を伸ばしたまま片脚をゆっくり持ち上げます。太ももの裏が張る、または痛みやしびれが出始めたところで止め、どこにどんな感覚が出るかを確かめます。',
        suggests:
          '太ももの裏が張るだけなら、筋肉の硬さによることが多いです。膝より下にしびれや電気が走るような痛みが出る場合は、神経根の痛み（坐骨神経痛）の可能性があり、医療機関での評価がすすめられます。',
        caution: '反動をつけたり、痛みを我慢して高く上げたりしないでください。しびれが出たらすぐに下ろします。',
      },
      {
        name: 'バイク姿勢との関係を記録する',
        how: '何分乗ると痛み始めるか、DHポジションとブラケット（上体を起こした姿勢）で違うかを、数回のライドで記録します。',
        suggests:
          '特定のポジションや時間で決まって痛む場合は、ハンドルの遠さ・高さやサドル高、DHに乗る時間が関わっている可能性があります。',
      },
    ],
    differentials: [
      {
        name: '神経根の痛み（坐骨神経痛・椎間板ヘルニアなど）',
        hint: '痛みやしびれが膝より下・足まで広がる、咳やくしゃみで脚に響く、足の力が入りにくい場合。',
      },
      {
        name: '深殿部症候群（梨状筋症候群）',
        conditionId: 'deep-gluteal-syndrome',
        hint: 'お尻の奥の痛みが中心で、長く座る・サドルに座ると悪化し、腰の動きではあまり変わらない場合。',
      },
      {
        name: '仙腸関節（せんちょうかんせつ）の痛み・炎症性の腰痛',
        hint: 'ベルトの少し下の片側が痛み、片脚立ちや寝返りで痛む場合。40歳未満で3か月以上続き、朝のこわばりが強く動くと楽になる場合は、体軸性脊椎関節炎（たいじくせい せきついかんせつえん）という炎症性の病気の可能性もあり、受診が必要です。',
      },
      {
        name: '腰椎分離症・仙骨の疲労骨折',
        hint: '反らす・ひねると片側が鋭く痛む、ランの着地で腰の下〜お尻の奥が痛む場合。若い選手やエネルギー不足のある選手に多く、画像検査が必要です。',
      },
    ],
    redFlags: [
      '股間やお尻のまわり（サドルが当たる部分）のしびれ、尿が出にくい・漏れる、便の失禁がある（馬尾症候群の疑い：すぐに救急受診）',
      '発熱や寒気を伴う腰痛、体調不良が続く',
      '落車・転倒・強い衝撃の後から腰が痛む',
      '原因の分からない体重減少、がんの治療歴、ステロイドの長期使用がある',
      '夜間や安静時にも強い痛みが続き、姿勢を変えても楽にならない',
      '脚のしびれや力の入りにくさ（つま先立ち・かかと歩きができない、足首が上がらない）が出てきた、または広がっている',
    ],
    seeDoctorNote:
      '受診の目安に当てはまらなければ、多くの腰痛は動きながら自分で回復できます。2〜6週間たっても良くならない、くり返す場合は、整形外科（できればスポーツ整形外科）や理学療法士に相談しましょう。レントゲンやMRIは、受診の目安に当てはまる場合や医師が必要と判断した場合に行うもので、決まった手順として撮る必要はありません。',
    phases: [
      {
        id: 'calm',
        title: '① 痛みを落ち着かせる',
        goal: '安静にしすぎず、痛みの出ない範囲で動き続けて、こわばりと神経の過敏さを和らげます。',
        guidance: [
          'ベッドでの安静は回復を遅らせます。歩く・軽い家事など、日常の活動はできる範囲で続けます。',
          '痛みが強い時期は、楽な姿勢（あお向けで膝を立てる、横向きで膝の間にクッションを挟む）で休み、30〜60分ごとに姿勢を変えます。',
          '入浴やカイロで温めると、短期的に楽になることがあります（カイロは低温やけどに注意）。痛み止めを使う場合は、医師や薬剤師に相談してください。',
          'バイクは上体を起こしたポジション（ブラケットを持つ）で、短時間・低強度から。DHポジションは控えます。',
          'ランは平地を短く、ゆっくり。スイムは痛まなければ続けてよく、強いキック・バタフライ・平泳ぎなど腰を反らす泳ぎは控えます。',
        ],
        exercises: ['ex-cat-cow', 'ex-dead-bug', 'ex-glute-bridge'],
        progressWhen: [
          '日常生活の痛みが3/10以下になり、夜間の痛みがない',
          '30分の速歩きが、痛みの悪化なくできる',
          'キャット＆カウとデッドバグが、翌朝の悪化なくできる',
        ],
      },
      {
        id: 'build',
        title: '② 組織を強くする',
        goal: '体幹の持久力と、お尻・股関節の筋力を高め、腰に負担が集中しない体をつくります。',
        guidance: [
          '補強は週2〜3回。体幹は「強く固める力」より「長く保てる持久力」を重視します。',
          '体幹だけでなく、お尻（大殿筋・中殿筋）の筋力と、股関節の前の柔軟性もセットで取り組みます。',
          'ランは痛み3/10以下、翌朝に悪化がない範囲で、時間 → 回数の順に戻します。',
          'バイクはブラケットのポジションで時間を戻し、DHポジションは10〜15分ずつ段階的に再開します。',
          'どの運動が一番よいかより、続けることが大切です。続けやすい種目を選びます。',
        ],
        exercises: ['ex-bird-dog', 'ex-side-plank', 'ex-single-leg-bridge', 'ex-hip-flexor-stretch'],
        progressWhen: [
          'サイドプランクを左右それぞれ30〜45秒、腰の痛みなく保てる',
          'バードドッグを左右10回×3セット、骨盤を揺らさずにできる',
          '60分のライドと30分のランが、翌朝の悪化なくできる',
        ],
      },
      {
        id: 'return',
        title: '③ 競技に戻る・再発予防',
        goal: 'DHポジション・ロング・ブリックに耐える体幹と脚の筋力をつけ、腰に優しいポジションとフォームを身につけます。',
        guidance: [
          'DHポジションの時間は1回につき10〜15分ずつ延ばし、痛みが出たら上体を起こして休みます。',
          'ブリックランは最初の5分をゆっくり走り、ピッチを高めにして股関節の前をなじませます。',
          '体幹とお尻の補強は、レースシーズンも週1〜2回続けます。運動の継続は腰痛の再発予防に役立ちます。',
          '痛みが続く・くり返す場合は、バイクフィットでハンドルの遠さ・高さとサドル高を見直します。',
        ],
        exercises: ['ex-single-leg-rdl', 'ex-split-squat', 'ex-side-plank'],
        progressWhen: [
          'DHポジションで60分以上、腰の痛みなく乗れる',
          'ブリック（バイク後のラン）を、翌朝の悪化なく行える',
          'スピード練習を含む通常の練習を、痛み2/10以下で続けられる',
        ],
      },
    ],
    trainingTips: [
      {
        discipline: 'bike',
        tips: [
          'ハンドルが遠い・低いと感じたら、ステムを短くする、スペーサーで高くするなどしてポジションを見直します。',
          'サドル高は5mm単位で調整し、ペダリング中に骨盤が左右に揺れない高さにします。',
          'ケイデンスを85〜95回転に保ち、重いギアで踏み続けないようにします。',
          'ロングライドでは20〜30分ごとに上体を起こす、立ちこぎをするなどして姿勢を変えます。',
        ],
      },
      {
        discipline: 'run',
        tips: [
          'バイク直後の最初の5分はゆっくり、ピッチを高めにして走り出します。',
          'ピッチを5〜10%上げると歩幅が小さくなり、上下動と膝・股関節の負担が減ります（腰痛への効果は確かめられていませんが、試しやすい工夫です）。',
          '痛みがある時期は長い下り坂を避けるか、歩幅を小さくして下ります。',
        ],
      },
      {
        discipline: 'swim',
        tips: [
          '頭を上げすぎず、目線を真下〜少し前に向けて、腰を反らさずに体を水平に保ちます。',
          '左右呼吸を取り入れ、体のひねりを左右均等にします。',
          'キックで下半身を持ち上げようとせず、お腹を軽く締めて体全体で浮きます。',
          '痛む時期は、バタフライ・平泳ぎ・強いキックの練習を控えます。',
        ],
      },
    ],
    prevention: [
      '体幹とお尻の補強を週2回、1年を通して続けます。',
      'DHポジションやロングライドの時間は、急に増やさず段階的に延ばします。',
      'バイクフィットで、ハンドルの遠さ・高さとサドル高を体に合わせます。',
      'デスクワークでは30〜60分ごとに立ち上がり、股関節の前のストレッチを取り入れます。',
      '回復週と十分な睡眠を確保し、練習量の急な増加を避けます。',
    ],
    painRule:
      '運動中の腰の痛みは10段階で3以下、運動後や翌朝に悪化していなければ続けて構いません。脚へのしびれや電気が走る痛みが出る、または広がる場合は「許容できる痛み」ではないので、その動きを中止します。',
    evidence: [
      {
        level: 'strong',
        note: '非特異的腰痛では、安静より活動を続けること、運動療法、痛みの仕組みの説明（教育）が、各国の診療ガイドラインで一致して勧められています。',
      },
      {
        level: 'moderate',
        note: '運動と教育の組み合わせは、少なくとも短期的には腰痛の再発リスクを下げます。一方、特定の体幹トレーニング（腹横筋を意識する運動など）が、ほかの運動より優れているという根拠は乏しいです。',
      },
      {
        level: 'limited',
        note: 'バイクポジション（ハンドルの遠さ・高さ、サドル高）と腰痛の関係を調べた研究は小規模なものが中心で、結果も一定していません。',
      },
      {
        level: 'expert',
        note: 'DHポジションの段階的な再開や、ブリックランの走り出しの工夫は、主に専門家の経験に基づく助言です。',
      },
    ],
    references: [
      { label: 'Oliveira CB et al. Clinical practice guidelines for non-specific low back pain: an updated overview. Eur Spine J 2018' },
      { label: 'Qaseem A et al. Noninvasive treatments for acute, subacute, and chronic low back pain (ACP guideline). Ann Intern Med 2017' },
      { label: 'Steffens D et al. Prevention of low back pain: a systematic review and meta-analysis. JAMA Intern Med 2016' },
      { label: 'Brinjikji W et al. Imaging features of spinal degeneration in asymptomatic populations (systematic review). AJNR 2015' },
      { label: 'Streisfeld GM et al. Body positioning, muscle activity and spinal kinematics in cyclists with and without low back pain (systematic review). Sports Health 2017' },
    ],
  },
];

// ═════════════════════════════════════════════════════════════ muscles (trunk)
export const muscles: Muscle[] = [
  // ───────────────────────────────────────────── 脊柱起立筋
  {
    id: 'erector-spinae',
    nameJa: '脊柱起立筋',
    kana: 'せきちゅうきりつきん',
    nameEn: 'Erector spinae',
    regions: ['lowback', 'neck'],
    group: '固有背筋（背骨の両わきの筋肉）',
    parts: [
      { nameJa: '腸肋筋（ちょうろくきん）', nameEn: 'Iliocostalis', note: '最も外側。骨盤・肋骨から肋骨・頸椎へ。' },
      { nameJa: '最長筋（さいちょうきん）', nameEn: 'Longissimus', note: '中間で最も大きい。一部は頭の骨（乳様突起）まで届きます。' },
      { nameJa: '棘筋（きょくきん）', nameEn: 'Spinalis', note: '最も内側。背骨の出っ張り（棘突起）どうしをつなぎます。' },
    ],
    origin: '仙骨の後面、腸骨稜の後部、腰椎と下位胸椎（第11・12胸椎）の棘突起から、太い共通の腱（腱膜）として起こる',
    insertion:
      '腸肋筋は肋骨の角と下位頸椎の横突起、最長筋は胸椎・頸椎の横突起と肋骨、側頭骨の乳様突起、棘筋は上位の胸椎・頸椎の棘突起',
    actions: [
      '両側が働くと、背骨を反らす（体幹の伸展）',
      '片側が働くと、体を同じ側へ傾ける（側屈）',
      '前かがみのとき、上体が倒れすぎないようブレーキをかける',
      '立位や前傾姿勢で背骨を支え、姿勢を保つ',
    ],
    innervation: '脊髄神経の後枝（主に外側枝。腰部の最長筋は中間枝からも）。頸神経〜腰神経が高さごとに分節的に支配（おおよそC1–L5）',
    summary:
      '背骨の両わきを、骨盤から頭の付け根まで縦に走る長い筋肉の束です。背骨を反らし、前かがみの姿勢を支えます。バイクの前傾やランの後半に疲れやすく、腰の張りとして感じやすい筋肉です。',
    triathlon: {
      swim: '体を水平に保ち、ストリームラインで背骨をまっすぐ支えます。働きすぎると反り腰になり、腰に負担がかかります。',
      bike: '前傾姿勢で上体の重さを支え続けます。DHポジションでは長時間働き続けるため、ライド後半に張りやすくなります。',
      run: '着地のたびに上体が前に倒れないよう支えます。疲れると上体が前に崩れたり、反り腰になったりします。',
    },
    whenTight:
      '腰の両わきがこわばり、前かがみや朝の動き始めがつらくなります。ロングライドの後に「腰が板のように張る」感覚として出ることが多いです。',
    whenWeak:
      '持久力が落ちると長時間の前傾姿勢を保ちにくく、腰が丸まりすぎて椎間板や靱帯に負担が移ると考えられています。ランの後半にフォームが崩れやすくなります。',
    palpation:
      'うつ伏せになり、腰の背骨の出っ張り（棘突起）から指2本分外側に手を当てます。胸を床から少し持ち上げると、縦に走る太い筋肉が盛り上がって硬くなります。',
    relatedConditions: ['low-back-pain', 'cyclist-neck-pain'],
    strengthen: ['ex-bird-dog', 'ex-single-leg-rdl', 'ex-squat'],
    stretch: ['ex-cat-cow'],
  },
  // ───────────────────────────────────────────── 多裂筋
  {
    id: 'multifidus',
    nameJa: '多裂筋',
    kana: 'たれつきん',
    nameEn: 'Multifidus',
    regions: ['lowback'],
    group: '固有背筋（横突棘筋群・深層）',
    origin: '仙骨の後面、上後腸骨棘、腰椎の乳頭突起、胸椎の横突起、下位頸椎の関節突起',
    insertion: '起始から2〜4つ上の椎骨の棘突起（第2頸椎〜第5腰椎）',
    actions: [
      '椎骨を一つずつ安定させる（分節的な安定）',
      '両側が働くと、背骨を反らす（伸展）',
      '片側が働くと、体を反対側へわずかにひねる（回旋）、同じ側へ傾ける',
    ],
    innervation: '脊髄神経の後枝・内側枝（各髄節が分節ごとに支配。腰部の多裂筋はL1–L5）',
    summary:
      '背骨のすぐ横の深いところにある短い筋肉の集まりで、腰の部分で最も太くなります。椎骨を一つずつ安定させる働きがあり、腰痛があると働きが落ちてやせやすいことが報告されています。',
    triathlon: {
      swim: 'ローリングのとき、背骨がねじれすぎないよう一つひとつの椎骨を安定させます。',
      bike: 'ペダリング中に腰椎と骨盤を安定させ、上体の土台をつくります。',
      run: '着地の衝撃で背骨がぶれないよう、椎骨を細かく支えます。',
    },
    whenTight:
      '硬さが問題になることは少ない筋肉です。腰痛の急性期には、痛みから守るために周りの筋肉と一緒にこわばることがあります。',
    whenWeak:
      '腰痛の後は、痛みが引いても働きが自然には戻りにくく、再発に関わると考えられています。体幹が安定しにくくなり、表面の大きな筋肉が代わりに頑張って疲れやすくなります。',
    palpation:
      'うつ伏せで、腰の背骨の出っ張り（棘突起）のすぐ横、指1本分外側に指先を当てます。反対側の腕を床から少し浮かせると、指の下の深いところがふくらむのを感じられます。',
    relatedConditions: ['low-back-pain'],
    strengthen: ['ex-bird-dog'],
    stretch: ['ex-cat-cow'],
  },
  // ───────────────────────────────────────────── 腹横筋
  {
    id: 'transversus-abdominis',
    nameJa: '腹横筋',
    kana: 'ふくおうきん',
    nameEn: 'Transversus abdominis',
    regions: ['lowback'],
    group: '腹筋群（腹壁の筋）',
    origin: '第7〜12肋軟骨の内面、胸腰筋膜、腸骨稜の前2/3、鼠径靱帯の外側1/3',
    insertion: '腹直筋鞘を通って白線（お腹の中央の腱）、恥骨稜と恥骨櫛（結合腱として）',
    actions: [
      'お腹を内側へ引き込み、腹圧を高める（コルセットのように体幹を囲む）',
      '胸腰筋膜を張って、腰まわりを安定させる',
      '強く息を吐く、咳をするときに働く',
    ],
    innervation: '下位肋間神経（T7–T11）、肋下神経（T12）、腸骨下腹神経・腸骨鼠径神経（L1）',
    summary:
      'お腹の一番深いところを、コルセットのように横向きに取り巻く筋肉です。腹圧を高めて体幹を安定させます。ただし、この筋肉だけを狙う特別な運動が、一般的な運動より腰痛に効くという根拠は乏しいです。',
    triathlon: {
      swim: '体幹を一本の棒のように保ち、ストリームラインとローリングを安定させます。息を吐き切る動作にも働きます。',
      bike: '前傾姿勢で腹圧を保ち、ペダルを踏む力を骨盤で受け止める土台になります。',
      run: '着地の直前から働いて体幹を安定させ、衝撃で上体がぶれるのを防ぎます。',
    },
    whenTight:
      '硬さが問題になることは少ない筋肉です。いつもお腹をへこませ続ける癖があると、呼吸が浅くなることがあります。',
    whenWeak:
      '腹圧を保ちにくく、長時間の前傾やランの後半で体幹が崩れやすくなります。腰痛のある人では、手足を動かすときにこの筋肉の働き出しが遅れるという報告があります。',
    palpation:
      '腰骨の前の出っ張り（上前腸骨棘）から、指2本分内側・下にやさしく指を当てます。軽く咳をする、または息を「フーッ」と長く吐き切ると、指の下が張るのを感じられます。',
    relatedConditions: ['low-back-pain'],
    strengthen: ['ex-dead-bug', 'ex-bird-dog', 'ex-side-plank'],
    stretch: [],
  },
  // ───────────────────────────────────────────── 腹斜筋
  {
    id: 'obliques',
    nameJa: '腹斜筋（外腹斜筋・内腹斜筋）',
    kana: 'ふくしゃきん（がいふくしゃきん・ないふくしゃきん）',
    nameEn: 'Abdominal obliques (external & internal)',
    regions: ['lowback'],
    group: '腹筋群（腹壁の筋）',
    parts: [
      {
        nameJa: '外腹斜筋',
        nameEn: 'External oblique',
        note: '表層。肋骨から斜め前下方へ（ズボンのポケットに手を入れる向き）。片側で体を反対側へひねります。',
      },
      {
        nameJa: '内腹斜筋',
        nameEn: 'Internal oblique',
        note: '外腹斜筋の下。骨盤から斜め前上方へ、外腹斜筋と交差する向き。片側で体を同じ側へひねります。',
      },
    ],
    origin: '外腹斜筋は第5〜12肋骨の外面。内腹斜筋は胸腰筋膜、腸骨稜、鼠径靱帯の外側',
    insertion:
      '外腹斜筋は腸骨稜の前半、腹直筋鞘を通って白線、恥骨結節（下のふちは鼠径靱帯になる）。内腹斜筋は第10〜12肋骨の下縁、腹直筋鞘を通って白線、恥骨稜（結合腱として）',
    actions: [
      '体幹をひねる（外腹斜筋は反対側へ、内腹斜筋は同じ側へ）',
      '片側が働くと、体を同じ側へ傾ける（側屈）',
      '両側が働くと、体幹を丸める（屈曲）、腹圧を高める',
      '体幹がねじれすぎないよう止める（抗回旋）',
    ],
    innervation: '下位肋間神経（T7–T11）、肋下神経（T12）。内腹斜筋はさらに腸骨下腹神経・腸骨鼠径神経（L1）',
    summary:
      'わき腹にある2層の筋肉で、線維が斜めに交差しています。体をひねる・ひねりを止める働きの主役で、スイムのローリングや、ランでの肩と骨盤の逆向きの回転を支えます。',
    triathlon: {
      swim: 'ローリングで体をひねり、キャッチの力を体幹から腕へ伝えます。呼吸のときの体の回転にも働きます。',
      bike: '強く踏み込むときや立ちこぎで体幹がねじれすぎないよう止め、ペダルへの力を逃がしません。',
      run: '腕振りと骨盤の逆向きの回転をコントロールし、上体が左右にぶれるのを防ぎます。',
    },
    whenTight:
      'わき腹が硬いと胸郭の動きやひねりの動きが小さくなり、呼吸やローリングがしにくくなることがあります。',
    whenWeak:
      'ひねりを止める力が落ち、ランで上体が左右に揺れる、スイムで下半身が左右にぶれる原因になります。',
    palpation:
      'わき腹（肋骨の下と腰骨の間）に手を当てます。あお向けで膝を立て、肩を少し浮かせて体を反対側へひねると、手の下が硬くなるのを感じられます。',
    relatedConditions: ['low-back-pain'],
    strengthen: ['ex-side-plank', 'ex-dead-bug', 'ex-bird-dog', 'ex-copenhagen-plank'],
    stretch: ['ex-open-book', 'ex-thoracic-extension'],
  },
  // ───────────────────────────────────────────── 腹直筋
  {
    id: 'rectus-abdominis',
    nameJa: '腹直筋',
    kana: 'ふくちょくきん',
    nameEn: 'Rectus abdominis',
    regions: ['lowback', 'hip'],
    group: '腹筋群（腹壁の筋）',
    origin: '恥骨稜、恥骨結合',
    insertion: '第5〜7肋軟骨、胸骨の剣状突起',
    actions: [
      '体幹を丸める（背骨の屈曲）',
      '骨盤の前を引き上げ、反り腰を抑える（骨盤の後傾）',
      '腹圧を高める、強く息を吐くときに働く',
    ],
    innervation: '下位肋間神経（T7–T11）、肋下神経（T12）',
    summary:
      'お腹の前を縦に走る、いわゆる「シックスパック」の筋肉です。体を丸め、骨盤が前に傾きすぎないよう支えます。恥骨の付け根では内転筋と腱膜でつながっています。',
    triathlon: {
      swim: 'ストリームラインで腰が反りすぎないよう、骨盤の位置を保ちます。強く息を吐くときにも働きます。',
      bike: '前傾姿勢で骨盤を支え、ペダリングの力を受け止める土台になります。',
      run: '着地で骨盤が前に傾きすぎて反り腰になるのを抑えます。',
    },
    whenTight:
      '強く縮める癖があると背中が丸まり、胸が開きにくく呼吸が浅くなることがあります。',
    whenWeak:
      '骨盤が前に傾きやすく、腰が反りやすくなります。恥骨の付け根は内転筋と引っ張り合うため、鼠径部の痛みに関わることがあります。',
    palpation:
      'あお向けで膝を立て、おへその横に手を当てます。頭と肩を少し持ち上げると、縦に走る筋肉が硬くなり、横に走る腱の段差（腱画）も分かります。',
    relatedConditions: ['low-back-pain', 'adductor-groin-pain'],
    strengthen: ['ex-dead-bug'],
    stretch: ['ex-cat-cow', 'ex-thoracic-extension'],
  },
  // ───────────────────────────────────────────── 腰方形筋
  {
    id: 'quadratus-lumborum',
    nameJa: '腰方形筋',
    kana: 'ようほうけいきん',
    nameEn: 'Quadratus lumborum',
    regions: ['lowback'],
    group: '後腹壁の筋',
    origin: '腸骨稜の後部、腸腰靱帯',
    insertion: '第12肋骨の下縁、第1〜4腰椎の横突起',
    actions: [
      '片側が働くと、体を同じ側へ傾ける（側屈）',
      '片側が働くと、骨盤の同じ側を引き上げる（脚を浮かせる側の骨盤を持ち上げる）',
      '第12肋骨を固定して、深く息を吸うのを助ける',
      '両側が働くと、腰を反らし、腰椎を安定させる',
    ],
    innervation: '肋下神経（T12）、腰神経叢の枝（L1–L4の前枝）',
    summary:
      '腰の奥、一番下の肋骨と骨盤の間にある四角い筋肉です。体を横に傾け、片脚立ちやペダリングで骨盤を左右に安定させます。サドルが高すぎて骨盤が揺れると、働きすぎて痛むことがあります。',
    triathlon: {
      swim: 'ローリングで体幹を横から支え、下半身が左右にぶれるのを防ぎます。',
      bike: 'ペダリング中に骨盤を水平に保ちます。サドルが高すぎる・左右差があると、骨盤を持ち上げ続けて疲れます。',
      run: '片脚で着地したとき、反対側の骨盤が落ちないよう中殿筋と一緒に支えます。',
    },
    whenTight:
      '腰の片側の奥が張って痛む原因になります。骨盤の片側が引き上げられ、脚の長さが違うように感じることがあります。',
    whenWeak:
      '体幹を横から支える力が落ち、ランで上体が左右に揺れる、片脚支持が不安定になる原因になります。',
    palpation:
      '横向きに寝て、一番下の肋骨と腰骨のふち（腸骨稜）の間、背骨の両わきの太い筋肉のすぐ外側から、奥へ向けてやさしく押します。上側の骨盤を肋骨の方へ少し引き上げると、指の下が硬くなります。',
    relatedConditions: ['low-back-pain'],
    strengthen: ['ex-side-plank'],
    stretch: [],
  },
];

// ═════════════════════════════════════════════════════════════ exercises (core)
export const exercises: Exercise[] = [
  // ───────────────────────────────────────────── デッドバグ
  {
    id: 'ex-dead-bug',
    nameJa: 'デッドバグ',
    nameEn: 'Dead bug',
    type: 'activation',
    regions: ['lowback'],
    primary: ['transversus-abdominis', 'rectus-abdominis', 'obliques'],
    secondary: ['iliopsoas', 'rectus-femoris'],
    equipment: ['マット'],
    level: 1,
    dose: {
      sets: 3,
      reps: '6〜8回',
      perSide: true,
      tempo: '3秒かけて伸ばし、3秒で戻す',
      rest: '30〜60秒',
      frequency: '週3〜5回（毎日でも可）',
    },
    summary:
      'あお向けで手脚を交互に伸ばしながら、腰が反らないようお腹で骨盤と背骨を保つ体幹トレーニングです。腰に負担をかけずに、手脚が動いても体幹を動かさない力を鍛えます。',
    setup:
      'あお向けに寝て、両腕を天井へまっすぐ伸ばします。股関節と膝を90°に曲げて脚を持ち上げ、すねを床と平行にします。',
    steps: [
      '息を吐きながら肋骨を下げ、腰を床に近づけます。',
      '右腕を頭の方へ、左脚を床すれすれまで、3秒かけて伸ばします。',
      '腰が床から浮かない範囲で止め、3秒かけて元に戻します。',
      '反対側（左腕と右脚）も同様に行い、交互にくり返します。',
    ],
    cues: [
      'お腹の奥とわき腹がじわっと熱くなればOKです。',
      '腰と床の間に手のひらが入らない程度の隙間を保ちます。',
      '呼吸は止めず、手脚を伸ばすときに息を吐きます。',
    ],
    mistakes: [
      '腰が反って床から浮く',
      '動きが速く、反動で手脚を動かす',
      '息を止める',
      '首や肩に力が入り、頭が浮く',
    ],
    progression:
      '脚を伸ばす位置を低くする、伸ばした位置で3秒止める、手に軽いダンベル（1〜2kg）を持ちます。',
    regression: '腕だけ、または脚だけを動かします。かかとを床に滑らせるように脚を伸ばしても構いません。',
    caution:
      '腰の痛みが3/10を超える場合は、動かす範囲を小さくします。出産後でお腹の中央が盛り上がる場合は、専門家に相談してから行ってください。',
    benefit: {
      swim: '手脚が動いても体幹がぶれない力がつき、ストリームラインとキックが安定します。',
      bike: '前傾姿勢で骨盤を安定させ、ペダルを踏む力を体幹で受け止めやすくなります。',
      run: '腕振りと脚の振り出しに対して、腰が反らない体幹をつくります。',
    },
  },
  // ───────────────────────────────────────────── バードドッグ
  {
    id: 'ex-bird-dog',
    nameJa: 'バードドッグ',
    nameEn: 'Bird dog',
    type: 'activation',
    regions: ['lowback', 'hip', 'shoulder'],
    primary: ['erector-spinae', 'multifidus', 'gluteus-maximus'],
    secondary: ['transversus-abdominis', 'obliques', 'gluteus-medius', 'deltoid', 'trapezius'],
    equipment: ['マット'],
    level: 1,
    dose: {
      sets: 3,
      reps: '8〜10回',
      holdSec: 5,
      perSide: true,
      rest: '30〜60秒',
      frequency: '週3〜5回（毎日でも可）',
    },
    summary:
      '四つ這いで反対側の腕と脚を同時に伸ばし、背骨をまっすぐ保つ体幹トレーニングです。腰に大きな負担をかけずに、背中の深い筋肉とお尻を一緒に働かせます。',
    setup:
      '四つ這いになり、手は肩の真下、膝は股関節の真下に置きます。背中を平らにし、目線は床に向けます。',
    steps: [
      'お腹を軽く締め、背中を平らに保ちます。',
      '右腕を前へ、左脚を後ろへ、床と平行になるまでゆっくり伸ばします。',
      '背中が反ったり骨盤が傾いたりしない位置で、5秒保ちます。',
      'ゆっくり戻し、反対側（左腕と右脚）も同様に行います。',
    ],
    cues: [
      '伸ばした脚の側のお尻と、背骨の両わきが働く感じがあればOKです。',
      '背中にコップの水を載せているつもりで、骨盤を水平に保ちます。',
      '手脚は「高く上げる」より「遠くへ伸ばす」意識で行います。',
    ],
    mistakes: [
      '脚を高く上げすぎて腰が反る',
      '骨盤が、上げた脚の側へ回る・傾く',
      '首を反らして前を見る',
      '支えている側の肩がすくむ',
    ],
    progression:
      '伸ばした肘と膝を体の下で近づけてから再び伸ばす、手首・足首に軽い重りをつけます。',
    regression: '腕だけ、または脚だけを伸ばします。',
    caution:
      '手首が痛む場合は、こぶしを握って床につくか、前腕をついて行います。脚を伸ばしたときに腰や脚に痛み・しびれが出る場合は、脚を低く・短く伸ばすか、腕だけにします。',
    benefit: {
      swim: '腕と脚を伸ばしたまま体幹をまっすぐ保つ力が、ストリームラインとキャッチの安定につながります。',
      bike: '長時間の前傾姿勢で、背中の深い筋肉が持ちこたえる持久力をつけます。',
      run: '腕と反対側の脚を同時に動かす、ランに近い動きで体幹を安定させます。',
    },
  },
  // ───────────────────────────────────────────── サイドプランク
  {
    id: 'ex-side-plank',
    nameJa: 'サイドプランク',
    nameEn: 'Side plank',
    type: 'isometric',
    regions: ['lowback', 'hip', 'shoulder'],
    primary: ['obliques', 'quadratus-lumborum', 'gluteus-medius'],
    secondary: ['transversus-abdominis', 'rectus-abdominis', 'gluteus-minimus', 'serratus-anterior'],
    equipment: ['マット'],
    level: 2,
    dose: {
      sets: 3,
      holdSec: 30,
      perSide: true,
      rest: '30〜60秒',
      frequency: '週3回',
    },
    summary:
      '横向きで前腕と膝（または足）で体を支え、体をまっすぐ保つ体幹トレーニングです。わき腹・腰方形筋と、下側のお尻の横（中殿筋）を一緒に鍛え、ランで骨盤が横に落ちるのを防ぐ力をつけます。',
    setup:
      '横向きに寝て、下側の肘を肩の真下につきます。最初は膝を90°に曲げ、頭から膝までを一直線にそろえます。',
    steps: [
      'お腹を軽く締め、下側の前腕と膝で床を押します。',
      'お尻を持ち上げ、頭から膝（または足）までを一直線にします。',
      '骨盤が落ちたり後ろに引けたりしないよう、30秒を目安に保ちます（最初は15〜20秒から）。',
      'ゆっくりお尻を下ろし、反対側も同様に行います。',
    ],
    cues: [
      '下側のわき腹とお尻の横が熱くなればOKです。',
      '肩をすくめず、床を押して肩甲骨を安定させます。',
      '体を前後に倒さず、上から見ても横から見ても一直線を保ちます。',
    ],
    mistakes: [
      'お尻が落ちる、または後ろに突き出る',
      '肩がすくんで首に力が入る',
      '息を止める',
      '上体が前に倒れて体がねじれる',
    ],
    progression:
      '膝を伸ばして足で支える → 上側の脚を持ち上げる → 上側の腕を天井へ伸ばす、の順に難しくします。45秒保てたら次の段階へ進みます。',
    regression: '膝を曲げたまま、10〜15秒から始めます。',
    caution:
      '肩に痛みがある時期は、膝つきで短い時間から始め、肩の痛みが3/10を超えないようにします。お尻の横（大転子）が痛む場合は、上側の脚を持ち上げる形は痛みが出ない範囲で行います。',
    benefit: {
      swim: 'ローリングで体を横から支える力と、腕で体重を支える肩の安定性を高めます。',
      bike: 'ペダリング中に骨盤を左右に安定させ、腰の片側の張りを予防します。',
      run: '片脚着地で骨盤が横に落ちるのを防ぎ、膝が内に入る動きを減らします。',
    },
  },
  // ───────────────────────────────────────────── キャット＆カウ
  {
    id: 'ex-cat-cow',
    nameJa: 'キャット＆カウ',
    nameEn: 'Cat-cow',
    type: 'mobility',
    regions: ['lowback'],
    primary: ['erector-spinae', 'multifidus', 'rectus-abdominis'],
    secondary: ['obliques', 'serratus-anterior'],
    equipment: ['マット'],
    level: 1,
    dose: {
      sets: 2,
      reps: '8〜10回',
      tempo: '呼吸に合わせて1往復5〜6秒',
      frequency: '毎日（練習の前後やロングライドの後）',
    },
    summary:
      '四つ這いで背中を丸める・反らすをゆっくりくり返し、背骨全体の動きを取り戻すモビリティ運動です。ロングライドやデスクワークで固まった腰と背中をほぐします。痛みが強い時期にも行いやすい運動です。',
    setup:
      '四つ這いになり、手は肩の真下、膝は股関節の真下に置きます。背中は平らにします。',
    steps: [
      '息を吐きながら、おへそをのぞき込むように背中を丸めます（キャット）。',
      '手で床を押して、肩甲骨の間を広げます。',
      '息を吸いながら、胸を前に出して背中をゆっくり反らします（カウ）。',
      '痛みのない範囲で、呼吸に合わせて8〜10回くり返します。',
    ],
    cues: [
      '背骨を一つずつ動かすつもりで、首から腰までなめらかに動かします。',
      '丸めるときは背中が、反らすときはお腹の前が伸びる感じがあればOKです。',
      '反らすときは腰だけで反らず、胸を前に出します。',
    ],
    mistakes: ['腰だけを大きく反らす', '動きが速く、反動をつける', '首だけを大きく動かす', '息を止める'],
    progression:
      '丸めながらお尻をかかとの方へ引く、体を左右に傾ける動きを加えるなど、動く方向を増やします。',
    regression: '動かす範囲を小さくする、または椅子に座って背中を丸める・反らすを行います。',
    caution:
      '反らす動きで腰や脚に痛み・しびれが出る場合は、反らす範囲を小さくするか、丸める動きだけを行います。',
    benefit: {
      swim: '背骨の動きがよくなり、ストリームラインやローリングがしやすくなります。',
      bike: '前傾で固まった腰と背中を、ライドの後にほぐします。',
      run: 'ランの前のウォームアップとして、体幹の動きを整えます。',
    },
  },
];
