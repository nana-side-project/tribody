// Merges the per-region clip files. Clip agents edit ONLY their own k*.ts file.
import type { ExerciseId } from '../../data/registry';
import * as k1 from './k1-upper-core';
import * as k2 from './k2-hip';
import * as k3 from './k3-knee-foot';
import * as k4 from './k4-calf-ankle';
import type { Clip } from './types';

export type { Clip, ClipKey, Prop, PropPoint } from './types';

export const CLIPS: Partial<Record<ExerciseId, Clip>> = {
  ...k1.clips,
  ...k2.clips,
  ...k3.clips,
  ...k4.clips,
};
