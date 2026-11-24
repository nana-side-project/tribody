import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { conditions, exercisesForMuscle, getMuscle, type Muscle } from '../data';
import { ConditionCard, ExerciseCard } from '../components/cards';
import { DISCIPLINE_ICON, IconHand } from '../components/icons';
import { Page } from '../components/Layout';
import { RegionFigure, findDiagramFor } from '../components/RegionFigure';
import { EmptyState, NameText, Section } from '../components/ui';
import { SafeViewer } from '../components/Viewer3D';
import { DISCIPLINE_JA, DISCIPLINE_ORDER, isKnownMuscle, muscleName, regionName } from '../lib/labels';
import { useRememberedView } from '../lib/useRememberedView';
import NotFoundPage from './NotFoundPage';

export default function MusclePage() {
  const { id = '' } = useParams();
  if (!isKnownMuscle(id)) return <NotFoundPage />;
  const m = getMuscle(id);
  if (!m) {
    return (
      <Page title={muscleName(id)} back="/muscles">
        <header className="page-head">
          <span aria-hidden="true" lang="en" className="kicker">Muscle</span>
          <h1>
            <NameText text={muscleName(id)} />
          </h1>
        </header>
        <div style={{ marginTop: 20 }}>
          <EmptyState title="解説を準備中です" text="この筋肉の解説は現在作成中です。">
            <Link to="/muscles" className="btn btn--secondary">
              筋肉図鑑へ
            </Link>
          </EmptyState>
        </div>
        <WipRelated id={id} />
      </Page>
    );
  }
  return <MuscleView key={id} m={m} />;
}

