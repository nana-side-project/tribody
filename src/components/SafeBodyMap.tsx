import BodyMap from '../svg/BodyMap';
import type { BodyMapProps } from '../svg/types';
import { ErrorBoundary } from './ErrorBoundary';
import { IconBody } from './icons';

export function SafeBodyMap(props: BodyMapProps) {
  return (
    <ErrorBoundary
      resetKey={props.view}
      fallback={
        <div className="placeholder" style={{ minHeight: 320 }}>
          <div>
            <IconBody />
            <strong>からだの図を表示できませんでした</strong>
            <span className="small">下の「部位から探す」からも選べます。</span>
          </div>
        </div>
      }
    >
      <BodyMap {...props} />
    </ErrorBoundary>
  );
}
