import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REGIONS, muscles, type RegionId } from '../data';
import { MuscleCard } from '../components/cards';
import { IconMuscle, IconSearch } from '../components/icons';
import { Page } from '../components/Layout';
import { EmptyState, SearchInput } from '../components/ui';
import { regionName } from '../lib/labels';
import { matches } from '../lib/search';

export default function MusclesPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const r = params.get('region');
  const region = REGIONS.some((x) => x.id === r) ? (r as RegionId) : null;

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

  const filtered = useMemo(
    () =>
      muscles.filter(
        (m) =>
          (!region || m.regions.includes(region)) &&
          matches(q, [m.nameJa, m.kana, m.nameEn, m.group, ...(m.parts ?? []).map((p) => p.nameJa)]),
      ),
    [q, region],
  );

  // Group by primary region (first listed) unless filtered to one region.
  const groups = useMemo(() => {
    if (region) return [{ region, list: filtered }];
    return REGIONS.map((reg) => ({
      region: reg.id as RegionId,
      list: filtered.filter((m) => m.regions[0] === reg.id),
    })).filter((g) => g.list.length);
  }, [filtered, region]);

  const counts = useMemo(() => {
    const c: Partial<Record<RegionId, number>> = {};
    for (const m of muscles) for (const reg of m.regions) c[reg] = (c[reg] ?? 0) + 1;
    return c;
  }, []);

  return (
    <Page title="筋肉図鑑">
      <header className="page-head">
        <span className="kicker">Muscles</span>
        <h1>筋肉図鑑</h1>
        <p className="lead">起始（どこから始まり）・停止（どこに付着し）・作用（どう動かすか）を、3Dの収縮・伸張アニメーションで確認できます。</p>
      </header>

      <div style={{ marginTop: 16 }}>
        <SearchInput value={q} onChange={(v) => update('q', v || null)} placeholder="筋肉名・ひらがな・英語名" label="筋肉を検索" />
      </div>
      <div className="chips chips--scroll" style={{ marginTop: 10 }} aria-label="部位で絞り込む">
        <button type="button" className={`chip${!region ? ' is-active' : ''}`} aria-pressed={!region} onClick={() => update('region', null)}>
          すべて
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
            {counts[reg.id as RegionId] ? <span className="chip__count">{counts[reg.id as RegionId]}</span> : null}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
        {muscles.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <EmptyState icon={<IconMuscle />} title="筋肉図鑑は準備中です" text="筋肉の解説を作成しています。もうしばらくお待ちください。" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <EmptyState icon={<IconSearch />} title="該当する筋肉がありません" text="条件を変えて探してみてください。" />
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.region} className="section--tight" style={{ marginTop: 22 }}>
              <div className="section__head-row" style={{ marginBottom: 10 }}>
                <h2 style={{ fontSize: 16 }}>{regionName(g.region)}</h2>
                <span className="tiny">{g.list.length}</span>
              </div>
              <div className="stack stack--sm">
                {g.list.map((m) => (
                  <MuscleCard key={m.id} id={m.id} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </Page>
  );
}
