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
type Pt = [number, number];

/** The zoom onto the lesion: scale and shift of the drawing in canvas px (transform-origin 0 0). */
interface ZoomT {
  s: number;
  tx: number;
  ty: number;
}
/** A zoom fitted to a canvas size (`${width}x${height}`, canvas px). */
interface Fit extends ZoomT {
  size: string;
}
const ZOOM_MAX = 2;
/** below this the zoom is not worth a button */
const ZOOM_MIN = 1.4;
/** px kept free between the frame edge and a text / a lesion zone */
const TEXT_M = 3;
const ZONE_M = 3;

/**
 * A text drawn again in the zoomed frame (canvas px), at the size of the diagram's labels: the name of a part whose own
 * label the frame edge would cut, a corner caption pinned to its corner, an inset title.
 */
interface Relabel {
  key: string;
  /** colour of the original: injured, injured-zone rest, amber (involved), highlighted, plain, faded context; caption */
  tone: 'injured' | 'zrest' | 'involved' | 'hl' | 'plain' | 'ctx' | 'cap' | 'note';
  lines: string[];
  /** text position (first baseline) and anchor */
  x: number;
  y: number;
  a: 'start' | 'end' | 'middle';
  fs: number;
  lh: number;
  /** leader: from the anchor on the part to the text */
  pts?: Pt[];
  /** a corner caption's plate (canvas px): the zoomed drawing may reach under the corner */
  bg?: Box;
}
const RELABEL_MAX = 8;

/** A diagram label (the kits' .thk-lab / .tbu-lab group) measured in unzoomed canvas px. */
interface LabGeo {
  g: SVGGElement;
  t: SVGTextElement;
  name: string;
  lines: string[];
  /** the text */
  box: Box;
  /** where the leader meets the text (canvas px and svg units): while zoomed the label keeps its size around it */
  tip: Pt;
  tipU: Pt;
  /** leader: anchor on the part, (elbow), tip; just [tip] for a caption without one */
  pts: Pt[];
  /** first baseline below the top of the text box, line pitch, font size (px) */
  base: number;
  lh: number;
  fs: number;
  /** 4 injured, 3 highlighted / amber, 2 rest of an injured part, 1 plain, 0 faded context */
  rank: number;
}

const squash = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, '');

type TextBox = { x: number; y: number; width: number; height: number };
/** each label text's box at its own size, with what it depends on (see textBoxes) */
const unscaledBoxes = new WeakMap<SVGTextElement, { sig: string; box: TextBox }>();

/**
 * The texts' boxes in their user space as laid out at their own size, unzoomed. Chrome lays an SVG text out at its scale
 * on screen, its own CSS transform included (not the zoom wrapper's): a label scaled back by --zinv while zoomed, or
 * still scaling, measures a unit or two wider or narrower than unzoomed, by how far its transition has got. So a text at
 * its own size is measured as it is (and its box kept); a scaled one takes the box kept for it if nothing it depends on
 * has changed since (`sigs`: its canvas size, label classes, text and place), else is measured by a hidden copy of it
 * without the transform, next to it (same styles, same svg scale), removed again before anything is drawn. Null for a
 * text that cannot be measured or is empty.
 */
function textBoxes(texts: SVGTextElement[], sigs: string[]): (TextBox | null)[] {
  const kept = texts.map((t, i) => {
    const tf = getComputedStyle(t).transform;
    if (tf === 'none' || tf === 'matrix(1, 0, 0, 1, 0, 0)') return null;
    const k = unscaledBoxes.get(t);
    return k && k.sig === sigs[i] ? k.box : undefined;
  });
  const copies = texts.map((t, i) => {
    if (kept[i] !== undefined) return null;
    const c = t.cloneNode(true) as SVGTextElement;
    c.style.transform = 'none';
    c.style.transition = 'none';
    c.style.visibility = 'hidden';
    t.after(c);
    return c;
  });
  const out = texts.map((t, i) => {
    const k = kept[i];
    if (k) return k;
    try {
      const b = (copies[i] ?? t).getBBox();
      if (!b.width) return null;
      const box = { x: b.x, y: b.y, width: b.width, height: b.height };
      unscaledBoxes.set(t, { sig: sigs[i], box });
      return box;
    } catch {
      return null;
    }
  });
  for (const c of copies) c?.remove();
  return out;
}

