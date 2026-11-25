// Independent review harness for ALL 2D illustrations (8 region diagrams + body map).
//
//   /dev/diagrams-review.html?r=knee                 phone-width gallery of every view of a region (plain)
//   ?r=knee&m=hl                                     every condition of the region, as its condition page shows it
//   ?r=knee&m=spots | nolabels                       every view with hotspots / without labels
//   ?r=knee&v=front[&m=..][&c=<conditionId>][&part=<id>][&zoom=x,y,w,h]   one view
//   ?c=<conditionId>                                 one condition (best view, injured/involved highlights, dimOthers)
//   ?bm=front|back|sole[&labels=1][&heat=1][&sides=1] body map (pain-log tint / active spots; &sides=1 per-side entries)
//   &side=left                                       draw the left side (mirrored); with ?check=1 only that side is checked
//   &spotSide=left                                   (with m=spots) unmirrored drawing, hotspots on the person's left (central
//                                                    regions: low back, neck); &sel=<spot> marks that spot only, not tappable
//                                                    (the condition page's selected-spot marker)
//   ?check=1                                         automated contract checks (results in console + on page): parts, spots, taps,
//                                                    label & caption size (≥ 11 px on a 360 px phone), clipping, text boxes closer
//                                                    than 2 px (&gap=<px> to change), leader lines that cross / touch each other or
//                                                    run through another label or caption — rendered at the real figure widths of
//                                                    360 / 390 / 430 px phones (302 / 332 / 372 px), in the plain state and in every
//                                                    muscle-page (part selected) and condition-page state (bold labels are wider);
//                                                    every view also for side=left: the same checks, plus the left drawing must be
//                                                    the mirror image of the right one (parts, hotspots, label boxes), no text drawn
//                                                    mirrored, and every 右 turned into 左 (and back); and every view with
//                                                    spotSide=left: the drawing, labels and texts unchanged, only the hotspots
//                                                    mirrored across one midline (or left in place: views without one), still
//                                                    clear of labels / captions and tappable; the marker-only mode (no
//                                                    onSpotSelect) draws just the selected spot, not focusable
//   &theme=dark|light                                force theme
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import '../src/styles/tokens.css';
import '../src/styles/base.css';
import '../src/styles/components.css';
import { MUSCLES, PAIN_SPOTS, STRUCTURES, type ConditionId, type MuscleId, type PainSpotId, type RegionId, type StructureId } from '../src/data/registry';
import { conditions, muscles, structures } from '../src/data';
import type { BodyMapProps, Highlights, RegionDiagram } from '../src/svg/types';
import { getRegionDiagram } from '../src/svg/regions';
import { bestView, findDiagramFor } from '../src/components/RegionFigure';
import BodyMapView from '../src/svg/bodymap/BodyMapView';
import { BILATERAL_REGIONS } from '../src/lib/viewerHighlights';

const q = new URLSearchParams(location.search);
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme')!;

const REGIONS: RegionId[] = ['shoulder', 'neck', 'lowback', 'hip', 'knee', 'calf', 'ankle', 'foot'];
const PRIMARY = new Set(['injured', 'irritated', 'compressed']);
const IDS = new Set<string>([...MUSCLES.map((m) => m.id), ...STRUCTURES.map((s) => s.id)]);

function conditionHighlights(cid: string): { region: RegionId; hl: Highlights; refs: string[] } | null {
  const c = conditions.find((x) => x.id === cid);
  if (!c) return null;
  const hl: Highlights = {};
  for (const i of c.involved ?? []) hl[i.ref] = PRIMARY.has(i.role) ? 'injured' : 'involved';
  return { region: c.region, hl, refs: (c.involved ?? []).map((i) => i.ref as string) };
}

const css = `
.rv { max-width: 640px; margin: 0 auto; padding: 12px 16px 40px; }
.rv h1 { font-size: 16px; margin: 4px 0 8px; }
.rv h2 { font-size: 13px; margin: 18px 0 6px; color: var(--text-2); font-weight: 700; }
.rv .cardx { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 12px; box-shadow: 0 1px 2px rgb(0 0 0 / .05); }
.rv .meta { font-size: 11px; color: var(--text-2); margin: 6px 0 0; line-height: 1.5; word-break: break-all; }
.rv .meta b { color: var(--injured); }
.rv pre { white-space: pre-wrap; font-size: 11px; line-height: 1.45; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 10px; }
.rv .bm { max-width: 390px; margin: 0 auto; }
`;

/** &side=left: draw the left side (mirrored) in every gallery / single view */
const SIDE = q.get('side') === 'left' ? 'left' : undefined;
/** &spotSide=left: hotspots on the person's left of an unmirrored drawing (RegionDiagramProps.spotSide) */
const SPOT_SIDE = q.get('spotSide') === 'left' ? 'left' : undefined;
/** &sel=<spot>: the condition page's marker — only that spot, not tappable */
const MARK = q.get('sel') as PainSpotId | null;

