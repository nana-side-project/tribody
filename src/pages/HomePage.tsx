import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GUIDES, PAIN_SPOTS, REGIONS, getPainSpot, type GuideId, type PainSpotId, type RegionId, type Side } from '../data';
import { BottomSheet, afterSheetClose } from '../components/BottomSheet';
import { GuideCard } from '../components/cards';
import { LikelihoodBadge, Wip } from '../components/badges';
import { IconAlert, IconChecklist, IconChevron, IconEdit, IconLayers, IconSearch } from '../components/icons';
import { Page } from '../components/Layout';
import { SafeBodyMap } from '../components/SafeBodyMap';
import { EmptyState, SearchInput, Section, Segmented } from '../components/ui';
import { conditionName, regionConditionCount, regionName, spotConditions, spotLabel, spotRegion } from '../lib/labels';
import { search, type SearchHit, type SearchKind } from '../lib/search';
import { useMenu } from '../lib/useMenu';
import { usePainLog } from '../lib/usePainLog';
import { prefetchRouteWhenIdle } from '../lib/routePrefetch';
import { getCondition } from '../data';

type View = 'front' | 'back' | 'sole';
const VIEWS: { id: View; label: string }[] = [
  { id: 'front', label: '前' },
  { id: 'back', label: '後ろ' },
  { id: 'sole', label: '足裏' },
];
const FEATURED: GuideId[] = ['pain-monitoring', 'load-management', 'red-flags'];
const HOME_LEAD = '痛む場所をタップすると、考えられる原因と傷んでいる組織、補強・ストレッチの方法がわかります。';

/**
 * Smallest home figure (px) = 0.40 CSS px per figure unit, the smallest scale the tap rules and the magnifier layout
 * are verified at (bodymap/lens.test.ts). On shorter screens the page scrolls instead.
 */
const MAP_MIN_H = 400;
/** svg bottom → tab bar when the figure fits (the lowest hotspots then sit ≥ 30 px above the tab bar). */
const MAP_FIT_GAP = 16;
/** A hotspot this close above the tab bar (centre, px) is too easy to miss onto a tab… */
const SPOT_CLEAR = 24;
/** …so when the figure cannot fit, its lowest hotspots go at least this far under the tab bar top instead. */
const SPOT_HIDDEN = 30;

/**
 * Size the home body map from the real space between the controls above it and the tab bar (the intro wraps to two
 * or three lines with the width, so a fixed allowance is wrong on some phones). The whole figure fits with its lowest
 * hotspots well clear of the tab bar — a finger that slips must not land on a tab. On screens too short for the
 * smallest figure the page scrolls, and the lowest hotspots then start clearly under the tab bar instead of a few px
 * above it.
 */
