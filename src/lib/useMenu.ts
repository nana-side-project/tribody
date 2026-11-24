// マイメニュー: saved exercises + per-date checklist. Persisted with safe storage.
import { useMemo } from 'react';
import { EXERCISES, getExercise, type ConditionId, type ExerciseId, type PhaseId } from '../data';
import { createStore, useStore } from './storage';
import { addDays, isISODate, todayISO, weekOf } from './date';

export interface MenuItem {
  id: ExerciseId;
  addedAt: number;
  /** Where it was added from (e.g. a condition's phase). */
  from?: { condition?: ConditionId; phase?: PhaseId };
}

export interface MenuState {
  items: MenuItem[];
  /** date (YYYY-MM-DD) → exercise ids checked that day */
  done: Record<string, ExerciseId[]>;
}

const VALID = new Set<string>(EXERCISES.map((e) => e.id));
const KEEP_DAYS = 120;

function sanitize(raw: unknown): MenuState {
  const out: MenuState = { items: [], done: {} };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<MenuState>;
  if (Array.isArray(r.items)) {
    const seen = new Set<string>();
    for (const it of r.items) {
      if (!it || typeof it !== 'object' || !VALID.has(it.id) || seen.has(it.id)) continue;
      seen.add(it.id);
      out.items.push({
        id: it.id,
        addedAt: typeof it.addedAt === 'number' ? it.addedAt : Date.now(),
        from: it.from && typeof it.from === 'object' ? it.from : undefined,
      });
    }
  }
  if (r.done && typeof r.done === 'object') {
    for (const [date, ids] of Object.entries(r.done)) {
      if (!isISODate(date) || !Array.isArray(ids)) continue;
      const valid = [...new Set(ids.filter((x): x is ExerciseId => VALID.has(x)))];
      if (valid.length) out.done[date] = valid;
    }
  }
  return out;
}

export const menuStore = createStore<MenuState>('tribody.menu.v1', sanitize);

function prune(done: MenuState['done']): MenuState['done'] {
  const cutoff = addDays(todayISO(), -KEEP_DAYS);
  const next: MenuState['done'] = {};
  for (const [d, ids] of Object.entries(done)) if (d >= cutoff && ids.length) next[d] = ids;
  return next;
}

export const menuActions = {
  add(id: ExerciseId, from?: MenuItem['from']): boolean {
    let added = false;
    menuStore.set((s) => {
      if (s.items.some((i) => i.id === id)) return s;
      added = true;
      return { ...s, items: [...s.items, { id, addedAt: Date.now(), from }] };
    });
    return added;
  },
  addMany(ids: ExerciseId[], from?: MenuItem['from']): number {
    let count = 0;
    menuStore.set((s) => {
      const have = new Set(s.items.map((i) => i.id));
      const extra: MenuItem[] = [];
      for (const id of ids) {
        if (have.has(id) || !VALID.has(id)) continue;
        have.add(id);
        extra.push({ id, addedAt: Date.now(), from });
      }
      count = extra.length;
      return count ? { ...s, items: [...s.items, ...extra] } : s;
    });
    return count;
  },
  remove(id: ExerciseId) {
    menuStore.set((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  },
  /** Remove several items at once (e.g. every exercise added from one recovery-plan step). */
  removeMany(ids: ExerciseId[]) {
    const drop = new Set(ids);
    menuStore.set((s) => ({ ...s, items: s.items.filter((i) => !drop.has(i.id)) }));
  },
  /** Put back removed items at their old positions (undo). */
  restore(entries: { item: MenuItem; index: number }[]) {
    menuStore.set((s) => {
      const items = [...s.items];
      for (const { item, index } of [...entries].sort((a, b) => a.index - b.index)) {
        if (items.some((i) => i.id === item.id) || !VALID.has(item.id)) continue;
        items.splice(Math.min(index, items.length), 0, item);
      }
      return { ...s, items };
    });
  },
  toggle(id: ExerciseId, from?: MenuItem['from']): boolean {
    const has = menuStore.get().items.some((i) => i.id === id);
    if (has) menuActions.remove(id);
    else menuActions.add(id, from);
    return !has;
  },
  move(id: ExerciseId, dir: -1 | 1) {
    menuStore.set((s) => {
      const i = s.items.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.items.length) return s;
      const items = [...s.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...s, items };
    });
  },
  /** Swap two items (reordering inside a plan-step group, whose items need not be next to each other). */
  swap(a: ExerciseId, b: ExerciseId) {
    menuStore.set((s) => {
      const i = s.items.findIndex((x) => x.id === a);
      const j = s.items.findIndex((x) => x.id === b);
      if (i < 0 || j < 0 || i === j) return s;
      const items = [...s.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...s, items };
    });
  },
  toggleDone(id: ExerciseId, date = todayISO()) {
    menuStore.set((s) => {
      const cur = s.done[date] ?? [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...s, done: prune({ ...s.done, [date]: next }) };
    });
  },
};

/**
 * How often an exercise is meant to be done, from its dose text: 毎日 / 1日n回 → daily (on today's checklist);
 * 週n回 / 週n〜m回 / 1日おき → n times a week (a weekly target, not a daily to-do: tendon loading is done every other
 * day). The note in brackets (「（毎日でも可）」) does not change the target.
 */
export type Frequency = { kind: 'daily' } | { kind: 'weekly'; min: number; max: number };

export function parseFrequency(text: string | undefined): Frequency {
  const f = (text ?? '').replace(/[（(][^）)]*[）)]/g, '').trim();
  if (/^毎日|^1日\d/.test(f)) return { kind: 'daily' };
  const w = f.match(/週\s*(\d+)\s*(?:[〜~～-]\s*(\d+))?\s*回/);
  if (w) {
    const min = Number(w[1]);
    return { kind: 'weekly', min, max: w[2] ? Number(w[2]) : /以上|毎日/.test(f) ? 7 : min };
  }
  if (/1日おき|隔日/.test(f)) return { kind: 'weekly', min: 3, max: 4 };
  return { kind: 'daily' };
}

