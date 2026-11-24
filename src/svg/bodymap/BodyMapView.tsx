// Body map renderer (front / back / sole) with tappable pain-spot hotspots.
// `src/svg/BodyMap.tsx` re-exports this with the public BodyMapProps contract; the extra
// props here are for the dev harness and optional UI features (labels, debug hit areas).
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as RPointerEvent,
} from 'react';
import type { PainSpotId } from '../../data/registry';
import type { BodyMapProps } from '../types';
import { CX, FIG_H, FIG_W, buildFigure } from './figure';
import { SOLE, buildSole, solePt } from './sole';
import { SIDE_JA, placeSpots, spotAriaLabel, type PlacedSpot, type Side } from './spots';
import './bodymap.css';

export interface BodyMapViewProps extends BodyMapProps {
  /** Draw every hotspot's name with a leader line (dev harness / "名前を表示"). Widens the canvas. */
  showLabels?: boolean;
  /** Visualise the invisible hit circles. */
  debugHits?: boolean;
  /** Which side of `selectedSpot` to emphasise. Defaults to the side last tapped, else both. */
  selectedSide?: Side | null;
  /** Show a small chooser when a tap lands between several hotspots (default true). */
  disambiguate?: boolean;
  /** Dev only: override the viewBox ("x y w h") to inspect details. */
  debugViewBox?: string;
}

/** Hit radius in CSS px → 44 px tap targets. */
const HIT_PX = 22;
/**
 * Tapping the body (away from any hotspot) selects the nearest hotspot within this radius — capped
 * in figure units too, so a smaller rendered map (short phones) doesn't snap e.g. a mid-thigh tap to
 * the groin; farther taps get the 「この場所の解説はまだありません」 popover instead.
 */
const BODY_PX = 40;
const BODY_UNITS = 70;
/** The nearest hotspot wins outright if it is clearly closer than the runner-up. */
const CLEAR_WIN = 0.7;
const LABEL_PAD = 290;
/**
 * Visible canvas per view. The sole view is shorter; at 740 units its rendered box is the same
 * as the figure views' on phones (both hit the max-height cap), so switching views doesn't jump.
 */
const VIEWPORT = { front: [0, FIG_H], back: [0, FIG_H], sole: [150, 740] } as const;
/** Marker geometry in CSS px (markers are drawn in a group scaled by 1/pxPerUnit). */
const MARK = { dot: 3.8, dotActive: 4.3, dotSelected: 5, halo: 7.6, pulse: 6.4 };

const VIEW_NAME = { front: 'からだの前面', back: 'からだの背面', sole: '足の裏' } as const;

/** Heat tint for a 0–10 pain intensity: amber (mild) → orange → red (severe). */
export function heatColor(v: number): string {
  const t = Math.max(0, Math.min(1, v / 10));
  const h = 42 - 40 * t;
  const s = 90 - 8 * t;
  const l = 56 - 6 * t;
  return `hsl(${h.toFixed(1)} ${s.toFixed(0)}% ${l.toFixed(0)}%)`;
}

interface Chooser {
  left: number;
  top: number;
  above: boolean;
  items: PlacedSpot[];
  /** A tap on the body away from every hotspot: explain and offer the nearest ones. */
  miss?: boolean;
}

/** Nearest-first hotspots around a canvas point, with distances in CSS px. */
function rankSpots(spots: PlacedSpot[], x: number, y: number, scale: number) {
  return spots.map((s) => ({ s, d: Math.hypot(s.x - x, s.y - y) * scale })).sort((a, b) => a.d - b.d);
}