function View({ d, view, hl, dim, mode, zoom, onPick, condition }: { d: RegionDiagram; view: string; hl?: Highlights; dim?: boolean; mode: string; zoom?: string; onPick?: (s: string) => void; condition?: string }) {
  const C = d.Component;
  const [sel, setSel] = useState<PainSpotId | null>(null);
  const [picked, setPicked] = useState<MuscleId | StructureId | null>((q.get('part') as MuscleId | null) ?? null);
  useEffect(() => {
    if (!zoom) return;
    document.querySelectorAll('svg[viewBox]').forEach((s) => {
      if (s.closest('.cardx')) s.setAttribute('viewBox', zoom.replace(/,/g, ' '));
    });
  });
  const h: Highlights | undefined = hl ?? (picked ? { [picked]: 'selected' } : undefined);
  return (
    <C
      view={view}
      side={SIDE}
      spotSide={SPOT_SIDE}
      condition={condition as ConditionId | undefined}
      highlights={h}
      dimOthers={dim ?? !!picked}
      showLabels={mode !== 'nolabels'}
      showSpots={mode === 'spots' || !!MARK}
      selectedSpot={MARK ?? sel}
      onSpotSelect={
        MARK
          ? undefined
          : (id) => {
              setSel((c) => (c === id ? null : id));
              onPick?.(`spot ${id}`);
            }
      }
      onPartSelect={(id) => {
        if (!hl) setPicked((c) => (c === id ? null : id));
        onPick?.(`part ${id}`);
      }}
    />
  );
}

function RegionGallery({ r }: { r: RegionId }) {
  const d = getRegionDiagram(r);
  const mode = q.get('m') ?? 'plain';
  const [msg, setMsg] = useState('');
  if (!d) return <p>{r}: no diagram</p>;
  if (q.get('v')) {
    const cid = q.get('c');
    const ch = cid ? conditionHighlights(cid) : null;
    return (
      <div className="cardx">
        <View d={d} view={q.get('v')!} hl={ch?.hl} dim={ch ? true : undefined} mode={mode} zoom={q.get('zoom') ?? undefined} onPick={setMsg} condition={cid ?? undefined} />
        <p className="meta">{msg}</p>
      </div>
    );
  }
  if (mode === 'hl') {
    return (
      <>
        {conditions
          .filter((c) => c.region === r)
          .map((c) => {
            const ch = conditionHighlights(c.id)!;
            const v = bestView(d, ch.refs);
            const drawn = new Set((d.parts[v] ?? []) as string[]);
            const missing = (c.involved ?? []).filter((i) => !drawn.has(i.ref));
            return (
              <section key={c.id}>
                <h2>
                  {c.id} → {v}
                </h2>
                <div className="cardx">
                  <View d={d} view={v} hl={ch.hl} dim mode="plain" condition={c.id} />
                  <p className="meta">
                    not in view:{' '}
                    {missing.map((i) => (
                      <span key={i.ref}>{PRIMARY.has(i.role) ? <b>{i.ref}*</b> : i.ref} </span>
                    ))}
                  </p>
                </div>
              </section>
            );
          })}
      </>
    );
  }
  return (
    <>
      {d.views.map((v) => (
        <section key={v.id}>
          <h2>
            {r} · {v.id}（{v.label}）
          </h2>
          <div className="cardx">
            <View d={d} view={v.id} mode={mode} onPick={setMsg} />
          </div>
        </section>
      ))}
      <p className="meta">{msg}</p>
    </>
  );
}

function ConditionOne({ cid }: { cid: string }) {
  const ch = conditionHighlights(cid);
  if (!ch) return <p>unknown condition</p>;
  const d = getRegionDiagram(ch.region);
  if (!d) return <p>no diagram</p>;
  const v = q.get('v') ?? bestView(d, ch.refs);
  return (
    <>
      <h2>
        {cid} → {ch.region}:{v}
      </h2>
      <div className="cardx">
        <View d={d} view={v} hl={ch.hl} dim mode="plain" zoom={q.get('zoom') ?? undefined} condition={cid} />
      </div>
    </>
  );
}

/**
 * Every muscle as its muscle page shows it (findDiagramFor → selected + dimOthers). &mr=<region> only the muscles of
 * that region; &m=<id> one muscle; &all=1 every view of that region that draws it, with labels (to check the
 * 起始 / 停止 markers and their legend against the names).
 */
function MuscleGallery() {
  const only = q.get('mr');
  const one = q.get('m');
  const all = !!q.get('all');
  return (
    <>
      {muscles
        .filter((m) => (!only || m.regions[0] === only) && (!one || m.id === one))
        .map((m) => {
          const f = findDiagramFor(m.id, m.regions);
          const d = f ? getRegionDiagram(f.region) : undefined;
          const views =
            d && f ? (all ? d.views.map((v) => v.id).filter((v) => ((d.parts[v] ?? []) as string[]).includes(m.id)) : [f.view]) : [];
          return (
            <section key={m.id}>
              <h2>
                {m.id} → {f ? `${f.region}:${f.view}` : 'NONE'}
              </h2>
              {d &&
                views.map((v) => (
                  <div key={v} className="cardx" data-view={v} style={{ marginBottom: 8 }}>
                    <View d={d} view={v} hl={{ [m.id]: 'selected' } as Highlights} dim mode={all ? 'plain' : 'nolabels'} />
                  </div>
                ))}
            </section>
          );
        })}
    </>
  );
}

/**
 * &heat=1: pain-log tint on both sides (`intensity`) + `activeSpots`; &sides=1 adds per-side entries
 * (`intensitySides` / `activeSides`), which win over the both-sides ones for their spots.
 */
