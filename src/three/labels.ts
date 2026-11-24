// Floating HTML labels (Japanese names) with thin leader lines, laid out in the FREE space around the figure.
//
// Layout (per rendered frame, allocation-free):
//  1. The figure's silhouette (skin primitives) and the highlighted anatomy (strand control polylines) are
//     rasterised into a coarse screen grid (ScreenMask, 6 px cells) with summed-area tables, so "how much of
//     this rectangle covers the body / the highlighted muscles" is O(1).
//  2. Labels are placed greedily in priority order (major tier first). Each label scores ~250 candidate
//     rectangles around its anchor (left / right at several distances, the card margins, above / below) by:
//     body overlap, highlighted-anatomy overlap, leader length, leader crossings, covering other dots, and the
//     distance from its previous target (temporal coherence = hysteresis). UI zones (phase pill, legend,
//     player bar, reset button) and already placed labels are forbidden.
//  3. Displayed positions follow the targets with exponential smoothing (no frame-to-frame jumps).
// Minor labels (secondary / involved) that cannot be placed well over the whole clip are collapsed into a
// small 「+N」 chip (decided once per view by a pre-pass, see planBegin / planFrame / planEnd); tapping the chip
// shows them all.
import { Matrix4, type PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { type CompiledPoint, evalPoint } from './landmarks';
import { type RigState, SKIN_PRIMS } from './rig';

export interface LabelSpec {
  key: string;
  text: string;
  color: string;
  /** 0 = major (injured / selected / primary): full pill, never collapsed.
   *  1 = minor (involved / secondary): smaller & lighter, may be collapsed into 「+N」 when space is short. */
  tier: 0 | 1;
}

/** A highlighted part for the overlap mask: polyline through control points (world) with a radius (m). */
export interface MaskCord {
  cps: CompiledPoint[];
  r: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What the player UI shows — used to estimate the UI zones before React has rendered them. */
export interface UiGuess {
  bar: boolean;
  float: boolean;
  /** estimated width of the phase pill (0 = none) */
  phaseW: number;
  legend: boolean;
}

interface Item extends LabelSpec {
  el: HTMLDivElement;
  line: SVGLineElement;
  dot: SVGCircleElement;
  w: number;
  h: number;
  world: Vector3;
  has: boolean;
  /** anchor on screen */
  sx: number;
  sy: number;
  /** target / displayed label position (top-left) */
  tx: number;
  ty: number;
  dx: number;
  dy: number;
  /** a previous target exists (coherence) */
  placed: boolean;
  shown: boolean;
  collapsed: boolean;
  /** placement quality of the last solve */
  ovS: number;
  ovA: number;
  ok: boolean;
  lead: number;
  /** pre-pass statistics */
  bad: number;
  seen: number;
  /** per-frame flags */
  inVis: boolean;
  committed: boolean;
}

const SVGNS = 'http://www.w3.org/2000/svg';
const PAD = 6;
const GAP = 3;
const CELL = 6;
/** candidate distances from the anchor (px) */
const DIST = [10, 22, 38, 58, 84, 118, 160];
/** vertical candidate offsets in multiples of (h/2 + 2) */
const VSTEP = [0, -1, 1, -2, 2, -3, 3, -4, 4, -6, 6, -8, 8];
const ABOVE = [10, 22, 38, 58, 84];
// mirrors viewer.css (.tb3d-bar: left/right/bottom 8, 48 px tall; .tb3d-float 44 px at right/bottom 8;
// .tb3d-phase / .tb3d-legend at top 10, ~26 px tall)
const BAR_H = 48;
const UI_EDGE = 8;

const _p = new Vector3();
const _a = new Vector3();
const _b = new Vector3();
const _q = new Quaternion();
const _m = new Matrix4();
const _e = new Vector3();

/** Coarse screen-space occupancy of the figure (skin) and of the highlighted anatomy. */
export class ScreenMask {
  cols = 0;
  rows = 0;
  private W = 1;
  private H = 1;
  private skin = new Uint8Array(0);
  private anat = new Uint8Array(0);
  private satS = new Int32Array(0);
  private satA = new Int32Array(0);
  private f = 1;
  private view = new Matrix4();
  /** fraction of the drawable area not covered by the figure (after finish) */
  free = 1;
  /** results of frac() */
  fs = 0;
  fa = 0;

  begin(camera: PerspectiveCamera, W: number, H: number) {
    this.W = W;
    this.H = H;
    const cols = Math.ceil(W / CELL);
    const rows = Math.ceil(H / CELL);
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols;
      this.rows = rows;
      this.skin = new Uint8Array(cols * rows);
      this.anat = new Uint8Array(cols * rows);
      this.satS = new Int32Array((cols + 1) * (rows + 1));
      this.satA = new Int32Array((cols + 1) * (rows + 1));
    } else {
      this.skin.fill(0);
      this.anat.fill(0);
    }
    camera.updateMatrixWorld();
    this.view.copy(camera.matrixWorldInverse);
    this.f = H / 2 / Math.tan(((camera.fov * Math.PI) / 180) / 2);
  }

  /** world → screen (px) in _e.x/_e.y, depth in _e.z (≤ 0 = behind the camera) */
  private project(p: Vector3) {
    _e.copy(p).applyMatrix4(this.view);
    const depth = -_e.z;
    if (depth < 0.02) {
      _e.z = -1;
      return;
    }
    _e.set(this.W / 2 + (_e.x * this.f) / depth, this.H / 2 - (_e.y * this.f) / depth, depth);
  }

  /** Rasterise a screen capsule (radii in px) into a grid. */
  private capsule(g: Uint8Array, ax: number, ay: number, ar: number, bx: number, by: number, br: number) {
    const C = CELL;
    const half = C * 0.5;
    const x0 = Math.max(0, Math.floor((Math.min(ax - ar, bx - br) - half) / C));
    const x1 = Math.min(this.cols - 1, Math.floor((Math.max(ax + ar, bx + br) + half) / C));
    const y0 = Math.max(0, Math.floor((Math.min(ay - ar, by - br) - half) / C));
    const y1 = Math.min(this.rows - 1, Math.floor((Math.max(ay + ar, by + br) + half) / C));
    const vx = bx - ax;
    const vy = by - ay;
    const ll = vx * vx + vy * vy;
    for (let j = y0; j <= y1; j++) {
      const py = (j + 0.5) * C;
      for (let i = x0; i <= x1; i++) {
        const px = (i + 0.5) * C;
        let t = ll > 1e-6 ? ((px - ax) * vx + (py - ay) * vy) / ll : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = ax + vx * t - px;
        const qy = ay + vy * t - py;
        const r = ar + (br - ar) * t + half;
        if (qx * qx + qy * qy <= r * r) g[j * this.cols + i] = 1;
      }
    }
  }

  /** Stamp the mannequin's skin primitives (+ ~4 px clearance). */
  stampSkin(state: RigState) {
    const f = this.f;
    for (const p of SKIN_PRIMS) {
      if (p.kind === 'capsule') {
        state.toWorld(p.segIdx, p.a, _a);
        state.toWorld(p.segIdx, p.b, _b);
        this.project(_a);
        if (_e.z <= 0) continue;
        const ax = _e.x,
          ay = _e.y,
          ar = (p.ra * f) / _e.z + 3;
        this.project(_b);
        if (_e.z <= 0) continue;
        this.capsule(this.skin, ax, ay, ar, _e.x, _e.y, (p.rb * f) / _e.z + 3);
      } else {
        // ellipsoid → screen ellipse from its three projected semi-axes (M = Σ uᵢuᵢᵀ)
        state.toWorld(p.segIdx, p.c, _a);
        this.project(_a);
        if (_e.z <= 0) continue;
        const cx = _e.x,
          cy = _e.y,
          k = f / _e.z;
        _q.copy(state.quat[p.segIdx]).multiply(p.q);
        _m.makeRotationFromQuaternion(_q).premultiply(this.view);
        const m = _m.elements;
        let A = 0,
          B = 0,
          D = 0;
        for (let i = 0; i < 3; i++) {
          const r = i === 0 ? p.r.x : i === 1 ? p.r.y : p.r.z;
          const ux = m[i * 4] * r * k;
          const uy = -m[i * 4 + 1] * r * k;
          A += ux * ux;
          B += ux * uy;
          D += uy * uy;
        }
        // dilate by ~half a cell + clearance
        const dil = CELL * 0.5 + 3;
        A += dil * dil;
        D += dil * dil;
        const det = A * D - B * B;
        if (det <= 1e-6) continue;
        const hx = Math.sqrt(A);
        const hy = Math.sqrt(D);
        const C = CELL;
        const x0 = Math.max(0, Math.floor((cx - hx) / C));
        const x1 = Math.min(this.cols - 1, Math.floor((cx + hx) / C));
        const y0 = Math.max(0, Math.floor((cy - hy) / C));
        const y1 = Math.min(this.rows - 1, Math.floor((cy + hy) / C));
        const ia = D / det,
          ib = -B / det,
          id = A / det;
        for (let j = y0; j <= y1; j++) {
          const py = (j + 0.5) * C - cy;
          for (let i = x0; i <= x1; i++) {
            const px = (i + 0.5) * C - cx;
            if (ia * px * px + 2 * ib * px * py + id * py * py <= 1) this.skin[j * this.cols + i] = 1;
          }
        }
      }
    }
  }

  /** Stamp highlighted anatomy (polyline through control points). */
  stampCords(state: RigState, cords: MaskCord[]) {
    const f = this.f;
    for (const c of cords) {
      let px = 0,
        py = 0,
        pr = 0,
        prev = false;
      for (let i = 0; i < c.cps.length; i++) {
        evalPoint(c.cps[i], state, _a);
        this.project(_a);
        if (_e.z <= 0) {
          prev = false;
          continue;
        }
        const r = (c.r * f) / _e.z + 2;
        if (c.cps.length === 1) this.capsule(this.anat, _e.x, _e.y, r, _e.x, _e.y, r);
        else if (prev) this.capsule(this.anat, px, py, pr, _e.x, _e.y, r);
        px = _e.x;
        py = _e.y;
        pr = r;
        prev = true;
      }
    }
  }

  /** Build the summed-area tables. */
  finish() {
    const cols = this.cols;
    const rows = this.rows;
    const W1 = cols + 1;
    const S = this.satS;
    const A = this.satA;
    let skinCount = 0;
    for (let j = 0; j < rows; j++) {
      let rs = 0;
      let ra = 0;
      for (let i = 0; i < cols; i++) {
        const s = this.skin[j * cols + i];
        rs += s;
        skinCount += s;
        ra += this.anat[j * cols + i];
        S[(j + 1) * W1 + i + 1] = S[j * W1 + i + 1] + rs;
        A[(j + 1) * W1 + i + 1] = A[j * W1 + i + 1] + ra;
      }
    }
    this.free = 1 - skinCount / Math.max(1, cols * rows);
  }

  /** Fractions of the rect covered by the figure (fs) and by highlighted anatomy (fa). */
  frac(x: number, y: number, w: number, h: number) {
    const C = CELL;
    const i0 = Math.max(0, Math.min(this.cols, Math.round(x / C)));
    const i1 = Math.max(0, Math.min(this.cols, Math.round((x + w) / C)));
    const j0 = Math.max(0, Math.min(this.rows, Math.round(y / C)));
    const j1 = Math.max(0, Math.min(this.rows, Math.round((y + h) / C)));
    const n = (i1 - i0) * (j1 - j0);
    if (n <= 0) {
      this.fs = this.fa = 0;
      return;
    }
    const W1 = this.cols + 1;
    const S = this.satS;
    const A = this.satA;
    this.fs = (S[j1 * W1 + i1] - S[j0 * W1 + i1] - S[j1 * W1 + i0] + S[j0 * W1 + i0]) / n;
    this.fa = (A[j1 * W1 + i1] - A[j0 * W1 + i1] - A[j1 * W1 + i0] + A[j0 * W1 + i0]) / n;
  }
}

function segCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Does segment (a→b) pass through rect r (shrunk by 2 px)? Cheap Liang–Barsky clip. */
function segHitsRect(ax: number, ay: number, bx: number, by: number, x: number, y: number, w: number, h: number) {
  let t0 = 0,
    t1 = 1;
  const dx = bx - ax,
    dy = by - ay;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - (x + 2), x + w - 2 - ax, ay - (y + 2), y + h - 2 - ay];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return t0 < t1;
}

