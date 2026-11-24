import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REGIONS, exercises, type ExerciseType, type RegionId } from '../data';
import { ExerciseCard } from '../components/cards';
import { IconCheck, IconDumbbell, IconSearch } from '../components/icons';
import { Page } from '../components/Layout';
import { EmptyState, SearchInput } from '../components/ui';
import { EXERCISE_TYPE_JA, muscleName, regionName } from '../lib/labels';
import { matches } from '../lib/search';
import { useMenu } from '../lib/useMenu';

const TYPES = Object.keys(EXERCISE_TYPE_JA) as ExerciseType[];

export default function ExercisesPage() {
  const [params, setParams] = useSearchParams();
  const menu = useMenu();
  const q = params.get('q') ?? '';
  const r = params.get('region');
  const region = REGIONS.some((x) => x.id === r) ? (r as RegionId) : null;
  const t = params.get('type');
  const type = TYPES.includes(t as ExerciseType) ? (t as ExerciseType) : null;
  const lv = Number(params.get('level'));
  const level = lv === 1 || lv === 2 || lv === 3 ? lv : null;
  const equip = params.get('equip');

  const update = (k: string, v: string | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (v) n.set(k, v);
        else n.delete(k);
        return n;
      },
      { replace: true },
    );

  const equipmentOptions = useMemo(() => {
    const s = new Map<string, number>();
    for (const e of exercises) for (const x of e.equipment ?? []) s.set(x, (s.get(x) ?? 0) + 1);
    return [...s.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, []);
  const typeOptions = useMemo(() => TYPES.filter((ty) => exercises.some((e) => e.type === ty)), []);

  const filtered = useMemo(
    () =>
      exercises.filter(
        (e) =>
          (!region || e.regions.includes(region)) &&
          (!type || e.type === type) &&
          (!level || e.level === level) &&
          (!equip || (e.equipment ?? []).includes(equip)) &&
          matches(q, [e.nameJa, e.nameEn, ...e.primary.map(muscleName)]),
      ),
    [q, region, type, level, equip],
  );

  const anyFilter = !!(q || region || type || level || equip);

  return (
    <Page title="エクササイズ">
      <header className="page-head">
        <span className="kicker">Exercise library</span>
        <h1>エクササイズ</h1>
        <p className="lead">補強・ストレッチ・モビリティ。3Dアニメーションで動きと使う筋肉を確認して、マイメニューに追加できます。</p>
      </header>

      <div style={{ marginTop: 16 }}>
        <SearchInput value={q} onChange={(v) => update('q', v || null)} placeholder="エクササイズ名・筋肉名" label="エクササイズを検索" />
      </div>

      <div className="chips chips--scroll" style={{ marginTop: 10 }} aria-label="部位で絞り込む">
        <button type="button" className={`chip${!region ? ' is-active' : ''}`} aria-pressed={!region} onClick={() => update('region', null)}>
          すべての部位
        </button>
        {REGIONS.map((reg) => (
          <button
            key={reg.id}
            type="button"
            className={`chip${region === reg.id ? ' is-active' : ''}`}
            aria-pressed={region === reg.id}
            onClick={() => update('region', region === reg.id ? null : reg.id)}
          >
            {regionName(reg.id)}
          </button>
        ))}
      </div>

      <div className="filters" style={{ marginTop: 6 }}>
        <label className="sr-only" htmlFor="f-type">
          種類
        </label>
        <select id="f-type" className={`select select--sm${type ? ' select--on' : ''}`} value={type ?? ''} onChange={(e) => update('type', e.target.value || null)}>
          <option value="">種類</option>
          {typeOptions.map((ty) => (
            <option key={ty} value={ty}>
              {EXERCISE_TYPE_JA[ty]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-level">
          レベル
        </label>
        <select id="f-level" className={`select select--sm${level ? ' select--on' : ''}`} value={level ?? ''} onChange={(e) => update('level', e.target.value || null)}>
          <option value="">レベル</option>
          {([1, 2, 3] as const).map((l) => (
            <option key={l} value={l}>
              {`Lv.${l}`}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-equip">
          器具
        </label>
        <select id="f-equip" className={`select select--sm${equip ? ' select--on' : ''}`} value={equip ?? ''} onChange={(e) => update('equip', e.target.value || null)}>
          <option value="">器具</option>
          {equipmentOptions.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, minHeight: 36 }}>
        <span className="small muted">{exercises.length ? `${filtered.length}件` : ''}</span>
        {anyFilter && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            条件をクリア
          </button>
        )}
      </div>

      {exercises.length === 0 ? (
        <EmptyState icon={<IconDumbbell />} title="エクササイズは準備中です" text="エクササイズの解説と3Dアニメーションを作成しています。" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<IconSearch />} title="条件に合うエクササイズがありません" text="条件を減らして探してみてください。" />
      ) : (
        <div className="stack stack--sm" style={{ marginTop: 4 }}>
          {filtered.map((e) => (
            <ExerciseCard
              key={e.id}
              id={e.id}
              extra={
                menu.has(e.id) ? (
                  <span className="badge badge--ok">
                    <IconCheck />
                    メニュー
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </Page>
  );
}
