// Clip & prop types for exercise animations. See docs/ENGINE.md → "Clip authoring".
import type { ExerciseId, MuscleId, RegionId, StructureId } from '../../data/registry';
import type { Highlight3DRole } from '../contract';
import type { AttachRef } from '../landmarks';
import type { Anchor, BasePoseName, CameraPresetName, Pose, Vec3 } from '../rig';

/** A point for a prop: a world position, a body attachment, or an attachment + world offset (m). */
export type PropPoint = Vec3 | AttachRef | { at: AttachRef; off: Vec3 };

/**
 * Props. Furniture-like props (step, box, wall, mat, roller, pillow, slant, chair, bench, doorframe, bike) are
 * placed ONCE from the clip's first key (after grounding / anchoring); band, ball, dumbbell and a towel on a body
 * point follow the body every frame. Colours are neutral by default.
 */
export type Prop =
  /** Elastic band between two points; thins & deepens in colour as it stretches. */
  | { kind: 'band'; from: PropPoint; to: PropPoint; width?: number; color?: string }
  /** Step / box. `at` = centre of the TOP face; size = [x width, height, z depth]. */
  | { kind: 'step' | 'box'; at: PropPoint; size?: Vec3; color?: string }
  /** Wall plane. `at` = a point on the wall surface at floor level; `normal` = the side facing the figure. */
  | { kind: 'wall'; at: PropPoint; normal?: Vec3; width?: number; height?: number }
  /** Exercise mat lying on the floor. `at` = centre on the floor; `rotY` in degrees. */
  | { kind: 'mat'; at?: PropPoint; size?: [number, number]; rotY?: number; color?: string }
  /** Foam roller. `at` = centre of the roller; `axis` = direction of the roller's long axis. */
  | { kind: 'roller'; at: PropPoint; axis?: 'x' | 'z'; length?: number; radius?: number; color?: string }
  /** Small soft ball (follows `at` every frame, e.g. between the knees). */
  | { kind: 'ball'; at: PropPoint; radius?: number; color?: string }
  /**
   * Rolled towel (soft cream roll with a spiral on its ends). On a body point it follows that bone every frame
   * (position AND orientation, `axis` in the bone's rest frame, e.g. between the elbow and the waist); on a world
   * point it lies still (`axis` in world, e.g. 'x' across the toes). `length` / `radius` in m.
   */
  | { kind: 'towel'; at: PropPoint; axis?: 'x' | 'y' | 'z' | Vec3; length?: number; radius?: number; color?: string }
  /** Pillow / cushion: soft rounded box placed once. `at` = centre of the TOP face; size = [x, height, z]; rotY (deg). */
  | { kind: 'pillow'; at: PropPoint; size?: Vec3; rotY?: number; color?: string }
  /** Dumbbell held in a hand. */
  | { kind: 'dumbbell'; hand?: 'R' | 'L'; size?: number }
  /** Slant board: `at` = centre of the board's bottom on the floor; `angle` deg (rises toward +z unless rotY). */
  | { kind: 'slant'; at: PropPoint; angle?: number; size?: [number, number]; rotY?: number }
  /** Chair / bench. `at` = centre of the seat's TOP surface. rotY turns it (deg). */
  | { kind: 'chair' | 'bench'; at: PropPoint; rotY?: number }
  /** Door frame: `at` = centre of the opening at floor level; the opening lies in the plane facing `normal`. */
  | { kind: 'doorframe'; at: PropPoint; width?: number; height?: number; normal?: Vec3 }
  /** Road bike, fitted automatically to the figure (saddle under the sit bones, bars at the hands, cranks at the feet). */
  | { kind: 'bike' };

export interface ClipKey {
  /** Normalised time 0..1. Keys must be in increasing order. */
  t: number;
  /** Pose applied on top of the clip base (+ clip.pose). Unspecified DOFs come from the base. NOT cumulative. */
  pose?: Pose;
  /** Japanese phase label shown from this key until the next labelled key, e.g. 'ゆっくり持ち上げる'. */
  label?: string;
  /** Seconds to hold this key's pose before moving on (taken out of the time until the next key). */
  hold?: number;
  /**
   * Pass-through key: the motion goes THROUGH this pose without stopping (C1 monotone spline through the run of
   * pass keys, eased only at the neighbouring normal keys). Use it for solved mid poses that keep a contact.
   * `hold` is ignored on a pass key; the first / last key of a 'pingpong' clip cannot pass.
   */
  pass?: boolean;
}

/** Camera: a preset name, a custom view direction (auto-fitted, recommended), or an exact position/target. */
export type CameraSpec = CameraPresetName | { dir: Vec3 } | { position: Vec3; target: Vec3 };

export interface Clip {
  id: ExerciseId | string;
  /** Seconds for one cycle (0 → 1). */
  duration: number;
  base: BasePoseName;
  /** Common modifications of the base for every key (e.g. knees bent for hook-lying). */
  pose?: Pose;
  keys: ClipKey[];
  /** 'loop': 0→1 then restart (the engine eases from the last key back to the first if the last t < 1).
   *  'pingpong': 0→1→0. */
  loop: 'loop' | 'pingpong';
  camera?: CameraSpec;
  focus?: RegionId;
  /** Extra body points the camera must keep in view across the whole clip (e.g. ['hand:palm']). */
  frame?: AttachRef[];
  /** Keeps a body point fixed in world space (e.g. the toes in a calf raise). null = disable the base pose's anchor. */
  anchor?: Anchor | null;
  /** Auto-place the lowest skin point on the floor every frame. true = y 0, number = that height. Default: base pose's setting. */
  ground?: boolean | number;
  props?: Prop[];
  /** Perform the clip on the LEFT side (swaps R/L in every pose, mirrors props & highlights). */
  mirror?: boolean;
  /** Which side's muscles to highlight: 'R' (default), 'L', or 'both' (symmetric exercises). */
  sides?: 'R' | 'L' | 'both';
  /** Override / fallback highlights when the exercise data has none. */
  highlights?: Partial<Record<MuscleId | StructureId, Highlight3DRole>>;
  /** Extra parts highlighted IN ADDITION to the exercise's own targets (Exercise.primary / secondary, or the
   *  fallback `highlights`), merged on top in exercise mode — e.g. `{ 'sciatic-nerve': 'primary' }` on a nerve glide.
   *  Structures (nerves, tendons…) are allowed. */
  extraHighlights?: Partial<Record<MuscleId | StructureId, Highlight3DRole>>;
}
