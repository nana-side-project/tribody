// Region diagram: 膝 (knee) — the person's RIGHT knee, four views:
//   front 前から · lateral 外側から (with a locator of the whole iliotibial band) · medial 内側から · back 後ろから.
// Drawn with the lower-limb kit from ./hip (muscle sheets, tendons, labels, hotspots). Original artwork.
import type { RegionDiagram, RegionDiagramProps } from '../types';
import {
  Ctxt,
  Frame,
  M,
  Part,
  Ten,
  ell,
  line,
  muscle,
  sp,
  tube,
  att,
  useCtx,
  xy,
  type Ctx,
  type Lab,
  type P,
  type Spot,
  type XY,
} from './hip';
import { once } from './lazy';
import { MText } from './mirror';

const W = 360;
const H = 440;
const JL = 250; // joint line

/* ───────────── front view: right knee from the front (lateral side at the viewer's left) ───────────── */
const KF = once(() => ({
  body: sp([[96, -10], [98, 80], [106, 170], [104, 240], [100, 300], [104, 380], [114, 450], [262, 450], [270, 380], [272, 300], [264, 230], [264, 150], [258, 60], [254, -10]]),
  femur: sp([
    [150, -30], [150, 60], [146, 120], [136, 160], [124, 192], [119, 210], [121, 228], [128, 240], [140, 249], [158, 251], [170, 247], [176, 239],
    [185, 239], [192, 247], [206, 251], [225, 250], [237, 240], [243, 225], [244, 207], [246, 190], [242, 174], [228, 150], [208, 116], [198, 60],
    [196, -30],
  ]),
  femLn: line([[134, 214], [150, 222], [166, 232]]) + line([[194, 232], [212, 224], [230, 216]]),
  tibia: sp([
    [126, 256], [140, 252], [170, 254], [180, 256], [190, 254], [222, 252], [238, 256], [240, 268], [232, 286], [220, 304], [212, 330], [208, 370],
    [206, 460], [166, 460], [166, 380], [162, 340], [152, 310], [140, 292], [130, 278], [124, 266],
  ]),
  tibLn: line([[150, 262], [176, 258], [184, 258], [212, 262]]) + line([[186, 312], [196, 360], [198, 440]]),
  fibula: sp([[106, 277], [112, 268], [124, 267], [132, 276], [132, 292], [127, 306], [129, 330], [131, 460], [120, 460], [118, 330], [114, 306], [108, 294]]),
  patella: sp([[150, 172], [162, 162], [180, 160], [198, 164], [208, 176], [208, 196], [200, 216], [188, 230], [178, 235, 1], [168, 230], [156, 216], [148, 196]]),
  patLn: line([[160, 178], [178, 172], [196, 178]]) + line([[164, 206], [178, 214], [192, 206]]),
  patSh: sp([[146, 172], [161, 158], [181, 156], [201, 161], [213, 176], [213, 198], [204, 221], [190, 236], [179, 242], [167, 236], [153, 220], [144, 198]]),
  menL: sp([[121, 250, 1], [132, 246], [150, 246], [166, 249, 1], [150, 253.5], [132, 255.5]]),
  menM: sp([[195, 249, 1], [212, 246], [232, 246], [243, 251, 1], [232, 255.5], [212, 254]]),
}));
const KFM = once(() => ({
  vl: muscle({
    r: [
      [[110, -30], [107, 30], [111, 90], [121, 140]],
      [[151, 50], [153, 110], [157, 146], [161, 166]],
    ],
    t1: 0.86,
    n: 13,
  }),
  vm: muscle({
    r: [
      [[203, -30], [226, 30], [244, 100], [249, 150], [241, 184], [226, 200]],
      [[195, 40], [196, 110], [198, 150], [204, 170], [208, 184], [210, 196]],
    ],
    t1: 0.9,
    n: 15,
  }),
  rf: muscle({
    r: [
      [[152, -30], [196, -30]],
      [[157, 50], [195, 50]],
      [[164, 104], [190, 104]],
      [[170, 132], [186, 132]],
    ],
    n: 10,
    pen: 'bi',
    penD: 0.12,
  }),
  bf: muscle({
    r: [
      [[100, 60], [110, 58]],
      [[103, 140], [111, 140]],
      [[108, 200], [114, 200]],
      [[112, 272], [118, 272]],
    ],
    t1: 0.3,
    n: 3,
  }),
  edl: muscle({
    r: [
      [[124, 296], [140, 292]],
      [[124, 380], [140, 380]],
      [[127, 460], [142, 460]],
    ],
    n: 3,
  }),
  sart: muscle({
    r: [
      [[232, -30], [252, -30]],
      [[244, 80], [260, 80]],
      [[250, 180], [262, 182]],
      [[246, 250], [256, 256]],
      [[230, 288], [236, 298]],
      [[214, 304], [216, 312]],
    ],
    t1: 0.62,
    n: 4,
  }),
  gas: muscle({
    r: [
      [[232, 258], [246, 254]],
      [[226, 320], [262, 316]],
      [[219, 400], [263, 396]],
      [[214, 460], [254, 460]],
    ],
    t0: 0.06,
    n: 7,
  }),
  ta: muscle({
    r: [
      [[140, 280], [166, 290]],
      [[136, 360], [167, 364]],
      [[142, 460], [167, 460]],
    ],
    n: 7,
  }),
  fl: muscle({
    r: [
      [[104, 288], [122, 286]],
      [[108, 380], [126, 380]],
      [[114, 460], [126, 460]],
    ],
    n: 4,
  }),
}));
const ITB_KF: P[] = [[116, -30], [118, 60], [122, 140], [126, 200], [132, 240], [140, 270]];

