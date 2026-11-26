// The typed visual blocks of a learning guide's sections (src/data/types.ts GuideBlock): a 2D region figure, a 3D view
// (tap to load), exercise cards with 「この〇種目をマイメニューに追加」, muscle and condition cards.
//
// Teaching colours, never the condition colours: a guide figure is not about damaged tissue, so nothing is red.
//   2D: focus → 'selected' (the part at full strength with a bold outline and a bold name; the kits' 'muscle' role is
//       a vivid red and is not used), related → 'involved' (amber); everything else is faded (dimOthers).
//   3D: focus → 'primary' (muscle colour), related → 'secondary' (light muscle colour). A condition's scene is shown
//       with its painful tissue as 'primary' and the contributing parts as 'secondary', not in red.
// The figures mount only when they come near the screen, and the 3D viewer only after a tap, so a long guide opens fast.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCondition,
  getExercise,
  getMuscle,
  type GuideBlock,
  type GuideHighlight,
  type GuideHighlights,
  type GuideId,
  type MuscleId,
  type StructureId,
} from '../data';
import type { Highlights, HighlightRole } from '../svg/types';
import type { Highlight3DRole } from '../three';
import { conditionHighlights3d } from '../lib/viewerHighlights';
import { exerciseName, muscleName } from '../lib/labels';
import { menuActions } from '../lib/useMenu';
import { toastSaved } from '../lib/toast';
import { ConditionCard, ExerciseCard, MuscleCard } from './cards';
import { ErrorBoundary } from './ErrorBoundary';
import { IconChevron, IconLayers, IconPlus } from './icons';
import { RegionFigure } from './RegionFigure';
import { getRegionDiagram } from '../svg/regions';
import { Viewer3DToggle } from './Viewer3D';

type PartId = MuscleId | StructureId;
type FigureBlock = Extract<GuideBlock, { kind: 'figure' }>;
type ViewerBlock = Extract<GuideBlock, { kind: 'viewer3d' }>;
type ExercisesBlock = Extract<GuideBlock, { kind: 'exercises' }>;

/** 2D role of a guide highlight (no red: see the file comment). */
export const FIGURE_ROLE: Record<GuideHighlight, HighlightRole> = { focus: 'selected', related: 'involved' };
/** 3D role of a guide highlight. */
export const VIEWER_ROLE: Record<GuideHighlight, Highlight3DRole> = { focus: 'primary', related: 'secondary' };

export function figureHighlights(h: GuideHighlights): Highlights {
  const out: Highlights = {};
  for (const [id, r] of Object.entries(h) as [PartId, GuideHighlight][]) out[id] = FIGURE_ROLE[r];
  return out;
}

export function viewerHighlights(h: GuideHighlights): Partial<Record<PartId, Highlight3DRole>> {
  const out: Partial<Record<PartId, Highlight3DRole>> = {};
  // focus parts first: the engine frames and labels in this order
  const entries = Object.entries(h) as [PartId, GuideHighlight][];
  for (const [id, r] of [...entries.filter(([, r]) => r === 'focus'), ...entries.filter(([, r]) => r !== 'focus')]) out[id] = VIEWER_ROLE[r];
  return out;
}

/** A condition's 3D teaching view: its scene, the painful tissue in muscle colour, the contributing parts light. */
export function conditionTeachingHighlights(id: string): Partial<Record<PartId, Highlight3DRole>> {
  const c = getCondition(id);
  if (!c) return {};
  const out: Partial<Record<PartId, Highlight3DRole>> = {};
  for (const [ref, role] of Object.entries(conditionHighlights3d(c)) as [PartId, Highlight3DRole][])
    out[ref] = role === 'injured' ? 'primary' : 'secondary';
  return out;
}

/** The one source of a 3D block (the contract allows exactly one; validate.ts reports any other count). */
export function viewerSource(b: ViewerBlock): 'exercise' | 'muscle' | 'condition' | 'highlights' | null {
  const set = [
    b.exercise && 'exercise',
    b.muscle && 'muscle',
    b.condition && 'condition',
    b.highlights && Object.keys(b.highlights).length > 0 && 'highlights',
  ].filter(Boolean) as ('exercise' | 'muscle' | 'condition' | 'highlights')[];
  return set.length === 1 ? set[0] : null;
}

