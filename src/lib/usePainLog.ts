// 痛みログ: dated pain entries per pain spot. Persisted with safe storage (this device only).
import { useMemo } from 'react';
import { PAIN_SPOTS, type PainSpotId } from '../data';
import { createStore, useStore } from './storage';
import { addDays, isISODate, todayISO } from './date';

export type PainContext = 'swim' | 'bike' | 'run' | 'daily' | 'morning';
export type PainSide = 'left' | 'right' | 'both';

export interface PainEntry {
  id: string;
  date: string; // YYYY-MM-DD
  spot: PainSpotId;
  side: PainSide;
  score: number; // 0–10
  context: PainContext;
  note: string;
  createdAt: number;
}

const SPOTS = new Set<string>(PAIN_SPOTS.map((s) => s.id));
const CONTEXTS: PainContext[] = ['swim', 'bike', 'run', 'daily', 'morning'];
const SIDES: PainSide[] = ['left', 'right', 'both'];

function sanitize(raw: unknown): PainEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PainEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const x = e as Partial<PainEntry>;
    if (typeof x.id !== 'string' || !isISODate(x.date) || !SPOTS.has(x.spot as string)) continue;
    const score = Math.round(Number(x.score));
    if (!Number.isFinite(score)) continue;
    out.push({
      id: x.id,
      date: x.date,
      spot: x.spot as PainSpotId,
      side: SIDES.includes(x.side as PainSide) ? (x.side as PainSide) : 'both',
      score: Math.min(10, Math.max(0, score)),
      context: CONTEXTS.includes(x.context as PainContext) ? (x.context as PainContext) : 'daily',
      note: typeof x.note === 'string' ? x.note.slice(0, 500) : '',
      createdAt: typeof x.createdAt === 'number' ? x.createdAt : 0,
    });
  }
  return out;
}

export const painLogStore = createStore<PainEntry[]>('tribody.painlog.v1', sanitize);

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const painLogActions = {
  add(e: Omit<PainEntry, 'id' | 'createdAt'>) {
    painLogStore.set((list) => [...list, { ...e, id: newId(), createdAt: Date.now() }]);
  },
  remove(id: string) {
    painLogStore.set((list) => list.filter((e) => e.id !== id));
  },
};

export function usePainLog() {
  const entries = useStore(painLogStore);
  return useMemo(() => {
    const sorted = [...entries].sort((a, b) =>
      a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
    );
    /** Max score (> 0) per spot over the last `days` days (for BodyMap intensity / recently painful spots). */
    const recentIntensity = (days = 14) => {
      const from = addDays(todayISO(), -(days - 1));
      const out: Partial<Record<PainSpotId, number>> = {};
      for (const e of entries) {
        // a 0 (痛みなし) entry is not a painful spot
        if (e.date < from || e.score <= 0) continue;
        out[e.spot] = Math.max(out[e.spot] ?? 0, e.score);
      }
      return out;
    };
    return { entries: sorted, recentIntensity, ...painLogActions };
  }, [entries]);
}

export function scoreColorVar(score: number): string {
  if (score <= 3) return 'var(--ok)';
  if (score <= 6) return 'var(--bike)';
  return 'var(--danger)';
}

export function scoreLabel(score: number): string {
  if (score === 0) return '痛みなし';
  if (score <= 3) return '軽い';
  if (score <= 6) return '中くらい';
  return '強い';
}