function KneeFront({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'vastus-lateralis', t: '外側広筋', at: [136, 64], x: 96, y: 56, a: 'end' },
    { id: 'biceps-femoris', t: '大腿二頭筋', at: [107, 120], x: 96, y: 108, a: 'end' },
    { id: 'iliotibial-band', t: '腸脛靱帯', at: [124, 172], x: 96, y: 160, a: 'end' },
    { id: 'lateral-femoral-epicondyle', t: '大腿骨\n外側上顆', at: [121, 210], x: 96, y: 200, a: 'end' },
    { id: 'meniscus', t: '半月板', at: [134, 251], x: 96, y: 252, a: 'end' },
    { id: 'fibula', t: '腓骨', at: [120, 300], x: 96, y: 296, a: 'end' },
    { id: 'tibialis-anterior', t: '前脛骨筋', at: [152, 360], x: 96, y: 352, a: 'end' },
    { id: 'fibularis-longus', t: '長腓骨筋', at: [116, 404], x: 96, y: 404, a: 'end' },
    { id: 'rectus-femoris', t: '大腿直筋', at: [176, 30], x: 266, y: 35 }, // clear of the 「内側 →」 caption
    { id: 'vastus-medialis', t: '内側広筋', at: [228, 120], x: 266, y: 100 },
    { id: 'sartorius', t: '縫工筋', at: [255, 140], x: 268, y: 140 },
    { id: 'quadriceps-tendon', t: '大腿四頭筋腱', at: [182, 144], x: 266, y: 176 },
    { id: 'patella', t: '膝蓋骨', at: [198, 196], x: 266, y: 208 },
    { id: 'mcl', t: '内側側副靱帯', at: [244, 232], x: 266, y: 240 },
    { id: 'patellar-tendon', t: '膝蓋腱', at: [186, 266], x: 266, y: 272 },
    { id: 'pes-anserinus', t: '鵞足', at: [230, 290], x: 266, y: 300 },
    { id: 'pes-anserine-bursa', t: '鵞足包', at: [204, 312], x: 266, y: 330 },
    { id: 'gastrocnemius', t: '腓腹筋', at: [246, 370], x: 266, y: 370 },
    { id: 'tibia', t: '脛骨', at: [190, 400], x: 266, y: 410 },
  ];
  const spots: Spot[] = [
    { id: 'knee-front', at: [178, 198] },
    { id: 'knee-below', at: [178, 254] },
    { id: 'knee-outer', at: [120, 222] },
    { id: 'knee-inner', at: [226, 304] },
  ];
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title="右膝を前から見た図（左が外側、右が内側）"
      cap={['右膝・前から', '内側 →']}
      oi={{ 'vastus-medialis': { i: att(KFM().vm, 'i', [0.62, 0.88]) } }}
      labels={labels}
      spots={spots}
      fade={{ top: 34, bottom: 40 }}
    >
      <Ctxt k={k}>
        <path className="body" d={KF().body} />
        <path className="bone" d={KF().femur} />
        <path className="bone-ln" d={KF().femLn} />
      </Ctxt>
      <Part k={k} id="fibula">
        <path className="bone" d={KF().fibula} />
      </Part>
      <Part k={k} id="tibia">
        <path className="bone" d={KF().tibia} />
        <path className="bone-ln" d={KF().tibLn} />
        <path className="bone" d={ell(140, 274, 7, 6)} />
      </Part>
      <Part k={k} id="meniscus">
        <path className="cart" d={KF().menL} />
        <path className="cart" d={KF().menM} />
      </Part>
      <Part k={k} id="mcl">
        <Ten c={[[243, 196], [242, 240], [238, 290], [232, 328]]} w={[11, 13, 13, 11]} cls="lig" lines={2} />
      </Part>
      <Part k={k} id="gastrocnemius">
        <M g={KFM().gas} />
      </Part>
      <Part k={k} id="fibularis-longus">
        <M g={KFM().fl} />
      </Part>
      <Ctxt k={k}>
        <M g={KFM().edl} ctx />
      </Ctxt>
      <Part k={k} id="tibialis-anterior">
        <M g={KFM().ta} />
      </Part>
      <Part k={k} id="biceps-femoris">
        <M g={KFM().bf} />
      </Part>
      <Part k={k} id="vastus-lateralis">
        <M g={KFM().vl} />
      </Part>
      <Part k={k} id="vastus-medialis">
        <M g={KFM().vm} />
      </Part>
      <Part k={k} id="rectus-femoris">
        <M g={KFM().rf} />
      </Part>
      <Part k={k} id="quadriceps-tendon">
        <path className="ten" d={sp([[167, 118, 1], [189, 118, 1], [195, 140], [205, 166], [151, 166], [160, 140]])} />
        <path className="ten-fib" d={line([[172, 122], [168, 164]]) + line([[178, 122], [178, 164]]) + line([[184, 122], [190, 164]])} />
      </Part>
      <Part k={k} id="patellar-tendon">
        <path className="ten" d={sp([[164, 214], [178, 212], [192, 214], [190, 262], [188, 290], [168, 290], [166, 262]])} />
        <path className="ten-fib" d={line([[171, 236], [171, 288]]) + line([[178, 238], [178, 288]]) + line([[185, 236], [185, 288]])} />
      </Part>
      <Ctxt k={k}>
        <path className="bone-sh" d={KF().patSh} />
      </Ctxt>
      <Part k={k} id="patella">
        <path className="bone" d={KF().patella} />
        <path className="bone-ln" d={KF().patLn} />
      </Part>
      <Part k={k} id="iliotibial-band">
        <Ten c={ITB_KF} w={[16, 16, 16, 16, 17, 14]} cls="fascia" lines={2} />
      </Part>
      <Part k={k} id="lateral-femoral-epicondyle">
        <path className="bone-t" d={ell(122, 211, 6.5, 9)} />
      </Part>
      <Part k={k} id="pes-anserine-bursa">
        <path className="bursa" d={ell(213, 307, 15, 9, -24)} />
      </Part>
      <Part k={k} id="sartorius">
        <M g={KFM().sart} />
      </Part>
      <Part k={k} id="pes-anserinus">
        <path className="ten" d={sp([[238, 268], [242, 282], [234, 300], [220, 314], [205, 318], [203, 309], [216, 298], [228, 282]])} />
        <path className="ten-fib" d={line([[236, 276], [224, 296], [208, 312]]) + line([[240, 282], [228, 300], [212, 316]])} />
      </Part>
    </Frame>
  );
}

