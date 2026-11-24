// Shared plantar (sole) geometry of the right foot: used by foot.tsx (sole / top views) and by the calf diagram's
// small sole inset that shows where fibularis longus inserts. Plantar coordinates: seen from below, toes up, big toe
// on the viewer's RIGHT; ≈15 units per cm, heel at y≈438, toe tips at y≈44. Original artwork.
//
// Skeleton proportions (foot ≈ 394 units ≈ 26 cm): calcaneus 313–428 (≈ 7.7 cm, ~30 % of the foot); midfoot tarsals
// (navicular, cuneiforms, cuboid) 254–323 medially / 268–313 laterally, with the talar head behind the navicular
// (to ≈ 345): ~1/4 of the foot on the medial side; metatarsals 6.6–8 cm; toes unchanged.
import type { ReactNode } from 'react';
import { Part, Ten, crAt, ell, line, numAt, sp, tube, tubePart, type Ctx, type P, type PartId, type XY } from './hip';

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

/**
 * Metatarsal centre lines (base → head) and widths, plantar coordinates. The tube's rounded base end reaches
 * ≈ w/2·0.9 beyond the first point, so the bases sit on the cuneiforms / cuboid along the oblique tarsometatarsal
 * (Lisfranc) line: 1st base most distal (y≈254), 2nd recessed between the cuneiforms (≈266), 5th most proximal (≈281).
 */