/** Leader end point on a pill (x, y, w, h) for an anchor (sx, sy) → _lx/_ly. */
let _lx = 0;
let _ly = 0;
function leaderEnd(sx: number, sy: number, x: number, y: number, w: number, h: number) {
  if (sx <= x) {
    _lx = x + 1;
    _ly = y + h / 2;
  } else if (sx >= x + w) {
    _lx = x + w - 1;
    _ly = y + h / 2;
  } else {
    _lx = Math.min(x + w - 8, Math.max(x + 8, sx));
    _ly = sy < y ? y + 1 : y + h - 1;
  }
}

export class LabelLayer {
  private root: HTMLDivElement;
  private svg: SVGSVGElement;
  private chip: HTMLButtonElement;
  private items: Item[] = [];
  private byKey = new Map<string, Item>();
  private mask = new ScreenMask();
  private cords: MaskCord[] = [];
  private _visible = true;
  private expanded = false;
  private nCollapsed = 0;
  private needMeasure = true;
  private snapNext = true;
  // reused per frame
  private vis: Item[] = [];
  private px = new Float32Array(32);
  private py = new Float32Array(32);
  private pw = new Float32Array(32);
  private ph = new Float32Array(32);
  private lx0 = new Float32Array(32);
  private ly0 = new Float32Array(32);
  private lx1 = new Float32Array(32);
  private ly1 = new Float32Array(32);
  private np = 0;
  private zones: Rect[] = [];
  private zonesW = 0;
  private zonesH = 0;
  private zonesDirty = true;
  private mo: MutationObserver | null = null;
  private chipState = { x: 0, y: 0, dx: 0, dy: 0, w: 34, h: 22, placed: false, shown: false };

