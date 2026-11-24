// 3D viewer wrappers. Viewer3DToggle mounts the (heavy) three.js viewer only after a tap, to save battery/data.
import { useEffect, useState, type ReactNode } from 'react';
import { AnatomyViewer, type AnatomyViewerProps } from '../three';
import { usePrefersReducedMotion } from '../lib/useMedia';
import { useLeavingPage } from '../lib/useLeavingPage';
import { ErrorBoundary } from './ErrorBoundary';
import { IconChevron, IconClose, IconCube } from './icons';

let prefetched: Promise<unknown> | null = null;
/**
 * Start downloading the 3D viewer chunk (three.js, ~230 KB gzip) before it is needed: on idle on pages that offer
 * the viewer, and on the first touch of a card that leads to one. It is the same module the lazy wrapper in
 * src/three/index.tsx loads, so the bundler emits one chunk and the later mount finds it in the module cache.
 */
export function prefetchViewer() {
  prefetched ??= import('../three/AnatomyViewer').catch(() => {
    prefetched = null; // offline / flaky network: the real mount retries (and shows its own fallback)
  });
}

/** Prefetch when the page is idle (not on data-saver connections). */
function usePrefetchOnIdle() {
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(prefetchViewer, { timeout: 5000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(prefetchViewer, 2500);
    return () => window.clearTimeout(t);
  }, []);
}

function ViewerFallback({ height }: { height: number | string }) {
  return (
    <div className="placeholder" style={{ minHeight: height, borderRadius: 0 }}>
      <div>
        <IconCube />
        <strong>3Dモデルを表示できませんでした</strong>
        <span className="small">端末やブラウザが3D表示に対応していない可能性があります。</span>
      </div>
    </div>
  );
}

export function SafeViewer(props: AnatomyViewerProps) {
  const reduced = usePrefersReducedMotion();
  // leaving the page: drop the viewer at once so its render loop does not slow down building the next page
  const leaving = useLeavingPage();
  const height = props.height ?? 320;
  if (leaving) return <div style={{ height }} aria-hidden="true" />;
  return (
    <ErrorBoundary fallback={<ViewerFallback height={height} />} resetKey={JSON.stringify([props.muscle, props.exercise, props.focus])}>
      <AnatomyViewer autoPlay={!reduced} {...props} height={height} />
    </ErrorBoundary>
  );
}

export function Viewer3DToggle({
  title = '3Dで見る',
  sub = 'タップで3Dモデルを読み込みます（指で回転・拡大できます）',
  legend,
  footer,
  ...props
}: AnatomyViewerProps & {
  title?: string;
  sub?: string;
  /** left side of the bar under the open viewer (next to 閉じる) */
  legend?: ReactNode;
  /** content between the open viewer and its bar (e.g. a row of muscle chips) */
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  usePrefetchOnIdle();
  if (!open) {
    return (
      <button type="button" className="viewer-cta" onPointerDown={prefetchViewer} onClick={() => setOpen(true)}>
        <span className="viewer-cta__icon">
          <IconCube />
        </span>
        <span className="grow" style={{ flex: 1, minWidth: 0 }}>
          <span className="viewer-cta__title" style={{ display: 'block' }}>
            {title}
          </span>
          <span className="viewer-cta__sub" style={{ display: 'block' }}>
            {sub}
          </span>
        </span>
        <IconChevron className="chev" />
      </button>
    );
  }
  return (
    <div className="viewer-frame">
      <SafeViewer height={340} {...props} />
      {footer}
      <div className="viewer-frame__bar">
        <div>{legend}</div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
          <IconClose />
          閉じる
        </button>
      </div>
    </div>
  );
}
