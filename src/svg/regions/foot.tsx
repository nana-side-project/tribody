// Region diagram: 足裏・足部 (foot) — the person's RIGHT foot, three views:
//   sole 足裏 (plantar view, toes up: the big toe is on the viewer's RIGHT, as when you look at the sole from below)
//   · medial 内側から (toes to the viewer's left; the medial longitudinal arch) · top 足の甲 (dorsal view, big toe on the LEFT).
// Drawn with the lower-limb kit from ./hip (muscle sheets, tendons, labels, hotspots). Original artwork.
// Sole / top: ≈15 units per cm, heel at y≈436, toes at y≈44. Medial: ≈12.5 units per cm, floor at y≈304.
import type { ReactNode } from 'react';
import type { RegionDiagram, RegionDiagramProps } from '../types';
import { Ctxt, Frame, M, Nerve, Part, Ten, ell, line, muscle, sp, tube, useCtx, type Ctx, type Lab, type P, type Spot } from './hip';
import { LfStyle, lfp } from './calf';

const W = 360;
const HS = 460; // sole & top
const HM = 360; // medial

type Pt = readonly [number, number];
const mx = (p: Pt): [number, number] => [360 - p[0], p[1]];
const mirror = (pts: readonly P[]): P[] => pts.map((q) => (q[2] ? [360 - q[0], q[1], 1] : [360 - q[0], q[1]]) as P);

/* ═════════════ foot outline & skeleton in plantar coordinates (big toe on the right) ═════════════ */

