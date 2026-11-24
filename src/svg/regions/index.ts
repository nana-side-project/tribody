// Registry of region diagrams. Each region module default-exports a RegionDiagram (or undefined while unfinished).
// Region-diagram agents edit ONLY their own <region>.tsx files — this index already imports all of them.
import type { RegionId } from '../../data/registry';
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