export const MTS: { c: P[]; w: number[]; head: [number, number, number, number] }[] = [
  { c: [[226, 244], [232, 220], [239, 196], [245, 178]], w: [24, 17, 17, 24], head: [246, 168, 15, 13] },
  { c: [[205, 260], [207, 228], [209, 192], [210, 162]], w: [13, 9, 9, 12], head: [210, 154, 9.5, 8.5] },
  { c: [[190, 257], [189, 226], [187, 196], [186, 172]], w: [12, 8.5, 8.5, 11], head: [186, 164, 9, 8] },
  { c: [[172, 267], [170, 236], [167, 208], [163, 186]], w: [12, 8.5, 8.5, 11], head: [163, 178, 9, 8] },
  // 5th: the centre line starts in the tuberosity of its base (fibularis brevis inserts there), which flares
  // backwards and laterally beyond the cuboid
  { c: [[146, 290], [155, 276], [152, 248], [145, 218], [139, 198]], w: [10, 15, 9.5, 9, 11], head: [139, 190, 9, 8] },
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
/** the two sesamoid bones under the head of the 1st metatarsal (in the flexor hallucis brevis tendons) */
export const SESAMOIDS = [ell(240, 172, 5, 7.5), ell(253, 170, 5, 7.5)];

/**
 * Calcaneus seen from below: anterior process ending at the calcaneocuboid joint (laterally, y≈313), lateral border,
 * tuberosity (heel), medial concavity and the sustentaculum tali (medial shelf that carries the talus).
 */
export const CALC: P[] = [
  [184, 316], [170, 313], [156, 314], [150, 319],
  [148, 334], [147, 352], [149, 372], [152, 392], [157, 409], [165, 421], [179, 428],
  [195, 427], [206, 419], [211, 406],
  [208, 393], [206, 383], [208, 374],
  [214, 366], [216, 357], [213, 349], [205, 345],
  [196, 339], [189, 328],
];
/** medial process of the calcaneal tuberosity: origin of the plantar fascia, flexor digitorum brevis, abductor hallucis
 * (its anterior margin drawn as a relief line; centre ≈ 198, 401) */
export const CALC_MED_PROC = line([[186, 407], [188, 398], [196, 393], [205, 394], [210, 400]]);
/** lateral process of the calcaneal tuberosity (abductor digiti minimi): smaller, at the lateral corner */
export const CALC_LAT_PROC = line([[157, 409], [160, 402], [167, 399], [173, 403]]);
/** head of the talus: only the part seen between the navicular (in front), the sustentaculum tali and the anterior
 * calcaneus (behind / laterally) — the spring-ligament area */
export const TALUS_HEAD = sp([
  [190, 321], [198, 322.5], [208, 322.5], [218, 324], [222, 329], [221, 336], [214, 342], [205, 345], [196, 339], [190, 329],
]);
/** navicular: concave behind (talar head), three facets in front (cuneiforms), tuberosity medially (tibialis posterior) */
export const NAVIC: P[] = [
  [187, 305], [196, 302], [208, 301], [219, 301], [225, 305], [229, 311], [227, 319], [218, 323], [208, 321], [198, 321], [190, 319], [186, 312],
];
/** cuboid: 4th / 5th metatarsal bases in front, calcaneus behind, notch on the lateral border for fibularis longus */
export const CUBOID: P[] = [
  [183, 268, 1], [168, 274], [153, 282, 1], [148, 291], [146, 299], [149, 307], [158, 311], [171, 310], [183, 313, 1], [184, 296], [184, 282],
];
/** tuberosity (ridge) of the cuboid: the posterior lip of the groove for the fibularis longus tendon */
export const CUBOID_RIDGE: P[] = [[151, 307], [165, 301], [182, 292]];
/** cuneiforms: lateral, intermediate (shortest: the 2nd metatarsal base is recessed), medial (largest) */
export const CUNE: P[][] = [
  [[184, 263], [192, 261], [198, 264], [198, 282], [198, 299], [190, 300], [184, 298], [184, 280]],
  [[199, 267], [205, 265], [211, 268], [211, 284], [211, 299], [205, 300], [199, 299], [199, 284]],
  [[212, 256], [221, 253], [229, 256], [232, 270], [231, 286], [227, 298], [219, 300], [212, 298], [212, 276]],
];

/** Tarsal bones in front of the calcaneus (talar head, navicular, cuneiforms, cuboid with the groove's ridge). */
export function Midfoot({
  cls = 'bone',
  ln = 'bone-ln',
  talus = true,
  ridge = true,
  mirrored = false,
}: {
  cls?: string;
  ln?: string;
  talus?: boolean;
  ridge?: boolean;
  mirrored?: boolean;
}) {
  const f = (pts: readonly P[]) => (mirrored ? mirror(pts) : (pts as P[]));
  return (
    <>
      {talus && <path className={cls} d={TALUS_HEAD} />}
      {CUNE.map((c, i) => (
        <path key={i} className={cls} d={sp(f(c))} />
      ))}
      <path className={cls} d={sp(f(CUBOID))} />
      {ridge && <path className={ln} d={line(f(CUBOID_RIDGE))} />}
    </>
  );
}

export function Navicular({ cls = 'bone', mirrored = false }: { cls?: string; mirrored?: boolean }) {
  return <path className={cls} d={sp(mirrored ? mirror(NAVIC) : NAVIC)} />;
}

export function Calcaneus({ cls = 'bone', ln = 'bone-ln' }: { cls?: string; ln?: string }) {
  return (
    <>
      <path className={cls} d={sp(CALC)} />
      <path className={ln} d={CALC_MED_PROC} />
      <path className={ln} d={CALC_LAT_PROC} />
    </>
  );
}

export function Metatarsals({ mirrored = false, cls = 'bone' }: { mirrored?: boolean; cls?: string }) {
  const f = (pts: readonly P[]) => (mirrored ? mirror(pts) : (pts as P[]));
  return (
    <>
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

/**
 * Metatarsal stress fracture (see lesionsOf in ./hip): the shaft–neck of the 2nd and 3rd metatarsals (the classic
 * runner's site, as the 3D scene's rays 2–3) in full red, each with a small crack across it.
 */
export function MtCrack({ mirrored = false }: { mirrored?: boolean }) {
  const f = (pts: readonly P[]) => (mirrored ? mirror(pts) : (pts as P[]));
  return (
    <>
      {MTS.slice(1, 3).map((m, i) => {
        const c = f(m.c);
        // crack: a short zig-zag across the shaft at u ≈ .66
        const u = 0.66;
        const a = crAt(c, u - 0.02);
        const b = crAt(c, u + 0.02);
        const o = crAt(c, u);
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const t: XY = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
        const nrm: XY = [-t[1], t[0]];
        const h = numAt(m.w, u, 9) * 0.62;
        const pt = (k: number, d: number): XY => [o[0] + nrm[0] * h * k + t[0] * d, o[1] + nrm[1] * h * k + t[1] * d];
        return (
          <g key={i}>
            <path className="bone" d={tubePart(c, m.w, 0.42, 0.93, 0.5)} />
            <path className="crack" d={line([pt(-1, 0), pt(-0.35, 1.6), pt(0.2, -1.4), pt(1, 0.6)])} />
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

/**
 * See-through ("x-ray") copy of bones drawn ABOVE the plantar soft tissue, so the skeleton reads through the muscles
 * and fascia. With `id` it follows that part's highlight / dim state (glow when injured); without, it is context.
 * Never tappable: taps fall through to the muscles below (the real part, with data-part, is drawn underneath).
 */
export function XRay({ k, id, zoned = false, children }: { k: Ctx; id?: PartId; zoned?: boolean; children: ReactNode }) {
  const role = id ? k.hl[id] : undefined;
  const cls = id ? `thk-part${role ? ` is-${role}` : ''}${k.dim && !role ? ' is-dim' : ''}` : `thk-ctx${k.dim ? ' is-dim' : ''}`;
  if (role === 'injured' && zoned) {
    // focal lesion drawn elsewhere (Part zone / Lesion): this copy in the light red of the rest of the part
    return (
      <g className={`${cls} is-zoned thk-xray`} aria-hidden="true">
        <g className="thk-zrest">{children}</g>
      </g>
    );
  }
  return (
    <g className={`${cls} thk-xray`} aria-hidden="true">
      {role === 'injured' && (
        <g className="thk-halo" filter={`url(#${k.uid}-glow)`}>
          {children}
        </g>
      )}
      {children}
    </g>
  );
}

/* ═════════════ fibularis (peroneus) longus tendon under the foot ═════════════ */

/**
 * Fibularis longus tendon, plantar coordinates: it comes forward along the lateral side of the calcaneus (below the
 * peroneal trochlea), turns round the lateral border of the cuboid (in its notch, just behind the tuberosity of the
 * 5th metatarsal) into the groove on the plantar surface of the cuboid, then crosses the sole obliquely — forwards
 * and medially, in the deepest layer, under the cuneiforms — and inserts on the plantar-lateral side of the base of
 * the 1st metatarsal and of the medial cuneiform.
 */
export const FL_SOLE: P[] = [[140, 384], [141, 362], [143, 340], [145, 321], [147, 307], [153, 299], [166, 292], [182, 283], [197, 275], [209, 268], [217, 263]];
export const FL_SOLE_W = [5.5, 6.5, 7, 7, 7.5, 7.5, 7.5, 7, 7, 7, 7];
/** the two insertion slips: base of the 1st metatarsal / medial cuneiform */
const FL_SLIPS: P[][] = [
  [[214, 263], [221, 258], [227, 252]],
  [[214, 264], [221, 266], [227, 269]],
];
/** label anchors: insertion (1st metatarsal base / medial cuneiform) and the tendon beside the calcaneus */
export const FL_INSERT: Pt = [222, 261];
export const FL_LAT: Pt = [142, 352];

/** See-through ("x-ray") style for a tendon / bones drawn over the plantar soft tissue (see XRay). */
export const XRAY_CSS = `
.thk .ten-x { fill: var(--tendon); fill-opacity: .55; stroke: var(--k-ten-ink); stroke-width: .9; stroke-dasharray: 3 2; }
.thk .is-injured .ten-x { fill: var(--injured); fill-opacity: 1; stroke: var(--k-inj-ink); stroke-dasharray: none; }
.thk .is-involved .ten-x { fill: color-mix(in srgb, var(--tendon) 62%, var(--k-amber)); fill-opacity: 1; stroke: var(--k-amber); stroke-width: 1.5; stroke-dasharray: none; }
.thk :is(.is-selected, .is-muscle) .ten-x { fill-opacity: 1; stroke: var(--text); stroke-width: 1.6; stroke-dasharray: none; }
.thk .bone-x { fill: var(--bone); fill-opacity: .22; stroke: var(--bone-ink); stroke-width: .8; stroke-linejoin: round; opacity: .75; pointer-events: stroke; }
.thk .bone-xl { fill: none; stroke: var(--bone-ink); stroke-width: .65; opacity: .6; stroke-linecap: round; }
.thk .is-injured .bone-x { fill: var(--injured); fill-opacity: .42; stroke: var(--k-inj-ink); stroke-width: 1.1; stroke-dasharray: none; opacity: 1; }
.thk .is-injured .bone-xl { stroke: #fff; opacity: .45; }
.thk .is-injured .thk-zrest .bone-x { fill: var(--injured); fill-opacity: .16; stroke: var(--k-zink); stroke-width: 1; }
.thk .is-involved .bone-x { fill: var(--k-amber); fill-opacity: .22; stroke: var(--k-amber); stroke-width: 1.5; stroke-dasharray: none; opacity: 1; }
.thk :is(.is-selected, .is-muscle) .bone-x { fill-opacity: .3; stroke: var(--text); stroke-width: 1.6; stroke-dasharray: none; opacity: 1; }
.thk .thk-halo :is(.bone-xl) { display: none !important; }
.thk :is(.thk-xray, .thk-halo) :is(.bone-x, .bone-xl), .thk .thk-xray { pointer-events: none; }`;

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
              {SESAMOIDS.map((d, i) => (
                <path key={i} className="bone-g" d={d} />
              ))}
              <Midfoot cls="bone-g" />
              <Navicular cls="bone-g" />
              <Calcaneus cls="bone-g" />
            </g>
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
