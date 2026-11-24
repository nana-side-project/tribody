// Aggregates all content files and exposes lookup helpers for the UI.
// Do not put content here — content lives in ./content/<owner>.ts.
import * as A from './content/shoulder';
import * as B from './content/hip';
import * as C from './content/knee-calf';
import * as D from './content/ankle-foot';
import * as E from './content/global';
import type {
  Condition,
  Discipline,
  Exercise,
  Guide,
  Muscle,
  PainSpot,
  Region,
  Structure,
} from './types';
import type {
  ConditionId,
  ExerciseId,
  GuideId,
  MuscleId,
  PainSpotId,
  RegionId,
  StructureId,
} from './registry';
import { REGIONS } from './registry';

export * from './types';
export * from './registry';

const regionOrder = REGIONS.map((r) => r.id as RegionId);

export const regions: Region[] = [...E.regions].sort(
  (a, b) => regionOrder.indexOf(a.id) - regionOrder.indexOf(b.id),
);
export const painSpots: PainSpot[] = [...E.painSpots];
export const structures: Structure[] = [...E.structures];
export const guides: Guide[] = [...E.guides];
export const conditions: Condition[] = [
  ...A.conditions,
  ...B.conditions,
  ...C.conditions,
  ...D.conditions,
  ...E.conditions,
];
export const muscles: Muscle[] = [
  ...A.muscles,
  ...E.muscles,
  ...B.muscles,
  ...C.muscles,
  ...D.muscles,
];
export const exercises: Exercise[] = [
  ...A.exercises,
  ...B.exercises,
  ...C.exercises,
  ...D.exercises,
  ...E.exercises,
];

function byId<T extends { id: string }>(list: T[]): Map<T['id'], T> {
  return new Map(list.map((x) => [x.id, x] as [T['id'], T]));
}

const regionMap = byId(regions);
const spotMap = byId(painSpots);
const structureMap = byId(structures);
const guideMap = byId(guides);
const conditionMap = byId(conditions);
const muscleMap = byId(muscles);
const exerciseMap = byId(exercises);

export const getRegion = (id: RegionId | string) => regionMap.get(id as RegionId);
export const getPainSpot = (id: PainSpotId | string) => spotMap.get(id as PainSpotId);
export const getStructure = (id: StructureId | string) => structureMap.get(id as StructureId);
export const getGuide = (id: GuideId | string) => guideMap.get(id as GuideId);
export const getCondition = (id: ConditionId | string) => conditionMap.get(id as ConditionId);
export const getMuscle = (id: MuscleId | string) => muscleMap.get(id as MuscleId);
export const getExercise = (id: ExerciseId | string) => exerciseMap.get(id as ExerciseId);

/** Muscle or structure display name for an involvement ref. */
export function refName(ref: string): string {
  return getMuscle(ref)?.nameJa ?? getStructure(ref)?.nameJa ?? ref;
}

export const conditionsByRegion = (id: RegionId) => conditions.filter((c) => c.region === id);
export const spotsByRegion = (id: RegionId) => painSpots.filter((s) => s.region === id);
export const musclesByRegion = (id: RegionId) => muscles.filter((m) => m.regions.includes(id));
export const exercisesByRegion = (id: RegionId) => exercises.filter((e) => e.regions.includes(id));

/** Conditions in which this exercise is prescribed (any phase). */
export const conditionsUsingExercise = (id: ExerciseId) =>
  conditions.filter((c) => c.phases.some((p) => p.exercises.includes(id)));

/** Exercises that work (primary/secondary) a muscle. */
export const exercisesForMuscle = (id: MuscleId) =>
  exercises.filter((e) => e.primary.includes(id) || e.secondary.includes(id));

export const DISCIPLINES: { id: Discipline; ja: string; emoji: string }[] = [
  { id: 'swim', ja: 'スイム', emoji: '🏊' },
  { id: 'bike', ja: 'バイク', emoji: '🚴' },
  { id: 'run', ja: 'ラン', emoji: '🏃' },
];
