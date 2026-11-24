// STUB — replaced by the engine agent. Must default-export a component taking AnatomyViewerProps.
import type { AnatomyViewerProps } from './contract';

export default function AnatomyViewer(props: AnatomyViewerProps) {
  const label = props.muscle ?? props.exercise ?? Object.keys(props.highlights ?? {}).join(', ');
  return (
    <div
      className={props.className}
      style={{ height: props.height ?? 320, display: 'grid', placeItems: 'center', border: '1px dashed #aaa', borderRadius: 12 }}
    >
      3D viewer (stub): {label}
    </div>
  );
}
