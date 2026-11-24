// Region diagram: 足首・アキレス腱 (ankle) — the person's RIGHT ankle, three views:
//   lateral 外側から (toes to the viewer's right) · medial 内側から (toes to the viewer's left) · back 後ろから (medial side at the left).
// Drawn with the lower-limb kit from ./hip (muscle sheets, tendons, labels, hotspots). Original artwork.
// Scale ≈ 14 units / cm, the sole of the foot at y≈394; the leg is shown up to ≈28 cm above the floor.
import type { ReactNode } from 'react';
import type { RegionDiagram, RegionDiagramProps } from '../types';
import { Ctxt, Frame, M, Nerve, Part, Ten, att, ell, line, muscle, sp, tubePart, useCtx, type Ctx, type Lab, type Num, type OIMap, type P, type Spot } from './hip';
import { LfStyle, lfp } from './calf';

const W = 360;
const H = 440;

/** Horizontal soft fade (for a foot that runs off the canvas). Put the returned mask in Frame `defs`. */
function HFade({ id, from, to }: { id: string; from: number; to: number }) {
  return (
    <>
      <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1={from} y1="0" x2={to} y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="1" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <mask id={id} maskUnits="userSpaceOnUse" x="-60" y="-80" width={W + 120} height={H + 160}>
        <rect x="-60" y="-80" width={W + 120} height={H + 160} fill={`url(#${id}-g)`} />
      </mask>
    </>
  );
}
const Faded = ({ id, children }: { id: string; children: ReactNode }) => <g mask={`url(#${id})`}>{children}</g>;

/**
 * The fibularis (peroneal) tendons are one part of their own ('peroneal-tendons', highlighted on condition pages) and
 * also the distal end of each fibularis muscle. Each muscle therefore carries a copy of its own tendon: normally the
 * shared tendon part sits on top, but when a fibularis muscle is highlighted on its own (muscle page) its tendon copy
 * comes to the top, so the highlight runs on round the malleolus to the insertion.
 */
function FibTendons({ k, pb, pl }: { k: Ctx; pb: ReactNode; pl: ReactNode }) {
  // only for a muscle shown on its own ('selected' / 'muscle'); on condition pages ('injured' / 'involved') the
  // tendons keep their own highlight state, so e.g. ankle-sprain does not draw amber tendons over the injured CFL
  const solo = (id: 'fibularis-brevis' | 'fibularis-longus') => k.hl[id] === 'selected' || k.hl[id] === 'muscle';
  const own = !k.hl['peroneal-tendons'] && (solo('fibularis-brevis') || solo('fibularis-longus'));
  if (!own) {
    return (
      <Part k={k} id="peroneal-tendons">
        {pb}
        {pl}
      </Part>
    );
  }
  const b = (
    <Part key="b" k={k} id="fibularis-brevis">
      {pb}
    </Part>
  );
  const l = (
    <Part key="l" k={k} id="fibularis-longus">
      {pl}
    </Part>
  );
  return (
    <>
      <Part k={k} id="peroneal-tendons">
        {pb}
        {pl}
      </Part>
      {k.hl['fibularis-brevis'] && !k.hl['fibularis-longus'] ? [l, b] : [b, l]}
    </>
  );
}

/** A bony prominence drawn over its parent bone: filled shape whose first `cut` points form an edge that is not outlined. */
function Prom({ pts, cut = 3 }: { pts: P[]; cut?: number }) {
  return (
    <>
      <path className="bone" d={sp(pts)} style={{ stroke: 'none' }} />
      <path className="bone" d={sp([...pts.slice(cut - 1), pts[0]], false)} style={{ fill: 'none' }} />
    </>
  );
}

/**
 * Focal Achilles lesion (see lesionsOf in ./hip): the mid-portion 2–6 cm above the insertion, or the insertion where the
 * tendon meets the heel bone. `mid` / `ins` = the stretch [u0, u1] of the tendon's centre line in this view.
 */
function achZone(k: Ctx, c: readonly P[], w: Num, mid: [number, number], ins: [number, number]): ReactNode {
  if (k.les.has('achilles-mid')) return <path className="ten" d={tubePart(c, w, mid[0], mid[1], 0.3)} />;
  if (k.les.has('achilles-insertion')) return <path className="ten" d={tubePart(c, w, ins[0], ins[1], 0.6)} />;
  return undefined;
}
const ACH_MID_T = 'アキレス腱の\n中央部';
const ACH_INS_T = 'アキレス腱の\n付着部';

/* ───────────── lateral view: right ankle from the outside (toes to the viewer's right) ───────────── */

