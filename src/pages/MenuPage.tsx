import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PAIN_SPOTS, REGIONS, getCondition, getExercise, type ExerciseId, type PainSpotId } from '../data';
import { SafeBodyMap } from '../components/SafeBodyMap';
import {
  IconAlert,
  IconCheck,
  IconChecklist,
  IconChevron,
  IconDown,
  IconDownload,
  IconEdit,
  IconPulse,
  IconTrash,
  IconUp,
} from '../components/icons';
import { Page } from '../components/Layout';
import { Sparkline } from '../components/Sparkline';
import { Bullets, EmptyState, Section, Segmented, useRadioGroup } from '../components/ui';
import { addDays, formatDateJa, relativeDayJa, todayISO, weekdayJa } from '../lib/date';
import {
  CONTEXT_JA,
  CONTEXT_ORDER,
  PHASE_JA,
  SIDE_JA,
  conditionName,
  doseShort,
  exerciseName,
  regionName,
  spotLabel,
  spotViews,
} from '../lib/labels';
import { scrollBehavior } from '../lib/useMedia';
import { isFramed } from '../lib/framed';
import { BottomSheet } from '../components/BottomSheet';
import { isPersistent } from '../lib/storage';
import { toast, toastSaved } from '../lib/toast';
import { useMenu, type MenuItem } from '../lib/useMenu';
import { scoreColorVar, scoreLabel, usePainLog, type PainContext, type PainEntry, type PainSide } from '../lib/usePainLog';

type Tab = 'menu' | 'log';

export default function MenuPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'log' ? 'log' : 'menu';
  const setTab = (t: Tab) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (t === 'log') n.set('tab', 'log');
        else {
          n.delete('tab');
          n.delete('spot');
          n.delete('side');
        }
        return n;
      },
      { replace: true },
    );

  return (
    <Page title={tab === 'log' ? '痛みログ' : 'マイメニュー'}>
      <header className="page-head">
        <span aria-hidden="true" lang="en" className="kicker">My menu</span>
        <h1>マイメニュー</h1>
      </header>
      <div style={{ marginTop: 12 }}>
        <Segmented
          label="表示の切り替え"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'menu', label: 'メニュー' },
            { id: 'log', label: '痛みログ' },
          ]}
        />
      </div>
      {!isPersistent() && (
        <div className="callout callout--note" style={{ marginTop: 12 }}>
          <IconPulse />
          <p className="small">この環境ではデータを保存できません（プライベートモードなど）。ページを閉じると記録は消えます。</p>
        </div>
      )}
      {tab === 'menu' ? <MenuTab /> : <PainLogTab initialSpot={params.get('spot')} initialSide={params.get('side')} />}
    </Page>
  );
}

/* ───────────────────────── メニュー ───────────────────────── */

const sourceKey = (it: MenuItem) => (it.from?.condition ? `${it.from.condition}:${it.from.phase ?? ''}` : '');

/** Is the item still part of the recovery-plan step it was added from? (plans change: e.g. the step heel drop left
 * the insertional Achilles plan for the floor-level one) */
function inPlan(it: MenuItem): boolean {
  const c = it.from?.condition ? getCondition(it.from.condition) : undefined;
  if (!c) return true; // content not loaded / not from a plan: nothing to contradict
  if (!it.from?.phase) return c.phases.some((p) => p.exercises.includes(it.id));
  return !!c.phases.find((p) => p.id === it.from?.phase)?.exercises.includes(it.id);
}

/**
 * 「膝蓋大腿疼痛症候群・①」 — where a menu item was added from. `note`: say so when that step no longer has it, so an
 * old item is not read as part of the current plan.
 */
function sourceLabel(it: MenuItem, note = false): string {
  const c = it.from?.condition;
  if (!c) return '';
  const ph = it.from?.phase;
  const label = `${conditionName(c)}${ph ? `・${PHASE_JA[ph].split(' ')[0]}` : ''}`;
  return note && !inPlan(it) ? `${label}（いまのプランには含まれていません）` : label;
}

function exerciseLink(it: MenuItem): string {
  const c = it.from?.condition ? getCondition(it.from.condition) : undefined;
  const ph = c?.phases?.find((p) => p.id === it.from?.phase);
  return `/exercise/${it.id}${c && ph?.exercises.includes(it.id) ? `?from=${c.id}&phase=${ph.id}` : ''}`;
}

/**
 * Header of the exercises added from one recovery-plan step: a link back to that step, its 「次のステップに進む目安」
 * as a checklist, and a shortcut to log today's pain at that condition's spot.
 */
