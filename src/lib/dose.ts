// Effective dose of an exercise in a recovery-plan step: the exercise's own `dose` with the step's overrides
// (RehabPhase.doses). Used wherever an exercise is shown in a plan context: the plan step cards, the exercise page
// opened from a step (?from=&phase=), My Menu items added from a step (computed from the current content at render,
// so content updates apply), today's menu card and the weekly targets.
import { getCondition, getExercise, type ConditionId, type Exercise, type ExerciseId, type PhaseId, type RehabPhase } from '../data';

export type Dose = Exercise['dose'];

/** Where an exercise was opened / added from. */
export interface PlanRef {
  condition?: ConditionId;
  phase?: PhaseId;
}

/** The recovery-plan step `from` points to (undefined when the content has no such step). */
export function planStep(from: PlanRef | undefined): RehabPhase | undefined {
  if (!from?.condition || !from.phase) return undefined;
  return getCondition(from.condition)?.phases?.find((p) => p.id === from.phase);
}

/** The step's override for this exercise, if the step still has the exercise. */
export function stepOverride(id: ExerciseId, phase: Pick<RehabPhase, 'exercises' | 'doses'> | undefined): Partial<Dose> | undefined {
  if (!phase || !phase.exercises?.includes(id)) return undefined;
  const o = phase.doses?.[id];
  return o && Object.keys(o).length ? o : undefined;
}

/** Dose of an exercise in a plan step: the fields the step gives replace the exercise's own. */
export function stepDose(e: Pick<Exercise, 'id' | 'dose'>, phase: Pick<RehabPhase, 'exercises' | 'doses'> | undefined): Dose {
  const o = stepOverride(e.id, phase);
  if (!o) return e.dose;
  return { ...e.dose, ...o, frequency: o.frequency ?? e.dose.frequency };
}

/** Dose of an exercise opened / added from `from` (its own dose without a plan step, or when the step dropped it). */
export function effectiveDose(id: ExerciseId, from?: PlanRef): Dose | undefined {
  const e = getExercise(id);
  if (!e) return undefined;
  return stepDose(e, planStep(from));
}

/** Does the plan step set its own dose for this exercise? */
export function hasStepDose(id: ExerciseId, from?: PlanRef): boolean {
  return !!stepOverride(id, planStep(from));
}
