// k4 — calf + ankle exercise clips. Owner after the engine agent: clip agent k4. See docs/ENGINE.md.
import type { ExerciseId } from '../../data/registry';
import type { Clip } from './types';

export const clips: Partial<Record<ExerciseId, Clip>> = {
  // SAMPLE — straight-knee calf raise on the floor. The toes are pinned (anchor) so the heel rises.
  'ex-calf-raise-straight': {
    id: 'ex-calf-raise-straight',
    duration: 5,
    base: 'STAND',
    keys: [
      { t: 0, label: 'かかとを上げる（1秒）' },
      { t: 0.2, pose: { joints: { ankle: { dorsi: -34 }, toes: { ext: 34 } } }, label: 'キープ' },
      { t: 0.38, pose: { joints: { ankle: { dorsi: -34 }, toes: { ext: 34 } } }, label: 'ゆっくり下ろす（3秒）' },
      { t: 0.9 },
    ],
    loop: 'loop',
    anchor: { point: 'toes:toes_mid', axes: 'xyz' },
    ground: true,
    camera: 'isoBack',
    focus: 'calf',
    sides: 'both',
    highlights: { gastrocnemius: 'primary', soleus: 'secondary' },
  },
};
