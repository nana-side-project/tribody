// Referential-integrity and completeness checks for all content.
// Run: `npm run validate`  (all owners)   or   `OWNER=B npm run validate` (only issues owned by B)
import {
  conditions,
  exercises,
  guides,
  muscles,
  painSpots,
  regions,
  structures,
} from './index';
import {
  CONDITIONS,
  EXERCISES,
  GUIDES,
  MUSCLES,
  PAIN_SPOTS,
  REGIONS,
  STRUCTURES,
  type ContentOwner,
} from './registry';

export interface Issue {
  owner: ContentOwner;
  level: 'error' | 'warn';
  where: string;
  msg: string;
}

const ownerOf = {
  condition: new Map<string, ContentOwner>(CONDITIONS.map((c) => [c.id, c.owner])),
  muscle: new Map<string, ContentOwner>(MUSCLES.map((m) => [m.id, m.owner])),
  exercise: new Map<string, ContentOwner>(EXERCISES.map((e) => [e.id, e.owner])),
};

const nonEmpty = (s: unknown) => typeof s === 'string' && s.trim().length > 0;

export function validate(): Issue[] {
  const issues: Issue[] = [];
  const err = (owner: ContentOwner, where: string, msg: string) =>
    issues.push({ owner, level: 'error', where, msg });
  const warn = (owner: ContentOwner, where: string, msg: string) =>
    issues.push({ owner, level: 'warn', where, msg });

  // ── completeness: every registry id has exactly one object
  const check = (
    kind: string,
    registry: readonly { id: string; owner?: ContentOwner }[],
    list: { id: string }[],
    defaultOwner: ContentOwner = 'E',
  ) => {
    const counts = new Map<string, number>();
    for (const x of list) counts.set(x.id, (counts.get(x.id) ?? 0) + 1);
    for (const r of registry) {
      const n = counts.get(r.id) ?? 0;
      const owner = r.owner ?? defaultOwner;
      if (n === 0) err(owner, `${kind}:${r.id}`, 'missing object for registry id');
      if (n > 1) err(owner, `${kind}:${r.id}`, `defined ${n} times`);
    }
  };
  check('region', REGIONS, regions);
  check('painSpot', PAIN_SPOTS, painSpots);
  check('structure', STRUCTURES, structures);
  check('guide', GUIDES, guides);
  check('condition', CONDITIONS, conditions);
  check('muscle', MUSCLES, muscles);
  check('exercise', EXERCISES, exercises);

  const conditionIds = new Set(conditions.map((c) => c.id));

  // ── conditions
  for (const c of conditions) {
    const o = ownerOf.condition.get(c.id) ?? 'E';
    const w = `condition:${c.id}`;
    const reg = CONDITIONS.find((r) => r.id === c.id);
    if (reg && reg.region !== c.region) err(o, w, `region should be ${reg.region}`);
    for (const f of ['nameJa', 'nameEn', 'summary', 'painRule'] as const)
      if (!nonEmpty(c[f])) err(o, w, `${f} is empty`);
    if (c.whatHappens.length < 1) err(o, w, 'whatHappens is empty');
    if (c.painSpots.length < 1) err(o, w, 'painSpots is empty');
    if (c.disciplines.length < 1) err(o, w, 'disciplines is empty');
    if (!c.involved.some((i) => ['injured', 'compressed', 'irritated'].includes(i.role)))
      err(o, w, 'involved needs at least one injured/compressed/irritated entry');
    for (const i of c.involved) {
      const isMuscle = MUSCLES.some((m) => m.id === i.ref);
      const isStructure = STRUCTURES.some((s) => s.id === i.ref);
      if (i.kind === 'muscle' && !isMuscle) err(o, w, `involved ref ${i.ref} is not a muscle`);
      if (i.kind === 'structure' && !isStructure)
        err(o, w, `involved ref ${i.ref} is not a structure`);
    }
    if (c.whyTriathlon.length < 1) err(o, w, 'whyTriathlon is empty');
    if (c.symptoms.length < 2) err(o, w, 'needs ≥2 symptoms');
    if (c.redFlags.length < 2) err(o, w, 'needs ≥2 redFlags');
    const phaseIds = c.phases.map((p) => p.id).join(',');
    if (phaseIds !== 'calm,build,return') err(o, w, `phases must be calm,build,return (got ${phaseIds})`);
    const totalEx = c.phases.reduce((n, p) => n + p.exercises.length, 0);
    if (totalEx < 3) err(o, w, `needs ≥3 exercises across phases (got ${totalEx})`);
    if (c.trainingTips.length < 1) err(o, w, 'trainingTips is empty');
    if (c.prevention.length < 2) err(o, w, 'needs ≥2 prevention items');
    if (c.evidence.length < 1) err(o, w, 'evidence is empty');
    if (c.references.length < 1) warn(o, w, 'no references');
    for (const d of c.differentials)
      if (d.conditionId && !conditionIds.has(d.conditionId))
        warn(o, w, `differential ${d.conditionId} has no object yet`);
    // bidirectional pain spot link
    for (const s of c.painSpots) {
      const spot = painSpots.find((p) => p.id === s);
      if (spot && !spot.conditions.some((x) => x.id === c.id))
        warn('E', `painSpot:${s}`, `does not list condition ${c.id} (condition lists the spot)`);
    }
  }

  // ── pain spots
  for (const s of painSpots) {
    const w = `painSpot:${s.id}`;
    const reg = PAIN_SPOTS.find((r) => r.id === s.id);
    if (reg && reg.region !== s.region) err('E', w, `region should be ${reg.region}`);
    if (s.conditions.length < 1) err('E', w, 'no conditions');
    for (const x of s.conditions) {
      const c = conditions.find((cc) => cc.id === x.id);
      if (c && !c.painSpots.includes(s.id))
        warn(ownerOf.condition.get(x.id) ?? 'E', `condition:${x.id}`, `painSpots should include ${s.id} (spot lists it)`);
    }
  }

  // ── muscles
  for (const m of muscles) {
    const o = ownerOf.muscle.get(m.id) ?? 'E';
    const w = `muscle:${m.id}`;
    for (const f of ['nameJa', 'kana', 'nameEn', 'origin', 'insertion', 'innervation', 'summary'] as const)
      if (!nonEmpty(m[f])) err(o, w, `${f} is empty`);
    if (m.actions.length < 1) err(o, w, 'actions is empty');
    if (m.regions.length < 1) err(o, w, 'regions is empty');
    if (Object.keys(m.triathlon).length < 1) err(o, w, 'triathlon is empty');
    if (m.strengthen.length + m.stretch.length < 1) err(o, w, 'needs ≥1 strengthen/stretch exercise');
    for (const e of [...m.strengthen, ...m.stretch]) {
      const ex = exercises.find((x) => x.id === e);
      if (ex && !ex.primary.includes(m.id) && !ex.secondary.includes(m.id))
        warn(o, w, `exercise ${e} does not list this muscle in primary/secondary`);
    }
  }

  // ── exercises
  const used = new Set<string>();
  for (const c of conditions) for (const p of c.phases) p.exercises.forEach((e) => used.add(e));
  for (const m of muscles) [...m.strengthen, ...m.stretch].forEach((e) => used.add(e));
  for (const e of exercises) {
    const o = ownerOf.exercise.get(e.id) ?? 'E';
    const w = `exercise:${e.id}`;
    for (const f of ['nameJa', 'nameEn', 'summary', 'setup'] as const)
      if (!nonEmpty(e[f])) err(o, w, `${f} is empty`);
    if (e.primary.length < 1) err(o, w, 'primary is empty');
    if (e.steps.length < 2) err(o, w, 'needs ≥2 steps');
    if (e.cues.length < 1) err(o, w, 'cues is empty');
    if (e.mistakes.length < 1) err(o, w, 'mistakes is empty');
    if (!nonEmpty(e.dose.frequency)) err(o, w, 'dose.frequency is empty');
    if (!used.has(e.id)) warn(o, w, 'not referenced by any condition phase or muscle');
  }

  // ── structures / regions / guides
  for (const s of structures) if (!nonEmpty(s.description)) err('E', `structure:${s.id}`, 'description empty');
  for (const r of regions) {
    if (!nonEmpty(r.description)) err('E', `region:${r.id}`, 'description empty');
    if (r.keyMuscles.length < 1) err('E', `region:${r.id}`, 'keyMuscles empty');
  }
  for (const g of guides) if (g.sections.length < 1) err('E', `guide:${g.id}`, 'no sections');

  return issues;
}

export function formatIssues(issues: Issue[]): string {
  return issues.map((i) => `[${i.owner}] ${i.level.toUpperCase()} ${i.where}: ${i.msg}`).join('\n');
}
