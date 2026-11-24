// Lightweight Japanese-aware search over conditions, muscles and exercises.
// Normalises full/half width (NFKC), case, and katakana → hiragana so 'ちゅうでんきん' / 'チュウデンキン' / '中殿筋' all work.
import { CONDITIONS, EXERCISES, MUSCLES, getCondition, getExercise, getMuscle } from '../data';
import { EXERCISE_TYPE_JA } from './labels';

export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s・･\-‐–—ー_/.,、。（）()「」［］[\]]/g, '');
}

export type SearchKind = 'condition' | 'muscle' | 'exercise';

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  sub: string;
  to: string;
  ready: boolean;
  score: number;
}

interface IndexEntry extends Omit<SearchHit, 'score'> {
  primary: string[]; // normalised title fields
  secondary: string[]; // normalised other fields
}

let index: IndexEntry[] | null = null;

function build(): IndexEntry[] {
  const out: IndexEntry[] = [];
  for (const r of CONDITIONS) {
    const c = getCondition(r.id);
    const title = c?.nameJa ?? r.ja;
    out.push({
      kind: 'condition',
      id: r.id,
      title,
      sub: c ? [c.aka.slice(0, 2).join('・'), c.nameEn].filter(Boolean).join(' / ') : '',
      to: `/condition/${r.id}`,
      ready: !!c,
      primary: [title, r.ja].map(normalize),
      secondary: c ? [...c.aka, c.nameEn].map(normalize) : [],
    });
  }
  for (const r of MUSCLES) {
    const m = getMuscle(r.id);
    const title = m?.nameJa ?? r.ja;
    out.push({
      kind: 'muscle',
      id: r.id,
      title,
      sub: m ? `${m.kana} / ${m.nameEn}` : '',
      to: `/muscle/${r.id}`,
      ready: !!m,
      primary: [title, r.ja, m?.kana ?? ''].filter(Boolean).map(normalize),
      secondary: m ? [m.nameEn, m.group ?? ''].filter(Boolean).map(normalize) : [],
    });
  }
  for (const r of EXERCISES) {
    const e = getExercise(r.id);
    const title = e?.nameJa ?? r.ja;
    out.push({
      kind: 'exercise',
      id: r.id,
      title,
      sub: e ? `${EXERCISE_TYPE_JA[e.type] ?? ''} / ${e.nameEn}` : '',
      to: `/exercise/${r.id}`,
      ready: !!e,
      primary: [title, r.ja].map(normalize),
      secondary: e ? [e.nameEn].map(normalize) : [],
    });
  }
  return out;
}

function scoreEntry(e: IndexEntry, terms: string[]): number {
  let total = 0;
  for (const t of terms) {
    let best = 0;
    for (const p of e.primary) {
      if (p === t) best = Math.max(best, 100);
      else if (p.startsWith(t)) best = Math.max(best, 60);
      else if (p.includes(t)) best = Math.max(best, 40);
    }
    for (const s of e.secondary) {
      if (s.startsWith(t)) best = Math.max(best, 30);
      else if (s.includes(t)) best = Math.max(best, 20);
    }
    if (!best) return 0;
    total += best;
  }
  return total + (e.ready ? 5 : 0);
}

export function search(query: string, kinds?: SearchKind[]): SearchHit[] {
  const terms = query
    .split(/[\s　]+/)
    .map(normalize)
    .filter(Boolean);
  if (!terms.length) return [];
  index ??= build();
  const hits: SearchHit[] = [];
  for (const e of index) {
    if (kinds && !kinds.includes(e.kind)) continue;
    const score = scoreEntry(e, terms);
    if (score > 0) {
      const { primary: _p, secondary: _s, ...rest } = e;
      hits.push({ ...rest, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ja'));
}

/** Does `text` (any of the fields) contain every term of `query`? For list filtering. */
export function matches(query: string, fields: (string | undefined)[]): boolean {
  const terms = query
    .split(/[\s　]+/)
    .map(normalize)
    .filter(Boolean);
  if (!terms.length) return true;
  const hay = fields.filter(Boolean).map((f) => normalize(f as string));
  return terms.every((t) => hay.some((h) => h.includes(t)));
}

/** Normalised search terms of a query (split on spaces). */
export function queryTerms(query: string): string[] {
  return query
    .split(/[\s　]+/)
    .map(normalize)
    .filter(Boolean);
}

/**
 * Rank pre-normalised field tiers (tier 0 = best, e.g. the name) against `terms`.
 * Every term must be found in some tier; returns 0 when one is missing, otherwise a score where
 * hits in earlier tiers weigh more (and a name that starts with the term gets a bonus).
 */
export function tierScore(terms: string[], tiers: string[][]): number {
  if (!terms.length) return 1;
  let total = 0;
  for (const t of terms) {
    let best = 0;
    tiers.forEach((fields, i) => {
      const w = (tiers.length - i) * 10;
      for (const f of fields) {
        if (!f.includes(t)) continue;
        best = Math.max(best, w + (i === 0 && f.startsWith(t) ? 5 : 0));
      }
    });
    if (!best) return 0;
    total += best;
  }
  return total;
}