/* ───────────── lateral view: right knee from the outside (front of the knee at the viewer's right) ───────────── */
const KL = once(() => ({
  body: sp([[104, -10], [108, 80], [118, 170], [112, 220], [96, 290], [94, 360], [104, 450], [232, 450], [234, 380], [242, 310], [250, 250], [252, 180], [250, 100], [248, -10]]),
  femur: sp([
    [154, -30], [154, 60], [152, 130], [146, 168], [132, 190], [124, 208], [124, 226], [132, 240], [148, 250], [170, 253], [190, 248], [204, 236],
    [212, 218], [213, 196], [210, 176], [204, 150], [198, 100], [196, -30],
  ]),
  femLn: line([[136, 236], [128, 214], [136, 192], [156, 182], [180, 186], [196, 202], [200, 226], [190, 244]]),
  tibia: sp([
    [128, 258], [150, 253], [180, 252], [208, 254], [220, 262], [228, 278], [238, 292], [238, 304], [230, 330], [224, 380], [222, 460], [182, 460],
    [176, 380], [166, 330], [148, 300], [136, 284], [128, 270],
  ]),
  fibula: sp([[138, 277], [146, 268], [160, 267], [168, 276], [166, 292], [161, 302], [164, 330], [166, 460], [151, 460], [150, 330], [146, 302], [140, 292]]),
  patella: sp([[214, 160], [226, 153], [240, 157], [247, 176], [248, 200], [244, 220], [236, 232], [228, 237, 1], [222, 226], [216, 206], [213, 182]]),
  patSh: sp([[211, 158], [226, 149], [243, 154], [252, 176], [253, 202], [248, 224], [238, 238], [227, 243], [219, 228], [213, 206], [210, 182]]),
  cartP: sp([[213, 166], [217, 163], [221, 184], [223, 206], [223, 226], [219, 228], [217, 207], [215, 186]]),
  cartT: sp([[205, 170], [210, 168], [214, 190], [214, 214], [210, 234], [205, 236], [208, 212], [209, 190]]),
  men: sp([[128, 250, 1], [140, 246], [170, 248], [204, 247], [214, 251, 1], [204, 255], [170, 256], [140, 256]]),
  fat: sp([[211, 232], [222, 229], [229, 258], [226, 286], [214, 276], [207, 256]]),
}));
const KLM = once(() => ({
  rf: muscle({ r: [[[222, -30], [246, -30]], [[224, 50], [244, 50]], [[226, 100], [238, 100]]], n: 4 }),
  vl: muscle({
    r: [
      [[150, -30], [150, 40], [151, 110]],
      [[224, 26], [226, 96], [214, 150]],
    ],
    t1: 0.9,
    n: 14,
  }),
  bf: muscle({
    r: [
      [[108, -30], [150, -30]],
      [[114, 60], [150, 60]],
      [[126, 140], [148, 140]],
      [[140, 200], [152, 200]],
      [[147, 274], [158, 274]],
    ],
    t1: 0.5,
    n: 8,
    seams: [0.62],
  }),
  gas: muscle({
    r: [
      [[124, 214], [140, 206]],
      [[100, 290], [148, 286]],
      [[98, 370], [148, 366]],
      [[108, 460], [146, 460]],
    ],
    t0: 0.08,
    n: 8,
  }),
  sol: muscle({ r: [[[146, 300], [158, 300]], [[143, 370], [164, 370]], [[148, 460], [164, 460]]], n: 3 }),
  fl: muscle({ r: [[[158, 292], [176, 290]], [[162, 370], [180, 372]], [[164, 460], [180, 460]]], n: 3 }),
  edl: muscle({ r: [[[178, 296], [212, 288]], [[178, 370], [204, 372]], [[178, 460], [198, 460]]], n: 4 }),
  ta: muscle({ r: [[[212, 284], [232, 302]], [[204, 370], [226, 372]], [[198, 460], [222, 460]]], n: 5 }),
}));
const ITB_KL: P[] = [[176, -30], [180, 60], [185, 140], [190, 200], [197, 240], [205, 268]];

/** Locator inset: the whole iliotibial band from the pelvis to the knee (mini lateral view). */
const LOC = { x: 250, y: 288, w: 106, h: 148 };
const LM = once(() => ({
  body: sp([[270, 314], [300, 316], [308, 330], [306, 352], [302, 380], [300, 406], [302, 432], [276, 432], [274, 406], [270, 380], [266, 356], [262, 336], [264, 320]]),
  crest: sp([[264, 330], [271, 317], [287, 312], [302, 318], [307, 327], [300, 325], [288, 319], [275, 323], [268, 332]]),
  femur: sp([[278, 346], [288, 342], [290, 354], [290, 400], [294, 410], [282, 414], [280, 400], [280, 354]]),
  gmed: muscle({ r: [[[272, 322], [286, 317], [300, 321]], [[283, 344], [286, 343], [289, 344]]], t1: 0.8, n: 5 }),
  gmax: muscle({ r: [[[265, 326], [262, 344], [266, 364]], [[285, 352], [285, 362], [283, 372]]], n: 6 }),
  tfl: muscle({ r: [[[299, 323], [305, 328]], [[291, 361], [296, 363]]], n: 3 }),
  itb: tube([[287, 350], [288, 372], [290, 396], [293, 420]], [8, 7, 6, 5]),
}));

