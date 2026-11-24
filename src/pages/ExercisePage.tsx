import { Link, useParams, useSearchParams } from 'react-router-dom';
import { conditionsUsingExercise, getCondition, getExercise, getMuscle, type Condition, type Exercise } from '../data';
import { LevelBadge, TypeBadge } from '../components/badges';
import { ConditionCard } from '../components/cards';
import { DISCIPLINE_ICON, IconAlert, IconCheck, IconChevron, IconPlus, IconTarget } from '../components/icons';
import { Page } from '../components/Layout';
import { Bullets, EmptyState, NameText, PainRuleCallout, Section } from '../components/ui';
import { SafeViewer } from '../components/Viewer3D';
import { DISCIPLINE_JA, DISCIPLINE_ORDER, PHASE_JA, doseParts, exerciseName, isKnownExercise, muscleName, regionName } from '../lib/labels';
import { toast, toastSaved } from '../lib/toast';
import { useMenu } from '../lib/useMenu';
import NotFoundPage from './NotFoundPage';

export default function ExercisePage() {
  const { id = '' } = useParams();
  if (!isKnownExercise(id)) return <NotFoundPage />;
  const e = getExercise(id);
  if (!e) {
    return (
      <Page title={exerciseName(id)} back="/exercises">
        <header className="page-head">
          <span className="kicker">Exercise</span>
          <h1>
            <NameText text={exerciseName(id)} />
          </h1>
        </header>
        <div style={{ marginTop: 20 }}>
          <EmptyState title="解説を準備中です" text="このエクササイズの手順と3Dアニメーションは現在作成中です。">
            <Link to="/exercises" className="btn btn--secondary">
              エクササイズ一覧へ
            </Link>
          </EmptyState>
        </div>
        {conditionsUsingExercise(id as Exercise['id']).length > 0 && (
          <Section kicker="Used in" title="このエクササイズを使う回復プラン">
            <div className="stack stack--sm">
              {conditionsUsingExercise(id as Exercise['id']).map((c) => (
                <ConditionCard key={c.id} id={c.id} showSummary={false} />
              ))}
            </div>
          </Section>
        )}
      </Page>
    );
  }
  return <ExerciseView key={id} e={e} />;
}

function MenuToggle({ e, block, from }: { e: Exercise; block?: boolean; from?: PlanContext }) {
  const menu = useMenu();
  const on = menu.has(e.id);
  return (
    <button
      type="button"
      className={`btn ${on ? 'btn--done' : 'btn--primary'}${block ? ' btn--block' : ''}`}
      aria-pressed={on}
      onClick={() => {
        const added = menu.toggle(e.id, from ? { condition: from.c.id, phase: from.phase.id } : undefined);
        if (added) toastSaved('マイメニューに追加しました');
        else toast('マイメニューから外しました');
      }}
    >
      {on ? <IconCheck /> : <IconPlus />}
      {on ? 'マイメニューに追加済み' : 'マイメニューに追加'}
    </button>
  );
}

interface PlanContext {
  c: Condition;
  phase: Condition['phases'][number];
}

/** ?from=<condition>&phase=<phase> — the recovery-plan step this exercise was opened from (if it is part of it). */
function usePlanContext(e: Exercise): PlanContext | undefined {
  const [params] = useSearchParams();
  const c = getCondition(params.get('from') ?? '');
  const phase = c?.phases?.find((p) => p.id === params.get('phase'));
  if (!c || !phase || !phase.exercises.includes(e.id)) return undefined;
  return { c, phase };
}

