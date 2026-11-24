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
  injured: '痛んでいる',
  irritated: '刺激されている',
  compressed: '圧迫されている',
  overloaded: '負担過多',
  tight: '硬い',
  weak: '弱い',
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

export function doseParts(d: Exercise['dose']): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = [];
  if (d.sets) out.push({ k: 'セット', v: `${d.sets}セット` });
  if (d.reps) out.push({ k: '回数', v: d.reps + (d.perSide ? '（左右）' : '') });
  if (d.holdSec) out.push({ k: '保持', v: `${d.holdSec}秒` + (d.perSide && !d.reps ? '（左右）' : '') });
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
  if (d.perSide && !/左右/.test(s)) s += '（左右）';
  const freq = (d.frequency ?? '').replace(/[（(].*?[）)]/g, '').trim();
  if (freq) s += (s ? ' · ' : '') + freq;
  return s;
}

export const GENERIC_PAIN_RULE = '運動中の痛みは10段階で3以下、翌朝に悪化していなければOK';