function KneeLateral({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'biceps-femoris', t: '大腿二頭筋', at: [130, 90], x: 98, y: 100, a: 'end' },
    { id: 'lateral-femoral-epicondyle', t: '大腿骨\n外側上顆', at: [164, 210], x: 98, y: 190, a: 'end' },
    { id: 'meniscus', t: '半月板', at: [136, 252], x: 98, y: 246, a: 'end' },
    { id: 'fibula', t: '腓骨', at: [152, 284], x: 98, y: 284, a: 'end' },
    { id: 'gastrocnemius', t: '腓腹筋', at: [118, 340], x: 86, y: 334, a: 'end' },
    { id: 'soleus', t: 'ヒラメ筋', at: [152, 400], x: 98, y: 384, a: 'end' },
    { id: 'fibularis-longus', t: '長腓骨筋', at: [171, 424], x: 98, y: 424, a: 'end' },
    { id: 'rectus-femoris', t: '大腿直筋', at: [236, 42], x: 256, y: 30 },
    { id: 'vastus-lateralis', t: '外側広筋', at: [204, 76], x: 256, y: 68 },
    { id: 'iliotibial-band', t: '腸脛靱帯', at: [186, 130], x: 256, y: 106 },
    { id: 'quadriceps-tendon', t: '大腿四頭筋腱', at: [226, 128], x: 256, y: 142 },
    { id: 'patella', t: '膝蓋骨', at: [242, 188], x: 256, y: 180 },
    { id: 'patellofemoral-cartilage', t: '膝蓋大腿関節\nの軟骨', at: [219, 208], x: 256, y: 212 },
    { id: 'patellar-tendon', t: '膝蓋腱', at: [236, 266], x: 256, y: 268 },
    // inset: TFL (front) is labelled above gluteus maximus (back) so neither leader crosses the other muscle
    { id: 'gluteus-medius', t: '中殿筋', at: [290, 321], x: 314, y: 324 }, // clear of the inset title
    { id: 'tensor-fasciae-latae', t: '大腿筋\n膜張筋', at: [301, 336], x: 314, y: 350 },
    { id: 'gluteus-maximus', t: '大殿筋', at: [274, 360], x: 314, y: 388 },
    { id: 'iliotibial-band', t: '腸脛\n靱帯', at: [290, 398], x: 314, y: 410 },
  ];
  const spots: Spot[] = [
    { id: 'knee-outer', at: [172, 214] },
    { id: 'knee-front', at: [234, 194] },
    { id: 'knee-below', at: [234, 252] },
  ];
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title="右膝を外側から見た図（右が膝の前）。右下は腸脛靱帯の全体図"
      cap={['右膝・外側から', '前 →']}
      labels={labels}
      spots={spots}
      fade={{ top: 34, bottom: 40 }}
      overlay={
        <g className="thk-inset">
          <rect className="inset-bg" x={LOC.x} y={LOC.y} width={LOC.w} height={LOC.h} rx={12} />
          <MText mir={k.mir} className="cap-t" x={LOC.x + LOC.w / 2} y={LOC.y + 15} a="middle">
            腸脛靱帯の全体
          </MText>
          <Ctxt k={k}>
            <path className="body" d={LM().body} />
            <path className="bone-g" d={LM().crest} />
            <path className="bone-g" d={LM().femur} />
            <path className="bone-g" d={ell(300, 408, 2.8, 5.5)} />
            <path className="bone-g" d={sp([[281, 418], [300, 417], [299, 432], [284, 432]])} />
          </Ctxt>
          <Part k={k} id="gluteus-medius">
            <M g={LM().gmed} />
          </Part>
          <Part k={k} id="gluteus-maximus">
            <M g={LM().gmax} />
          </Part>
          <Part k={k} id="iliotibial-band">
            <path className="fascia" d={LM().itb} />
          </Part>
          <Part k={k} id="tensor-fasciae-latae">
            <M g={LM().tfl} />
          </Part>
          <Ctxt k={k}>
            <rect className="inset-ln" x={271} y={384} width={36} height={46} rx={3} />
          </Ctxt>
        </g>
      }
    >
      <Ctxt k={k}>
        <path className="body" d={KL().body} />
        <path className="bone" d={KL().femur} />
        <path className="bone-ln" d={KL().femLn} />
      </Ctxt>
      <Part k={k} id="tibia">
        <path className="bone" d={KL().tibia} />
        <path className="bone" d={ell(206, 268, 8, 6)} />
      </Part>
      <Part k={k} id="fibula">
        <path className="bone" d={KL().fibula} />
      </Part>
      <Part k={k} id="meniscus">
        <path className="cart" d={KL().men} />
      </Part>
      <Ctxt k={k}>
        <Ten c={[[165, 216], [160, 244], [155, 274]]} w={[8, 7, 7]} cls="lig" lines={1} />
        <path className="fat" d={KL().fat} />
      </Ctxt>
      <Part k={k} id="lateral-femoral-epicondyle">
        <path className="bone" d={sp([[156, 204], [164, 199], [173, 203], [175, 213], [170, 222], [160, 222], [155, 213]])} />
        <path className="bone-ln" d={line([[160, 206], [166, 204], [171, 208]])} />
      </Part>
      <Part k={k} id="gastrocnemius">
        <M g={KLM().gas} />
      </Part>
      <Part k={k} id="soleus">
        <M g={KLM().sol} />
      </Part>
      <Part k={k} id="fibularis-longus">
        <M g={KLM().fl} />
      </Part>
      <Ctxt k={k}>
        <M g={KLM().edl} ctx />
      </Ctxt>
      <Part k={k} id="tibialis-anterior">
        <M g={KLM().ta} />
      </Part>
      <Part k={k} id="biceps-femoris">
        <M g={KLM().bf} />
      </Part>
      <Part k={k} id="vastus-lateralis">
        <M g={KLM().vl} />
      </Part>
      <Part k={k} id="rectus-femoris">
        <M g={KLM().rf} />
      </Part>
      <Part k={k} id="quadriceps-tendon">
        <path className="ten" d={sp([[200, 96], [236, 98], [242, 156], [216, 160], [208, 130]])} />
        <path className="ten-fib" d={line([[210, 104], [218, 156]]) + line([[222, 102], [228, 156]]) + line([[232, 102], [238, 154]])} />
      </Part>
      <Part k={k} id="patellar-tendon">
        <path className="ten" d={sp([[222, 224], [238, 226], [241, 262], [241, 297], [229, 299], [227, 262]])} />
        <path className="ten-fib" d={line([[230, 232], [233, 296]]) + line([[236, 232], [238, 296]])} />
      </Part>
      <Part k={k} id="patellofemoral-cartilage">
        <path className="cart" d={KL().cartT} />
        <path className="cart" d={KL().cartP} />
      </Part>
      <Ctxt k={k}>
        <path className="bone-sh" d={KL().patSh} />
      </Ctxt>
      <Part k={k} id="patella">
        <path className="bone" d={KL().patella} />
        <path className="bone-ln" d={line([[226, 166], [238, 180], [240, 204], [234, 222]])} />
      </Part>
      <Part k={k} id="iliotibial-band">
        <Ten c={ITB_KL} w={[40, 38, 34, 30, 26, 16]} cls="fascia" lines={4} />
      </Part>
    </Frame>
  );
}

