// Highlight mappings shared by the condition / region pages and the 3D dev harness (dev/engine.tsx ?condition= /
// ?region=), so the harness always shows exactly what the pages show.
import { CONDITIONS, getMuscle, type Condition, type ConditionId, type InvolvementRole, type MuscleId, type RegionId, type StructureId } from '../data';
import type { Highlight3DRole } from '../three/contract';
import type { Highlights, RegionDiagram } from '../svg/types';
import { isPrimaryRole } from './labels';

type PartId = MuscleId | StructureId;

/**
 * How a role is drawn in both views: the painful tissue itself (injured / irritated / compressed) 'injured' (red), the
 * contributing parts (overloaded / tight / weak) and the context tissue that only runs close by ('nearby', 近くの組織:
 * e.g. a nerve beside the lesion, not damaged) 'involved' (amber).
 */
export const roleHighlight = (r: InvolvementRole): 'injured' | 'involved' => (isPrimaryRole(r) ? 'injured' : 'involved');

/** 2D figure: the painful tissue itself red, the contributing parts and nearby tissue amber (roleHighlight). */
export function conditionHighlights2d(c: Pick<Condition, 'involved'>): Highlights {
  const h: Highlights = {};
  for (const i of c.involved ?? []) h[i.ref] = roleHighlight(i.role);
  return h;
}

/**
 * 3D viewer: the tissue whose role is 'injured' itself first, then irritated / compressed ones (all 'injured' in 3D),
 * then the contributing parts and last the nearby context (both 'involved'). The engine takes the first injured part
 * for its camera and framing.
 */
export function conditionHighlights3d(c: Pick<Condition, 'involved'>): Partial<Record<PartId, Highlight3DRole>> {
  const rank = (r: InvolvementRole) => (r === 'injured' ? 0 : isPrimaryRole(r) ? 1 : r === 'nearby' ? 3 : 2);
  const h: Partial<Record<PartId, Highlight3DRole>> = {};
  for (const i of [...(c.involved ?? [])].sort((a, b) => rank(a.role) - rank(b.role))) h[i.ref] = roleHighlight(i.role);
  return h;
}

/**
 * Central / bilateral problems (non-specific low back pain, the neck on the bike) are drawn the same whichever side was
 * tapped: their 3D scenes are marked `bilateral` (src/three/scenes.ts; a test keeps the two lists equal), so the 2D
 * figure is not mirrored either — otherwise the low back's deep / superficial halves would swap in 2D only.
 */
export const BILATERAL_CONDITIONS: ReadonlySet<ConditionId> = new Set<ConditionId>(['low-back-pain', 'cyclist-neck-pain']);

/** The side a condition page draws its figure and 3D on (undefined = the default right side). */
export const drawnSide = (c: ConditionId, side: 'left' | 'right' | null | undefined): 'left' | 'right' | undefined =>
  side && !BILATERAL_CONDITIONS.has(c) ? side : undefined;

/**
 * Central regions: every condition of the region is bilateral (today the low back and the neck). Their region page draws
 * the figure and 3D unmirrored as well, so the drawing does not flip between the region page and the condition pages it
 * links to (the links still carry the side: 「選んだ場所」 and the pain-log link on the condition page).
 */
export const BILATERAL_REGIONS: ReadonlySet<RegionId> = new Set<RegionId>(
  CONDITIONS.map((c) => c.region).filter((r) => CONDITIONS.every((c) => c.region !== r || BILATERAL_CONDITIONS.has(c.id))),
);

/** The side a region page draws its figure and 3D on (undefined = the default right side). */
export const regionDrawnSide = (r: RegionId, side: 'left' | 'right' | null | undefined): 'left' | 'right' | undefined =>
  side && !BILATERAL_REGIONS.has(r) ? side : undefined;

/**
 * The side the hotspots / the selected-spot marker of a bilateral figure go to (RegionDiagramProps.spotSide): the
 * drawing stays unmirrored, only the marker moves across the body's midline to the side the user tapped (a left tap
 * marks the left half). Undefined where the whole figure is drawn on that side (drawnSide) or no side was tapped.
 */
export const spotSideOf = (c: ConditionId, side: 'left' | 'right' | null | undefined): 'left' | 'right' | undefined =>
  side && BILATERAL_CONDITIONS.has(c) ? side : undefined;

/** The same for a region page (central regions, BILATERAL_REGIONS; the others mirror the whole figure). */
export const regionSpotSide = (r: RegionId, side: 'left' | 'right' | null | undefined): 'left' | 'right' | undefined =>
  side && BILATERAL_REGIONS.has(r) ? side : undefined;

/**
 * A bilateral condition page opened from a tapped spot: the views of its figure that have a hotspot for that spot
 * (where the page marks it, see spotSideOf), and the view to open on — the first of them (the view its region page
 * shows the spot on), provided it draws some of the painful tissue `primary`; otherwise none (the usual view).
 */
export function spotMarkViews(
  d: Pick<RegionDiagram, 'views' | 'spots' | 'parts'> | undefined,
  spot: string,
  primary: readonly string[],
): { views: string[]; open: string | undefined } {
  const views = (d?.views ?? []).map((v) => v.id).filter((v) => ((d?.spots[v] ?? []) as string[]).includes(spot));
  const first = views[0];
  const open = first && primary.some((id) => ((d?.parts[first] ?? []) as string[]).includes(id)) ? first : undefined;
  return { views, open };
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
