// Names of the individually highlightable bone pieces (used by StructurePart { type: 'bone' } and by
// Figure.tint / Figure.ghost). Midline pieces exist once; all others exist per side (resolved to the structure's
// side, right by default).
export const MIDLINE_BONE_PARTS = [
  'skull',
  'mandible',
  'cervical',
  'thoracic',
  'lumbar',
  'discs',
  'sacrum',
  'coccyx',
  'sternum',
  'pubic_symphysis',
] as const;

export const SIDED_BONE_PARTS = [
  'ribs',
  'costal_cartilage',
  'ilium',
  'pubis',
  'ischium',
  'ischial_tuberosity',
  'acetabulum',
  'clavicle',
  'scapula',
  'acromion',
  'coracoid',
  'glenoid',
  'humerus',
  'humeral_head',
  'greater_tubercle',
  'radius',
  'ulna',
  'hand',
  'femur',
  'femoral_head',
  'greater_trochanter',
  'femoral_condyles',
  'lateral_epicondyle',
  'patella',
  'tibia',
  'tibial_plateau',
  'medial_malleolus',
  'fibula',
  'fibular_head',
  'lateral_malleolus',
  'talus',
  'calcaneus',
  'navicular',
  'cuboid',
  // the three cuneiforms (group alias 'cuneiforms') and the five metatarsals, one per ray (group alias 'metatarsals')
  'cuneiform_medial',
  'cuneiform_intermediate',
  'cuneiform_lateral',
  'metatarsal_1',
  'metatarsal_2',
  'metatarsal_3',
  'metatarsal_4',
  'metatarsal_5',
  'phalanges',
] as const;

/**
 * Group aliases: a name that stands for several pieces (all sided). Every API that takes a bone part name
 * (structure rigs, Figure.tint / ghost / partMeshes) accepts them and expands them to their members.
 */
export const BONE_PART_GROUPS = {
  metatarsals: ['metatarsal_1', 'metatarsal_2', 'metatarsal_3', 'metatarsal_4', 'metatarsal_5'],
  cuneiforms: ['cuneiform_medial', 'cuneiform_intermediate', 'cuneiform_lateral'],
} as const satisfies Record<string, readonly (typeof SIDED_BONE_PARTS)[number][]>;

/** A single piece (what the skeleton builds). */
export type BonePieceId = (typeof MIDLINE_BONE_PARTS)[number] | (typeof SIDED_BONE_PARTS)[number];
/** A piece or a group alias (what rigs and the figure API accept). */
export type BonePartId = BonePieceId | keyof typeof BONE_PART_GROUPS;

const MIDLINE = new Set<string>(MIDLINE_BONE_PARTS);
export const isMidlinePart = (p: string) => MIDLINE.has(p);

/** The pieces a part name stands for (itself, or a group alias's members). */
export function bonePieces(part: string): readonly string[] {
  return (BONE_PART_GROUPS as Record<string, readonly string[]>)[part] ?? [part];
}
