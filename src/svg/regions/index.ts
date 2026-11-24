// Registry of region diagrams. Each region module default-exports a RegionDiagram.
// Owned by the region-diagram agents; the UI imports `regionDiagrams` / `getRegionDiagram`.
import type { RegionId } from '../../data/registry';
import type { RegionDiagram } from '../types';

export const regionDiagrams: Partial<Record<RegionId, RegionDiagram>> = {};

export const getRegionDiagram = (id: RegionId) => regionDiagrams[id];
