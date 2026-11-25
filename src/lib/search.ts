// Japanese-aware search over conditions, muscles and exercises (home search and the two libraries share it).
// Normalises full/half width (NFKC), case, katakana → hiragana and a few kanji variants, so 'ちゅうでんきん' /
// 'チュウデンキン' / '中殿筋' all work, and expands everyday words to the terms the content uses (ひざ → 膝).
//
// Everyday phrasing is reduced to its subject: 「膝が痛い」「かかとの痛み」「膝痛」「坐骨神経痛」 search for 膝 / かかと /
// 膝 / 坐骨神経 (the full word is tried too), and a lone 「痛い」 next to another word adds nothing.
//
// Ranking (per query word; every word must match somewhere):
//   name exact 100 · alias (通称 / group / part) exact 95 · name prefix 85 · alias prefix 80
//   · target exact 70 (body region, target muscle / structure, exercise type) · related exact 70 (the conditions an
//   exercise is prescribed for / a muscle is involved in) · name contains 60 · alias contains 55 · target prefix 50
//   · related prefix 50 · target contains 40 · related contains 25 · description text 20
// plus up to +5 for every further mention in the description, which only orders items within a tier
// (heel drops before calf raises for 'アキレス': both are prescribed for Achilles pain, the heel drops are about it).
// A query that talks about pain (「膝が痛い」) adds +30 to the conditions, so they come before muscles and exercises.
import {
  CONDITIONS,
  EXERCISES,
  MUSCLES,
  conditionsUsingExercise,
  getCondition,
  getExercise,
  getMuscle,
  getPainSpot,
  refName,
  type ExerciseId,
  type MuscleId,
} from '../data';
import { EXERCISE_TYPE_JA, isPrimaryRole, regionName } from './labels';

export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/靭/g, '靱')
    .replace(/[\s・･\-‐–—ー_/.,、。（）()「」［］[\]]/g, '');
}

/**
 * Everyday words → the words the content uses (keys and values are normalised on first use). A query word also
 * matches any of its aliases.
 */
const ALIAS_SOURCE: Record<string, string[]> = {
  ひざ: ['膝'],
  ヒザ: ['膝'],
  かかと: ['踵'],
  踵: ['かかと'],
  かた: ['肩'],
  こし: ['腰'],
  くび: ['首', '頸'],
  すね: ['脛'],
  脛: ['すね'],
  もも: ['大腿', '太もも'],
  ふともも: ['大腿', '太もも'],
  太もも: ['大腿'],
  大腿: ['太もも'],
  おしり: ['お尻', '殿'],
  しり: ['尻', '殿'],
  尻: ['殿'],
  お尻: ['殿'],
  あしくび: ['足首'],
  足裏: ['足底', '足の裏'],
  足の裏: ['足底', '足裏'],
  あしうら: ['足裏', '足底', '足の裏'],
  足底: ['足裏', '足の裏'],
  ふくらはぎ: ['カーフ', '下腿'],
  カーフ: ['ふくらはぎ'],
  体幹: ['コア'],
  コア: ['体幹'],
  腸脛: ['ITB'],
  itb: ['腸脛'],
  // the back / front of the thigh
  もも裏: ['ハムストリング', '太もも裏', '太ももの裏'],
  太もも裏: ['ハムストリング', 'もも裏', '太ももの裏'],
  太ももの裏: ['ハムストリング', 'もも裏', '太もも裏'],
  ももうら: ['ハムストリング', 'もも裏', '太もも裏'],
  前もも: ['大腿四頭筋', '太もも前', '太ももの前'],
  もも前: ['大腿四頭筋', '太もも前', '太ももの前'],
  太もも前: ['大腿四頭筋', '太ももの前'],
  腹筋: ['腹直筋', '腹横筋', '腹斜筋'],
  坐骨神経: ['梨状筋'],
  // strengthening (exercise types; see TYPE_WORDS)
  筋トレ: ['筋力', 'アイソメトリック'],
  きんとれ: ['筋力', 'アイソメトリック'],
  筋力トレーニング: ['筋力', 'アイソメトリック'],
  補強: ['筋力', 'アイソメトリック'],
  鍛える: ['筋力', 'アイソメトリック'],
  きたえる: ['筋力', 'アイソメトリック'],
};

/**
 * Alias words that name an exercise TYPE: they match the type (and names), never description text, where 「筋力」 is
 * mentioned on almost every page (「筋トレ」 must list the strength exercises, not every condition).
 */
const TYPE_WORDS = new Set(['筋力', 'アイソメトリック'].map((w) => normalize(w)));