export default function BodyMapView(props: BodyMapViewProps) {
  const {
    view,
    activeSpots,
    selectedSpot,
    onSelect,
    intensity,
    className,
    showLabels = false,
    debugHits = false,
    selectedSide,
    disambiguate = true,
    debugViewBox,
  } = props;

  const rawId = useId();
  const uid = 'tbm' + rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [pxPerUnit, setPxPerUnit] = useState(0.57);
  const [lastPick, setLastPick] = useState<{ id: PainSpotId; side: Side } | null>(null);
  const [chooser, setChooser] = useState<Chooser | null>(null);
  /** Hotspot under the mouse (hover is computed with the same nearest-spot rule as taps). */
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const art = useMemo(() => (view === 'sole' ? buildSole() : buildFigure(view)), [view]);
  const spots = useMemo(() => placeSpots(view), [view]);

  const vbX = showLabels ? -LABEL_PAD : 0;
  const vbW = FIG_W + (showLabels ? 2 * LABEL_PAD : 0);
  const [vbY, vbH] = VIEWPORT[view];

  // measure the rendered scale so hit circles are always ≥ 44 CSS px
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const r = svg.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setPxPerUnit(Math.min(r.width / vbW, r.height / vbH));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [vbW, vbH]);

  // close the chooser on view change / outside tap / Escape
  useEffect(() => setChooser(null), [view]);
  useEffect(() => {
    if (!chooser) return;
    const onDown = (e: PointerEvent) => {
      const el = wrapRef.current?.querySelector('.tb-chooser');
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setChooser(null);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setChooser(null);
    };
    // defer so the tap that opened it doesn't close it
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [chooser]);
  useEffect(() => {
    if (chooser) wrapRef.current?.querySelector<HTMLButtonElement>('.tb-chooser button')?.focus({ preventScroll: true });
  }, [chooser]);

  const pick = useCallback(
    (s: PlacedSpot) => {
      setChooser(null);
      setLastPick({ id: s.id, side: s.side });
      // focus the picked hotspot, so a sheet opened by onSelect returns focus to it when closed
      try {
        svgRef.current?.querySelector<SVGGElement>(`.tb-spots [data-key="${s.key}"]`)?.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
      onSelect?.(s.id, s.side);
    },
    [onSelect],
  );

  const toCanvas = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y, scale: Math.hypot(ctm.a, ctm.b) || pxPerUnit };
  };

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'mouse') return;
    const c = toCanvas(e.clientX, e.clientY);
    if (!c) return;
    const near = rankSpots(spots, c.x, c.y, c.scale)[0];
    const key = near && near.d <= HIT_PX ? near.s.key : null;
    if (key !== hoverKey) setHoverKey(key);
  };

  const onSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const target = e.target as Element;
    // keyboard / assistive-tech activation of a hotspot element
    const spotEl = target.closest?.('[data-spot]');
    if (e.detail === 0 && spotEl) {
      const s = spots.find((p) => p.key === spotEl.getAttribute('data-key'));
      if (s) pick(s);
      return;
    }
    const c = toCanvas(e.clientX, e.clientY);
    if (!c) return;
    const ranked = rankSpots(spots, c.x, c.y, c.scale);
    const near = ranked.filter((r) => r.d <= HIT_PX);
    const wrap = wrapRef.current;
    const place = () => {
      const wr = wrap!.getBoundingClientRect();
      const x = e.clientX - wr.left;
      const y = e.clientY - wr.top;
      const cardW = Math.min(300, wr.width - 16);
      const left = Math.max(8, Math.min(wr.width - cardW - 8, x - cardW / 2));
      const above = y > wr.height * 0.6;
      return { left, top: above ? y - 20 : y + 20, above };
    };
    if (near.length === 0) {
      const onBody = !!target.closest?.('[data-body]');
      if (onBody && ranked[0] && ranked[0].d <= Math.min(BODY_PX, BODY_UNITS * c.scale)) pick(ranked[0].s);
      else if (onBody && wrap && disambiguate) {
        // a tap on the body with no hotspot nearby: say so and offer the nearest places
        const seen = new Set<string>();
        const items = ranked
          .filter((r) => (seen.has(r.s.id) ? false : (seen.add(r.s.id), true)))
          .slice(0, 2)
          .map((r) => r.s);
        setChooser({ ...place(), items, miss: true });
      } else setChooser(null);
      return;
    }
    const limit = Math.max(near[0].d * 2.2, 12);
    const close = near.filter((r) => r.d <= limit);
    // one spot drawn as a left/right pair close together (neck, low back): no need to ask
    const sameSpot = close.every((r) => r.s.id === close[0].s.id);
    if (near.length === 1 || !disambiguate || sameSpot || near[0].d <= near[1].d * CLEAR_WIN) {
      pick(near[0].s);
      return;
    }
    // ambiguous tap between several hotspots → let the user choose
    if (!wrap) return pick(near[0].s);
    setChooser({ ...place(), items: close.slice(0, 4).map((r) => r.s) });
  };

  const onSpotKey = (e: KeyboardEvent<SVGGElement>, s: PlacedSpot) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(s);
    }
  };

  const k = 1 / pxPerUnit;
  const active = useMemo(() => new Set(activeSpots ?? []), [activeSpots]);
  const emphasisSide: Side | 'both' | null = selectedSpot
    ? selectedSide !== undefined && selectedSide !== null
      ? selectedSide
      : lastPick && lastPick.id === selectedSpot
        ? lastPick.side
        : 'both'
    : null;
  const isSelected = (s: PlacedSpot) =>
    !!selectedSpot && s.id === selectedSpot && (emphasisSide === 'both' || emphasisSide === s.side);

  const heatSpots = intensity
    ? spots.filter((s) => {
        const v = intensity[s.id];
        return typeof v === 'number' && v > 0;
      })
    : [];
  const heatIds = [...new Set(heatSpots.map((s) => s.id))];

  const markerTransform = (s: PlacedSpot) => `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) scale(${k.toFixed(4)})`;
  const heatFill = (id: PainSpotId) => {
    const v = intensity?.[id];
    return typeof v === 'number' && v > 0 ? { fill: heatColor(v) } : undefined;
  };

  return (
    <div ref={wrapRef} className={`tb-bodymap${debugHits ? ' tb-debug' : ''}${className ? ' ' + className : ''}`}>
      <svg
        ref={svgRef}
        viewBox={debugViewBox ?? `${vbX} ${vbY} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={`${VIEW_NAME[view]}の図。痛む場所を選んでください`}
        onClick={onSvgClick}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverKey(null)}
        style={hoverKey ? { cursor: 'pointer' } : undefined}
      >
        <defs>
          <filter
            id={`${uid}-shade`}
            x="-3%"
            y="-3%"
            width="106%"
            height="106%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="blur" />
            <feComposite in="SourceAlpha" in2="blur" operator="out" result="rim" />
            <feFlood className="tb-shade-flood" result="flood" />
            <feComposite in="flood" in2="rim" operator="in" result="shade" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="shade" />
            </feMerge>
          </filter>
          <clipPath id={`${uid}-clip`}>
            {art.body.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </clipPath>
          {heatIds.map((id) => {
            const c = heatColor(intensity?.[id] ?? 0);
            const t = Math.min(1, (intensity?.[id] ?? 0) / 10);
            const o = 0.42 + 0.4 * t;
            return (
              <radialGradient key={id} id={`${uid}-heat-${id}`}>
                <stop offset="0" stopColor={c} stopOpacity={o} />
                <stop offset="0.5" stopColor={c} stopOpacity={o * 0.5} />
                <stop offset="1" stopColor={c} stopOpacity={0} />
              </radialGradient>
            );
          })}
        </defs>

        {view !== 'sole' && <ellipse className="tb-ground" cx={CX} cy={992} rx={120} ry={7} />}

        <g className="tb-outline" aria-hidden="true">
          {art.body.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g className="tb-fill" filter={`url(#${uid}-shade)`} aria-hidden="true">
          {art.body.map((d, i) => (
            <path key={i} d={d} data-body="" />
          ))}
        </g>
        <g className="tb-contours" aria-hidden="true" pointerEvents="none">
          {art.contours.map((c, i) => (
            <path key={i} d={c.d} className={c.faint ? 'is-faint' : undefined} />
          ))}
        </g>
        {art.loops.length > 0 && (
          <g className="tb-loops" aria-hidden="true" pointerEvents="none">
            {art.loops.map((c, i) => (
              <path key={i} d={c.d} className={c.faint ? 'is-faint' : undefined} />
            ))}
          </g>
        )}

        {heatSpots.length > 0 && (
          <g className="tb-heat" clipPath={`url(#${uid}-clip)`} aria-hidden="true">
            {heatSpots.map((s) => {
              const t = Math.min(1, (intensity?.[s.id] ?? 0) / 10);
              return <circle key={s.key} cx={s.x} cy={s.y} r={24 + 20 * t} fill={`url(#${uid}-heat-${s.id})`} />;
            })}
          </g>
        )}

        <ViewCaptions view={view} />

        {/* stable DOM order (keeps keyboard focus); the selected marker is redrawn in the overlay below */}
        <g className="tb-spots">
          {spots.map((s) => {
            const sel = isSelected(s);
            const act = active.has(s.id);
            const v = intensity?.[s.id];
            const heat = typeof v === 'number' && v > 0;
            const cand = !!chooser?.items.some((c) => c.key === s.key);
            const hov = hoverKey === s.key;
            const cls = `tb-spot${act ? ' is-active' : ''}${sel ? ' is-selected' : ''}${heat ? ' is-heat' : ''}${cand ? ' is-candidate' : ''}${hov ? ' is-hover' : ''}`;
            const dotR = sel ? MARK.dotSelected : act || heat ? MARK.dotActive : MARK.dot;
            return (
              <g
                key={s.key}
                className={cls}
                transform={markerTransform(s)}
                role="button"
                tabIndex={0}
                aria-label={spotAriaLabel(s)}
                aria-pressed={sel}
                data-spot={s.id}
                data-side={s.side}
                data-key={s.key}
                onKeyDown={(e) => onSpotKey(e, s)}
              >
                <title>{spotAriaLabel(s)}</title>
                <circle className="tb-spot-hit" r={HIT_PX} />
                <circle className="tb-spot-halo" r={MARK.halo} />
                <circle className="tb-spot-focus" r={MARK.halo + 2.5} />
                <circle className="tb-spot-dot" r={dotR} style={heatFill(s.id)} />
              </g>
            );
          })}
        </g>
        <g className="tb-spots-overlay" aria-hidden="true" pointerEvents="none">
          {spots.filter(isSelected).map((s) => (
            <g key={s.key} className="tb-spot is-selected" transform={markerTransform(s)}>
              <circle className="tb-spot-pulse" r={MARK.pulse} />
              <circle className="tb-spot-pulse is-delayed" r={MARK.pulse} />
              <circle className="tb-spot-dot" r={MARK.dotSelected} style={heatFill(s.id)} />
            </g>
          ))}
        </g>

        {showLabels && <SpotLabels spots={spots} />}
      </svg>

      {chooser && (
        <div
          className="tb-chooser"
          role="dialog"
          aria-label={chooser.miss ? 'この場所の解説はまだありません' : '痛む場所を選ぶ'}
          style={{
            left: chooser.left,
            top: chooser.top,
            transform: chooser.above ? 'translateY(-100%)' : undefined,
          }}
        >
          <div className="tb-chooser-title">
            {chooser.miss ? (
              <>
                この場所の解説はまだありません。
                <br />
                近い場所：
              </>
            ) : (
              'どこが痛みますか？'
            )}
          </div>
          {chooser.items.map((s) => (
            <button key={s.key} type="button" onClick={() => pick(s)} aria-label={spotAriaLabel(s)}>
              <span className="tb-chooser-dot" aria-hidden="true" />
              <span>{s.label}</span>
              <span className="tb-chooser-side">{SIDE_JA[s.side]}</span>
            </button>
          ))}
          {chooser.miss && (
            <button type="button" className="tb-chooser-close" onClick={() => setChooser(null)}>
              閉じる
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ViewCaptions({ view }: { view: BodyMapProps['view'] }) {
  if (view === 'sole') {
    const [rx, ry] = solePt('right', 0.02, -0.07);
    const [lx] = solePt('left', 0.02, -0.07);
    return (
      <g aria-hidden="true" pointerEvents="none">
        <text className="tb-caption" x={CX} y={SOLE.heelY - SOLE.L - 34} textAnchor="middle">
          足の裏（下から見た図）
        </text>
        <SideChip x={rx} y={ry} text="右足" />
        <SideChip x={lx} y={ry} text="左足" />
      </g>
    );
  }
  // front: the figure's right is on the viewer's left
  const leftText = view === 'front' ? '右' : '左';
  const rightText = view === 'front' ? '左' : '右';
  return (
    <g aria-hidden="true" pointerEvents="none">
      <SideChip x={CX - 168} y={958} text={leftText} />
      <SideChip x={CX + 168} y={958} text={rightText} />
    </g>
  );
}

function SideChip({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length > 1 ? 62 : 38;
  return (
    <g>
      <rect className="tb-side-chip" x={x - w / 2} y={y - 17} width={w} height={34} rx={17} />
      <text className="tb-side-label" x={x} y={y + 7.5} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

function SpotLabels({ spots }: { spots: PlacedSpot[] }) {
  const GAP = 21;
  const cols: { left: boolean; items: PlacedSpot[] }[] = [
    { left: true, items: spots.filter((s) => s.x < CX).sort((a, b) => a.y - b.y) },
    { left: false, items: spots.filter((s) => s.x >= CX).sort((a, b) => a.y - b.y) },
  ];
  return (
    <g aria-hidden="true" pointerEvents="none">
      {cols.map(({ left, items }) => {
        // stack labels top→bottom with a minimum gap
        const ys: number[] = [];
        items.forEach((s, i) => ys.push(Math.max(s.y, i ? ys[i - 1] + GAP : 30)));
        // pull back up if we ran past the bottom
        for (let i = ys.length - 1; i >= 0; i--) {
          const maxY = i === ys.length - 1 ? FIG_H - 12 : ys[i + 1] - GAP;
          ys[i] = Math.min(ys[i], maxY);
        }
        const tx = left ? -14 : FIG_W + 14;
        return items.map((s, i) => {
          const y = ys[i];
          const elbowX = left ? Math.min(s.x - 16, 2) : Math.max(s.x + 16, FIG_W - 2);
          return (
            <g key={s.key}>
              <polyline className="tb-label-line" points={`${tx + (left ? 4 : -4)},${y - 5} ${elbowX},${y - 5} ${s.x},${s.y}`} />
              <text className="tb-label-text" x={tx} y={y} textAnchor={left ? 'end' : 'start'}>
                {left ? (
                  <>
                    <tspan className="tb-label-side">{SIDE_JA[s.side]} </tspan>
                    {s.label}
                  </>
                ) : (
                  <>
                    {s.label}
                    <tspan className="tb-label-side"> {SIDE_JA[s.side]}</tspan>
                  </>
                )}
              </text>
            </g>
          );
        });
      })}
    </g>
  );
}