/** The diagrams' labels in unzoomed canvas px (`wr`: the zoom wrapper's rect, `cur`: its current scale, `size`: the canvas size). */
function labelGeos(wrap: HTMLElement, wr: DOMRect, cur: number, size: string): LabGeo[] {
  const out: LabGeo[] = [];
  // labels sit outside the drawing's (mirroring) group: svg units map to canvas px by the svg's own scale
  const maps = new Map<SVGSVGElement, { k: number; ox: number; oy: number } | null>();
  const mapOf = (svg: SVGSVGElement) => {
    if (!maps.has(svg)) {
      const vb = svg.viewBox.baseVal;
      const sr = svg.getBoundingClientRect();
      const k = vb && vb.width && sr.width ? sr.width / cur / vb.width : 0;
      maps.set(svg, k ? { k, ox: (sr.left - wr.left) / cur - vb.x * k, oy: (sr.top - wr.top) / cur - vb.y * k } : null);
    }
    return maps.get(svg);
  };
  const found: { g: SVGGElement; t: SVGTextElement; m: { k: number; ox: number; oy: number } }[] = [];
  for (const g of wrap.querySelectorAll<SVGGElement>('.thk-lab, .tbu-lab')) {
    const t = g.querySelector('text');
    const m = g.ownerSVGElement && mapOf(g.ownerSVGElement);
    if (t && m) found.push({ g, t, m });
  }
  // (measured at their own size: the fit and the names drawn again are those of the unzoomed figure, however far the
  // labels have scaled when the phone turns or the zoom is tapped)
  const bbs = textBoxes(
    found.map((f) => f.t),
    found.map(({ g, t }) => `${size}|${g.getAttribute('class')}|${t.getAttribute('x')},${t.getAttribute('y')}|${t.textContent}`),
  );
  for (const [i, { g, t, m }] of found.entries()) {
    const { k, ox, oy } = m;
    const C = (p: Pt): Pt => [ox + p[0] * k, oy + p[1] * k];
    const bb = bbs[i];
    if (!bb) continue;
    const ptsU: Pt[] = [];
    const nums = g.querySelector('.ld')?.getAttribute('d')?.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
    for (let i = 0; i + 1 < nums.length; i += 2) ptsU.push([nums[i], nums[i + 1]]);
    const a = t.getAttribute('text-anchor');
    const tipU: Pt =
      ptsU.length >= 2 ? ptsU[ptsU.length - 1] : [a === 'end' ? bb.x + bb.width : a === 'middle' ? bb.x + bb.width / 2 : bb.x, bb.y + bb.height / 2];
    const spans = [...t.querySelectorAll('tspan')];
    const lines = spans.map((s) => s.textContent ?? '').filter(Boolean);
    if (!lines.length) lines.push(t.textContent ?? '');
    const fs = (parseFloat(getComputedStyle(t).fontSize) || 13.25) * k;
    const dy = parseFloat(spans[1]?.getAttribute('dy') ?? '');
    const c = g.classList;
    out.push({
      g,
      t,
      name: squash(t.textContent),
      lines,
      box: { x0: ox + bb.x * k, y0: oy + bb.y * k, x1: ox + (bb.x + bb.width) * k, y1: oy + (bb.y + bb.height) * k },
      tip: C(tipU),
      tipU,
      pts: ptsU.length >= 2 ? ptsU.map(C) : [C(tipU)],
      base: ((parseFloat(t.getAttribute('y') ?? '') || bb.y) - bb.y) * k,
      lh: dy > 0 ? dy * k : fs * 1.15,
      fs,
      rank: c.contains('is-injured')
        ? 4
        : c.contains('is-involved') || (c.contains('is-hl') && !c.contains('is-zrest'))
          ? 3
          : c.contains('is-zrest')
            ? 2
            : c.contains('is-ctx') || c.contains('is-dim')
              ? 0
              : 1,
    });
  }
  return out;
}

/** A label while zoomed: its leader zooms with the drawing, its text keeps its size at the leader's (zoomed) tip. */
function zoomLab(l: LabGeo, z: ZoomT): { box: Box; pts: Pt[] } {
  const dx = l.tip[0] * (z.s - 1) + z.tx;
  const dy = l.tip[1] * (z.s - 1) + z.ty;
  return {
    box: { x0: l.box.x0 + dx, y0: l.box.y0 + dy, x1: l.box.x1 + dx, y1: l.box.y1 + dy },
    pts: l.pts.length > 1 ? l.pts.map((p) => [p[0] * z.s + z.tx, p[1] * z.s + z.ty]) : [],
  };
}

/** Is the text box inside the frame (`m` px from its edges, clear of its rounded corners)? */
function inFrame(b: Box, cw: number, ch: number, rad: number, m = 2): boolean {
  if (b.x0 < m || b.y0 < m || b.x1 > cw - m || b.y1 > ch - m) return false;
  const r = rad;
  for (const [x, y] of [
    [b.x0, b.y0],
    [b.x1, b.y0],
    [b.x0, b.y1],
    [b.x1, b.y1],
  ]) {
    const cx = x < r ? r : x > cw - r ? cw - r : x;
    const cy = y < r ? r : y > ch - r ? ch - r : y;
    if (cx !== x && cy !== y && Math.hypot(x - cx, y - cy) > r - 1) return false;
  }
  return true;
}

/** Does the polyline cross the box (Liang–Barsky per segment)? */
function crossesBox(pts: Pt[], b: Box): boolean {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const dx = pts[i + 1][0] - ax;
    const dy = pts[i + 1][1] - ay;
    let t0 = 0;
    let t1 = 1;
    let hit = true;
    for (const [p, q] of [
      [-dx, ax - b.x0],
      [dx, b.x1 - ax],
      [-dy, ay - b.y0],
      [dy, b.y1 - ay],
    ]) {
      if (p === 0) {
        if (q < 0) hit = false;
        continue;
      }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
    if (hit && t1 - t0 > 1e-6) return true;
  }
  return false;
}
/** The glyphs of a text box (its box has some leading above and below them). */
const glyphs = (b: Box): Box => {
  const v = (b.y1 - b.y0) * 0.1;
  return { x0: b.x0 + 1, y0: b.y0 + v, x1: b.x1 - 1, y1: b.y1 - v };
};
/** A text box for the leader tests: its glyphs, and 2 px more on each side (a redrawn text may start 1–2 px off its box). */
const lineBox = (b: Box): Box => {
  const v = (b.y1 - b.y0) * 0.1;
  return { x0: b.x0 - 2, y0: b.y0 + v, x1: b.x1 + 2, y1: b.y1 - v };
};
const overlaps = (a: Box, b: Box, gx = 3, gy = 2) => a.x0 < b.x1 + gx && b.x0 < a.x1 + gx && a.y0 < b.y1 + gy && b.y0 < a.y1 + gy;

/** A point through a matrix (client px → a user space). */
const apply = (m: DOMMatrix, x: number, y: number) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
/** An element's transform attribute as a matrix (not consolidate(): that rewrites the attribute). */
const ownTransform = (el: SVGGraphicsElement | SVGClipPathElement): DOMMatrix => {
  const list = el.transform.baseVal;
  let m = new DOMMatrix();
  for (let i = 0; i < list.numberOfItems; i++) m = m.multiply(list.getItem(i).matrix);
  return m;
};
type HitClip = { m: DOMMatrix; shapes: { el: SVGGeometryElement; m: DOMMatrix }[] };
/** A shape of a part as partHitTest tests it. */
interface HitShape {
  el: SVGGeometryElement;
  /** client px → its user space */
  m: DOMMatrix;
  fill: boolean;
  stroke: boolean;
  /** its box in its user space, grown by the reach of its stroke */
  bb: Box;
  /** its svg's box on screen, where the svg clips what it draws (overflow other than visible) */
  vp: DOMRect | null;
  /** the clip paths on it and on its groups: client px → the clip's space, the clip's shapes (their transform inverted) */
  clips: HitClip[];
}

