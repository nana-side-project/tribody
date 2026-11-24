// PUBLIC CONTRACT of the 3D engine — the UI codes against this; keep it stable.
// The engine agent implements it (see docs/ENGINE.md once written).
import type { ConditionId, ExerciseId, MuscleId, PainSpotId, RegionId, StructureId } from '../data/registry';

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
  /**
   * Condition / region pages: which side of the body the user is concerned with (the side they tapped on the body
   * map). 'left' shows the highlighted parts on the left limb (scene mirrored). Default: the scene's own side (right).
   */
  side?: 'left' | 'right';
  /**
   * Condition page: the pain spot the user tapped. Lets a scene pick a camera that shows that spot (e.g. the back of
   * the shoulder for 肩の後ろ on 水泳肩). Without it the scene's default camera is used.
   */
  spot?: PainSpotId;
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
