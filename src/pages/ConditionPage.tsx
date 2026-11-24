import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  getCondition,
  getStructure,
  type Condition,
  type ConditionId,
  type GuideId,
  type Involvement,
  type PainSpotId,
  type PhaseId,
  type RegionId,
  type Side,
} from '../data';
import { regionDiagrams } from '../svg/regions';
import { BottomSheet } from '../components/BottomSheet';
import { DisciplineBadges, EvidenceBadge, RoleBadge } from '../components/badges';
import { ExerciseCard } from '../components/cards';
import {
  DISCIPLINE_ICON,
  IconAlert,
  IconBook,
  IconBulb,
  IconChevron,
  IconFlag,
  IconHand,
  IconLayers,
  IconPlus,
  IconTarget,
} from '../components/icons';
import { Page } from '../components/Layout';
import { RegionFigure, drawnParts, viewForPart, viewForSpot } from '../components/RegionFigure';
import { Bullets, Disclaimer, EmptyState, NameText, PainRuleCallout, Section, Tabs } from '../components/ui';
import { Viewer3DToggle } from '../components/Viewer3D';
import {
  DISCIPLINE_JA,
  DISCIPLINE_ORDER,
  PHASE_JA,
  SIDE_JA,
  STRUCTURE_KIND_JA,
  conditionName,
  guideTitle,
  isKnownCondition,
  isKnownMuscle,
  isKnownSpot,
  isPrimaryRole,
  partName,
  registryConditionRegion,
  regionName,
  spotLabel,
} from '../lib/labels';
import { isFramed } from '../lib/framed';
import { conditionHighlights2d, conditionHighlights3d } from '../lib/viewerHighlights';
import { menuActions } from '../lib/useMenu';
import { useRememberedView } from '../lib/useRememberedView';
import { scrollBehavior } from '../lib/useMedia';
import { toast, toastSaved } from '../lib/toast';
import NotFoundPage from './NotFoundPage';

export default function ConditionPage() {
  const { id = '' } = useParams();
  if (!isKnownCondition(id)) return <NotFoundPage />;
  const c = getCondition(id);
  if (!c) return <ConditionWip id={id} />;
  return <ConditionView key={id} c={c} />;
}

function ConditionWip({ id }: { id: string }) {
  const region = registryConditionRegion(id);
  return (
    <Page title={conditionName(id)} back={region ? `/region/${region}` : '/'}>
      <header className="page-head">
        {region && <span className="kicker">{regionName(region)}</span>}
        <h1>
          <NameText text={conditionName(id)} />
        </h1>
      </header>
      <div style={{ marginTop: 20 }}>
        <EmptyState title="解説を準備中です" text="この障害の詳しい解説・回復プランは現在作成中です。">
          {region && (
            <Link to={`/region/${region}`} className="btn btn--secondary">
              {regionName(region)}のページへ
            </Link>
          )}
        </EmptyState>
      </div>
      <div style={{ marginTop: 16 }}>
        <Disclaimer />
      </div>
    </Page>
  );
}

const PHASE_TAB: Record<PhaseId, string> = PHASE_JA;

/** 「① 痛みを鎮める」: if the tab is too narrow, break only after the number (never 「鎮め / る」). */
function tabLabel(label: string) {
  const i = label.indexOf(' ');
  if (i < 0) return label;
  return (
    <>
      {label.slice(0, i)} <span className="nowrap">{label.slice(i + 1)}</span>
    </>
  );
}

/**
 * Default figure view per condition when the automatic choice (most involved parts) is not the best
 * teaching view — e.g. the Achilles tendon is only a sliver in the ankle's medial view.
 */
const CONDITION_VIEW: Partial<Record<ConditionId, { region: RegionId; view: string }>> = {
  'achilles-midportion': { region: 'ankle', view: 'back' },
  'achilles-insertional': { region: 'ankle', view: 'lateral' },
  'metatarsal-stress-fracture': { region: 'foot', view: 'top' },
  'low-back-pain': { region: 'lowback', view: 'back' },
  'patellofemoral-pain': { region: 'knee', view: 'front' },
  'cyclist-neck-pain': { region: 'neck', view: 'side' },
};

