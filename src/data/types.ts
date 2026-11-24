// Core content types for TriBody.
// All cross-references use ids from ./registry.ts, so typos are caught by `npm run typecheck`.
import type {
  ConditionId,
  ExerciseId,
  MuscleId,
  PainSpotId,
  RegionId,
  StructureId,
  GuideId,
} from './registry';

export type Discipline = 'swim' | 'bike' | 'run';
export type Side = 'left' | 'right';

/** Body region (one per region page). */
export interface Region {
  id: RegionId;
  nameJa: string; // '膝'
  nameEn: string; // 'Knee'
  description: string; // 1–2 sentences: what this region page covers
  /** How each discipline loads this region (1–2 sentences each). */
  disciplineStress: Partial<Record<Discipline, string>>;
  keyMuscles: MuscleId[];
  keyStructures: StructureId[];
}

/** A tappable "where does it hurt" spot. */
export interface PainSpot {
  id: PainSpotId;
  region: RegionId;
  label: string; // '膝のお皿のまわり'
  hint: string; // typical aggravating situations, e.g. '階段の下り・しゃがむ動作で痛む'
  /** Candidate conditions, most likely first. */
  conditions: { id: ConditionId; likelihood: 'common' | 'possible' | 'rare' }[];
}

export type StructureKind =
  | 'tendon'
  | 'ligament'
  | 'bursa'
  | 'fascia'
  | 'bone'
  | 'cartilage'
  | 'nerve'
  | 'joint'
  | 'capsule'
  | 'fat-pad';

/** Non-muscle anatomical structure (tendon, bursa, bone landmark, nerve...). */
export interface Structure {
  id: StructureId;
  nameJa: string;
  kana?: string; // reading for difficult kanji
  nameEn: string;
  kind: StructureKind;
  regions: RegionId[];
  description: string; // 1–3 sentences, plain Japanese
}

export interface Muscle {
  id: MuscleId;
  nameJa: string; // '中殿筋'
  kana: string; // 'ちゅうでんきん'
  nameEn: string; // 'Gluteus medius'
  regions: RegionId[];
  group?: string; // e.g. '回旋筋腱板（ローテーターカフ）', 'ハムストリングス'
  /** Named parts, e.g. 三角筋 前部/中部/後部. */
  parts?: { nameJa: string; nameEn: string; note?: string }[];
  origin: string; // 起始 (plain Japanese, may mention bony landmarks)
  insertion: string; // 停止
  actions: string[]; // 作用, e.g. '股関節の外転'
  innervation: string; // 神経支配 + root levels, e.g. '上殿神経（L4–S1）'
  summary: string; // 1–2 sentences: what it is / why it matters
  triathlon: Partial<Record<Discipline, string>>; // role in each discipline
  whenTight?: string; // what happens / typical symptoms when tight or overactive
  whenWeak?: string; // what happens when weak / underactive
  palpation?: string; // 触ってみよう: how to find it on your own body
  relatedConditions: ConditionId[];
  strengthen: ExerciseId[];
  stretch: ExerciseId[];
}

export type InvolvementRole =
  | 'injured' // the painful/damaged tissue itself
  | 'irritated' // irritated/inflamed secondary structure (e.g. bursa)
  | 'compressed' // compressed structure (tendon under bone, nerve)
  | 'overloaded' // works too hard, contributes
  | 'tight' // tight/stiff, contributes
  | 'weak' // weak/underactive, contributes
  | 'nearby'; // runs close by / can be irritated secondarily (e.g. a nerve beside the lesion); context only, not damaged

export interface Involvement {
  ref: MuscleId | StructureId;
  kind: 'muscle' | 'structure';
  role: InvolvementRole;
  note: string; // short: why/how it is involved
}

export type PhaseId = 'calm' | 'build' | 'return';