const BM_HEAT: Partial<Record<PainSpotId, number>> = { 'knee-outer': 9, 'achilles-mid': 7, 'heel-bottom': 8, 'shoulder-top': 5, 'calf-lower': 4 };
const BM_ACTIVE: PainSpotId[] = ['knee-front', 'ankle-outer', 'sit-bone', 'forefoot-ball', 'shoulder-back'];
const BM_HEAT_SIDES: BodyMapProps['intensitySides'] = {
  'knee-outer': { left: 6 },
  'achilles-mid': { right: 3, both: 1 },
  'heel-bottom': { left: 9 },
  'knee-front': { right: 2 },
  'lowback-center': { both: 5 },
};
const BM_ACTIVE_SIDES: BodyMapProps['activeSides'] = { 'knee-front': ['left'], 'ankle-outer': ['right'], 'forefoot-ball': ['left', 'right'] };

function BodyMapOne() {
  const view = (q.get('bm') ?? 'front') as 'front' | 'back' | 'sole';
  const [sel, setSel] = useState<{ id: PainSpotId; side: string } | null>(null);
  const heat = q.get('heat') === '1';
  const sides = q.get('sides') === '1';
  return (
    <div className="bm">
      <BodyMapView
        view={view}
        showLabels={q.get('labels') === '1'}
        selectedSpot={sel?.id ?? (q.get('sel') as PainSpotId | null)}
        onSelect={(id, side) => setSel({ id, side })}
        debugViewBox={q.get('zoom')?.replace(/,/g, ' ')}
        intensity={heat ? BM_HEAT : undefined}
        activeSpots={heat ? BM_ACTIVE : undefined}
        intensitySides={sides ? BM_HEAT_SIDES : undefined}
        activeSides={sides ? BM_ACTIVE_SIDES : undefined}
      />
      <p className="meta" id="bm-out">
        {sel ? `${sel.id} / ${sel.side}` : ''}
      </p>
    </div>
  );
}

/* ─────────────────────────────── automated checks ─────────────────────────────── */

/**
 * CSS width of a region figure on 360 / 390 / 430 px phones: viewport − 2 × 16 px gutters − 2 × 12 px card padding
 * − 2 × 1 px card border (`.figure` in components.css; measured in the app). Layout checks render the diagrams at each
 * of these widths, because text rounds differently per width: boxes that are clear at 332 px can touch at 302 px.
 */
const PHONES = [
  { phone: 360, fig: 302 },
  { phone: 390, fig: 332 },
  { phone: 430, fig: 372 },
] as const;
/** Smallest text in a figure on a 360 px phone (labels and captions). */
const MIN_PX_360 = 11;
/** Largest label text on the 390 px reference phone. */
const MAX_PX_390 = 13.5;
/** Clear gap (CSS px) required between two text boxes; boxes that touch read as one label. `&gap=` overrides it. */
const GAP = q.get('gap') ? parseFloat(q.get('gap')!) : 2;
/** How far (CSS px) a leader line may run into the edge of another text box before it counts as running through it. */
const EDGE = 1.5;

/** Boxes overlap or come closer than `gap` px. */
const tooClose = (a: DOMRect, c: DOMRect, gap = GAP) =>
  a.left < c.right + gap && c.left < a.right + gap && a.top < c.bottom + gap && c.top < a.bottom + gap;

type Seg = readonly [number, number, number, number];
const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
/** Proper crossing of two segments (touching end points do not count). */
function segsCross(p: Seg, s: Seg): boolean {
  const d1 = orient(s[0], s[1], s[2], s[3], p[0], p[1]);
  const d2 = orient(s[0], s[1], s[2], s[3], p[2], p[3]);
  const d3 = orient(p[0], p[1], p[2], p[3], s[0], s[1]);
  const d4 = orient(p[0], p[1], p[2], p[3], s[2], s[3]);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
function ptSeg(x: number, y: number, s: Seg): number {
  const dx = s[2] - s[0];
  const dy = s[3] - s[1];
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (y - s[1]) * dy) / l2));
  return Math.hypot(x - s[0] - t * dx, y - s[1] - t * dy);
}
/** Shortest distance between two segments. */
const segDist = (p: Seg, s: Seg) =>
  segsCross(p, s) ? 0 : Math.min(ptSeg(p[0], p[1], s), ptSeg(p[2], p[3], s), ptSeg(s[0], s[1], p), ptSeg(s[2], s[3], p));
/** Segment runs through the box shrunk by `e` px on every side. */
function segInBox(s: Seg, b: DOMRect, e = EDGE): boolean {
  const l = b.left + e;
  const r = b.right - e;
  const t = b.top + e;
  const bt = b.bottom - e;
  if (l >= r || t >= bt) return false;
  const inside = (x: number, y: number) => x > l && x < r && y > t && y < bt;
  if (inside(s[0], s[1]) || inside(s[2], s[3])) return true;
  const edges: Seg[] = [
    [l, t, r, t],
    [r, t, r, bt],
    [r, bt, l, bt],
    [l, bt, l, t],
  ];
  return edges.some((g) => segsCross(s, g));
}

interface LabInfo {
  t: string;
  /** text box (CSS px, client coordinates) */
  b: DOMRect;
  /** leader line segments (CSS px, client coordinates) */
  segs: Seg[];
}

