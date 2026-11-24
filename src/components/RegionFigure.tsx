// Wrapper around a region diagram (src/svg/regions): view tabs, best-view selection, graceful fallback.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MuscleId, PainSpotId, RegionId, StructureId } from '../data';
import { getRegionDiagram, regionDiagrams } from '../svg/regions';
import type { Highlights, RegionDiagram } from '../svg/types';
import { regionName } from '../lib/labels';
import { ErrorBoundary } from './ErrorBoundary';
import { IconLayers } from './icons';
import { Segmented } from './ui';

function safeDiagram(region: RegionId): RegionDiagram | undefined {
  try {
    const d = getRegionDiagram(region);
    if (d && Array.isArray(d.views) && d.views.length && d.Component) return d;
  } catch {
    /* ignore */
  }
  return undefined;
}

/** View id that contains the most of `ids` (falls back to the first view). */
export function bestView(d: RegionDiagram, ids: string[]): string {
  let best = d.views[0]?.id;
  let bestN = -1;
  for (const v of d.views) {
    const parts = (d.parts?.[v.id] ?? []) as string[];
    const n = ids.filter((id) => parts.includes(id)).length;
    if (n > bestN) {
      best = v.id;
      bestN = n;
    }
  }
  return best;
}

/** View id that has hotspots for `spot`. */
function viewWithSpot(d: RegionDiagram, spot: string): string | undefined {
  return d.views.find((v) => ((d.spots?.[v.id] ?? []) as string[]).includes(spot))?.id;
}

/** Find a region diagram (preferring `regions` order) with a view whose parts include `id`. */
export function findDiagramFor(id: string, prefer: RegionId[] = []): { region: RegionId; view: string } | null {
  const order = [...prefer, ...(Object.keys(regionDiagrams) as RegionId[]).filter((r) => !prefer.includes(r))];
  for (const r of order) {
    const d = safeDiagram(r);
    if (!d) continue;
    const v = d.views.find((v) => ((d.parts?.[v.id] ?? []) as string[]).includes(id));
    if (v) return { region: r, view: v.id };
  }
  return null;
}

export function RegionFigure({
  region,
  highlights,
  dimOthers,
  showSpots,
  showLabels,
  selectedSpot,
  onSpotSelect,
  onPartSelect,
  preferParts,
  initialView,
  caption,
  footer,
  diagram: diagramOverride,
}: {
  region: RegionId;
  /** Use this diagram instead of the registered one (dev harness / tests). */
  diagram?: RegionDiagram;
  highlights?: Highlights;
  dimOthers?: boolean;
  showSpots?: boolean;
  showLabels?: boolean;
  selectedSpot?: PainSpotId | null;
  onSpotSelect?: (id: PainSpotId) => void;
  onPartSelect?: (id: MuscleId | StructureId) => void;
  /** Pick the view containing most of these part ids. */
  preferParts?: string[];
  initialView?: string;
  caption?: ReactNode;
  footer?: ReactNode;
}) {
  const diagram = useMemo(() => diagramOverride ?? safeDiagram(region), [region, diagramOverride]);
  const initial = useMemo(() => {
    if (!diagram) return '';
    if (initialView && diagram.views.some((v) => v.id === initialView)) return initialView;
    if (preferParts?.length) return bestView(diagram, preferParts);
    return diagram.views[0].id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram]);
  const [view, setView] = useState(initial);
  const current = diagram?.views.some((v) => v.id === view) ? view : initial;

  // When a spot is selected from outside (e.g. a chip) and it's not on this view, switch to a view that has it.
  useEffect(() => {
    if (!diagram || !selectedSpot) return;
    const onCurrent = ((diagram.spots?.[current] ?? []) as string[]).includes(selectedSpot);
    const other = viewWithSpot(diagram, selectedSpot);
    if (!onCurrent && other) setView(other);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpot, diagram]);
  const shown = current;

  if (!diagram) {
    return (
      <div className="figure">
        <div className="placeholder">
          <div>
            <IconLayers />
            <strong>{regionName(region)}の図解は準備中です</strong>
            <span className="small">解剖図を作成しています。もうしばらくお待ちください。</span>
          </div>
        </div>
        {footer}
      </div>
    );
  }

  const C = diagram.Component;
  return (
    <div className="figure">
      {diagram.views.length > 1 && (
        <div className="figure__tabs">
          <Segmented
            small
            label="図の向き"
            value={shown}
            options={diagram.views.map((v) => ({ id: v.id, label: v.label }))}
            onChange={setView}
          />
        </div>
      )}
      <div className="figure__canvas">
        <ErrorBoundary resetKey={`${region}:${shown}`}>
          <C
            view={shown}
            highlights={highlights}
            dimOthers={dimOthers}
            showLabels={showLabels ?? true}
            showSpots={showSpots}
            selectedSpot={selectedSpot ?? null}
            onSpotSelect={onSpotSelect}
            onPartSelect={onPartSelect}
          />
        </ErrorBoundary>
      </div>
      {caption && <p className="figure__caption">{caption}</p>}
      {footer}
    </div>
  );
}
