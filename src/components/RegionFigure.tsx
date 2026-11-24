// Wrapper around a region diagram (src/svg/regions): view tabs, best-view selection, graceful fallback.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { MuscleId, PainSpotId, RegionId, StructureId } from '../data';
import { PREFERRED_VIEW, getRegionDiagram, regionDiagrams } from '../svg/regions';
import type { Highlights, RegionDiagram } from '../svg/types';
import { regionName } from '../lib/labels';
import { ErrorBoundary } from './ErrorBoundary';
import { IconLayers, IconSearch } from './icons';
import { Segmented } from './ui';

function safeDiagram(region: RegionId): RegionDiagram | undefined {
  try {
    const d = getRegionDiagram(region);
    if (d && Array.isArray(d.views) && d.views.length && d.Component) return d;
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * View id that shows `ids` best (falls back to the first view). Ids in `primary` (the injured tissue)
 * count three times as much as the others. Only ids drawn in the view's main figure score; ties go to the view
 * with more primary ids, then to the one that also shows more ids in a locator inset, then view order.
 */
export function bestView(d: RegionDiagram, ids: string[], primary: string[] = []): string {
  let best = d.views[0]?.id;
  let bestKey = [-1, -1, -1];
  for (const v of d.views) {
    const parts = mainParts(d, v.id);
    const all = (d.parts?.[v.id] ?? []) as string[];
    const p = ids.filter((id) => primary.includes(id) && parts.includes(id)).length;
    const n = ids.filter((id) => !primary.includes(id) && parts.includes(id)).length;
    const key = [3 * p + n, p, ids.filter((id) => all.includes(id)).length];
    const better = key.findIndex((x, i) => x !== bestKey[i]);
    if (better >= 0 && key[better] > bestKey[better]) {
      best = v.id;
      bestKey = key;
    }
  }
  return best;
}

/** Ids a view draws in its main figure (not only in a small locator inset). */
function mainParts(d: RegionDiagram, view: string): string[] {
  const inset = (d.insetParts?.[view] ?? []) as string[];
  return ((d.parts?.[view] ?? []) as string[]).filter((id) => !inset.includes(id));
}

/** Does this view draw any of the highlighted ids? */
function viewHas(d: RegionDiagram, view: string, ids: string[]): boolean {
  const parts = (d.parts?.[view] ?? []) as string[];
  return ids.some((id) => parts.includes(id));
}

/** All ids drawn in any view of a region diagram. */
export function drawnParts(region: RegionId): Set<string> {
  const d = safeDiagram(region);
  return new Set(Object.values(d?.parts ?? {}).flat() as string[]);
}

/** View id that has hotspots for `spot`. */
function viewWithSpot(d: RegionDiagram, spot: string): string | undefined {
  return d.views.find((v) => ((d.spots?.[v.id] ?? []) as string[]).includes(spot))?.id;
}

/** Find a region diagram (preferring `regions` order) with a view whose parts include `id`. */
export function findDiagramFor(id: string, prefer: RegionId[] = []): { region: RegionId; view: string } | null {
  // the illustration owners' choice of the view that shows this part best
  const pv = PREFERRED_VIEW[id as MuscleId | StructureId];
  if (pv && ((safeDiagram(pv.region)?.parts?.[pv.view] ?? []) as string[]).includes(id)) return pv;
  const order = [...prefer, ...(Object.keys(regionDiagrams) as RegionId[]).filter((r) => !prefer.includes(r))];
  // first a view that draws it in the main figure, then one that has it only in an inset
  for (const pick of [mainParts, (d: RegionDiagram, v: string) => (d.parts?.[v] ?? []) as string[]]) {
    for (const r of order) {
      const d = safeDiagram(r);
      if (!d) continue;
      const v = d.views.find((v) => pick(d, v.id).includes(id));
      if (v) return { region: r, view: v.id };
    }
  }
  return null;
}

export function RegionFigure({
  region,
  highlights,
  dimOthers,
  showSpots,
  showLabels,
  selectedSpot,
  onSpotSelect,
  onPartSelect,
  preferParts,
  preferPrimary,
  initialView,
  onViewChange,
  caption,
  footer,
  zoomable,
  zoomLabel = '傷んでいる部分を拡大',
  diagram: diagramOverride,
}: {
  region: RegionId;
  /** Use this diagram instead of the registered one (dev harness / tests). */
  diagram?: RegionDiagram;
  highlights?: Highlights;
  dimOthers?: boolean;
  showSpots?: boolean;
  showLabels?: boolean;
  selectedSpot?: PainSpotId | null;
  onSpotSelect?: (id: PainSpotId) => void;
  onPartSelect?: (id: MuscleId | StructureId) => void;
  /** Pick the view containing most of these part ids. */
  preferParts?: string[];
  /** Of `preferParts`, the ones that matter most (injured tissue) — weighted when picking the view. */
  preferPrimary?: string[];
  initialView?: string;
  /** Called when the shown view changes (tabs, spot selection), e.g. to remember it for Back. */
  onViewChange?: (view: string) => void;
  /** Offer a 「拡大」 button when the 'injured' parts are small in the current view. */
  zoomable?: boolean;
  /** Text of that button: what the red parts are (「つりやすい筋肉を拡大」 where nothing is damaged). */
  zoomLabel?: string;
  caption?: ReactNode;
  footer?: ReactNode;
}) {
  const diagram = useMemo(() => diagramOverride ?? safeDiagram(region), [region, diagramOverride]);
  const initial = useMemo(() => {
    if (!diagram) return '';
    if (initialView && diagram.views.some((v) => v.id === initialView)) return initialView;
    if (preferParts?.length) return bestView(diagram, preferParts, preferPrimary);
    return diagram.views[0].id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram]);
  const [view, setViewState] = useState(initial);
  const setView = (v: string) => {
    setViewState(v);
    onViewChange?.(v);
  };
  const current = diagram?.views.some((v) => v.id === view) ? view : initial;

  // When a spot is selected from outside (e.g. a chip) and it's not on this view, switch to a view that has it.
  useEffect(() => {
    if (!diagram || !selectedSpot) return;
    const onCurrent = ((diagram.spots?.[current] ?? []) as string[]).includes(selectedSpot);
    const other = viewWithSpot(diagram, selectedSpot);
    if (!onCurrent && other) setView(other);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpot, diagram]);
  const shown = current;

  // ── which views actually show the highlighted parts ──
  const hiIds = useMemo(() => Object.keys(highlights ?? {}), [highlights]);
  const markViews = !!diagram && dimOthers && hiIds.length > 0 && diagram.views.some((v) => !viewHas(diagram, v.id, hiIds));
  const emptyHere = !!diagram && dimOthers && hiIds.length > 0 && !viewHas(diagram, shown, hiIds);
  const viewWithHi = diagram && emptyHere ? diagram.views.find((v) => viewHas(diagram, v.id, hiIds))?.id : undefined;

  // ── zoom onto small injured parts ──
  const figRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  /** Box of the injured parts (x…h) and of the parts plus their labels (u*), in unzoomed canvas px. */
  const [focusBox, setFocusBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    ux: number;
    uy: number;
    uw: number;
    uh: number;
    cw: number;
    ch: number;
  } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const injuredIds = useMemo(
    () => Object.entries(highlights ?? {}).filter(([, r]) => r === 'injured').map(([id]) => id),
    [highlights],
  );
  useEffect(() => setZoomed(false), [shown]);
  useLayoutEffect(() => {
    if (!zoomable || !injuredIds.length) return setFocusBox(null);
    const measure = () => {
      const wrap = zoomRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas) return;
      const wr = wrap.getBoundingClientRect();
      const scale = wr.width / Math.max(1, canvas.clientWidth) || 1;
      const box = (els: Element[]) => {
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) continue;
          x0 = Math.min(x0, (r.left - wr.left) / scale);
          y0 = Math.min(y0, (r.top - wr.top) / scale);
          x1 = Math.max(x1, (r.right - wr.left) / scale);
          y1 = Math.max(y1, (r.bottom - wr.top) / scale);
        }
        return { x0, y0, x1, y1 };
      };
      const parts = injuredIds.flatMap((id) => [...wrap.querySelectorAll(`[data-part="${CSS.escape(id)}"]`)]);
      // the diagrams mark the labels of highlighted parts (…is-hl is-injured); keep them in the zoomed frame too
      const labels = [...wrap.querySelectorAll('.is-hl.is-injured text')];
      const b = box(parts);
      const u = box([...parts, ...labels]);
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (!Number.isFinite(b.x0) || !cw || !ch) return setFocusBox(null);
      setFocusBox({
        x: b.x0,
        y: b.y0,
        w: b.x1 - b.x0,
        h: b.y1 - b.y0,
        ux: Math.max(0, u.x0),
        uy: Math.max(0, u.y0),
        uw: Math.min(cw, u.x1) - Math.max(0, u.x0),
        uh: Math.min(ch, u.y1) - Math.max(0, u.y0),
        cw,
        ch,
      });
    };
    measure();
    const t = setTimeout(measure, 300); // diagrams may settle (fonts / labels) after the first paint
    // the box is in canvas px: measure again when the canvas changes size (rotation, window resize, wrapping)
    let raf = 0;
    let last = '';
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            const c = canvasRef.current;
            const size = c ? `${c.clientWidth}x${c.clientHeight}` : '';
            if (size === last) return;
            last = size;
            if (!raf)
              raf = requestAnimationFrame(() => {
                raf = 0;
                measure();
              });
          })
        : null;
    if (ro && canvasRef.current) {
      last = `${canvasRef.current.clientWidth}x${canvasRef.current.clientHeight}`;
      ro.observe(canvasRef.current);
    }
    return () => {
      clearTimeout(t);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [zoomable, injuredIds, shown, region]);
  // only worth it when the injured tissue covers a small part of the figure
  const small = !!focusBox && focusBox.w * focusBox.h < 0.06 * focusBox.cw * focusBox.ch && Math.max(focusBox.w / focusBox.cw, focusBox.h / focusBox.ch) < 0.4;
  let zoomStyle: CSSProperties | undefined;
  if (zoomed && focusBox && small) {
    // the injured tissue fills ~40% of the frame; zoom less if that would cut off its labels (min 1.5×)
    const f = focusBox;
    const s = Math.max(
      1.5,
      Math.min(2, (0.4 * f.cw) / Math.max(1, f.w), (0.4 * f.ch) / Math.max(1, f.h), (0.96 * f.cw) / Math.max(1, f.uw), (0.96 * f.ch) / Math.max(1, f.uh)),
    );
    // centre on the parts + labels when they fit at this scale, otherwise on the parts
    const fitsU = f.uw * s <= f.cw && f.uh * s <= f.ch;
    const cx = fitsU ? f.ux + f.uw / 2 : f.x + f.w / 2;
    const cy = fitsU ? f.uy + f.uh / 2 : f.y + f.h / 2;
    const tx = Math.min(0, Math.max(focusBox.cw - s * focusBox.cw, focusBox.cw / 2 - s * cx));
    const ty = Math.min(0, Math.max(focusBox.ch - s * focusBox.ch, focusBox.ch / 2 - s * cy));
    zoomStyle = { transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(3)})` };
  }

  if (!diagram) {
    return (
      <div className="figure">
        <div className="placeholder">
          <div>
            <IconLayers />
            <strong>{regionName(region)}の図解は準備中です</strong>
            <span className="small">解剖図を作成しています。もうしばらくお待ちください。</span>
          </div>
        </div>
        {footer}
      </div>
    );
  }

  const C = diagram.Component;
  return (
    <div className="figure" ref={figRef}>
      {diagram.views.length > 1 && (
        <div className="figure__tabs">
          <Segmented
            small
            label="図の向き"
            value={shown}
            options={diagram.views.map((v) => ({
              id: v.id,
              label:
                markViews && viewHas(diagram, v.id, hiIds) ? (
                  <>
                    <span className="seg__mark" aria-hidden="true" />
                    {v.label}
                    <span className="sr-only">（強調した部分あり）</span>
                  </>
                ) : (
                  v.label
                ),
            }))}
            onChange={setView}
          />
        </div>
      )}
      <div className={`figure__canvas${zoomed && zoomStyle ? ' is-zoomed' : ''}`} ref={canvasRef}>
        <div className="figure__zoom" ref={zoomRef} style={zoomStyle}>
          <ErrorBoundary resetKey={`${region}:${shown}`}>
            <C
              view={shown}
              highlights={highlights}
              dimOthers={dimOthers}
              showLabels={showLabels ?? true}
              showSpots={showSpots}
              selectedSpot={selectedSpot ?? null}
              onSpotSelect={onSpotSelect}
              onPartSelect={onPartSelect}
            />
          </ErrorBoundary>
        </div>
        {emptyHere && (
          <div className="figure__empty" role="note">
            <p>この向きの図には描かれていません</p>
            {viewWithHi && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  setView(viewWithHi);
                  // the button disappears with the note: keep keyboard focus on the (now selected) view tab
                  setTimeout(() => figRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus(), 0);
                }}
              >
                見える向きに切り替える
              </button>
            )}
          </div>
        )}
      </div>
      {zoomable && small && !emptyHere && (
        <div className="figure__tools">
          <button type="button" className="figure__zoom-btn" aria-pressed={zoomed} onClick={() => setZoomed((z) => !z)}>
            <IconSearch />
            {zoomed ? '全体を表示' : zoomLabel}
          </button>
        </div>
      )}
      {/* a caption about the tappable spots only makes sense on a view that has some */}
      {caption && (!showSpots || ((diagram.spots?.[shown] ?? []) as string[]).length > 0) && (
        <p className="figure__caption">{caption}</p>
      )}
      {footer}
    </div>
  );
}