/** Labels currently drawn in `host`: text box and leader line (`.ld`, a polyline "M x y L x y [L x y]"). */
function labelInfo(host: HTMLElement): (LabInfo & { el: SVGTextElement })[] {
  return [...host.querySelectorAll<SVGTextElement>('[class*="-lab"] text')].map((el) => {
    const ld = el.parentElement?.querySelector<SVGPathElement>(':scope > .ld');
    const segs: Seg[] = [];
    const m = ld?.getScreenCTM();
    if (ld && m) {
      const n = (ld.getAttribute('d') ?? '').match(/-?\d*\.?\d+(?:e-?\d+)?/g)?.map(Number) ?? [];
      const pts: DOMPoint[] = [];
      for (let i = 0; i + 1 < n.length; i += 2) pts.push(new DOMPoint(n[i], n[i + 1]).matrixTransform(m));
      for (let i = 0; i + 1 < pts.length; i++) segs.push([pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y]);
    }
    return { el, t: (el.textContent ?? '').replace(/\s+/g, ''), b: el.getBoundingClientRect(), segs };
  });
}

/**
 * Geometry checks of the labels, captions (view titles, inset titles / notes), leader lines and hotspots currently
 * rendered in `host` at the figure width of a `phone` px phone.
 */
function layoutIssues(host: HTMLElement, tag: string, phone: number, sEls: SVGGElement[] = []): string[] {
  const out: string[] = [];
  const svg = host.querySelector('svg')!;
  const rect = svg.getBoundingClientRect();
  const vbW = svg.viewBox.baseVal.width;
  const px = (el: Element) => parseFloat(getComputedStyle(el).fontSize) * (rect.width / vbW);
  const inside = (b: DOMRect) => b.left >= rect.left - 0.5 && b.right <= rect.right + 0.5 && b.top >= rect.top - 0.5 && b.bottom <= rect.bottom + 0.5;
  const labs = labelInfo(host);
  for (const { el, t, b } of labs) {
    if (!inside(b)) out.push(`${tag}: label "${t}" clipped`);
    const s = px(el);
    if (phone === 360 && s < MIN_PX_360) out.push(`${tag}: label "${t}" is ${s.toFixed(2)} px (< ${MIN_PX_360})`);
    if (phone === 390 && s > MAX_PX_390) out.push(`${tag}: label "${t}" is ${s.toFixed(2)} px (> ${MAX_PX_390})`);
  }
  const capEls = [...host.querySelectorAll<SVGTextElement>('.cap-t, .note-t')];
  const caps = capEls.map((t) => ({ t: t.textContent ?? '', b: t.getBoundingClientRect() }));
  capEls.forEach((el, i) => {
    const c = caps[i];
    if (!inside(c.b)) out.push(`${tag}: caption "${c.t}" clipped`);
    const s = px(el);
    if (phone === 360 && s < MIN_PX_360) out.push(`${tag}: caption "${c.t}" is ${s.toFixed(2)} px (< ${MIN_PX_360})`);
    for (const { t, b } of labs) if (tooClose(b, c.b)) out.push(`${tag}: label "${t}" touches caption "${c.t}"`);
  });
  for (let i = 0; i < caps.length; i++)
    for (let j = i + 1; j < caps.length; j++) if (tooClose(caps[i].b, caps[j].b)) out.push(`${tag}: captions "${caps[i].t}" / "${caps[j].t}" touch`);
  for (let i = 0; i < labs.length; i++)
    for (let j = i + 1; j < labs.length; j++) if (tooClose(labs[i].b, labs[j].b)) out.push(`${tag}: "${labs[i].t}" touches "${labs[j].t}"`);
  // leader lines: no two cross or touch, none runs through another label or a caption
  for (let i = 0; i < labs.length; i++) {
    const a = labs[i];
    for (let j = i + 1; j < labs.length; j++) {
      const c = labs[j];
      let d = Infinity;
      for (const s of a.segs) for (const g of c.segs) d = Math.min(d, segDist(s, g));
      if (d === 0) out.push(`${tag}: leaders "${a.t}" × "${c.t}" cross`);
      else if (d < 1.5) out.push(`${tag}: leaders "${a.t}" / "${c.t}" touch (${d.toFixed(1)} px)`);
    }
    for (const c of labs) if (c !== a && a.segs.some((s) => segInBox(s, c.b))) out.push(`${tag}: leader of "${a.t}" runs through label "${c.t}"`);
    for (const c of caps) if (a.segs.some((s) => segInBox(s, c.b))) out.push(`${tag}: leader of "${a.t}" runs through caption "${c.t}"`);
  }
  for (const e of sEls) {
    const b = e.getBoundingClientRect();
    const c = new DOMRect(b.x + b.width / 2 - 8, b.y + b.height / 2 - 8, 16, 16);
    for (const { t, b: lb } of labs) if (tooClose(lb, c, 0)) out.push(`${tag}: hotspot ${e.getAttribute('data-spot')} sits on label "${t}"`);
    for (const { t, b: cb } of caps) if (tooClose(cb, c, 0)) out.push(`${tag}: hotspot ${e.getAttribute('data-spot')} sits on caption "${t}"`);
  }
  return out;
}