/**
 * The browser's hit test of the parts `els` at a point in client px, for any point, on screen or not
 * (document.elementsFromPoint answers nothing outside the viewport: a figure scrolled partly off screen when the zoom
 * is tapped, a re-layout while the phone turns). Same rules as elementsFromPoint, which lists every layer at the point
 * (not only the top one): a part is hit where one of its shapes is, whatever is drawn over it; a shape by its fill
 * unless the fill is none and by its stroke unless the stroke is none (pointer-events auto; the other values as the
 * browser reads them), never with pointer-events none, display none or visibility hidden; opacity and masks do not
 * matter, clip paths (url references; clip-rule read as fill-rule) and the svg's own box do. It follows the layout,
 * not the pixels: Chrome draws and hit-tests the zoomed (CSS-scaled) drawing from a whole-pixel origin, up to a pixel
 * off, so a point that close to an edge can come out the other way than elementsFromPoint had it.
 */
function partHitTest(els: Element[]): (x: number, y: number) => boolean {
  // Each svg: its box on screen, and the map of its user space (viewBox units) to client px taken from that box (CSS
  // transforms included, in every browser). It stands in for the CSS part of getScreenCTM, which WebKit maps only by
  // position (not the zoom's scale): client ← local = (box map) · getScreenCTM(svg)⁻¹ · getScreenCTM(shape).
  const svgs = new Map<SVGSVGElement, { vp: DOMRect | null; fix: DOMMatrix }>();
  const svgOf = (svg: SVGSVGElement) => {
    let v = svgs.get(svg);
    if (!v) {
      const r = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const own = svg.getScreenCTM();
      let fix = new DOMMatrix();
      if (vb && vb.width && vb.height && r.width && r.height && own) {
        const par = svg.preserveAspectRatio.baseVal;
        let sx = r.width / vb.width;
        let sy = r.height / vb.height;
        let dx = 0;
        let dy = 0;
        if (par.align >= SVGPreserveAspectRatio.SVG_PRESERVEASPECTRATIO_XMINYMIN) {
          sx = sy = par.meetOrSlice === SVGPreserveAspectRatio.SVG_MEETORSLICE_SLICE ? Math.max(sx, sy) : Math.min(sx, sy);
          // xMin / xMid / xMax, yMin / yMid / yMax
          const a = par.align - SVGPreserveAspectRatio.SVG_PRESERVEASPECTRATIO_XMINYMIN;
          dx = ((r.width - vb.width * sx) * (a % 3)) / 2;
          dy = ((r.height - vb.height * sy) * Math.floor(a / 3)) / 2;
        }
        fix = new DOMMatrix([sx, 0, 0, sy, r.left + dx - vb.x * sx, r.top + dy - vb.y * sy]).multiply(DOMMatrix.fromMatrix(own).inverse());
      }
      svgs.set(svg, (v = { vp: getComputedStyle(svg).overflow === 'visible' ? null : r, fix }));
    }
    return v;
  };
  /** client px → the user space of `e` (its own transform included) */
  const toLocal = (e: SVGGraphicsElement): DOMMatrix | null => {
    const ctm = e.getScreenCTM();
    const svg = e.ownerSVGElement;
    return ctm && svg ? svgOf(svg).fix.multiply(DOMMatrix.fromMatrix(ctm)).inverse() : null;
  };
  const shownAt = new Map<Element, boolean>();
  const shown = (e: Element | null): boolean => {
    if (!e || e instanceof SVGSVGElement) return true;
    let v = shownAt.get(e);
    if (v === undefined) shownAt.set(e, (v = getComputedStyle(e).display !== 'none' && shown(e.parentElement)));
    return v;
  };
  const clipsAt = new Map<Element, HitClip[]>();
  const clipsOf = (e: Element | null): HitClip[] => {
    if (!e || e instanceof SVGSVGElement) return [];
    let c = clipsAt.get(e);
    if (!c) {
      c = clipsOf(e.parentElement);
      const id = /^url\("?#(.+?)"?\)$/.exec(getComputedStyle(e).clipPath)?.[1];
      const cp = id ? e.ownerDocument.getElementById(id) : null;
      let m = cp instanceof SVGClipPathElement && e instanceof SVGGraphicsElement ? toLocal(e) : null;
      if (cp instanceof SVGClipPathElement && m) {
        // (the clip path's units: the user space of `e`, or its bounding box)
        if (cp.clipPathUnits.baseVal === SVGUnitTypes.SVG_UNIT_TYPE_OBJECTBOUNDINGBOX) {
          const b = (e as SVGGraphicsElement).getBBox();
          m = new DOMMatrix([1 / b.width, 0, 0, 1 / b.height, -b.x / b.width, -b.y / b.height]).multiply(m);
        }
        const shapes = [...cp.children].flatMap((k) => {
          if (!(k instanceof SVGGeometryElement)) return [];
          const cs = getComputedStyle(k);
          return cs.display === 'none' || cs.visibility !== 'visible' ? [] : [{ el: k, m: ownTransform(k).inverse() }];
        });
        c = [...c, { m: ownTransform(cp).inverse().multiply(m), shapes }];
      }
      clipsAt.set(e, c);
    }
    return c;
  };
  const shapes: HitShape[] = [];
  for (const p of els)
    for (const el of p.querySelectorAll('*')) {
      if (!(el instanceof SVGGeometryElement) || !shown(el)) continue;
      const cs = getComputedStyle(el);
      const pe = cs.pointerEvents.toLowerCase();
      // auto is visiblePainted: visible shapes, by what of them is painted
      const painted = pe === 'auto' || pe === 'visiblepainted' || pe === 'painted';
      if (pe === 'none' || ((pe === 'auto' || pe.startsWith('visible')) && cs.visibility !== 'visible')) continue;
      const fill = !pe.endsWith('stroke') && !(painted && cs.fill === 'none');
      const stroke = !pe.endsWith('fill') && !(painted && cs.stroke === 'none');
      const m = fill || stroke ? toLocal(el) : null;
      if (!m || !el.ownerSVGElement) continue;
      let b: DOMRect;
      try {
        b = el.getBBox();
      } catch {
        continue;
      }
      // a stroke reaches half its width out of the path; a corner, its miter (up to the miter limit) or a square cap
      const sw = stroke ? parseFloat(cs.strokeWidth) || 0 : 0;
      const join = cs.strokeLinejoin === 'round' || cs.strokeLinejoin === 'bevel' ? 1 : parseFloat(cs.strokeMiterlimit) || 4;
      const r = (sw / 2) * Math.max(Math.SQRT2, join) + 1;
      shapes.push({ el, m, fill, stroke, bb: { x0: b.x - r, y0: b.y - r, x1: b.x + b.width + r, y1: b.y + b.height + r }, vp: svgOf(el.ownerSVGElement).vp, clips: clipsOf(el) });
    }
  return (x, y) =>
    shapes.some((s) => {
      if (s.vp && (x < s.vp.left || x > s.vp.right || y < s.vp.top || y > s.vp.bottom)) return false;
      const q = apply(s.m, x, y);
      if (q.x < s.bb.x0 || q.x > s.bb.x1 || q.y < s.bb.y0 || q.y > s.bb.y1) return false;
      for (const c of s.clips) {
        const u = apply(c.m, x, y);
        if (!c.shapes.some((k) => k.el.isPointInFill(apply(k.m, u.x, u.y)))) return false;
      }
      return (s.fill && s.el.isPointInFill(q)) || (s.stroke && s.el.isPointInStroke(q));
    });
}