export const frequencyOf = (id: ExerciseId): Frequency => parseFrequency(getExercise(id)?.dose.frequency);

export function useMenu() {
  const state = useStore(menuStore);
  const today = todayISO();
  return useMemo(() => {
    const ids = new Set(state.items.map((i) => i.id));
    const doneToday = new Set((state.done[today] ?? []).filter((x) => ids.has(x)));
    // only exercises that are still on the menu count (same rule as today's progress)
    const week = weekOf(today).map((date) => ({
      date,
      count: (state.done[date] ?? []).filter((x) => ids.has(x)).length,
    }));
    const weekDates = weekOf(today);
    /** days of this week (Mon–Sun) the exercise was checked */
    const weekCount = (id: ExerciseId) => weekDates.filter((d) => (state.done[d] ?? []).includes(id)).length;
    const daily = state.items.filter((i) => frequencyOf(i.id).kind === 'daily');
    const weekly = state.items.filter((i) => frequencyOf(i.id).kind === 'weekly');
    const weeklyTarget = weekly.reduce((a, i) => a + (frequencyOf(i.id) as { min: number }).min, 0);
    const weeklyDone = weekly.reduce((a, i) => a + Math.min(weekCount(i.id), (frequencyOf(i.id) as { min: number }).min), 0);
    const yesterday = addDays(today, -1);
    return {
      items: state.items,
      today,
      has: (id: ExerciseId) => ids.has(id),
      isDone: (id: ExerciseId, date = today) => (state.done[date] ?? []).includes(id),
      doneTodayCount: doneToday.size,
      /** daily exercises (毎日): today's checklist */
      dailyTotal: daily.length,
      dailyDoneToday: daily.filter((i) => doneToday.has(i.id)).length,
      /** weekly exercises (週n回 / 1日おき): sessions done this week toward their targets */
      weeklyCount: weekly.length,
      weeklyTarget,
      weeklyDone,
      weekCount,
      /** a weekly exercise done yesterday: today can be a rest day (腱・筋力の運動は1日おき) */
      restToday: (id: ExerciseId) => frequencyOf(id).kind === 'weekly' && !doneToday.has(id) && (state.done[yesterday] ?? []).includes(id),
      week,
      weekTotal: week.reduce((a, d) => a + d.count, 0),
      weekActiveDays: week.filter((d) => d.count > 0).length,
      ...menuActions,
    };
  }, [state, today]);
}
