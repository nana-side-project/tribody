// Types for muscle & structure rigs. See docs/ENGINE.md → "Writing muscle strands".
import type { MuscleId, RegionId, StructureId } from '../../data/registry';
import type { CameraSpec, Prop } from '../clips/types';
import type { BonePartId } from '../skeleton-parts';
import type { AttachRef } from '../landmarks';
import type { Anchor, BasePoseName, Pose, Vec3 } from '../rig';

export type { AttachRef } from '../landmarks';

export interface Strand {
  /** e.g. '前部線維' — optional, shown in debug. */
  name?: string;
  /** Ordered points: origin → via points (to wrap around bones) → insertion. At least 2. Defined for the RIGHT side. */
  path: AttachRef[];
  /** Belly radius in metres at rest (see the radius guide in ENGINE.md, typically 0.004–0.03). */
  radius: number;
  /** Tendon fractions of the strand length: [at origin, at insertion]. e.g. [0.05, 0.45] for gastrocnemius. */
  tendon?: [number, number];
  /** Flat band (e.g. a broad sheet): width in metres; `normal` = which bone-frame direction the flat face points to. */
  flat?: { width: number; normal?: 'lateral' | 'medial' | 'anterior' | 'posterior' | 'superior' | 'inferior' };
}

export interface MuscleRig {
  id: MuscleId;
  strands: Strand[];
  /** Pose (on top of base + restPose) where the muscle is SHORT (concentric action). Right side. */
  actionPose: Pose;
  /** Pose (on top of base + restPose) where the muscle is LONG (stretch). Right side. */
  stretchPose: Pose;
  /** Base pose for the muscle demo (default 'STAND'). */
  base?: BasePoseName;
  /**
   * Phase label of the action part of the demo (default '収縮：筋が短くなる'). Use it only when the demo has to show
   * the shortening with a movement that is not the muscle's main action (e.g. the transversus abdominis: its
   * drawing-in has no skeletal motion, so a small trunk twist shows the shortening). Keep it short (≤ 14 characters).
   */
  actionLabel?: string;
  /** Phase label of the stretch part (default 'ストレッチ：筋が伸びる'); same rules as `actionLabel`. */
  stretchLabel?: string;
  /** Rest configuration on top of the base (e.g. knees bent). */
  restPose?: Pose;
  camera?: CameraSpec;
  focus?: RegionId;
  /** Optional overrides for the demo's placement. */
  anchor?: Anchor | null;
  ground?: boolean | number;
  props?: Prop[];
}

export type StructurePart =
  /** Cord-like structures. tendon/ligament = cream, fascia = cream translucent sheet, nerve = yellow. */
  | {
      type: 'tendon' | 'ligament' | 'fascia' | 'nerve';
      path: AttachRef[];
      radius: number;
      flat?: Strand['flat'];
    }
  /** Soft blue ellipsoid sac. radii [lat, y, z] in the bone's frame; `off` = offset from `at` (lateral-positive). */
  | { type: 'bursa'; at: AttachRef; radii: Vec3; off?: Vec3 }
  /** Cartilage / labrum / disc / fat pad: a soft cushion shape (radii in the bone's frame). */
  | { type: 'cartilage' | 'fatpad'; at: AttachRef; radii: Vec3; off?: Vec3 }
  /** Glow on a point region of bone or a joint (e.g. greater trochanter, joint line). */
  | { type: 'spot'; at: AttachRef; radius: number }
  /** Tint whole bone pieces (e.g. ['tibia'] or ['calcaneus']). */
  | { type: 'bone'; parts: BonePartId[] };

export interface StructureRig {
  id: StructureId;
  parts: StructurePart[];
  /** Point used for the floating label (default: centre of the first part). */
  labelAt?: AttachRef;
  base?: BasePoseName;
  camera?: CameraSpec;
  focus?: RegionId;
}
