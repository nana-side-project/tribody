// Region diagram: 足裏・足部 (foot) — the person's RIGHT foot, three views:
//   sole 足裏 (plantar view, toes up: the big toe is on the viewer's RIGHT, as when you look at the sole from below)
//   · medial 内側から (toes to the viewer's left; the medial longitudinal arch) · top 足の甲 (dorsal view, big toe on the LEFT).
// Drawn with the lower-limb kit from ./hip (muscle sheets, tendons, labels, hotspots). Original artwork.
// Sole / top: ≈15 units per cm, heel at y≈436, toes at y≈44. Medial: ≈12.5 units per cm, floor at y≈304.
import type { ReactNode } from 'react';
import type { RegionDiagram, RegionDiagramProps } from '../types';
import { Ctxt, Frame, Lesion, M, Nerve, Part, Ten, att, ell, line, muscle, sp, tube, tubePart, useCtx, type Ctx, type Lab, type OIMap, type P, type Spot } from './hip';
import { LfStyle, lfp } from './calf';
import {
  CALC,
  Calcaneus,
  FL_INSERT,
  FlSoleTendon,
  Metatarsals,
  Midfoot,
  MtCrack,
  Navicular,
  Phalanges,
  SESAMOIDS,
  SKIN_SOLE,
  XRAY_CSS,
  XRay,
  mirror,
} from './footsole';

const W = 360;
const HS = 460; // sole & top
const HM = 360; // medial

/* foot outline & skeleton in plantar coordinates: shared with the calf diagram's sole inset → ./footsole */

/* ───────────── sole view ───────────── */