/* ───────────── medial view: right knee from the inside (front of the knee at the viewer's left) ───────────── */
const mx = (pts: readonly P[]): P[] => pts.map((q) => (q[2] ? [360 - q[0], q[1], 1] : [360 - q[0], q[1]]) as P);
const KMD = once(() => ({
  body: sp([[116, -10], [112, 100], [108, 180], [110, 250], [116, 310], [122, 380], [128, 450], [282, 450], [286, 380], [286, 300], [272, 240], [280, 160], [282, 80], [280, -10]]),
  femur: sp([
    [202, -30], [202, 60], [206, 130], [214, 160], [228, 180], [238, 204], [238, 228], [230, 242], [212, 252], [190, 254], [170, 250], [156, 238],
    [148, 220], [147, 196], [150, 176], [156, 150], [162, 100], [160, -30],
  ]),
  femLn: line([[226, 238], [234, 216], [228, 194], [208, 182], [184, 186], [164, 202], [160, 226], [170, 244]]),
  tibia: sp([
    [232, 258], [210, 253], [180, 252], [152, 254], [140, 262], [132, 278], [122, 292], [122, 304], [130, 330], [136, 380], [138, 460], [192, 460],
    [196, 380], [204, 330], [216, 300], [226, 284], [233, 270],
  ]),
  tibLn: line([[150, 300], [160, 360], [164, 440]]),
  patella: sp(mx([[214, 160], [226, 153], [240, 157], [247, 176], [248, 200], [244, 220], [236, 232], [228, 237, 1], [222, 226], [216, 206], [213, 182]])),
  patSh: sp(mx([[211, 158], [226, 149], [243, 154], [252, 176], [253, 202], [248, 224], [238, 238], [227, 243], [219, 228], [213, 206], [210, 182]])),
  cartP: sp(mx([[213, 166], [217, 163], [221, 184], [223, 206], [223, 226], [219, 228], [217, 207], [215, 186]])),
  cartT: sp(mx([[205, 170], [210, 168], [214, 190], [214, 214], [210, 234], [205, 236], [208, 212], [209, 190]])),
  men: sp([[233, 250, 1], [220, 246], [190, 248], [156, 247], [146, 251, 1], [156, 255], [190, 256], [220, 256]]),
  fat: sp(mx([[211, 232], [222, 229], [229, 258], [226, 286], [214, 276], [207, 256]])),
}));
const KMM = once(() => ({
  rf: muscle({ r: [[[114, -30], [138, -30]], [[116, 50], [136, 50]], [[122, 100], [134, 100]]], n: 4 }),
  vm: muscle({
    r: [
      [[196, -30], [207, 46], [214, 110], [212, 152], [200, 178], [182, 192], [164, 198]],
      [[146, 34], [146, 100], [148, 138], [150, 160], [153, 178], [157, 190], [160, 197]],
    ],
    t1: 0.92,
    n: 15,
  }),
  sm: muscle({
    r: [
      [[234, 30], [264, 30]],
      [[232, 140], [266, 140]],
      [[230, 206], [252, 214]],
      [[224, 252], [238, 262]],
    ],
    t1: 0.72,
    n: 7,
  }),
  sart: muscle({
    r: [
      [[196, -30], [226, -30]],
      [[204, 80], [232, 80]],
      [[212, 170], [238, 174]],
      [[214, 232], [236, 240]],
      [[198, 276], [214, 290]],
      [[168, 298], [176, 313]],
      [[146, 311], [149, 322]],
    ],
    t1: 0.74,
    n: 6,
  }),
  grac: muscle({
    r: [
      [[228, -30], [246, -30]],
      [[234, 80], [250, 80]],
      [[240, 160], [251, 162]],
      [[241, 220], [249, 224]],
      [[220, 278], [226, 286]],
      [[176, 309], [180, 318]],
      [[147, 320], [150, 328]],
    ],
    t1: 0.42,
    n: 4,
  }),
  st: muscle({
    r: [
      [[246, -30], [274, -30]],
      [[251, 60], [273, 60]],
      [[253, 130], [263, 130]],
      [[253, 200], [259, 204]],
      [[240, 264], [246, 272]],
      [[196, 311], [200, 320]],
      [[148, 327], [151, 333]],
    ],
    t1: 0.36,
    n: 5,
  }),
  gas: muscle({
    r: [
      [[242, 218], [226, 208]],
      [[274, 300], [212, 292]],
      [[278, 380], [208, 374]],
      [[268, 460], [212, 460]],
    ],
    t0: 0.08,
    n: 9,
  }),
  sol: muscle({ r: [[[208, 300], [198, 300]], [[212, 380], [196, 380]], [[210, 460], [196, 460]]], n: 3 }),
}));