/** How the anatomy section names the red highlight. */
interface RedWording {
  /** section title and its table-of-contents chip */
  title: string;
  /** under the figure (legend) */
  legend: string;
  /** the section intro: 「赤く示したのが◯◯、…」 */
  desc: string;
  /** 3D viewer: button sub text and the short legend next to 閉じる */
  sub3d: string;
  short: string;
  /** zoom button of the 2D figure */
  zoom: string;
  /** badge of the red rows in the list (instead of the role: 「つりやすい」, never 「刺激されている」 where nothing is
   *  damaged); undefined = the role itself */
  badge?: string;
}
const DAMAGED: RedWording = {
  title: 'どこが傷んでいる？',
  legend: '傷んでいる・刺激/圧迫されている',
  desc: '赤く光っているのが痛みの中心になっている組織、オレンジ色で示したのが関係する筋肉・組織です。',
  sub3d: '傷んでいる組織と関係する筋肉を3Dで確認',
  short: '傷んでいる',
  zoom: '傷んでいる部分を拡大',
};
/**
 * Non-specific pain (low back, neck): the content's anatomyNote says nothing is damaged and the red marks the places
 * where pain is felt more easily — never 「傷んでいる」.
 */
const OVERSENSITIVE: RedWording = {
  title: 'どこが痛む？',
  legend: '痛みを感じやすくなっている場所',
  desc: '赤く示したのが痛みを感じやすくなっている場所、オレンジ色で示したのが関係する筋肉・組織です。',
  sub3d: '痛みやすい場所と関係する筋肉を3Dで確認',
  short: '痛みやすい場所',
  zoom: '痛みやすい部分を拡大',
  badge: '痛みやすい',
};
/** Conditions whose anatomyNote gives the red another meaning (it must read the same as the note). */
const RED_WORDING: Partial<Record<ConditionId, RedWording>> = {
  // note: 「赤い部分は、つりやすい筋肉を示しています」 (a cramp is not a damaged muscle)
  'muscle-cramps': {
    title: 'どこがつる？',
    legend: 'つりやすい筋肉',
    desc: '赤く示したのがつりやすい筋肉、オレンジ色で示したのが関係する筋肉です。',
    sub3d: 'つりやすい筋肉と関係する筋肉を3Dで確認',
    short: 'つりやすい筋肉',
    zoom: 'つりやすい筋肉を拡大',
    badge: 'つりやすい',
  },
};

const ROLE_WORD = { injured: '傷んでいる', irritated: '刺激されている', compressed: '圧迫されている' } as const;

/**
 * Tissue damage: name the red by the roles it really has. A kneecap, a bone landmark or a nerve that is only irritated
 * or compressed (patellofemoral pain, ITBS, MTSS, deep gluteal syndrome, Morton's) is never called 「傷んでいる」.
 */
function damagedWording(c: Condition): RedWording {
  const roles = new Set((c.involved ?? []).map((i) => i.role));
  const words = (Object.keys(ROLE_WORD) as (keyof typeof ROLE_WORD)[]).filter((r) => roles.has(r)).map((r) => ROLE_WORD[r]);
  if (!words.length) return DAMAGED;
  const injured = roles.has('injured');
  return {
    ...DAMAGED,
    legend: words.join('・'),
    short: words.length > 2 ? '傷んでいる・刺激/圧迫' : words.join('・'),
    sub3d: injured ? DAMAGED.sub3d : '痛みの中心の組織と関係する筋肉を3Dで確認',
    zoom: injured ? DAMAGED.zoom : '痛みの中心を拡大',
  };
}

function redWording(c: Condition): RedWording {
  return RED_WORDING[c.id] ?? (c.anatomyNote ? OVERSENSITIVE : damagedWording(c));
}

const TOC: { id: string; label: string }[] = [
  { id: 'anatomy', label: 'どこが傷んでいる？' },
  { id: 'what', label: '何が起きている？' },
  { id: 'why', label: 'なぜトライアスロンで？' },
  { id: 'symptoms', label: '症状' },
  { id: 'redflags', label: '受診の目安' },
  { id: 'plan', label: '回復プラン' },
  { id: 'tips', label: '練習の工夫' },
  { id: 'prevention', label: '予防' },
];

