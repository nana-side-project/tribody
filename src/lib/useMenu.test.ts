import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise } from '../data';
import { parseFrequency } from './useMenu';

describe('menu frequency', () => {
  it('splits daily exercises from weekly targets', () => {
    expect(parseFrequency('毎日')).toEqual({ kind: 'daily' });
    expect(parseFrequency('毎日OK（練習後に）')).toEqual({ kind: 'daily' });
    expect(parseFrequency('毎日〜週5回')).toEqual({ kind: 'daily' });
    expect(parseFrequency('1日3回（とくに朝、床に足をつく前）')).toEqual({ kind: 'daily' });
    expect(parseFrequency('週3回')).toEqual({ kind: 'weekly', min: 3, max: 3 });
    expect(parseFrequency('週2〜3回（1日おき）')).toEqual({ kind: 'weekly', min: 2, max: 3 });
    expect(parseFrequency('週3回（毎日でも可）')).toEqual({ kind: 'weekly', min: 3, max: 3 });
    expect(parseFrequency('週3回〜毎日')).toEqual({ kind: 'weekly', min: 3, max: 7 });
    expect(parseFrequency('1日おき（週3回）')).toEqual({ kind: 'weekly', min: 3, max: 4 });
  });

  it('gives every exercise in the library a frequency', () => {
    for (const r of EXERCISES) {
      const e = getExercise(r.id);
      if (!e) continue;
      const f = parseFrequency(e.dose.frequency);
      if (f.kind === 'weekly') expect(f.min).toBeGreaterThan(0);
    }
  });
});
