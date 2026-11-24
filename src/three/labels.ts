// Floating HTML labels (Japanese names) with thin leader lines and simple overlap avoidance.
import { type PerspectiveCamera, Vector3 } from 'three';

export interface LabelSpec {
  key: string;
  text: string;
  color: string;
}

interface Item extends LabelSpec {
  el: HTMLDivElement;
  line: SVGLineElement;
  dot: SVGCircleElement;
  w: number;
  h: number;
  world: Vector3;
  has: boolean;
  sx: number;
  sy: number;
  lx: number;
  ly: number;
  side: -1 | 1;
  placed: boolean;
}

const SVGNS = 'http://www.w3.org/2000/svg';
const bySy = (a: { sy: number }, b: { sy: number }) => a.sy - b.sy;
const _p = new Vector3();

export class LabelLayer {
  private root: HTMLDivElement;
  private svg: SVGSVGElement;
  private items: Item[] = [];
  private byKey = new Map<string, Item>();
  // reused per frame (layout runs on every render)
  private vis: Item[] = [];
  private col: Item[] = [];
  private _visible = true;
  /** Hidden labels must not be laid out — and must not linger at their last / default (0,0) position. */
  get visible() {
    return this._visible;
  }
  set visible(v: boolean) {
    this._visible = v;
    this.root.style.display = v && this.items.length ? '' : 'none';
  }

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'tb3d-labels';
    this.svg = document.createElementNS(SVGNS, 'svg');
    this.svg.setAttribute('class', 'tb3d-leaders');
    this.root.appendChild(this.svg);
    container.appendChild(this.root);
  }

  setItems(specs: LabelSpec[]) {
    const keep = new Map(this.items.map((i) => [i.key, i]));
    const next: Item[] = [];
    for (const s of specs) {
      let it = keep.get(s.key);
      if (it) {
        keep.delete(s.key);
        if (it.text !== s.text || it.color !== s.color) {
          it.text = s.text;
          it.color = s.color;
          this.fill(it);
        }
      } else {
        const el = document.createElement('div');
        el.className = 'tb3d-label';
        const line = document.createElementNS(SVGNS, 'line');
        const dot = document.createElementNS(SVGNS, 'circle');
        dot.setAttribute('r', '2.6');
        this.svg.appendChild(line);
        this.svg.appendChild(dot);
        this.root.appendChild(el);
        it = { ...s, el, line, dot, w: 0, h: 0, world: new Vector3(), has: false, sx: 0, sy: 0, lx: 0, ly: 0, side: 1, placed: false };
        this.fill(it);
      }
      next.push(it);
    }
    for (const it of keep.values()) this.removeItem(it);
    this.items = next;
    this.byKey = new Map(next.map((i) => [i.key, i]));
    // new items start hidden until the first layout() positions them
    this.root.style.display = 'none';
  }

  private fill(it: Item) {
    it.el.textContent = '';
    const i = document.createElement('i');
    i.style.background = it.color;
    it.el.appendChild(i);
    it.el.appendChild(document.createTextNode(it.text));
    it.dot.setAttribute('fill', it.color);
    it.w = 0;
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

  /** Project & lay out. centreX = screen x of the figure's centre (labels go outward from it). */
  layout(camera: PerspectiveCamera, width: number, height: number, centreX: number) {
    this.root.style.display = this.visible && this.items.length ? '' : 'none';
    if (!this.visible || !this.items.length) return;
    this.svg.setAttribute('width', String(width));
    this.svg.setAttribute('height', String(height));
    const vis = this.vis;
    vis.length = 0;
    for (const it of this.items) {
      if (!it.has) {
        it.el.style.display = 'none';
        it.line.style.display = 'none';
        it.dot.style.display = 'none';
        continue;
      }
      _p.copy(it.world).project(camera);
      const inside = _p.z < 1 && _p.x > -1.05 && _p.x < 1.05 && _p.y > -1.05 && _p.y < 1.05;
      if (!inside) {
        it.el.style.display = 'none';
        it.line.style.display = 'none';
        it.dot.style.display = 'none';
        continue;
      }
      it.el.style.display = '';
      it.line.style.display = '';
      it.dot.style.display = '';
      if (!it.w) {
        it.w = it.el.offsetWidth || 80;
        it.h = it.el.offsetHeight || 20;
      }
      it.sx = ((_p.x + 1) / 2) * width;
      it.sy = ((1 - _p.y) / 2) * height;
      // hysteresis: only switch sides when the anchor is clearly on the other half
      const want: -1 | 1 = it.sx < centreX ? -1 : 1;
      if (!it.placed || (want !== it.side && Math.abs(it.sx - centreX) > 36)) it.side = want;
      it.placed = true;
      vis.push(it);
    }
    const pad = 6;
    const gap = 4;
    const offset = 26;
    for (const side of [-1, 1] as const) {
      const col = this.col;
      col.length = 0;
      for (const v of vis) if (v.side === side) col.push(v);
      col.sort(bySy);
      for (const it of col) {
        let x = side < 0 ? it.sx - offset - it.w : it.sx + offset;
        x = Math.max(pad, Math.min(width - pad - it.w, x));
        it.lx = x;
        it.ly = it.sy - it.h - 10; // diagonal, above the anchor
      }
      // de-overlap: push down, then pull up if overflowing the bottom
      for (let i = 1; i < col.length; i++) {
        const prev = col[i - 1];
        const it = col[i];
        if (it.ly < prev.ly + prev.h + gap && Math.abs(it.lx - prev.lx) < Math.max(it.w, prev.w)) it.ly = prev.ly + prev.h + gap;
      }
      const bottom = height - pad - 44; // keep clear of the player bar
      for (let i = col.length - 1; i >= 0; i--) {
        const it = col[i];
        const limit = i === col.length - 1 ? bottom - it.h : col[i + 1].ly - gap - it.h;
        if (it.ly > limit) it.ly = limit;
        if (it.ly < pad) it.ly = pad;
      }
    }
    for (const it of vis) {
      it.el.style.transform = `translate(${Math.round(it.lx)}px, ${Math.round(it.ly)}px)`;
      const ex = it.side < 0 ? it.lx + it.w : it.lx;
      const ey = it.ly + it.h / 2;
      it.line.setAttribute('x1', it.sx.toFixed(1));
      it.line.setAttribute('y1', it.sy.toFixed(1));
      it.line.setAttribute('x2', ex.toFixed(1));
      it.line.setAttribute('y2', ey.toFixed(1));
      it.dot.setAttribute('cx', it.sx.toFixed(1));
      it.dot.setAttribute('cy', it.sy.toFixed(1));
    }
  }

  clear() {
    for (const it of this.items) this.removeItem(it);
    this.items = [];
    this.byKey.clear();
  }

  dispose() {
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
