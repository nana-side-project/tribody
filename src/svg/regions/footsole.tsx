// Shared plantar (sole) geometry of the right foot: used by foot.tsx (sole / top views) and by the calf diagram's
// small sole inset that shows where fibularis longus inserts. Plantar coordinates: seen from below, toes up, big toe
// on the viewer's RIGHT; ≈15 units per cm, heel at y≈438, toe tips at y≈44. Original artwork.
import type { ReactNode } from 'react';
import { Part, Ten, ell, line, sp, tube, type Ctx, type P } from './hip';

type Pt = readonly [number, number];
export const mx = (p: Pt): [number, number] => [360 - p[0], p[1]];
export const mirror = (pts: readonly P[]): P[] => pts.map((q) => (q[2] ? [360 - q[0], q[1], 1] : [360 - q[0], q[1]]) as P);

/* ═════════════ foot outline & skeleton in plantar coordinates (big toe on the right) ═════════════ */

export const SKIN_SOLE: P[] = [
  [180, 438], [160, 434], [144, 422], [136, 402], [134, 372], [136, 340], [134, 310], [130, 280], [124, 250], [120, 224], [118, 200], [119, 182],
  // 5th toe (the smallest toe: about as wide as the 4th)
  [122, 164], [125, 146], [128, 130], [133, 119], [140, 116], [146, 123], [149, 136], [150, 148, 1],
  // 4th toe
  [151, 122], [155, 98], [163, 86], [172, 88], [176, 106], [176, 138, 1],
  // 3rd toe
  [177, 108], [179, 80], [187, 67], [196, 70], [199, 92], [198, 128, 1],
  // 2nd toe
  [199, 98], [201, 64], [208, 51], [218, 53], [222, 72], [223, 122, 1],
  // big toe
  [226, 96], [228, 62], [238, 46], [255, 44], [269, 57], [274, 88], [272, 124], [268, 152],
  [262, 182], [254, 212], [246, 242], [240, 272], [236, 302], [234, 332], [232, 362], [229, 392], [219, 418], [202, 432],
];

/** metatarsal centre lines (base → head) and widths, plantar coordinates */
export const MTS: { c: P[]; w: number[]; head: [number, number, number, number] }[] = [
  { c: [[234, 284], [237, 244], [241, 204], [245, 178]], w: [24, 17, 17, 24], head: [246, 168, 15, 13] },
  { c: [[212, 286], [212, 242], [211, 194], [210, 162]], w: [13, 9, 9, 12], head: [210, 154, 9.5, 8.5] },
  { c: [[194, 290], [192, 244], [189, 200], [186, 172]], w: [12, 8.5, 8.5, 11], head: [186, 164, 9, 8] },
  { c: [[174, 294], [171, 252], [167, 212], [163, 186]], w: [12, 8.5, 8.5, 11], head: [163, 178, 9, 8] },
  { c: [[154, 300], [150, 262], [144, 224], [139, 198]], w: [15, 9, 9, 11], head: [139, 190, 9, 8] },
];
/** phalanges per toe (plantar coordinates) */
export const PHAL: { c: P[]; w: number }[] = [
  { c: [[249, 152], [251, 108]], w: 17 },
  { c: [[252, 102], [253, 66]], w: 15 },
  { c: [[210, 145], [210, 113]], w: 9 },
  { c: [[210, 108], [210, 90]], w: 8 },
  { c: [[210, 86], [210, 64]], w: 8 },
  { c: [[186, 155], [187, 124]], w: 8.5 },
  { c: [[187, 119], [188, 102]], w: 7.5 },
  { c: [[188, 98], [188, 80]], w: 7.5 },
  { c: [[163, 169], [164, 140]], w: 8.5 },
  { c: [[164, 135], [165, 119]], w: 7.5 },
  { c: [[165, 115], [166, 100]], w: 7 },
  { c: [[139, 181], [137, 156]], w: 8 },
  { c: [[137, 151], [136, 136]], w: 7 },
  { c: [[136, 132], [135, 122]], w: 6.5 },
];

