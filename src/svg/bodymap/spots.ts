// Hotspot coordinates for the home-screen body map (data, so other modules/tests can use them).
//
// FRONT / BACK anchors are written for the figure's RIGHT side as (X, y):
//   X = lateral distance from the body midline, y = canvas y (viewBox 0 0 FIG_W FIG_H, midline CX).
//   The LEFT side is the mirror image. On the canvas:
//     front view — the figure faces the viewer, so its RIGHT side is on the viewer's LEFT:  x = CX − X
//     back view  — seen from behind, its RIGHT side is on the viewer's RIGHT:               x = CX + X
// SOLE anchors are foot-local (m, v) — see ./sole.ts (both soles seen from below, toes up;
//   the right sole is drawn on the viewer's left).
//
// Scale: 1 cm ≈ 5.65 units (stature 170 cm ≈ 960 units).
import { PAIN_SPOTS, type PainSpotId } from '../../data/registry';
import { CX } from './figure';
import { solePt } from './sole';

export type BodyView = 'front' | 'back' | 'sole';
export type Side = 'left' | 'right';

type SpotEntry = (typeof PAIN_SPOTS)[number];
/** Ids of the pain spots that list view V (type-level, so a missing anchor is a type error). */
export type SpotIdsIn<V extends BodyView> = SpotEntry extends infer E
  ? E extends { id: infer I; views: readonly (infer W)[] }
    ? V extends W
      ? I
      : never
    : never
  : never;

export interface Anchor {
  /** front/back: lateral offset from the midline; sole: medial offset m (fraction of foot length) */
  x: number;
  /** front/back: canvas y; sole: v (fraction of foot length from the back of the heel) */
  y: number;
}

export const FRONT_SPOTS: Record<SpotIdsIn<'front'>, Anchor> = {
  // anterior shoulder over the bicipital groove / long-head biceps tendon, ~6 cm below the acromion
  'shoulder-front': { x: 91, y: 236 },
  // top-lateral shoulder: just below the acromion over the subacromial bursa / supraspinatus insertion
  'shoulder-top': { x: 100, y: 202 },
  // greater trochanter (lateral hip)
  'hip-outer': { x: 84.5, y: 492 },
  // front of the hip just below the inguinal line (iliopsoas / rectus femoris origin, hip joint)
  'hip-front': { x: 53, y: 491 },
  // adductor longus origin at the pubic bone (medial groin)
  'groin-inner': { x: 19.5, y: 526 },
  // patella (centre)
  'knee-front': { x: 45, y: 682 },
  // inferior pole of the patella / proximal patellar tendon
  'knee-below': { x: 45, y: 713 },
  // lateral joint line / lateral femoral epicondyle region (ITB)
  'knee-outer': { x: 66, y: 703 },
  // pes anserinus: antero-medial tibia ~5 cm below the medial joint line
  'knee-inner': { x: 24, y: 739 },
  // postero-medial tibial border, junction of middle and distal thirds
  'shin-inner': { x: 26.5, y: 858 },
  // lateral malleolus / ATFL just in front of and below it
  'ankle-outer': { x: 66.5, y: 937 },
  // medial malleolus (posterior tibial tendon runs behind and below it)
  'ankle-inner': { x: 31.5, y: 934 },
  // dorsum of the foot over the 2nd/3rd metatarsals
  'forefoot-top': { x: 50, y: 962 },
};

export const BACK_SPOTS: Record<SpotIdsIn<'back'>, Anchor> = {
  'shoulder-top': { x: 100, y: 202 },
  // posterior shoulder below the acromion's posterior angle (infraspinatus / teres minor / posterior capsule)
  'shoulder-back': { x: 84, y: 233 },
  // between the medial border of the scapula and the spine (rhomboids / mid trapezius)
  'scapula-medial': { x: 27, y: 263 },
  // upper trapezius / levator scapulae at the base of the neck
  'neck-base': { x: 48, y: 182 },
  // posterior cervical paraspinals (both sides of the spine)
  'neck-back': { x: 11, y: 148 },
  // lumbar paraspinals at ~L3–L4 (both sides of the spine)
  'lowback-center': { x: 14, y: 408 },
  // greater trochanter seen from behind
  'hip-outer': { x: 84.5, y: 492 },
  // deep gluteal space: piriformis line between sacrum and greater trochanter
  'buttock-deep': { x: 46, y: 497 },
  // ischial tuberosity, at the medial end of the gluteal fold (proximal hamstring origin)
  'sit-bone': { x: 27, y: 549 },
  'knee-outer': { x: 66, y: 703 },
  // medial gastrocnemius belly (upper–middle calf)
  'calf-upper': { x: 33, y: 776 },
  // lower calf: gastrocnemius–soleus musculotendinous junction
  'calf-lower': { x: 45.5, y: 842 },
  // Achilles mid-portion, ~5.5 cm above its calcaneal insertion
  'achilles-mid': { x: 49.6, y: 928 },
  // Achilles insertion on the back of the calcaneus (retrocalcaneal bursa)
  'heel-back': { x: 49.6, y: 962 },
  // behind / below the lateral malleolus (peroneal tendons; ATFL in front)
  'ankle-outer': { x: 67.5, y: 947 },
  // behind / below the medial malleolus (posterior tibial tendon)
  'ankle-inner': { x: 32, y: 944 },
};

export const SOLE_SPOTS: Record<SpotIdsIn<'sole'>, Anchor> = {
  // medial calcaneal tubercle (plantar fascia origin), antero-medial heel
  'heel-bottom': { x: 0.035, y: 0.15 },
  // medial longitudinal arch
  arch: { x: 0.088, y: 0.42 },
  // 3rd metatarsal head / 3rd–4th interspace (ball of the foot)
  'forefoot-ball': { x: -0.035, y: 0.705 },
};

export interface PlacedSpot {
  id: PainSpotId;
  side: Side;
  /** canvas coordinates */
  x: number;
  y: number;
  label: string;
  /** unique key per spot+side */
  key: string;
}

const labelOf = new Map<PainSpotId, string>(PAIN_SPOTS.map((s) => [s.id, s.ja]));

const placedCache = new Map<BodyView, PlacedSpot[]>();

/** All hotspots of a view (both sides), in canvas coordinates. */
export function placeSpots(view: BodyView): PlacedSpot[] {
  const hit = placedCache.get(view);
  if (hit) return hit;
  const out: PlacedSpot[] = [];
  const table: Partial<Record<PainSpotId, Anchor>> =
    view === 'front' ? FRONT_SPOTS : view === 'back' ? BACK_SPOTS : SOLE_SPOTS;
  // iterate in registry order so focus order is stable top → bottom
  for (const s of PAIN_SPOTS) {
    const a = table[s.id];
    if (!a) continue;
    for (const side of ['right', 'left'] as const) {
      let x: number;
      let y: number;
      if (view === 'sole') {
        [x, y] = solePt(side, a.x, a.y);
      } else {
        const towardsViewerRight = view === 'back' ? side === 'right' : side === 'left';
        x = CX + (towardsViewerRight ? a.x : -a.x);
        y = a.y;
      }
      out.push({ id: s.id, side, x, y, label: labelOf.get(s.id) ?? s.id, key: `${s.id}:${side}` });
    }
  }
  placedCache.set(view, out);
  return out;
}

export const SIDE_JA: Record<Side, string> = { right: '右', left: '左' };

/** Accessible name, e.g. 「膝の外側・右」. */
export function spotAriaLabel(p: Pick<PlacedSpot, 'label' | 'side'>): string {
  return `${p.label}・${SIDE_JA[p.side]}`;
}
