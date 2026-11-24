// 3D viewer wrappers. Viewer3DToggle mounts the (heavy) three.js viewer only after a tap, to save battery/data.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AnatomyViewer, type AnatomyViewerProps } from '../three';
import { usePrefersReducedMotion } from '../lib/useMedia';
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

let webgl: boolean | undefined;
/** Can this browser draw WebGL at all? (checked once; the 3D engine itself reports a context lost later) */
export function hasWebGL(): boolean {
  if (webgl !== undefined) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webgl = false;
  }
  return webgl;
}

/** The 3D code (or its stylesheet) did not arrive: offline, a flaky connection, a deploy that replaced the files. */
const isLoadError = (e: Error) =>
  /dynamically imported module|importing a module script failed|error loading dynamically|failed to fetch|unable to preload css|chunkloaderror|loading chunk|load failed/i.test(
    `${e.name} ${e.message}`,
  );

/**
 * Why the 3D view is missing, said plainly: a load failure is not the device's fault and can be retried (a reload:
 * the failed module stays cached by the browser for this page); a device without WebGL gets a compact note that
 * points to the 2D figure and the steps instead of a big empty box.
 */
function ViewerFallback({ kind, height, onShown }: { kind: 'network' | 'nogl' | 'other'; height: number | string; onShown?: () => void }) {
  useEffect(() => onShown?.(), [onShown]);
  if (kind === 'network') {
    return (
      <div className="placeholder viewer-fail" style={{ minHeight: Math.min(Number(height) || 200, 200), borderRadius: 0 }} role="status">
        <div>
          <IconCube />
          <strong>通信エラーで3Dを読み込めませんでした</strong>
          <span className="small">通信状態を確認して、もう一度読み込んでください。</span>
          <button type="button" className="btn btn--secondary btn--sm" style={{ marginTop: 10 }} onClick={() => location.reload()}>
            再読み込み
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="viewer-fail viewer-fail--compact" role="status">
      <IconCube />
      <p>
        <strong>{kind === 'nogl' ? 'この端末・ブラウザでは3D表示を利用できません' : '3Dモデルを表示できませんでした'}</strong>
        <span className="small">図と手順の説明で確認できます。</span>
      </p>
    </div>
  );
}

/**
 * false on the first render, true once the page around it has been painted. Navigation renders synchronously
 * (HashRouter useTransitions={false}), and effects of a tap-driven render run before the browser paints: mounting
 * the viewer (WebGL context, scene build) in the same task would hold back the first paint of the new page.
 */
function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // the state update from a frame callback is not tied to the tap, so React renders it after this frame
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}

export function SafeViewer({ onUnavailable, ...props }: AnatomyViewerProps & { onUnavailable?: () => void }) {
  const reduced = usePrefersReducedMotion();
  const ready = useAfterFirstPaint();
  const height = props.height ?? 320;
  if (!ready) return <div className={props.className} style={{ height }} aria-hidden="true" />;
  if (!hasWebGL()) return <ViewerFallback kind="nogl" height={height} onShown={onUnavailable} />;
  return (
    <ErrorBoundary
      fallback={(err) => <ViewerFallback kind={isLoadError(err) ? 'network' : 'other'} height={height} onShown={onUnavailable} />}
      resetKey={JSON.stringify([props.muscle, props.exercise, props.focus])}
    >
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
  // the viewer could not be shown: its legend (「● 傷んでいる ● 関係」) would describe nothing
  const [unavailable, setUnavailable] = useState(false);
  const markUnavailable = useCallback(() => setUnavailable(true), []);
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
      <SafeViewer height={340} {...props} onUnavailable={markUnavailable} />
      {!unavailable && footer}
      <div className="viewer-frame__bar">
        <div>{!unavailable && legend}</div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
          <IconClose />
          閉じる
        </button>
      </div>
    </div>
  );
}
