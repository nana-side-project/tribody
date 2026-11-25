// Wrapper around a region diagram (src/svg/regions): view tabs, best-view selection, graceful fallback.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ConditionId, MuscleId, PainSpotId, RegionId, StructureId } from '../data';
import { PREFERRED_VIEW, getRegionDiagram, regionDiagrams } from '../svg/regions';
import type { Highlights, RegionDiagram } from '../svg/types';
import { regionName } from '../lib/labels';
import { ErrorBoundary } from './ErrorBoundary';
import { IconLayers, IconSearch } from './icons';
import { Segmented } from './ui';

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A label the zoom would cut, drawn again at the frame edge (canvas px, unscaled). */
interface Relabel {
  key: string;
  /** colour of the original label: injured-zone rest, amber (involved), highlighted, plain or faded context */
  tone: 'zrest' | 'involved' | 'hl' | 'plain' | 'ctx';
  lines: string[];
  /** text start (left) and first baseline */
  x: number;
  y: number;
  /** leader: from the anchor on the part to the text */
  ax: number;
  ay: number;
  lx: number;
  ly: number;
}
const RELABEL_MAX = 8;
/** px: the diagrams' own labels are 13.25 user units ≈ 12.2 px on a 390 px phone */
const RELABEL_FS = 12;
const RELABEL_LH = 14;
/** Width of a label line in px (full-width glyphs ≈ 1 em, ASCII ≈ 0.6 em). */
const textWidth = (s: string) => [...s].reduce((n, c) => n + (c.charCodeAt(0) < 0x80 ? 0.6 : 1), 0) * RELABEL_FS;

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

/**
 * The view to open a condition's figure on when the user came from a tapped spot: the figure's usual view
 * (`preferred`, else the view showing most of `ids`) if it has a hotspot for `spot`; otherwise, of the views that have
 * one, the one that shows the most of `ids` (primary weighted, as bestView). Undefined when no view with that spot
 * draws any of the primary parts — the usual teaching view is better then.
 */
export function viewForSpot(region: RegionId, spot: string, ids: string[], primary: string[] = [], preferred?: string): string | undefined {
  const d = safeDiagram(region);
  if (!d) return undefined;
  const hasSpot = (v: string) => ((d.spots?.[v] ?? []) as string[]).includes(spot);
  const usual = preferred && d.views.some((v) => v.id === preferred) ? preferred : bestView(d, ids, primary);
  if (usual && hasSpot(usual)) return usual;
  const withSpot = d.views.filter((v) => hasSpot(v.id));
  if (!withSpot.length) return undefined;
  const v = bestView({ ...d, views: withSpot }, ids, primary);
  const shown = (d.parts?.[v] ?? []) as string[];
  return primary.some((id) => shown.includes(id)) ? v : undefined;
}

