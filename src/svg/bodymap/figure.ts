// Original body-map artwork: an athletic, gender-neutral adult in anatomical position
// (palms forward, arms slightly away from the body, feet slightly apart), ~8 heads tall.
//
// Coordinate system (shared with ./spots.ts):
//   viewBox 0 0 FIG_W FIG_H, body midline at x = CX, vertex at y ≈ 20, soles at y ≈ 985.
//   Half-figure data is written as (X, y) where X = lateral distance from the midline (≥ 0).
//   1 cm ≈ 5.65 units (stature 170 cm ≈ 960 units).
//   Landmarks: chin 142 · acromion 192 · nipple line ~280 · elbow 372 · navel 396 · wrist 500 ·
//   greater trochanter 492 · crotch 527 · patella 668–701 · knee joint line ~704 · malleoli 930–940.
import { type CPt, type Pt, Limb, capsule, ellipse, mirror, shift, smooth, taper } from './geometry';

export const FIG_W = 460;
export const FIG_H = 1000;
export const CX = FIG_W / 2;

export type FigureView = 'front' | 'back';

// ───────────────────────── skeleton of the arm (right half, X ≥ 0) ─────────────────────────
const deg = (d: number) => (d * Math.PI) / 180;
const S: Pt = [95, 207]; // gleno-humeral joint centre
const UPPER = 168;
const FORE = 138;
const HAND = 100;
const a1 = deg(11); // upper arm abduction
const a2 = deg(19); // forearm (carrying angle, palm forward)
const a3 = deg(15); // hand
const E: Pt = [S[0] + UPPER * Math.sin(a1), S[1] + UPPER * Math.cos(a1)];
const W: Pt = [E[0] + FORE * Math.sin(a2), E[1] + FORE * Math.cos(a2)];
const T: Pt = [W[0] + HAND * Math.sin(a3), W[1] + HAND * Math.cos(a3)];
/** Arm in local coordinates: s along the axis from the shoulder joint, w lateral(+)/medial(−). */
export const arm = new Limb([S, E, W, T]);
export const ARM_S = { elbow: UPPER, wrist: UPPER + FORE, tip: UPPER + FORE + HAND };

// ───────────────────────── silhouette ─────────────────────────
// Head + neck + trunk + legs, from the vertex down the lateral side and back up the
// medial side of the leg to the crotch (right half). Mirrored for the other half.
const HEAD: CPt[] = [
  [0, 20],
  [16.5, 22.2],
  [28.8, 28.4],
  [36.4, 38.6],
  [40, 51],
  [41, 64],
  [40.8, 75],
  // ear
  [41.7, 82],
  [43, 89.5],
  [43.3, 97],
  [42.2, 104],
  [39.8, 110.4],
  // jaw → neck
  [36.6, 116.8],
  [33.2, 123.4],
  [30.2, 130],
  [28.6, 137.5],
  [28, 146],
  [28.8, 154.5],
  [31.4, 161],
  [37.4, 166.4],
  [50, 172.2],
  [67, 178.2],
  [83, 184],
  [95.5, 190],
  // under the deltoid (hidden by the arm)
  [103, 197],
  [101, 214],
  [95, 238],
  [89.5, 259],
];
const TORSO_LEG: CPt[] = [
  // flank below the armpit
  [86.4, 270],
  [85.6, 282],
  [84.4, 298],
  [82, 318],
  [78.6, 340],
  [74.8, 362],
  [71.8, 381],
  [71, 398],
  [72.4, 415],
  [75.8, 432],
  [80.8, 450],
  [86.2, 467],
  [89.8, 483],
  [91.4, 498],
  [91.8, 513],
  // lateral thigh (vastus lateralis)
  [92.2, 530],
  [92.2, 550],
  [91.2, 574],
  [89.2, 600],
  [86, 625],
  [81.8, 648],
  [77.4, 667],
  [73.8, 683],
  [71.8, 697],
  [71.8, 709],
  [70.8, 721],
  // lateral lower leg (lateral gastrocnemius, peronei)
  [71.4, 733],
  [73.4, 750],
  [75, 768],
  [75.2, 787],
  [73.8, 808],
  [71.2, 830],
  [68.2, 854],
  [65.6, 878],
  [63.8, 898],
  [63.4, 914],
  // lateral malleolus
  [66.2, 928],
  [68.2, 938],
  // foot (front view, slightly from above and turned out; toes are separate shapes)
  [70.6, 948],
  [74, 957],
  [77.4, 965.4],
  [79.6, 973],
  [79.8, 980],
  [76, 984.6],
  [67, 986.4],
  [57, 987],
  [46, 987.2],
  [36.6, 986.6],
  [30.2, 984.2],
  [27, 978],
  [26.6, 968],
  [27.6, 957],
  // medial malleolus
  [28.8, 940],
  [28.6, 930],
  [28, 920],
  // medial lower leg (medial gastrocnemius bulge)
  [27, 906],
  [24.8, 888],
  [21.6, 868],
  [17.6, 846],
  [13.8, 824],
  [11.2, 802],
  [10.6, 782],
  [11.8, 761],
  [14.2, 743],
  [16, 727],
  // medial knee and vastus medialis
  [16.4, 712],
  [15.6, 700],
  [13.6, 688],
  [10.8, 675],
  [9.4, 659],
  [9.4, 640],
  [8.8, 620],
  [7.6, 600],
  [6, 581],
];
const CROTCH_FRONT: CPt[] = [
  [4.4, 562],
  [2.8, 546],
  [1.4, 534],
  [0, 527, 1],
];
// From behind the buttocks overlap the top of the inner thighs, so the gap starts lower.
const CROTCH_BACK: CPt[] = [
  [4.4, 562],
  [2.2, 556.6],
  [0, 554, 1],
];

