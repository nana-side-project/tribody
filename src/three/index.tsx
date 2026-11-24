// Public entry of the 3D engine. The UI imports ONLY from here.
// AnatomyViewer is lazy-loaded so three.js is not in the initial bundle.
import { lazy, Suspense } from 'react';
import type { AnatomyViewerProps } from './contract';

export type { AnatomyViewerProps, Highlight3DRole } from './contract';

const Impl = lazy(() => import('./AnatomyViewer'));

export function AnatomyViewer(props: AnatomyViewerProps) {
  const h = props.height ?? 320;
  return (
    <Suspense
      fallback={
        <div
          className={props.className}
          style={{ height: h, display: 'grid', placeItems: 'center', opacity: 0.6, fontSize: 13 }}
        >
          3Dモデルを読み込み中…
        </div>
      }
    >
      <Impl {...props} />
    </Suspense>
  );
}