export const CALC_SOLE: P[] = [[180, 426], [204, 420], [218, 402], [220, 372], [214, 344], [206, 318], [194, 300], [172, 296], [154, 304], [144, 330], [140, 362], [144, 396], [156, 418]];

export function Metatarsals({ mirrored = false, cls = 'bone' }: { mirrored?: boolean; cls?: string }) {
  const f = (pts: readonly P[]) => (mirrored ? mirror(pts) : (pts as P[]));
  return (
    <>
      {/* tuberosity of the 5th metatarsal (drawn first so the shaft overlaps it) */}
      <path className={cls} d={ell(mirrored ? 213 : 147, 303, 8.5, 6.5, mirrored ? 24 : -24)} />
      {MTS.map((m, i) => {
        const [hx, hy, rx, ry] = m.head;
        const hc = mirrored ? mx([hx, hy]) : [hx, hy];
        return (
          <g key={i}>
            <path className={cls} d={tube(f(m.c), m.w, 20, 0.9)} />
            <path className={cls} d={ell(hc[0], hc[1], rx, ry)} />
          </g>
        );
      })}
    </>
  );
}

export function Phalanges({ mirrored = false, cls = 'bone' }: { mirrored?: boolean; cls?: string }) {
  return (
    <>
      {PHAL.map((ph, i) => (
        <path key={i} className={cls} d={tube(mirrored ? mirror(ph.c) : ph.c, ph.w, 10, 0.9)} />
      ))}
    </>
  );
}


/* ═════════════ fibularis (peroneus) longus tendon under the foot ═════════════ */

/**
 * Fibularis longus tendon, plantar coordinates: it comes forward along the lateral side of the calcaneus (below the
 * peroneal trochlea), turns round the lateral border into the groove on the plantar surface of the cuboid (just
 * behind the 5th metatarsal tuberosity), crosses the sole obliquely — forwards and medially, in the deepest layer —
 * and inserts on the plantar-lateral side of the base of the 1st metatarsal and the medial cuneiform.
 */
export const FL_SOLE: P[] = [[139, 380], [140, 354], [143, 335], [150, 322], [168, 313], [192, 305], [214, 299], [229, 295]];
export const FL_SOLE_W = [5.5, 6.5, 7, 7.5, 7.5, 7, 7, 7.5];
/** the two insertion slips: base of the 1st metatarsal / medial cuneiform */
const FL_SLIPS: P[][] = [
  [[226, 295], [234, 292], [240, 289]],
  [[226, 296], [234, 299], [241, 302]],
];

/** See-through ("x-ray") style for a tendon that runs deep to what is drawn over it. */
export const XRAY_CSS = `
.thk .ten-x { fill: var(--tendon); fill-opacity: .55; stroke: var(--k-ten-ink); stroke-width: .9; stroke-dasharray: 3 2; }
.thk .is-injured .ten-x { fill: var(--injured); fill-opacity: 1; stroke: var(--k-inj-ink); stroke-dasharray: none; }
.thk .is-involved .ten-x { fill: color-mix(in srgb, var(--tendon) 62%, var(--k-amber)); fill-opacity: 1; stroke: var(--k-amber); stroke-width: 1.5; stroke-dasharray: none; }
.thk :is(.is-selected, .is-muscle) .ten-x { fill-opacity: 1; stroke: var(--text); stroke-width: 1.6; stroke-dasharray: none; }`;

/** The tendon (and its insertion slips) in plantar coordinates; `cls` = 'ten-x' (see-through) or 'ten'. */
export function FlSoleTendon({ cls = 'ten-x', grow = 1 }: { cls?: string; grow?: number }) {
  return (
    <>
      {FL_SLIPS.map((c, i) => (
        <path key={i} className={cls} d={tube(c, [5 * grow, 4 * grow, 3.2 * grow], 10, 0.9)} />
      ))}
      <Ten c={FL_SOLE} w={FL_SOLE_W.map((x) => x * grow)} cls={cls} lines={cls === 'ten' ? 2 : 1} />
    </>
  );
}

/* ═════════════ sole inset for the calf diagram (fibularis longus insertion) ═════════════ */