const ARM_OUTLINE: CPt[] = arm.pts([
  [-15, 7],
  [-9, 15.4],
  [-1, 21.6],
  [10, 25.4],
  [26, 27],
  [44, 26.2],
  [62, 24],
  [80, 21.8],
  [96, 20.6],
  [112, 21.4],
  [130, 21.6],
  [148, 20.6],
  [162, 19.8],
  [171, 20.8],
  [183, 23],
  [198, 24.4],
  [220, 22.8],
  [248, 19.4],
  [276, 16.6],
  [298, 15.6],
  [310, 16.4],
  [326, 19.6],
  [342, 21],
  [356, 20.2],
  // across the knuckles (covered by the fingers)
  [362, 10],
  [363, 0],
  [362, -10],
  [358, -18.4],
  [344, -21.2],
  [326, -20.6],
  [312, -17.6],
  [301, -15.8],
  [284, -16],
  [258, -18],
  [230, -21.2],
  [204, -24],
  [184, -23.6],
  [170, -21.8],
  [158, -20.2],
  [140, -20.8],
  [118, -22.6],
  [95, -23.4],
  [75, -22.8],
  [58, -21.4],
  // closes inside the trunk
  [34, -18],
  [8, -12],
  [-12, -3],
]);

/** Fingers (capsules in arm coordinates). Palms face forward, so the thumb is lateral. */
const FINGERS: { a: [number, number]; b: [number, number]; ra: number; rb: number }[] = [
  { a: [354, 14.3], b: [400, 13], ra: 5.6, rb: 4.7 }, // index
  { a: [356, 4.6], b: [409, 3.6], ra: 5.8, rb: 4.9 }, // middle
  { a: [355, -5.3], b: [404, -6.3], ra: 5.5, rb: 4.7 }, // ring
  { a: [352, -14], b: [390, -15.8], ra: 5, rb: 4.1 }, // little
  { a: [322, 17], b: [368, 30], ra: 7.2, rb: 5.2 }, // thumb
];

/** Toes seen from the front (ellipses in half coordinates: X, y, rx, ry). */
const TOES_FRONT: [number, number, number, number][] = [
  [33.6, 988, 7, 7.6],
  [44.4, 989.6, 5.2, 6.1],
  [53.2, 989.8, 4.8, 5.7],
  [61.4, 989, 4.5, 5.2],
  [69, 986.6, 4.1, 4.7],
];

// ───────────────────────── contour lines ─────────────────────────
interface Line {
  pts: CPt[];
  w: number;
  a?: number;
  b?: number;
  faint?: boolean;
}

const A = (list: (readonly [number, number] | readonly [number, number, 1])[]) => arm.pts(list);

/** Finger separations, shared by both views. */
const FINGER_LINES: Line[] = [
  { pts: A([[366, 9.5], [395, 8.5]]), w: 0.9, faint: true },
  { pts: A([[366, -0.4], [399, -1.4]]), w: 0.9, faint: true },
  { pts: A([[364, -9.9], [388, -11.2]]), w: 0.9, faint: true },
];