function PlanGroupHead({ it }: { it: MenuItem }) {
  const c = it.from?.condition ? getCondition(it.from.condition) : undefined;
  const ph = c?.phases.find((p) => p.id === it.from?.phase);
  const label = sourceLabel(it);
  if (!c) return <p className="menu-group__head menu-group__head--plain">{label}</p>;
  const planUrl = `/condition/${c.id}${ph && ph.id !== c.phases[0]?.id ? `?phase=${ph.id}` : ''}`;
  const spot = c.painSpots[0];
  return (
    <div className="menu-group__head">
      <Link to={planUrl} className="menu-group__plan">
        <span className="grow">
          <span className="menu-group__kicker">回復プラン</span>
          <span className="menu-group__title">{label}</span>
        </span>
        <IconChevron className="chev" />
      </Link>
      <div className="menu-group__tools">
        {ph && ph.progressWhen.length > 0 && (
          <details className="menu-group__next">
            <summary>{ph.id === 'return' ? '競技復帰の目安' : '次のステップに進む目安'}</summary>
            <Bullets items={ph.progressWhen} check />
          </details>
        )}
        {spot && (
          <Link to={`/menu?tab=log&spot=${spot}`} className="btn btn--ghost btn--sm menu-group__log">
            <IconEdit />
            今日の痛みを記録
          </Link>
        )}
      </div>
    </div>
  );
}

/** Menu items grouped by the recovery-plan step they were added from (in menu order); items from elsewhere last. */
function groupBySource(items: MenuItem[]) {
  const groups: { key: string; item?: MenuItem; rows: { it: MenuItem; index: number }[] }[] = [];
  items.forEach((it, index) => {
    const k = sourceKey(it);
    let g = groups.find((x) => x.key === k);
    if (!g) {
      g = { key: k, item: k ? it : undefined, rows: [] };
      groups.push(g);
    }
    g.rows.push({ it, index });
  });
  // exercises added on their own go last
  return [...groups.filter((g) => g.key), ...groups.filter((g) => !g.key)];
}

/** 「週3回 · 今週 1/3」 / 「今日は休みでもOK」 — the status line of a weekly exercise. */
function WeeklyStatus({ id, min, max }: { id: ExerciseId; min: number; max: number }) {
  const menu = useMenu();
  const n = menu.weekCount(id);
  const met = n >= min;
  // 週1回以上 / 週3回〜毎日 (max 7): an open-ended target reads 「1回以上」, not 「1〜7回」
  const target = max >= 7 && min < 7 ? `${min}回以上` : max > min ? `${min}〜${max}回` : `${min}回`;
  return (
    <p className={`menu-item__freq${met ? ' is-met' : ''}`}>
      今週 {n}/{target}
      {met ? '・今週の目標達成' : menu.restToday(id) ? '・今日は休みでもOK（1日おき）' : ''}
    </p>
  );
}

