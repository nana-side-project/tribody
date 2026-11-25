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

const sameEntry = (a: PainEntry, b: PainEntry) =>
  a.date === b.date && a.spot === b.spot && a.side === b.side && a.score === b.score && a.context === b.context && a.note === b.note;

export const painLogActions = {
  add(e: Omit<PainEntry, 'id' | 'createdAt'>) {
    painLogStore.set((list) => [...list, { ...e, id: newId(), createdAt: Date.now() }]);
  },
  /**
   * Merge a backup (this app's JSON export: `{ entries: [...] }` or a bare array) into the log. Entries go through the
   * same sanitizer as stored data; ones already in the log (same id, or same date/spot/side/score/context/note) are
   * skipped. Returns how many were added and skipped; throws when the file is not a TriBody pain-log backup.
   */
  importBackup(raw: unknown): { added: number; skipped: number } {
    const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? (raw as { entries?: unknown }).entries : undefined;
    if (!Array.isArray(list)) throw new Error('not a pain-log backup');
    // old exports have no id / createdAt: give them one so the sanitizer keeps them
    const withIds = list.map((e, i) =>
      e && typeof e === 'object' ? { createdAt: 0, ...(e as object), id: typeof (e as { id?: unknown }).id === 'string' ? (e as { id: string }).id : `imp${i}-${newId()}` } : e,
    );
    const incoming = sanitize(withIds);
    if (list.length && !incoming.length) throw new Error('no valid entries');
    let added = 0;
    let skipped = 0;
    painLogStore.set((cur) => {
      const next = [...cur];
      for (const e of incoming) {
        if (next.some((x) => x.id === e.id || sameEntry(x, e))) {
          skipped++;
          continue;
        }
        next.push(e);
        added++;
      }
      return added ? next : cur;
    });
    return { added, skipped };
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
    /**
     * Max score (> 0) per spot AND side over the last `days` days, strongest first. The body map can only tint a spot
     * on both sides (its intensity is per spot), so the log lists the sides next to it.
     */
    const recentBySide = (days = 14) => {
      const from = addDays(todayISO(), -(days - 1));
      const m = new Map<string, { spot: PainSpotId; side: PainSide; max: number; last: string }>();
      for (const e of entries) {
        if (e.date < from || e.score <= 0) continue;
        const k = `${e.spot}|${e.side}`;
        const cur = m.get(k);
        m.set(k, { spot: e.spot, side: e.side, max: Math.max(cur?.max ?? 0, e.score), last: cur && cur.last > e.date ? cur.last : e.date });
      }
      return [...m.values()].sort((a, b) => b.max - a.max || (a.last < b.last ? 1 : -1));
    };
    /**
     * The body map's per-side tint (BodyMapProps.intensitySides / activeSides) over the last `days` days: an entry for
     * one side tints that side only, a 'both' entry tints both.
     */
    const recentSides = (days = 14) => {
      const intensitySides: Partial<Record<PainSpotId, { left?: number; right?: number; both?: number }>> = {};
      const activeSides: Partial<Record<PainSpotId, ('left' | 'right')[]>> = {};
      for (const x of recentBySide(days)) {
        const cur = (intensitySides[x.spot] ??= {});
        cur[x.side] = Math.max(cur[x.side] ?? 0, x.max);
        const act = (activeSides[x.spot] ??= []);
        for (const s of x.side === 'both' ? (['left', 'right'] as const) : [x.side]) if (!act.includes(s)) act.push(s);
      }
      return { intensitySides, activeSides };
    };
    return { entries: sorted, recentIntensity, recentBySide, recentSides, ...painLogActions };
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
