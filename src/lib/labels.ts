// Japanese UI labels for enum values + registry-backed name fallbacks
// (content may still be arriving; the registry always has a Japanese name).
import {
  CONDITIONS,
  EXERCISES,
  GUIDES,
  MUSCLES,
  PAIN_SPOTS,
  REGIONS,
  STRUCTURES,
  conditions,
  getCondition,
  getExercise,
  getGuide,
  getMuscle,
  getPainSpot,
  getRegion,
  getStructure,
  refName,
  type Discipline,
  type EvidenceLevel,
  type Exercise,
  type ExerciseType,
  type GuideId,
  type InvolvementRole,
  type PainSpot,
  type RegionId,
  type StructureKind,
} from '../data';
import type { PainContext, PainSide } from './usePainLog';

export const DISCIPLINE_JA: Record<Discipline, string> = { swim: 'スイム', bike: 'バイク', run: 'ラン' };
export const DISCIPLINE_ORDER: Discipline[] = ['swim', 'bike', 'run'];

export const LIKELIHOOD_JA = { common: 'よくある', possible: '可能性あり', rare: 'まれ' } as const;
export const LIKELIHOOD_ORDER = { common: 0, possible: 1, rare: 2 } as const;

export const ROLE_JA: Record<InvolvementRole, string> = {
  injured: '傷んでいる',
  irritated: '刺激されている',
  compressed: '圧迫されている',
  overloaded: '負担過多',
  tight: '硬い',
  weak: '弱い',
  nearby: '近くの組織',
};
/** Roles that describe the painful tissue itself (drawn as 'injured'). */
export const PRIMARY_ROLES: InvolvementRole[] = ['injured', 'irritated', 'compressed'];
export const isPrimaryRole = (r: InvolvementRole) => PRIMARY_ROLES.includes(r);

export const EXERCISE_TYPE_JA: Record<ExerciseType, string> = {
  strength: '筋力',
  isometric: 'アイソメトリック',
  stretch: 'ストレッチ',
  mobility: 'モビリティ',
  activation: '活性化',
  plyometric: 'プライオメトリクス',
  balance: 'バランス',
  'nerve-glide': '神経グライド',
};

/** Recovery-plan step labels (short; the content titles are longer). */
export const PHASE_JA: Record<'calm' | 'build' | 'return', string> = { calm: '① 痛みを鎮める', build: '② 強くする', return: '③ 競技に戻る' };

export const LEVEL_JA: Record<1 | 2 | 3, string> = { 1: 'Lv.1 やさしい', 2: 'Lv.2 標準', 3: 'Lv.3 上級' };

export const EVIDENCE_JA: Record<EvidenceLevel, string> = {
  strong: '強い',
  moderate: '中程度',
  limited: '限定的',
  expert: '専門家の意見',
};

export const STRUCTURE_KIND_JA: Record<StructureKind, string> = {
  tendon: '腱',
  ligament: '靱帯',
  bursa: '滑液包',
  fascia: '筋膜・腱膜',
  bone: '骨',
  cartilage: '軟骨',
  nerve: '神経',
  joint: '関節',
  capsule: '関節包',
  'fat-pad': '脂肪体',
};

export const SIDE_JA: Record<PainSide, string> = { left: '左', right: '右', both: '両側' };

export const CONTEXT_JA: Record<PainContext, string> = {
  swim: 'スイム',
  bike: 'バイク',
  run: 'ラン',
  daily: '日常',
  morning: '起床時',
};
export const CONTEXT_ORDER: PainContext[] = ['swim', 'bike', 'run', 'daily', 'morning'];

// ── names with registry fallback ──────────────────────────────

const byId = <T extends { id: string }>(list: readonly T[]) => new Map(list.map((x) => [x.id as string, x]));
const regReg = byId(REGIONS);
const regCond = byId(CONDITIONS);
const regMus = byId(MUSCLES);
const regEx = byId(EXERCISES);
const regSpot = byId(PAIN_SPOTS);
const regStruct = byId(STRUCTURES);
const regGuide = byId(GUIDES);

export const regionName = (id: string) => getRegion(id)?.nameJa ?? regReg.get(id)?.ja ?? id;
export const conditionName = (id: string) => getCondition(id)?.nameJa ?? regCond.get(id)?.ja ?? id;
export const muscleName = (id: string) => getMuscle(id)?.nameJa ?? regMus.get(id)?.ja ?? id;
export const exerciseName = (id: string) => getExercise(id)?.nameJa ?? regEx.get(id)?.ja ?? id;
export const structureName = (id: string) => getStructure(id)?.nameJa ?? regStruct.get(id)?.ja ?? id;
export const spotLabel = (id: string) => getPainSpot(id)?.label ?? regSpot.get(id)?.ja ?? id;
/** Muscle or structure name (content → registry), for involvement refs. */
export const partName = (id: string) => {
  const n = refName(id);
  return n !== id ? n : (regMus.get(id)?.ja ?? regStruct.get(id)?.ja ?? id);
};
export const guideTitle = (id: string) => getGuide(id)?.title ?? regGuide.get(id)?.ja ?? id;