const SM = {
  fdb: muscle({
    r: [
      [[182, 403], [200, 401]],
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
  // proximal end on the medial process of the calcaneal tuberosity (≈ 198, 401)
  [188, 411], [199, 408], [206, 398], [205, 372], [205, 332], [211, 292], [222, 256], [228, 242], [206, 236], [184, 238], [162, 244], [152, 254],
  [157, 292], [164, 332], [171, 372], [178, 401],
]);
const PF_SLIPS: { c: P[]; w: number[] }[] = [
  // digital slips: thin bands, so the (see-through) metatarsals stay readable beside them
  { c: [[226, 242], [236, 204], [244, 176]], w: [8, 6, 5.5] },
  { c: [[208, 238], [210, 198], [210, 164]], w: [7, 5.5, 5] },
  { c: [[190, 238], [188, 200], [186, 172]], w: [7, 5, 4.5] },
  { c: [[172, 242], [167, 210], [163, 186]], w: [7, 5, 4.5] },
  { c: [[156, 250], [147, 222], [140, 198]], w: [7, 5, 4.5] },
];
/**
 * Plantar heel pain (see lesionsOf in ./hip): the fascia's origin on the medial process of the calcaneal tuberosity, the
 * heel end of its central band (the 3D scene's zone 0–0.28), not the whole sheet to the toes.
 */
const PF_ORIGIN = sp([
  [176, 396], [182, 406], [189, 411], [199, 408], [206, 398], [205.5, 380], [205, 364], [197, 358], [186, 358], [174, 363], [172.5, 380],
]);
/** soft tissue that covers the metatarsal bases in the sole view (clip of their see-through copy) */
const SOLE_COVER = [
  PF_BODY,
  ...PF_SLIPS.map((s) => tube(s.c, s.w)),
  ...[SM.fdb, SM.abh, SM.adm].flatMap((g) => [g.body, ...g.ten]),
];
const FHL_SOLE: P[] = [[232, 300], [237, 250], [242, 206], [247, 172], [250, 130], [252, 96], [253, 70]];

/**
 * 起始 / 停止 markers (muscle page). Abductor hallucis and the short toe flexor start on the heel bone; the short flexor's
 * four tendons (not drawn) end on the middle phalanges of toes 2–5. The long tendons end on the big toe's last phalanx
 * (FHL) and on the 1st metatarsal base / medial cuneiform (fibularis longus); their muscles start in the leg.
 */
const OI_SOLE: OIMap = {
  'abductor-hallucis': { o: att(SM.abh, 'o'), i: att(SM.abh, 'i') },
  'flexor-digitorum-brevis': { o: att(SM.fdb, 'o', 0.5, 0.03), i: [[210, 99], [187.5, 110], [164.5, 127], [136.5, 143]] },
  'flexor-hallucis-longus': { i: [[253, 74]] },
  'fibularis-longus': { i: [FL_INSERT] },
};

function FootSole({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'interdigital-nerve', t: '趾間神経', at: [172, 158], x: 104, y: 150, a: 'end' },
    // stress fracture: the label points at the cracked 3rd metatarsal (2nd and 3rd are red)
    k.les.has('metatarsal-stress')
      ? { id: 'metatarsals', t: '中足骨のひび', at: [188, 204], x: 104, y: 202, a: 'end' }
      : { id: 'metatarsals', t: '中足骨', at: [144, 224], x: 104, y: 202, a: 'end' },
    { t: '小趾外転筋', at: [138, 262], x: 104, y: 244, a: 'end' },
    { t: '立方骨', at: [168, 279], x: 104, y: 284, a: 'end' },
    { id: 'flexor-digitorum-brevis', t: '短趾屈筋', at: [158, 330], x: 104, y: 320, a: 'end' },
    { id: 'fibularis-longus', t: '長腓骨筋腱', at: [142, 352], x: 104, y: 354, a: 'end' },
    { id: 'calcaneus', t: '踵骨', at: [156, 390], x: 104, y: 390, a: 'end' },
    { id: 'heel-fat-pad', t: '踵の脂肪体', at: [164, 418], x: 104, y: 426, a: 'end' },
    { id: 'flexor-hallucis-longus', t: '長母趾屈筋腱', at: [251, 112], x: 278, y: 100 },
    { t: '種子骨', at: [256, 172], x: 282, y: 158 },
    { id: 'abductor-hallucis', t: '母趾外転筋', at: [240, 252], x: 282, y: 236 },
    // navicular above plantar fascia: its anchor is higher, so the two leaders do not cross
    { id: 'navicular', t: '舟状骨', at: [227, 312], x: 282, y: 296 },
    // on the central band of the fascia between the talar head and the heel fat pad (clear of the see-through bone
    // outlines, so the dot cannot be read as the talus)
    k.les.has('plantar-origin')
      ? { id: 'plantar-fascia', t: '足底腱膜の\n付け根', at: [198, 390], x: 282, y: 346 }
      : { id: 'plantar-fascia', t: '足底腱膜', at: [194, 358], x: 282, y: 340 },
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
      oi={OI_SOLE}
      defs={
        <>
          <LfStyle />
          <style>{XRAY_CSS}</style>
          {/* metatarsals are seen through only where the plantar fascia / short muscles cover them (bases, proximal
              shafts): the band y 238–318 intersected with the soft tissue, so where a bone is not covered (the 5th
              metatarsal beside the fascia) only its own dashed outline shows, not a solid x-ray copy on top of it */}
          <clipPath id={`${k.uid}-mtx`}>
            <rect x={0} y={238} width={W} height={80} />
          </clipPath>
          <clipPath id={`${k.uid}-mtc`}>
            {SOLE_COVER.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </clipPath>
        </>
      }
    >
      <Ctxt k={k}>
        <path className="body" d={sp(SKIN_SOLE)} style={{ stroke: 'var(--border)', strokeWidth: 1 }} />
        {/* toe bones seen through the toe pads, so the toes read as toes */}
        <g opacity={0.55}>
          <Phalanges cls="bone-g" />
        </g>
        {SESAMOIDS.map((d, i) => (
          <path key={i} className="bone-g" d={d} />
        ))}
      </Ctxt>
      <Part k={k} id="metatarsals" zoned={k.les.has('metatarsal-stress')}>
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
      <Part k={k} id="plantar-fascia" zone={k.les.has('plantar-origin') && <path className="fascia" d={PF_ORIGIN} />}>
        <path className="fascia" d={PF_BODY} />
        <path
          className="ten-fib"
          d={line([[185, 405], [172, 340], [161, 262]]) + line([[191, 405], [186, 330], [186, 246]]) + line([[197, 404], [198, 330], [208, 250]]) + line([[202, 400], [205, 320], [220, 254]])}
        />
        {PF_SLIPS.map((s, i) => (
          <Ten key={i} c={s.c} w={s.w} cls="fascia" lines={1} />
        ))}
        {/* lateral band: lateral process of the tuberosity → tuberosity of the 5th metatarsal */}
        <Ten c={[[162, 401], [153, 352], [148, 297]]} w={[10, 8, 7]} cls="fascia-t" lines={1} />
      </Part>
      <Part k={k} id="heel-fat-pad">
        <path className="fat" d={ell(180, 398, 37, 31)} style={{ fillOpacity: 0.32 }} />
        <path
          className="ten-fib"
          d={line([[156, 380], [170, 372], [184, 378], [198, 370]]) + line([[150, 398], [166, 392], [182, 398], [200, 390], [212, 398]]) + line([[158, 416], [176, 410], [192, 416], [206, 410]])}
        />
      </Part>
      {/* the tarsal skeleton seen through the plantar muscles and fascia ("x-ray" outlines; only the outline line takes
          taps, so taps inside still reach the muscles / fascia below): talar head, cuneiforms, cuboid with the ridge of its
          fibularis longus groove, navicular, calcaneus with the medial / lateral processes of its tuberosity */}
      <XRay k={k}>
        <Midfoot cls="bone-x" ln="bone-xl" />
      </XRay>
      <Part k={k} id="navicular">
        <Navicular cls="bone-x" />
      </Part>
      <Part k={k} id="calcaneus">
        <Calcaneus cls="bone-x" ln="bone-xl" />
      </Part>
      {/* metatarsal bases / proximal shafts under the fascia (the rest is drawn below the soft tissue) */}
      <XRay k={k} id="metatarsals" zoned={k.les.has('metatarsal-stress')}>
        <g clipPath={`url(#${k.uid}-mtx)`}>
          <g clipPath={`url(#${k.uid}-mtc)`}>
            <Metatarsals cls="bone-x" />
          </g>
        </g>
      </XRay>
      {/* stress fracture: the cracked shafts seen through the plantar soft tissue (like the x-ray bases) */}
      {k.les.has('metatarsal-stress') && (
        <Lesion k={k} id="metatarsals">
          <MtCrack />
        </Lesion>
      )}
      {/* deepest layer: fibularis longus tendon round the lateral border of the cuboid, along its groove and obliquely
          across the sole to the 1st metatarsal base / medial cuneiform, drawn see-through over the superficial muscles */}
      <Part k={k} id="fibularis-longus">
        <FlSoleTendon />
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
const PF_MED_W = [8, 7, 6, 6, 5.5, 5.5, 5.5, 5.5, 5, 4.5, 4];
const ARCH_MED: P[] = [[318, 290], [292, 276], [264, 262], [238, 250], [214, 244], [192, 248], [160, 258], [128, 270], [100, 284], [88, 292]];

/** 起始 / 停止 markers (muscle page): see OI_SOLE; tibialis posterior ends on the navicular (and spreads under the foot). */
const OI_MEDV: OIMap = {
  'abductor-hallucis': { o: att(MEDM.abh, 'o'), i: att(MEDM.abh, 'i') },
  'flexor-hallucis-longus': { i: [[27, 282]] },
  'tibialis-posterior': { i: [[212, 248]] },
};

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
    { id: 'plantar-fascia', t: '足底腱膜', at: k.les.has('plantar-origin') ? [284, 299] : [230, 296], x: 216, y: 330, a: 'middle' },
    { id: 'calcaneus', t: '踵骨', at: [322, 262], x: 262, y: 348, a: 'middle' },
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
      oi={OI_MEDV}
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
      <Part k={k} id="metatarsals" zoned={k.les.has('metatarsal-stress')}>
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
      <Part k={k} id="plantar-fascia" zone={k.les.has('plantar-origin') && <path className="fascia" d={tubePart(PF_MED, PF_MED_W, 0, 0.24, 0.6)} />}>
        <Ten c={PF_MED} w={PF_MED_W} cls="fascia" lines={2} />
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

/** Talus seen from above (dorsal coordinates = mirrored plantar coordinates): head (navicular in front), neck, body with
 * the trochlea between the malleoli, posterior process. The other tarsals reuse the shared plantar silhouettes, mirrored. */
const TALUS_TOP = sp([
  [140, 330], [143, 321], [152, 317], [163, 318], [171, 323], [175, 332], [181, 340], [191, 346], [195, 356], [194, 372], [190, 388], [184, 399],
  [176, 405], [168, 405], [158, 399], [152, 386], [149, 370], [148, 356], [146, 346], [142, 339],
]);
const TALUS_TOP_LN = line([[173, 400], [172, 380], [170, 358]]);

function FootTop({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    // stress fracture: the shaft–neck of the 2nd and 3rd metatarsals (red, with a crack)
    k.les.has('metatarsal-stress')
      ? { id: 'metatarsals', t: '中足骨のひび\n（第2・第3）', at: [151, 200], x: 96, y: 194, a: 'end' }
      : { id: 'metatarsals', t: '第2中足骨', at: [153, 238], x: 96, y: 238, a: 'end' },
    { t: '楔状骨', at: [139, 278], x: 96, y: 280, a: 'end' },
    { id: 'navicular', t: '舟状骨', at: [133, 312], x: 96, y: 320, a: 'end' },
    { id: 'talus', t: '距骨', at: [166, 376], x: 96, y: 376, a: 'end' },
    { t: '趾骨', at: [196, 116], x: 262, y: 100 },
    { id: 'metatarsals', t: '中足骨', at: [192, 226], x: 262, y: 214 },
    { t: '立方骨', at: [194, 292], x: 262, y: 294 },
    { id: 'calcaneus', t: '踵骨', at: [202, 414], x: 262, y: 414 },
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
        {/* cuneiforms and cuboid (plantar ridge not seen from above) */}
        <Midfoot mirrored talus={false} ridge={false} />
      </Ctxt>
      <Part k={k} id="calcaneus">
        <path className="bone" d={sp(mirror(CALC))} />
      </Part>
      <Part k={k} id="talus">
        <path className="bone" d={TALUS_TOP} />
        <path className="bone-ln" d={TALUS_TOP_LN} />
      </Part>
      <Part k={k} id="navicular">
        <Navicular mirrored />
      </Part>
      <Part k={k} id="metatarsals" zone={k.les.has('metatarsal-stress') && <MtCrack mirrored />}>
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
      'navicular', 'calcaneus', 'metatarsals', 'interdigital-nerve', 'flexor-hallucis-longus', 'flexor-digitorum-brevis', 'abductor-hallucis',
      'plantar-fascia', 'heel-fat-pad', 'fibularis-longus',
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
