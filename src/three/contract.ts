// PUBLIC CONTRACT of the 3D engine — the UI codes against this; keep it stable.
// The engine agent implements it (see docs/ENGINE.md once written).
import type { ConditionId, ExerciseId, MuscleId, RegionId, StructureId } from '../data/registry';

export type Highlight3DRole = 'injured' | 'involved' | 'primary' | 'secondary' | 'selected';

export interface AnatomyViewerProps {
  /** Muscle page: animates rest → contraction (action pose) → rest → stretch pose, looping. */
  muscle?: MuscleId;
  /** Exercise page: plays the exercise clip with its target muscles highlighted. */
  exercise?: ExerciseId;
  /** Condition / region pages: highlight these muscles & structures (static or gentle idle pose). */
  highlights?: Partial<Record<MuscleId | StructureId, Highlight3DRole>>;
  /**
   * Condition page: which condition the `highlights` belong to. Optional; lets the engine pick a scene that shows
   * that injury best (e.g. a cycling posture, a seated knee, a closer camera). Without it, highlights are generic.
   */
  condition?: ConditionId;
  /** Frame the camera on this region (defaults depend on mode). */
  focus?: RegionId;
  /** Show the built-in player UI (play/pause, speed, phase label, view reset). Default true. */
  controls?: boolean;
  autoPlay?: boolean; // default true
  /** CSS height of the canvas area (width is always 100%). Default 320. */
  height?: number | string;
  /** Show floating name labels for highlighted parts. Default true. */
  labels?: boolean;
  className?: string;
  /** Called with the current phase label of the clip (e.g. '収縮', 'ゆっくり下ろす'). */
  onPhase?: (label: string | null) => void;
}