function useFitHomeMap(frameRef: RefObject<HTMLDivElement | null>, view: string) {
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let raf = 0;
    const fit = () => {
      raf = 0;
      const svg = frame.querySelector('.tb-bodymap > svg');
      const tabbar = document.querySelector('.tabbar');
      if (!svg || !tabbar) return;
      const box = svg.getBoundingClientRect();
      // space from the top of the map (page coordinates: the same at any scroll position) to the fixed tab bar
      const space = tabbar.getBoundingClientRect().top - (box.top + window.scrollY);
      // the lowest hotspot of this view as a share of the map height (the drawing scales with the height)
      let low = 0.96;
      if (box.height > 0) {
        let y = -Infinity;
        frame.querySelectorAll('.tb-spots .tb-spot-dot').forEach((d) => {
          const r = d.getBoundingClientRect();
          y = Math.max(y, r.top + r.height / 2);
        });
        if (y > -Infinity) low = Math.min(1, Math.max(0.5, (y - box.top) / box.height));
      }
      let h = space - MAP_FIT_GAP;
      if (h < MAP_MIN_H) {
        h = MAP_MIN_H;
        if (space - low * h < SPOT_CLEAR) h = Math.max(h, (space + SPOT_HIDDEN) / low);
      }
      frame.style.setProperty('--tb-bodymap-max-h', `${Math.round(h)}px`);
    };
    const later = () => {
      if (!raf) raf = requestAnimationFrame(fit);
    };
    fit();
    window.addEventListener('resize', later);
    window.addEventListener('orientationchange', later);
    // the intro / controls above the map change height (text wrap, font load)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(later) : null;
    const head = document.querySelector('#main .page-head');
    if (ro && head) ro.observe(head);
    return () => {
      window.removeEventListener('resize', later);
      window.removeEventListener('orientationchange', later);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [frameRef, view]);
}

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const v = params.get('view');
  const view: View = v === 'back' || v === 'sole' ? v : 'front';
  const setView = (nv: View) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (nv === 'front') n.delete('view');
        else n.set('view', nv);
        return n;
      },
      { replace: true },
    );

  const [sel, setSel] = useState<{ id: PainSpotId; side?: Side } | null>(null);
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState('');
  const pickerBtnRef = useRef<HTMLButtonElement>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  useFitHomeMap(mapFrameRef, view);
  const menu = useMenu();
  const log = usePainLog();
  const recent = useMemo(() => Object.keys(log.recentIntensity(14)) as PainSpotId[], [log]);
  // recently painful spots on the side that was logged (a 'both' entry marks both sides); activeSpots stays the fallback
  const recentSides = useMemo(() => log.recentSides(14).activeSides, [log]);
  // the sheet lists conditions: load the condition page's code while the user reads it (never in the tap's own task)
  useEffect(() => (sel ? prefetchRouteWhenIdle('condition', 450) : undefined), [sel]);

  return (
    <Page title="">
      {/* short screens (CSS: max-height 700px) drop the kicker and move the lead under the map, so the whole figure
          fits above the tab bar on first paint */}
      <header className="page-head page-head--home">
        <span aria-hidden="true" lang="en" className="kicker">Where does it hurt?</span>
        <h1>どこが痛む？</h1>
        <p className="lead home-lead">{HOME_LEAD}</p>
      </header>

      <div className="card home-map-card">
        <Segmented label="からだの向き" value={view} options={VIEWS} onChange={setView} />
        {/* keyboard users can skip the ~30 hotspots */}
        <button type="button" className="skip-link" onClick={() => pickerBtnRef.current?.focus()}>
          図をとばして「一覧から選ぶ」へ
        </button>
        <div className="bodymap-frame bodymap-frame--home" ref={mapFrameRef}>
          <SafeBodyMap
            view={view}
            activeSpots={recent}
            activeSides={recentSides}
            selectedSpot={sel?.id ?? null}
            onSelect={(id, side) => setSel({ id, side })}
          />
        </div>
        <div className="map-foot">
          <p className="tiny">痛む側をタップ（左右を記録）</p>
          <button type="button" className="btn btn--ghost btn--sm map-foot__btn" ref={pickerBtnRef} onClick={() => setPicker(true)}>
            一覧から選ぶ
            <IconChevron />
          </button>
        </div>
      </div>

      <p className="lead home-lead--below">{HOME_LEAD}</p>

      <Section kicker="Regions" title="部位から探す" tight>
        <div className="grid-2 grid-2--wide4">
          {REGIONS.map((r) => (
            <Link key={r.id} to={`/region/${r.id}`} className="region-tile">
              <span className="region-tile__name">{regionName(r.id)}</span>
              <span className="region-tile__meta">
                <span>障害 {regionConditionCount(r.id)}件</span>
                <IconChevron />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section kicker="Search" title="キーワードで探す" desc="障害名・通称（ランナー膝 など）・筋肉名（ひらがな可）・エクササイズ名">
        <SearchInput value={q} onChange={setQ} placeholder="例：アキレス腱、中殿筋、ブリッジ" label="障害・筋肉・エクササイズを検索" />
        {q.trim() && <SearchResults q={q} />}
      </Section>

      {menu.items.length > 0 && (
        <Section kicker="Today" title="今日のメニュー">
          <TodayCard />
        </Section>
      )}

      <Section kicker="Guides" title="まず知っておきたいこと" more={{ to: '/guides', label: 'すべて' }}>
        <div className="stack">
          {FEATURED.filter((g) => GUIDES.some((x) => x.id === g)).map((g) => (
            <GuideCard key={g} id={g} />
          ))}
        </div>
      </Section>

      <p className="footer-note">
        この情報は一般的な教育目的です。診断ではありません。
        <br />
        強い痛み・腫れ・しびれ・体重をかけられない場合は医療機関へ。<Link to="/about">詳しく</Link>
      </p>

      <BottomSheet
        open={!!sel}
        onClose={() => setSel(null)}
        label={sel ? spotLabel(sel.id) : ''}
        header={sel && <SpotSheetHeader id={sel.id} side={sel.side} />}
      >
        {sel && <SpotSheetBody id={sel.id} side={sel.side} onClose={() => setSel(null)} />}
      </BottomSheet>

      <BottomSheet
        open={picker}
        onClose={() => setPicker(false)}
        label="痛む場所を選ぶ"
        header={
          <>
            <span aria-hidden="true" lang="en" className="kicker">Pain spots</span>
            <h2>痛む場所を選ぶ</h2>
          </>
        }
      >
        <SpotPicker
          onPick={(id) => {
            setPicker(false);
            setSel({ id });
          }}
        />
      </BottomSheet>
    </Page>
  );
}

function SpotSheetHeader({ id, side }: { id: PainSpotId; side?: Side }) {
  const region = spotRegion(id);
  return (
    <>
      <span className="kicker">{region ? regionName(region) : 'Pain spot'}</span>
      <h2 style={{ marginTop: 2 }}>
        {spotLabel(id)}
        {side && (
          <span className="badge badge--neutral" style={{ marginLeft: 8, verticalAlign: '3px' }}>
            <span className="sr-only">・</span>
            {side === 'left' ? '左' : '右'}
          </span>
        )}
      </h2>
    </>
  );
}

function SpotSheetBody({ id, side, onClose }: { id: PainSpotId; side?: Side; onClose: () => void }) {
  const navigate = useNavigate();
  const spot = getPainSpot(id);
  const region = spotRegion(id);
  const candidates = spotConditions(id);
  const go = (to: string) => {
    onClose();
    // let the sheet unmount (scroll lock, its history entry) before navigating
    afterSheetClose(() => navigate(to));
  };
  const logUrl = `/menu?tab=log&spot=${id}${side ? `&side=${side}` : ''}`;
  return (
    <div>
      {spot?.hint && <p className="muted" style={{ fontSize: 14 }}>{spot.hint}</p>}

      <p className="phase__label" style={{ marginTop: 16 }}>
        考えられる原因
      </p>
      {candidates.length ? (
        <div className="card card--flush" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
          <ul className="rows">
            {candidates.map((c) => {
              const cond = getCondition(c.id);
              // the condition page opens on the figure view that has this spot and names the side
              const conditionUrl = `/condition/${c.id}?spot=${id}${side ? `&side=${side}` : ''}`;
              return (
                <li key={c.id}>
                  <button type="button" className="row" data-prefetch="condition" onClick={() => go(conditionUrl)}>
                    <div className="row__main">
                      {(c.likelihood || !cond) && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                          {c.likelihood && <LikelihoodBadge l={c.likelihood} />}
                          {!cond && <Wip />}
                        </div>
                      )}
                      <p className="row__title">{conditionName(c.id)}</p>
                      {cond?.aka?.length ? <p className="row__sub">{cond.aka.slice(0, 2).join('・')}</p> : null}
                    </div>
                    <IconChevron className="chev" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <EmptyState compact title="候補を準備中です" text="この場所の解説は現在作成中です。部位のページもご覧ください。" />
      )}

      <div className="callout callout--disclaimer" style={{ marginTop: 12 }}>
        <IconAlert />
        <p>
          場所だけでは判断できません。強い痛み・腫れ・しびれ・体重をかけられない場合は受診を。{' '}
          <button type="button" className="link" onClick={() => go('/guide/red-flags')} style={{ color: 'var(--accent-ink)', textDecoration: 'underline' }}>
            受診の目安
          </button>
        </p>
      </div>

      <div className="btn-stack" style={{ marginTop: 16 }}>
        {region && (
          <button type="button" className="btn btn--secondary btn--block" onClick={() => go(`/region/${region}?spot=${id}`)}>
            <IconLayers />
            この部位を詳しく見る
          </button>
        )}
        <button type="button" className="btn btn--outline btn--block" onClick={() => go(logUrl)}>
          <IconEdit />
          痛みを記録
        </button>
      </div>
    </div>
  );
}

function SpotPicker({ onPick }: { onPick: (id: PainSpotId) => void }) {
  return (
    <div className="stack--lg" style={{ display: 'grid' }}>
      {REGIONS.map((r) => {
        const spots = PAIN_SPOTS.filter((s) => s.region === r.id);
        if (!spots.length) return null;
        return (
          <div key={r.id}>
            <p className="phase__label" style={{ marginTop: 4 }}>
              {regionName(r.id as RegionId)}
            </p>
            <div className="chips">
              {spots.map((s) => (
                <button key={s.id} type="button" className="chip" onClick={() => onPick(s.id)}>
                  {spotLabel(s.id)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const KIND_LABEL: Record<SearchKind, string> = { condition: '障害・痛み', muscle: '筋肉', exercise: 'エクササイズ' };

function SearchResults({ q }: { q: string }) {
  const hits = useMemo(() => search(q), [q]);
  if (!hits.length) {
    return (
      <div style={{ marginTop: 12 }}>
        <EmptyState compact icon={<IconSearch />} title="見つかりませんでした" text="別のことば（ひらがな・通称・英語名）でも試してみてください。" />
      </div>
    );
  }
  const groups: SearchKind[] = ['condition', 'muscle', 'exercise'];
  return (
    <div style={{ marginTop: 14 }}>
      {groups.map((k) => {
        const list = hits.filter((h) => h.kind === k).slice(0, 6);
        if (!list.length) return null;
        return (
          <div key={k} className="result-group">
            <p className="result-group__label">{KIND_LABEL[k]}</p>
            <div className="card card--flush">
              <ul className="rows">
                {list.map((h) => (
                  <li key={h.id}>
                    <ResultRow h={h} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultRow({ h }: { h: SearchHit }) {
  return (
    <Link to={h.to} className="row">
      <div className="row__main">
        <p className="row__title">{h.title}</p>
        {h.sub ? <p className="row__sub">{h.sub}</p> : !h.ready && <Wip />}
      </div>
      <IconChevron className="chev" />
    </Link>
  );
}

function TodayCard() {
  const menu = useMenu();
  // today's to-dos are the daily exercises; 週n回 strength / tendon work counts toward a weekly target instead
  const total = menu.dailyTotal;
  const done = menu.dailyDoneToday;
  const pct = total ? Math.round((done / total) * 100) : menu.weeklyTarget ? Math.round((menu.weeklyDone / menu.weeklyTarget) * 100) : 0;
  const weeklyLeft = Math.max(0, menu.weeklyTarget - menu.weeklyDone);
  const title = total
    ? done >= total
      ? '毎日の種目は完了！'
      : `毎日の種目 あと ${total - done}`
    : weeklyLeft
      ? `今週あと ${weeklyLeft} 回`
      : '今週の目標を達成！';
  return (
    <Link to="/menu" className="card">
      <div className="card__row">
        <span className="ex-card__icon ex-card__icon--activation" aria-hidden="true">
          <IconChecklist />
        </span>
        <div className="grow">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <p className="card__title">{title}</p>
            <span className="small muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {total ? `${done}/${total}` : `${menu.weeklyDone}/${menu.weeklyTarget}`}
            </span>
          </div>
          <div
            className={`progress${total ? '' : ' progress--week'}`}
            style={{ marginTop: 10 }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={total ? '今日の毎日の種目の達成度' : '今週の達成度'}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="card__sub" style={{ marginTop: 8 }}>
            {total && menu.weeklyCount ? `週に数回の種目：今週 ${menu.weeklyDone}/${menu.weeklyTarget}回` : 'マイメニューを開いてチェック'}
          </p>
        </div>
        <IconChevron className="chev" />
      </div>
    </Link>
  );
}