const SKIN_SOLE: P[] = [
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
const MTS: { c: P[]; w: number[]; head: [number, number, number, number] }[] = [
  { c: [[234, 284], [237, 244], [241, 204], [245, 178]], w: [24, 17, 17, 24], head: [246, 168, 15, 13] },
  { c: [[212, 286], [212, 242], [211, 194], [210, 162]], w: [13, 9, 9, 12], head: [210, 154, 9.5, 8.5] },
  { c: [[194, 290], [192, 244], [189, 200], [186, 172]], w: [12, 8.5, 8.5, 11], head: [186, 164, 9, 8] },
  { c: [[174, 294], [171, 252], [167, 212], [163, 186]], w: [12, 8.5, 8.5, 11], head: [163, 178, 9, 8] },
  { c: [[154, 300], [150, 262], [144, 224], [139, 198]], w: [15, 9, 9, 11], head: [139, 190, 9, 8] },
];
/** phalanges per toe (plantar coordinates) */
const PHAL: { c: P[]; w: number }[] = [
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

const CALC_SOLE: P[] = [[180, 426], [204, 420], [218, 402], [220, 372], [214, 344], [206, 318], [194, 300], [172, 296], [154, 304], [144, 330], [140, 362], [144, 396], [156, 418]];

function Metatarsals({ mirrored = false, cls = 'bone' }: { mirrored?: boolean; cls?: string }) {
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

function Phalanges({ mirrored = false, cls = 'bone' }: { mirrored?: boolean; cls?: string }) {
  return (
    <>
      {PHAL.map((ph, i) => (
        <path key={i} className={cls} d={tube(mirrored ? mirror(ph.c) : ph.c, ph.w, 10, 0.9)} />
      ))}
    </>
  );
}

/* ───────────── sole view ───────────── */

const SM = {
  fdb: muscle({
    r: [
      [[176, 402], [194, 402]],
      [[158, 362], [208, 362]],
      [[152, 322], [214, 322]],
      [[153, 284], [214, 284]],
      [[160, 252], [210, 252]],
      [[168, 234], [204, 234]],
    ],
    t0: 0.05,
    n: 11,
  }),
  abh: muscle({
    r: [
      [[204, 406], [218, 398]],
      [[210, 360], [232, 356]],
      [[214, 316], [237, 314]],
      [[220, 272], [242, 274]],
      [[228, 232], [246, 236]],
      [[238, 198], [252, 200]],
      [[246, 170], [258, 172]],
      [[252, 150], [260, 150]],
    ],
    t1: 0.6,
    n: 7,
  }),
  adm: muscle({
    r: [
      [[143, 404], [158, 406]],
      [[137, 360], [152, 362]],
      [[135, 320], [150, 320]],
      [[132, 280], [146, 280]],
      [[129, 240], [141, 240]],
      [[127, 206], [137, 206]],
      [[127, 186], [133, 186]],
    ],
    t1: 0.66,
    n: 5,
  }),
};
const PF_BODY = sp([
  [180, 411], [192, 409], [199, 398], [201, 372], [204, 332], [211, 292], [222, 256], [228, 242], [206, 236], [184, 238], [162, 244], [152, 254],
  [157, 292], [164, 332], [168, 372], [170, 400],
]);
const PF_SLIPS: { c: P[]; w: number[] }[] = [
  // digital slips: thin bands, so the (see-through) metatarsals stay readable beside them
  { c: [[226, 242], [236, 204], [244, 176]], w: [8, 6, 5.5] },
  { c: [[208, 238], [210, 198], [210, 164]], w: [7, 5.5, 5] },
  { c: [[190, 238], [188, 200], [186, 172]], w: [7, 5, 4.5] },
  { c: [[172, 242], [167, 210], [163, 186]], w: [7, 5, 4.5] },
  { c: [[156, 250], [147, 222], [140, 198]], w: [7, 5, 4.5] },
];
const FHL_SOLE: P[] = [[232, 300], [237, 250], [242, 206], [247, 172], [250, 130], [252, 96], [253, 70]];

function FootSole({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'interdigital-nerve', t: '趾間神経', at: [172, 158], x: 104, y: 150, a: 'end' },
    { id: 'metatarsals', t: '中足骨', at: [141, 222], x: 104, y: 214, a: 'end' },
    { t: '小趾外転筋', at: [139, 296], x: 104, y: 268, a: 'end' },
    { id: 'flexor-digitorum-brevis', t: '短趾屈筋', at: [157, 322], x: 104, y: 320, a: 'end' },
    { id: 'calcaneus', t: '踵骨', at: [150, 372], x: 104, y: 370, a: 'end' },
    { id: 'heel-fat-pad', t: '踵の脂肪体', at: [162, 416], x: 104, y: 418, a: 'end' },
    { id: 'flexor-hallucis-longus', t: '長母趾屈筋腱', at: [251, 112], x: 278, y: 100 },
    { t: '種子骨', at: [256, 172], x: 282, y: 158 },
    { id: 'abductor-hallucis', t: '母趾外転筋', at: [240, 252], x: 282, y: 236 },
    { id: 'plantar-fascia', t: '足底腱膜', at: [196, 326], x: 282, y: 306 },
  ];
  const spots: Spot[] = [
    { id: 'forefoot-ball', at: [175, 172] },
    { id: 'arch', at: [226, 292] },
    { id: 'heel-bottom', at: [200, 396] },
  ];
  return (
    <Frame
      k={k}
      p={lfp(p)}
      w={W}
      h={HS}
      title="右足の裏を下から見た図（つま先が上、右が親指側＝内側）"
      cap={['右足・足の裏', '内側（親指側）→']}
      labels={labels}
      spots={spots}
      defs={<LfStyle />}
    >
      <Ctxt k={k}>
        <path className="body" d={sp(SKIN_SOLE)} style={{ stroke: 'var(--border)', strokeWidth: 1 }} />
        {/* toe bones seen through the toe pads, so the toes read as toes */}
        <g opacity={0.55}>
          <Phalanges cls="bone-g" />
        </g>
        <path className="bone-g" d={ell(240, 172, 5, 7.5)} />
        <path className="bone-g" d={ell(253, 170, 5, 7.5)} />
      </Ctxt>
      <Part k={k} id="calcaneus">
        <path className="bone-t" d={sp(CALC_SOLE)} />
      </Part>
      <Part k={k} id="metatarsals">
        <Metatarsals cls="bone-t" />
      </Part>
      <Ctxt k={k}>
        <Nerve c={[[224, 250], [226, 210], [226, 168], [225, 140]]} w={3} />
        <Nerve c={[[200, 250], [200, 206], [199, 166], [198, 140]]} w={3} />
        <Nerve c={[[160, 258], [155, 222], [151, 188], [150, 160]]} w={3} />
      </Ctxt>
      <Part k={k} id="interdigital-nerve">
        <Nerve c={[[182, 252], [178, 222], [176, 196], [175, 180], [174, 166], [174, 152], [174, 144]]} w={[3.6, 3.8, 4.4, 7, 7.6, 4.2, 3.6]} />
        <Nerve c={[[174, 146], [179, 132], [182, 120]]} w={2.6} />
        <Nerve c={[[174, 146], [169, 134], [167, 122]]} w={2.6} />
      </Part>
      <Part k={k} id="flexor-hallucis-longus">
        <Ten c={FHL_SOLE} w={[7, 7, 7, 7, 7, 6.5, 6]} lines={2} />
      </Part>
      <Ctxt k={k}>
        <M g={SM.adm} ctx />
      </Ctxt>
      <Part k={k} id="flexor-digitorum-brevis">
        <M g={SM.fdb} />
      </Part>
      <Part k={k} id="abductor-hallucis">
        <M g={SM.abh} />
      </Part>
      <Part k={k} id="plantar-fascia">
        <path className="fascia" d={PF_BODY} />
        <path
          className="ten-fib"
          d={line([[178, 404], [170, 340], [161, 262]]) + line([[184, 405], [184, 330], [186, 246]]) + line([[190, 404], [196, 330], [208, 250]]) + line([[195, 400], [204, 320], [220, 254]])}
        />
        {PF_SLIPS.map((s, i) => (
          <Ten key={i} c={s.c} w={s.w} cls="fascia" lines={1} />
        ))}
        <Ten c={[[158, 394], [151, 350], [150, 312]]} w={[10, 8, 7]} cls="fascia-t" lines={1} />
      </Part>
      <Part k={k} id="heel-fat-pad">
        <path className="fat" d={ell(180, 398, 37, 31)} style={{ fillOpacity: 0.32 }} />
        <path
          className="ten-fib"
          d={line([[156, 380], [170, 372], [184, 378], [198, 370]]) + line([[150, 398], [166, 392], [182, 398], [200, 390], [212, 398]]) + line([[158, 416], [176, 410], [192, 416], [206, 410]])}
        />
      </Part>
    </Frame>
  );
}

/* ───────────── medial view ───────────── */

const MED = {
  skin: sp([
    [342, 30], [338, 100], [336, 160], [338, 200], [344, 230], [348, 252], [348, 276], [342, 294], [330, 302], [310, 305], [282, 301], [250, 297],
    [210, 295], [170, 296], [130, 299], [100, 302], [80, 302], [50, 300], [22, 296], [11, 288], [12, 277], [24, 270], [40, 265], [58, 259], [78, 249],
    [102, 237], [132, 224], [162, 214], [192, 206], [212, 196], [226, 180], [234, 150], [238, 30],
  ]),
  tibia: sp([
    [250, 30], [300, 30], [302, 130], [306, 180], [306, 198], [298, 204], [292, 210], [288, 222], [280, 232], [270, 236], [262, 232], [258, 222], [254, 210],
    [248, 204], [244, 196], [244, 180], [248, 130],
  ]),
  talus: sp([
    [308, 236], [306, 222], [298, 210], [284, 203], [268, 203], [256, 208], [248, 214], [238, 216], [228, 219], [221, 227], [221, 238], [228, 245], [244, 245],
    [262, 249], [286, 247], [302, 242],
  ]),
  calc: sp([
    [334, 238], [318, 244], [300, 240], [292, 246], [286, 252], [264, 252], [252, 256], [242, 256], [238, 264], [240, 272], [256, 278], [280, 284], [304, 289],
    [320, 293], [332, 290], [338, 280], [340, 262], [338, 246],
  ]),
  sust: line([[290, 258], [272, 262], [254, 262]]),
  navic: sp([[219, 222], [208, 218], [200, 220], [196, 230], [198, 242], [204, 250], [212, 253], [220, 246], [223, 236]]),
  cune: sp([[196, 222], [180, 216], [168, 218], [164, 232], [166, 252], [172, 264], [186, 266], [196, 256], [198, 240]]),
  mt1: sp([
    [166, 226], [150, 234], [130, 244], [110, 254], [96, 260], [84, 262], [74, 268], [72, 280], [78, 288], [90, 290], [100, 286], [112, 280], [132, 272],
    [150, 268], [166, 266],
  ]),
  mtL: sp([[166, 214], [130, 228], [100, 242], [78, 254], [70, 262], [76, 268], [100, 256], [132, 244], [166, 232]]),
  ph1: sp([[74, 270], [56, 272], [40, 272], [34, 278], [36, 288], [52, 290], [74, 290]]),
  ph2: sp([[36, 274], [26, 274], [18, 278], [16, 286], [22, 290], [36, 290]]),
};
const MEDM = {
  abh: muscle({
    r: [
      [[326, 284], [328, 292]],
      [[304, 272], [304, 297]],
      [[272, 266], [272, 298]],
      [[240, 266], [240, 296]],
      [[210, 270], [210, 294]],
      [[180, 276], [180, 292]],
      [[150, 280], [150, 291]],
      [[120, 282], [120, 290]],
      [[96, 284], [96, 289]],
      [[80, 285], [80, 288]],
    ],
    t1: 0.66,
    n: 8,
  }),
  fhl: muscle({
    r: [
      [[304, 30], [322, 30]],
      [[306, 84], [322, 86]],
      [[308, 120], [318, 124]],
      [[310, 148], [314, 150]],
    ],
    n: 5,
  }),
};
const FHL_MED: P[] = [[312, 146], [311, 180], [309, 210], [305, 230], [294, 256], [280, 266], [256, 272], [220, 278], [180, 282], [140, 284], [110, 286], [90, 290], [70, 288], [46, 284], [24, 282]];
const TPT_MED: P[] = [[292, 30], [293, 120], [295, 170], [295, 198], [290, 216], [280, 232], [266, 242], [248, 248], [228, 250], [216, 251]];
const PF_MED: P[] = [[330, 294], [306, 298], [276, 299], [244, 297], [210, 295], [176, 295], [140, 296], [112, 298], [92, 300], [70, 299], [50, 297]];
const ARCH_MED: P[] = [[318, 290], [292, 276], [264, 262], [238, 250], [214, 244], [192, 248], [160, 258], [128, 270], [100, 284], [88, 292]];

function FootMedial({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'flexor-hallucis-longus', t: '長母趾屈筋', at: [314, 96], x: 226, y: 50, a: 'end' },
    { id: 'tibialis-posterior-tendon', t: '後脛骨筋腱', at: [294, 150], x: 226, y: 80, a: 'end' },
    { t: '前脛骨筋腱', at: [240, 146], x: 214, y: 112, a: 'end' },
    { id: 'talus', t: '距骨', at: [262, 214], x: 214, y: 146, a: 'end' },
    { id: 'navicular', t: '舟状骨', at: [208, 234], x: 182, y: 168, a: 'end' },
    { id: 'tibialis-posterior', t: '後脛骨筋（停止部）', at: [194, 263], x: 136, y: 200, a: 'end' },
    { id: 'metatarsals', t: '第1中足骨', at: [126, 260], x: 80, y: 232, a: 'end' },
    { id: 'abductor-hallucis', t: '母趾外転筋', at: [140, 286], x: 54, y: 330, a: 'middle' },
    { id: 'medial-arch', t: '内側縦アーチ', at: [176, 253], x: 140, y: 348, a: 'middle' },
    { id: 'plantar-fascia', t: '足底腱膜', at: [230, 296], x: 216, y: 330, a: 'middle' },
    { id: 'calcaneus', t: '踵骨', at: [322, 262], x: 278, y: 348, a: 'middle' },
    { id: 'heel-fat-pad', t: '踵の脂肪体', at: [336, 292], x: 354, y: 330, a: 'end' },
  ];
  const spots: Spot[] = [
    { id: 'heel-bottom', at: [316, 294] },
    { id: 'arch', at: [216, 276] },
  ];
  return (
    <Frame
      k={k}
      p={lfp(p)}
      w={W}
      h={HM}
      title="右足を内側から見た図（左がつま先、右がかかと）"
      cap={['← つま先', '右足・内側から']}
      labels={labels}
      spots={spots}
      fade={{ top: 50 }}
      defs={<LfStyle />}
    >
      <Ctxt k={k}>
        <path className="body" d={MED.skin} />
        <path className="bone" d={MED.tibia} />
        <path className="bone-sh" d={sp([[262, 232], [270, 236], [280, 232], [288, 222], [292, 210], [286, 214], [278, 226], [270, 230]])} />
        <path className="bone" d={MED.cune} />
        <path className="bone" d={MED.ph1} />
        <path className="bone" d={MED.ph2} />
        <path className="bone-g" d={ell(88, 294, 6, 3.8)} />
      </Ctxt>
      <Part k={k} id="metatarsals">
        <path className="bone" d={MED.mtL} style={{ opacity: 0.35 }} />
        <path className="bone" d={MED.mt1} />
      </Part>
      <Part k={k} id="calcaneus">
        <path className="bone" d={MED.calc} />
        <path className="bone-ln" d={MED.sust} />
      </Part>
      <Part k={k} id="talus">
        <path className="bone" d={MED.talus} />
      </Part>
      <Part k={k} id="navicular">
        <path className="bone" d={MED.navic} />
      </Part>
      <Ctxt k={k}>
        {/* tibialis anterior & extensor hallucis longus tendons, flexor digitorum longus tendon, tibial nerve */}
        <Ten c={[[246, 30], [244, 120], [238, 160], [226, 184], [206, 204], [190, 222], [182, 240], [180, 254]]} w={7} lines={1} />
        <Ten c={[[300, 30], [300, 130], [300, 180], [298, 210], [290, 230], [278, 250], [262, 262], [244, 272]]} w={5} lines={1} />
        <Nerve c={[[308, 60], [307, 160], [304, 206], [296, 232], [284, 252]]} w={5} />
      </Ctxt>
      <Part k={k} id="flexor-hallucis-longus">
        <M g={MEDM.fhl} />
        <Ten c={FHL_MED} w={6.5} lines={1} />
      </Part>
      <Part k={k} id="tibialis-posterior-tendon">
        <Ten c={TPT_MED} w={[7, 7, 7.5, 8, 8, 8, 8, 8.5, 9, 9]} lines={2} />
      </Part>
      <Part k={k} id="tibialis-posterior">
        <path className="ten" d={sp([[220, 246], [214, 258], [200, 266], [180, 270], [168, 268], [176, 260], [196, 256], [210, 250]])} />
        <path className="ten-fib" d={line([[212, 254], [196, 262], [176, 266]])} />
      </Part>
      <Part k={k} id="abductor-hallucis">
        <M g={MEDM.abh} />
      </Part>
      <Part k={k} id="plantar-fascia">
        <Ten c={PF_MED} w={[8, 7, 6, 6, 5.5, 5.5, 5.5, 5.5, 5, 4.5, 4]} cls="fascia" lines={2} />
      </Part>
      <Part k={k} id="heel-fat-pad">
        <path className="fat" d={sp([[340, 266], [346, 282], [340, 296], [326, 304], [304, 306], [290, 304], [296, 299], [310, 298], [324, 296], [334, 289], [338, 277]])} />
        <path className="ten-fib" d={line([[300, 302], [314, 302], [328, 298], [338, 290]])} />
      </Part>
      <Part k={k} id="achilles-tendon">
        <Ten c={[[328, 30], [326, 120], [326, 180], [330, 214], [334, 236], [337, 256]]} w={[10, 10, 10, 11, 12, 14]} lines={2} />
      </Part>
      <Part k={k} id="medial-arch">
        <Ten c={ARCH_MED} w={3.6} cls="cart" lines={0} />
        <path className="cart" d={ell(318, 290, 3.4, 3.4)} />
        <path className="cart" d={ell(88, 292, 3.4, 3.4)} />
      </Part>
    </Frame>
  );
}

/* ───────────── top view (dorsum) ───────────── */

const TOP = {
  calc: sp([
    [178, 344], [196, 342], [210, 348], [216, 366], [218, 394], [218, 418], [208, 434], [188, 440], [166, 438], [150, 428], [144, 410], [146, 388], [156, 370],
    [166, 352],
  ]),
  talus: sp([
    [122, 344], [134, 338], [150, 340], [164, 346], [174, 354], [182, 362], [185, 380], [184, 398], [177, 406], [162, 408], [148, 406], [140, 398], [139, 382],
    [140, 368], [134, 358], [124, 354],
  ]),
  talusLn: line([[162, 404], [161, 384], [158, 366]]),
  navic: sp([[116, 322], [128, 318], [146, 318], [164, 318], [176, 322], [178, 334], [166, 340], [148, 340], [130, 342], [116, 342], [107, 334]]),
  cuboid: sp([[176, 300], [196, 300], [212, 306], [217, 322], [209, 340], [190, 342], [178, 334], [175, 316]]),
  cuneM: sp([[114, 290], [126, 286], [140, 288], [141, 316], [128, 320], [115, 318], [111, 304]]),
  cuneI: sp([[141, 292], [156, 292], [157, 313], [141, 315]]),
  cuneL: sp([[157, 290], [174, 292], [176, 306], [174, 318], [158, 316]]),
};

function FootTop({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'metatarsals', t: '第2中足骨', at: [149, 238], x: 96, y: 238, a: 'end' },
    { t: '楔状骨', at: [126, 300], x: 96, y: 292, a: 'end' },
    { id: 'navicular', t: '舟状骨', at: [120, 332], x: 96, y: 336, a: 'end' },
    { id: 'talus', t: '距骨', at: [150, 386], x: 96, y: 386, a: 'end' },
    { t: '趾骨', at: [196, 116], x: 262, y: 100 },
    { id: 'metatarsals', t: '中足骨', at: [197, 226], x: 262, y: 214 },
    { t: '立方骨', at: [204, 322], x: 262, y: 318 },
    { id: 'calcaneus', t: '踵骨', at: [208, 410], x: 262, y: 410 },
  ];
  const spots: Spot[] = [{ id: 'forefoot-top', at: [151, 204] }];
  return (
    <Frame
      k={k}
      p={lfp(p)}
      w={W}
      h={HS}
      title="右足の甲を上から見た図（つま先が上、左が親指側＝内側）"
      cap={['← 内側（親指側）', '右足・足の甲']}
      labels={labels}
      spots={spots}
      defs={<LfStyle />}
    >
      <Ctxt k={k}>
        <path className="body" d={sp(mirror(SKIN_SOLE))} style={{ stroke: 'var(--border)', strokeWidth: 1 }} />
        <Phalanges mirrored />
        <path className="bone" d={TOP.cuboid} />
        <path className="bone" d={TOP.cuneM} />
        <path className="bone" d={TOP.cuneI} />
        <path className="bone" d={TOP.cuneL} />
      </Ctxt>
      <Part k={k} id="calcaneus">
        <path className="bone" d={TOP.calc} />
      </Part>
      <Part k={k} id="talus">
        <path className="bone" d={TOP.talus} />
        <path className="bone-ln" d={TOP.talusLn} />
      </Part>
      <Part k={k} id="navicular">
        <path className="bone" d={TOP.navic} />
      </Part>
      <Part k={k} id="metatarsals">
        <Metatarsals mirrored />
      </Part>
    </Frame>
  );
}