/** Sides every view is checked on (&side=right / &side=left: only that one). */
const SIDES = (q.get('side') ? [q.get('side')] : ['right', 'left']) as ('right' | 'left')[];

type Box = [number, number, number, number];
interface Geom {
  /** svg width (CSS px) */
  w: number;
  /** part id → union box of its drawing, relative to the svg's top-left */
  parts: Map<string, Box>;
  /** hotspot id → centre */
  spots: Map<string, [number, number]>;
  /** label texts and text boxes, in drawing order */
  labels: { t: string; b: Box }[];
  /** every text drawn (title, captions, labels, notes) */
  text: string;
  /** texts drawn mirrored (their screen transform flips x) */
  flipped: string[];
}

/** Where the parts, hotspots and labels of the diagram in `host` are (for the left / right mirror comparison). */
function mirrorGeom(host: HTMLElement): Geom {
  const svg = host.querySelector('svg')!;
  const R = svg.getBoundingClientRect();
  const rel = (b: DOMRect): Box => [b.left - R.left, b.top - R.top, b.right - R.left, b.bottom - R.top];
  const parts = new Map<string, Box>();
  for (const el of svg.querySelectorAll<SVGGElement>('[data-part]')) {
    if (el.closest('.thk-lesion')) continue; // lesion overlay layer: same id, drawn over other parts
    const b = el.getBoundingClientRect();
    if (!b.width && !b.height) continue;
    const id = el.getAttribute('data-part')!;
    const o = parts.get(id);
    const n = rel(b);
    parts.set(id, o ? [Math.min(o[0], n[0]), Math.min(o[1], n[1]), Math.max(o[2], n[2]), Math.max(o[3], n[3])] : n);
  }
  const spots = new Map<string, [number, number]>();
  for (const el of svg.querySelectorAll<SVGGElement>('[data-spot]')) {
    const b = rel(el.querySelector('.s-dot')!.getBoundingClientRect());
    spots.set(el.getAttribute('data-spot')!, [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]);
  }
  const labels = [...svg.querySelectorAll<SVGTextElement>('[class*="-lab"] text')].map((t) => ({ t: t.textContent ?? '', b: rel(t.getBoundingClientRect()) }));
  const texts = [...svg.querySelectorAll<SVGTextElement>('text')];
  const flipped = texts.filter((t) => (t.getScreenCTM()?.a ?? 1) < 0).map((t) => `"${t.textContent}"`);
  const text = [svg.getAttribute('aria-label') ?? '', svg.querySelector(':scope > title')?.textContent ?? '', ...texts.map((t) => t.textContent ?? '')].join('|');
  return { w: R.width, parts, spots, labels, text, flipped };
}

const count = (s: string, c: string) => s.split(c).length - 1;
/** The left-side drawing `L` against the right side's `R`: everything mirrored (x → w − x), texts say 左 for 右. */
function mirrorIssues(tag: string, R: Geom, L: Geom): string[] {
  const out: string[] = [];
  const TOL = 1.5;
  const mx = (b: Box): Box => [R.w - b[2], b[1], R.w - b[0], b[3]];
  const off = (a: Box, b: Box) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  for (const [id, b] of R.parts) {
    const l = L.parts.get(id);
    if (!l) out.push(`${tag}: part ${id} missing on the left side`);
    else if (off(mx(b), l) > TOL) out.push(`${tag}: part ${id} not mirrored (${off(mx(b), l).toFixed(1)} px off)`);
  }
  for (const [id, c] of R.spots) {
    const l = L.spots.get(id);
    if (!l || Math.hypot(R.w - c[0] - l[0], c[1] - l[1]) > TOL) out.push(`${tag}: hotspot ${id} not mirrored`);
  }
  if (R.labels.length !== L.labels.length) out.push(`${tag}: ${L.labels.length} labels on the left side, ${R.labels.length} on the right`);
  R.labels.forEach((rl, i) => {
    const ll = L.labels[i];
    if (!ll) return;
    // the text box itself sits at the mirrored place (± glyph overhang; names that reach the frame's edge are kept
    // inside it by up to 3 units)
    if (off(mx(rl.b), ll.b) > 3) out.push(`${tag}: label "${rl.t}" not at its mirrored place (${off(mx(rl.b), ll.b).toFixed(1)} px off)`);
  });
  // every text says 左 where the right side's says 右 (and the other way round)
  if (count(L.text, '左') !== count(R.text, '右') || count(L.text, '右') !== count(R.text, '左'))
    out.push(`${tag}: texts not flipped to the left side (右 ${count(R.text, '右')}→左 ${count(L.text, '左')}, 左 ${count(R.text, '左')}→右 ${count(L.text, '右')})`);
  return out;
}

/** Texts and emphasis (bold labels are wider) of the labels and captions currently drawn. */
const textKey = (host: HTMLElement) =>
  [...host.querySelectorAll('[class*="-lab"] text, .cap-t, .note-t')]
    .map((t) => `${t.textContent}${/is-hl/.test(t.parentElement?.getAttribute('class') ?? '') ? '*' : ''}`)
    .join('|');