/** Lines of the step's guidance that talk about this exercise come first. */
function planPoints(e: Exercise, guidance: string[]): string[] {
  const key = e.nameJa.split(/[（(]/)[0].split('・').pop() ?? e.nameJa;
  const about = (g: string) => g.includes(e.nameJa) || (key.length >= 3 && g.includes(key));
  return [...guidance.filter(about), ...guidance.filter((g) => !about(g))];
}

function PlanBanner({ e, ctx }: { e: Exercise; ctx: PlanContext }) {
  const points = planPoints(e, ctx.phase.guidance ?? []);
  return (
    <div className="plan-banner" role="note" aria-label="回復プランでのポイント">
      <p className="plan-banner__head">
        <IconTarget />
        <span>
          <Link to={`/condition/${ctx.c.id}${ctx.phase.id === ctx.c.phases[0]?.id ? '' : `?phase=${ctx.phase.id}`}`} className="link">
            {ctx.c.nameJa}
          </Link>
          の回復プラン「{PHASE_JA[ctx.phase.id]}」のポイント
        </span>
      </p>
      {points.length > 0 && <Bullets items={points.slice(0, 4)} />}
    </div>
  );
}

function targetDesc(type: Exercise['type']): string {
  if (type === 'stretch' || type === 'mobility') return '主に伸ばされる筋肉';
  if (type === 'nerve-glide') return '神経と一緒に動く（軽く伸ばされる）筋肉。ねらいは神経の滑りです';
  return '主に働く筋肉';
}

function ExerciseView({ e }: { e: Exercise }) {
  const dose = doseParts(e.dose);
  const usedIn = conditionsUsingExercise(e.id);
  const plan = usePlanContext(e);
  return (
    <Page title={e.nameJa} back="/exercises">
      <div className="viewer-hero">
        <SafeViewer exercise={e.id} focus={e.regions[0]} height={300} />
      </div>

      <header className="page-head">
        <span className="kicker">{e.regions.map(regionName).join(' · ')}</span>
        <h1>
          <NameText text={e.nameJa} />
        </h1>
        <p className="page-head__en">{e.nameEn}</p>
        <div className="meta-row">
          <TypeBadge type={e.type} />
          <LevelBadge level={e.level} />
          {(e.equipment ?? []).map((x) => (
            <span key={x} className="badge badge--outline">
              {x}
            </span>
          ))}
        </div>
      </header>

      {plan && <PlanBanner e={e} ctx={plan} />}

      {dose.length > 0 && <DoseBox parts={dose} />}

      {e.caution && (
        <div className="callout callout--note" style={{ marginTop: 12 }}>
          <IconAlert />
          <div>
            <p className="callout__title">注意</p>
            <p>{e.caution}</p>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <MenuToggle e={e} block from={plan} />
      </div>

      <p className="lead" style={{ marginTop: 20, color: 'var(--text)' }}>
        {e.summary}
      </p>

      <Section kicker="How to" title="やり方">
        <div className="card card--lg">
          <p className="phase__label" style={{ marginTop: 0 }}>
            スタートの姿勢
          </p>
          <p style={{ fontSize: 15 }}>{e.setup}</p>
          <p className="phase__label">手順</p>
          <ol className="steps">
            {e.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      </Section>

      {e.cues?.length > 0 && (
        <Section kicker="Cues" title="意識するポイント">
          <div className="card">
            <Bullets items={e.cues} check />
          </div>
        </Section>
      )}

      {e.mistakes?.length > 0 && (
        <Section kicker="Common mistakes" title="よくある間違い">
          <div className="card">
            <Bullets items={e.mistakes} color="var(--danger)" />
          </div>
        </Section>
      )}

      {(e.progression || e.regression) && (
        <Section kicker="Adjust" title="難しさの調整">
          <div className="grid-2" style={{ gridTemplateColumns: '1fr' }}>
            {e.regression && (
              <div className="card">
                <span className="badge badge--swim">やさしくする</span>
                <p className="card__text" style={{ color: 'var(--text)' }}>
                  {e.regression}
                </p>
              </div>
            )}
            {e.progression && (
              <div className="card">
                <span className="badge badge--accent">レベルアップ</span>
                <p className="card__text" style={{ color: 'var(--text)' }}>
                  {e.progression}
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      <section className="section" aria-label="痛みのルール">
        <PainRuleCallout text={plan?.c.painRule} />
      </section>

      {(e.primary.length > 0 || e.secondary.length > 0) && (
        <Section kicker="Target muscles" title="使う筋肉" desc={targetDesc(e.type)}>
          <div className="card">
            {e.primary.length > 0 && (
              <>
                <p className="phase__label" style={{ marginTop: 0 }}>
                  メイン
                </p>
                <div className="chips">
                  {e.primary.map((m) => (
                    <MuscleChip key={m} id={m} primary />
                  ))}
                </div>
              </>
            )}
            {e.secondary.length > 0 && (
              <>
                <p className="phase__label">サブ</p>
                <div className="chips">
                  {e.secondary.map((m) => (
                    <MuscleChip key={m} id={m} />
                  ))}
                </div>
              </>
            )}
          </div>
        </Section>
      )}

      {Object.keys(e.benefit ?? {}).length > 0 && (
        <Section kicker="Benefit" title="トライアスロンへの効果">
          <div className="stack">
            {DISCIPLINE_ORDER.filter((d) => e.benefit[d]).map((d) => {
              const Icon = DISCIPLINE_ICON[d];
              return (
                <div key={d} className={`disc-card disc-card--${d}`}>
                  <p className="disc-card__head">
                    <Icon />
                    {DISCIPLINE_JA[d]}
                  </p>
                  <p className="disc-card__body">{e.benefit[d]}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {usedIn.length > 0 && (
        <Section kicker="Used in" title="このエクササイズを使う回復プラン">
          <div className="stack stack--sm">
            {usedIn.map((c) => (
              <ConditionCard key={c.id} id={c.id} showSummary={false} />
            ))}
          </div>
        </Section>
      )}

      <div style={{ marginTop: 28 }}>
        <MenuToggle e={e} block from={plan} />
      </div>
    </Page>
  );
}

function MuscleChip({ id, primary }: { id: string; primary?: boolean }) {
  const ready = !!getMuscle(id);
  return (
    <Link to={`/muscle/${id}`} className={`chip${primary ? ' chip--muscle' : ''}`}>
      {primary && <span className="dot" style={{ width: 8, height: 8, background: 'var(--muscle)' }} />}
      {muscleName(id)}
      {!ready && <span className="chip__count">準備中</span>}
      <IconChevron style={{ width: 14, height: 14, color: 'var(--text-3)' }} />
    </Link>
  );
}

const WIDE_KEYS = ['テンポ', '頻度'];

function DoseBox({ parts }: { parts: { k: string; v: string }[] }) {
  const isWide = (d: { k: string; v: string }) => WIDE_KEYS.includes(d.k) || d.v.length > 9;
  const cells = parts.filter((d) => !isWide(d));
  const wide = parts.filter(isWide);
  return (
    <div className="dose" style={{ marginTop: 16 }} role="group" aria-label="回数・頻度">
      {cells.length > 0 && (
        <div className="dose__grid" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
          {cells.map((d) => (
            <div key={d.k} className="dose__cell">
              <div className="dose__k">{d.k}</div>
              <div className="dose__v">{d.v}</div>
            </div>
          ))}
        </div>
      )}
      {wide.map((d) => (
        <div key={d.k} className="dose__wide">
          <span className="dose__k">{d.k}</span>
          <span className="dose__wv">{d.v}</span>
        </div>
      ))}
    </div>
  );
}