/* ───────────── component & registration ───────────── */

function FootDiagram(p: RegionDiagramProps): ReactNode {
  const k = useCtx(p);
  switch (p.view ?? 'sole') {
    case 'medial':
      return <FootMedial p={p} k={k} />;
    case 'top':
      return <FootTop p={p} k={k} />;
    default:
      return <FootSole p={p} k={k} />;
  }
}

const diagram: RegionDiagram = {
  region: 'foot',
  views: [
    { id: 'sole', label: '足の裏' },
    { id: 'medial', label: '内側から' },
    { id: 'top', label: '足の甲' },
  ],
  parts: {
    sole: [
      'calcaneus', 'metatarsals', 'interdigital-nerve', 'flexor-hallucis-longus', 'flexor-digitorum-brevis', 'abductor-hallucis', 'plantar-fascia',
      'heel-fat-pad',
    ],
    medial: [
      'metatarsals', 'calcaneus', 'talus', 'navicular', 'medial-arch', 'flexor-hallucis-longus', 'tibialis-posterior-tendon', 'tibialis-posterior',
      'abductor-hallucis', 'plantar-fascia', 'heel-fat-pad', 'achilles-tendon',
    ],
    top: ['calcaneus', 'talus', 'navicular', 'metatarsals'],
  },
  spots: {
    sole: ['forefoot-ball', 'arch', 'heel-bottom'],
    medial: ['heel-bottom', 'arch'],
    top: ['forefoot-top'],
  },
  Component: FootDiagram,
};
export default diagram;