export default function GuideBlocks({
  guide,
  blocks,
  notes,
  eager = false,
}: {
  guide: GuideId;
  blocks: GuideBlock[];
  /** a line of the section's text that describes an exercise list, by the list's title (「動かす：毎日でも…」) */
  notes?: Partial<Record<string, string>>;
  /** mount every figure now (the page is about to jump to a section further down: no layout shift on the way) */
  eager?: boolean;
}) {
  return (
    <div className="guide-blocks">
      {blocks.map((b, i) => (
        <ErrorBoundary key={i} resetKey={b.kind} fallback={<BlockFallback />}>
          <Block guide={guide} b={b} notes={notes} eager={eager} />
        </ErrorBoundary>
      ))}
    </div>
  );
}

function Block({ guide, b, notes, eager }: { guide: GuideId; b: GuideBlock; notes?: Partial<Record<string, string>>; eager: boolean }) {
  switch (b.kind) {
    case 'figure':
      return <GuideFigure b={b} eager={eager} />;
    case 'viewer3d':
      return <GuideViewer b={b} />;
    case 'exercises':
      return <GuideExercises guide={guide} b={b} note={b.title ? notes?.[b.title] : undefined} />;
    case 'muscles':
      return (
        <div>
          <p className="guide-blocks__label">筋肉のページで、起始・停止や鍛え方を見る</p>
          <div className="stack stack--sm">
            {b.ids.map((m) => (
              <MuscleCard key={m} id={m} />
            ))}
          </div>
        </div>
      );
    case 'conditions':
      return (
        <div>
          <p className="guide-blocks__label">関係する痛み・障害のページ</p>
          <div className="stack stack--sm">
            {b.ids.map((c) => (
              <ConditionCard key={c} id={c} />
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

function BlockFallback() {
  return (
    <div className="placeholder guide-blocks__fail" role="status">
      <div>
        <IconLayers />
        <strong>この図を表示できませんでした</strong>
        <span className="small">本文の説明でご確認ください。</span>
      </div>
    </div>
  );
}

/** true once the element has come within ~1.5 screens of the viewport (or at once: `eager`, no IntersectionObserver). */
function useNearScreen(eager: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(() => eager || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (near) return;
    if (eager) return setNear(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '900px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, eager]);
  return { ref, near };
}

function GuideFigure({ b, eager }: { b: FigureBlock; eager: boolean }) {
  const { ref, near } = useNearScreen(eager);
  const ids = Object.keys(b.highlights);
  const focus = ids.filter((id) => b.highlights[id as PartId] === 'focus');
  const roles = new Set(Object.values(b.highlights));
  const [hl] = useState(() => figureHighlights(b.highlights));
  // the caption describes the block's own view: while the diagram does not have that view (yet), the figure opens on
  // the view that shows the parts best, and a caption about another view would describe the wrong drawing
  const hasView = !!getRegionDiagram(b.region)?.views.some((v) => v.id === b.view);
  return (
    <figure className="guide-fig" ref={ref}>
      {near ? (
        <RegionFigure
          region={b.region}
          highlights={hl}
          dimOthers
          initialView={b.view}
          // a view the diagram does not have (yet): open on the one that shows these parts best
          preferParts={ids}
          preferPrimary={focus}
        />
      ) : (
        <div className="figure guide-fig__ph" aria-hidden="true" />
      )}
      <div className="legend guide-legend">
        {roles.has('focus') && (
          <span className="legend__item">
            <span className="dot dot--focus" />
            注目する部分（太い輪郭）
          </span>
        )}
        {roles.has('related') && (
          <span className="legend__item">
            <span className="dot dot--involved" />
            関係する部分
          </span>
        )}
      </div>
      {b.caption && hasView && <figcaption className="guide-fig__cap">{b.caption}</figcaption>}
    </figure>
  );
}

function GuideViewer({ b }: { b: ViewerBlock }) {
  const src = viewerSource(b);
  const [condHl] = useState(() => (b.condition ? conditionTeachingHighlights(b.condition) : {}));
  const [hl] = useState(() => (b.highlights ? viewerHighlights(b.highlights) : {}));
  if (src === 'exercise' && b.exercise) {
    const ex = getExercise(b.exercise);
    return (
      <Viewer3DToggle
        exercise={b.exercise}
        focus={ex?.regions[0]}
        title="動きを3Dで見る"
        sub={b.sub ?? `「${exerciseName(b.exercise)}」の動きを再生します（タップで読み込み）`}
        legend={
          <span className="legend guide-legend" style={{ margin: 0 }}>
            <span className="legend__item">
              <span className="dot dot--muscle" />
              主に使う筋肉
            </span>
            {!!ex?.secondary.length && (
              <span className="legend__item">
                <span className="dot dot--soft" />
                補助
              </span>
            )}
          </span>
        }
      />
    );
  }
  if (src === 'muscle' && b.muscle) {
    const m = getMuscle(b.muscle);
    return (
      <Viewer3DToggle
        muscle={b.muscle}
        focus={m?.regions[0]}
        title="筋肉の動きを3Dで見る"
        sub={b.sub ?? `${muscleName(b.muscle)}が縮む・伸びる動きです（タップで読み込み）`}
        legend={
          <Link to={`/muscle/${b.muscle}`} className="viewer-frame__link">
            {muscleName(b.muscle).replace(/[（(][^）)]*[）)]/g, '')}のページへ
            <IconChevron />
          </Link>
        }
      />
    );
  }
  if (src === 'condition' && b.condition) {
    const c = getCondition(b.condition);
    const hasSecondary = Object.values(condHl).includes('secondary');
    return (
      <Viewer3DToggle
        condition={b.condition}
        highlights={condHl}
        focus={c?.region}
        sub={b.sub ?? '負担がかかる部分と関係する筋肉を3Dで確認（タップで読み込み）'}
        legend={
          <span className="legend guide-legend" style={{ margin: 0 }}>
            <span className="legend__item">
              <span className="dot dot--muscle" />
              負担がかかる部分
            </span>
            {hasSecondary && (
              <span className="legend__item">
                <span className="dot dot--soft" />
                関係
              </span>
            )}
          </span>
        }
      />
    );
  }
  if (src === 'highlights' && b.highlights) {
    const roles = new Set(Object.values(b.highlights));
    return (
      <Viewer3DToggle
        highlights={hl}
        focus={b.focus}
        sub={b.sub ?? '図の筋肉を3Dで確認（タップで読み込み）'}
        legend={
          <span className="legend guide-legend" style={{ margin: 0 }}>
            {roles.has('focus') && (
              <span className="legend__item">
                <span className="dot dot--muscle" />
                注目
              </span>
            )}
            {roles.has('related') && (
              <span className="legend__item">
                <span className="dot dot--soft" />
                関係
              </span>
            )}
          </span>
        }
      />
    );
  }
  return null;
}

function GuideExercises({ guide, b, note }: { guide: GuideId; b: ExercisesBlock; note?: string }) {
  const n = b.ids.length;
  const add = () => {
    const added = menuActions.addMany(b.ids, { guide });
    toastSaved(added ? `${added}種目をマイメニューに追加しました` : 'すでにすべてマイメニューにあります', added > 0);
  };
  return (
    <div className="card guide-ex">
      {b.title && <h3 className="guide-ex__title">{b.title}</h3>}
      {note && <p className="guide-ex__note">{note}</p>}
      <div className="stack stack--sm" style={{ marginTop: b.title || note ? 12 : 0 }}>
        {b.ids.map((e) => (
          // the exercise's own (default) dose: a guide sets no doses of its own
          <ExerciseCard key={e} id={e} />
        ))}
      </div>
      {b.addToMenu && n > 0 && (
        <button type="button" className="btn btn--primary btn--block" style={{ marginTop: 14 }} onClick={add}>
          <IconPlus />
          この{n}種目をマイメニューに追加
        </button>
      )}
    </div>
  );
}