/**
 * Short words that also sit inside longer, unrelated words: 首 in 足首 / 手首, 腹筋 in 腓腹筋. A match inside one of
 * these compounds does not count (「首 ストレッチ」 must not list the calf stretches of the 足首 region).
 */
const NOT_INSIDE: Record<string, string[]> = {
  首: ['足首', '手首', '乳首'],
  くび: ['あしくび', 'てくび'],
  腹筋: ['腓腹筋'],
  腹: ['腓腹'],
  // 肩甲（骨）is the shoulder blade: 「肩が痛い」 is about the shoulder joint, so 肩甲骨ジスキネジア / 肩甲下筋 / 肩甲挙筋
  // match by their region, below 水泳肩
  肩: ['肩甲'],
  // a knee posture in an exercise name (膝曲げカーフレイズ, 「膝を伸ばして」) is not about the knee
  膝: ['膝曲げ', '膝を曲げ', '膝を伸ば', '膝立ち', '膝つき'],
};
let notInside: Map<string, string[]> | null = null;
function maskFor(w: string): ((s: string) => string) | null {
  if (!notInside) {
    notInside = new Map(Object.entries(NOT_INSIDE).map(([k, v]) => [normalize(k), v.map(normalize)]));
  }
  const list = notInside.get(w);
  if (!list) return null;
  return (s) => list.reduce((acc, c) => acc.split(c).join('\u0000'), s);
}

/** Pain words at the end of a query word: 「膝が痛い」「かかとの痛み」「膝痛」「ひざがいたい」 → 膝 / かかと / ひざ. */
const PAIN_TAIL = /(?:痛(?:い|み|む|くて|かった)?|いたい|いたみ|いたむ)$/;
const PARTICLE_TAIL = /(?:が|の|を|は|も)$/;

/** The subject of a query word without the pain words / particle ('' when the word is only a pain word). */
function subject(t: string): string {
  const s = t.replace(PAIN_TAIL, '');
  return s === t ? t : s.replace(PARTICLE_TAIL, '');
}
let aliases: Map<string, string[]> | null = null;
function aliasesOf(t: string): string[] {
  if (!aliases) {
    aliases = new Map();
    for (const [k, v] of Object.entries(ALIAS_SOURCE)) {
      const nk = normalize(k);
      aliases.set(nk, [...new Set([...(aliases.get(nk) ?? []), ...v.map(normalize)])]);
    }
  }
  return aliases.get(t) ?? [];
}

/** One query word: the forms it is matched with (「膝痛」 → 膝痛, 膝). */
type Term = string[];

function terms(query: string): Term[] {
  const words = query
    .split(/[\s　]+/)
    .map(normalize)
    .filter(Boolean);
  // a word that is only a pain word (「肩 痛い」) adds nothing — unless it is the whole query
  const kept = words.filter((w) => subject(w) !== '');
  return kept.length ? kept.map((w) => [...new Set([subject(w), w])]) : words.map((w) => [w]);
}

/** Does the query talk about pain (「膝が痛い」「肩痛」「かかとの痛み」, or a lone 「痛い」 next to a body part)? */
function isPainQuery(query: string): boolean {
  return query
    .split(/[\s　]+/)
    .map(normalize)
    .some((w) => w && PAIN_TAIL.test(w));
}
/** Extra score of a condition for a pain query: 「膝が痛い」 lists the knee conditions before muscles and exercises. */
const PAIN_CONDITION_BONUS = 30;

/** Normalised search words of a query (split on spaces; pain words dropped, see `subject`). */
export function queryTerms(query: string): string[] {
  return terms(query).map((t) => t[0]);
}

/** Pre-normalised fields of one item, best first. */
export interface SearchFields {
  /** the item's names (Japanese, registry, English, reading) and its name without the 「（…）」 note */
  names: string[];
  /** other names: 通称, muscle group, named parts */
  aka: string[];
  /** what it is about: body region, target muscles / structures, exercise type */
  target: string[];
  /** the conditions an exercise is prescribed for / a muscle is involved in (weaker than target when only contained:
   *  「靱帯」 must not rank the ITBS rehab first just because 腸脛靱帯症候群 contains it) */
  related?: string[];
  /** description text */
  body: string[];
}

/** Text → itself plus its pieces split at ・ and （…）, so '足首・アキレス腱' also matches 'アキレス腱' exactly. */
function pieces(s: string | undefined): string[] {
  if (!s) return [];
  return [s, ...s.split(/[・/／（）()]/)].map((x) => x.trim()).filter(Boolean);
}
const norm = (list: (string | undefined)[]) => [...new Set(list.filter((x): x is string => !!x).map(normalize).filter(Boolean))];