function MenuTab() {
  const menu = useMenu();
  const [edit, setEdit] = useState(false);
  const total = menu.items.length;
  // today's checklist = the daily exercises; 週n回 exercises count toward a weekly target instead
  const dailyTotal = menu.dailyTotal;
  const done = menu.dailyDoneToday;
  const pct = dailyTotal ? Math.round((done / dailyTotal) * 100) : 0;
  const wpct = menu.weeklyTarget ? Math.round((menu.weeklyDone / menu.weeklyTarget) * 100) : 0;
  const groups = useMemo(() => groupBySource(menu.items), [menu.items]);
  const listRef = useRef<HTMLDivElement>(null);
  const editBtnRef = useRef<HTMLButtonElement>(null);
  // keyboard focus to restore after a reorder / delete re-renders the list
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  useEffect(() => {
    if (!focusTarget) return;
    const el =
      focusTarget === 'edit' ? editBtnRef.current : listRef.current?.querySelector<HTMLElement>(`[data-tool="${focusTarget}"]:not([disabled])`);
    el?.focus();
    setFocusTarget(null);
  }, [focusTarget, menu.items]);

  // the list is shown grouped by plan step: ↑↓ reorder within a group (k = position in it, n = its size)
  const move = (id: ExerciseId, other: ExerciseId, k: number, n: number, dir: -1 | 1) => {
    menu.swap(id, other);
    const j = k + dir;
    // the pressed arrow gets disabled at the ends → keep focus on the item's other arrow
    const ends = j === 0 || j === n - 1;
    setFocusTarget(`${id}:${ends ? (dir < 0 ? 'down' : 'up') : dir < 0 ? 'up' : 'down'}`);
  };
  const removeAt = (it: MenuItem, i: number) => {
    menu.remove(it.id);
    const next = menu.items[i + 1] ?? menu.items[i - 1];
    setFocusTarget(next ? `${next.id}:del` : 'edit');
    toast(`「${exerciseName(it.id)}」を削除しました`, 5000, { label: '元に戻す', onClick: () => menu.restore([{ item: it, index: i }]) });
  };

  // recovery-plan steps the menu was built from (for 「まとめて外す」 in edit mode)
  const sources = useMemo(() => {
    const m = new Map<string, { label: string; items: { item: MenuItem; index: number }[] }>();
    menu.items.forEach((it, index) => {
      const k = sourceKey(it);
      if (!k) return;
      const g = m.get(k) ?? { label: sourceLabel(it), items: [] };
      g.items.push({ item: it, index });
      m.set(k, g);
    });
    return [...m.entries()].map(([key, v]) => ({ key, ...v }));
  }, [menu.items]);
  const removeSource = (src: (typeof sources)[number]) => {
    menu.removeMany(src.items.map((x) => x.item.id));
    setFocusTarget('edit');
    toast(`${src.label}の${src.items.length}種目を外しました`, 5000, { label: '元に戻す', onClick: () => menu.restore(src.items) });
  };

  if (!total) {
    return (
      <div style={{ marginTop: 20 }}>
        <EmptyState
          icon={<IconChecklist />}
          title="まだメニューがありません"
          text="障害ページの回復プランや、エクササイズのページから「マイメニューに追加」すると、ここで毎日チェックできます。"
        >
          <Link to="/" className="btn btn--primary">
            痛む場所から探す
          </Link>
          <Link to="/exercises" className="btn btn--secondary">
            エクササイズを見る
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <section className="section section--tight" aria-label="今日のチェックリスト">
        <div className="section__head-row" style={{ marginBottom: 10 }}>
          <div>
            <span aria-hidden="true" lang="en" className="kicker">Today</span>
            <h2>
              今日 <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{formatDateJa(menu.today)}</span>
            </h2>
          </div>
          <button
            type="button"
            ref={editBtnRef}
            className={`btn btn--sm ${edit ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setEdit((v) => !v)}
            aria-pressed={edit}
          >
            {edit ? <IconCheck /> : <IconEdit />}
            {edit ? '完了' : '並べ替え・削除'}
          </button>
        </div>

        <div className="card card--flush">
          <div className="menu-progress">
            {dailyTotal > 0 && (
              <div>
                <div className="menu-progress__row">
                  <p className="small muted">
                    {done === dailyTotal ? '毎日の種目はすべて完了！おつかれさまでした' : `毎日の種目 ${dailyTotal}種目中 ${done}種目 完了`}
                  </p>
                  <span className="small menu-progress__pct">{pct}%</span>
                </div>
                <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="今日の毎日の種目の達成度">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
            {menu.weeklyCount > 0 && (
              <div>
                <div className="menu-progress__row">
                  <p className="small muted">
                    週に数回の種目 今週 {menu.weeklyDone}/{menu.weeklyTarget}回
                  </p>
                  <span className="small menu-progress__pct">{wpct}%</span>
                </div>
                <div className="progress progress--week" role="progressbar" aria-valuenow={wpct} aria-valuemin={0} aria-valuemax={100} aria-label="今週の週に数回の種目の達成度">
                  <span style={{ width: `${wpct}%` }} />
                </div>
                <p className="tiny" style={{ marginTop: 6 }}>
                  筋力・腱の運動は毎日でなくてOK。1日おきに行い、休む日も回復のうちです。
                </p>
              </div>
            )}
          </div>
          <div ref={listRef}>
            {groups.map((g) => (
              <div key={g.key || 'other'} className="menu-group">
                {g.item ? <PlanGroupHead it={g.item} /> : groups.length > 1 && <p className="menu-group__head menu-group__head--plain">その他のエクササイズ</p>}
                {g.rows.map(({ it, index: i }, k) => {
              const prev = g.rows[k - 1]?.it.id;
              const next = g.rows[k + 1]?.it.id;
              const ex = getExercise(it.id);
              const isDone = menu.isDone(it.id);
              // added from a plan step: that step's dose (and frequency), from the current content
              const dose = menu.dose(it.id);
              const freq = menu.frequency(it.id);
              // the plan step is the group header; say so only when the plan no longer has this exercise
              const src = inPlan(it) ? '' : sourceLabel(it, true);
              return (
                <div key={it.id} className={`menu-item${isDone ? ' is-done' : ''}`}>
                  {!edit && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      aria-label={`${exerciseName(it.id)}（今日の分）`}
                      className="checkbox"
                      onClick={() => menu.toggleDone(it.id)}
                    >
                      <span className="checkbox__box">
                        <IconCheck />
                      </span>
                    </button>
                  )}
                  <Link to={exerciseLink(it)} className="menu-item__main" style={edit ? { paddingLeft: 10 } : undefined}>
                    <p className="row__title">{exerciseName(it.id)}</p>
                    <p className="row__sub">{ex ? doseShort(dose ?? ex.dose) : '準備中'}</p>
                    {freq.kind === 'weekly' && !edit && <WeeklyStatus id={it.id} min={freq.min} max={freq.max} />}
                    {src && <p className="menu-item__src">{src}</p>}
                  </Link>
                  {edit && (
                    <div className="menu-item__tools">
                      <button
                        type="button"
                        className="icon-btn icon-btn--sm icon-btn--muted"
                        aria-label={`${exerciseName(it.id)}を上へ`}
                        data-tool={`${it.id}:up`}
                        disabled={!prev}
                        style={!prev ? { opacity: 0.3 } : undefined}
                        onClick={() => prev && move(it.id, prev, k, g.rows.length, -1)}
                      >
                        <IconUp />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--sm icon-btn--muted"
                        aria-label={`${exerciseName(it.id)}を下へ`}
                        data-tool={`${it.id}:down`}
                        disabled={!next}
                        style={!next ? { opacity: 0.3 } : undefined}
                        onClick={() => next && move(it.id, next, k, g.rows.length, 1)}
                      >
                        <IconDown />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--sm"
                        style={{ color: 'var(--danger)' }}
                        aria-label={`${exerciseName(it.id)}をメニューから削除`}
                        data-tool={`${it.id}:del`}
                        onClick={() => removeAt(it, i)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  )}
                </div>
              );
                })}
              </div>
            ))}
          </div>
          {edit && sources.length > 0 && (
            <div className="menu-sources">
              <p className="tiny" style={{ fontWeight: 700 }}>
                回復プランのステップごとに外す
              </p>
              {sources.map((src) => (
                <div key={src.key} className="menu-sources__row">
                  <span className="grow small">
                    {src.label}
                    <span className="muted">（{src.items.length}種目）</span>
                  </span>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => removeSource(src)}>
                    まとめて外す
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <Link to="/exercises" className="btn btn--ghost btn--sm">
            エクササイズを追加する
          </Link>
        </div>
      </section>

      <Section kicker="This week" title="今週の記録">
        <div className="card">
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <p className="tiny" style={{ fontWeight: 700 }}>
                実施回数（チェックした数）
              </p>
              <p className="stat">
                <span className="stat__num">{menu.weekTotal}</span>
                <span className="stat__unit">回</span>
              </p>
            </div>
            <div>
              <p className="tiny" style={{ fontWeight: 700 }}>
                取り組んだ日
              </p>
              <p className="stat">
                <span className="stat__num">{menu.weekActiveDays}</span>
                <span className="stat__unit">/ 7日</span>
              </p>
            </div>
          </div>
          <div className="week" role="list" aria-label="今週の日ごとの実施数">
            {menu.week.map((d) => {
              // a full ring = every daily exercise (or, with weekly ones only, every exercise) checked that day
              const perDay = dailyTotal || total;
              const p = perDay ? Math.min(100, Math.round((d.count / perDay) * 100)) : 0;
              const isToday = d.date === menu.today;
              const future = d.date > menu.today;
              return (
                <div key={d.date} role="listitem" className={`week__day${isToday ? ' is-today' : ''}${future ? ' is-future' : ''}`}>
                  <span aria-hidden="true">{weekdayJa(d.date)}</span>
                  <span className="week__ring" style={{ '--p': p } as CSSProperties} aria-hidden="true">
                    {d.count || ''}
                  </span>
                  <span className="sr-only">
                    {formatDateJa(d.date)}
                    {isToday ? '（今日）' : ''}：{future ? 'これから' : `${d.count}種目`}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="tiny" style={{ marginTop: 12 }}>
            補強は週2〜3回、ストレッチ・モビリティは毎日でもOK。痛みが増える日は量を減らしましょう。
          </p>
        </div>
      </Section>
    </>
  );
}

/* ───────────────────────── 痛みログ ───────────────────────── */

const SPOT_IDS = new Set<string>(PAIN_SPOTS.map((s) => s.id));
type MapView = 'front' | 'back' | 'sole';
const firstView = (spot: string | undefined): MapView | undefined => {
  const v = spot ? spotViews(spot)[0] : undefined;
  return v === 'front' || v === 'back' || v === 'sole' ? v : undefined;
};

function PainLogTab({ initialSpot, initialSide }: { initialSpot: string | null; initialSide: string | null }) {
  const log = usePainLog();
  const formRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<PainSpotId | ''>(initialSpot && SPOT_IDS.has(initialSpot) ? (initialSpot as PainSpotId) : '');
  const [side, setSide] = useState<PainSide>(initialSide === 'left' || initialSide === 'right' ? initialSide : 'both');
  const intensity = useMemo(() => log.recentIntensity(14), [log]);
  const bySide = useMemo(() => log.recentBySide(14), [log]);
  // the map tints the side that was logged ('both' tints both); intensity / activeSpots stay as the fallback
  const sides = useMemo(() => log.recentSides(14), [log]);
  const activeSpots = (Object.keys(intensity) as PainSpotId[]).filter((k) => (intensity[k] ?? 0) > 0);
  // how many logged spots (with pain > 0) each view shows
  const viewCounts = useMemo(() => {
    const c = { front: 0, back: 0, sole: 0 };
    for (const id of activeSpots) for (const v of spotViews(id)) if (v in c) c[v as MapView]++;
    return c;
  }, [activeSpots.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [mapView, setMapView] = useState<MapView>(() => {
    const first = (spot || log.entries.find((e) => e.score > 0)?.spot) as string | undefined;
    return firstView(first) ?? 'front';
  });
  // follow the spot chosen in the form (if the current view doesn't show it)
  useEffect(() => {
    if (!spot) return;
    const views = spotViews(spot);
    const v = firstView(spot);
    if (v && !views.includes(mapView)) setMapView(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot]);
  const viewLabel = (id: MapView, label: string) =>
    viewCounts[id] ? (
      <>
        {label}
        <span className="seg__count" aria-hidden="true">
          {viewCounts[id]}
        </span>
        <span className="sr-only">（記録 {viewCounts[id]}か所）</span>
      </>
    ) : (
      label
    );

  return (
    <>
      <section className="section section--tight" aria-label="痛みを記録" ref={formRef} style={{ scrollMarginTop: 16 }}>
        <div className="section__head">
          <span aria-hidden="true" lang="en" className="kicker">New entry</span>
          <h2>痛みを記録する</h2>
        </div>
        <EntryForm spot={spot} setSpot={setSpot} side={side} setSide={setSide} />
      </section>

      <Section kicker="Last 14 days" title="最近14日の痛みマップ" desc="記録した痛みの強さ（最大値）を色で表示します。タップでその場所を記録できます。">
        <div className="card" style={{ padding: 12 }}>
          <Segmented
            small
            label="からだの向き"
            value={mapView}
            onChange={setMapView}
            options={[
              { id: 'front', label: viewLabel('front', '前') },
              { id: 'back', label: viewLabel('back', '後ろ') },
              { id: 'sole', label: viewLabel('sole', '足裏') },
            ]}
          />
          {activeSpots.length > 0 && !viewCounts[mapView] && (
            <p className="tiny" style={{ marginTop: 8, textAlign: 'center' }}>
              この向きには最近の記録がありません。数字のついた向きに切り替えてください。
            </p>
          )}
          <div className="bodymap-frame">
            <SafeBodyMap
              view={mapView}
              intensity={intensity}
              activeSpots={activeSpots}
              intensitySides={sides.intensitySides}
              activeSides={sides.activeSides}
              selectedSpot={spot || null}
              onSelect={(id, s) => {
                setSpot(id);
                setSide(s);
                formRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
              }}
            />
          </div>
          {bySide.length > 0 && (
            <>
              <p className="tiny" style={{ marginTop: 8 }}>
                図は記録した側に色をつけています（「両側」の記録は左右とも）。
              </p>
              <ul className="side-list" aria-label="最近14日に記録した場所と左右（最大値）">
                {bySide.map((x) => (
                  <li key={`${x.spot}|${x.side}`} className="side-list__item">
                    <span className="side-list__score" style={{ '--c': scoreColorVar(x.max) } as CSSProperties}>
                      {x.max}
                    </span>
                    {spotLabel(x.spot)}・{SIDE_JA[x.side]}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Section>

      <Trends entries={log.entries} />

      <Section kicker="History" title="記録の一覧">
        {log.entries.length === 0 ? (
          <EmptyState compact icon={<IconPulse />} title="まだ記録がありません" text="痛みを数字で記録すると、回復の進み具合や、練習と痛みの関係が見えてきます。" />
        ) : (
          <EntryList entries={log.entries} onDelete={log.remove} />
        )}
      </Section>

      <ExportSection entries={log.entries} />
    </>
  );
}

function EntryForm({
  spot,
  setSpot,
  side,
  setSide,
}: {
  spot: PainSpotId | '';
  setSpot: (s: PainSpotId | '') => void;
  side: PainSide;
  setSide: (s: PainSide) => void;
}) {
  const log = usePainLog();
  const [score, setScore] = useState(3);
  const [context, setContext] = useState<PainContext>('run');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState('');
  const contextRadio = useRadioGroup(CONTEXT_ORDER, context, setContext);

  const save = () => {
    if (!spot) {
      setError('痛む場所を選んでください');
      return;
    }
    const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO();
    log.add({ date: d, spot, side, score, context, note: note.trim() });
    setNote('');
    setError('');
    toastSaved('記録しました');
  };

  return (
    <div className="card card--lg">
      <div className="field">
        <label className="field__label" htmlFor="log-spot">
          痛む場所
        </label>
        <select
          id="log-spot"
          className="select"
          value={spot}
          onChange={(e) => {
            setSpot(e.target.value as PainSpotId | '');
            setError('');
          }}
          aria-invalid={!!error}
        >
          <option value="">選んでください</option>
          {REGIONS.map((r) => (
            <optgroup key={r.id} label={regionName(r.id)}>
              {PAIN_SPOTS.filter((s) => s.region === r.id).map((s) => (
                <option key={s.id} value={s.id}>
                  {spotLabel(s.id)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {error && (
          <p className="small" style={{ color: 'var(--danger)', fontWeight: 700 }} role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="field">
        <span className="field__label" id="log-side">
          左右
        </span>
        <Segmented
          label="左右"
          value={side}
          onChange={setSide}
          options={[
            { id: 'left', label: '左' },
            { id: 'right', label: '右' },
            { id: 'both', label: '両側' },
          ]}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="log-score">
          痛みの強さ（0 = なし、10 = 想像できる最大）
        </label>
        <div className="score">
          <div className="score__value" style={{ '--c': scoreColorVar(score) } as CSSProperties} aria-hidden="true">
            <span className="score__num">{score}</span>
            <span className="score__lab">{scoreLabel(score)}</span>
          </div>
          <div className="score__track">
            <input
              id="log-score"
              className="range"
              type="range"
              min={0}
              max={10}
              step={1}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              aria-valuetext={`${score}（${scoreLabel(score)}）`}
            />
            <div className="score__scale" aria-hidden="true">
              <span>0</span>
              <span>3</span>
              <span>5</span>
              <span>7</span>
              <span>10</span>
            </div>
          </div>
        </div>
      </div>

      <div className="field">
        <span className="field__label">いつ痛んだ？</span>
        <div className="chips" role="radiogroup" aria-label="いつ痛んだ">
          {CONTEXT_ORDER.map((c, i) => (
            <button key={c} type="button" className={`chip${context === c ? ' is-active' : ''}`} {...contextRadio(c, i)}>
              {CONTEXT_JA[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="log-date">
          日付
        </label>
        <input id="log-date" className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="log-note">
          メモ（任意）
        </label>
        <textarea
          id="log-note"
          className="textarea"
          value={note}
          maxLength={500}
          placeholder="例：10kmラン後半から。下り坂で強くなった"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button type="button" className="btn btn--primary btn--block" style={{ marginTop: 20 }} onClick={save}>
        <IconCheck />
        記録する
      </button>
    </div>
  );
}

function EntryList({ entries, onDelete }: { entries: PainEntry[]; onDelete: (id: string) => void }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const byDate = useMemo(() => {
    const m = new Map<string, PainEntry[]>();
    for (const e of entries) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return [...m.entries()];
  }, [entries]);

  return (
    <div>
      {byDate.map(([date, list]) => (
        <div key={date}>
          <p className="date-head">
            {relativeDayJa(date) ? `${relativeDayJa(date)} · ` : ''}
            {formatDateJa(date)}
          </p>
          <div className="card card--flush">
            {list.map((e) => (
              <div key={e.id} className="entry">
                <span className="entry__score" style={{ '--c': scoreColorVar(e.score) } as CSSProperties} aria-hidden="true">
                  {e.score}
                </span>
                <span className="sr-only">痛み {e.score}/10、</span>
                <div className="entry__main">
                  <p className="entry__title">{spotLabel(e.spot)}</p>
                  <div className="entry__meta">
                    <span className="badge badge--neutral">{SIDE_JA[e.side]}</span>
                    <span className={`badge ${e.context === 'swim' || e.context === 'bike' || e.context === 'run' ? `badge--${e.context}` : 'badge--outline'}`}>
                      {CONTEXT_JA[e.context]}
                    </span>
                  </div>
                  {e.note && <p className="entry__note">{e.note}</p>}
                </div>
                {confirm === e.id ? (
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => {
                      onDelete(e.id);
                      setConfirm(null);
                      toast('削除しました');
                    }}
                    onBlur={() => setConfirm(null)}
                    autoFocus
                  >
                    削除
                  </button>
                ) : (
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm icon-btn--muted"
                    aria-label={`${spotLabel(e.spot)}の記録を削除`}
                    onClick={() => setConfirm(e.id)}
                  >
                    <IconTrash />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The condition (from the menu's recovery plans) a spot belongs to, for a 「痛みのルール」 link. */
function useSpotCondition() {
  const menu = useMenu();
  return (spot: PainSpotId) => {
    for (const it of menu.items) {
      const c = it.from?.condition ? getCondition(it.from.condition) : undefined;
      if (c?.painSpots.includes(spot)) return c;
    }
    return undefined;
  };
}

function Trends({ entries }: { entries: PainEntry[] }) {
  const today = todayISO();
  const from = addDays(today, -27);
  const conditionFor = useSpotCondition();
  // one series per spot AND side; the 起床時 entries are their own series (the 24-hour rule compares mornings)
  const series = useMemo(() => {
    const m = new Map<string, { spot: PainSpotId; side: PainSide; act: Map<string, number>; morn: Map<string, number> }>();
    for (const e of entries) {
      if (e.date < from) continue;
      const k = `${e.spot}|${e.side}`;
      const s = m.get(k) ?? { spot: e.spot, side: e.side, act: new Map<string, number>(), morn: new Map<string, number>() };
      const day = e.context === 'morning' ? s.morn : s.act;
      day.set(e.date, Math.max(day.get(e.date) ?? 0, e.score));
      m.set(k, s);
    }
    const pts = (days: Map<string, number>) =>
      [...days.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => (a.date < b.date ? -1 : 1));
    return [...m.entries()]
      .map(([key, x]) => {
        const points = pts(x.act);
        const morning = pts(x.morn);
        const lastDate = [points[points.length - 1]?.date, morning[morning.length - 1]?.date].filter(Boolean).sort().pop() ?? '';
        return { key, spot: x.spot, side: x.side, points, morning, lastDate };
      })
      .sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
  }, [entries, from]);

  if (!series.length) return null;
  return (
    <Section
      kicker="Trend"
      title="場所ごとの推移"
      desc="過去4週間。実線はその日の運動中・日常の最大値、青い点線は起床時（翌朝）の痛みです。緑の点線（3）以下が運動してよい痛みの目安です（腱のリハビリ中は5まで許容されることがあります。障害ページの「痛みのルール」を確認してください）。"
    >
      <div className="card card--flush">
        {series.map((s) => {
          const main = s.points.length ? s.points : s.morning;
          const first = main[0];
          const last = main[main.length - 1];
          const diff = last.value - first.value;
          // the 24-hour rule: the morning after should not be worse than the morning before
          const m = s.morning;
          const mornUp = m.length > 1 && m[m.length - 1].value > m[m.length - 2].value && m[m.length - 1].date >= addDays(today, -2);
          const recentMax = Math.max(0, ...[...s.points, ...s.morning].filter((p) => p.date >= addDays(today, -6)).map((p) => p.value));
          const cond = conditionFor(s.spot);
          return (
            <div key={s.key} className="trend">
              <p className="trend__name">
                {spotLabel(s.spot)}
                <span className="badge badge--neutral" style={{ marginLeft: 6, verticalAlign: '1px' }}>
                  {SIDE_JA[s.side]}
                </span>
              </p>
              <p className="trend__latest">
                {s.points.length ? '最新' : '起床時'} <strong>{last.value}</strong>
                {main.length > 1 && (
                  <span style={{ marginLeft: 6, fontWeight: 700, color: diff < 0 ? 'var(--ok)' : diff > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                    {diff < 0 ? `↓${-diff}` : diff > 0 ? `↑${diff}` : '±0'}
                  </span>
                )}
              </p>
              <div className="trend__chart">
                <Sparkline points={s.points} morning={s.morning} end={today} days={28} />
              </div>
              {recentMax >= 7 ? (
                <div className="trend__hint trend__hint--danger" role="note">
                  <IconAlert />
                  <p>
                    この1週間に7以上の強い痛みがあります。運動は中止し、
                    <Link to="/guide/red-flags" className="link">
                      受診の目安
                    </Link>
                    を確認してください。
                  </p>
                </div>
              ) : (
                mornUp && (
                  <div className="trend__hint" role="note">
                    <IconAlert />
                    <p>
                      起床時の痛みが前回（{formatDateJa(m[m.length - 2].date, false)}：{m[m.length - 2].value}）より強くなっています。運動量を一段階戻しましょう。{' '}
                      {cond ? (
                        <Link to={`/condition/${cond.id}`} className="link">
                          {cond.nameJa}の痛みのルール
                        </Link>
                      ) : (
                        <Link to="/guide/pain-monitoring" className="link">
                          痛みのルール
                        </Link>
                      )}
                      ・
                      <Link to="/guide/red-flags" className="link">
                        受診の目安
                      </Link>
                    </p>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ───────────────────────── 書き出し ───────────────────────── */

/** 「11月20日（金）ラン 4/10 …」: the log as plain Japanese text, grouped by spot and side, for showing a doctor. */
function summaryText(entries: PainEntry[]): string {
  const groups = new Map<string, PainEntry[]>();
  for (const e of [...entries].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))) {
    const k = `${e.spot}|${e.side}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const lines = [`TriBody 痛みの記録（${formatDateJa(todayISO())}時点）`, '痛みの強さ：0 = なし、10 = 想像できる最大', ''];
  for (const list of groups.values()) {
    const { spot, side } = list[0];
    lines.push(`■ ${spotLabel(spot)}（${SIDE_JA[side]}）`);
    for (const e of list) lines.push(`・${formatDateJa(e.date)} ${CONTEXT_JA[e.context]} ${e.score}/10${e.note ? `　メモ：${e.note}` : ''}`);
    const act = list.filter((e) => e.context !== 'morning');
    const morn = list.filter((e) => e.context === 'morning');
    const span = (l: PainEntry[]) => `${l[0].score} → ${l[l.length - 1].score}`;
    const trend = [act.length > 1 && `運動・日常 ${span(act)}`, morn.length > 1 && `起床時 ${span(morn)}`].filter(Boolean).join('／');
    if (trend) lines.push(`　推移：${trend}`);
    lines.push('');
  }
  lines.push('※ TriBody（教育用アプリ）に記録したものです。診断ではありません。');
  return lines.join('\n');
}

/** Download `text` as a file. False when it cannot work here (a sandboxed preview blocks downloads silently). */
function download(text: string, name: string, type: string): boolean {
  if (isFramed()) return false;
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

function backupJson(entries: PainEntry[]): string {
  return JSON.stringify(
    {
      app: 'TriBody',
      kind: 'painlog',
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: entries.map((e) => ({ ...e, spotLabel: spotLabel(e.spot) })),
    },
    null,
    2,
  );
}

function ExportSection({ entries }: { entries: PainEntry[] }) {
  const log = usePainLog();
  const [sheet, setSheet] = useState<null | 'summary' | 'json'>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const text = useMemo(() => (sheet === 'summary' ? summaryText(entries) : sheet === 'json' ? backupJson(entries) : ''), [sheet, entries]);

  const saveBackup = () => {
    // only claim it when a download really started; in a sandboxed preview show the text to copy instead
    if (download(backupJson(entries), `tribody-painlog-${todayISO()}.json`, 'application/json')) toast('バックアップの保存を開始しました');
    else setSheet('json');
  };
  const onFile = (f: File | undefined) => {
    if (!f) return;
    f.text()
      .then((t) => {
        const r = log.importBackup(JSON.parse(t));
        toastSaved(r.added ? `${r.added}件を読み込みました${r.skipped ? `（同じ記録${r.skipped}件はスキップ）` : ''}` : 'すべて記録済みでした', r.added > 0);
      })
      .catch(() => toast('読み込めませんでした。TriBodyで保存したバックアップ（JSON）を選んでください'))
      .finally(() => {
        if (fileRef.current) fileRef.current.value = '';
      });
  };

  return (
    <Section kicker="Export" title="記録を見せる・保存する" desc="記録はこの端末のブラウザ内にのみ保存されます。">
      <div className="btn-stack">
        {entries.length > 0 && (
          <button type="button" className="btn btn--secondary btn--block" onClick={() => setSheet('summary')}>
            <IconChecklist />
            受診用のまとめを表示
          </button>
        )}
        {entries.length > 0 && (
          <button type="button" className="btn btn--outline btn--block" onClick={saveBackup}>
            <IconDownload />
            バックアップを保存（JSON）
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--block" onClick={() => fileRef.current?.click()}>
          <IconUp />
          バックアップを読み込む
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <p className="tiny" style={{ marginTop: 8 }}>
        「受診用のまとめ」は日付・場所（左右）・痛みの強さ・いつ・メモを日本語で一覧にした文章です。コピーや共有で医師や理学療法士に見せられます。JSONはこのアプリに読み込み直すためのバックアップです（機種変更のときなど）。
      </p>

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        label={sheet === 'json' ? 'バックアップ（JSON）' : '受診用のまとめ'}
        header={<h2>{sheet === 'json' ? 'バックアップ（JSON）' : '受診用のまとめ'}</h2>}
      >
        {sheet && <ExportText text={text} json={sheet === 'json'} />}
      </BottomSheet>
    </Section>
  );
}

function ExportText({ text, json }: { text: string; json: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const framed = isFramed();
  const canShare = !json && !framed && typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const selectAll = () => {
    ref.current?.focus();
    ref.current?.select();
  };
  const copy = () => {
    const fail = () => {
      selectAll();
      toast('コピーできませんでした。選択した文字を長押ししてコピーしてください');
    };
    try {
      void navigator.clipboard.writeText(text).then(() => toastSaved('コピーしました'), fail);
    } catch {
      fail();
    }
  };
  return (
    <div>
      {json && (
        <p className="small muted" style={{ marginBottom: 8 }}>
          この表示環境ではファイルを保存できません。下の文字をすべてコピーして、メモなどに貼り付けて保存してください。
        </p>
      )}
      <textarea
        ref={ref}
        className="textarea export-text"
        readOnly
        value={text}
        onFocus={selectAll}
        aria-label={json ? 'バックアップの内容' : '受診用のまとめ'}
      />
      <div className="btn-stack" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn--primary btn--block" onClick={copy}>
          <IconCheck />
          すべてコピー
        </button>
        {canShare && (
          <button
            type="button"
            className="btn btn--secondary btn--block"
            onClick={() => {
              navigator.share({ title: 'TriBody 痛みの記録', text }).catch(() => {});
            }}
          >
            共有する
          </button>
        )}
        {!json && !framed && (
          <button
            type="button"
            className="btn btn--outline btn--block"
            onClick={() => {
              if (download(text, `tribody-painlog-${todayISO()}.txt`, 'text/plain')) toast('テキストの保存を開始しました');
              else toast('この表示環境では保存できません。コピーして使ってください');
            }}
          >
            <IconDownload />
            テキストで保存
          </button>
        )}
      </div>
    </div>
  );
}