const LB = {
  body: sp([
    [60, -30], [68, 40], [80, 120], [90, 190], [96, 250], [98, 290], [100, 320], [100, 350], [104, 374], [116, 390], [134, 396, 1], [200, 396], [280, 395],
    [390, 394], [390, 330], [340, 314], [300, 300], [266, 284], [240, 272], [224, 258], [216, 230], [214, 150], [214, 60], [216, -30],
  ]),
  tibia: sp([
    [150, -40], [198, -40], [199, 80], [201, 180], [204, 232], [210, 256], [214, 270], [212, 281], [196, 277], [180, 276], [164, 278], [150, 284], [146, 278],
    [147, 250], [149, 200], [150, 100],
  ]),
  fibula: sp([
    [146, -40], [163, -40], [165, 100], [167, 190], [171, 232], [176, 256], [178, 282], [174, 304], [166, 322], [156, 332], [148, 330], [141, 316], [138, 296],
    [139, 270], [142, 240], [144, 190], [145, 100],
  ]),
  malL: [[142, 238], [158, 232], [171, 233], [176, 256], [178, 282], [174, 304], [166, 322], [156, 332], [148, 330], [141, 316], [138, 296], [139, 270]] as P[],
  talus: sp([
    [144, 300], [149, 288], [164, 278], [182, 275], [200, 278], [214, 284], [228, 288], [240, 290], [247, 298], [246, 310], [236, 316], [220, 312], [204, 314],
    [188, 318], [168, 318], [152, 314],
  ]),
  navic: sp([[247, 292], [256, 286], [267, 290], [269, 304], [263, 312], [249, 312]]),
  cune: sp([[269, 290], [286, 288], [294, 300], [290, 316], [270, 316]]),
  cuboid: sp([[226, 320], [240, 316], [262, 316], [272, 326], [270, 344], [254, 352], [236, 350], [226, 338]]),
  calc: sp([
    [108, 310], [124, 316], [144, 312], [168, 316], [192, 322], [208, 320], [222, 322], [228, 330], [228, 346], [220, 358], [204, 364], [180, 370], [150, 374],
    [126, 376], [112, 372], [105, 358], [103, 336], [104, 320],
  ]),
  calcLn: line([[192, 326], [204, 330], [214, 328]]),
  mt5: sp([
    [254, 352], [260, 340], [276, 334], [300, 340], [328, 352], [352, 362], [376, 368], [376, 384], [352, 380], [326, 370], [298, 360], [274, 356], [262, 360],
  ]),
  mt4: sp([[272, 318], [292, 316], [320, 330], [352, 344], [376, 350], [376, 362], [350, 356], [318, 344], [290, 334], [274, 332]]),
};
const LM = {
  sol: muscle({
    r: [
      [[150, -36], [146, 40], [143, 120], [140, 190]],
      [[90, -20], [94, 60], [98, 150], [102, 236]],
    ],
    n: 12,
  }),
  pb: muscle({
    r: [
      [[150, -40], [186, -40]],
      [[148, 60], [182, 62]],
      [[144, 130], [170, 136]],
      [[141, 190], [158, 198]],
      [[141, 232], [152, 240]],
      [[143, 256], [150, 262]],
    ],
    t1: 0.84,
    n: 8,
  }),
  pl: muscle({
    r: [
      [[146, -40], [170, -40]],
      [[146, 30], [164, 32]],
      [[145, 90], [155, 94]],
      [[142, 160], [149, 164]],
      [[140, 220], [146, 224]],
      [[139, 256], [145, 260]],
    ],
    t1: 0.3,
    n: 5,
  }),
  fhl: muscle({
    r: [
      [[140, 126], [146, 132]],
      [[121, 184], [140, 192]],
      [[113, 236], [137, 248]],
      [[118, 272], [133, 280]],
      [[129, 296], [137, 300]],
    ],
    t1: 0.74,
    n: 6,
  }),
  edl: muscle({
    r: [
      [[186, -40], [212, -40]],
      [[188, 60], [212, 60]],
      [[195, 140], [212, 140]],
      [[205, 200], [214, 202]],
      [[213, 250], [220, 252]],
      [[234, 276], [240, 280]],
      [[272, 296], [278, 300]],
      [[332, 318], [338, 322]],
      [[390, 334], [396, 338]],
    ],
    t1: 0.42,
    n: 5,
  }),
  edb: muscle({
    r: [
      [[218, 318], [226, 330]],
      [[250, 302], [257, 320]],
      [[292, 296], [295, 306]],
    ],
    t1: 0.72,
    n: 4,
  }),
};
const ACH_L: P[] = [[84, -30], [88, 40], [93, 120], [97, 190], [100, 250], [103, 290], [106, 318], [107.5, 344]];
const ACH_LW = [9, 9, 9, 9, 9.5, 10, 12, 14];
const PB_TEN_L: P[] = [[147, 252], [145, 278], [146, 300], [151, 320], [162, 334], [180, 340], [204, 344], [228, 348], [248, 350], [258, 347]];
const PL_TEN_L: P[] = [[142, 252], [139, 280], [140, 304], [146, 324], [158, 340], [176, 352], [198, 360], [218, 364], [234, 364]];

/**
 * 起始 / 停止 markers (muscle page). The leg muscles start above this crop; what the ankle views show are insertions:
 * the heel bone (soleus / gastrocnemius through the Achilles tendon), the 5th metatarsal (fibularis brevis), the
 * navicular (tibialis posterior), the medial cuneiform (tibialis anterior); abductor hallucis starts on the heel bone.
 */
const OI_LAT: OIMap = {
  soleus: { i: [[107, 341]] },
  'fibularis-brevis': { i: [[256, 347]] },
};

