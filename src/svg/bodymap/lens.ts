// Tap resolution and the magnifier ("lens") layout for dense hotspot clusters.
//
// On a phone the home map is drawn at ~0.42–0.58 CSS px per figure unit, so anatomically placed
// hotspots (knee front / below / outer / inner, the back-of-ankle group, hip / groin, shoulder…) sit
// 11–20 px apart: closer than a fingertip. A tap is therefore resolved in two steps:
//   1. decideTap(): a tap that is clearly on one hotspot picks it straight away; a tap that could
//      belong to a neighbour as well (another hotspot within TAP.safePx, or almost as close as the
//      nearest) never guesses — it opens the lens.
//   2. layoutLens(): the lens magnifies that part of the figure (up to 4.5×) and lays the nearby
//      hotspots out as big dots with named callouts (≥ 44 px targets) in two columns.
// Both are pure functions of the placed hotspots (canvas units) and the rendered scale, so the
// rules are unit-tested (lens.test.ts) independently of the DOM.
import type { PainSpotId } from '../../data/registry';
import type { PlacedSpot } from './spots';

export const TAP = {
  /** A hotspot owns taps within this radius (CSS px) → 44 px targets. */
  hitPx: 22,
  /**
   * Direct pick only if every other hotspot (except the same spot on the other side) is farther than
   * this from the tap. Finger taps land up to ~10 px off target, so a hotspot within 12 px of the
   * tap could be the one meant: ask instead of guessing.
   */
  safePx: 12,
  /** …and farther than the nearest one by at least this much (no coin-flip between two spots). */
  gapPx: 5,
  /**
   * The same spot on the other side of the body is a rival like any other neighbour when the pair is at
   * least this far apart (canvas units) — the inner knees, the groin (15–20 px apart on a phone) — so a
   * tap between the two asks which side instead of guessing. The pairs either side of the spine (neck 22,
   * low back 28 units apart: 9–16 px) never ask: they are too close for a side to be tapped reliably, and
   * asking would add a step to the commonest spine taps; the nearer side wins there.
   */
  twinUnits: 35,
  /** The lens offers every hotspot within this radius of the tap (CSS px)… */
  lensPx: 30,
  /** …at most this many. */
  lensMax: 6,
  /** A tap on the body away from every hotspot snaps to the nearest one within these limits. */
  bodyPx: 40,
  bodyUnits: 70,
} as const;

export type TapDecision =
  | { kind: 'pick'; spot: PlacedSpot }
  /** nearest first; the first `required` ones (the nearest + every rival) must be offered */
  | { kind: 'lens'; spots: PlacedSpot[]; required: number }
  /** on the body, but no hotspot anywhere near: explain and offer the nearest places */
  | { kind: 'miss'; spots: PlacedSpot[] }
  | { kind: 'none' };

interface Ranked {
  s: PlacedSpot;
  /** distance from the tap in CSS px */
  d: number;
}

/** Nearest-first hotspots around a canvas point, with distances in CSS px. */
export function rankSpots(spots: readonly PlacedSpot[], x: number, y: number, scale: number): Ranked[] {
  return spots.map((s) => ({ s, d: Math.hypot(s.x - x, s.y - y) * scale })).sort((a, b) => a.d - b.d);
}

/**
 * What a tap at canvas point (x, y) should do. `scale` = CSS px per canvas unit; `onBody` = the tap
 * landed on the silhouette. The same spot drawn on both sides of the midline counts as a rival only
 * when the pair is TAP.twinUnits or more apart and the tap is about as close to both (inner knees,
 * groin); for the pairs either side of the spine (neck, low back) the nearer side wins.
 */