function fieldsFrom(raw: {
  names: (string | undefined)[];
  aka?: (string | undefined)[];
  target?: (string | undefined)[];
  related?: (string | undefined)[];
  body?: (string | undefined)[];
}): SearchFields {
  const base = raw.names.map((n) => n?.split(/[（(]/)[0]);
  return {
    names: norm([...raw.names, ...base]),
    aka: norm((raw.aka ?? []).flatMap(pieces)),
    target: norm((raw.target ?? []).flatMap(pieces)),
    related: norm((raw.related ?? []).flatMap(pieces)),
    body: norm(raw.body ?? []),
  };
}

function count(hay: string, t: string): number {
  let n = 0;
  for (let i = hay.indexOf(t); i >= 0; i = hay.indexOf(t, i + t.length)) n++;
  return n;
}

/** Score of one query word (its forms and their aliases) against an item's fields; 0 = no match. */
function termScore(term: Term, f: SearchFields): number {
  let best = 0;
  let mentions = 0;
  const words = [...new Set(term.flatMap((t) => [t, ...aliasesOf(t)]))];
  for (const w of words) {
    const mask = maskFor(w);
    const m = (s: string) => (mask ? mask(s) : s);
    for (const x of f.names) {
      const s = m(x);
      best = Math.max(best, s === w ? 100 : s.startsWith(w) ? 85 : s.includes(w) ? 60 : 0);
    }
    for (const x of f.aka) {
      const s = m(x);
      best = Math.max(best, s === w ? 95 : s.startsWith(w) ? 80 : s.includes(w) ? 55 : 0);
    }
    for (const x of f.target) {
      const s = m(x);
      best = Math.max(best, s === w ? 70 : s.startsWith(w) ? 50 : s.includes(w) ? 40 : 0);
    }
    for (const x of f.related ?? []) {
      const s = m(x);
      best = Math.max(best, s === w ? 70 : s.startsWith(w) ? 50 : s.includes(w) ? 25 : 0);
    }
    if (TYPE_WORDS.has(w)) continue;
    for (const s of f.body) mentions += count(m(s), w);
  }
  if (mentions) best = Math.max(best, 20);
  return best ? best + Math.min(5, Math.max(0, mentions - (best === 20 ? 1 : 0))) : 0;
}

/** Score of an item for the whole query: every word must match; 0 = no match. */
function scoreTerms(ts: Term[], f: SearchFields): number {
  let total = 0;
  for (const t of ts) {
    const s = termScore(t, f);
    if (!s) return 0;
    total += s;
  }
  return total;
}

/** Score of an item for a query: every word must match; 0 = no match. */
export function scoreFields(query: string, f: SearchFields): number {
  return scoreTerms(terms(query), f);
}

// ───────────────────────── per-kind fields ─────────────────────────

const involvedNames = (refs: string[]) => refs.map((r) => refName(r));

function conditionFields(id: string, ja: string): SearchFields {
  const c = getCondition(id);
  return fieldsFrom({
    names: [c?.nameJa, ja, c?.nameEn],
    aka: c?.aka ?? [],
    target: c
      ? [
          regionName(c.region),
          ...involvedNames(c.involved.filter((i) => i.role !== 'nearby').map((i) => i.ref)),
          ...c.painSpots.map((p) => getPainSpot(p)?.label),
        ]
      : [],
    // tissue that only runs close by (近くの組織) is context: it finds the condition, below the involved parts
    related: c ? involvedNames(c.involved.filter((i) => i.role === 'nearby').map((i) => i.ref)) : [],
    body: c ? [c.summary, ...c.whatHappens, ...c.symptoms] : [],
  });
}

function muscleFields(id: string, ja: string): SearchFields {
  const m = getMuscle(id);
  return fieldsFrom({
    names: [m?.nameJa, ja, m?.kana, m?.nameEn],
    aka: m ? [m.group, ...(m.parts ?? []).flatMap((p) => [p.nameJa, p.nameEn])] : [],
    target: m ? m.regions.map(regionName) : [],
    related: m ? m.relatedConditions.flatMap((c) => [getCondition(c)?.nameJa, ...(getCondition(c)?.aka ?? [])]) : [],
    body: m ? [m.origin, m.insertion, ...m.actions, m.summary, m.whenTight, m.whenWeak, m.palpation] : [],
  });
}

function exerciseFields(id: string, ja: string): SearchFields {
  const e = getExercise(id);
  const musc = (ids: string[]) =>
    ids.flatMap((mid) => {
      const m = getMuscle(mid);
      return [m?.nameJa ?? refName(mid), m?.kana, m?.nameEn, m?.group];
    });
  return fieldsFrom({
    names: [e?.nameJa, ja, e?.nameEn],
    target: e
      ? [
          ...e.regions.map(regionName),
          ...musc(e.primary),
          EXERCISE_TYPE_JA[e.type],
          // the painful tissue of the conditions it is prescribed for (足首の捻挫 → 前距腓靱帯: 「靱帯」 finds its rehab)
          ...conditionsUsingExercise(e.id).flatMap((c) => c.involved.filter((i) => isPrimaryRole(i.role)).map((i) => refName(i.ref))),
        ]
      : [],
    related: e ? conditionsUsingExercise(e.id).flatMap((c) => [c.nameJa, ...c.aka, c.nameEn]) : [],
    body: e
      ? [
          e.summary,
          e.setup,
          ...e.steps,
          ...e.cues,
          ...e.mistakes,
          e.caution,
          e.progression,
          e.regression,
          ...Object.values(e.benefit ?? {}),
          ...musc(e.secondary),
          ...(e.equipment ?? []),
        ]
      : [],
  });
}

// ───────────────────────── home search (all kinds) ─────────────────────────

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
  fields: SearchFields;
  order: number;
}

