import { describe, expect, it } from 'vitest';
import { CONDITIONS, getCondition, getExercise, type ExerciseId, type RehabPhase } from '../data';
import { stepDose, stepOverride } from './dose';
import { parseFrequency } from './useMenu';

const heel = getExercise('ex-eccentric-heel-drop');

describe('plan step doses', () => {
  it('merges the step override over the exercise dose (only the fields given)', () => {
    expect(heel).toBeTruthy();
    if (!heel) return;
    const step: Pick<RehabPhase, 'exercises' | 'doses'> = {
      exercises: [heel.id],
      doses: { [heel.id]: { reps: '10〜15回', sets: 2, frequency: '週3回' } },
    };
    const d = stepDose(heel, step);
    expect(d.reps).toBe('10〜15回');
    expect(d.sets).toBe(2);
    expect(d.frequency).toBe('週3回');
    // fields the step does not give stay the exercise's own
    expect(d.perSide).toBe(heel.dose.perSide);
    expect(d.tempo).toBe(heel.dose.tempo);
    expect(parseFrequency(d.frequency)).toEqual({ kind: 'weekly', min: 3, max: 3 });
  });

  it('keeps the exercise dose without a step, without an override, or when the step no longer has the exercise', () => {
    if (!heel) return;
    expect(stepDose(heel, undefined)).toBe(heel.dose);
    expect(stepDose(heel, { exercises: [heel.id] })).toBe(heel.dose);
    expect(stepDose(heel, { exercises: [], doses: { [heel.id]: { frequency: '毎日' } } })).toBe(heel.dose);
    expect(stepOverride(heel.id, { exercises: [heel.id], doses: { [heel.id]: {} } })).toBeUndefined();
  });

  it('every override in the content names an exercise of its step and yields a frequency', () => {
    for (const r of CONDITIONS) {
      for (const p of getCondition(r.id)?.phases ?? []) {
        for (const id of Object.keys(p.doses ?? {}) as ExerciseId[]) {
          expect(p.exercises).toContain(id);
          const e = getExercise(id);
          if (!e) continue;
          const f = parseFrequency(stepDose(e, p).frequency);
          if (f.kind === 'weekly') expect(f.min).toBeGreaterThan(0);
        }
      }
    }
  });
});
