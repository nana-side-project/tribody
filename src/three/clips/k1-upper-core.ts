// k1 — shoulder / neck / core exercise clips. Owner after the engine agent: clip agent k1. See docs/ENGINE.md.
import type { ExerciseId } from '../../data/registry';
import type { Clip } from './types';

export const clips: Partial<Record<ExerciseId, Clip>> = {
  // SAMPLE — band external rotation: elbow at the side bent 90°, band anchored on the left at elbow height.
  'ex-band-er': {
    id: 'ex-band-er',
    duration: 4.5,
    base: 'STAND',
    pose: {
      joints: {
        shoulder_R: { abd: 10, flex: 0 },
        elbow_R: { flex: 90 },
        forearm_R: { sup: -85 },
        wrist_R: { flex: 0 },
      },
    },
    keys: [
      { t: 0, pose: { joints: { shoulder_R: { rot: -15 } } }, label: 'ひじを体側につけたまま外にひらく' },
      { t: 0.32, pose: { joints: { shoulder_R: { rot: 55 } } }, hold: 0.5, label: '1秒キープ' },
      { t: 0.45, pose: { joints: { shoulder_R: { rot: 55 } } }, label: 'ゆっくり戻す（3秒）' },
      { t: 0.95, pose: { joints: { shoulder_R: { rot: -15 } } } },
    ],
    loop: 'loop',
    // band anchored to a post on the figure's left at elbow height
    props: [
      { kind: 'box', at: [0.62, 1.16, 0.28], size: [0.05, 1.16, 0.05] },
      { kind: 'band', from: [0.6, 1.07, 0.28], to: 'hand:palm' },
    ],
    camera: { dir: [-0.3, 0.55, 0.85] },
    frame: ['hand:palm', 'scapula:acromion', 'humerus:head', 'thorax:xiphoid', 'forearm:olecranon', 'scapula_L:acromion'],
    sides: 'R',
    highlights: { infraspinatus: 'primary', 'teres-minor': 'primary', supraspinatus: 'secondary', deltoid: 'secondary' },
  },
};