/** Lines written in half coordinates, drawn on both sides. */
const FRONT_HALF: Line[] = [
  // jaw line (fades towards the ear, full at the chin so both halves join)
  { pts: [[32.5, 125], [26, 133.6], [16, 139.6], [6, 142], [0, 142.4]], w: 1.2, a: 0, b: 0.8, faint: true },
  // sternocleidomastoid
  { pts: [[34.8, 121], [29.3, 136], [21.6, 153], [13.4, 167.5], [8.6, 175]], w: 1.5, faint: true },
  // clavicle
  { pts: [[8.5, 176.2], [24, 178.4], [44, 176.6], [62, 178.6], [80, 183.6], [95.5, 190.4]], w: 2 },
  // deltopectoral groove → deltoid insertion
  { pts: [[73, 183.8], [77.6, 203], [84.4, 230], [93.4, 257], A([[98, 4]])[0]], w: 1.8 },
  // lower border of pectoralis major (anterior axillary fold)
  { pts: [[5, 286], [20, 298.5], [42, 303], [62, 296], [76, 282], [85.2, 268.5]], w: 2 },
  // linea semilunaris (lateral border of rectus abdominis)
  { pts: [[38.5, 306], [38, 342], [35.4, 382], [28.4, 430], [18, 468]], w: 1.6 },
  // tendinous intersections of rectus abdominis
  { pts: [[2.5, 329], [18, 331.5], [35.5, 327.5]], w: 1.3, faint: true },
  { pts: [[2.5, 356], [18, 358.5], [36.5, 355]], w: 1.3, faint: true },
  { pts: [[2.5, 382], [16, 383.5], [33, 381.5]], w: 1.1, faint: true },
  // external oblique / inguinal line (ASIS → pubis)
  { pts: [[77.5, 446], [66.5, 466], [50, 486], [33, 502], [17.5, 513.5]], w: 1.7 },
  // biceps (medial border is the stronger one), elbow crease, forearm
  { pts: A([[66, -14], [92, -15.6], [122, -14], [152, -8.4]]), w: 1.4 },
  { pts: A([[100, 12.4], [126, 12], [150, 8]]), w: 1.2, faint: true },
  { pts: A([[165.5, -12.5], [170, -3], [167.5, 8.5]]), w: 1.2 },
  { pts: A([[175, 13], [198, 11.4], [230, 6], [262, 2.6]]), w: 1.2, faint: true },
  { pts: A([[188, -11], [222, -8.4], [258, -4]]), w: 1.1, faint: true },
  { pts: A([[305, -11], [307.6, 0], [305.4, 10.5]]), w: 1.1, faint: true },
  { pts: A([[316, 10], [332, 12.4], [346, 12.6]]), w: 1, faint: true },
  ...FINGER_LINES,
  // sartorius
  { pts: [[74.5, 452], [66.5, 492], [53.5, 545], [38.5, 602], [26.5, 650], [19.8, 690], [18.6, 712]], w: 1.9 },
  // rectus femoris / vastus lateralis border
  { pts: [[74, 524], [73.6, 575], [69.4, 625], [61.6, 659], [54.5, 670.5]], w: 1.6 },
  // vastus medialis (teardrop above the inner knee)
  { pts: [[21, 626], [23.4, 650], [29.6, 670], [38.4, 679]], w: 1.7 },
  // patellar tendon + tibial tuberosity
  { pts: [[40.2, 701], [41.6, 715], [42.4, 728]], w: 1.15, faint: true },
  { pts: [[50.6, 701], [49.6, 715], [48.9, 728]], w: 1.15, faint: true },
  { pts: [[41.2, 731.5], [45.4, 734.8], [49.6, 731.5]], w: 1.2 },
  // tibial crest and (faint) medial tibial border
  { pts: [[46, 741], [44, 790], [40.6, 845], [36.6, 892], [34.2, 914]], w: 1.4 },
  { pts: [[19.6, 770], [21.6, 812], [24.6, 852], [27.4, 884]], w: 1.2, faint: true },
  // tibialis anterior (lateral border running into its tendon)
  { pts: [[66.6, 742], [65, 790], [59.6, 840], [52, 884], [43.6, 925]], w: 1.4 },
  // malleoli
  { pts: [[27.8, 921], [31.4, 928.4], [30, 936.4]], w: 1.5 },
  { pts: [[67.6, 927.6], [65.2, 935.8], [66.8, 944]], w: 1.5 },
  // ankle crease, extensor hallucis longus tendon
  { pts: [[33.5, 943.4], [44, 946.8], [56, 946.4], [65.8, 944]], w: 1.2, faint: true },
  { pts: [[41, 949], [37.4, 962], [34.2, 976]], w: 1.1, faint: true },
];

