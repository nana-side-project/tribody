import { useDeferredValue, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { REGIONS, muscles, type RegionId } from '../data';
import { MuscleCard } from '../components/cards';
import { IconMuscle, IconSearch } from '../components/icons';
import { Page } from '../components/Layout';
import { EmptyState, SearchInput } from '../components/ui';
import { muscleName, regionName } from '../lib/labels';
import { muscleScores, queryTerms } from '../lib/search';
import { useUrlSearchText } from '../lib/useUrlSearchText';

export default function MusclesPage() {
  const [params, setParams] = useSearchParams();
  const search = useUrlSearchText('q');
  const q = useDeferredValue(search.text);
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

  const searching = queryTerms(q).length > 0;
  const filtered = useMemo(() => {
    const scores = muscleScores(q);
    const list = muscles
      .map((m, i) => ({ m, i, score: scores.get(m.id) ?? 0 }))
      .filter((x) => x.score > 0 && (!region || x.m.regions.includes(region)));
    // searching: best match first (name > group / part > region / related condition > description)
    if (searching) list.sort((a, b) => b.score - a.score || a.i - b.i);
    return list.map((x) => x.m);
  }, [q, region, searching]);

  // Group by primary region (first listed) unless filtered to one region. Muscles that also belong to a
  // region (listed second) are shown there as compact links, so the group total matches the chip count.
  const groups = useMemo(() => {
    if (region) return [{ region, list: filtered, also: [] as typeof filtered }];
    const gs = REGIONS.map((reg) => ({
      region: reg.id as RegionId,
      list: filtered.filter((m) => m.regions[0] === reg.id),
      also: filtered.filter((m) => m.regions[0] !== reg.id && m.regions.includes(reg.id as RegionId)),
    })).filter((g) => g.list.length || g.also.length);
    if (!searching) return gs;
    // searching: the group with the best match first (filtered is ranked, so its first muscle is the best one). A
    // muscle listed in a group as 「ほかの部位の筋肉」 counts too, just after one of its own (アキレス: the 足首・アキレス腱
    // group, which shows the calf muscles, comes before 股関節・お尻)
    const rank = (g: (typeof gs)[number]) => {
      const i = filtered.findIndex((m) => g.list.includes(m));
      const j = filtered.findIndex((m) => g.also.includes(m));
      return Math.min(i < 0 ? Infinity : i, j < 0 ? Infinity : j + 0.5);
    };
    return [...gs].sort((a, b) => rank(a) - rank(b));
  }, [filtered, region, searching]);

  const counts = useMemo(() => {
    const c: Partial<Record<RegionId, number>> = {};
    for (const m of muscles) for (const reg of m.regions) c[reg] = (c[reg] ?? 0) + 1;
    return c;
  }, []);

  return (
    <Page title="筋肉図鑑">
      <header className="page-head">
        <span aria-hidden="true" lang="en" className="kicker">Muscles</span>
        <h1>筋肉図鑑</h1>
        <p className="lead">起始（どこから始まり）・停止（どこに付着し）・作用（どう動かすか）を、3Dの収縮・伸張アニメーションで確認できます。</p>
      </header>

      <div style={{ marginTop: 16 }}>
        <SearchInput
          value={search.text}
          onChange={search.setText}
          inputProps={search.inputProps}
          placeholder="筋肉名・ひらがな・部位・障害名"
          label="筋肉を検索"
        />
      </div>
      <div className="chips chips--scroll" style={{ marginTop: 10 }} aria-label="部位で絞り込む" role="group">
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
                <span className="tiny">{g.list.length + g.also.length}</span>
              </div>
              <div className="stack stack--sm">
                {g.list.map((m) => (
                  <MuscleCard key={m.id} id={m.id} />
                ))}
              </div>
              {g.also.length > 0 && (
                <div className="also">
                  <p className="tiny" style={{ fontWeight: 700 }}>
                    {g.list.length ? 'ほかの部位にも載っている筋肉' : 'ほかの部位に載っている筋肉'}
                  </p>
                  <div className="chips" style={{ marginTop: 6 }}>
                    {g.also.map((m) => (
                      <Link key={m.id} to={`/muscle/${m.id}`} className="chip">
                        {muscleName(m.id)}
                        <span className="chip__count">{regionName(m.regions[0])}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </Page>
  );
}
