// Merges the per-region rig files. Rigging agents edit ONLY their own r*.ts file.
import type { MuscleId, StructureId } from '../../data/registry';
import * as r1 from './r1-shoulder';
import * as r2 from './r2-trunk-thigh';
import * as r3 from './r3-hip';
import * as r4 from './r4-leg-foot';
import type { MuscleRig, StructureRig } from './types';

export type { MuscleRig, Strand, StructurePart, StructureRig } from './types';

export const MUSCLE_RIGS: Partial<Record<MuscleId, MuscleRig>> = {
  ...r1.muscles,
  ...r2.muscles,
  ...r3.muscles,
  ...r4.muscles,
};

export const STRUCTURE_RIGS: Partial<Record<StructureId, StructureRig>> = {
  ...r1.structures,
  ...r2.structures,
  ...r3.structures,
  ...r4.structures,
};
