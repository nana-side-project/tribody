import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PAIN_SPOTS, REGIONS, getExercise, type PainSpotId } from '../data';
import { SafeBodyMap } from '../components/SafeBodyMap';
import {
  IconCheck,
  IconChecklist,
  IconDown,
  IconDownload,
  IconEdit,
  IconPulse,
  IconTrash,
  IconUp,
} from '../components/icons';
import { Page } from '../components/Layout';
import { Sparkline } from '../components/Sparkline';
import { EmptyState, Section, Segmented } from '../components/ui';
import { addDays, formatDateJa, relativeDayJa, todayISO, weekdayJa } from '../lib/date';
import { CONTEXT_JA, CONTEXT_ORDER, SIDE_JA, doseShort, exerciseName, regionName, spotLabel, spotViews } from '../lib/labels';
import { scrollBehavior } from '../lib/useMedia';
import { isPersistent } from '../lib/storage';
import { toast } from '../lib/toast';
import { useMenu } from '../lib/useMenu';
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
        <span className="kicker">My menu</span>
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

function MenuTab() {
  const menu = useMenu();
  const [edit, setEdit] = useState(false);
  const total = menu.items.length;
  const done = menu.doneTodayCount;
  const pct = total ? Math.round((done / total) * 100) : 0;

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
            <span className="kicker">Today</span>
            <h2>
              今日 <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{formatDateJa(menu.today)}</span>
            </h2>
          </div>
          <button type="button" className={`btn btn--sm ${edit ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setEdit((v) => !v)} aria-pressed={edit}>
            {edit ? <IconCheck /> : <IconEdit />}
            {edit ? '完了' : '並べ替え・削除'}
          </button>
        </div>

        <div className="card card--flush">
          <div style={{ padding: '14px 16px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p className="small muted">{done === total ? 'すべて完了しました。おつかれさまでした！' : `${total}種目中 ${done}種目 完了`}</p>
              <span className="small" style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {pct}%
              </span>
            </div>
            <div className="progress" style={{ marginTop: 8 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="今日の達成度">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {menu.items.map((it, i) => {
              const ex = getExercise(it.id);
              const isDone = menu.isDone(it.id);
              return (
                <div key={it.id} className={`menu-item${isDone ? ' is-done' : ''}`}>
                  {!edit && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      aria-label={`${exerciseName(it.id)} を${isDone ? '未完了に戻す' : '完了にする'}`}
                      className="checkbox"
                      onClick={() => menu.toggleDone(it.id)}
                    >
                      <span className="checkbox__box">
                        <IconCheck />
                      </span>
                    </button>
                  )}
                  <Link to={`/exercise/${it.id}`} className="menu-item__main" style={edit ? { paddingLeft: 10 } : undefined}>
                    <p className="row__title">{exerciseName(it.id)}</p>
                    <p className="row__sub">{ex ? doseShort(ex.dose) : '準備中'}</p>
                  </Link>
                  {edit && (
                    <div className="menu-item__tools">
                      <button type="button" className="icon-btn icon-btn--sm icon-btn--muted" aria-label="上へ" disabled={i === 0} style={i === 0 ? { opacity: 0.3 } : undefined} onClick={() => menu.move(it.id, -1)}>
                        <IconUp />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--sm icon-btn--muted"
                        aria-label="下へ"
                        disabled={i === total - 1}
                        style={i === total - 1 ? { opacity: 0.3 } : undefined}
                        onClick={() => menu.move(it.id, 1)}
                      >
                        <IconDown />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--sm"
                        style={{ color: 'var(--danger)' }}
                        aria-label={`${exerciseName(it.id)} をメニューから削除`}
                        onClick={() => {
                          menu.remove(it.id);
                          toast('メニューから削除しました');
                        }}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                実施した種目
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
          <div className="week" aria-label="今週の日ごとの実施数">
            {menu.week.map((d) => {
              const p = total ? Math.min(100, Math.round((d.count / total) * 100)) : 0;
              const isToday = d.date === menu.today;
              const future = d.date > menu.today;
              return (
                <div key={d.date} className={`week__day${isToday ? ' is-today' : ''}`} style={future ? { opacity: 0.45 } : undefined}>
                  <span>{weekdayJa(d.date)}</span>
                  <span className="week__ring" style={{ '--p': p } as CSSProperties} aria-label={`${formatDateJa(d.date)} ${d.count}種目`}>
                    {d.count || ''}
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

function PainLogTab({ initialSpot, initialSide }: { initialSpot: string | null; initialSide: string | null }) {
  const log = usePainLog();
  const formRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<PainSpotId | ''>(initialSpot && SPOT_IDS.has(initialSpot) ? (initialSpot as PainSpotId) : '');
  const [side, setSide] = useState<PainSide>(initialSide === 'left' || initialSide === 'right' ? initialSide : 'both');
  const [mapView, setMapView] = useState<'front' | 'back' | 'sole'>(() => {
    const first = (spot || log.entries[0]?.spot) as string | undefined;
    const v = first ? spotViews(first)[0] : undefined;
    return v === 'back' || v === 'sole' ? v : 'front';
  });
  const intensity = useMemo(() => log.recentIntensity(14), [log]);
  const activeSpots = Object.keys(intensity) as PainSpotId[];

  return (
    <>
      <section className="section section--tight" aria-label="痛みを記録" ref={formRef} style={{ scrollMarginTop: 16 }}>
        <div className="section__head">
          <span className="kicker">New entry</span>
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
              { id: 'front', label: '前' },
              { id: 'back', label: '後ろ' },
              { id: 'sole', label: '足裏' },
            ]}
          />
          <div className="bodymap-frame">
            <SafeBodyMap
              view={mapView}
              intensity={intensity}
              activeSpots={activeSpots}
              selectedSpot={spot || null}
              onSelect={(id, s) => {
                setSpot(id);
                setSide(s);
                formRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
              }}
            />
          </div>
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

      {log.entries.length > 0 && (
        <section className="section" aria-label="書き出し">
          <button type="button" className="btn btn--outline btn--block" onClick={() => exportJson(log.entries)}>
            <IconDownload />
            JSONで書き出す
          </button>
          <p className="tiny" style={{ marginTop: 8, textAlign: 'center' }}>
            記録はこの端末のブラウザ内にのみ保存されます。受診時に見せる・バックアップする場合にどうぞ。
          </p>
        </section>
      )}
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

  const save = () => {
    if (!spot) {
      setError('痛む場所を選んでください');
      return;
    }
    const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO();
    log.add({ date: d, spot, side, score, context, note: note.trim() });
    setNote('');
    setError('');
    toast('記録しました');
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
          {CONTEXT_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={context === c}
              className={`chip${context === c ? ' is-active' : ''}`}
              onClick={() => setContext(c)}
            >
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
                <span className="entry__score" style={{ '--c': scoreColorVar(e.score) } as CSSProperties} aria-label={`痛み ${e.score}/10`}>
                  {e.score}
                </span>
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
                  <button type="button" className="icon-btn icon-btn--sm icon-btn--muted" aria-label="この記録を削除" onClick={() => setConfirm(e.id)}>
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

function Trends({ entries }: { entries: PainEntry[] }) {
  const today = todayISO();
  const from = addDays(today, -27);
  const series = useMemo(() => {
    const m = new Map<PainSpotId, Map<string, number>>();
    for (const e of entries) {
      if (e.date < from) continue;
      const s = m.get(e.spot) ?? new Map<string, number>();
      s.set(e.date, Math.max(s.get(e.date) ?? 0, e.score));
      m.set(e.spot, s);
    }
    return [...m.entries()]
      .map(([spot, days]) => {
        const points = [...days.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => (a.date < b.date ? -1 : 1));
        return { spot, points, last: points[points.length - 1] };
      })
      .sort((a, b) => (a.last.date < b.last.date ? 1 : -1));
  }, [entries, from]);

  if (!series.length) return null;
  return (
    <Section kicker="Trend" title="場所ごとの推移" desc="過去4週間・その日の最大値。点線（3）以下が運動してよい痛みの目安です。">
      <div className="card card--flush">
        {series.map((s) => {
          const first = s.points[0];
          const diff = s.last.value - first.value;
          return (
            <div key={s.spot} className="trend">
              <p className="trend__name">{spotLabel(s.spot)}</p>
              <p className="trend__latest">
                最新 <strong>{s.last.value}</strong>
                {s.points.length > 1 && (
                  <span style={{ marginLeft: 6, fontWeight: 700, color: diff < 0 ? 'var(--ok)' : diff > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                    {diff < 0 ? `↓${-diff}` : diff > 0 ? `↑${diff}` : '±0'}
                  </span>
                )}
              </p>
              <div className="trend__chart">
                <Sparkline points={s.points} end={today} days={28} />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function exportJson(entries: PainEntry[]) {
  try {
    const data = {
      app: 'TriBody',
      exportedAt: new Date().toISOString(),
      entries: entries.map((e) => ({
        date: e.date,
        spot: e.spot,
        spotLabel: spotLabel(e.spot),
        side: e.side,
        score: e.score,
        context: e.context,
        note: e.note,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tribody-painlog-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('書き出しました');
  } catch {
    toast('書き出しできませんでした');
  }
}