/** While the muscle article is being written, still show what already references it. */
function WipRelated({ id }: { id: string }) {
  const conds = conditions.filter((c) => c.involved.some((i) => i.ref === id)).map((c) => c.id);
  const exs = exercisesForMuscle(id as Muscle['id']).map((e) => e.id);
  return (
    <>
      {conds.length > 0 && (
        <Section kicker="Related" title="関係する障害">
          <div className="stack stack--sm">
            {conds.map((c) => (
              <ConditionCard key={c} id={c} showSummary={false} />
            ))}
          </div>
        </Section>
      )}
      {exs.length > 0 && (
        <Section kicker="Exercises" title="この筋肉を使うエクササイズ">
          <div className="stack stack--sm">
            {exs.map((e) => (
              <ExerciseCard key={e} id={e} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function MuscleView({ m }: { m: Muscle }) {
  const fig = useMemo(() => findDiagramFor(m.id, m.regions), [m]);
  // no 3D (device without WebGL, a failed download): the 起始・停止 legend would describe nothing
  const [no3d, setNo3d] = useState(false);
  const onNo3d = useCallback(() => setNo3d(true), []);
  const figMemo = useRememberedView(`fig:${fig?.region ?? ''}`);
  const strengthen = m.strengthen ?? [];
  const stretch = m.stretch ?? [];
  const others = exercisesForMuscle(m.id)
    .map((e) => e.id)
    .filter((e) => !strengthen.includes(e) && !stretch.includes(e));

  return (
    <Page title={m.nameJa} back="/muscles">
      <div className="viewer-hero">
        <SafeViewer muscle={m.id} focus={m.regions[0]} height={300} onUnavailable={onNo3d} />
        <div className="viewer-hero__legend" hidden={no3d}>
          <div className="legend">
            <span className="legend__item">
              <span className="dot dot--origin" />
              起始<span className="tiny">（始まる所）</span>
            </span>
            <span className="legend__item">
              <span className="dot dot--insertion" />
              停止<span className="tiny">（付着する所）</span>
            </span>
          </div>
          <span className="tiny">ドラッグで回転</span>
        </div>
      </div>

      <header className="page-head">
        <span className="kicker">{m.regions.map(regionName).join(' · ')}</span>
        <h1>
          <NameText text={m.nameJa} />
        </h1>
        <p className="page-head__en">
          {m.kana} · {m.nameEn}
        </p>
        {(m.group || m.parts?.length) && (
          <div className="meta-row">
            {m.group && <span className="badge badge--muscle">{m.group}</span>}
            {m.parts?.map((p) => (
              <span key={p.nameJa} className="badge badge--outline" title={p.note}>
                {p.nameJa}
              </span>
            ))}
          </div>
        )}
        <p className="lead" style={{ color: 'var(--text)' }}>
          {m.summary}
        </p>
      </header>

      <Section kicker="Anatomy" title="起始・停止・作用">
        <div className="card">
          <div className="kv">
            <div className="kv__item">
              <span className="kv__k">
                <span className="dot dot--origin" />
                起始
              </span>
              <span className="kv__v">{m.origin}</span>
            </div>
            <div className="kv__item">
              <span className="kv__k">
                <span className="dot dot--insertion" />
                停止
              </span>
              <span className="kv__v">{m.insertion}</span>
            </div>
            <div className="kv__item">
              <span className="kv__k">作用</span>
              <div className="kv__v">
                <ul>
                  {m.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="kv__item">
              <span className="kv__k">神経支配</span>
              <span className="kv__v">{m.innervation}</span>
            </div>
          </div>
          {m.parts?.some((p) => p.note) && (
            <>
              <hr className="divider" />
              <div className="parts">
                {m.parts
                  .filter((p) => p.note)
                  .map((p) => (
                    <div key={p.nameJa}>
                      <p className="parts__name">
                        {p.nameJa} <span className="en">{p.nameEn}</span>
                      </p>
                      <p className="parts__note">{p.note}</p>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </Section>

      {fig && (
        <Section kicker="Diagram" title="図で見る位置">
          <RegionFigure
            region={fig.region}
            initialView={figMemo.initialView ?? fig.view}
            onViewChange={figMemo.onViewChange}
            highlights={{ [m.id]: 'selected' }}
            dimOthers
          />
        </Section>
      )}

      {Object.keys(m.triathlon ?? {}).length > 0 && (
        <Section kicker="In triathlon" title="トライアスロンでの役割">
          <div className="stack">
            {DISCIPLINE_ORDER.filter((d) => m.triathlon[d]).map((d) => {
              const Icon = DISCIPLINE_ICON[d];
              return (
                <div key={d} className={`disc-card disc-card--${d}`}>
                  <p className="disc-card__head">
                    <Icon />
                    {DISCIPLINE_JA[d]}
                  </p>
                  <p className="disc-card__body">{m.triathlon[d]}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {(m.whenTight || m.whenWeak) && (
        <Section kicker="When it goes wrong" title="硬いとき・弱いとき">
          <div className="stack">
            {m.whenTight && (
              <div className="card">
                <p className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge--swim">硬い・使いすぎ</span>
                </p>
                <p className="card__text" style={{ color: 'var(--text)' }}>
                  {m.whenTight}
                </p>
              </div>
            )}
            {m.whenWeak && (
              <div className="card">
                <p className="card__title">
                  <span className="badge badge--bike">弱い・働きにくい</span>
                </p>
                <p className="card__text" style={{ color: 'var(--text)' }}>
                  {m.whenWeak}
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      {m.palpation && (
        <Section kicker="Palpation" title="触ってみよう">
          <div className="callout callout--note">
            <IconHand />
            <p style={{ fontSize: 14.5 }}>{m.palpation}</p>
          </div>
        </Section>
      )}

      {m.relatedConditions?.length > 0 && (
        <Section kicker="Related" title="関係する障害">
          <div className="stack stack--sm">
            {m.relatedConditions.map((c) => (
              <ConditionCard key={c} id={c} showSummary={false} />
            ))}
          </div>
        </Section>
      )}

      <Section kicker="Exercises" title="鍛える・伸ばす">
        {strengthen.length === 0 && stretch.length === 0 && others.length === 0 ? (
          <EmptyState compact title="エクササイズは準備中です" />
        ) : (
          <>
            {strengthen.length > 0 && (
              <>
                <p className="phase__label" style={{ marginTop: 0 }}>
                  鍛える
                </p>
                <div className="stack stack--sm">
                  {strengthen.map((e) => (
                    <ExerciseCard key={e} id={e} />
                  ))}
                </div>
              </>
            )}
            {stretch.length > 0 && (
              <>
                <p className="phase__label">伸ばす</p>
                <div className="stack stack--sm">
                  {stretch.map((e) => (
                    <ExerciseCard key={e} id={e} />
                  ))}
                </div>
              </>
            )}
            {others.length > 0 && (
              <>
                <p className="phase__label">この筋肉も使うエクササイズ</p>
                <div className="stack stack--sm">
                  {others.map((e) => (
                    <ExerciseCard key={e} id={e} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Section>
    </Page>
  );
}