/** adductor tubercle and the adductor magnus tendon ending on it */
const AM_TUB: XY = [211, 171];
const AM_TEN: P[] = [[202, -30], [202, 50], [204, 110], [207, 146], [AM_TUB[0], AM_TUB[1] - 4]];

function KneeMedial({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'rectus-femoris', t: '大腿直筋', at: [126, 44], x: 104, y: 36, a: 'end' },
    { id: 'vastus-medialis', t: '内側広筋', at: [166, 112], x: 104, y: 96, a: 'end' },
    { id: 'quadriceps-tendon', t: '大腿四頭筋腱', at: [134, 128], x: 104, y: 138, a: 'end' },
    { id: 'patella', t: '膝蓋骨', at: [118, 190], x: 104, y: 180, a: 'end' },
    { id: 'patellofemoral-cartilage', t: '膝蓋大腿関節\nの軟骨', at: [141, 208], x: 104, y: 212, a: 'end' },
    { id: 'patellar-tendon', t: '膝蓋腱', at: [124, 264], x: 104, y: 262, a: 'end' },
    { id: 'pes-anserine-bursa', t: '鵞足包', at: [160, 298], x: 104, y: 292, a: 'end' },
    { id: 'pes-anserinus', t: '鵞足', at: [146, 322], x: 104, y: 326, a: 'end' },
    { id: 'tibia', t: '脛骨', at: [160, 384], x: 104, y: 384, a: 'end' },
    { id: 'semitendinosus', t: '半腱様筋', at: [262, 34], x: 282, y: 40 },
    { id: 'sartorius', t: '縫工筋', at: [218, 74], x: 282, y: 72 },
    { id: 'gracilis', t: '薄筋', at: [242, 104], x: 282, y: 104 },
    // adductor magnus tendon (in front of sartorius) above semimembranosus (behind the ST tendon): leaders do not cross
    { id: 'adductor-magnus', t: '大内転筋の腱', at: [204, 118], x: 278, y: 140 },
    { id: 'semimembranosus', t: '半膜様筋', at: [264, 170], x: 282, y: 174 },
    { id: 'mcl', t: '内側側副靱帯', at: [189, 238], x: 278, y: 224 },
    { id: 'meniscus', t: '半月板', at: [222, 252], x: 282, y: 262 },
    { id: 'gastrocnemius', t: '腓腹筋', at: [252, 340], x: 282, y: 334 },
    { id: 'soleus', t: 'ヒラメ筋', at: [203, 410], x: 282, y: 400 },
  ];
  const spots: Spot[] = [
    { id: 'knee-inner', at: [158, 312] },
    { id: 'knee-front', at: [128, 194] },
    { id: 'knee-below', at: [128, 252] },
  ];
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title="右膝を内側から見た図（左が膝の前）"
      cap={['← 前', '右膝・内側から']}
      oi={{ 'vastus-medialis': { i: att(KMM().vm, 'i', [0.62, 0.88]) } }}
      labels={labels}
      spots={spots}
      fade={{ top: 34, bottom: 40 }}
    >
      <Ctxt k={k}>
        <path className="body" d={KMD().body} />
        <path className="bone" d={KMD().femur} />
        <path className="bone-ln" d={KMD().femLn} />
        <path className="bone" d={ell(AM_TUB[0], AM_TUB[1], 6, 5)} />
        <path className="bone" d={ell(194, 208, 8, 9)} />
      </Ctxt>
      <Part k={k} id="tibia">
        <path className="bone" d={KMD().tibia} />
        <path className="bone-ln" d={KMD().tibLn} />
      </Part>
      <Part k={k} id="meniscus">
        <path className="cart" d={KMD().men} />
      </Part>
      <Ctxt k={k}>
        <path className="fat" d={KMD().fat} />
      </Ctxt>
      <Part k={k} id="soleus">
        <M g={KMM().sol} />
      </Part>
      <Part k={k} id="gastrocnemius">
        <M g={KMM().gas} />
      </Part>
      <Part k={k} id="mcl">
        <Ten c={[[194, 198], [190, 240], [184, 290], [178, 334]]} w={[18, 21, 21, 16]} cls="lig" lines={3} />
      </Part>
      <Part k={k} id="pes-anserine-bursa">
        <path className="bursa" d={ell(166, 302, 15, 10, 18)} />
      </Part>
      <Part k={k} id="semimembranosus">
        <M g={KMM().sm} />
      </Part>
      <Part k={k} id="vastus-medialis">
        <M g={KMM().vm} />
      </Part>
      {/* adductor magnus tendon: along the posterior border of VM (whose lowest fibres arise from it), in front of
          sartorius, down to the adductor tubercle */}
      <Part k={k} id="adductor-magnus">
        <Ten c={AM_TEN} w={[10, 9, 8, 7]} cls="ten" lines={2} />
      </Part>
      <Part k={k} id="rectus-femoris">
        <M g={KMM().rf} />
      </Part>
      <Part k={k} id="quadriceps-tendon">
        <path className="ten" d={sp(mx([[200, 96], [236, 98], [242, 156], [216, 160], [208, 130]]))} />
        <path className="ten-fib" d={line(mx([[210, 104], [218, 156]])) + line(mx([[222, 102], [228, 156]])) + line(mx([[232, 102], [238, 154]]))} />
      </Part>
      <Part k={k} id="patellar-tendon">
        <path className="ten" d={sp(mx([[222, 224], [238, 226], [241, 262], [241, 297], [229, 299], [227, 262]]))} />
        <path className="ten-fib" d={line(mx([[230, 232], [233, 296]])) + line(mx([[236, 232], [238, 296]]))} />
      </Part>
      <Part k={k} id="patellofemoral-cartilage">
        <path className="cart" d={KMD().cartT} />
        <path className="cart" d={KMD().cartP} />
      </Part>
      <Ctxt k={k}>
        <path className="bone-sh" d={KMD().patSh} />
      </Ctxt>
      <Part k={k} id="patella">
        <path className="bone" d={KMD().patella} />
        <path className="bone-ln" d={line(mx([[226, 166], [238, 180], [240, 204], [234, 222]]))} />
      </Part>
      <Part k={k} id="semitendinosus">
        <M g={KMM().st} />
      </Part>
      <Part k={k} id="gracilis">
        <M g={KMM().grac} />
      </Part>
      <Part k={k} id="sartorius">
        <M g={KMM().sart} />
      </Part>
      <Part k={k} id="pes-anserinus">
        <path className="ten" d={sp([[180, 292], [178, 307], [161, 321], [142, 328], [134, 320], [148, 307], [165, 296]])} />
        <path className="ten-fib" d={line([[176, 298], [158, 314], [140, 322]])} />
      </Part>
    </Frame>
  );
}

