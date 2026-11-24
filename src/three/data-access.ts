// Defensive access to the content data (src/data). The content files are edited by other agents and may be
// incomplete; the 3D engine must never crash because of them, so the module is loaded lazily and guarded.
import type { Condition, Exercise, Muscle } from '../data/types';

type DataModule = typeof import('../data');
let mod: DataModule | null = null;
let loading: Promise<boolean> | null = null;

export function loadData(): Promise<boolean> {
  loading ??= import('../data')
    .then((m) => {
      mod = m;
      return true;
    })
    .catch((e) => {
      console.warn('[tribody 3d] content data unavailable — using clip/rig fallbacks', e);
      return false;
    });
  return loading;
}

export const dataReady = () => mod !== null;

export function getExerciseSafe(id: string): Exercise | undefined {
  try {
    return mod?.getExercise(id);
  } catch {
    return undefined;
  }
}

export function getMuscleSafe(id: string): Muscle | undefined {
  try {
    return mod?.getMuscle(id);
  } catch {
    return undefined;
  }
}

export function getConditionSafe(id: string): Condition | undefined {
  try {
    return mod?.getCondition(id);
  } catch {
    return undefined;
  }
}