export function decideTap(
  spots: readonly PlacedSpot[],
  x: number,
  y: number,
  scale: number,
  onBody: boolean,
): TapDecision {
  const ranked = rankSpots(spots, x, y, scale);
  const a = ranked[0];
  if (!a) return { kind: 'none' };
  const others = ranked.slice(1).filter((r) => r.s.id !== a.s.id);
  const twin = ranked.find((r) => r.s.id === a.s.id && r.s.key !== a.s.key);
  const twinRival = !!twin && Math.hypot(twin.s.x - a.s.x, twin.s.y - a.s.y) >= TAP.twinUnits;
  const byDist = (list: Ranked[]) => list.sort((p, q) => p.d - q.d);
  let conflicts: Ranked[];
  if (a.d <= TAP.hitPx) {
    conflicts = others.filter((r) => r.d < TAP.safePx || r.d < a.d + TAP.gapPx);
    if (twinRival && (twin.d < TAP.safePx || twin.d < a.d + TAP.gapPx)) conflicts = byDist([...conflicts, twin]);
  } else {
    if (!onBody) return { kind: 'none' };
    if (a.d > Math.min(TAP.bodyPx, TAP.bodyUnits * scale)) {
      const seen = new Set<PainSpotId>();
      const near = ranked.filter((r) => (seen.has(r.s.id) ? false : (seen.add(r.s.id), true))).slice(0, 2);
      return { kind: 'miss', spots: near.map((r) => r.s) };
    }
    // a tap on the body just outside the hotspots: snap, unless another one is about as close
    conflicts = others.filter((r) => r.d < a.d + 2 * TAP.gapPx);
    if (twinRival && twin.d < a.d + 2 * TAP.gapPx) conflicts = byDist([...conflicts, twin]);
  }
  if (conflicts.length === 0) return { kind: 'pick', spot: a.s };
  const last = conflicts[conflicts.length - 1].d;
  const required = ranked.filter((r) => r.d <= last).length;
  const set = ranked.filter((r) => r.d <= Math.max(TAP.lensPx, last));
  return { kind: 'lens', spots: set.slice(0, Math.max(required, TAP.lensMax)).map((r) => r.s), required };
}

// ───────────────────────── lens layout ─────────────────────────

export interface LensItem {
  spot: PlacedSpot;
  /** dot position in lens px (stage coordinates) */
  px: number;
  py: number;
  col: 'left' | 'right';
  /** callout centre y and height (stage px) */
  ly: number;
  lh: number;
  /** callout text split at its line-break opportunities */
  phrases: string[];
}

export interface LensLayout {
  /** stage size (px) */
  w: number;
  h: number;
  /** lens px per canvas unit */
  m: number;
  /** canvas point shown at the stage centre */
  cx: number;
  cy: number;
  /** width of each callout column (px); a callout is at most colW − 8 wide */
  colW: number;
  /** all hotspots on one side of the body → that side (shown once in the title), else null */
  side: PlacedSpot['side'] | null;
  /** items in reading order (top → bottom, left column first on ties) */
  items: LensItem[];
}

export const LENS = {
  /** magnification limits relative to the map's own scale */
  minZoom: 2.2,
  maxZoom: 4.5,
  /** optional extra hotspots are dropped if they'd bring the zoom below this, or two dots closer than minSepPx */
  goodZoom: 3,
  minSepPx: 36,
  /** width (px) of the middle band that holds the magnified dots */
  inner: 88,
  /** padding (px) kept between the dots and the callout columns / stage edges */
  padX: 14,
  padY: 26,
  /** callouts: font size / line height (px), padding incl. border, min height, gap */
  font: 13,
  lineH: 16.25,
  padH: 8.5,
  padV: 5.5,
  minH: 44,
  gap: 6,
  /** stage margin above the first / below the last callout */
  edge: 8,
  minStageH: 184,
} as const;

/** Callout text split after の / 〜 / ・ — the only places a callout wraps (CSS word-break: keep-all). */
export function phrases(t: string): string[] {
  return t.split(/(?<=[の〜・])/u).filter(Boolean);
}

/** Lines a callout needs at content width `cw` (CJK glyphs are one em wide; an overlong phrase breaks anywhere). */
export function calloutLines(parts: readonly string[], cw: number, extraEm = 0): number {
  const perLine = Math.max(1, Math.floor(cw / LENS.font));
  let lines = 1;
  let used = 0;
  parts.forEach((p, i) => {
    let n = [...p].length + (i === parts.length - 1 ? extraEm : 0);
    if (used > 0 && used + n > perLine) {
      lines++;
      used = 0;
    }
    while (n > perLine) {
      n -= perLine - used;
      lines++;
      used = 0;
    }
    used += n;
  });
  return lines;
}

