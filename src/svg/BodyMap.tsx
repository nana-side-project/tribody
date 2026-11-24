// STUB — replaced by the body-map agent. Must default-export a component taking BodyMapProps.
import type { BodyMapProps } from './types';

export default function BodyMap(props: BodyMapProps) {
  return (
    <div className={props.className} style={{ height: 420, display: 'grid', placeItems: 'center', border: '1px dashed #aaa', borderRadius: 12 }}>
      body map ({props.view}) — stub
    </div>
  );
}