  /** Hidden labels must not be laid out — and must not linger at their last / default (0,0) position. */
  get visible() {
    return this._visible;
  }
  set visible(v: boolean) {
    this._visible = v;
    this.root.style.display = v && this.items.length ? '' : 'none';
  }

  constructor(
    private container: HTMLElement,
    private requestRender: () => void = () => {},
  ) {
    this.root = document.createElement('div');
    this.root.className = 'tb3d-labels';
    this.svg = document.createElementNS(SVGNS, 'svg');
    this.svg.setAttribute('class', 'tb3d-leaders');
    this.root.appendChild(this.svg);
    this.chip = document.createElement('button');
    this.chip.type = 'button';
    this.chip.className = 'tb3d-more';
    this.chip.style.display = 'none';
    this.chip.addEventListener('click', this.onChip);
    // keep taps on the chip from rotating the model
    this.chip.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.root.appendChild(this.chip);
    container.appendChild(this.root);
    // UI zones (phase pill, legend, player bar…) are re-measured whenever the overlay's DOM changes
    if (typeof MutationObserver !== 'undefined') {
      this.mo = new MutationObserver(() => {
        this.zonesDirty = true;
      });
      this.mo.observe(container, { childList: true, subtree: true, characterData: true });
    }
  }

  private onChip = () => {
    this.expanded = !this.expanded;
    this.updateChipText();
    this.requestRender();
  };