// patella outline (rounded, apex down)
const PATELLA: CPt[] = [
  [45, 667.6],
  [53.4, 669.6],
  [58.8, 677],
  [58.6, 688],
  [53, 697.4],
  [45, 701.4],
  [37, 697.4],
  [31.4, 688],
  [31.2, 677],
  [36.6, 669.6],
];

/** Lines on the midline, X relative to the midline (may be negative), drawn once. */
const FRONT_MID: Line[] = [
  // sternal notch
  { pts: [[-8.5, 173.4], [0, 178.2], [8.5, 173.4]], w: 1.5 },
  // sternum + linea alba
  { pts: [[0, 186], [0, 236], [0, 292]], w: 1.2, faint: true },
  { pts: [[0, 306], [0, 345], [0, 386]], w: 1.4 },
  // navel
  { pts: [[-4.6, 392.6], [0, 399.6], [4.6, 392.6]], w: 2 },
  { pts: [[0, 408], [0, 440], [0, 470]], w: 1.1, faint: true },
];

const BACK_HALF: Line[] = [
  // posterior neck (semispinalis bulge beside the nuchal groove)
  { pts: [[12.5, 116], [14.6, 138], [19, 157]], w: 1.3, faint: true },
  // spine of the scapula
  { pts: [[94, 196], [77, 207.6], [59, 223], [45, 237.6], [37.6, 246.6]], w: 1.9 },
  // medial border of the scapula with a rounded inferior angle
  { pts: [[42.4, 220], [38.8, 242], [39.4, 266], [43.4, 290], [49.4, 308], [55.6, 319.6], [61.6, 316], [67.6, 304]], w: 1.6 },
  // posterior deltoid border → insertion
  { pts: [[80.4, 207.4], [81.6, 232], [88.4, 260], [98.6, 283.6], A([[100, -1.5]])[0]], w: 1.7 },
  // latissimus dorsi lateral border
  { pts: [[82.6, 292], [78.4, 322], [72.4, 356], [66.6, 388], [62.4, 412]], w: 1.4, faint: true },
  // triceps
  { pts: A([[80, 12], [110, 12.6], [140, 9], [158, 4]]), w: 1.3 },
  { pts: A([[92, -13], [122, -12.6], [148, -7], [158, -3]]), w: 1.2, faint: true },
  // olecranon, forearm extensors, wrist, knuckles
  { pts: A([[163.8, -6.5], [170.4, 0], [166.4, 6.5]]), w: 1.3 },
  { pts: A([[185, 6.5], [230, 3.4], [275, 1.4]]), w: 1.1, faint: true },
  { pts: A([[304.6, -11], [306.8, 0], [304.6, 11]]), w: 1.1, faint: true },
  { pts: A([[353.6, -14], [356.4, -4.6], [357, 5], [355, 14]]), w: 1, faint: true },
  ...FINGER_LINES,
  // erector spinae column (lumbar)
  { pts: [[17.6, 352], [20.4, 384], [20.4, 414], [16, 442]], w: 1.5 },
  // iliac crest
  { pts: [[20, 450], [38, 441.6], [58, 439]], w: 1.2, faint: true },
  // PSIS dimple
  { pts: [[11.8, 462.4], [16, 466], [20.2, 462.4]], w: 1.6 },
  // gluteus maximus upper border
  { pts: [[11, 470], [36, 475], [60, 487], [78, 503], [87, 516]], w: 1.5, faint: true },
  // gluteal fold (medial two thirds, joining the cleft)
  { pts: [[1.6, 546.6], [18, 553.4], [38, 556.4], [56, 552.6], [67, 546]], w: 2, a: 0.5, b: 0 },
  // hollow behind the greater trochanter
  { pts: [[86, 522], [82.4, 537], [76, 548]], w: 1.3, faint: true },
  // hamstrings split, ITB posterior border, adductor border
  { pts: [[40.4, 572], [42.4, 610], [44.6, 645], [46.2, 664]], w: 1.5 },
  { pts: [[84.4, 565], [80.4, 615], [75.4, 660], [70.8, 690]], w: 1.4, faint: true },
  { pts: [[10.4, 574], [15, 615], [20.2, 650]], w: 1.2, faint: true },
  // popliteal fossa: hamstring tendons + crease
  { pts: [[56.4, 650], [63, 680], [66.6, 712]], w: 1.4 },
  { pts: [[34.4, 652], [26.4, 683], [22.2, 712]], w: 1.4 },
  { pts: [[27.4, 701], [45, 706.4], [62.6, 701]], w: 1.3, faint: true },
  // gastrocnemius: split between heads, lower borders (medial head ends lower)
  { pts: [[45, 726], [45.6, 760], [45.2, 798]], w: 1.3 },
  { pts: [[13, 792], [20, 824], [31, 846], [42.6, 856]], w: 1.8 },
  { pts: [[75, 785], [69, 810], [60, 828], [50.4, 838]], w: 1.8 },
  // soleus edges
  { pts: [[18.4, 834], [28.4, 868], [39, 898]], w: 1.3, faint: true },
  { pts: [[71.4, 824], [64.4, 862], [58.4, 895]], w: 1.3, faint: true },
  // Achilles tendon
  { pts: [[42.4, 862], [44.2, 895], [45.6, 925], [45, 945]], w: 1.3 },
  { pts: [[55.4, 858], [53.6, 893], [53.2, 925], [54, 945]], w: 1.3 },
  // heel (calcaneus from behind)
  { pts: [[35.4, 948], [36.8, 966], [44.4, 978.4]], w: 1.4 },
  { pts: [[64.6, 948], [63.4, 966], [56, 978.4]], w: 1.4 },
  // malleoli
  { pts: [[27.8, 921], [31.4, 929], [29.6, 937.4]], w: 1.5 },
  { pts: [[68.6, 929], [66.2, 937], [67.8, 945]], w: 1.5 },
];

