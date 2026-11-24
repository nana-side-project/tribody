// 起始 (origin) / 停止 (insertion) markers for the region diagrams — shared by both drawing kits (./hip, ./shoulder).
//
// On the muscle page the figure shows one muscle 'selected'. Each view lists, per muscle, the attachment sites that view
// really shows (Frame `oi`); the kit's Frame draws an orange dot on every origin site and a blue dot on every insertion
// site of the selected muscle, above the anatomy and below the labels, and adds the legend 「● 起始 ● 停止」 in a strip
// under the drawing (the same words as the 3D viewer's legend). A site that a view crops or hides is simply not listed,
// so a view never shows a dot where the muscle is only cut off.
import type { MuscleId, StructureId } from '../../data/registry';
import type { Highlights } from '../types';

/** 起始 (origin) / 停止 (insertion) marker points of one muscle in one view: only the attachment sites the view shows. */
export interface OI {
  o?: readonly (readonly number[])[];
  i?: readonly (readonly number[])[];
}
export type OIMap = Partial<Record<MuscleId | StructureId, OI>>;

export interface OIDot {
  t: 'o' | 'i';
  p: readonly number[];
}

/** Height (user units) of the legend strip added under the drawing when markers are shown. */
export const OI_LEG_H = 30;
const FS = 13.25; // same as the labels: ≥ 11 CSS px on a 360 px phone
const R = 5.4;

/** The marker dots of the selected muscle(s) of a view. */
export function oiDots(oi: OIMap | undefined, hl: Highlights): OIDot[] {
  if (!oi) return [];
  const out: OIDot[] = [];
  for (const [id, m] of Object.entries(oi) as [MuscleId | StructureId, OI | undefined][]) {
    if (!m || hl[id] !== 'selected') continue;
    // two sheets of one muscle that end on the same spot (iliacus + psoas on the lesser trochanter) give one dot
    const add = (t: 'o' | 'i', p: readonly number[]) => {
      if (!out.some((d) => d.t === t && Math.hypot(d.p[0] - p[0], d.p[1] - p[1]) < 7)) out.push({ t, p });
    };
    for (const p of m.o ?? []) add('o', p);
    for (const p of m.i ?? []) add('i', p);
  }
  return out;
}

export const OI_CSS = `
svg .rd-oi-sh { fill: #000; opacity: .28; }
svg .rd-oi-o, svg .rd-oi-i { stroke: #fff; stroke-width: 2.2; }
svg .rd-oi-o { fill: var(--origin); }
svg .rd-oi-i { fill: var(--insertion); }
svg .rd-oi-leg { font-size: ${FS}px; font-weight: 600; fill: var(--text-2); }`;

const f1 = (n: number) => Math.round(n * 10) / 10;

/** The dots (insertion drawn last: where both sit together the blue one stays visible). */
export function OIMarks({ dots }: { dots: OIDot[] }) {
  if (!dots.length) return null;
  const sorted = [...dots.filter((d) => d.t === 'o'), ...dots.filter((d) => d.t === 'i')];
  return (
    <g className="rd-oi" aria-hidden="true" pointerEvents="none">
      {sorted.map((d, i) => (
        <g key={i} transform={`translate(${f1(d.p[0])} ${f1(d.p[1])})`}>
          <circle className="rd-oi-sh" cx={0.5} cy={1.1} r={R + 1} />
          <circle className={d.t === 'o' ? 'rd-oi-o' : 'rd-oi-i'} r={R} />
        </g>
      ))}
    </g>
  );
}

const O_T = '起始（始まる所）';
const I_T = '停止（付着する所）';

/**
 * Legend strip 「● 起始（始まる所） ● 停止（付着する所）」 centred under the drawing; `y` = top of the strip. Names only the
 * kinds of dot the view shows (a view that shows only where a muscle starts has no blue dot to explain).
 */
export function OILegend({ w, y, dots, className }: { w: number; y: number; dots: OIDot[]; className: string }) {
  const items = (['o', 'i'] as const).filter((t) => dots.some((d) => d.t === t)).map((t) => ({ t, s: t === 'o' ? O_T : I_T }));
  const dot = 2 * R + 6;
  const gap = 18;
  const total = items.reduce((a, it) => a + dot + [...it.s].length * FS, 0) + gap * (items.length - 1);
  const cy = y + OI_LEG_H / 2 + 1;
  const ty = cy + FS * 0.36;
  let x = (w - total) / 2;
  return (
    <g className="rd-oi-legend">
      {items.map((it) => {
        const x0 = x;
        x += dot + [...it.s].length * FS + gap;
        return (
          <g key={it.t}>
            <circle className={it.t === 'o' ? 'rd-oi-o' : 'rd-oi-i'} cx={x0 + R} cy={cy} r={R} />
            <text className={`${className} rd-oi-leg`} x={x0 + dot} y={ty}>
              {it.s}
            </text>
          </g>
        );
      })}
    </g>
  );
}