function runChecks(): string[] {
  const out: string[] = [];
  /** layout issue → the states (plain / part selected / condition) it shows up in */
  const layout = new Map<string, string[]>();
  const note = (msgs: string[], state: string) => {
    for (const m of new Set(msgs)) {
      const s = layout.get(m);
      if (!s) layout.set(m, [state]);
      else if (!s.includes(state)) s.push(state);
    }
  };
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden';
  document.body.appendChild(host);
  const noAnim = document.createElement('style');
  noAnim.textContent = '* { transition: none !important; animation: none !important; }';
  document.head.appendChild(noAnim);
  const root = createRoot(host);
  const render = (el: React.ReactNode) => flushSync(() => root.render(el));
  const rightGeom = new Map<string, Geom>();
  /** regions with a view whose hotspots move with spotSide='left' */
  const spotSideMoved = new Set<RegionId>();

  PHONES.forEach(({ phone, fig }, wi) => {
    host.style.width = `${fig}px`;
    const first = wi === 0;
    for (const r of REGIONS) {
      const d = getRegionDiagram(r);
      if (!d) {
        if (first) out.push(`${r}: NO DIAGRAM`);
        continue;
      }
      const C = d.Component;
      const allDrawn = new Set<string>();
      const allSpots = new Set<string>();
      for (const v of d.views)
      for (const side of SIDES) {
        // side=left: the same view mirrored (labels, captions and hotspots placed for the left side)
        const sx = side === 'left' ? ({ side: 'left' } as const) : {};
        const vtag = `${r}:${v.id}${side === 'left' ? '[左]' : ''}`;
        const tag = `${vtag}@${phone}`;
        let tapped: string[] = [];
        render(
          <C
            view={v.id}
            {...sx}
            showSpots
            onSpotSelect={(id) => tapped.push(`s:${id}`)}
            onPartSelect={(id) => tapped.push(`p:${id}`)}
          />,
        );
        const svg = host.querySelector('svg')!;
        const rect = svg.getBoundingClientRect();
        if (Math.abs(rect.width - fig) > 1) out.push(`${tag}: svg width ${rect.width.toFixed(0)} (expected ${fig})`);
        const drawn = new Set([...host.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part')!));
        const sEls = [...host.querySelectorAll<SVGGElement>('[data-spot]')];
        if (first) {
          if (!svg.getAttribute('viewBox')) out.push(`${vtag}: svg without viewBox`);
          if (!svg.querySelector(':scope > title') && !svg.getAttribute('aria-label')) out.push(`${vtag}: svg without title/aria-label`);
          // parts
          const declared = new Set((d.parts[v.id] ?? []) as string[]);
          for (const id of drawn) {
            allDrawn.add(id);
            if (!IDS.has(id)) out.push(`${vtag}: data-part "${id}" NOT IN REGISTRY`);
            if (!declared.has(id)) out.push(`${vtag}: draws ${id} but parts[] does not list it`);
          }
          for (const id of declared) if (!drawn.has(id)) out.push(`${vtag}: parts[] lists ${id} but view does not draw it`);
          // spots
          const sd = new Set(sEls.map((e) => e.getAttribute('data-spot')!));
          const sdec = new Set((d.spots[v.id] ?? []) as string[]);
          for (const id of sd) {
            allSpots.add(id);
            if (!sdec.has(id)) out.push(`${vtag}: hotspot ${id} not in spots[]`);
          }
          for (const id of sdec) if (!sd.has(id)) out.push(`${vtag}: spots[] lists ${id} but no hotspot drawn`);
          // touch targets on the smallest phone
          for (const e of sEls) {
            const b = e.getBoundingClientRect();
            if (b.width < 40 || b.height < 40) out.push(`${tag}: hotspot ${e.getAttribute('data-spot')} touch target ${b.width.toFixed(0)}×${b.height.toFixed(0)} px (<40)`);
          }
          // hotspots too close together → ambiguous taps
          const cs = sEls.map((e) => {
            const b = e.getBoundingClientRect();
            return { id: e.getAttribute('data-spot'), x: b.x + b.width / 2, y: b.y + b.height / 2 };
          });
          for (let i = 0; i < cs.length; i++)
            for (let j = i + 1; j < cs.length; j++) {
              const dd = Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y);
              if (dd < 34) out.push(`${tag}: hotspots ${cs[i].id} / ${cs[j].id} only ${dd.toFixed(0)} px apart`);
            }
        }
        // labels, captions, leaders, hotspots: size / clipping / overlaps / crossings
        note(layoutIssues(host, tag, phone, sEls), 'plain');
        if (first) {
          // left side: the drawing is the mirror image of the right side's, every text reads normally and says 左 for 右
          const g = mirrorGeom(host);
          const rg = rightGeom.get(`${r}:${v.id}`);
          if (side === 'right') rightGeom.set(`${r}:${v.id}`, g);
          else if (rg) out.push(...mirrorIssues(vtag, rg, g));
          if (g.flipped.length) out.push(`${vtag}: mirrored text ${g.flipped.slice(0, 3).join(', ')}`);
        }
        if (first) {
          // taps
          tapped = [];
          for (const e of sEls) e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          const st = tapped.filter((x) => x.startsWith('s:')).map((x) => x.slice(2));
          if (st.join() !== sEls.map((e) => e.getAttribute('data-spot')).join()) out.push(`${vtag}: onSpotSelect mismatch ${st.join()}`);
          for (const id of drawn) {
            tapped = [];
            const el = host.querySelector(`[data-part="${id}"]`)!;
            const target = el.querySelector('path, ellipse, circle, rect') ?? el;
            target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            if (tapped[0] !== `p:${id}`) out.push(`${vtag}: tapping ${id} → ${tapped.join() || 'nothing'}`);
          }
        }
        // states that add labels / insets or embolden labels (muscle page: part selected + dimOthers;
        // condition page: highlights + dimOthers). States with the same texts & emphasis share one measurement.
        render(<C view={v.id} {...sx} />);
        const seen = new Map<string, string[]>([[textKey(host), layoutIssues(host, tag, phone)]]);
        const states: [string, Highlights, ConditionId?][] = [...drawn].map((id) => [`${id} selected`, { [id]: 'selected' } as Highlights]);
        for (const c of conditions.filter((c) => c.region === r)) states.push([`condition ${c.id}`, conditionHighlights(c.id)!.hl, c.id as ConditionId]);
        for (const [name, hl, cid] of states) {
          render(<C view={v.id} {...sx} highlights={hl} condition={cid} dimOthers />);
          const key = textKey(host);
          if (!seen.has(key)) seen.set(key, layoutIssues(host, tag, phone));
          note(seen.get(key)!, name);
        }
        if (first) {
          // showLabels=false hides labels; showSpots=false hides spots
          render(<C view={v.id} {...sx} showLabels={false} />);
          if (host.querySelectorAll('[class*="-lab"] text').length) out.push(`${vtag}: labels still drawn with showLabels=false`);
          if (host.querySelectorAll('[data-spot]').length) out.push(`${vtag}: hotspots drawn without showSpots`);
          // highlight + dim
          const f = [...drawn][0];
          if (f) {
            render(<C view={v.id} {...sx} highlights={{ [f]: 'injured' } as Highlights} dimOthers />);
            const el = host.querySelector(`[data-part="${f}"]`)!;
            if (!/injured/.test(el.getAttribute('class') ?? '')) out.push(`${vtag}: injured class missing on ${f}`);
            const others = [...host.querySelectorAll('[data-part]')].filter((e) => e.getAttribute('data-part') !== f);
            const notDim = others.filter((e) => parseFloat(getComputedStyle(e).opacity) > 0.4);
            if (notDim.length) out.push(`${vtag}: dimOthers leaves ${notDim.length} parts undimmed (${[...new Set(notDim.map((e) => e.getAttribute('data-part')))].slice(0, 4).join(',')})`);
          }
        }
      }
      // spotSide=left (central regions drawn unmirrored): only the hotspots move, across one midline
      for (const v of d.views) {
        const vtag = `${r}:${v.id}[spotSide 左]`;
        const tag = `${vtag}@${phone}`;
        let tapped: string[] = [];
        const on = (id: PainSpotId) => tapped.push(id);
        render(<C view={v.id} showSpots onSpotSelect={on} />);
        const base = mirrorGeom(host);
        render(<C view={v.id} showSpots onSpotSelect={on} spotSide="left" />);
        const g = mirrorGeom(host);
        const sEls = [...host.querySelectorAll<SVGGElement>('[data-spot]')];
        note(layoutIssues(host, tag, phone, sEls), 'plain');
        if (!first) continue;
        const off = (a: Box, b: Box) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));
        for (const [id, b] of base.parts) if (!g.parts.has(id) || off(b, g.parts.get(id)!) > 0.5) out.push(`${vtag}: part ${id} moved`);
        if (base.text !== g.text || JSON.stringify(base.labels) !== JSON.stringify(g.labels)) out.push(`${vtag}: labels / texts changed`);
        const mids = [...base.spots].map(([id, c]) => ({ id, moved: Math.abs(g.spots.get(id)![0] - c[0]) > 0.5, mid: (g.spots.get(id)![0] + c[0]) / 2, dy: g.spots.get(id)![1] - c[1] }));
        if (mids.some((m) => Math.abs(m.dy) > 0.5)) out.push(`${vtag}: hotspots moved vertically`);
        const moved = mids.filter((m) => m.moved);
        if (moved.length && moved.length !== mids.length) out.push(`${vtag}: only some hotspots moved (${moved.map((m) => m.id).join(',')})`);
        if (moved.length && Math.max(...moved.map((m) => m.mid)) - Math.min(...moved.map((m) => m.mid)) > 0.5) out.push(`${vtag}: hotspots mirrored across different lines`);
        if (moved.length && (moved[0].mid < 0.3 * g.w || moved[0].mid > 0.7 * g.w)) out.push(`${vtag}: hotspots mirrored across x ${moved[0].mid.toFixed(0)} (not the body's midline)`);
        if (moved.length) spotSideMoved.add(r);
        const svgR = host.querySelector('svg')!.getBoundingClientRect();
        for (const [id, c] of g.spots) if (c[0] < 12 || c[0] > svgR.width - 12 || c[1] < 12 || c[1] > svgR.height - 12) out.push(`${vtag}: hotspot ${id} at the frame edge / outside it`);
        // still tappable, each to its own spot
        tapped = [];
        for (const e of sEls) e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (tapped.join() !== sEls.map((e) => e.getAttribute('data-spot')).join()) out.push(`${vtag}: onSpotSelect mismatch ${tapped.join()}`);
        for (const e of sEls) {
          const b = e.getBoundingClientRect();
          if (b.width < 40 || b.height < 40) out.push(`${vtag}: hotspot ${e.getAttribute('data-spot')} touch target ${b.width.toFixed(0)}×${b.height.toFixed(0)} px (<40)`);
        }
        // side='left' mirrors the whole drawing: spotSide adds nothing then
        render(<C view={v.id} showSpots onSpotSelect={on} side="left" />);
        const l1 = host.innerHTML;
        render(<C view={v.id} showSpots onSpotSelect={on} side="left" spotSide="left" />);
        if (host.innerHTML !== l1) out.push(`${vtag}: spotSide changes a mirrored (side=left) drawing`);
        // marker only (no onSpotSelect: the condition page): just the selected spot, at its spotSide place, not focusable
        for (const s of (d.spots[v.id] ?? []) as PainSpotId[]) {
          render(<C view={v.id} showSpots selectedSpot={s} spotSide="left" />);
          const m = [...host.querySelectorAll<SVGGElement>('[data-spot]')];
          const want = g.spots.get(s);
          const got = m[0] && mirrorGeom(host).spots.get(s);
          if (m.length !== 1 || m[0].getAttribute('data-spot') !== s) out.push(`${vtag}: marker for ${s} draws ${m.map((e) => e.getAttribute('data-spot')).join(',') || 'nothing'}`);
          else if (m[0].getAttribute('role') || m[0].getAttribute('tabindex') || m[0].getAttribute('aria-hidden') !== 'true' || !m[0].classList.contains('is-sel'))
            out.push(`${vtag}: marker for ${s} is tappable / focusable / not selected`);
          else if (!want || !got || Math.hypot(want[0] - got[0], want[1] - got[1]) > 0.5) out.push(`${vtag}: marker for ${s} not where its hotspot is`);
        }
        render(<C view={v.id} showSpots />);
        if (host.querySelectorAll('[data-spot]').length) out.push(`${vtag}: marker drawn with no selected spot`);
      }
      if (!first) continue;
      // spotSide works for the central regions (and only there)
      if (BILATERAL_REGIONS.has(r) !== spotSideMoved.has(r)) out.push(`${r}: spotSide ${spotSideMoved.has(r) ? 'moves hotspots of a mirrored region' : 'moves no hotspot of a central region'}`);
      // region completeness
      for (const s of PAIN_SPOTS.filter((s) => s.region === r)) if (!allSpots.has(s.id)) out.push(`${r}: pain spot ${s.id} unreachable`);
      for (const s of structures.filter((s) => s.regions?.[0] === r)) if (!allDrawn.has(s.id)) out.push(`${r}: structure ${s.id} (${s.nameJa}) not drawn in any view`);
      for (const m of muscles.filter((m) => m.regions?.[0] === r)) if (!allDrawn.has(m.id)) out.push(`${r}: primary muscle ${m.id} not drawn in any view`);
      for (const c of conditions.filter((c) => c.region === r)) {
        const ch = conditionHighlights(c.id)!;
        const v = bestView(d, ch.refs);
        const p = new Set((d.parts[v] ?? []) as string[]);
        const miss = (c.involved ?? []).filter((i) => PRIMARY.has(i.role) && !p.has(i.ref)).map((i) => i.ref);
        if (miss.length) out.push(`${r}: condition ${c.id} → ${v}: PRIMARY not shown: ${miss.join(', ')}`);
      }
    }
  });
  for (const [m, s] of layout) {
    const plain = s.includes('plain');
    const rest = s.filter((x) => x !== 'plain');
    out.push(
      plain && !rest.length
        ? m
        : `${m}  [${plain ? 'plain + ' : ''}${rest.length} state(s): ${rest.slice(0, 2).join(', ')}${rest.length > 2 ? ', …' : ''}]`,
    );
  }
  root.unmount();
  host.remove();
  noAnim.remove();
  return out;
}

