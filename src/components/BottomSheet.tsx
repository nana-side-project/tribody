// Modal bottom sheet: backdrop tap / Esc / swipe-down / browser Back to close, focus moved in and restored,
// body scroll locked, the page behind made inert (screen readers can't wander into it).
import { useEffect, useRef, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './icons';

// ── history entry per open sheet, so the Android back gesture / browser Back closes the sheet first ──
// The entry keeps the same URL and copies the router's state (same location key), so the router treats
// the pops as no-ops. A sheet closed by other means removes its entry with history.back(); anything that
// navigates right after closing a sheet must wait for that (afterSheetClose).
let pendingBack: Promise<void> | null = null;
let sheetSeq = 0;

function historyBack(): Promise<void> {
  const p = new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('popstate', finish);
      if (pendingBack === p) pendingBack = null;
      resolve();
    };
    window.addEventListener('popstate', finish);
    setTimeout(finish, 500); // safety net
    try {
      window.history.back();
    } catch {
      finish();
    }
  });
  pendingBack = p;
  return p;
}

/** Run `fn` once a just-closed sheet has removed its history entry (e.g. navigate from a sheet button). */
export function afterSheetClose(fn: () => void) {
  if (pendingBack) void pendingBack.then(() => setTimeout(fn, 0));
  else setTimeout(fn, 0);
}

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
    const myId = ++sheetSeq;
    let pushed = false;
    let closedByBack = false;
    let disposed = false;
    const onPop = (e: PopStateEvent) => {
      const st = e.state as { tbSheet?: number } | null;
      if (st?.tbSheet === myId) return;
      closedByBack = true;
      closeRef.current();
    };
    const push = () => {
      if (disposed) return;
      try {
        const st = (window.history.state ?? {}) as Record<string, unknown>;
        window.history.pushState({ ...st, tbSheet: myId }, '');
        pushed = true;
        window.addEventListener('popstate', onPop);
      } catch {
        /* history unavailable (sandboxed preview) — Back just won't close the sheet */
      }
    };
    if (pendingBack) void pendingBack.then(push);
    else push();

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
      disposed = true;
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
      if (pushed && !closedByBack && (window.history.state as { tbSheet?: number } | null)?.tbSheet === myId) void historyBack();
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
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={sheetRef} tabIndex={-1}>
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
