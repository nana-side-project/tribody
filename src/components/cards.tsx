// List cards for conditions, muscles, exercises, guides.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  getCondition,
  getExercise,
  getGuide,
  getMuscle,
  type ConditionId,
  type Exercise,
  type ExerciseId,
  type ExerciseType,
  type GuideId,
  type MuscleId,
} from '../data';
import { conditionName, doseShort, exerciseName, guideTitle, muscleName } from '../lib/labels';
import { DisciplineBadges, LevelBadge, LikelihoodBadge, TypeBadge, Wip } from './badges';
import { IconBalance, IconBolt, IconBook, IconChevron, IconDumbbell, IconPulse, IconStretch } from './icons';
import { prefetchViewer } from './Viewer3D';

export function ConditionCard({
  id,
  likelihood,
  showSummary = true,
  search = '',
}: {
  id: ConditionId;
  likelihood?: 'common' | 'possible' | 'rare';
  showSummary?: boolean;
  /** e.g. '?spot=knee-front': the condition page opens its figure on the view with that spot */
  search?: string;
}) {
  const c = getCondition(id);
  return (
    <Link to={`/condition/${id}${search}`} className="card">
      <div className="card__row">
        <div className="grow">
          {(likelihood || !c) && (
            <div className="card__foot" style={{ marginTop: 0, marginBottom: 6 }}>
              {likelihood && <LikelihoodBadge l={likelihood} />}
              {!c && <Wip />}
            </div>
          )}
          <p className="card__title">{conditionName(id)}</p>
          {c && c.aka.length > 0 && <p className="card__sub">{c.aka.slice(0, 3).join('・')}</p>}
          {c && showSummary && <p className="card__text clamp-2">{c.summary}</p>}
          {c && c.disciplines.length > 0 && (
            <div className="card__foot">
              <DisciplineBadges list={c.disciplines} />
            </div>
          )}
        </div>
        <IconChevron className="chev" />
      </div>
    </Link>
  );
}

export function MuscleCard({ id }: { id: MuscleId }) {
  const m = getMuscle(id);
  return (
    <Link to={`/muscle/${id}`} className="card" onPointerDown={prefetchViewer}>
      <div className="card__row">
        <span className="ex-card__icon ex-card__icon--strength" aria-hidden="true">
          <MuscleGlyph />
        </span>
        <div className="grow">
          <p className="card__title">{muscleName(id)}</p>
          {m ? (
            <p className="card__sub">
              {m.kana}
              <span className="en"> · {m.nameEn}</span>
            </p>
          ) : (
            <div className="card__foot" style={{ marginTop: 4 }}>
              <Wip />
            </div>
          )}
          {m?.group && (
            <div className="card__foot" style={{ marginTop: 8 }}>
              <span className="badge badge--neutral">{m.group}</span>
            </div>
          )}
        </div>
        <IconChevron className="chev" />
      </div>
    </Link>
  );
}

function MuscleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M12 3.5v2.5M12 18v2.5" stroke="var(--text-3)" />
      <path d="M12 5.5c3.6 1.8 3.6 11.2 0 13-3.6-1.8-3.6-11.2 0-13z" fill="currentColor" fillOpacity={0.18} />
      <circle cx="12" cy="3.5" r="1.6" fill="var(--origin)" stroke="none" />
      <circle cx="12" cy="20.5" r="1.6" fill="var(--insertion)" stroke="none" />
    </svg>
  );
}

export function TypeIcon({ type }: { type: ExerciseType }) {
  switch (type) {
    case 'stretch':
    case 'mobility':
    case 'nerve-glide':
      return <IconStretch />;
    case 'balance':
      return <IconBalance />;
    case 'plyometric':
      return <IconBolt />;
    case 'activation':
      return <IconPulse />;
    default:
      return <IconDumbbell />;
  }
}

export function ExerciseCard({
  id,
  extra,
  search = '',
  dose,
}: {
  id: ExerciseId;
  extra?: ReactNode;
  /** e.g. '?from=<condition>&phase=build' */
  search?: string;
  /** the dose to show instead of the exercise's own (a recovery-plan step's dose, src/lib/dose.ts) */
  dose?: Exercise['dose'];
}) {
  const e = getExercise(id);
  return (
    <Link to={`/exercise/${id}${search}`} className="card" onPointerDown={prefetchViewer}>
      <div className="card__row">
        <span className={`ex-card__icon${e ? ` ex-card__icon--${e.type}` : ''}`} aria-hidden="true">
          {e ? <TypeIcon type={e.type} /> : <IconDumbbell />}
        </span>
        <div className="grow">
          <p className="card__title">{exerciseName(id)}</p>
          {e ? (
            <>
              <p className="card__sub">{doseShort(dose ?? e.dose) || e.nameEn}</p>
              <div className="card__foot" style={{ marginTop: 8 }}>
                <TypeBadge type={e.type} />
                <LevelBadge level={e.level} />
                {extra}
              </div>
            </>
          ) : (
            <div className="card__foot" style={{ marginTop: 4 }}>
              <Wip />
              {extra}
            </div>
          )}
        </div>
        <IconChevron className="chev" />
      </div>
    </Link>
  );
}

export function GuideCard({ id }: { id: GuideId }) {
  const g = getGuide(id);
  return (
    <Link to={`/guide/${id}`} className="card">
      <div className="card__row">
        <span className="ex-card__icon" aria-hidden="true">
          <IconBook />
        </span>
        <div className="grow">
          <p className="card__title">{guideTitle(id)}</p>
          {g ? <p className="card__text clamp-2" style={{ marginTop: 4 }}>{g.summary}</p> : <div className="card__foot" style={{ marginTop: 4 }}><Wip /></div>}
        </div>
        <IconChevron className="chev" />
      </div>
    </Link>
  );
}