  /** Snap (no smoothing) on the next layout — after a jump in time or a new view. */
  snap() {
    this.snapNext = true;
  }

  /** Highlighted anatomy for the overlap mask (labels avoid covering it). */
  setCords(cords: MaskCord[]) {
    this.cords = cords;
  }

  setItems(specs: LabelSpec[]) {
    const keep = new Map(this.items.map((i) => [i.key, i]));
    const next: Item[] = [];
    for (const s of specs) {
      let it = keep.get(s.key);
      if (it) {
        keep.delete(s.key);
        if (it.text !== s.text || it.color !== s.color || it.tier !== s.tier) {
          it.text = s.text;
          it.color = s.color;
          it.tier = s.tier;
          this.fill(it);
        }
      } else {
        const el = document.createElement('div');
        const line = document.createElementNS(SVGNS, 'line');
        const dot = document.createElementNS(SVGNS, 'circle');
        this.svg.appendChild(line);
        this.svg.appendChild(dot);
        this.root.insertBefore(el, this.chip);
        it = {
          ...s,
          el,
          line,
          dot,
          w: 0,
          h: 0,
          world: new Vector3(),
          has: false,
          sx: 0,
          sy: 0,
          tx: 0,
          ty: 0,
          dx: 0,
          dy: 0,
          placed: false,
          shown: false,
          collapsed: false,
          ovS: 0,
          ovA: 0,
          ok: true,
          lead: 0,
          bad: 0,
          seen: 0,
          inVis: false,
          committed: false,
        };
        this.fill(it);
      }
      it.has = false;
      it.placed = false;
      it.collapsed = false;
      next.push(it);
    }
    for (const it of keep.values()) this.removeItem(it);
    this.items = next;
    this.byKey = new Map(next.map((i) => [i.key, i]));
    this.expanded = false;
    this.nCollapsed = 0;
    this.chipState.placed = false;
    this.chip.style.display = 'none';
    this.snapNext = true;
    this.measure();
    // new items start hidden until the first layout() positions them
    this.root.style.display = 'none';
  }

  private fill(it: Item) {
    it.el.className = 'tb3d-label' + (it.tier ? ' minor' : '');
    it.el.textContent = '';
    const i = document.createElement('i');
    i.style.background = it.color;
    it.el.appendChild(i);
    it.el.appendChild(document.createTextNode(it.text));
    it.dot.setAttribute('fill', it.color);
    it.dot.setAttribute('r', it.tier ? '2.3' : '2.7');
    it.line.setAttribute('class', it.tier ? 'minor' : '');
    it.w = 0;
    this.needMeasure = true;
  }

