// Registry of region diagrams. Each region module default-exports a RegionDiagram (or undefined while unfinished).
// Region-diagram agents edit ONLY their own <region>.tsx files — this index already imports all of them.
import type { MuscleId, RegionId, StructureId } from '../../data/registry';
import type { RegionDiagram } from '../types';
import shoulder from './shoulder';
import neck from './neck';
import lowback from './lowback';
import hip from './hip';
import knee from './knee';
import calf from './calf';
import ankle from './ankle';
import foot from './foot';

const all: Record<RegionId, RegionDiagram | undefined> = { shoulder, neck, lowback, hip, knee, calf, ankle, foot };

export const regionDiagrams: Partial<Record<RegionId, RegionDiagram>> = Object.fromEntries(
  Object.entries(all).filter(([, d]) => d),
) as Partial<Record<RegionId, RegionDiagram>>;

export const getRegionDiagram = (id: RegionId): RegionDiagram | undefined => all[id];

/**
 * The view that shows a part best, for parts drawn in several views (used by the muscle page to pick its diagram).
 * Without an entry, the UI takes the first view that lists the part, which can be a view where only a tendon end or a
 * thin strip of the muscle is visible. Maintained by the illustration owners; every entry must be a view whose
 * `parts` list contains the id (otherwise it is ignored).
 */
export const PREFERRED_VIEW: Partial<Record<MuscleId | StructureId, { region: RegionId; view: string }>> = {
  supraspinatus: { region: 'shoulder', view: 'back-deep' },
  'teres-minor': { region: 'shoulder', view: 'back-deep' },
  trapezius: { region: 'shoulder', view: 'back' },
  'latissimus-dorsi': { region: 'shoulder', view: 'back' },
  'triceps-brachii': { region: 'shoulder', view: 'back' },
  'gluteus-medius': { region: 'hip', view: 'side' },
  'tensor-fasciae-latae': { region: 'hip', view: 'side' },
  'adductor-magnus': { region: 'hip', view: 'back' },
  'rectus-femoris': { region: 'hip', view: 'front' },
  'vastus-lateralis': { region: 'hip', view: 'front' },
  'biceps-femoris': { region: 'hip', view: 'back' },
  semitendinosus: { region: 'hip', view: 'back' },
  semimembranosus: { region: 'hip', view: 'back' },
  'fibularis-longus': { region: 'ankle', view: 'lateral' },
  'fibularis-brevis': { region: 'ankle', view: 'lateral' },
  'flexor-hallucis-longus': { region: 'calf', view: 'deep' },
};