/** What a guide offers besides text (its sections' typed blocks): 2D figures, 3D views, exercises for My Menu. */
export function guideFeatures(id: string): { figure: boolean; viewer: boolean; exercises: boolean; menu: boolean } {
  const blocks = (getGuide(id)?.sections ?? []).flatMap((s) => s.blocks ?? []);
  return {
    figure: blocks.some((b) => b.kind === 'figure'),
    viewer: blocks.some((b) => b.kind === 'viewer3d'),
    exercises: blocks.some((b) => b.kind === 'exercises'),
    menu: blocks.some((b) => b.kind === 'exercises' && !!b.addToMenu),
  };
}
/** A visual learning guide (figures / 3D / exercise cards in its sections), as opposed to a text-only article. */
export const isLearnGuide = (id: string) => (getGuide(id)?.sections ?? []).some((s) => (s.blocks?.length ?? 0) > 0);

/** Guides that name this region / condition / muscle in `related` (shown as a link on that page), registry order. */
export function relatedGuides(kind: 'regions' | 'conditions' | 'muscles', id: string): GuideId[] {
  return GUIDES.map((g) => g.id).filter((g) => (getGuide(g)?.related?.[kind] as readonly string[] | undefined)?.includes(id));
}

/** One line on what a learning guide offers, for a link to it: 「図と3Dでしくみを確認・種目をまとめてマイメニューに追加」. */
export function guideOffer(id: string): string {
  const f = guideFeatures(id);
  const look = f.figure && f.viewer ? '図と3Dでしくみを確認' : f.figure ? '図でしくみを確認' : f.viewer ? '3Dでしくみを確認' : '';
  const act = f.menu ? '種目をまとめてマイメニューに追加' : f.exercises ? 'おすすめの種目' : '';
  return [look, act].filter(Boolean).join('・') || (getGuide(id)?.summary ?? '');
}

export const isKnownCondition = (id: string) => regCond.has(id);
export const isKnownMuscle = (id: string) => regMus.has(id);
export const isKnownExercise = (id: string) => regEx.has(id);
export const isKnownRegion = (id: string) => regReg.has(id);
export const isKnownGuide = (id: string) => regGuide.has(id);
export const isKnownSpot = (id: string) => regSpot.has(id);

export const registryConditionRegion = (id: string) => regCond.get(id)?.region as RegionId | undefined;
export const spotRegion = (id: string) =>
  (getPainSpot(id)?.region ?? regSpot.get(id)?.region) as RegionId | undefined;

/** Pain spot views from the registry (front/back/sole). */
export const spotViews = (id: string): readonly string[] => regSpot.get(id)?.views ?? [];

/** Candidate conditions for a spot, most likely first. From the pain-spot content when available;
 *  otherwise conditions whose painSpots include the spot (likelihood unknown → no badge). */
export function spotConditions(id: string): { id: PainSpot['conditions'][number]['id']; likelihood?: 'common' | 'possible' | 'rare' }[] {
  const spot = getPainSpot(id);
  if (spot?.conditions?.length) {
    return [...spot.conditions].sort((a, b) => LIKELIHOOD_ORDER[a.likelihood] - LIKELIHOOD_ORDER[b.likelihood]);
  }
  return conditions
    .filter((c) => c.painSpots.includes(id as PainSpot['id']))
    .sort((a, b) => a.painSpots.indexOf(id as PainSpot['id']) - b.painSpots.indexOf(id as PainSpot['id']))
    .map((c) => ({ id: c.id }));
}

export const regionConditionCount = (id: RegionId) => CONDITIONS.filter((c) => c.region === id).length;

// ── dose formatting ───────────────────────────────────────────

/**
 * Add 「左右」 to a dose value without doubling brackets:
 * '15回' → '15回（左右）', '5〜10回（慣れたら15回まで）' → '5〜10回（慣れたら15回まで、左右それぞれ）',
 * '15回（膝を伸ばして・膝を曲げて、それぞれ）' → '15回（膝を伸ばして・膝を曲げて、それぞれ左右で）'.
 */
