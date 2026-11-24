import { useDeferredValue, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { REGIONS, conditionsUsingExercise, exercises, getMuscle, type ExerciseType, type RegionId } from '../data';
import { ExerciseCard } from '../components/cards';
import { IconCheck, IconDumbbell, IconSearch } from '../components/icons';
import { Page } from '../components/Layout';
import { EmptyState, SearchInput } from '../components/ui';
import {
  EQUIPMENT_TAGS,
  EXERCISE_TYPE_HINT_JA,
  EXERCISE_TYPE_JA,
  LEVEL_JA,
  equipmentTags,
  muscleName,
  regionName,
  type EquipmentTag,
} from '../lib/labels';
import { exerciseScores, queryTerms } from '../lib/search';
import { useMenu } from '../lib/useMenu';
import { useUrlSearchText } from '../lib/useUrlSearchText';

const TYPES = Object.keys(EXERCISE_TYPE_JA) as ExerciseType[];
/** Selected-value forms that fit the narrow select. */
const TYPE_SHORT: Partial<Record<ExerciseType, string>> = { isometric: 'アイソメ', plyometric: 'プライオ', 'nerve-glide': '神経滑走' };

const INDEX = exercises.map((e) => ({ e, tags: equipmentTags(e) }));

export default function ExercisesPage() {
  const [params, setParams] = useSearchParams();
  const menu = useMenu();
  const search = useUrlSearchText('q');
  const q = useDeferredValue(search.text);
  const r = params.get('region');
  const region = REGIONS.some((x) => x.id === r) ? (r as RegionId) : null;
  const t = params.get('type');
  const type = TYPES.includes(t as ExerciseType) ? (t as ExerciseType) : null;
  const lv = Number(params.get('level'));
  const level = lv === 1 || lv === 2 || lv === 3 ? lv : null;
  const eq = params.get('equip');
  const equip = EQUIPMENT_TAGS.some((x) => x.id === eq) ? (eq as EquipmentTag) : null;

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

  const equipmentOptions = useMemo(
    () =>
      EQUIPMENT_TAGS.map((tag) => ({ ...tag, n: INDEX.filter((x) => x.tags.includes(tag.id)).length })).filter((x) => x.n > 0),
    [],
  );
  const typeOptions = useMemo(() => TYPES.filter((ty) => exercises.some((e) => e.type === ty)), []);

  const filtered = useMemo(() => {
    const searching = queryTerms(q).length > 0;
    const scores = exerciseScores(q);
    const out = INDEX.filter(
      (x) =>
        (!region || x.e.regions.includes(region)) &&
        (!type || x.e.type === type) &&
        (!level || x.e.level === level) &&
        (!equip || x.tags.includes(equip)),
    )
      .map((x, i) => ({ e: x.e, i, score: scores.get(x.e.id) ?? 0 }))
      .filter((x) => x.score > 0);
    // best match first (name > target muscle / region / condition > description, see lib/search); original order otherwise
    if (searching) out.sort((a, b) => b.score - a.score || a.i - b.i);
    return out.map((x) => x.e);
  }, [q, region, type, level, equip]);

  const anyFilter = !!(search.text || region || type || level || equip);

  return (
    <Page title="エクササイズ">
      <header className="page-head">
        <span className="kicker">Exercise library</span>
        <h1>エクササイズ</h1>
        <p className="lead">補強・ストレッチ・モビリティ。3Dアニメーションで動きと使う筋肉を確認して、マイメニューに追加できます。</p>
      </header>

      <div style={{ marginTop: 16 }}>
        <SearchInput
          value={search.text}
          onChange={search.setText}
          inputProps={search.inputProps}
          placeholder="名前・筋肉・部位・障害名"
          label="エクササイズを検索"
        />
      </div>

      <div className="chips chips--scroll" style={{ marginTop: 10 }} aria-label="部位で絞り込む" role="group">
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

      {/* the selected option shows a short form so it fits the narrow select; the list shows the long one */}
      <div className="filters" style={{ marginTop: 6 }}>
        <div className="filter">
          <label className="filter__label" htmlFor="f-type">
            種類
          </label>
          <select id="f-type" className={`select select--sm${type ? ' select--on' : ''}`} value={type ?? ''} onChange={(e) => update('type', e.target.value || null)}>
            <option value="">すべて</option>
            {typeOptions.map((ty) => (
              <option key={ty} value={ty}>
                {ty === type ? (TYPE_SHORT[ty] ?? EXERCISE_TYPE_JA[ty]) : (EXERCISE_TYPE_HINT_JA[ty] ?? EXERCISE_TYPE_JA[ty])}
              </option>
            ))}
          </select>
        </div>
        <div className="filter">
          <label className="filter__label" htmlFor="f-level">
            レベル
          </label>
          <select id="f-level" className={`select select--sm${level ? ' select--on' : ''}`} value={level ?? ''} onChange={(e) => update('level', e.target.value || null)}>
            <option value="">すべて</option>
            {([1, 2, 3] as const).map((l) => (
              <option key={l} value={l}>
                {l === level ? `Lv.${l}` : LEVEL_JA[l]}
              </option>
            ))}
          </select>
        </div>
        <div className="filter">
          <label className="filter__label" htmlFor="f-equip">
            器具
          </label>
          <select id="f-equip" className={`select select--sm${equip ? ' select--on' : ''}`} value={equip ?? ''} onChange={(e) => update('equip', e.target.value || null)}>
            <option value="">すべて</option>
            {equipmentOptions.map((x) => (
              <option key={x.id} value={x.id}>
                {x.id === equip ? x.short : `${x.label}（${x.n}）`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, minHeight: 44 }}>
        <span className="small muted" aria-live="polite">
          {exercises.length ? `${filtered.length}件` : ''}
        </span>
        {anyFilter && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              search.reset();
              setParams(new URLSearchParams(), { replace: true });
            }}
          >
            条件をクリア
          </button>
        )}
      </div>

      {exercises.length === 0 ? (
        <EmptyState icon={<IconDumbbell />} title="エクササイズは準備中です" text="エクササイズの解説と3Dアニメーションを作成しています。" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<IconSearch />} title="条件に合うエクササイズがありません" text="条件を減らすか、別のことば（部位名・障害名・ひらがな）で探してみてください。" />
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