  /** Measure pill sizes (needs the root displayed; done invisibly). */
  private measure() {
    if (!this.items.length) return;
    const prevDisp = this.root.style.display;
    const prevVis = this.root.style.visibility;
    this.root.style.visibility = 'hidden';
    this.root.style.display = '';
    for (const it of this.items) {
      const d = it.el.style.display;
      it.el.style.display = '';
      it.w = it.el.offsetWidth;
      it.h = it.el.offsetHeight;
      it.el.style.display = d;
    }
    const cd = this.chip.style.display;
    this.chip.style.display = '';
    this.chip.textContent = '+8';
    this.chipState.w = this.chip.offsetWidth || 34;
    this.chipState.h = this.chip.offsetHeight || 22;
    this.updateChipText();
    this.chip.style.display = cd;
    this.root.style.display = prevDisp;
    this.root.style.visibility = prevVis;
    // not laid out yet (detached / display:none ancestor): retry on the next layout
    this.needMeasure = this.items.some((it) => !it.w);
    if (this.needMeasure) for (const it of this.items) if (!it.w) it.w = it.text.length * 12 + 24;
    for (const it of this.items) if (!it.h) it.h = it.tier ? 19 : 21;
  }

  private updateChipText() {
    const n = this.nCollapsed;
    this.chip.textContent = this.expanded ? '−' : `+${n}`;
    const names = this.items
      .filter((i) => i.collapsed)
      .map((i) => i.text)
      .join('、');
    this.chip.setAttribute('aria-expanded', String(this.expanded));
    this.chip.setAttribute('aria-label', this.expanded ? 'ラベルを減らす' : `ほかに${n}つ：${names}（タップで表示）`);
    this.chip.title = this.expanded ? 'ラベルを減らす' : names;
  }

  private removeItem(it: Item) {
    it.el.remove();
    it.line.remove();
    it.dot.remove();
  }

  setAnchor(key: string, p: Vector3) {
    const it = this.byKey.get(key);
    if (it) {
      it.world.copy(p);
      it.has = true;
    }
  }

  // ───────────────────────────── UI zones

