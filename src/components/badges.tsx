import type { Discipline, EvidenceLevel, ExerciseType, InvolvementRole } from '../data';
import {
  DISCIPLINE_JA,
  EVIDENCE_JA,
  EXERCISE_TYPE_JA,
  LEVEL_JA,
  LIKELIHOOD_JA,
  ROLE_JA,
  isPrimaryRole,
} from '../lib/labels';
import { DISCIPLINE_ICON } from './icons';

export function DisciplineBadge({ d, large }: { d: Discipline; large?: boolean }) {
  const Icon = DISCIPLINE_ICON[d];
  return (
    <span className={`badge badge--${d}${large ? ' badge--lg' : ''}`}>
      <Icon />
      {DISCIPLINE_JA[d]}
    </span>
  );
}

export function DisciplineBadges({ list, large }: { list: Discipline[]; large?: boolean }) {
  const order: Discipline[] = ['swim', 'bike', 'run'];
  return (
    <>
      {order
        .filter((d) => list.includes(d))
        .map((d) => (
          <DisciplineBadge key={d} d={d} large={large} />
        ))}
    </>
  );
}

export function LikelihoodBadge({ l }: { l: keyof typeof LIKELIHOOD_JA }) {
  const cls = l === 'common' ? 'badge--accent' : l === 'possible' ? 'badge--neutral' : 'badge--outline';
  return <span className={`badge ${cls}`}>{LIKELIHOOD_JA[l]}</span>;
}

/** `label` replaces the role word where the red does not mean damage (「つりやすい」 / 「痛みやすい」). */
export function RoleBadge({ role, label }: { role: InvolvementRole; label?: string }) {
  return <span className={`badge ${isPrimaryRole(role) ? 'badge--injured' : 'badge--involved'}`}>{label ?? ROLE_JA[role]}</span>;
}

export function TypeBadge({ type }: { type: ExerciseType }) {
  const c =
    type === 'stretch' || type === 'mobility' || type === 'nerve-glide'
      ? 'badge--swim'
      : type === 'activation' || type === 'balance'
        ? 'badge--run'
        : 'badge--accent';
  return <span className={`badge ${c}`}>{EXERCISE_TYPE_JA[type] ?? type}</span>;
}

export function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="badge badge--neutral">
      <LevelBars level={level} />
      <span className="sr-only">レベル</span>
      {LEVEL_JA[level] ?? `Lv.${level}`}
    </span>
  );
}

function LevelBars({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1 + i * 3.8}
          y={8 - i * 3}
          width="2.6"
          height={3 + i * 3}
          rx="0.8"
          fill="currentColor"
          opacity={i < level ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const c =
    level === 'strong' ? 'badge--ok' : level === 'moderate' ? 'badge--swim' : level === 'limited' ? 'badge--bike' : 'badge--neutral';
  return <span className={`badge ${c}`}>根拠: {EVIDENCE_JA[level] ?? level}</span>;
}

export function Wip({ label = '準備中' }: { label?: string }) {
  return <span className="pill-wip">{label}</span>;
}