let index: IndexEntry[] | null = null;

function build(): IndexEntry[] {
  const out: IndexEntry[] = [];
  for (const r of CONDITIONS) {
    const c = getCondition(r.id);
    out.push({
      kind: 'condition',
      id: r.id,
      title: c?.nameJa ?? r.ja,
      sub: c ? [c.aka.slice(0, 2).join('・'), c.nameEn].filter(Boolean).join(' / ') : '',
      to: `/condition/${r.id}`,
      ready: !!c,
      fields: conditionFields(r.id, r.ja),
      order: out.length,
    });
  }
  for (const r of MUSCLES) {
    const m = getMuscle(r.id);
    out.push({
      kind: 'muscle',
      id: r.id,
      title: m?.nameJa ?? r.ja,
      sub: m ? `${m.kana} / ${m.nameEn}` : '',
      to: `/muscle/${r.id}`,
      ready: !!m,
      fields: muscleFields(r.id, r.ja),
      order: out.length,
    });
  }
  for (const r of EXERCISES) {
    const e = getExercise(r.id);
    out.push({
      kind: 'exercise',
      id: r.id,
      title: e?.nameJa ?? r.ja,
      sub: e ? `${EXERCISE_TYPE_JA[e.type] ?? ''} / ${e.nameEn}` : '',
      to: `/exercise/${r.id}`,
      ready: !!e,
      fields: exerciseFields(r.id, r.ja),
      order: out.length,
    });
  }
  return out;
}

function entries(): IndexEntry[] {
  index ??= build();
  return index;
}

/** Ranked hits for the home search (best first; content-ready items before 準備中 ones at the same score). */
export function search(query: string, kinds?: SearchKind[]): SearchHit[] {
  const ts = terms(query);
  if (!ts.length) return [];
  const pain = isPainQuery(query);
  const hits: (SearchHit & { order: number })[] = [];
  for (const e of entries()) {
    if (kinds && !kinds.includes(e.kind)) continue;
    const score = scoreTerms(ts, e.fields);
    if (score > 0) {
      const { fields: _f, ...rest } = e;
      // someone who says where it hurts is looking for what it could be first
      const bonus = pain && e.kind === 'condition' ? PAIN_CONDITION_BONUS : 0;
      hits.push({ ...rest, score: score + bonus + (e.ready ? 1 : 0) });
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.order - b.order).map(({ order: _o, ...h }) => h);
}

/** Scores of every item of one kind for a query (0 = no match); for ranking the library lists. */
function scoresOf(kind: SearchKind, query: string): Map<string, number> {
  const ts = terms(query);
  const out = new Map<string, number>();
  for (const e of entries()) if (e.kind === kind) out.set(e.id, ts.length ? scoreTerms(ts, e.fields) : 1);
  return out;
}
export const exerciseScores = (query: string) => scoresOf('exercise', query) as Map<ExerciseId, number>;
export const muscleScores = (query: string) => scoresOf('muscle', query) as Map<MuscleId, number>;

/** Does `text` (any of the fields) contain every word of `query`? For simple list filtering. */
export function matches(query: string, fields: (string | undefined)[]): boolean {
  const ts = terms(query);
  if (!ts.length) return true;
  const hay = fields.filter(Boolean).map((f) => normalize(f as string));
  return ts.every((t) => t.flatMap((x) => [x, ...aliasesOf(x)]).some((w) => hay.some((h) => h.includes(w))));
}