  /** UI rectangles (phase pill, legend, note, player bar / reset button) measured from the overlay. */
  private measuredZones(W: number, H: number): Rect[] {
    if (!this.zonesDirty && this.zonesW === W && this.zonesH === H) return this.zones;
    this.zonesDirty = false;
    this.zonesW = W;
    this.zonesH = H;
    const out: Rect[] = [];
    const base = this.container.getBoundingClientRect();
    for (const el of Array.from(this.container.children)) {
      const c = (el as HTMLElement).className;
      if (typeof c !== 'string' || !/\btb3d-(phase|legend|note|bar|float)\b/.test(c)) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height) out.push({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
    }
    this.zones = out;
    return out;
  }

  /** UI zones before the React UI has rendered (pre-pass), mirroring viewer.css. */
  static guessZones(W: number, H: number, ui: UiGuess): Rect[] {
    const z: Rect[] = [];
    if (ui.phaseW > 0) z.push({ x: 10, y: 10, w: Math.min(W - 20, ui.phaseW), h: 26 });
    if (ui.legend) z.push({ x: W - 112, y: 10, w: 102, h: 26 });
    if (ui.bar) z.push({ x: UI_EDGE, y: H - UI_EDGE - BAR_H, w: W - 2 * UI_EDGE, h: BAR_H });
    if (ui.float) z.push({ x: W - UI_EDGE - 44, y: H - UI_EDGE - 44, w: 44, h: 44 });
    return z;
  }

  // ───────────────────────────── solver

  /** Screen positions of the anchors; fills this.vis (majors first, then minors; spec order within a tier). */
  private project(camera: PerspectiveCamera, W: number, H: number, includeCollapsed: boolean) {
    const vis = this.vis;
    vis.length = 0;
    for (const it of this.items) {
      it.inVis = false;
      if (!it.has) continue;
      if (it.collapsed && !includeCollapsed) continue;
      _p.copy(it.world).project(camera);
      const inside = _p.z < 1 && _p.x > -1.02 && _p.x < 1.02 && _p.y > -1.02 && _p.y < 1.02;
      if (!inside) continue;
      it.sx = ((_p.x + 1) / 2) * W;
      it.sy = ((1 - _p.y) / 2) * H;
      it.inVis = true;
    }
    for (let tier = 0; tier <= 1; tier++) for (const it of this.items) if (it.inVis && it.tier === tier) vis.push(it);
  }

  private blocked(x: number, y: number, w: number, h: number, zones: Rect[]) {
    for (const z of zones) if (x < z.x + z.w + GAP && x + w > z.x - GAP && y < z.y + z.h + GAP && y + h > z.y - GAP) return true;
    for (let i = 0; i < this.np; i++)
      if (x < this.px[i] + this.pw[i] + GAP && x + w > this.px[i] - GAP && y < this.py[i] + this.ph[i] + GAP && y + h > this.py[i] - GAP)
        return true;
    return false;
  }

  /** Cost of a candidate rect for label `it` (Infinity = forbidden). */
  private cost(it: Item, x: number, y: number, W: number, H: number, zones: Rect[], coherent: boolean, strict: boolean) {
    const w = it.w;
    const h = it.h;
    if (x < PAD || y < PAD || x + w > W - PAD || y + h > H - PAD) return Infinity;
    // never cover its own anchor
    if (it.sx > x - 3 && it.sx < x + w + 3 && it.sy > y - 3 && it.sy < y + h + 3) return Infinity;
    if (strict && this.blocked(x, y, w, h, zones)) return Infinity;
    if (!strict) for (const z of zones) if (x < z.x + z.w && x + w > z.x && y < z.y + z.h && y + h > z.y) return Infinity;
    const m = this.mask;
    m.frac(x, y, w, h);
    leaderEnd(it.sx, it.sy, x, y, w, h);
    const ex = _lx;
    const ey = _ly;
    const L = Math.hypot(ex - it.sx, ey - it.sy);
    let c = 650 * m.fs + 1700 * m.fa + 0.9 * L + 0.3 * Math.abs(ey - it.sy);
    // leaders crossing placed leaders / passing through placed labels
    for (let i = 0; i < this.np; i++) {
      if (segCross(it.sx, it.sy, ex, ey, this.lx0[i], this.ly0[i], this.lx1[i], this.ly1[i])) c += 70;
      if (segHitsRect(it.sx, it.sy, ex, ey, this.px[i], this.py[i], this.pw[i], this.ph[i])) c += 260;
      if (segHitsRect(this.lx0[i], this.ly0[i], this.lx1[i], this.ly1[i], x, y, w, h)) c += 260;
    }
    // covering another label's dot
    for (const o of this.vis) if (o !== it && o.sx > x - 4 && o.sx < x + w + 4 && o.sy > y - 4 && o.sy < y + h + 4) c += 140;
    if (coherent && it.placed) c += 0.75 * Math.hypot(x - it.tx, y - it.ty);
    return c;
  }

  private best = { c: Infinity, x: 0, y: 0 };
  private tryAt(it: Item, x: number, y: number, W: number, H: number, zones: Rect[], coherent: boolean, strict: boolean) {
    const c = this.cost(it, x, y, W, H, zones, coherent, strict);
    if (c < this.best.c) {
      this.best.c = c;
      this.best.x = x;
      this.best.y = y;
    }
  }

  private placeOne(it: Item, W: number, H: number, zones: Rect[], coherent: boolean, strict: boolean) {
    const b = this.best;
    b.c = Infinity;
    const w = it.w;
    const h = it.h;
    const vs = h / 2 + 2;
    for (const k of VSTEP) {
      const y = it.sy - h / 2 + k * vs;
      for (const d of DIST) {
        this.tryAt(it, it.sx - d - w, y, W, H, zones, coherent, strict);
        this.tryAt(it, it.sx + d, y, W, H, zones, coherent, strict);
      }
      this.tryAt(it, PAD, y, W, H, zones, coherent, strict);
      this.tryAt(it, W - PAD - w, y, W, H, zones, coherent, strict);
    }
    for (const d of ABOVE)
      for (let j = -2; j <= 2; j++) {
        const x = it.sx - w / 2 + j * w * 0.35;
        this.tryAt(it, x, it.sy - d - h, W, H, zones, coherent, strict);
        this.tryAt(it, x, it.sy + d, W, H, zones, coherent, strict);
      }
    if (coherent && it.placed) this.tryAt(it, it.tx, it.ty, W, H, zones, coherent, strict);
    return b.c < Infinity;
  }

  private commit(it: Item, x: number, y: number) {
    it.committed = true;
    it.tx = x;
    it.ty = y;
    it.placed = true;
    const m = this.mask;
    m.frac(x, y, it.w, it.h);
    it.ovS = m.fs;
    it.ovA = m.fa;
    leaderEnd(it.sx, it.sy, x, y, it.w, it.h);
    it.lead = Math.hypot(_lx - it.sx, _ly - it.sy);
    const i = this.np++;
    if (i >= this.px.length) return;
    this.px[i] = x;
    this.py[i] = y;
    this.pw[i] = it.w;
    this.ph[i] = it.h;
    this.lx0[i] = it.sx;
    this.ly0[i] = it.sy;
    this.lx1[i] = _lx;
    this.ly1[i] = _ly;
  }

  /** Greedy placement of this.vis. `plan`: minors that land badly are skipped (as if collapsed). */
  private solve(W: number, H: number, zones: Rect[], coherent: boolean, plan: boolean) {
    this.np = 0;
    for (const it of this.vis) it.committed = false;
    for (const it of this.vis) {
      let ok = this.placeOne(it, W, H, zones, coherent, true);
      it.ok = ok;
      if (!ok) {
        if (plan && it.tier) continue;
        // nowhere free: allow overlapping other labels rather than hiding a name
        ok = this.placeOne(it, W, H, zones, coherent, false);
        if (!ok) {
          this.best.x = Math.max(PAD, Math.min(W - PAD - it.w, it.sx + 12));
          this.best.y = Math.max(PAD, Math.min(H - PAD - it.h, it.sy - it.h - 6));
        }
      }
      if (plan && it.tier) {
        const m = this.mask;
        m.frac(this.best.x, this.best.y, it.w, it.h);
        if (this.isBad(m.fs, m.fa)) continue;
      }
      this.commit(it, this.best.x, this.best.y);
    }
  }

  /** A minor label placement that should rather be collapsed into 「+N」. */
  private isBad(fs: number, fa: number) {
    if (fa > 0.14) return true;
    // a body-covering label is only acceptable in a close-up (where there is no free space anyway)
    return fs > 0.3 && this.mask.free > 0.35;
  }

  // ───────────────────────────── pre-pass: which minor labels to collapse

  planBegin() {
    for (const it of this.items) {
      it.bad = 0;
      it.seen = 0;
      it.collapsed = false;
    }
    if (this.needMeasure) this.measure();
  }

  /** One sampled frame of the view (anchors already set via setAnchor, state = the posed rig). */
  planFrame(camera: PerspectiveCamera, W: number, H: number, zones: Rect[], state: RigState) {
    this.project(camera, W, H, true);
    if (!this.vis.length) return;
    const m = this.mask;
    m.begin(camera, W, H);
    m.stampSkin(state);
    m.stampCords(state, this.cords);
    m.finish();
    for (const it of this.vis) it.placed = false;
    this.solve(W, H, zones, false, true);
    for (const it of this.vis) {
      if (!it.tier) continue;
      it.seen++;
      // skipped by solve() (no good spot this frame), or only reachable with a very long leader → bad
      if (!it.committed || !it.ok || it.lead > Math.max(190, 0.6 * W)) it.bad++;
    }
    for (const it of this.items) it.placed = false;
  }

  /** Decide the collapsed set. */
  planEnd() {
    let n = 0;
    for (const it of this.items) {
      it.collapsed = it.tier === 1 && it.seen > 0 && it.bad / it.seen > 0.15;
      if (it.collapsed) n++;
      it.placed = false;
      it.has = false;
    }
    this.nCollapsed = n;
    this.updateChipText();
    this.snapNext = true;
  }

  // ───────────────────────────── per-frame layout

  /** Project, lay out & draw. Returns true while labels are still moving (keep rendering). */
  layout(camera: PerspectiveCamera, width: number, height: number, dt: number, state: RigState): boolean {
    this.root.style.display = this.visible && this.items.length ? '' : 'none';
    if (!this.visible || !this.items.length) return false;
    if (this.needMeasure) this.measure();
    this.svg.setAttribute('width', String(width));
    this.svg.setAttribute('height', String(height));
    const zones = this.measuredZones(width, height);
    this.project(camera, width, height, this.expanded);
    const m = this.mask;
    m.begin(camera, width, height);
    m.stampSkin(state);
    m.stampCords(state, this.cords);
    m.finish();
    this.solve(width, height, zones, true, false);
    // 「+N」 chip
    const cs = this.chipState;
    let chipOn = false;
    if (this.nCollapsed > 0) {
      chipOn = this.placeChip(width, height, zones);
    }
    // smoothing & DOM
    const snap = this.snapNext;
    this.snapNext = false;
    const a = snap ? 1 : 1 - Math.exp(-Math.max(0, dt) / 0.085);
    let moving = false;
    for (const it of this.items) {
      if (!it.inVis) {
        if (it.shown) {
          it.el.style.display = 'none';
          it.line.style.display = 'none';
          it.dot.style.display = 'none';
          it.shown = false;
        }
        continue;
      }
      if (!it.shown) {
        it.el.style.display = '';
        it.line.style.display = '';
        it.dot.style.display = '';
        it.shown = true;
        it.dx = it.tx;
        it.dy = it.ty;
      } else {
        it.dx += (it.tx - it.dx) * a;
        it.dy += (it.ty - it.dy) * a;
      }
      if (Math.abs(it.tx - it.dx) > 0.35 || Math.abs(it.ty - it.dy) > 0.35) moving = true;
      it.el.style.transform = `translate(${it.dx.toFixed(1)}px, ${it.dy.toFixed(1)}px)`;
      leaderEnd(it.sx, it.sy, it.dx, it.dy, it.w, it.h);
      it.line.setAttribute('x1', it.sx.toFixed(1));
      it.line.setAttribute('y1', it.sy.toFixed(1));
      it.line.setAttribute('x2', _lx.toFixed(1));
      it.line.setAttribute('y2', _ly.toFixed(1));
      it.dot.setAttribute('cx', it.sx.toFixed(1));
      it.dot.setAttribute('cy', it.sy.toFixed(1));
    }
    if (chipOn) {
      if (!cs.shown) {
        this.chip.style.display = '';
        cs.shown = true;
        cs.dx = cs.x;
        cs.dy = cs.y;
      } else {
        cs.dx += (cs.x - cs.dx) * a;
        cs.dy += (cs.y - cs.dy) * a;
      }
      if (Math.abs(cs.x - cs.dx) > 0.35 || Math.abs(cs.y - cs.dy) > 0.35) moving = true;
      this.chip.style.transform = `translate(${cs.dx.toFixed(1)}px, ${cs.dy.toFixed(1)}px)`;
    } else if (cs.shown) {
      this.chip.style.display = 'none';
      cs.shown = false;
    }
    return moving;
  }

  /** Put the 「+N」 chip next to the placed labels, in free space. */
  private placeChip(W: number, H: number, zones: Rect[]) {
    const cs = this.chipState;
    const w = cs.w;
    const h = cs.h;
    let bc = Infinity,
      bx = 0,
      by = 0;
    const m = this.mask;
    const consider = (x: number, y: number, near: number) => {
      if (x < PAD || y < PAD || x + w > W - PAD || y + h > H - PAD) return;
      if (this.blocked(x, y, w, h, zones)) return;
      m.frac(x, y, w, h);
      let c = 650 * m.fs + 1700 * m.fa + near;
      for (let i = 0; i < this.np; i++) if (segHitsRect(this.lx0[i], this.ly0[i], this.lx1[i], this.ly1[i], x, y, w, h)) c += 200;
      if (cs.placed) c += 0.75 * Math.hypot(x - cs.x, y - cs.y);
      if (c < bc) {
        bc = c;
        bx = x;
        by = y;
      }
    };
    const n = Math.min(this.np, this.px.length);
    for (let i = 0; i < n; i++) {
      const x = this.px[i],
        y = this.py[i],
        pw = this.pw[i],
        ph = this.ph[i];
      for (const dy of [ph + 4, ph + 4 + h + 4]) {
        consider(x, y + dy, dy * 0.3);
        consider(x + pw - w, y + dy, dy * 0.3);
      }
      consider(x, y - h - 4, 6);
      consider(x + pw - w, y - h - 4, 6);
      consider(x + pw + 4, y + (ph - h) / 2, 4);
      consider(x - w - 4, y + (ph - h) / 2, 4);
    }
    if (bc === Infinity) {
      // fall back to the margins
      for (let y = PAD + 30; y < H - PAD - h; y += 12) {
        consider(PAD, y, 40);
        consider(W - PAD - w, y, 40);
      }
    }
    if (bc === Infinity) return false;
    cs.x = bx;
    cs.y = by;
    cs.placed = true;
    return true;
  }

  clear() {
    for (const it of this.items) this.removeItem(it);
    this.items = [];
    this.byKey.clear();
  }

  dispose() {
    this.mo?.disconnect();
    this.chip.removeEventListener('click', this.onChip);
    this.clear();
    this.root.remove();
  }
}

/** Minimal debug labels (no layout), e.g. landmark names. */
export class DebugLabels {
  private root: HTMLDivElement;
  private els: HTMLDivElement[] = [];
  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'tb3d-debuglabels';
    container.appendChild(this.root);
  }
  render(camera: PerspectiveCamera, width: number, height: number, pts: { p: Vector3; text: string }[]) {
    while (this.els.length < pts.length) {
      const el = document.createElement('div');
      el.className = 'tb3d-dlabel';
      this.root.appendChild(el);
      this.els.push(el);
    }
    this.els.forEach((el, i) => {
      const q = pts[i];
      if (!q) {
        el.style.display = 'none';
        return;
      }
      _p.copy(q.p).project(camera);
      if (_p.z > 1 || Math.abs(_p.x) > 1 || Math.abs(_p.y) > 1) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      if (el.textContent !== q.text) el.textContent = q.text;
      el.style.transform = `translate(${(((_p.x + 1) / 2) * width + 3).toFixed(0)}px, ${(((1 - _p.y) / 2) * height - 6).toFixed(0)}px)`;
    });
  }
  dispose() {
    this.root.remove();
  }
}
