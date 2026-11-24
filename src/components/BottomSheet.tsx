// Modal bottom sheet: backdrop tap / Esc / swipe-down / browser Back to close, focus moved in and restored,
// body scroll locked, the page behind made inert (screen readers can't wander into it).
import { useEffect, useLayoutEffect, useRef, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { afterOverlayClose, openOverlayEntry } from '../lib/overlayHistory';
import { IconClose } from './icons';

// Back closes the sheet: it gets its own history entry (shared helper with the body-map magnifier, see
// lib/overlayHistory). Anything that navigates right after closing a sheet must wait for that entry to be
// removed: afterSheetClose.
/** Run `fn` once a just-closed sheet has removed its history entry (e.g. navigate from a sheet button). */
export const afterSheetClose = afterOverlayClose;

/**
 * A press that starts less than this long after the sheet opened does nothing: the second tap of a quick double tap
 * on the spot / magnifier name that opened the sheet would otherwise land on the new backdrop and close the sheet,
 * or on a row sliding up under the finger (the sheet-up animation is 0.32 s) and open a condition nobody chose.
 * A tap on the backdrop also has to start on the backdrop (not the pointerup of the tap that opened the sheet).
 */
const OPEN_GUARD_MS = 350;

export function BottomSheet({
  open,
  onClose,
  header,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  header?: ReactNode;
  label: string;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  /** when the sheet opened / when the current press on the backdrop started (performance.now) */
  const openedAt = useRef(0);
  const backdropDownAt = useRef(-1);
  /** when the current press inside the sheet started (performance.now) */
  const sheetDownAt = useRef(-1);

  useLayoutEffect(() => {
    if (!open) return;
    openedAt.current = performance.now();
    backdropDownAt.current = -1;
    sheetDownAt.current = -1;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    const root = document.getElementById('root');
    const prevInert = root?.inert ?? false;
    if (root) root.inert = true;

    // Back closes the sheet
    const releaseEntry = openOverlayEntry(() => closeRef.current());

    const t = setTimeout(() => sheetRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && sheetRef.current) {
        // simple focus trap
        const f = sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === sheetRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      releaseEntry();
      html.style.overflow = prevOverflow;
      if (root) root.inert = prevInert;
      try {
        prevFocus?.focus?.({ preventScroll: true });
      } catch {
        /* ignore */
      }
    };
  }, [open]);

  if (!open) return null;

  const onDown = (e: RPointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => {
    if (!drag.current || !sheetRef.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    drag.current.dy = dy;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onUp = () => {
    if (!drag.current || !sheetRef.current) return;
    const { dy } = drag.current;
    drag.current = null;
    if (dy > 90) onClose();
    else sheetRef.current.style.transform = '';
  };

  return createPortal(
    <div className="sheet-root">
      <div
        className="sheet-backdrop"
        aria-hidden="true"
        onPointerDown={() => {
          backdropDownAt.current = performance.now();
        }}
        onClick={() => {
          const down = backdropDownAt.current;
          backdropDownAt.current = -1;
          if (down < 0 || down - openedAt.current < OPEN_GUARD_MS) return;
          onClose();
        }}
      />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={sheetRef}
        tabIndex={-1}
        onPointerDownCapture={() => {
          sheetDownAt.current = performance.now();
        }}
        onClickCapture={(e) => {
          if (e.detail === 0) return; // keyboard / assistive-technology activation
          const down = sheetDownAt.current;
          sheetDownAt.current = -1;
          const started = down >= 0 ? down : performance.now();
          if (started - openedAt.current >= OPEN_GUARD_MS) return;
          // a tap that began while the sheet was still sliding in (the 2nd tap of a double tap): ignore it
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div
          className="sheet__grab"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{ touchAction: 'none' }}
        >
          <span />
        </div>
        <div className="sheet__head">
          <div className="grow">{header}</div>
          <button type="button" className="icon-btn icon-btn--muted" onClick={onClose} aria-label="閉じる">
            <IconClose />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