export function withPerSide(v: string): string {
  if (/左右/.test(v)) return v;
  const m = v.match(/^(.*)[（(]([^（）()]*)[）)]$/);
  if (!m) return `${v}（左右）`;
  const inner = m[2].endsWith('それぞれ') ? `${m[2]}左右で` : `${m[2]}、左右それぞれ`;
  return `${m[1]}（${inner}）`;
}

export function doseParts(d: Exercise['dose']): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = [];
  if (d.sets) out.push({ k: 'セット', v: `${d.sets}セット` });
  if (d.reps) out.push({ k: '回数', v: d.perSide ? withPerSide(d.reps) : d.reps });
  if (d.holdSec) out.push({ k: '保持', v: d.perSide && !d.reps ? withPerSide(`${d.holdSec}秒`) : `${d.holdSec}秒` });
  if (d.tempo) out.push({ k: 'テンポ', v: d.tempo });
  if (d.rest) out.push({ k: '休息', v: d.rest });
  if (d.frequency) out.push({ k: '頻度', v: d.frequency });
  return out;
}

/** '3セット × 10–15回 · 週3回' */
export function doseShort(d: Exercise['dose'] | undefined): string {
  if (!d) return '';
  const main: string[] = [];
  if (d.sets) main.push(`${d.sets}セット`);
  if (d.reps) main.push(d.reps);
  else if (d.holdSec) main.push(`${d.holdSec}秒`);
  let s = main.join(' × ');
  if (d.perSide && s) s = withPerSide(s);
  const freq = (d.frequency ?? '').replace(/[（(].*?[）)]/g, '').trim();
  if (freq) s += (s ? ' · ' : '') + freq;
  return s;
}

export const GENERIC_PAIN_RULE =
  '運動中の痛みは10段階で3以下（腱のリハビリでは5まで）、翌朝に悪化していなければOK。しびれ・電気が走る痛みが出たら中止します。';

// ── exercise library filters ──────────────────────────────────

/** Longer option text for the 種類 filter (the badge keeps the short EXERCISE_TYPE_JA). */
export const EXERCISE_TYPE_HINT_JA: Partial<Record<ExerciseType, string>> = {
  isometric: 'アイソメトリック（止まったまま力を出す）',
  mobility: 'モビリティ（関節を大きく動かす）',
  activation: '活性化（筋肉のスイッチを入れる）',
  plyometric: 'プライオメトリクス（跳ぶ・弾む）',
  'nerve-glide': '神経の滑走（神経グライド）',
};

export type EquipmentTag = 'none' | 'mat' | 'wall' | 'chair' | 'towel' | 'band' | 'weight' | 'step' | 'roller' | 'ball';

/** A small fixed set of equipment tags for filtering; the detailed free-text strings stay as badges. */
export const EQUIPMENT_TAGS: { id: EquipmentTag; label: string; short: string; re?: RegExp }[] = [
  { id: 'none', label: 'なし（器具不要）', short: 'なし' },
  { id: 'mat', label: 'マット', short: 'マット', re: /マット/ },
  { id: 'wall', label: '壁・ドア枠', short: '壁', re: /壁|ドア枠/ },
  { id: 'chair', label: '椅子・ベンチ・台', short: '椅子・台', re: /椅子|ベンチ|ベッド|ソファ|台や|などの台/ },
  { id: 'towel', label: 'タオル', short: 'タオル', re: /タオル(?!で代用)/ },
  { id: 'band', label: 'チューブ・バンド', short: 'チューブ', re: /チューブ|バンド/ },
  { id: 'weight', label: 'ダンベル・重り', short: '重り', re: /ダンベル|ケトルベル|バーベル|重り|ペットボトル/ },
  { id: 'step', label: '段差・階段', short: '段差', re: /段差|階段|傾斜台|厚い板/ },
  { id: 'roller', label: 'フォームローラー', short: 'ローラー', re: /フォームローラー/ },
  { id: 'ball', label: 'ボール・クッション', short: 'クッション', re: /ボール|クッション/ },
];

const OPTIONAL_RE = /（(任意|応用|あれば)）/;

/** Equipment tags of an exercise. 'none' = nothing is required (only なし… or optional items). */
export function equipmentTags(e: Pick<Exercise, 'equipment'>): EquipmentTag[] {
  const list = e.equipment ?? [];
  const out = new Set<EquipmentTag>();
  const required = list.filter((x) => !x.startsWith('なし') && !OPTIONAL_RE.test(x));
  if (!list.length || list.some((x) => x.startsWith('なし')) || required.length === 0) out.add('none');
  for (const x of list) {
    if (x.startsWith('なし')) continue;
    for (const t of EQUIPMENT_TAGS) if (t.re?.test(x)) out.add(t.id);
  }
  return [...out];
}
