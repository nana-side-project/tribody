// Home-screen body map: front / back / sole silhouettes with a tappable hotspot for every
// pain spot (PAIN_SPOTS[].views), on both sides. onSelect(id, side) reports the FIGURE's side
// (front view: the figure's right is on the viewer's left).
// Artwork and hotspot data live in ./bodymap/ (see ./bodymap/spots.ts for coordinates).
import type { BodyMapProps } from './types';
import BodyMapView from './bodymap/BodyMapView';

export default function BodyMap(props: BodyMapProps) {
  return <BodyMapView {...props} />;
}

export { BodyMapView };
export type { BodyMapViewProps } from './bodymap/BodyMapView';