function Checks() {
  const [res, setRes] = useState<string[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const r = runChecks();
      setRes(r);
      console.warn(r.length ? `CHECKS: ${r.length} issue(s)\n${r.join('\n')}` : 'CHECKS: all ok');
    }, 200);
    return () => clearTimeout(t);
  }, []);
  return <pre>{res ? (res.length ? res.join('\n') : 'all ok') : 'running…'}</pre>;
}

function App() {
  const r = q.get('r') as RegionId | null;
  return (
    <div className="rv">
      <style>{css}</style>
      {q.get('check') ? (
        <Checks />
      ) : q.get('muscles') ? (
        <MuscleGallery />
      ) : q.get('bm') ? (
        <BodyMapOne />
      ) : q.get('c') && !r ? (
        <ConditionOne cid={q.get('c')!} />
      ) : r ? (
        <RegionGallery r={r} />
      ) : (
        <ul>
          {REGIONS.map((x) => (
            <li key={x}>
              <a href={`?r=${x}`}>{x}</a> · <a href={`?r=${x}&m=hl`}>conditions</a> · <a href={`?r=${x}&m=spots`}>spots</a>
            </li>
          ))}
          <li>
            <a href="?check=1">checks</a>
          </li>
        </ul>
      )}
    </div>
  );
}

// one root per page, also when HMR re-runs this module
const rootEl = document.getElementById('root') as HTMLElement & { __root?: ReturnType<typeof createRoot> };
rootEl.__root ??= createRoot(rootEl);
rootEl.__root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
