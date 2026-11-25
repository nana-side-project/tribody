// Left side (RegionDiagramProps.side = 'left') for both drawing kits (./hip, ./shoulder).
//
// Every region diagram is drawn for the person's RIGHT side. A mirrored right limb is the left limb seen from the
// mirrored viewpoint (front stays front, the inner side stays the inner side), so for the left side a kit's Frame draws
// the anatomy, insets and 起始 / 停止 dots inside one mirroring group, and puts every text back the right way round:
//   • labels and hotspots are placed at mirrored coordinates (label anchors flipped: a name left of its part moves to
//     the right of it), outside the mirroring group;
//   • the two corner captions swap corners; captions, titles and labels say 左 for 右 (and the other way round), and
//     their arrows turn round (「体の中心 →」 → 「← 体の中心」);
//   • the few texts drawn inside the anatomy (inset titles, notes) use <MText>, which un-mirrors itself in place.
// The legend strip of the 起始 / 停止 dots is not mirrored at all. Masks, clip paths, fades and gradients use
// user-space coordinates, so they follow the mirrored drawing by themselves.
import type { ReactNode } from 'react';

export type Anchor = 'start' | 'end' | 'middle';

/** Text anchor of a mirrored text (a name that ended at x now starts there). */
export const flipAnchor = (a: Anchor = 'start'): Anchor => (a === 'start' ? 'end' : a === 'end' ? 'start' : 'middle');

const PAIR = '\u0000';
/** 右 ↔ 左 (「左右」 stays) and arrows turned round: 「体の中心 →」 ↔ 「← 体の中心」, 「前 →」 ↔ 「← 前」. */
export function flipLR(s: string): string {
  const t = s
    .replace(/左右/g, PAIR)
    .replace(/[右左]/g, (c) => (c === '右' ? '左' : '右'))
    .replace(new RegExp(PAIR, 'g'), '左右');
  const end = /\s?→$/.exec(t);
  if (end && !t.includes('←')) return `← ${t.slice(0, end.index)}`;
  if (t.startsWith('← ') && !t.includes('→')) return `${t.slice(2)} →`;
  return t.replace(/[←→]/g, (c) => (c === '→' ? '←' : '→'));
}

/** SVG transform that mirrors a drawing of width `w` (x → w − x). */
export const mirrorX = (w: number) => `matrix(-1 0 0 1 ${w} 0)`;

/** Label font size of both kits (user units). */
const FS = 13.25;

/**
 * A label (both kits' Lab shape) placed for the mirrored drawing: anchor point, elbow and text position mirrored. A
 * name that ran up to the right edge now runs up to the left one; glyphs overhang their advance a little on the side
 * where a text starts, so such a name is kept inside the frame (by at most ~3 units).
 */
export function mirrorLab<L extends { t: string; at: readonly number[]; x: number; a?: Anchor; via?: readonly number[] }>(l: L, w: number): L {
  const a = flipAnchor(l.a);
  // text width estimate: full-width glyphs ≈ 1.03 em, ASCII ≈ 0.6 em
  const em = (s: string) => [...s].reduce((n, c) => n + (c.charCodeAt(0) < 0x80 ? 0.6 : 1.03), 0);
  const width = Math.max(...l.t.split('\n').map(em)) * FS + 1.5;
  let x = w - l.x;
  if (a === 'end' && x < width) x = width;
  else if (a === 'start' && x > w - width) x = w - width;
  const out: L = { ...l, t: flipLR(l.t), at: [w - l.at[0], l.at[1]], x, a };
  if (l.via) out.via = [w - l.via[0], l.via[1]];
  return out;
}

/**
 * A text drawn inside the anatomy (an inset title, a note). With `mir` it sits inside the mirroring group: it is flipped
 * back in place around its anchor (and its anchor turned round), so it reads normally at the mirrored position.
 * Without `mir` it renders exactly like a plain <text>.
 */
export function MText({
  mir,
  className,
  x,
  y,
  a,
  hidden,
  children,
}: {
  mir: boolean;
  className?: string;
  x: number;
  y: number;
  a?: Anchor;
  /** aria-hidden */
  hidden?: boolean;
  children: string;
}) {
  if (!mir)
    return (
      <text className={className} x={x} y={y} textAnchor={a} aria-hidden={hidden ? 'true' : undefined}>
        {children}
      </text>
    );
  return (
    <text className={className} x={x} y={y} textAnchor={flipAnchor(a)} aria-hidden={hidden ? 'true' : undefined} transform={`matrix(-1 0 0 1 ${2 * x} 0)`}>
      {flipLR(children)}
    </text>
  );
}

/** The anatomy of a view: inside the mirroring group for the left side, unchanged (no wrapper) for the right. */
export function MirrorG({ mir, w, children }: { mir: boolean; w: number; children: ReactNode }) {
  return mir ? <g transform={mirrorX(w)}>{children}</g> : <>{children}</>;
}