export interface RehabPhase {
  id: PhaseId;
  title: string; // e.g. '① 痛みを落ち着かせる', '② 組織を強くする', '③ 競技に戻る・再発予防'
  goal: string;
  guidance: string[]; // load management, what to avoid, etc.
  exercises: ExerciseId[]; // in recommended order
  progressWhen: string[]; // criteria to move on (or "return to sport" criteria for the last phase)
  /**
   * Optional per-plan dose overrides for exercises of THIS phase (keys must be in `exercises`). Only the fields given
   * replace the exercise's default `dose` when the exercise is shown or added to My Menu from this plan step.
   */
  doses?: Partial<Record<ExerciseId, Partial<Exercise['dose']>>>;
}

export type EvidenceLevel = 'strong' | 'moderate' | 'limited' | 'expert';

export interface Condition {
  id: ConditionId;
  nameJa: string; // '膝蓋大腿疼痛症候群'
  nameEn: string; // 'Patellofemoral pain'
  aka: string[]; // 通称 e.g. ['ランナー膝', 'PFPS']
  region: RegionId;
  painSpots: PainSpotId[];
  disciplines: Discipline[]; // which disciplines commonly provoke it
  summary: string; // 2–3 sentences
  whatHappens: string[]; // paragraphs: what is actually happening in the tissue
  involved: Involvement[]; // at least one with role 'injured' (or 'compressed'/'irritated')
  /**
   * Optional note shown right under the anatomy figure's legend. Use it when the red highlight could be misread as
   * "damaged tissue" — e.g. non-specific pain where tissues are sensitised or overloaded rather than injured.
   */
  anatomyNote?: string;
  whyTriathlon: { discipline: Discipline; text: string }[];
  symptoms: string[];
  patterns: string[]; // timing / behaviour, e.g. '走り始めに痛み、温まると軽くなる'
  selfChecks: { name: string; how: string; suggests: string; caution?: string }[]; // safe self-tests only
  differentials: { name: string; conditionId?: ConditionId; hint: string }[];
  redFlags: string[]; // 受診の目安 — specific to this condition
  seeDoctorNote?: string; // optional extra note about who to see (整形外科, スポーツ整形, 理学療法士...)
  phases: RehabPhase[]; // exactly 3 in order: calm, build, return
  trainingTips: { discipline: Discipline; tips: string[] }[];
  prevention: string[];
  painRule: string; // how much pain is acceptable during rehab/training for this condition
  evidence: { level: EvidenceLevel; note: string }[];
  references: { label: string; url?: string }[]; // url only if verified to exist
}

export type ExerciseType =
  | 'strength'
  | 'isometric'
  | 'stretch'
  | 'mobility'
  | 'activation'
  | 'plyometric'
  | 'balance'
  | 'nerve-glide';

export interface Exercise {
  id: ExerciseId;
  nameJa: string;
  nameEn: string;
  type: ExerciseType;
  regions: RegionId[];
  /** Muscles mainly worked (strength) or mainly lengthened (stretch). */
  primary: MuscleId[];
  secondary: MuscleId[];
  equipment: string[]; // e.g. ['なし'], ['チューブ'], ['段差'], ['ダンベル']
  level: 1 | 2 | 3; // 1 = beginner / painful phase friendly
  dose: {
    sets?: number;
    reps?: string; // '10–15回'
    holdSec?: number;
    perSide?: boolean;
    tempo?: string; // '3秒で下ろす'
    rest?: string;
    frequency: string; // '週3回' / '毎日'
  };
  summary: string; // 1–2 sentences: purpose
  setup: string; // starting position
  steps: string[];
  cues: string[]; // coaching cues
  mistakes: string[]; // common mistakes
  progression?: string;
  regression?: string;
  caution?: string;
  benefit: Partial<Record<Discipline, string>>;
}

/** Short educational article (pain monitoring, load management, red flags...). */
export interface Guide {
  id: GuideId;
  title: string;
  summary: string;
  sections: { heading: string; body: string[] }[];
}