const calloutHeight = (lines: number) => Math.max(LENS.minH, Math.ceil(lines * LENS.lineH + 2 * LENS.padV));

/**
 * Callout column width: as wide as possible (≤ 140), leaving a middle band of at least LENS.inner px —
 * wider when the group needs it to magnify goodZoom× with its dots minSepPx apart (columns ≥ 92 px).
 */
function colWidth(spots: readonly PlacedSpot[], w: number, scale: number): number {
  const b = bbox(spots);
  const want = Math.min(LENS.maxZoom * scale, Math.max(LENS.goodZoom * scale, LENS.minSepPx / minGap(spots)));
  const band = Math.max(LENS.inner, (b.x1 - b.x0) * want);
  return Math.round(Math.min(140, Math.max(92, (w - band - 2 * LENS.padX) / 2)));
}
/** content width of a callout in a column of width colW */
export const calloutContentW = (colW: number) => colW - 8 - 2 * LENS.padH;

/** Stack callouts (centres) as close as possible to their targets without overlapping. */
function stack(targets: number[], hs: number[], h: number): number[] {
  const n = targets.length;
  const lo = (i: number) => LENS.edge + hs[i] / 2;
  const hi = (i: number) => h - LENS.edge - hs[i] / 2;
  const sep = (i: number) => (hs[i] + hs[i + 1]) / 2 + LENS.gap;
  const ys = targets.map((t, i) => Math.min(hi(i), Math.max(lo(i), t)));
  for (let i = 1; i < n; i++) ys[i] = Math.max(ys[i], ys[i - 1] + sep(i - 1));
  if (n && ys[n - 1] > hi(n - 1)) {
    ys[n - 1] = hi(n - 1);
    for (let i = n - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - sep(i));
  }
  if (n && ys[0] < lo(0)) {
    ys[0] = lo(0);
    for (let i = 1; i < n; i++) ys[i] = Math.max(ys[i], ys[i - 1] + sep(i - 1));
  }
  return ys;
}

