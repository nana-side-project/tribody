// Magnifier for dense hotspot clusters: a card over the body map that shows the tapped part of the
// figure enlarged, with every nearby hotspot as a big dot and a named callout (both tappable).
// Layout comes from ./lens.ts; the artwork is the same as the map's (same CSS classes, so the
// light/dark tokens apply).
import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { PainSpotId } from '../../data/registry';
import type { FigureArt } from './figure';
import { type LensLayout, lensItemAt } from './lens';
import { SIDE_JA, spotAriaLabel, type PlacedSpot } from './spots';

export interface LensProps {
  uid: string;
  art: FigureArt;
  layout: LensLayout;
  /** card position in the map wrapper (px) */
  left: number;
  top: number;
  /** where the tap was, relative to the card (px) — the card grows out of it */
  originX: number;
  originY: number;
  activeIds: ReadonlySet<PainSpotId>;
  onPick: (s: PlacedSpot) => void;
  onClose: () => void;
}

export const LENS_HEAD_H = 44;
/** stage inset inside the card (px, each side and bottom) */
export const LENS_PAD = 6;

const DOT = 7;
const HALO = 15;

export default function Lens({ uid, art, layout, left, top, originX, originY, activeIds, onPick, onClose }: LensProps) {
  const { w, h, m, cx, cy, colW, items, side: oneSide } = layout;
  const ref = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState<string | null>(null);


  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // focus the dialog itself (screen readers announce it; Tab / ↓ reach the choices) — not the first
    // choice, which would look pre-selected to someone who just tapped
    el.focus({ preventScroll: true });
    // bring the whole card into view (above the tab bar) — instantly, so targets don't move under a finger
    try {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch {
      /* ignore */
    }
  }, []);

  const vb = `${(cx - w / 2 / m).toFixed(2)} ${(cy - h / 2 / m).toFixed(2)} ${(w / m).toFixed(2)} ${(h / m).toFixed(2)}`;

  const onStageClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest?.('button')) return;
    const r = e.currentTarget.getBoundingClientRect();
    const it = lensItemAt(layout, e.clientX - r.left, e.clientY - r.top);
    if (it) onPick(it.spot);
  };
  const onStageMove = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest?.('button')) return;
    const r = e.currentTarget.getBoundingClientRect();
    const it = lensItemAt(layout, e.clientX - r.left, e.clientY - r.top);
    const k = it ? it.spot.key : null;
    if (k !== hot) setHot(k);
  };

  // ↑/↓ (and ←/→) move between the choices; Tab works too
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const list = [...(ref.current?.querySelectorAll<HTMLButtonElement>('.tb-lens-pick') ?? [])];
    if (!list.length) return;
    e.preventDefault();
    const n = list.length;
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return list[e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'End' ? n - 1 : 0].focus();
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? (i + 1) % n : (i - 1 + n) % n;
    list[next].focus();
  };

  const titleId = `${uid}-lens-t`;
  return (
    <div
      ref={ref}
      className="tb-lens"
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      style={{ left, top, width: w + 2 * LENS_PAD, transformOrigin: `${originX.toFixed(0)}px ${originY.toFixed(0)}px` }}
      onKeyDown={onKey}
    >
      <div className="tb-lens-head" style={{ height: LENS_HEAD_H }}>
        <svg className="tb-lens-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.4 15.4 20 20M8 10.5h5M10.5 8v5" />
        </svg>
        <span className="tb-lens-title" id={titleId}>
          拡大：どこが痛みますか？
          {oneSide && <span className="tb-lens-side-chip">{SIDE_JA[oneSide]}</span>}
        </span>
        <button type="button" className="tb-lens-close" aria-label="拡大を閉じる" onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
          </svg>
        </button>
      </div>
      <div
        className="tb-lens-stage"
        style={{ width: w, height: h, margin: `0 ${LENS_PAD}px ${LENS_PAD}px` }}
        onClick={onStageClick}
        onMouseMove={onStageMove}
        onMouseLeave={() => setHot(null)}
      >
        <svg className="tb-lens-art" width={w} height={h} viewBox={vb} aria-hidden="true">
          <defs>
            <filter id={`${uid}-lshade`} x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="blur" />
              <feComposite in="SourceAlpha" in2="blur" operator="out" result="rim" />
              <feFlood className="tb-shade-flood" result="flood" />
              <feComposite in="flood" in2="rim" operator="in" result="shade" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="shade" />
              </feMerge>
            </filter>
          </defs>
          <g className="tb-outline">
            {art.body.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g className="tb-fill" filter={`url(#${uid}-lshade)`}>
            {art.body.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g className="tb-contours">
            {art.contours.map((c, i) => (
              <path key={i} d={c.d} className={c.faint ? 'is-faint' : undefined} />
            ))}
          </g>
          {art.loops.length > 0 && (
            <g className="tb-loops">
              {art.loops.map((c, i) => (
                <path key={i} d={c.d} className={c.faint ? 'is-faint' : undefined} />
              ))}
            </g>
          )}
        </svg>
        <svg className="tb-lens-marks" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          {items.map((it) => {
            const x0 = it.col === 'left' ? colW - 2 : w - colW + 2;
            const dx = it.px - x0;
            const dy = it.py - it.ly;
            const len = Math.hypot(dx, dy) || 1;
            const stop = DOT + 3;
            const on = hot === it.spot.key;
            return (
              <g key={it.spot.key} className={`tb-lens-mark${on ? ' is-hot' : ''}${activeIds.has(it.spot.id) ? ' is-active' : ''}`}>
                <line
                  className="tb-lens-leader"
                  x1={x0}
                  y1={it.ly}
                  x2={it.px - (dx / len) * stop}
                  y2={it.py - (dy / len) * stop}
                />
                <circle className="tb-lens-halo" cx={it.px} cy={it.py} r={HALO} />
                <circle className="tb-lens-dot" cx={it.px} cy={it.py} r={DOT} data-key={it.spot.key} />
              </g>
            );
          })}
        </svg>
        {items.map((it) => (
          <button
            key={it.spot.key}
            type="button"
            className={`tb-lens-pick is-${it.col}${hot === it.spot.key ? ' is-hot' : ''}`}
            style={
              it.col === 'left'
                ? { top: it.ly - it.lh / 2, height: it.lh, right: w - colW + 2, maxWidth: colW - 8 }
                : { top: it.ly - it.lh / 2, height: it.lh, left: w - colW + 2, maxWidth: colW - 8 }
            }
            aria-label={spotAriaLabel(it.spot)}
            data-key={it.spot.key}
            onClick={() => onPick(it.spot)}
            onMouseEnter={() => setHot(it.spot.key)}
            onMouseLeave={() => setHot(null)}
            onFocus={(e) => {
              if (e.currentTarget.matches(':focus-visible')) setHot(it.spot.key);
            }}
            onBlur={() => setHot(null)}
          >
            <span className="tb-lens-name">
              {it.phrases.map((t, i) => (
                <Fragment key={i}>
                  {i > 0 && <wbr />}
                  {t}
                </Fragment>
              ))}
              {!oneSide && <span className="tb-lens-side">{SIDE_JA[it.spot.side]}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