/** The extent of something in the zoomed frame along one axis, before the shift, at scale s. */
type Span = (s: number) => [number, number];

/**
 * The zoom (largest scale from `sHi` down to ZOOM_MIN) that keeps the lesion boxes `need` and the injured labels `labs`
 * inside the frame, centred on them and, where possible, without an empty band at an edge of the drawing. First with
 * every injured label in place (at its own size, see zoomLab); then, when that only fits a much smaller zoom (labels on
 * both sides of a small lesion: the ischial tuberosity), letting a label move in beside its anchor (RegionFigure draws
 * it again there, at the frame edge). Null when even ZOOM_MIN does not fit.
 */
function fitZoom(cw: number, ch: number, sHi: number, need: Box[], labs: LabGeo[], rad: number): ZoomT | null {
  const spans = (move: boolean, ax: 0 | 1): Span[] => [
    ...need.map((b): Span => {
      const lo = ax ? b.y0 : b.x0;
      const hi = ax ? b.y1 : b.x1;
      return (s) => [lo * s - ZONE_M, hi * s + ZONE_M];
    }),
    ...labs.flatMap((l): Span[] => {
      const lo = ax ? l.box.y0 : l.box.x0;
      const hi = ax ? l.box.y1 : l.box.x1;
      const tip = l.tip[ax];
      const a = l.pts[0][ax];
      if (!move)
        return [(s) => [lo + tip * (s - 1) - TEXT_M, hi + tip * (s - 1) + TEXT_M], ...l.pts.map((p): Span => (s) => [p[ax] * s - 2, p[ax] * s + 2])];
      // moved in: on its own side of the anchor, at the anchor's height
      const size = hi - lo;
      if (ax) return [(s) => [a * s - size / 2 - TEXT_M, a * s + size / 2 + TEXT_M]];
      const left = (l.box.x0 + l.box.x1) / 2 < a;
      return [left ? (s) => [a * s - 12 - size - 3 - TEXT_M, a * s + 2] : (s) => [a * s - 2, a * s + 12 + size + 3 + TEXT_M]];
    }),
  ];
  const axis = (s: number, size: number, sp: Span[]) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const f of sp) {
      const [a, b] = f(s);
      lo = Math.min(lo, a);
      hi = Math.max(hi, b);
    }
    const rLo = -lo;
    const rHi = size - hi;
    if (rLo > rHi) return null;
    // centred on them; then as far on the drawing as they allow (a part cut off at the drawing's edge stays there)
    const t = Math.min(0, Math.max(size - s * size, (rLo + rHi) / 2));
    return Math.min(rHi, Math.max(rLo, t));
  };
  const sTop = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, sHi));
  const best = (move: boolean): ZoomT | null => {
    const sx = spans(move, 0);
    const sy = spans(move, 1);
    for (let s = sTop; s >= ZOOM_MIN - 1e-6; s -= 0.05) {
      const tx = axis(s, cw, sx);
      const ty = axis(s, ch, sy);
      if (tx === null || ty === null) continue;
      const z = { s, tx, ty };
      if (move || labs.every((l) => inFrame(zoomLab(l, z).box, cw, ch, rad))) return z;
    }
    return null;
  };
  const inPlace = best(false);
  if (inPlace && inPlace.s >= sTop - 0.3) return inPlace;
  const moved = best(true);
  return moved && (!inPlace || moved.s > inPlace.s + 0.3) ? moved : inPlace;
}

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
  spotSide,
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
  /**
   * Central regions drawn unmirrored (low back, neck): the side the user tapped, for the hotspots / selected-spot
   * marker only (RegionDiagramProps.spotSide; forwarded as is).
   */
  spotSide?: 'left' | 'right';
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
  /** The zoom that frames the injured tissue (null: no zoom offered in this view). */
  const [fit, setFit] = useState<Fit | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const injuredIds = useMemo(
    () => Object.entries(highlights ?? {}).filter(([, r]) => r === 'injured').map(([id]) => id),
    [highlights],
  );
  useEffect(() => setZoomed(false), [shown]);
  useLayoutEffect(() => {
    if (!zoomable || !injuredIds.length) return setFit(null);
    /** The zoom that frames the injured tissue in the canvas as it is now (`scale`: the drawing's current zoom). */
    const fitNow = (wrap: HTMLElement, canvas: HTMLElement, wr: DOMRect, scale: number, cw: number, ch: number): ZoomT | null => {
      const box = (els: Element[]): Box => {
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
      const isSmall = (b: Box) => {
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
      let focus = box(parts);
      let need = [focus];
      if (!isSmall(focus)) {
        // the injured tissue as a whole is large (a big muscle, two lesion zones far apart), but one injured part may
        // be tiny (the pubic symphysis next to adductor longus): zoom onto the smallest such part; every lesion zone
        // stays in the frame all the same (calf strain: the medial-head zone and the soleus zone)
        let best: Box | null = null;
        for (const id of injuredIds) {
          const pb = box(partsOf(id));
          if (isSmall(pb) && (!best || (pb.x1 - pb.x0) * (pb.y1 - pb.y0) < (best.x1 - best.x0) * (best.y1 - best.y0))) best = pb;
        }
        if (!best) return null;
        focus = best;
        need = [best, ...parts.filter((el) => el.classList.contains('thk-zone')).map((el) => box([el]))];
      }
      if (!Number.isFinite(focus.x0)) return null;
      // the injured tissue fills ~40% of the frame (at most 2×); its labels (the diagrams mark them …is-hl is-injured)
      // stay readable in the frame at their own size: zoom less if they would not fit, no zoom below ZOOM_MIN
      const rad = parseFloat(getComputedStyle(canvas).borderTopLeftRadius) || 0;
      const labs = labelGeos(wrap, wr, scale, `${cw}x${ch}`).filter((l) => l.rank === 4);
      const sHi = Math.min((0.4 * cw) / Math.max(1, focus.x1 - focus.x0), (0.4 * ch) / Math.max(1, focus.y1 - focus.y0));
      return fitZoom(cw, ch, sHi, need.filter((b) => Number.isFinite(b.x0)), labs, rad);
    };
    // Measured again while zoomed (the phone turned and back), a canvas size already measured unzoomed keeps the fit it
    // had (the labels measure at their own size either way, see textBoxes): the zoom is that of a fresh tap. A size first
    // seen while zoomed (zoomed upright, then turned) is measured as it is, to the same fit as a fresh tap there.
    const fits = new Map<string, Fit | null>();
    const measure = () => {
      const wrap = zoomRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas) return;
      const wr = wrap.getBoundingClientRect();
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      // current (possibly zoomed or mid-transition) scale: positions / scale = unzoomed canvas px
      const scale = wr.width / cw || 1;
      const size = `${cw}x${ch}`;
      // (no zoom and no zoom transition: the labels are not scaled either)
      const unzoomed = getComputedStyle(wrap).transform === 'none';
      let z: Fit | null = null;
      if (!unzoomed && fits.has(size)) z = fits.get(size) ?? null;
      else if (cw && ch) {
        const t = fitNow(wrap, canvas, wr, scale, cw, ch);
        z = t && { ...t, size };
      }
      if (unzoomed) fits.set(size, z);
      // (the fit of another canvas size is another fit even where the zoom is the same: the names drawn again in the
      // frame are placed for its size)
      setFit((f) => (z && f && f.size === z.size && f.s === z.s && Math.abs(f.tx - z.tx) < 0.05 && Math.abs(f.ty - z.ty) < 0.05 ? f : z));
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
  const zoomT = zoomed ? fit : null;
  // the labels keep their size while the drawing zooms: CSS scales each one back by --zinv around the point where its
  // leader meets it (its transform-origin, set below), so every text in the zoomed figure reads at one size
  const zoomStyle: CSSProperties | undefined = zoomT
    ? ({
        transform: `translate(${zoomT.tx.toFixed(1)}px, ${zoomT.ty.toFixed(1)}px) scale(${zoomT.s.toFixed(3)})`,
        '--zinv': (1 / zoomT.s).toFixed(4),
      } as CSSProperties)
    : undefined;
  // While zoomed, a label that the canvas edge would cut (「大腿四頭筋腱」 read as 「大腿四頭筋」) or that a leader would
  // cross is hidden with its leader line; the labels of the injured parts always stay (the zoom is chosen to frame them).
  // A hidden label whose part is still in the frame (its leader's anchor dot is visible: the faded amber vastus muscles
  // next to the patellar tendon) is not lost: it is drawn again at the frame edge on its own side, at the same size, with
  // a leader to the same anchor (`relabels`). The corner captions (「← 内側」「右脚・後ろから」) stay at their corners.
  const zoomKey = zoomT ? `${zoomT.s}:${zoomT.tx}:${zoomT.ty}:${zoomT.size}` : '';
  const [relabels, setRelabels] = useState<{ k: number; items: Relabel[] }>({ k: 1, items: [] });
  /** the labels carry a transform-origin (set while zoomed, removed once they have scaled back) */
  const originsSet = useRef(false);
  useLayoutEffect(() => {
    const wrap = zoomRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    for (const el of wrap.querySelectorAll('[data-cut]')) el.removeAttribute('data-cut');
    const labelParts = () => wrap.querySelectorAll<SVGElement>(':is(.thk-lab, .tbu-lab) :is(text, .lhit)');
    if (!zoomT) {
      setRelabels((r) => (r.items.length ? { k: 1, items: [] } : r));
      if (!originsSet.current) return; // never zoomed: leave the drawing untouched
      // the labels scale back around their origin (CSS transition); then the drawing is as it was
      const t = setTimeout(() => {
        originsSet.current = false;
        for (const el of labelParts()) {
          el.style.removeProperty('transform-origin');
          if (el.getAttribute('style') === '') el.removeAttribute('style');
        }
      }, 320);
      return () => clearTimeout(t);
    }
    const z = zoomT;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const rad = parseFloat(getComputedStyle(canvas).borderTopLeftRadius) || 0;
    const wr = wrap.getBoundingClientRect();
    // current (possibly mid-transition) scale: positions / scale = unzoomed canvas px
    const cur = wr.width / Math.max(1, cw) || 1;
    const zp = (p: Pt): Pt => [p[0] * z.s + z.tx, p[1] * z.s + z.ty];
    const zbox = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      const [x0, y0] = zp([(r.left - wr.left) / cur, (r.top - wr.top) / cur]);
      const [x1, y1] = zp([(r.right - wr.left) / cur, (r.bottom - wr.top) / cur]);
      return { x0, y0, x1, y1 };
    };
    /** a point of the zoomed frame (canvas px) → where it is on screen now (the drawing may still be mid-transition) */
    const toScreen = (x: number, y: number): [number, number] => [wr.left + ((x - z.tx) / z.s) * cur, wr.top + ((y - z.ty) / z.s) * cur];
    // the parts by their name (each part group carries a <title>, its labels say the same name)
    const named = new Map<string, Element[]>();
    for (const p of wrap.querySelectorAll('[data-part]')) {
      const name = squash(p.querySelector(':scope > title')?.textContent);
      if (name) named.set(name, [...(named.get(name) ?? []), p]);
    }
    /** the hit test of the parts by name (built when first needed) */
    const hitOf = new Map<string, (x: number, y: number) => boolean>();
    /**
     * The points of the named part inside the frame, nearest to (ax, ay) first, if a good piece of it is visible: a
     * 6 × 6 grid over its box in the frame, hit-tested as the browser would, wherever the figure is scrolled.
     */
    const visiblePointsOf = (name: string, ax: number, ay: number): Pt[] => {
      const els = named.get(name);
      if (!els) return [];
      const bs = els.map(zbox);
      const x0 = Math.max(8, Math.min(...bs.map((q) => q.x0)));
      const y0 = Math.max(8, Math.min(...bs.map((q) => q.y0)));
      const x1 = Math.min(cw - 8, Math.max(...bs.map((q) => q.x1)));
      const y1 = Math.min(ch - 8, Math.max(...bs.map((q) => q.y1)));
      if (x1 - x0 < 16 || y1 - y0 < 16) return [];
      let hit = hitOf.get(name);
      if (!hit) hitOf.set(name, (hit = partHitTest(els)));
      const N = 6;
      const hits: Pt[] = [];
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          const x = x0 + ((i + 0.5) * (x1 - x0)) / N;
          const y = y0 + ((j + 0.5) * (y1 - y0)) / N;
          if (hit(...toScreen(x, y))) hits.push([x, y]);
        }
      if (hits.length < 2) return [];
      // (a stable sort: of points as near, the first in the grid)
      return hits.sort((p, q) => Math.hypot(p[0] - ax, p[1] - ay) - Math.hypot(q[0] - ax, q[1] - ay));
    };

    const geos = labelGeos(wrap, wr, cur, `${cw}x${ch}`);
    originsSet.current = true;
    for (const l of geos) for (const el of l.g.querySelectorAll<SVGElement>('text, .lhit')) el.style.transformOrigin = `${l.tipU[0].toFixed(2)}px ${l.tipU[1].toFixed(2)}px`;
    const labs = geos.map((l) => ({ ...l, z: zoomLab(l, z) }));
    type ZLab = (typeof labs)[number];
    /** the injured tissue (nothing may cover it) */
    const zones: Box[] = injuredIds.flatMap((id) =>
      [...wrap.querySelectorAll(`[data-part="${CSS.escape(id)}"]`)].flatMap((el) =>
        (el.classList.contains('is-zoned') ? [...el.querySelectorAll(':scope > .thk-zone')] : [el]).map(zbox),
      ),
    );
    /** what a new text must not cover, the texts its leader must not cross, the leaders that must not cross it */
    const boxes: Box[] = [...zones];
    const texts: Box[] = [];
    const leaders: Pt[][] = [];
    const free = (b: Box, lead?: Pt[], edge = true) =>
      (!edge || inFrame(b, cw, ch, rad)) &&
      !boxes.some((q) => overlaps(b, q)) &&
      !leaders.some((p) => crossesBox(p, lineBox(b))) &&
      !(lead && texts.some((t) => crossesBox(lead, t)));
    const take = (b: Box, lead?: Pt[]) => {
      boxes.push(glyphs(b));
      texts.push(lineBox(b));
      if (lead && lead.length > 1) leaders.push(lead);
    };
    const out: Relabel[] = [];
    const tone = (l: ZLab): Relabel['tone'] => {
      const c = l.g.classList;
      if (c.contains('is-injured')) return 'injured';
      if (c.contains('is-involved')) return 'involved';
      if (c.contains('is-zrest')) return 'zrest';
      if (c.contains('is-hl')) return 'hl';
      return c.contains('is-ctx') || c.contains('is-dim') ? 'ctx' : 'plain';
    };
    /** do two leaders cross (not just touch at an end)? */
    const crossLeads = (p: Pt[], q: Pt[]) => {
      const side = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      for (let i = 0; i + 1 < p.length; i++)
        for (let j = 0; j + 1 < q.length; j++) {
          const [a, b, c, d] = [p[i], p[i + 1], q[j], q[j + 1]];
          if (side(a, b, c) * side(a, b, d) < -1e-6 && side(c, d, a) * side(c, d, b) < -1e-6) return true;
        }
      return false;
    };
    /** does one leader's anchor dot sit on the other leader (within `d` px)? */
    const dotOnLead = (p: Pt[], q: Pt[], d = 2.5) => {
      const near = (o: Pt, s: Pt[]) => {
        for (let i = 0; i + 1 < s.length; i++) {
          const [a, b] = [s[i], s[i + 1]];
          const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
          const t = len2 ? Math.max(0, Math.min(1, ((o[0] - a[0]) * (b[0] - a[0]) + (o[1] - a[1]) * (b[1] - a[1])) / len2)) : 0;
          if (Math.hypot(o[0] - a[0] - t * (b[0] - a[0]), o[1] - a[1] - t * (b[1] - a[1])) < d) return true;
        }
        return false;
      };
      return near(q[0], p) || near(p[0], q);
    };
    /**
     * Draw label `l` again in the frame, as near the anchor's height as a free place allows: at the frame edge on its
     * own side (beside its anchor when the anchor itself is near that edge), else beside its anchor on its own side,
     * else on the other side; first where its leader crosses no other leader and stays short (`clean`; with `noTouch`,
     * nor runs through another leader's dot or has its dot on another leader), then (unless `cleanOnly`) anywhere free.
     * Null where it is not drawn. `touch`: the leader of the place found touches another leader's dot or line.
     * `force`: an injured part's name, drawn at the first place in the frame when no place is free.
     */
    const find = (
      l: ZLab,
      ax: number,
      ay: number,
      force = false,
      cleanOnly = false,
      noTouch = false,
    ): { b: Box; lead: Pt[]; clean: boolean; touch: boolean } | null => {
      const w = l.box.x1 - l.box.x0;
      const h = l.box.y1 - l.box.y0;
      const textLeft = (l.z.box.x0 + l.z.box.x1) / 2 < ax;
      const clampX = (x: number) => Math.max(4, Math.min(cw - 4 - w, x));
      const xs = [
        clampX(textLeft ? (ax - 14 < 6 + w ? ax + 12 : 6) : ax + 14 > cw - 6 - w ? ax - 12 - w : cw - 6 - w),
        clampX(textLeft ? ax - 12 - w : ax + 12),
        clampX(textLeft ? ax + 12 : ax - 12 - w),
      ].filter((x, i, all) => all.indexOf(x) === i);
      const at = (x0: number, off: number) => {
        const y0 = ay - h / 2 + off;
        const b = { x0, y0, x1: x0 + w, y1: y0 + h };
        const right = (b.x0 + b.x1) / 2 > ax;
        const lead: Pt[] = [
          [ax, ay],
          [right ? b.x0 - 3 : b.x1 + 3, (b.y0 + b.y1) / 2],
        ];
        return { b, lead };
      };
      const OFFS = [0, -18, 18, -36, 36, -54, 54, -72, 72, -90, 90];
      let spot: { b: Box; lead: Pt[]; clean: boolean; touch?: boolean } | null = null;
      for (const clean of cleanOnly ? [true] : [true, false]) {
        for (const x0 of xs) {
          for (const off of OFFS) {
            const c = at(x0, off);
            if (!free(c.b, c.lead)) continue;
            if (clean && (Math.hypot(c.lead[1][0] - ax, c.lead[1][1] - ay) > 0.6 * cw || leaders.some((p) => crossLeads(p, c.lead) || (noTouch && dotOnLead(p, c.lead))))) continue;
            spot = { ...c, clean };
            break;
          }
          if (spot) break;
        }
        if (spot) break;
      }
      if (!spot && force)
        for (const off of OFFS) {
          const c = at(xs[0], off);
          if (inFrame(c.b, cw, ch, rad)) {
            spot = { ...c, clean: false };
            break;
          }
        }
      if (!spot) return null;
      const textRight = (spot.b.x0 + spot.b.x1) / 2 > ax;
      // a faded context name is not worth a leader across the figure; the highlighted (amber) ones always are
      if (!force && l.rank < 3 && Math.abs((textRight ? spot.b.x0 : spot.b.x1) - ax) > 0.45 * cw) return null;
      const lead = spot.lead;
      return { ...spot, touch: leaders.some((p) => dotOnLead(p, lead)) };
    };
    /** draw `l` again at `spot` */
    const commit = (l: ZLab, spot: { b: Box; lead: Pt[] }) => {
      take(spot.b, spot.lead);
      out.push({
        key: `${out.length}:${l.lines.join('')}`,
        tone: tone(l),
        lines: l.lines,
        x: spot.b.x0,
        y: spot.b.y0 + l.base,
        a: 'start',
        fs: l.fs,
        lh: l.lh,
        pts: spot.lead,
      });
    };
    const place = (l: ZLab, ax: number, ay: number, force = false): boolean => {
      const spot = find(l, ax, ay, force);
      if (spot) commit(l, spot);
      return !!spot;
    };

    // 1. the injured parts' names: in place, at their own size (the zoom is chosen for it); one that the frame edge
    //    would cut (labels on both sides of a small lesion) moves in to the frame edge beside its anchor
    const kept: ZLab[] = [];
    const cut: ZLab[] = [];
    const movedIn: ZLab[] = [];
    for (const l of labs) if (l.rank === 4) (inFrame(l.z.box, cw, ch, rad) ? kept : movedIn).push(l);
    for (const l of kept) take(l.z.box, l.z.pts);
    for (const l of movedIn) {
      l.g.setAttribute('data-cut', '');
      const [ax, ay] = l.z.pts[0] ?? zp(l.tip);
      place(l, ax, ay, true);
    }
    // 2. the other labels stay where they are in the frame and clear of those; then no leader may cross another
    //    label's name (the lower-ranked of the two goes, the leader's own label on a tie; injured ones always stay)
    const movedTexts = texts.slice(kept.length);
    for (const l of labs) {
      if (l.rank === 4) continue;
      const ok =
        inFrame(l.z.box, cw, ch, rad) &&
        !out.some((r) => r.pts && crossesBox(r.pts, lineBox(l.z.box))) &&
        !movedTexts.some((t) => overlaps(glyphs(l.z.box), t, -1, -1) || crossesBox(l.z.pts, t));
      (ok ? kept : cut).push(l);
    }
    for (;;) {
      let victim: ZLab | null = null;
      for (const a of kept) {
        for (const b of kept) {
          if (a === b) continue;
          const hit = crossesBox(a.z.pts, glyphs(b.z.box)) || overlaps(glyphs(a.z.box), glyphs(b.z.box), -1, -1);
          if (!hit) continue;
          const v = a.rank < b.rank ? a : b.rank < a.rank ? b : a;
          if (v.rank < 4) victim = v;
          if (victim) break;
        }
        if (victim) break;
      }
      if (!victim) break;
      kept.splice(kept.indexOf(victim), 1);
      cut.push(victim);
    }
    for (const l of cut) l.g.setAttribute('data-cut', '');
    for (const l of kept) if (l.rank < 4) take(l.z.box, l.z.pts);

    // 3. the other texts of the drawing: the corner captions stay at their corners at their own size; a text inside
    //    the drawing (an inset title) keeps its size at its zoomed place; either is left out where it does not fit
    const root = wrap.querySelector('svg');
    /** the drawing's px per svg unit (unzoomed): its texts are drawn again at their own size */
    const k = root && root.viewBox.baseVal?.width ? root.getBoundingClientRect().width / cur / root.viewBox.baseVal.width : 1;
    if (root)
      for (const t of root.querySelectorAll<SVGTextElement>('text')) {
        if (t.closest('.thk-lab, .tbu-lab') || !t.textContent?.trim()) continue;
        t.setAttribute('data-cut', '');
        const r = t.getBoundingClientRect();
        if (!r.width) continue;
        const b0: Box = { x0: (r.left - wr.left) / cur, y0: (r.top - wr.top) / cur, x1: (r.right - wr.left) / cur, y1: (r.bottom - wr.top) / cur };
        const corner = t.parentNode?.parentNode === root && t.classList.contains('cap-t');
        const fs = Math.round(parseFloat(getComputedStyle(t).fontSize) * k * 100) / 100;
        let bb: DOMRect | null = null;
        try {
          bb = t.getBBox();
        } catch {
          /* ignore */
        }
        const base = bb && bb.height ? ((parseFloat(t.getAttribute('y') ?? '') - bb.y) / bb.height) * (b0.y1 - b0.y0) : fs * 0.88;
        let b = b0;
        let a: Relabel['a'] = 'start';
        let x = b0.x0;
        if (corner) {
          a = t.getAttribute('text-anchor') === 'end' ? 'end' : 'start';
          x = a === 'end' ? b0.x1 : b0.x0;
        } else {
          // an inset's title, only while most of its inset is in the frame
          const host = t.parentNode instanceof Element ? zbox(t.parentNode) : null;
          const iw = host ? Math.max(0, Math.min(cw, host.x1) - Math.max(0, host.x0)) : 0;
          const ih = host ? Math.max(0, Math.min(ch, host.y1) - Math.max(0, host.y0)) : 0;
          if (!host || iw * ih < 0.6 * (host.x1 - host.x0) * (host.y1 - host.y0)) continue;
          // centred on its zoomed place
          const zc = zp([(b0.x0 + b0.x1) / 2, (b0.y0 + b0.y1) / 2]);
          const hw = (b0.x1 - b0.x0) / 2;
          const hh = (b0.y1 - b0.y0) / 2;
          b = { x0: zc[0] - hw, y0: zc[1] - hh, x1: zc[0] + hw, y1: zc[1] + hh };
          a = 'middle';
          x = zc[0];
        }
        // (a corner caption stays where the diagram put it, unzoomed)
        if (!Number.isFinite(fs) || !Number.isFinite(base) || !free(b, undefined, !corner)) continue;
        take(b);
        out.push({
          key: `t${out.length}:${t.textContent}`,
          tone: t.classList.contains('note-t') ? 'note' : 'cap',
          lines: [t.textContent ?? ''],
          x,
          y: b.y0 + base,
          a,
          fs,
          lh: fs * 1.15,
          // (unzoomed the corner is empty; zoomed, the drawing may run under it: the caption sits on a plate of the
          // card's colour, invisible where the corner is still empty. The plate is the box no leader crosses and no
          // other text comes near, so it hides only drawing)
          bg: corner ? lineBox(b) : undefined,
        });
      }

    // 4. the names of parts still in the frame whose own label is hidden
    /** names already readable in the frame (a part labelled twice is named once) */
    const shownNames = new Set([...kept, ...movedIn].map((l) => l.name));
    const cand: { l: ZLab; ax: number; ay: number; alt: Pt[] }[] = [];
    for (const l of cut) {
      if (l.z.pts.length < 2) continue;
      const [ax, ay] = l.z.pts[0];
      // its part is in the frame: the anchor dot sits on the part, clear of the edges; or the anchor is out of the
      // frame but a good piece of the part is in it (the top of the vastus medialis above the patellar tendon): the
      // label points at the visible point of the part nearest to its own anchor (or, where a leader from there would
      // cross another, at the next nearest)
      if (ax < 6 || ay < 6 || ax > cw - 6 || ay > ch - 6) {
        const ps = visiblePointsOf(l.name, ax, ay);
        if (ps.length) cand.push({ l, ax: ps[0][0], ay: ps[0][1], alt: ps.slice(1, 8) });
      } else cand.push({ l, ax, ay, alt: [] });
    }
    // the highlighted (amber) parts' names first, then the rest, top to bottom
    cand.sort((a, b) => b.l.rank - a.l.rank || a.ay - b.ay);
    let moved = 0;
    for (const c of cand) {
      if (moved >= RELABEL_MAX) break;
      if (shownNames.has(c.l.name)) continue;
      let spot = find(c.l, c.ax, c.ay);
      if (!spot) continue;
      // its leader from the nearest point would cross another, touch one, or run long: from another visible point of
      // the part it may not
      for (const [x, y] of spot.clean && !spot.touch ? [] : c.alt) {
        const s = find(c.l, x, y, false, true, true);
        if (s) {
          spot = s;
          break;
        }
      }
      commit(c.l, spot);
      shownNames.add(c.l.name);
      moved++;
    }
    setRelabels({ k, items: out });
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
      <div className={`figure__canvas${zoomT ? ' is-zoomed' : ''}`} ref={canvasRef}>
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
              spotSide={spotSide}
            />
          </ErrorBoundary>
        </div>
        {zoomT && relabels.items.length > 0 && (
          <svg className="figure__relabels" aria-hidden="true" style={{ '--rl-k': relabels.k.toFixed(4) } as CSSProperties}>
            {relabels.items.map((l) => (
              <g key={l.key} className={`relabel relabel--${l.tone}`}>
                {l.bg && (
                  <rect
                    className="relabel__bg"
                    x={l.bg.x0.toFixed(1)}
                    y={l.bg.y0.toFixed(1)}
                    width={(l.bg.x1 - l.bg.x0).toFixed(1)}
                    height={(l.bg.y1 - l.bg.y0).toFixed(1)}
                    rx={((l.bg.y1 - l.bg.y0) / 2).toFixed(1)}
                  />
                )}
                {l.pts && (
                  <>
                    <path className="relabel__ld" d={`M${l.pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}`} />
                    <circle className="relabel__dot" cx={l.pts[0][0]} cy={l.pts[0][1]} r={(1.6 * relabels.k).toFixed(2)} />
                  </>
                )}
                <text x={l.x} y={l.y} textAnchor={l.a === 'start' ? undefined : l.a} style={{ fontSize: `${l.fs}px` }}>
                  {l.lines.map((s, i) => (
                    <tspan key={i} x={l.x} dy={i ? l.lh : 0}>
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
      {zoomable && fit && !emptyHere && (
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