const BACK_MID: Line[] = [
  // nuchal groove + C7
  { pts: [[0, 118], [0, 140], [0, 166]], w: 1.3, faint: true },
  { pts: [[-4.6, 173.4], [0, 170.4], [4.6, 173.4]], w: 1.5 },
  // spine
  { pts: [[0, 182], [0, 300], [0, 400], [0, 462]], w: 1.5 },
  // intergluteal cleft
  { pts: [[0, 474], [0, 510], [0, 549]], w: 1.9, a: 0, b: 0.4 },
];

// ───────────────────────── build ─────────────────────────
export interface FigureArt {
  /** Closed shapes whose union is the body silhouette. */
  body: string[];
  contours: { d: string; faint?: boolean }[];
  /** Stroked closed outlines (e.g. the patella). */
  loops: { d: string; faint?: boolean }[];
}

function trunkOutline(view: FigureView): CPt[] {
  const halfOutline: CPt[] = [...HEAD, ...TORSO_LEG, ...(view === 'front' ? CROTCH_FRONT : CROTCH_BACK)];
  const right = shift(halfOutline, CX);
  // mirrored half without the shared midline end-points (vertex / crotch)
  return [...right, ...mirror(right.slice(1, -1), CX)];
}

/** Control polygons of the trunk and both arms in canvas coordinates (for tests / hit logic). */
export function figureOutlines(view: FigureView): CPt[][] {
  return [trunkOutline(view), shift(ARM_OUTLINE, CX, 0, 1), shift(ARM_OUTLINE, CX, 0, -1)];
}

const cache = new Map<FigureView, FigureArt>();

export function buildFigure(view: FigureView): FigureArt {
  const hit = cache.get(view);
  if (hit) return hit;
  const body: string[] = [smooth(trunkOutline(view), true)];

  for (const sd of [1, -1] as const) {
    body.push(smooth(shift(ARM_OUTLINE, CX, 0, sd), true));
    for (const f of FINGERS) {
      const pa = arm.pt(f.a[0], f.a[1]);
      const pb = arm.pt(f.b[0], f.b[1]);
      body.push(capsule([CX + sd * pa[0], pa[1]], [CX + sd * pb[0], pb[1]], f.ra, f.rb));
    }
    if (view === 'front') {
      for (const [x, y, rx, ry] of TOES_FRONT) body.push(ellipse(CX + sd * x, y, rx, ry));
    }
  }

  const contours: FigureArt['contours'] = [];
  const halves = view === 'front' ? FRONT_HALF : BACK_HALF;
  const mids = view === 'front' ? FRONT_MID : BACK_MID;
  for (const l of halves) {
    for (const sd of [1, -1] as const) {
      contours.push({ d: taper(shift(l.pts, CX, 0, sd), l.w, { a: l.a, b: l.b }), faint: l.faint });
    }
  }
  for (const l of mids) contours.push({ d: taper(shift(l.pts, CX), l.w, { a: l.a, b: l.b }), faint: l.faint });

  const loops: FigureArt['loops'] = [];
  if (view === 'front') {
    for (const sd of [1, -1] as const) loops.push({ d: smooth(shift(PATELLA, CX, 0, sd), true) });
  }
  const art = { body, contours, loops };
  cache.set(view, art);
  return art;
}