function tocHas(c: Condition, id: string): boolean {
  switch (id) {
    case 'what':
      return !!c.whatHappens?.length;
    case 'why':
      return !!c.whyTriathlon?.length;
    case 'plan':
      return !!c.phases?.length;
    case 'tips':
      return !!c.trainingTips?.length;
    case 'prevention':
      return !!c.prevention?.length;
    default:
      return true;
  }
}

function pickRegion(c: Condition, refs: string[]): RegionId {
  let best: RegionId = c.region;
  let bestN = -1;
  const order = [c.region, ...(Object.keys(regionDiagrams) as RegionId[]).filter((r) => r !== c.region)];
  for (const r of order) {
    const d = regionDiagrams[r];
    if (!d) continue;
    const all = new Set(Object.values(d.parts ?? {}).flat() as string[]);
    const n = refs.filter((x) => all.has(x)).length;
    if (n > bestN) {
      best = r;
      bestN = n;
    }
  }
  return best;
}

function ConditionView({ c }: { c: Condition }) {
  const involved = c.involved ?? [];
  const refs = involved.map((i) => i.ref as string);
  // shared with the 3D harness (dev/engine.tsx ?condition=): src/lib/viewerHighlights.ts
  const highlights2d = useMemo(() => conditionHighlights2d(c), [c]);
  const highlights3d = useMemo(() => conditionHighlights3d(c), [c]);
  const override = CONDITION_VIEW[c.id];
  const figRegion = useMemo(() => override?.region ?? pickRegion(c, refs), [c]); // eslint-disable-line react-hooks/exhaustive-deps
  const figView = override && override.region === figRegion ? override.view : undefined;
  const drawn = useMemo(() => drawnParts(figRegion), [figRegion]);
  const figMemo = useRememberedView(`fig:${figRegion}`);
  const primary = involved.filter((i) => isPrimaryRole(i.role));
  const secondary = involved.filter((i) => !isPrimaryRole(i.role));
  const primaryRefs = primary.map((i) => i.ref as string);
  // non-specific pain (low back, neck) and cramps: the content's anatomyNote says nothing is damaged, so the red is
  // named the way the note names it, never 「傷んでいる」; otherwise by the roles it really has
  const red = redWording(c);

  // The selected step lives in the URL (?phase=), so it survives opening an exercise and coming back.
  const [params, setParams] = useSearchParams();
  // Opened from a tapped spot (home sheet / region page): ?spot=<id>&side=<left|right>. The figure opens on the view
  // that has that spot (if it shows the painful tissue), names the side, and the log link records that spot and side.
  const spotParam = params.get('spot');
  const spot = spotParam && isKnownSpot(spotParam) ? (spotParam as PainSpotId) : null;
  const sideParam = params.get('side');
  const side: Side | null = sideParam === 'left' || sideParam === 'right' ? sideParam : null;
  const spotView = useMemo(() => (spot ? viewForSpot(figRegion, spot, refs, primaryRefs, figView) : undefined), [figRegion, spot]); // eslint-disable-line react-hooks/exhaustive-deps
  // 「図で見る」 from a structure's sheet: remount the figure on the view that draws it
  const [figForce, setFigForce] = useState<{ view: string; n: number } | null>(null);
  const [structureSheet, setStructureSheet] = useState<Involvement | null>(null);
  const logSpot = spot ?? c.painSpots[0];
  const logUrl = `/menu?tab=log${logSpot ? `&spot=${logSpot}` : ''}${side ? `&side=${side}` : ''}`;
  const phases = c.phases ?? [];
  const cur = phases.find((p) => p.id === params.get('phase')) ?? phases[0];
  const setPhase = (id: PhaseId) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (id === phases[0]?.id) n.delete('phase');
        else n.set('phase', id);
        return n;
      },
      { replace: true },
    );

  const addPhase = () => {
    if (!cur) return;
    const n = menuActions.addMany(cur.exercises, { condition: c.id, phase: cur.id });
    toastSaved(n ? `${n}種目をマイメニューに追加しました` : 'すでにすべてマイメニューにあります', n > 0);
  };

  return (
    <Page title={c.nameJa} back={`/region/${c.region}`}>
      <header className="page-head">
        <Link to={`/region/${c.region}`} className="kicker kicker--link hit">
          {regionName(c.region)}
        </Link>
        <h1>
          <NameText text={c.nameJa} />
        </h1>
        <p className="page-head__en">{c.nameEn}</p>
        {(c.aka.length > 0 || c.disciplines.length > 0) && (
          <div className="meta-row">
            <DisciplineBadges list={c.disciplines} />
            {c.aka.map((a) => (
              <span key={a} className="badge badge--outline">
                {a}
              </span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <Disclaimer />
        </div>
        <p className="lead" style={{ marginTop: 16, color: 'var(--text)' }}>
          {c.summary}
        </p>
      </header>

      <nav className="toc chips chips--scroll" aria-label="このページの目次">
        {TOC.filter((t) => tocHas(c, t.id)).map((t) => (
          <button
            key={t.id}
            type="button"
            className="chip"
            style={t.id === 'redflags' ? { color: 'var(--danger)' } : undefined}
            onClick={() => document.getElementById(t.id)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })}
          >
            {t.id === 'anatomy' ? red.title : t.label}
          </button>
        ))}
      </nav>

      <Section
        id="anatomy"
        kicker="Anatomy"
        title={red.title}
        desc={red.desc}
      >
        {spot && (
          <p className="figure-ctx">
            <IconTarget />
            <span>
              選んだ場所：{spotLabel(spot)}
              {side && `（${SIDE_JA[side]}）`}
            </span>
          </p>
        )}
        <RegionFigure
          key={figForce?.n ?? 0}
          region={figRegion}
          highlights={highlights2d}
          dimOthers
          preferParts={refs}
          preferPrimary={primaryRefs}
          initialView={figForce?.view ?? figMemo.initialView ?? spotView ?? figView}
          onViewChange={figMemo.onViewChange}
          zoomable
          zoomLabel={red.zoom}
        />
        {side === 'left' && (
          <p className="figure__caption">図は右側を描いています。左側も左右対称の同じつくりです。</p>
        )}
        <div className="legend" style={{ marginTop: 10, paddingLeft: 4 }}>
          <span className="legend__item">
            <span className="dot dot--injured dot--ring" />
            {red.legend}
          </span>
          <span className="legend__item">
            <span className="dot dot--involved" />
            関係している筋肉・要因
          </span>
        </div>
        {c.anatomyNote && (
          <div className="callout callout--note" style={{ marginTop: 10 }}>
            <IconBulb />
            <p>{c.anatomyNote}</p>
          </div>
        )}

        {involved.length > 0 && (
          <div className="card card--flush" style={{ marginTop: 14 }}>
            {[...primary, ...secondary].map((i) => {
              const isMuscle = i.kind === 'muscle' && isKnownMuscle(i.ref);
              // tendons, fascia, bursae, bones, nerves: a sheet with what the structure is (no page of their own)
              const isStructure = !isMuscle && i.kind === 'structure' && !!getStructure(i.ref);
              const inner = (
                <>
                  <span className={`dot involve__dot ${isPrimaryRole(i.role) ? 'dot--injured dot--ring' : 'dot--involved'}`} />
                  <div className="involve__main">
                    <p className="involve__name">
                      {partName(i.ref)}
                      <RoleBadge role={i.role} label={isPrimaryRole(i.role) ? red.badge : undefined} />
                    </p>
                    <p className="involve__note">{i.note}</p>
                    {!drawn.has(i.ref) && (
                      // muscles: the muscle page always shows them in 3D (the condition's 3D close-up may crop them)
                      <p className="involve__hint">{isMuscle ? '上の図の範囲外です（筋肉のページで確認できます）' : '上の図の範囲外です（3Dで確認できます）'}</p>
                    )}
                  </div>
                  {(isMuscle || isStructure) && <IconChevron className="chev" />}
                </>
              );
              return isMuscle ? (
                <Link key={i.ref} to={`/muscle/${i.ref}`} className="involve">
                  {inner}
                </Link>
              ) : isStructure ? (
                <button key={i.ref} type="button" className="involve" aria-haspopup="dialog" onClick={() => setStructureSheet(i)}>
                  {inner}
                </button>
              ) : (
                <div key={i.ref} className="involve">
                  {inner}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <Viewer3DToggle
            highlights={highlights3d}
            condition={c.id}
            focus={c.region}
            sub={red.sub3d}
            legend={
              <span className="legend" style={{ margin: 0 }}>
                <span className="legend__item">
                  <span className="dot dot--injured" />
                  {red.short}
                </span>
                <span className="legend__item">
                  <span className="dot dot--involved" />
                  関係
                </span>
              </span>
            }
          />
        </div>
      </Section>

      {c.whatHappens?.length > 0 && (
        <Section id="what" kicker="What happens" title="からだの中で何が起きている？">
          <div className="card card--lg prose">
            {c.whatHappens.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Section>
      )}

      {c.whyTriathlon?.length > 0 && (
        <Section id="why" kicker="Why triathlon" title="なぜトライアスロンで起こる？">
          <div className="stack">
            {DISCIPLINE_ORDER.flatMap((d) => c.whyTriathlon.filter((w) => w.discipline === d)).map((w, i) => {
              const Icon = DISCIPLINE_ICON[w.discipline];
              return (
                <div key={i} className={`disc-card disc-card--${w.discipline}`}>
                  <p className="disc-card__head">
                    <Icon />
                    {DISCIPLINE_JA[w.discipline]}
                  </p>
                  <p className="disc-card__body">{w.text}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section id="symptoms" kicker="Symptoms" title="よくある症状と痛みの出方">
        <div className="card">
          <h3 className="phase__label" style={{ marginTop: 0 }}>
            症状
          </h3>
          <Bullets items={c.symptoms} />
          {c.patterns?.length > 0 && (
            <>
              <h3 className="phase__label">痛みの出方・タイミング</h3>
              <Bullets items={c.patterns} color="var(--bike)" />
            </>
          )}
        </div>
      </Section>

      {c.selfChecks?.length > 0 && (
        <Section kicker="Self check" title="セルフチェック" desc="無理のない範囲で。強い痛みが出る動きは行わないでください。">
          <div className="card card--flush">
            {c.selfChecks.map((s, i) => (
              <div key={i} className="check-card">
                <p className="check-card__name" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <IconHand style={{ width: 18, height: 18, color: 'var(--accent)', flex: 'none' }} />
                  {s.name}
                </p>
                <p>
                  <span className="check-card__k">やり方</span>
                  {s.how}
                </p>
                <p>
                  <span className="check-card__k">わかること</span>
                  {s.suggests}
                </p>
                {s.caution && (
                  <div className="callout callout--note" style={{ marginTop: 10, padding: '10px 12px' }}>
                    <IconAlert />
                    <p className="small">{s.caution}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section id="redflags" kicker="Red flags" title="受診の目安">
        <div className="redflags" role="note" aria-label="受診の目安">
          <p className="redflags__head">
            <IconAlert />
            こんなときは早めに医療機関へ
          </p>
          <p className="redflags__lead">セルフケアより先に、整形外科・スポーツ整形外科の受診を検討してください。</p>
          {c.redFlags?.length ? (
            <Bullets items={c.redFlags} />
          ) : (
            <Bullets items={['安静にしていても強く痛む・夜間に痛む', '腫れ・熱感・赤みが強い', 'しびれや力が入らない感じがある', '体重をかけられない']} />
          )}
          {c.seeDoctorNote && <p className="redflags__note">{c.seeDoctorNote}</p>}
          <p className="redflags__note" style={{ borderTop: 0, paddingTop: 0 }}>
            <Link to="/guide/red-flags" className="link">
              すぐに受診すべきサインを詳しく
            </Link>
          </p>
        </div>
      </Section>

      {c.differentials?.length > 0 && (
        <Section kicker="Differentials" title="似ている別の痛み" desc="場所が近くても原因が違うことがあります。">
          <div className="card card--flush">
            <ul className="rows">
              {c.differentials.map((d, i) => {
                const body = (
                  <>
                    <div className="row__main">
                      <p className="row__title">{d.name}</p>
                      <p className="row__sub">{d.hint}</p>
                    </div>
                    {d.conditionId && <IconChevron className="chev" />}
                  </>
                );
                return (
                  <li key={i}>
                    {d.conditionId && isKnownCondition(d.conditionId) ? (
                      <Link to={`/condition/${d.conditionId}`} className="row">
                        {body}
                      </Link>
                    ) : (
                      <div className="row">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>
      )}

      {phases.length > 0 && cur && (
        <Section id="plan" kicker="Recovery plan" title="回復プラン（3ステップ）" desc="今の状態に合うステップから。痛みのルールを守りながら進めます。">
          <div className="card" style={{ paddingTop: 4 }}>
            <Tabs
              idBase="phase"
              label="回復のステップ"
              value={cur.id}
              onChange={setPhase}
              options={phases.map((p) => ({ id: p.id, label: tabLabel(PHASE_TAB[p.id] ?? p.title) }))}
            />
            <div id="phase-panel" role="tabpanel" aria-labelledby={`phase-tab-${cur.id}`} className="phase">
              <h3>{cur.title}</h3>
              <div className="phase__goal" style={{ marginTop: 10 }}>
                <IconTarget />
                <span>{cur.goal}</span>
              </div>
              {cur.guidance?.length > 0 && (
                <>
                  <p className="phase__label">ポイント</p>
                  <Bullets items={cur.guidance} />
                </>
              )}
              {cur.id === 'build' && <GuideLink id="strength-basics" sub="回数・重さ・頻度の決め方、腱の運動は1日おき" />}
              {cur.id === 'return' && c.disciplines.includes('run') && (
                <GuideLink id="return-to-run" sub="歩きとジョグを交互に行う段階表と、進め方の目安" />
              )}
              {cur.exercises?.length > 0 && (
                <>
                  <p className="phase__label">エクササイズ（この順番で）</p>
                  <div className="stack stack--sm">
                    {cur.exercises.map((e) => (
                      <ExerciseCard key={e} id={e} search={`?from=${c.id}&phase=${cur.id}`} />
                    ))}
                  </div>
                  <button type="button" className="btn btn--primary btn--block" style={{ marginTop: 14 }} onClick={addPhase}>
                    <IconPlus />
                    このステップをマイメニューに追加
                  </button>
                </>
              )}
              {cur.progressWhen?.length > 0 && (
                <>
                  <p className="phase__label">{cur.id === 'return' ? '競技復帰の目安' : '次のステップに進む目安'}</p>
                  <Bullets items={cur.progressWhen} check />
                </>
              )}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <PainRuleCallout text={c.painRule} />
          </div>
        </Section>
      )}

      {c.trainingTips?.length > 0 && (
        <Section id="tips" kicker="Training tips" title="練習の工夫">
          <div className="stack">
            {DISCIPLINE_ORDER.flatMap((d) => c.trainingTips.filter((t) => t.discipline === d)).map((t, i) => {
              const Icon = DISCIPLINE_ICON[t.discipline];
              return (
                <div key={i} className={`disc-card disc-card--${t.discipline}`}>
                  <p className="disc-card__head">
                    <Icon />
                    {DISCIPLINE_JA[t.discipline]}
                  </p>
                  <Bullets items={t.tips} />
                  {t.discipline === 'bike' && <GuideLink id="bike-fit" sub="サドルの高さ・前後、クリート、ハンドル位置の合わせ方" />}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {c.prevention?.length > 0 && (
        <Section id="prevention" kicker="Prevention" title="予防のために">
          <div className="card">
            <Bullets items={c.prevention} check />
          </div>
        </Section>
      )}

      {c.evidence?.length > 0 && (
        <Section kicker="Evidence" title="根拠の強さ" desc="研究でどの程度支持されているかの目安です。">
          <div className="card card--flush">
            {c.evidence.map((e, i) => (
              <div key={i} className="evidence">
                <EvidenceBadge level={e.level} />
                <p>{e.note}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {c.references?.length > 0 && (
        <Section kicker="References" title="参考文献">
          <ol className="refs">
            {c.references.map((r, i) => (
              <li key={i}>{r.url ? <RefLink label={r.label} url={r.url} /> : r.label}</li>
            ))}
          </ol>
        </Section>
      )}

      <div className="callout" style={{ marginTop: 32 }}>
        <IconBulb />
        <p className="small">
          痛みを記録すると、良くなっているかを客観的に確認できます。{' '}
          <Link to={logUrl} className="link">
            痛みを記録する
          </Link>
        </p>
      </div>
      <p className="footer-note">
        <IconFlag style={{ width: 14, height: 14, display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
        この情報は一般的な教育目的です。診断ではありません。
        <Link to="/about">免責事項</Link>
      </p>

      <BottomSheet
        open={!!structureSheet}
        onClose={() => setStructureSheet(null)}
        label={structureSheet ? partName(structureSheet.ref) : ''}
        header={structureSheet && <StructureSheetHeader i={structureSheet} />}
      >
        {structureSheet && (
          <StructureSheetBody
            i={structureSheet}
            badge={isPrimaryRole(structureSheet.role) ? red.badge : undefined}
            view={viewForPart(figRegion, structureSheet.ref)}
            onShow={(view) => {
              setStructureSheet(null);
              setFigForce((f) => ({ view, n: (f?.n ?? 0) + 1 }));
              // after the sheet has closed and given the page its scroll back
              setTimeout(() => document.getElementById('anatomy')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }), 360);
            }}
          />
        )}
      </BottomSheet>
    </Page>
  );
}

function StructureSheetHeader({ i }: { i: Involvement }) {
  const st = getStructure(i.ref);
  return (
    <>
      <span className="kicker">{st ? (STRUCTURE_KIND_JA[st.kind] ?? st.kind) : '組織'}</span>
      <h2 style={{ marginTop: 2 }}>{partName(i.ref)}</h2>
      {st?.kana && <p className="tiny" style={{ marginTop: 0 }}>{st.kana}</p>}
    </>
  );
}

function StructureSheetBody({
  i,
  badge,
  view,
  onShow,
}: {
  i: Involvement;
  badge?: string;
  view: string | undefined;
  onShow: (view: string) => void;
}) {
  const st = getStructure(i.ref);
  return (
    <div>
      <p style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <RoleBadge role={i.role} label={badge} />
      </p>
      {st?.description && <p style={{ marginTop: 12, fontSize: 15 }}>{st.description}</p>}
      {i.note && (
        <div className="callout callout--note" style={{ marginTop: 12 }}>
          <IconBulb />
          <p className="small">
            <strong>この障害では：</strong>
            {i.note}
          </p>
        </div>
      )}
      {view ? (
        <button type="button" className="btn btn--secondary btn--block" style={{ marginTop: 16 }} onClick={() => onShow(view)}>
          <IconLayers />
          図でこの部分を見る
        </button>
      ) : (
        <p className="tiny" style={{ marginTop: 16 }}>
          上の図の範囲外です。「3Dで見る」で位置を確認できます。
        </p>
      )}
    </div>
  );
}

/** A guide that explains how to do what the plan asks (walk-run restart, bike position, strength dosing). */
function GuideLink({ id, sub }: { id: GuideId; sub: string }) {
  return (
    <Link to={`/guide/${id}`} className="guide-link">
      <IconBook />
      <span className="grow">
        <span className="guide-link__title">{guideTitle(id)}</span>
        <span className="guide-link__sub">{sub}</span>
      </span>
      <IconChevron className="chev" />
    </Link>
  );
}

/**
 * A reference link. In a sandboxed preview (the single file inside an iframe) a new window cannot open, so the URL is
 * shown as selectable text with a copy button instead of a link that silently does nothing.
 */
function RefLink({ label, url }: { label: string; url: string }) {
  if (!isFramed()) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="link">
        {label}
      </a>
    );
  }
  const copy = () => {
    try {
      void navigator.clipboard
        .writeText(url)
        .then(() => toastSaved('URLをコピーしました'))
        .catch(() => toast('コピーできませんでした。URLを長押しして選択してください'));
    } catch {
      toast('コピーできませんでした。URLを長押しして選択してください');
    }
  };
  return (
    <>
      {label}
      <span className="ref-url">
        <span className="ref-url__text">{url}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>
          URLをコピー
        </button>
      </span>
    </>
  );
}