/** Calcaneus ending at the calcaneocuboid joint, and the midfoot bones (plantar coordinates; schematic). */
const CALC_IN: P[] = [[180, 426], [204, 420], [218, 402], [220, 372], [214, 346], [205, 330], [188, 323], [168, 323], [153, 328], [144, 344], [140, 366], [144, 396], [156, 418]];
const MIDFOOT: { d: P[]; ln?: P[] }[] = [
  // cuboid, with the groove for the fibularis longus tendon running obliquely across its plantar surface
  { d: [[146, 306], [162, 299], [180, 300], [188, 309], [186, 320], [168, 322], [152, 326], [143, 318]], ln: [[146, 318], [166, 311], [186, 306]] },
  // navicular
  { d: [[198, 318], [214, 313], [232, 316], [240, 324], [232, 332], [212, 333], [198, 330]] },
  // cuneiforms: lateral, intermediate, medial
  { d: [[188, 300], [202, 298], [206, 306], [204, 316], [190, 316]] },
  { d: [[206, 297], [220, 296], [222, 306], [220, 314], [206, 314]] },
  { d: [[223, 296], [244, 293], [250, 302], [246, 314], [236, 318], [224, 314]] },
];

/** Inset geometry in the host frame: the sole is turned 180° (heel up, toes down, big toe on the LEFT) so that, below
 * a posterior view of the leg, it continues the leg the right way round (medial left, lateral right). */
export const SOLE_INSET = { cx: 180, cy: 634, s: 0.5, x: 110, y: 524, w: 140, h: 220 };
const FOOT_C: [number, number] = [196, 241];
/** Host-frame point of a plantar-coordinate point in the inset. */
export function soleInsetPt(p: readonly number[]): [number, number] {
  const { cx, cy, s } = SOLE_INSET;
  return [cx - (p[0] - FOOT_C[0]) * s, cy - (p[1] - FOOT_C[1]) * s];
}

/**
 * Small "sole seen from below" inset showing the fibularis longus tendon crossing the foot to its insertion.
 * Drawn by the calf diagram below its posterior view when fibularis longus is shown on its own (muscle page).
 * `from` = host-frame point where the tendon leaves the leg (behind the lateral malleolus), joined by a dashed lead.
 */
export function FlSoleInset({ k, from, children }: { k: Ctx; from: readonly [number, number]; children?: ReactNode }) {
  const { cx, cy, s, x, y, w, h } = SOLE_INSET;
  const tf = `translate(${cx} ${cy}) scale(${-s}) translate(${-FOOT_C[0]} ${-FOOT_C[1]})`;
  const start = soleInsetPt(FL_SOLE[0]);
  const id = `${k.uid}-flsole`;
  return (
    <g className="thk-inset">
      <defs>
        <clipPath id={id}>
          <rect x={x} y={y} width={w} height={h} rx={14} />
        </clipPath>
      </defs>
      <rect className="inset-bg" x={x} y={y} width={w} height={h} rx={14} />
      <g clipPath={`url(#${id})`}>
        <g transform={tf}>
          {/* the locator foot stays readable (not dimmed with the rest of the figure) */}
          <g aria-hidden="true">
            <path className="body" d={sp(SKIN_SOLE)} style={{ stroke: 'var(--border)', strokeWidth: 2 }} />
            <g opacity={0.75}>
              <Phalanges cls="bone-g" />
              <Metatarsals cls="bone-g" />
              <path className="bone-g" d={sp(CALC_IN)} />
              {MIDFOOT.map((b, i) => (
                <path key={i} className="bone-g" d={sp(b.d)} />
              ))}
            </g>
            <path className="bone-ln" d={line(MIDFOOT[0].ln!)} />
            <path className="bone-g" d={ell(147, 303, 8.5, 6.5, -24)} />
          </g>
          <Part k={k} id="fibularis-longus">
            <FlSoleTendon cls="ten" grow={1.5} />
          </Part>
        </g>
      </g>
      <path className="inset-ln" d={`M${from[0]} ${from[1]}C${from[0] + 14} ${from[1] + 34} ${start[0] + 12} ${start[1] - 40} ${start[0]} ${start[1]}`} />
      {children}
    </g>
  );
}
