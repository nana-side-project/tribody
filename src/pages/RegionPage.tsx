import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  CONDITIONS,
  PAIN_SPOTS,
  getMuscle,
  getRegion,
  getStructure,
  type ConditionId,
  type MuscleId,
  type PainSpotId,
  type RegionId,
} from '../data';
import { Wip } from '../components/badges';
import { ConditionCard, MuscleCard } from '../components/cards';
import { DISCIPLINE_ICON, IconChevron, IconClose, IconTarget } from '../components/icons';
import { Page } from '../components/Layout';
import { RegionFigure } from '../components/RegionFigure';
import { EmptyState, Section } from '../components/ui';
import { Viewer3DToggle } from '../components/Viewer3D';
import {
  DISCIPLINE_JA,
  DISCIPLINE_ORDER,
  STRUCTURE_KIND_JA,
  isKnownRegion,
  muscleName,
  regionName,
  spotConditions,
  spotLabel,
  structureName,
} from '../lib/labels';
import { useRememberedView } from '../lib/useRememberedView';
import { regionDrawnSide, regionViewer } from '../lib/viewerHighlights';
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
  // the spot filter lives in the URL (?spot=), so it survives opening a condition and coming back
  const [params, setParams] = useSearchParams();
  const spots = PAIN_SPOTS.filter((s) => s.region === id);
  const p = params.get('spot');
  const spot = spots.some((s) => s.id === p) ? (p as PainSpotId) : null;
  // opened from a spot tapped on one side of the home body map (?side=): the figure and 3D show that side, and the
  // condition links carry it on. A central region (the low back, the neck: all its conditions are drawn unmirrored,
  // BILATERAL_REGIONS) stays unmirrored here too, so the drawing does not flip on the way to its condition page.
  const sp = params.get('side');
  const side = sp === 'left' || sp === 'right' ? sp : undefined;
  const drawnOn = regionDrawnSide(id, side);
  const conditionSearch = [spot && `spot=${spot}`, side && `side=${side}`].filter(Boolean).join('&');
  const setSpot = (next: PainSpotId | null) =>
    setParams(
      (cur) => {
        const n = new URLSearchParams(cur);
        if (next) n.set('spot', next);
        else n.delete('spot');
        return n;
      },
      { replace: true },
    );
  const [showAllStructures, setShowAllStructures] = useState(false);
  const figMemo = useRememberedView(`fig:${id}`);
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

  const toggleSpot = (s: PainSpotId) => setSpot(spot === s ? null : s);

  // 3D: the key muscles in muscle colour (not amber — amber means 「関係」 on condition pages); tapping a name below
  // the viewer emphasises that one (the engine labels at most ~10 parts, so the chip row is the full list)
  const keyMuscles = region?.keyMuscles ?? [];
  const [selMuscle, setSelMuscle] = useState<MuscleId | null>(null);
  // a key muscle that lives in another region (中殿筋 on the knee page) is out of this region's 3D crop: the viewer
  // frames its own region (shared with the 3D harness: src/lib/viewerHighlights.ts)
  const { highlights: highlights3d, focus: focus3d } = useMemo(() => regionViewer(id, keyMuscles, selMuscle), [id, keyMuscles, selMuscle]);

  return (
    <Page title={name} back="/">
      <header className="page-head">
        <span aria-hidden="true" lang="en" className="kicker">{region?.nameEn ?? 'Region'}</span>
        <h1>{name}</h1>
        {region ? <p className="lead">{region.description}</p> : <p className="lead">この部位の解説は準備中です。</p>}
      </header>

      <section className="section--tight" style={{ marginTop: 16 }} aria-label="解剖図">
        <RegionFigure
          region={id}
          initialView={figMemo.initialView}
          onViewChange={figMemo.onViewChange}
          showSpots
          selectedSpot={spot}
          side={drawnOn}
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
          focus={focus3d}
          highlights={highlights3d}
          side={drawnOn}
          sub="主な筋肉を3Dで確認（タップで読み込み）"
          footer={
            keyMuscles.length > 0 && (
              <div className="viewer-frame__muscles">
                <p className="viewer-frame__hint" id="region-3d-muscles">
                  主な筋肉（名前をタップすると強調します）
                </p>
                <div className="chips chips--scroll" role="group" aria-labelledby="region-3d-muscles">
                  {keyMuscles.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`chip chip--muscle${m === selMuscle ? ' is-active' : ''}`}
                      aria-pressed={m === selMuscle}
                      onClick={() => setSelMuscle(m === selMuscle ? null : m)}
                    >
                      {muscleName(m)}
                    </button>
                  ))}
                </div>
              </div>
            )
          }
          legend={
            selMuscle ? (
              <Link to={`/muscle/${selMuscle}`} className="viewer-frame__link">
                {/* short name (no parenthetical) so the link stays on one line next to 閉じる */}
                {muscleName(selMuscle).replace(/[（(][^）)]*[）)]/g, '')}のページへ
                <IconChevron />
              </Link>
            ) : (
              <span className="legend" style={{ margin: 0 }}>
                <span className="legend__item">
                  <span className="dot dot--muscle" />
                  主な筋肉
                </span>
              </span>
            )
          }
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
              <ConditionCard key={c.id} id={c.id} likelihood={c.likelihood} search={conditionSearch ? `?${conditionSearch}` : undefined} />
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
                style={{ justifyContent: 'center', color: 'var(--accent-ink)', fontWeight: 700, fontSize: 14, borderTop: '1px solid var(--border)' }}
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
