import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  CONDITIONS,
  PAIN_SPOTS,
  getRegion,
  getStructure,
  type ConditionId,
  type PainSpotId,
  type RegionId,
} from '../data';
import { Wip } from '../components/badges';
import { ConditionCard, MuscleCard } from '../components/cards';
import { DISCIPLINE_ICON, IconClose, IconTarget } from '../components/icons';
import { Page } from '../components/Layout';
import { RegionFigure } from '../components/RegionFigure';
import { EmptyState, Section } from '../components/ui';
import { Viewer3DToggle } from '../components/Viewer3D';
import {
  DISCIPLINE_JA,
  DISCIPLINE_ORDER,
  STRUCTURE_KIND_JA,
  isKnownRegion,
  regionName,
  spotConditions,
  spotLabel,
  structureName,
} from '../lib/labels';
import NotFoundPage from './NotFoundPage';

const STRUCTURES_PREVIEW = 4;

export default function RegionPage() {
  const { id = '' } = useParams();
  if (!isKnownRegion(id)) return <NotFoundPage />;
  return <RegionView key={id} id={id as RegionId} />;
}

function RegionView({ id }: { id: RegionId }) {
  const region = getRegion(id);
  const name = regionName(id);
  const [params] = useSearchParams();
  const spots = PAIN_SPOTS.filter((s) => s.region === id);
  const [spot, setSpot] = useState<PainSpotId | null>(() => {
    const p = params.get('spot');
    return spots.some((s) => s.id === p) ? (p as PainSpotId) : null;
  });
  const [showAllStructures, setShowAllStructures] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);
  // keep the selected spot chip visible in the horizontally scrolling row (without moving the page)
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>('.chip.is-active');
    if (!row || !chip) return;
    const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
  }, [spot]);

  const list = useMemo((): { id: ConditionId; likelihood?: 'common' | 'possible' | 'rare' }[] => {
    const all = CONDITIONS.filter((c) => c.region === id).map((c) => ({ id: c.id as ConditionId }));
    if (!spot) return all;
    // candidates for the selected spot (may include other regions), most likely first
    const linked = spotConditions(spot);
    return linked.length ? linked : all;
  }, [id, spot]);

  const toggleSpot = (s: PainSpotId) => setSpot((cur) => (cur === s ? null : s));

  return (
    <Page title={name} back="/">
      <header className="page-head">
        <span className="kicker">{region?.nameEn ?? 'Region'}</span>
        <h1>{name}</h1>
        {region ? <p className="lead">{region.description}</p> : <p className="lead">この部位の解説は準備中です。</p>}
      </header>

      <section className="section--tight" style={{ marginTop: 16 }} aria-label="解剖図">
        <RegionFigure
          region={id}
          showSpots
          selectedSpot={spot}
          onSpotSelect={toggleSpot}
          caption="図の赤い点をタップすると、その場所に多い障害に絞り込めます。"
        />
        {spots.length > 0 && (
          <div className="chips chips--scroll" style={{ marginTop: 10 }} aria-label="痛む場所で絞り込む" ref={chipsRef}>
            {spots.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip${spot === s.id ? ' is-active' : ''}`}
                aria-pressed={spot === s.id}
                onClick={() => toggleSpot(s.id)}
              >
                <IconTarget />
                {spotLabel(s.id)}
              </button>
            ))}
          </div>
        )}
      </section>

      <div style={{ marginTop: 16 }}>
        <Viewer3DToggle
          focus={id}
          highlights={Object.fromEntries((region?.keyMuscles ?? []).map((m) => [m, 'involved' as const]))}
          sub="主な筋肉を3Dで確認（タップで読み込み）"
        />
      </div>

      {region && Object.keys(region.disciplineStress ?? {}).length > 0 && (
        <Section kicker="Triathlon load" title="スイム・バイク・ランでの負担">
          <div className="stack">
            {DISCIPLINE_ORDER.filter((d) => region.disciplineStress[d]).map((d) => {
              const Icon = DISCIPLINE_ICON[d];
              return (
                <div key={d} className={`disc-card disc-card--${d}`}>
                  <p className="disc-card__head">
                    <Icon />
                    {DISCIPLINE_JA[d]}
                  </p>
                  <p className="disc-card__body">{region.disciplineStress[d]}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section
        id="conditions"
        kicker="Conditions"
        title={spot ? `「${spotLabel(spot)}」に多い障害` : 'この部位に多い障害'}
      >
        {spot && (
          <button type="button" className="chip is-active" style={{ marginBottom: 12 }} onClick={() => setSpot(null)}>
            絞り込みを解除
            <IconClose />
          </button>
        )}
        {list.length ? (
          <div className="stack">
            {list.map((c) => (
              <ConditionCard key={c.id} id={c.id} likelihood={c.likelihood} />
            ))}
          </div>
        ) : (
          <EmptyState compact title="準備中です" />
        )}
      </Section>

      {region && region.keyMuscles.length > 0 && (
        <Section kicker="Key muscles" title="主な筋肉" more={{ to: `/muscles?region=${id}`, label: '筋肉図鑑' }}>
          <div className="stack--sm stack">
            {region.keyMuscles.map((m) => (
              <MuscleCard key={m} id={m} />
            ))}
          </div>
        </Section>
      )}

      {region && region.keyStructures.length > 0 && (
        <Section kicker="Structures" title="主な腱・骨・組織">
          <div className="card card--flush">
            {(showAllStructures ? region.keyStructures : region.keyStructures.slice(0, STRUCTURES_PREVIEW)).map((s) => {
              const st = getStructure(s);
              return (
                <div key={s} className="check-card">
                  <p className="check-card__name" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {structureName(s)}
                    {st ? <span className="badge badge--neutral">{STRUCTURE_KIND_JA[st.kind] ?? st.kind}</span> : <Wip />}
                  </p>
                  {st?.kana && <p className="tiny" style={{ marginTop: 0 }}>{st.kana}</p>}
                  {st && <p className="muted">{st.description}</p>}
                </div>
              );
            })}
            {region.keyStructures.length > STRUCTURES_PREVIEW && (
              <button
                type="button"
                className="row"
                style={{ justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 14, borderTop: '1px solid var(--border)' }}
                aria-expanded={showAllStructures}
                onClick={() => setShowAllStructures((v) => !v)}
              >
                {showAllStructures ? '閉じる' : `すべて表示（${region.keyStructures.length}）`}
              </button>
            )}
          </div>
        </Section>
      )}

    </Page>
  );
}
