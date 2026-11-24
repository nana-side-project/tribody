// Highlight mappings shared by the condition / region pages and the 3D dev harness (dev/engine.tsx ?condition= /
// ?region=), so the harness always shows exactly what the pages show.
import { getMuscle, type Condition, type InvolvementRole, type MuscleId, type RegionId, type StructureId } from '../data';
import type { Highlight3DRole } from '../three/contract';
import type { Highlights } from '../svg/types';
import { isPrimaryRole } from './labels';

type PartId = MuscleId | StructureId;

/** 2D figure: the painful tissue itself (injured / irritated / compressed) red, the contributing parts amber. */
export function conditionHighlights2d(c: Pick<Condition, 'involved'>): Highlights {
  const h: Highlights = {};
  for (const i of c.involved ?? []) h[i.ref] = isPrimaryRole(i.role) ? 'injured' : 'involved';
  return h;
}

/**
 * 3D viewer: the tissue whose role is 'injured' itself first, then irritated / compressed ones (all 'injured' in 3D),
 * then the involved context ('involved'). The engine takes the first injured part for its camera and framing.
 */
export function conditionHighlights3d(c: Pick<Condition, 'involved'>): Partial<Record<PartId, Highlight3DRole>> {
  const rank = (r: InvolvementRole) => (r === 'injured' ? 0 : isPrimaryRole(r) ? 1 : 2);
  const h: Partial<Record<PartId, Highlight3DRole>> = {};
  for (const i of [...(c.involved ?? [])].sort((a, b) => rank(a.role) - rank(b.role)))
    h[i.ref] = isPrimaryRole(i.role) ? 'injured' : 'involved';
  return h;
}

/** Key muscles listed for a region whose belly lies outside that region's 3D crop although their data names the
 *  region (大腿筋膜張筋 reaches the knee only through the iliotibial band): selecting one frames its first region. */
export const BELLY_ELSEWHERE: Partial<Record<RegionId, MuscleId[]>> = { knee: ['tensor-fasciae-latae'] };

/**
 * Region page 3D card: the key muscles in muscle colour ('secondary' — amber means 「関係」 on condition pages), the
 * tapped chip 'selected'. A selected key muscle that lives in another region (中殿筋 on the knee page) is out of this
 * region's crop, so the camera frames its own first region.
 */
export function regionViewer(
  region: RegionId,
  keyMuscles: MuscleId[],
  selected: MuscleId | null,
): { highlights: Partial<Record<MuscleId, Highlight3DRole>>; focus: RegionId } {
  const highlights = Object.fromEntries(
    keyMuscles.map((m) => [m, m === selected ? 'selected' : 'secondary']),
  ) as Partial<Record<MuscleId, Highlight3DRole>>;
  const home = selected ? (getMuscle(selected)?.regions as RegionId[] | undefined) : undefined;
  const elsewhere = !!selected && (!home?.includes(region) || !!BELLY_ELSEWHERE[region]?.includes(selected));
  return { highlights, focus: elsewhere && home?.length ? home[0] : region };
}