function AnkleLateral({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const fade = `${k.uid}-hf`;
  const labels: Lab[] = [
    { id: 'soleus', t: 'ヒラメ筋', at: [118, 70], x: 80, y: 56, a: 'end' },
    // focal Achilles lesion: the tendon's label names and points at the red stretch (FHL moves up for the mid-portion)
    ...((k.les.has('achilles-mid')
      ? [
          { id: 'flexor-hallucis-longus', t: '長母趾屈筋', at: [122, 226], x: 80, y: 170, a: 'end' },
          { id: 'achilles-tendon', t: ACH_MID_T, at: [101, 264], x: 85, y: 222, a: 'end' },
        ]
      : k.les.has('achilles-insertion')
        ? [
            { id: 'flexor-hallucis-longus', t: '長母趾屈筋', at: [124, 228], x: 80, y: 228, a: 'end' },
            { id: 'achilles-tendon', t: ACH_INS_T, at: [106, 334], x: 85, y: 334, a: 'end' },
          ]
        : [
            { id: 'achilles-tendon', t: 'アキレス腱', at: [96, 180], x: 80, y: 170, a: 'end' },
            { id: 'flexor-hallucis-longus', t: '長母趾屈筋', at: [124, 228], x: 80, y: 228, a: 'end' },
          ]) as Lab[]),
    { id: 'retrocalcaneal-bursa', t: '踵骨後部\n滑液包', at: [113, 304], x: 80, y: 290, a: 'end' },
    { id: 'fibularis-longus', t: '長腓骨筋', at: [152, 40], x: 230, y: 26 },
    { id: 'fibularis-brevis', t: '短腓骨筋', at: [164, 120], x: 230, y: 68 },
    { id: 'fibula', t: '腓骨', at: [163, 210], x: 230, y: 110 },
    { id: 'tibia', t: '脛骨', at: [186, 236], x: 230, y: 152 },
    { id: 'lateral-malleolus', t: '外果（外くるぶし）', at: [162, 286], x: 230, y: 194 },
    { id: 'atfl', t: '前距腓靱帯', at: [196, 301], x: 230, y: 236 },
    { id: 'talus', t: '距骨', at: [226, 300], x: 262, y: 262 },
    { id: 'navicular', t: '舟状骨', at: [258, 300], x: 296, y: 286 },
    { id: 'calcaneus', t: '踵骨', at: [128, 362], x: 92, y: 418, a: 'middle' },
    { id: 'cfl', t: '踵腓靱帯', at: [146, 358], x: 156, y: 418, a: 'middle' },
    { id: 'peroneal-tendons', t: '腓骨筋腱', at: [212, 346], x: 236, y: 418, a: 'middle' },
  ];
  const spots: Spot[] = [
    { id: 'ankle-outer', at: [186, 314] },
    { id: 'achilles-mid', at: [99, 266] },
    { id: 'heel-back', at: [110, 332] },
  ];
  return (
    <Frame
      k={k}
      p={lfp(p)}
      w={W}
      h={H}
      title="右足首を外側から見た図（右がつま先、左がかかと）"
      cap={['右足首・外側から', 'つま先 →']}
      labels={labels}
      spots={spots}
      oi={OI_LAT}
      fade={{ top: 30 }}
      defs={
        <>
          <LfStyle />
          <HFade id={fade} from={316} to={358} />
        </>
      }
    >
      <Faded id={fade}>
        <Ctxt k={k}>
          <path className="body" d={LB.body} />
          <path className="bone-g" d={LB.mt4} />
          <path className="bone" d={LB.mt5} />
          <path className="bone" d={LB.cune} />
          <path className="bone" d={LB.cuboid} />
        </Ctxt>
        <Part k={k} id="navicular">
          <path className="bone" d={LB.navic} />
        </Part>
        <Part k={k} id="tibia">
          <path className="bone" d={LB.tibia} />
        </Part>
        <Part k={k} id="talus">
          <path className="bone" d={LB.talus} />
          <path className="bone-ln" d={line([[160, 284], [182, 280], [204, 284]])} />
        </Part>
        <Part k={k} id="calcaneus">
          <path className="bone" d={LB.calc} />
          <path className="bone-ln" d={LB.calcLn} />
          <path className="bone" d={ell(178, 346, 7, 3.6, -8)} />
        </Part>
        <Part k={k} id="fibula">
          <path className="bone" d={LB.fibula} />
        </Part>
        <Part k={k} id="lateral-malleolus">
          <Prom pts={LB.malL} />
          <path className="bone-sh" d={sp([[142, 250], [150, 262], [154, 292], [152, 318], [148, 328], [141, 316], [138, 296], [139, 270]])} />
          <path className="bone-ln" d={line([[158, 250], [166, 286], [160, 318]])} />
        </Part>
        <Ctxt k={k}>
          <path className="fat" d={sp([[110, 246], [118, 258], [128, 280], [134, 300], [126, 306], [116, 300], [110, 286], [107, 264]])} />
          <M g={LM.edl} ctx />
        </Ctxt>
        <Part k={k} id="atfl">
          <Ten c={[[173, 298], [188, 300], [204, 303]]} w={[12, 11, 11]} cls="lig" lines={3} />
        </Part>
        <Part k={k} id="cfl">
          <Ten c={[[157, 329], [151, 346], [144, 363]]} w={8} cls="lig" lines={2} />
        </Part>
        <Part k={k} id="flexor-hallucis-longus">
          <M g={LM.fhl} />
        </Part>
        <Part k={k} id="retrocalcaneal-bursa">
          <path className="bursa" d={ell(113, 305, 4.6, 10.5, -12)} />
        </Part>
        <Part k={k} id="fibularis-brevis">
          <M g={LM.pb} />
        </Part>
        <Part k={k} id="fibularis-longus">
          <M g={LM.pl} />
        </Part>
        <FibTendons
          k={k}
          pb={<Ten c={PB_TEN_L} w={[6, 7, 7, 7, 7, 6.5, 6.5, 6.5, 7, 8]} lines={1} />}
          pl={<Ten c={PL_TEN_L} w={[6, 7, 7, 7, 7, 7, 7, 6.5, 4]} lines={1} />}
        />
        <Part k={k} id="soleus">
          <M g={LM.sol} />
        </Part>
        <Part k={k} id="achilles-tendon" zone={achZone(k, ACH_L, ACH_LW, [0.57, 0.775], [0.835, 1])}>
          <Ten c={ACH_L} w={ACH_LW} lines={2} />
        </Part>
      </Faded>
    </Frame>
  );
}

/* ───────────── medial view: right ankle from the inside (toes to the viewer's left) ───────────── */

const MB = {
  body: sp([
    [296, -30], [288, 60], [276, 160], [266, 230], [262, 280], [262, 320], [262, 352], [256, 378], [244, 392], [226, 397, 1], [190, 397], [160, 393], [130, 388],
    [100, 386], [60, 389], [20, 392], [-30, 394], [-30, 312], [20, 304], [60, 294], [100, 280], [126, 266], [142, 248], [146, 200], [146, 100], [146, -30],
  ]),
  tibia: sp([
    [160, -40], [210, -40], [210, 100], [212, 200], [216, 246], [218, 264], [212, 276], [204, 280], [200, 292], [194, 306], [184, 314], [173, 312], [166, 300],
    [160, 288], [150, 284], [146, 272], [150, 240], [156, 180], [159, 80],
  ]),
  malM: [[150, 240], [176, 234], [200, 236], [214, 250], [217, 266], [212, 276], [204, 280], [200, 292], [194, 306], [184, 314], [173, 312], [166, 300], [160, 288], [150, 284], [146, 272]] as P[],
  talus: sp([
    [218, 300], [212, 286], [196, 278], [176, 277], [160, 282], [148, 288], [138, 292], [130, 298], [128, 308], [134, 316], [150, 314], [170, 318], [192, 320],
    [210, 316],
  ]),
  navic: sp([[108, 290], [124, 290], [130, 298], [129, 312], [124, 322], [114, 329], [104, 326], [100, 314], [102, 300]]),
  cune: sp([[78, 294], [100, 290], [108, 300], [106, 322], [98, 336], [80, 338], [74, 318]]),
  mt1: sp([[78, 304], [50, 312], [10, 324], [-30, 334], [-30, 362], [10, 354], [50, 344], [78, 338]]),
  calc: sp([
    [254, 312], [240, 318], [220, 314], [204, 320], [200, 328], [184, 334], [162, 332], [148, 338], [146, 350], [154, 360], [176, 366], [208, 372], [236, 376],
    [250, 372], [258, 358], [258, 332],
  ]),
  sust: line([[202, 326], [184, 336], [160, 334]]),
};
const MM = {
  sol: muscle({
    r: [
      [[214, -36], [216, 40], [219, 120], [222, 200]],
      [[270, -20], [266, 60], [262, 150], [259, 248]],
    ],
    n: 12,
  }),
  gas: muscle({
    r: [
      [[230, -40], [290, -44]],
      [[236, -4], [286, -8]],
      [[248, 24], [280, 20]],
      [[260, 42], [272, 40]],
      [[265, 50], [268, 50]],
    ],
    n: 8,
  }),
  fdl: muscle({
    r: [
      [[205, -40], [221, -40]],
      [[208, 60], [222, 60]],
      [[210, 140], [222, 142]],
      [[211, 200], [219, 204]],
      [[213, 240], [219, 244]],
      [[211, 270], [217, 274]],
      [[205, 298], [211, 302]],
      [[192, 330], [198, 336]],
      [[170, 346], [176, 352]],
      [[140, 356], [146, 362]],
    ],
    t1: 0.36,
    n: 5,
  }),
  tp: muscle({
    r: [
      [[199, -40], [211, -40]],
      [[201, 40], [211, 42]],
      [[203, 100], [211, 102]],
      [[205, 150], [211, 152]],
      [[205, 170], [211, 172]],
    ],
    t1: 0.62,
    n: 3,
  }),
  fhl: muscle({
    r: [
      [[223, 96], [235, 92]],
      [[222, 166], [248, 164]],
      [[222, 226], [251, 232]],
      [[221, 268], [241, 274]],
      [[219, 296], [229, 300]],
      [[214, 314], [222, 318]],
      [[194, 338], [201, 344]],
      [[168, 350], [173, 356]],
      [[140, 358], [145, 364]],
    ],
    t1: [0.5, 0.48, 0.46],
    n: 7,
  }),
  ta: muscle({
    r: [
      [[146, -40], [162, -40]],
      [[147, 30], [160, 30]],
      [[149, 90], [156, 92]],
      [[149, 160], [154.5, 162]],
      [[146, 220], [152, 224]],
      [[136, 258], [144, 262]],
      [[120, 282], [128, 288]],
      [[102, 302], [110, 310]],
      [[90, 318], [98, 326]],
    ],
    t1: 0.28,
    n: 5,
  }),
  abh: muscle({
    r: [
      [[238, 364], [240, 374]],
      [[214, 350], [216, 382]],
      [[176, 342], [177, 386]],
      [[136, 343], [136, 384]],
      [[96, 350], [96, 377]],
      [[62, 356], [62, 369]],
      [[20, 357], [20, 366]],
      [[-30, 358], [-30, 363]],
    ],
    t1: [0.62, 0.6, 0.62],
    n: 10,
  }),
};
const ACH_M: P[] = [[276, -30], [272, 40], [267, 120], [263, 190], [260, 250], [257, 290], [254, 318], [252.5, 344]];
const TPT_M: P[] = [[208, 160], [209, 220], [211, 256], [208, 280], [200, 300], [188, 316], [170, 324], [148, 326], [128, 325], [116, 324]];

/** 起始 / 停止 markers (muscle page): see OI_LAT. */
const OI_MED: OIMap = {
  soleus: { i: [[252.5, 341]] },
  gastrocnemius: { i: [[252.5, 341]] },
  'tibialis-posterior': { i: [[119, 323]] },
  'tibialis-anterior': { i: att(MM.ta, 'i') },
  'abductor-hallucis': { o: att(MM.abh, 'o') },
};

function AnkleMedial({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const fade = `${k.uid}-hf`;
  const labels: Lab[] = [
    { id: 'tibialis-anterior', t: '前脛骨筋', at: [153, 56], x: 134, y: 50, a: 'end' },
    { id: 'tibialis-posterior', t: '後脛骨筋', at: [206, 104], x: 134, y: 94, a: 'end' },
    { id: 'tibia', t: '脛骨', at: [180, 160], x: 134, y: 140, a: 'end' },
    { id: 'medial-malleolus', t: '内果（内くるぶし）', at: [178, 270], x: 134, y: 196, a: 'end' },
    { id: 'talus', t: '距骨', at: [142, 296], x: 110, y: 246, a: 'end' },
    { id: 'navicular', t: '舟状骨', at: [112, 308], x: 72, y: 270, a: 'end' },
    { id: 'gastrocnemius', t: '腓腹筋', at: [262, 22], x: 298, y: 46 },
    { id: 'soleus', t: 'ヒラメ筋', at: [240, 96], x: 298, y: 96 },
    { t: '長趾屈筋', at: [216, 150], x: 286, y: 146 },
    // focal Achilles lesion: the tendon's label names and points at the red stretch (FHL moves up for the mid-portion)
    ...((k.les.has('achilles-mid')
      ? [
          { id: 'flexor-hallucis-longus', t: '長母趾屈筋', at: [240, 222], x: 280, y: 192 },
          { id: 'achilles-tendon', t: ACH_MID_T, at: [259, 266], x: 274, y: 236 },
        ]
      : k.les.has('achilles-insertion')
        ? [
            { id: 'flexor-hallucis-longus', t: '長母趾屈筋', at: [240, 222], x: 278, y: 236 },
            { id: 'achilles-tendon', t: ACH_INS_T, at: [255, 334], x: 278, y: 330 },
          ]
        : [
            { id: 'achilles-tendon', t: 'アキレス腱', at: [262, 196], x: 280, y: 192 },
            { id: 'flexor-hallucis-longus', t: '長母趾屈筋', at: [240, 222], x: 278, y: 236 },
          ]) as Lab[]),
    { id: 'retrocalcaneal-bursa', t: '踵骨後部\n滑液包', at: [247, 306], x: 274, y: 280 },
    { id: 'abductor-hallucis', t: '母趾外転筋', at: [86, 366], x: 46, y: 418, a: 'middle' },
    { id: 'tibialis-posterior-tendon', t: '後脛骨筋腱', at: [160, 325], x: 136, y: 418, a: 'middle' },
    { id: 'calcaneus', t: '踵骨', at: [246, 350], x: 236, y: 418, a: 'middle' },
  ];
  const spots: Spot[] = [
    { id: 'ankle-inner', at: [200, 302] },
    { id: 'achilles-mid', at: [259, 258] },
    { id: 'heel-back', at: [252, 330] },
  ];
  return (
    <Frame
      k={k}
      p={lfp(p)}
      w={W}
      h={H}
      title="右足首を内側から見た図（左がつま先、右がかかと）"
      cap={['← つま先', '右足首・内側から']}
      labels={labels}
      spots={spots}
      oi={OI_MED}
      fade={{ top: 22 }}
      defs={
        <>
          <LfStyle />
          <HFade id={fade} from={44} to={2} />
        </>
      }
    >
      <Faded id={fade}>
        <Ctxt k={k}>
          <path className="body" d={MB.body} />
          <path className="bone" d={MB.mt1} />
          <path className="bone" d={MB.cune} />
        </Ctxt>
        <Part k={k} id="navicular">
          <path className="bone" d={MB.navic} />
        </Part>
        <Part k={k} id="calcaneus">
          <path className="bone" d={MB.calc} />
          <path className="bone-ln" d={MB.sust} />
        </Part>
        <Part k={k} id="talus">
          <path className="bone" d={MB.talus} />
          <path className="bone-ln" d={line([[200, 284], [178, 281], [158, 286]])} />
        </Part>
        <Part k={k} id="tibia">
          <path className="bone" d={MB.tibia} />
          <path className="bone-sh" d={sp([[160, -40], [168, -40], [166, 100], [162, 190], [156, 240], [150, 262], [147, 268], [150, 240], [156, 180], [159, 80]])} />
          <path className="bone-sh" d={sp([[200, -40], [210, -40], [210, 100], [212, 200], [214, 236], [206, 232], [204, 180], [202, 100]])} />
        </Part>
        <Ctxt k={k}>
          <path className="bone-sh" d={sp([[156, 290], [166, 306], [176, 318], [187, 322], [200, 314], [208, 300], [204, 290], [196, 304], [184, 314], [173, 312], [166, 300]])} />
        </Ctxt>
        <Part k={k} id="medial-malleolus">
          <Prom pts={MB.malM} cut={4} />
          <path className="bone-sh" d={sp([[204, 246], [214, 252], [217, 266], [212, 276], [204, 280], [200, 292], [194, 306], [188, 310], [194, 290], [198, 270]])} />
          <path className="bone-ln" d={line([[160, 262], [176, 268], [186, 296]])} />
        </Part>
        <Ctxt k={k}>
          {/* deltoid ligament (medial collateral ligament of the ankle) */}
          <path className="cap" d={sp([[170, 306], [190, 306], [200, 318], [192, 332], [172, 334], [150, 330], [136, 322], [154, 312]])} />
          <path className="ten-fib" d={line([[176, 312], [150, 324]]) + line([[182, 314], [176, 330]]) + line([[188, 312], [194, 326]])} />
          <path className="fat" d={sp([[250, 246], [242, 258], [234, 280], [228, 300], [236, 306], [246, 300], [252, 286], [254, 264]])} />
          <M g={MM.fdl} ctx />
          <Ten c={[[150, 170], [142, 240], [124, 268], [90, 284], [40, 298], [-30, 312]]} w={5} lines={1} />
        </Ctxt>
        <Part k={k} id="tibialis-posterior">
          <M g={MM.tp} />
        </Part>
        <Part k={k} id="tibialis-posterior-tendon">
          <Ten c={TPT_M} w={[7, 7.5, 8, 8, 8, 8, 8, 8.5, 9, 10]} lines={2} />
        </Part>
        <Part k={k} id="flexor-hallucis-longus">
          <M g={MM.fhl} />
        </Part>
        <Ctxt k={k}>
          <Nerve c={[[230, 110], [229, 190], [227, 250], [221, 288], [209, 316], [197, 332], [186, 342]]} w={6} />
        </Ctxt>
        <Part k={k} id="abductor-hallucis">
          <M g={MM.abh} />
        </Part>
        <Part k={k} id="tibialis-anterior">
          <M g={MM.ta} />
        </Part>
        <Part k={k} id="retrocalcaneal-bursa">
          <path className="bursa" d={ell(247, 305, 4.6, 10.5, 12)} />
        </Part>
        <Part k={k} id="soleus">
          <M g={MM.sol} />
        </Part>
        <Part k={k} id="achilles-tendon" zone={achZone(k, ACH_M, ACH_LW, [0.57, 0.775], [0.835, 1])}>
          <Ten c={ACH_M} w={ACH_LW} lines={2} />
        </Part>
        <Part k={k} id="gastrocnemius">
          <M g={MM.gas} />
        </Part>
      </Faded>
    </Frame>
  );
}

/* ───────────── back view: right ankle from behind (medial side at the viewer's left) ───────────── */

const KB = {
  body: sp([
    [120, -30], [122, 60], [126, 140], [130, 200], [130, 250], [128, 290], [132, 320], [142, 350], [150, 374], [160, 388], [180, 393], [200, 388], [210, 374],
    [218, 350], [230, 330], [236, 300], [234, 260], [230, 200], [234, 140], [238, 60], [240, -30],
  ]),
  tibia: sp([
    [138, -40], [196, -40], [197, 80], [199, 180], [204, 236], [206, 256], [204, 270], [192, 276], [176, 274], [160, 278], [152, 288], [148, 304], [142, 312],
    [135, 306], [131, 288], [132, 260], [135, 220], [137, 140], [138, 40],
  ]),
  malM: [[131, 258], [144, 250], [156, 254], [160, 278], [152, 288], [148, 304], [142, 312], [135, 306], [131, 288]] as P[],
  fibula: sp([
    [204, -40], [220, -40], [221, 100], [222, 190], [226, 240], [230, 268], [231, 292], [228, 312], [222, 326], [214, 328], [208, 318], [206, 296], [207, 270],
    [208, 240], [206, 190], [205, 100],
  ]),
  malL: [[207, 244], [218, 238], [228, 244], [230, 268], [231, 292], [228, 312], [222, 326], [214, 328], [208, 318], [206, 296], [207, 270]] as P[],
  talus: sp([[156, 282], [180, 278], [204, 282], [210, 296], [200, 310], [180, 314], [160, 312], [150, 298]]),
  calc: sp([
    [152, 318], [166, 310], [182, 309], [198, 312], [208, 322], [211, 340], [210, 358], [204, 372], [192, 378], [180, 379], [168, 378], [157, 372], [151, 358],
    [150, 338],
  ]),
};
const KM = {
  sol: muscle({
    r: [
      [[124, -40], [180, -40], [228, -40]],
      [[127, 60], [180, 60], [226, 60]],
      [[134, 140], [180, 140], [218, 140]],
      [[148, 206], [180, 206], [208, 206]],
      [[163, 246], [180, 250], [198, 246]],
      [[172, 266], [180, 270], [189, 266]],
    ],
    t1: [0.94, 0.9, 0.76, 0.88, 0.92],
    n: 14,
  }),
  gasM: muscle({
    r: [
      [[126, -44], [179, -48]],
      [[130, 0], [179.5, -4]],
      [[142, 36], [178, 30]],
      [[156, 58], [172, 54]],
      [[163, 66], [167, 65]],
    ],
    n: 10,
  }),
  gasL: muscle({
    r: [
      [[182.5, -48], [230, -44]],
      [[183, -12], [222, -8]],
      [[188, 14], [212, 16]],
      [[197, 28], [203, 28]],
    ],
    n: 8,
  }),
  fhl: muscle({
    r: [
      [[204, 116], [222, 122]],
      [[200, 178], [223, 184]],
      [[197, 234], [217, 240]],
      [[192, 268], [203, 272]],
      [[184, 292], [193, 296]],
    ],
    t1: 0.74,
    n: 6,
  }),
  pb: muscle({
    r: [
      [[218, -40], [236, -40]],
      [[218, 60], [236, 62]],
      [[217, 140], [232, 144]],
      [[215, 200], [228, 204]],
      [[215, 236], [224, 240]],
      [[216, 256], [222, 260]],
    ],
    t1: 0.86,
    n: 5,
  }),
  pl: muscle({
    r: [
      [[222, -40], [236, -40]],
      [[224, 20], [233, 22]],
      [[224, 100], [230, 102]],
      [[223, 180], [228, 182]],
      [[221, 236], [226, 238]],
      [[221, 256], [226, 258]],
    ],
    t1: 0.22,
    n: 4,
  }),
};
const ACH_K: P[] = [[181, -30], [181, 60], [180, 140], [180, 210], [180, 262], [180, 300], [180, 330], [180, 358]];
const ACH_KW = [34, 29, 24, 20.5, 19.5, 24, 34, 40];

/** 起始 / 停止 markers (muscle page): see OI_LAT. */
const OI_BACKV: OIMap = {
  soleus: { i: [[180, 356]] },
  gastrocnemius: { i: [[180, 356]] },
};

function AnkleBack({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'gastrocnemius', t: '腓腹筋', at: [152, 34], x: 112, y: 50, a: 'end' },
    { id: 'soleus', t: 'ヒラメ筋', at: [142, 128], x: 112, y: 116, a: 'end' },
    { id: 'tibialis-posterior-tendon', t: '後脛骨筋腱', at: [143, 246], x: 112, y: 228, a: 'end' },
    { id: 'medial-malleolus', t: '内果', at: [138, 272], x: 112, y: 270, a: 'end' },
    { id: 'retrocalcaneal-bursa', t: '踵骨後部\n滑液包', at: [170, 318], x: 112, y: 312, a: 'end' },
    { id: 'calcaneus', t: '踵骨', at: [158, 362], x: 112, y: 372, a: 'end' },
    { id: 'fibularis-longus', t: '長腓骨筋', at: [228, 56], x: 250, y: 44 },
    { id: 'fibularis-brevis', t: '短腓骨筋', at: [222, 150], x: 250, y: 118 },
    { id: 'flexor-hallucis-longus', t: '長母趾屈筋', at: [213, 200], x: 250, y: 176 },
    // focal Achilles lesion: the tendon's label names and points at the red stretch
    k.les.has('achilles-mid')
      ? { id: 'achilles-tendon', t: ACH_MID_T, at: [188, 282], x: 250, y: 222 }
      : k.les.has('achilles-insertion')
        ? { id: 'achilles-tendon', t: ACH_INS_T, at: [192, 346], x: 250, y: 352 }
        : { id: 'achilles-tendon', t: 'アキレス腱', at: [186, 226], x: 250, y: 226 },
    { id: 'peroneal-tendons', t: '腓骨筋腱', at: [221, 282], x: 250, y: 270 },
    { id: 'lateral-malleolus', t: '外果', at: [214, 314], x: 250, y: 320 },
  ];
  const spots: Spot[] = [
    { id: 'achilles-mid', at: [180, 262] },
    { id: 'heel-back', at: [180, 340] },
    { id: 'ankle-outer', at: [232, 300] },
    { id: 'ankle-inner', at: [136, 300] },
  ];
  return (
    <Frame
      k={k}
      p={lfp(p)}
      w={W}
      h={H}
      title="右足首を後ろから見た図（左が内側、右が外側）"
      cap={['← 内側', '右足首・後ろから']}
      labels={labels}
      spots={spots}
      oi={OI_BACKV}
      fade={{ top: 30 }}
      defs={<LfStyle />}
    >
      <Ctxt k={k}>
        <path className="body" d={KB.body} />
        <path className="bone" d={KB.tibia} />
        <path className="bone" d={KB.fibula} />
        <path className="bone" d={KB.talus} />
      </Ctxt>
      <Part k={k} id="medial-malleolus">
        <Prom pts={KB.malM} />
      </Part>
      <Part k={k} id="lateral-malleolus">
        <Prom pts={KB.malL} />
      </Part>
      <Part k={k} id="calcaneus">
        <path className="bone" d={KB.calc} />
        <path className="bone-ln" d={line([[160, 350], [180, 346], [200, 350]])} />
      </Part>
      <Ctxt k={k}>
        <Ten c={[[158, 150], [153, 220], [149, 262], [147, 292], [147, 316], [144, 332]]} w={6} lines={1} />
        <Nerve c={[[165, 140], [161, 220], [157, 270], [155, 302], [155, 334]]} w={5} />
      </Ctxt>
      <Part k={k} id="tibialis-posterior-tendon">
        <Ten c={[[150, 150], [146, 220], [142, 260], [140, 290], [139, 312], [134, 328]]} w={[7, 7, 7.5, 7.5, 7, 6]} lines={2} />
      </Part>
      <Part k={k} id="flexor-hallucis-longus">
        <M g={KM.fhl} />
      </Part>
      <Part k={k} id="fibularis-brevis">
        <M g={KM.pb} />
      </Part>
      <Part k={k} id="fibularis-longus">
        <M g={KM.pl} />
      </Part>
      <FibTendons
        k={k}
        pb={<Ten c={[[218, 250], [217, 280], [218, 306], [222, 322], [227, 332]]} w={[6, 6.5, 6.5, 6, 5]} lines={1} />}
        pl={<Ten c={[[223.5, 250], [223.5, 282], [225, 304], [228, 320], [232, 328]]} w={[5.5, 6, 6, 5.5, 4.5]} lines={1} />}
      />
      <Part k={k} id="soleus">
        <M g={KM.sol} />
      </Part>
      <Part k={k} id="achilles-tendon" zone={achZone(k, ACH_K, ACH_KW, [0.54, 0.72], [0.84, 1])}>
        <Ten c={ACH_K} w={ACH_KW} lines={4} />
      </Part>
      <Part k={k} id="retrocalcaneal-bursa">
        <path className="bursa" d={ell(180, 318, 13, 6.5)} style={{ fillOpacity: 0.5, strokeDasharray: '2.5 2' }} />
      </Part>
      <Part k={k} id="gastrocnemius">
        <M g={KM.gasL} />
        <M g={KM.gasM} />
      </Part>
    </Frame>
  );
}

/* ───────────── component & registration ───────────── */

function AnkleDiagram(p: RegionDiagramProps) {
  const k = useCtx(p);
  switch (p.view ?? 'lateral') {
    case 'medial':
      return <AnkleMedial p={p} k={k} />;
    case 'back':
      return <AnkleBack p={p} k={k} />;
    default:
      return <AnkleLateral p={p} k={k} />;
  }
}

const diagram: RegionDiagram = {
  region: 'ankle',
  views: [
    { id: 'lateral', label: '外側から' },
    { id: 'medial', label: '内側から' },
    { id: 'back', label: '後ろから' },
  ],
  parts: {
    lateral: [
      'navicular', 'tibia', 'talus', 'calcaneus', 'fibula', 'lateral-malleolus', 'atfl', 'cfl', 'flexor-hallucis-longus', 'retrocalcaneal-bursa',
      'fibularis-brevis', 'fibularis-longus', 'peroneal-tendons', 'soleus', 'achilles-tendon',
    ],
    medial: [
      'navicular', 'calcaneus', 'talus', 'tibia', 'medial-malleolus', 'tibialis-posterior', 'tibialis-posterior-tendon', 'flexor-hallucis-longus',
      'abductor-hallucis', 'tibialis-anterior', 'retrocalcaneal-bursa', 'soleus', 'achilles-tendon', 'gastrocnemius',
    ],
    back: [
      'medial-malleolus', 'lateral-malleolus', 'calcaneus', 'tibialis-posterior-tendon', 'flexor-hallucis-longus', 'fibularis-brevis', 'fibularis-longus',
      'peroneal-tendons', 'soleus', 'achilles-tendon', 'retrocalcaneal-bursa', 'gastrocnemius',
    ],
  },
  spots: {
    lateral: ['ankle-outer', 'achilles-mid', 'heel-back'],
    medial: ['ankle-inner', 'achilles-mid', 'heel-back'],
    back: ['achilles-mid', 'heel-back', 'ankle-outer', 'ankle-inner'],
  },
  Component: AnkleDiagram,
};
export default diagram;
