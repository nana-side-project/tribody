// 3D viewer wrappers. Viewer3DToggle mounts the (heavy) three.js viewer only after a tap, to save battery/data.
import { useState, type ReactNode } from 'react';
import { AnatomyViewer, type AnatomyViewerProps } from '../three';
import { usePrefersReducedMotion } from '../lib/useMedia';
import { ErrorBoundary } from './ErrorBoundary';
import { IconChevron, IconClose, IconCube } from './icons';

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
  const height = props.height ?? 320;
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
  ...props
}: AnatomyViewerProps & { title?: string; sub?: string; legend?: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="viewer-cta" onClick={() => setOpen(true)}>
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