/* ───────────── back view: right knee from behind (medial side at the viewer's left) ───────────── */
const KB = once(() => ({
  body: sp([[100, -10], [98, 100], [102, 200], [100, 260], [104, 330], [110, 400], [118, 460], [246, 460], [254, 400], [258, 320], [258, 250], [254, 180], [252, 90], [250, -10]]),
  femur: sp([
    [158, -30], [158, 60], [152, 120], [140, 160], [124, 188], [116, 210], [118, 232], [128, 246], [146, 252], [164, 248], [172, 238], [176, 222],
    [184, 222], [188, 238], [196, 248], [214, 251], [232, 246], [240, 232], [242, 210], [236, 188], [220, 160], [208, 120], [202, 60], [202, -30],
  ]),
  femLn: line([[146, 190], [166, 196], [176, 214]]) + line([[214, 190], [194, 196], [184, 214]]),
  tibia: sp([
    [122, 258], [146, 253], [180, 255], [214, 253], [238, 258], [240, 270], [232, 280], [222, 296], [212, 330], [206, 380], [204, 460], [164, 460],
    [162, 380], [156, 330], [144, 300], [130, 284], [122, 270],
  ]),
  fibula: sp([[232, 276], [240, 268], [252, 270], [258, 280], [254, 294], [248, 304], [250, 330], [252, 460], [240, 460], [238, 330], [236, 304], [232, 292]]),
  menM: sp([[118, 250, 1], [130, 246], [150, 247], [168, 250, 1], [150, 254], [130, 255]]),
  menL: sp([[190, 250, 1], [210, 246], [230, 247], [242, 251, 1], [230, 255], [210, 254]]),
}));
const KBM = once(() => ({
  bf: muscle({
    r: [
      [[177, -30], [238, -30]],
      [[178, 60], [241, 60]],
      [[205, 140], [242, 142]],
      [[227, 206], [245, 206]],
      [[240, 270], [252, 270]],
    ],
    t1: 0.6,
    n: 8,
    seams: [0.45],
  }),
  sm: muscle({
    r: [
      [[118, -30], [172, -30]],
      [[118, 80], [172, 86]],
      [[120, 170], [160, 176]],
      [[123, 222], [143, 226]],
      [[124, 254], [139, 260]],
    ],
    t1: 0.8,
    n: 8,
  }),
  st: muscle({
    r: [
      [[150, -30], [183, -30]],
      [[146, 40], [178, 44]],
      [[134, 112], [154, 118]],
      [[126, 180], [134, 182]],
      [[119, 240], [125, 242]],
      [[111, 282], [115, 284]],
    ],
    t1: 0.42,
    n: 5,
  }),
  grac: muscle({
    r: [
      [[108, -30], [124, -30]],
      [[108, 100], [122, 100]],
      [[109, 180], [117, 180]],
      [[107, 240], [113, 242]],
      [[101, 282], [105, 284]],
    ],
    t1: 0.55,
    n: 3,
  }),
  sart: muscle({
    r: [
      [[97, -30], [110, -30]],
      [[98, 100], [110, 100]],
      [[100, 200], [110, 202]],
      [[98, 262], [106, 266]],
    ],
    t1: 0.86,
    n: 3,
  }),
  gasM: muscle({
    r: [
      [[146, 206], [168, 200]],
      [[121, 262], [178, 252]],
      [[116, 310], [181, 300]],
      [[115, 360], [181, 356]],
      [[124, 470], [178, 470]],
    ],
    t0: 0.06,
    n: 10,
  }),
  gasL: muscle({
    r: [
      [[193, 198], [214, 204]],
      [[182, 252], [232, 262]],
      [[181, 300], [238, 308]],
      [[181, 350], [238, 356]],
      [[184, 450], [228, 452]],
    ],
    t0: 0.06,
    n: 8,
  }),
  solM: muscle({ r: [[[113, 320], [124, 318]], [[111, 400], [126, 400]], [[115, 470], [128, 470]]], n: 2 }),
  solL: muscle({ r: [[[234, 316], [245, 320]], [[234, 400], [247, 400]], [[231, 470], [244, 470]]], n: 2 }),
  plant: muscle({ r: [[[204, 186], [216, 190]], [[198, 214], [207, 218]]], n: 3 }),
}));