/** The view of `region`'s diagram that draws `id` (in the main figure if possible), or undefined. */
export function viewForPart(region: RegionId, id: string): string | undefined {
  const d = safeDiagram(region);
  if (!d) return undefined;
  const pv = PREFERRED_VIEW[id as MuscleId | StructureId];
  if (pv && pv.region === region && ((d.parts?.[pv.view] ?? []) as string[]).includes(id)) return pv.view;
  return (d.views.find((v) => mainParts(d, v.id).includes(id)) ?? d.views.find((v) => ((d.parts?.[v.id] ?? []) as string[]).includes(id)))?.id;
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
  condition,
  side,
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
  /** Condition page: the condition the highlights belong to (the diagram draws its exact lesion zone). */
  condition?: ConditionId;
  /** Condition page: the side the user tapped; 'left' draws the limb as the left side (mirrored, texts say 左). */
  side?: 'left' | 'right';
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
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (!cw || !ch) return setFocusBox(null);
      const isSmall = (b: { x0: number; y0: number; x1: number; y1: number }) => {
        const w = b.x1 - b.x0;
        const h = b.y1 - b.y0;
        return Number.isFinite(w) && w * h < 0.06 * cw * ch && Math.max(w / cw, h / ch) < 0.4;
      };
      // An injured part drawn with its focal lesion zone (the diagram's `is-zoned` part: a stretch of the Achilles
      // tendon, the plantar fascia origin, a stress-fracture spot) counts by its zone only, so the zoom frames the
      // lesion, not the whole tendon or bone. Parts without a zone count whole.
      const partsOf = (id: string) =>
        [...wrap.querySelectorAll(`[data-part="${CSS.escape(id)}"]`)].flatMap((el) =>
          el.classList.contains('is-zoned') ? [...el.querySelectorAll(':scope > .thk-zone')] : [el],
        );
      const parts = injuredIds.flatMap(partsOf);
      // the diagrams mark the labels of highlighted parts (…is-hl is-injured); keep them in the zoomed frame too
      const labelGroups = [...wrap.querySelectorAll('.is-hl.is-injured')].filter((g) => g.querySelector('text'));
      let b = box(parts);
      let perPart = false;
      let labels = labelGroups.flatMap((g) => [...g.querySelectorAll('text')]);
      if (!isSmall(b)) {
        // the injured tissue as a whole is large (a big muscle), but one injured part may be tiny (the pubic
        // symphysis next to adductor longus): zoom onto the smallest such part and its own label
        let best: { b: ReturnType<typeof box>; id: string } | null = null;
        for (const id of injuredIds) {
          const pb = box(partsOf(id));
          if (!isSmall(pb)) continue;
          if (!best || (pb.x1 - pb.x0) * (pb.y1 - pb.y0) < (best.b.x1 - best.b.x0) * (best.b.y1 - best.b.y0)) best = { b: pb, id };
        }
        if (best) {
          const pb = best.b;
          b = pb;
          perPart = true;
          // its label: the injured label whose leader starts on (or next to) this part
          labels = labelGroups
            .filter((g) => {
              const dot = g.querySelector('circle, .ldot');
              if (!dot) return false;
              const r = dot.getBoundingClientRect();
              const x = (r.left + r.width / 2 - wr.left) / scale;
              const y = (r.top + r.height / 2 - wr.top) / scale;
              return x >= pb.x0 - 12 && x <= pb.x1 + 12 && y >= pb.y0 - 12 && y <= pb.y1 + 12;
            })
            .flatMap((g) => [...g.querySelectorAll('text')]);
        }
      }
      const u = box([...(perPart ? [] : parts), ...labels]);
      const ub = Number.isFinite(u.x0) ? { x0: Math.min(u.x0, b.x0), y0: Math.min(u.y0, b.y0), x1: Math.max(u.x1, b.x1), y1: Math.max(u.y1, b.y1) } : b;
      if (!Number.isFinite(b.x0)) return setFocusBox(null);
      setFocusBox({
        x: b.x0,
        y: b.y0,
        w: b.x1 - b.x0,
        h: b.y1 - b.y0,
        ux: Math.max(0, ub.x0),
        uy: Math.max(0, ub.y0),
        uw: Math.min(cw, ub.x1) - Math.max(0, ub.x0),
        uh: Math.min(ch, ub.y1) - Math.max(0, ub.y0),
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
  }, [zoomable, injuredIds, shown, region, side, condition]);
  // only worth it when the injured tissue covers a small part of the figure
  const small = !!focusBox && focusBox.w * focusBox.h < 0.06 * focusBox.cw * focusBox.ch && Math.max(focusBox.w / focusBox.cw, focusBox.h / focusBox.ch) < 0.4;
  let zoomStyle: CSSProperties | undefined;
  let zoomT: { s: number; tx: number; ty: number } | null = null;
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
    zoomT = { s, tx, ty };
  }
  // While zoomed, a label that the canvas edge would cut (「大腿四頭筋腱」 read as 「大腿四頭筋」) is hidden with its
  // leader line; the labels of the injured parts always stay. A cut label whose part is still in the frame (its
  // leader's anchor dot is visible: the faded amber vastus muscles next to the patellar tendon) is not lost: it is
  // drawn again, unscaled, at the frame edge on its own side with a leader to the same anchor (`relabels`).
  const zoomKey = zoomT ? `${zoomT.s}:${zoomT.tx}:${zoomT.ty}` : '';
  const [relabels, setRelabels] = useState<Relabel[]>([]);
  useLayoutEffect(() => {
    const wrap = zoomRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const groups = [...wrap.querySelectorAll<SVGGElement>('.thk-lab, .tbu-lab')];
    for (const g of groups) g.removeAttribute('data-cut');
    if (!zoomT) {
      setRelabels((r) => (r.length ? [] : r));
      return;
    }
    const { s: zs, tx, ty } = zoomT;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const wr = wrap.getBoundingClientRect();
    // current (possibly mid-transition) scale: positions / scale = unzoomed canvas px
    const cur = wr.width / Math.max(1, cw) || 1;
    const zx = (px: number) => ((px - wr.left) / cur) * zs + tx;
    const zy = (py: number) => ((py - wr.top) / cur) * zs + ty;
    const zbox = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      return { x0: zx(r.left), y0: zy(r.top), x1: zx(r.right), y1: zy(r.bottom) };
    };
    /** a point of the zoomed frame (canvas px) → where it is on screen now (the drawing may still be mid-transition) */
    const toScreen = (x: number, y: number): [number, number] => [wr.left + ((x - tx) / zs) * cur, wr.top + ((y - ty) / zs) * cur];
    const squash = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, '');
    // the parts by their name (each part group carries a <title>, its labels say the same name)
    const named = new Map<string, Element[]>();
    for (const p of wrap.querySelectorAll('[data-part]')) {
      const name = squash(p.querySelector(':scope > title')?.textContent);
      if (name) named.set(name, [...(named.get(name) ?? []), p]);
    }
    const labelText = (t: SVGTextElement) => squash(t.textContent);
    /** The point of the named part inside the frame that is nearest to (ax, ay), if a good piece of it is visible. */
    const visiblePointOf = (name: string, ax: number, ay: number): [number, number] | null => {
      const els = named.get(name);
      if (!els) return null;
      const bs = els.map(zbox);
      const x0 = Math.max(8, Math.min(...bs.map((q) => q.x0)));
      const y0 = Math.max(8, Math.min(...bs.map((q) => q.y0)));
      const x1 = Math.min(cw - 8, Math.max(...bs.map((q) => q.x1)));
      const y1 = Math.min(ch - 8, Math.max(...bs.map((q) => q.y1)));
      if (x1 - x0 < 16 || y1 - y0 < 16) return null;
      const N = 6;
      const hits: [number, number][] = [];
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          const x = x0 + ((i + 0.5) * (x1 - x0)) / N;
          const y = y0 + ((j + 0.5) * (y1 - y0)) / N;
          const [sx, sy] = toScreen(x, y);
          if (document.elementsFromPoint(sx, sy).some((e) => els.some((p) => p.contains(e)))) hits.push([x, y]);
        }
      if (hits.length < 2) return null;
      return hits.reduce((a, q) => (Math.hypot(q[0] - ax, q[1] - ay) < Math.hypot(a[0] - ax, a[1] - ay) ? q : a));
    };
    /** labels that stay where they are and the injured tissue (the moved labels must not cover them) */
    const kept: Box[] = injuredIds.flatMap((id) =>
      [...wrap.querySelectorAll(`[data-part="${CSS.escape(id)}"]`)].flatMap((el) =>
        (el.classList.contains('is-zoned') ? [...el.querySelectorAll(':scope > .thk-zone')] : [el]).map(zbox),
      ),
    );
    /** names already readable in the frame (a part labelled twice is named once) */
    const shownNames = new Set<string>();
    const cut: { g: SVGGElement; t: SVGTextElement; ax: number; ay: number; textLeft: boolean; hl: boolean }[] = [];
    for (const g of groups) {
      const t = g.querySelector('text');
      if (!t) continue;
      const b = zbox(t);
      // the injured tissue's own labels always stay (the zoom frames them); a cut amber one is as unreadable as a faded one
      if (g.classList.contains('is-injured') || (b.x0 >= 1 && b.y0 >= 1 && b.x1 <= cw - 1 && b.y1 <= ch - 1)) {
        kept.push(b);
        shownNames.add(labelText(t));
        continue;
      }
      g.setAttribute('data-cut', '');
      const dot = g.querySelector('.ldot');
      if (!dot) continue;
      const db = zbox(dot);
      let ax = (db.x0 + db.x1) / 2;
      let ay = (db.y0 + db.y1) / 2;
      const textLeft = (b.x0 + b.x1) / 2 < ax;
      // its part is in the frame: the anchor dot sits on the part, clear of the edges; or the anchor is out of the
      // frame but a good piece of the part is in it (the top of the vastus medialis above the patellar tendon): the
      // label points at the visible point of the part nearest to its own anchor
      if (ax < 6 || ay < 6 || ax > cw - 6 || ay > ch - 6) {
        const p = visiblePointOf(labelText(t), ax, ay);
        if (!p) continue;
        [ax, ay] = p;
      }
      cut.push({ g, t, ax, ay, textLeft, hl: g.classList.contains('is-hl') });
    }
    const placed: Box[] = [];
    const out: Relabel[] = [];
    const overlaps = (a: Box, b: Box) => a.x0 < b.x1 + 3 && b.x0 < a.x1 + 3 && a.y0 < b.y1 + 2 && b.y0 < a.y1 + 2;
    // the highlighted (amber) parts' names first, then the rest, top to bottom
    cut.sort((a, b) => Number(b.hl) - Number(a.hl) || a.ay - b.ay);
    for (const c of cut) {
      if (out.length >= RELABEL_MAX) break;
      const name = labelText(c.t);
      if (shownNames.has(name)) continue;
      const lines = [...c.t.querySelectorAll('tspan')].map((s) => s.textContent ?? '').filter(Boolean);
      if (!lines.length) lines.push(c.t.textContent ?? '');
      const w = Math.max(...lines.map(textWidth));
      const h = lines.length * RELABEL_LH;
      // at the frame edge on the label's own side; beside the anchor when the anchor itself is near that edge
      let x0: number;
      if (c.textLeft) x0 = c.ax - 14 < 6 + w ? c.ax + 12 : 6;
      else x0 = c.ax + 14 > cw - 6 - w ? c.ax - 12 - w : cw - 6 - w;
      x0 = Math.max(4, Math.min(cw - 4 - w, x0));
      let spot: Box | null = null;
      for (const off of [0, -18, 18, -36, 36, -54, 54, -72, 72]) {
        const y0 = c.ay - h / 2 + off;
        const b = { x0, y0, x1: x0 + w, y1: y0 + h };
        if (y0 < 4 || b.y1 > ch - 4) continue;
        if ([...kept, ...placed].some((k) => overlaps(b, k))) continue;
        spot = b;
        break;
      }
      if (!spot) continue;
      const textRight = (spot.x0 + spot.x1) / 2 > c.ax;
      // a faded context name is not worth a leader across the figure; the highlighted (amber) ones always are
      if (!c.hl && Math.abs((textRight ? spot.x0 : spot.x1) - c.ax) > 0.45 * cw) continue;
      placed.push(spot);
      shownNames.add(name);
      out.push({
        key: `${out.length}:${lines.join('')}`,
        tone: c.g.classList.contains('is-involved')
          ? 'involved'
          : c.g.classList.contains('is-zrest')
            ? 'zrest'
            : c.hl
              ? 'hl'
              : c.g.classList.contains('is-ctx') || c.g.classList.contains('is-dim')
                ? 'ctx'
                : 'plain',
        lines,
        x: spot.x0,
        y: spot.y0 + RELABEL_FS - 1,
        ax: c.ax,
        ay: c.ay,
        lx: textRight ? spot.x0 - 3 : spot.x1 + 3,
        ly: spot.y0 + h / 2,
      });
    }
    setRelabels(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomKey, shown, side]);

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
          <ErrorBoundary resetKey={`${region}:${shown}:${side ?? ''}`}>
            <C
              view={shown}
              highlights={highlights}
              dimOthers={dimOthers}
              showLabels={showLabels ?? true}
              showSpots={showSpots}
              selectedSpot={selectedSpot ?? null}
              onSpotSelect={onSpotSelect}
              onPartSelect={onPartSelect}
              condition={condition}
              side={side}
            />
          </ErrorBoundary>
        </div>
        {zoomed && relabels.length > 0 && (
          <svg className="figure__relabels" aria-hidden="true">
            {relabels.map((l) => (
              <g key={l.key} className={`relabel relabel--${l.tone}`}>
                <path className="relabel__ld" d={`M${l.ax.toFixed(1)} ${l.ay.toFixed(1)}L${l.lx.toFixed(1)} ${l.ly.toFixed(1)}`} />
                <circle className="relabel__dot" cx={l.ax} cy={l.ay} r={1.8} />
                <text x={l.x} y={l.y}>
                  {l.lines.map((s, i) => (
                    <tspan key={i} x={l.x} dy={i ? RELABEL_LH : 0}>
                      {s}
                    </tspan>
                  ))}
                </text>
              </g>
            ))}
          </svg>
        )}
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
