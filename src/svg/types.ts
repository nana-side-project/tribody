// Contract between 2D illustrations (body map, region diagrams) and the UI.
import type { ComponentType } from 'react';
import type { ConditionId, MuscleId, PainSpotId, RegionId, StructureId } from '../data/registry';

export type HighlightRole = 'injured' | 'involved' | 'muscle' | 'selected';
/** Map of muscle/structure id → how to emphasise it. Anything not listed is drawn normally. */
export type Highlights = Partial<Record<MuscleId | StructureId, HighlightRole>>;

export interface RegionDiagramProps {
  /** Which view to draw (ids from RegionDiagram.views). Defaults to views[0]. */
  view?: string;
  highlights?: Highlights;
  /** When true, everything not in `highlights` is faded so the highlighted parts stand out. */
  dimOthers?: boolean;
  /** Show name labels with leader lines (default true). */
  showLabels?: boolean;
  /** Show tappable pain-spot hotspots (default false). */
  showSpots?: boolean;
  selectedSpot?: PainSpotId | null;
  onSpotSelect?: (id: PainSpotId) => void;
  /** Called when a muscle/structure shape is tapped. */
  onPartSelect?: (id: MuscleId | StructureId) => void;
  /**
   * Condition page: which condition the highlights belong to. Lets a diagram draw the exact lesion zone of that
   * condition (e.g. Achilles mid-portion vs insertion, a stress-fracture spot) instead of inferring it from the set.
   */
  condition?: ConditionId;
  /**
   * Which side of the body the user is concerned with. 'left' draws the limb as the left side (mirrored drawing,
   * captions and labels stay readable and say 左). Default 'right'.
   */
  side?: 'left' | 'right';
  className?: string;
}

export interface RegionDiagram {
  region: RegionId;
  views: { id: string; label: string }[]; // e.g. [{id:'front', label:'前から'}, {id:'side', label:'横から'}]
  /** Which ids are drawn in which view (lets the UI pick the best view for a highlight set). */
  parts: Record<string, (MuscleId | StructureId)[]>;
  /**
   * Ids (also listed in `parts`) that a view draws only in a small locator inset, e.g. the knee side view's
   * ITB inset shows the gluteal muscles. They still highlight, but don't count when the UI picks a default view.
   */
  insetParts?: Record<string, (MuscleId | StructureId)[]>;
  /** Which pain spots have hotspots in which view. */
  spots: Record<string, PainSpotId[]>;
  Component: ComponentType<RegionDiagramProps>;
}

export interface BodyMapProps {
  view: 'front' | 'back' | 'sole';
  /** Spots to highlight as previously selected / logged. */
  activeSpots?: PainSpotId[];
  selectedSpot?: PainSpotId | null;
  onSelect?: (id: PainSpotId, side: 'left' | 'right') => void;
  /** Optional per-spot intensity 0–10 (from the pain log) drawn as a heat tint on both sides. */
  intensity?: Partial<Record<PainSpotId, number>>;
  /**
   * Per-side intensity 0–10. When a spot has an entry here it wins over `intensity` for that spot: only the sides
   * given are tinted ('both' tints both).
   */
  intensitySides?: Partial<Record<PainSpotId, { left?: number; right?: number; both?: number }>>;
  /** Per-side active spots; when a spot has an entry here it wins over `activeSpots` for that spot. */
  activeSides?: Partial<Record<PainSpotId, ('left' | 'right')[]>>;
  className?: string;
}