function KneeBack({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'sartorius', t: '縫工筋', at: [104, 66], x: 92, y: 50, a: 'end' },
    { id: 'gracilis', t: '薄筋', at: [115, 104], x: 92, y: 92, a: 'end' },
    { id: 'semitendinosus', t: '半腱様筋', at: [144, 104], x: 92, y: 134, a: 'end' }, // below the gracilis leader
    { id: 'semimembranosus', t: '半膜様筋', at: [130, 186], x: 92, y: 180, a: 'end' },
    { id: 'gastrocnemius', t: '腓腹筋・内側頭', at: [140, 330], x: 96, y: 320, a: 'end' },
    { id: 'soleus', t: 'ヒラメ筋', at: [118, 410], x: 92, y: 404, a: 'end' },
    { id: 'biceps-femoris', t: '大腿二頭筋', at: [222, 80], x: 264, y: 64 },
    { t: '脛骨神経', at: [182, 166], x: 264, y: 146 },
    { t: '足底筋', at: [208, 200], x: 264, y: 196 },
    { id: 'fibula', t: '腓骨', at: [250, 300], x: 268, y: 286 },
    { id: 'gastrocnemius', t: '腓腹筋・外側頭', at: [212, 330], x: 264, y: 336 },
  ];
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title="右膝を後ろから見た図（左が内側、右が外側）"
      cap={['← 内側', '右膝・後ろから']}
      labels={labels}
      spots={[{ id: 'knee-outer', at: [244, 222] }]}
      fade={{ top: 34, bottom: 40 }}
    >
      <Ctxt k={k}>
        <path className="body" d={KB().body} />
        <path className="bone" d={KB().femur} />
        <path className="bone-ln" d={KB().femLn} />
      </Ctxt>
      <Part k={k} id="tibia">
        <path className="bone" d={KB().tibia} />
        <path className="bone-ln" d={line([[146, 300], [182, 286], [222, 270]])} />
      </Part>
      <Part k={k} id="fibula">
        <path className="bone" d={KB().fibula} />
      </Part>
      <Part k={k} id="soleus">
        <M g={KBM().solM} />
        <M g={KBM().solL} />
      </Part>
      <Ctxt k={k}>
        <M g={KBM().plant} ctx />
        <Ten c={[[182, -30], [182, 100], [182, 180], [182, 240], [182, 290]]} w={9} cls="nerve" lines={2} />
        <Ten c={[[188, 110], [204, 160], [222, 210], [236, 256], [244, 300]]} w={6} cls="nerve" lines={1} />
      </Ctxt>
      <Part k={k} id="semimembranosus">
        <M g={KBM().sm} />
      </Part>
      <Part k={k} id="sartorius">
        <M g={KBM().sart} />
      </Part>
      <Part k={k} id="gracilis">
        <M g={KBM().grac} />
      </Part>
      <Part k={k} id="semitendinosus">
        <M g={KBM().st} />
      </Part>
      <Part k={k} id="biceps-femoris">
        <M g={KBM().bf} />
      </Part>
      <Part k={k} id="gastrocnemius">
        <M g={KBM().gasL} />
        <M g={KBM().gasM} />
      </Part>
    </Frame>
  );
}

/* ───────────── component & registration ───────────── */

function KneeDiagram(p: RegionDiagramProps) {
  const k = useCtx(p);
  const view = p.view ?? 'front';
  switch (view) {
    case 'lateral':
      return <KneeLateral p={p} k={k} />;
    case 'medial':
      return <KneeMedial p={p} k={k} />;
    case 'back':
      return <KneeBack p={p} k={k} />;
    default:
      return <KneeFront p={p} k={k} />;
  }
}

const diagram: RegionDiagram = {
  region: 'knee',
  views: [
    { id: 'front', label: '前から' },
    { id: 'lateral', label: '外側から' },
    { id: 'medial', label: '内側から' },
    { id: 'back', label: '後ろから' },
  ],
  parts: {
    front: [
      'fibula', 'tibia', 'meniscus', 'mcl', 'gastrocnemius', 'fibularis-longus', 'tibialis-anterior', 'biceps-femoris', 'vastus-lateralis',
      'vastus-medialis', 'rectus-femoris', 'quadriceps-tendon', 'patella', 'patellar-tendon', 'iliotibial-band', 'lateral-femoral-epicondyle',
      'pes-anserine-bursa', 'sartorius', 'pes-anserinus',
    ],
    lateral: [
      'tibia', 'fibula', 'lateral-femoral-epicondyle', 'meniscus', 'gastrocnemius', 'soleus', 'fibularis-longus', 'tibialis-anterior',
      'biceps-femoris', 'vastus-lateralis', 'rectus-femoris', 'quadriceps-tendon', 'patellar-tendon', 'patellofemoral-cartilage', 'patella',
      'iliotibial-band', 'gluteus-medius', 'gluteus-maximus', 'tensor-fasciae-latae',
    ],
    medial: [
      'tibia', 'meniscus', 'soleus', 'gastrocnemius', 'mcl', 'pes-anserine-bursa', 'semimembranosus', 'adductor-magnus', 'vastus-medialis',
      'rectus-femoris', 'quadriceps-tendon', 'patellar-tendon', 'patellofemoral-cartilage', 'patella', 'semitendinosus', 'gracilis', 'sartorius',
      'pes-anserinus',
    ],
    back: ['tibia', 'fibula', 'soleus', 'semimembranosus', 'sartorius', 'gracilis', 'semitendinosus', 'biceps-femoris', 'gastrocnemius'],
  },
  // the ITB locator inset in the side view draws these; the knee figure is not where they are shown best
  insetParts: { lateral: ['gluteus-medius', 'gluteus-maximus', 'tensor-fasciae-latae'] },
  spots: {
    front: ['knee-front', 'knee-below', 'knee-outer', 'knee-inner'],
    lateral: ['knee-outer', 'knee-front', 'knee-below'],
    medial: ['knee-inner', 'knee-front', 'knee-below'],
    back: ['knee-outer'],
  },
  Component: KneeDiagram,
};
export default diagram;