function bbox(spots: readonly PlacedSpot[]) {
  const xs = spots.map((s) => s.x);
  const ys = spots.map((s) => s.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** smallest distance between two of the hotspots (canvas units) */
function minGap(spots: readonly PlacedSpot[]): number {
  let g = Infinity;
  for (let i = 0; i < spots.length; i++)
    for (let j = i + 1; j < spots.length; j++) g = Math.min(g, Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y));
  return g;
}

function fitZoom(spots: readonly PlacedSpot[], w: number, h: number, colW: number) {
  const b = bbox(spots);
  const innerW = w - 2 * colW - 2 * LENS.padX;
  const innerH = h - 2 * LENS.padY;
  return Math.min(innerW / Math.max(1, b.x1 - b.x0), innerH / Math.max(1, b.y1 - b.y0));
}

/**
 * Lay out a lens with a stage `w` px wide for these hotspots (nearest to the tap first), given the
 * map's scale (px per unit). The hotspots' bounding box is magnified into the middle band of the
 * stage; callouts sit in a column on each side, stacked in the dots' vertical order so leader lines
 * don't cross. Optional extras beyond the first `required` hotspots are dropped (farthest first) if
 * they would spread the group too wide to magnify at least LENS.minZoom×.
 */
export function layoutLens(all: readonly PlacedSpot[], w: number, scale: number, required = all.length): LensLayout {
  // extras are context, not worth shrinking the view for: keep them only while the group still
  // magnifies ≥ goodZoom× with every pair of dots ≥ minSepPx apart
  const roomy = (set: readonly PlacedSpot[]) => {
    const m = Math.min(LENS.maxZoom * scale, fitZoom(set, w, LENS.minStageH, colWidth(set, w, scale)));
    return m >= LENS.goodZoom * scale && minGap(set) * m >= LENS.minSepPx;
  };
  let spots = all.slice();
  while (spots.length > Math.max(1, required) && !roomy(spots)) spots = spots.slice(0, -1);
  const colW = colWidth(spots, w, scale);
  const cw = calloutContentW(colW);
  const sides = new Set(spots.map((s) => s.side));
  const side = sides.size === 1 ? spots[0].side : null;

  // columns: left of centre → left, right of centre → right, the ones on the centre line balance them
  const b = bbox(spots);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const perColumn = Math.ceil(spots.length / 2);
  const EPS = 0.5;
  type P = { spot: PlacedSpot };
  const left: P[] = spots.filter((s) => s.x < cx - EPS).map((spot) => ({ spot }));
  const right: P[] = spots.filter((s) => s.x > cx + EPS).map((spot) => ({ spot }));
  const mid = spots.filter((s) => Math.abs(s.x - cx) <= EPS).sort((a, c) => a.y - c.y);
  for (const spot of mid) (left.length <= right.length ? left : right).push({ spot });
  // keep the columns balanced (≤ perColumn each): move the most central dots across
  const rebalance = (from: P[], to: P[], dir: 1 | -1) => {
    while (from.length > perColumn) {
      from.sort((a, c) => dir * (a.spot.x - c.spot.x));
      to.push(from.pop()!);
    }
  };
  rebalance(left, right, 1);
  rebalance(right, left, -1);

  const callout = (s: PlacedSpot) => {
    const parts = phrases(shortLabel(s));
    return { parts, lh: calloutHeight(calloutLines(parts, cw, side ? 0 : 1.6)) };
  };
  const colH = (list: P[]) => list.reduce((a, p) => a + callout(p.spot).lh, 0) + Math.max(0, list.length - 1) * LENS.gap;
  const h = Math.ceil(Math.max(LENS.minStageH, colH(left) + 2 * LENS.edge, colH(right) + 2 * LENS.edge));
  // never more than the group fits (dots must stay clear of the callout columns)
  const m = Math.min(LENS.maxZoom * scale, fitZoom(spots, w, h, colW));
  const at = (s: PlacedSpot) => ({ px: w / 2 + (s.x - cx) * m, py: h / 2 + (s.y - cy) * m });

  const items: LensItem[] = [];
  for (const [col, list] of [
    ['left', left],
    ['right', right],
  ] as const) {
    const placed = list.map((p) => ({ spot: p.spot, ...at(p.spot), ...callout(p.spot) })).sort((a, c) => a.py - c.py);
    const lys = stack(
      placed.map((p) => p.py),
      placed.map((p) => p.lh),
      h,
    );
    placed.forEach((p, i) => items.push({ spot: p.spot, px: p.px, py: p.py, col, ly: lys[i], lh: p.lh, phrases: p.parts }));
  }
  items.sort((a, c) => a.ly - c.ly || (a.col === 'left' ? -1 : 1));
  return { w, h, m, cx, cy, colW, side, items };
}

/** Lens item under a stage point (px), if any dot is within `maxPx`. */
export function lensItemAt(layout: LensLayout, x: number, y: number, maxPx = 30): LensItem | null {
  let best: LensItem | null = null;
  let bd = Infinity;
  for (const it of layout.items) {
    const d = Math.hypot(it.px - x, it.py - y);
    if (d < bd) {
      bd = d;
      best = it;
    }
  }
  return best && bd <= maxPx ? best : null;
}

/** Short callout text: the label without its parenthesised gloss (the full name is the accessible name). */
const SHORT: Partial<Record<PainSpotId, string>> = {
  'lowback-center': '腰・背骨のわき',
  'sit-bone': '坐骨',
  'knee-front': '膝のお皿のまわり',
};
export function shortLabel(s: Pick<PlacedSpot, 'id' | 'label'>): string {
  return SHORT[s.id] ?? (s.label.replace(/（[^）]*）/g, '').trim() || s.label);
}
