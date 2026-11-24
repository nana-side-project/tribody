// Region diagram: ふくらはぎ・すね (calf / shin) — the person's RIGHT lower leg, three views:
//   back 後ろから (superficial: gastrocnemius over soleus) · front 前から (shin: tibia, tibialis anterior, fibularis)
//   · deep 深層 (gastrocnemius removed, a window cut in the soleus shows tibialis posterior / FHL / FDL).
// Drawn with the lower-limb kit from ./hip (muscle sheets, tendons, labels, hotspots). Original artwork.
// Scale ≈ 10.8 units / cm: knee joint line y≈40, ankle joint y≈420, sole y≈508.
import type { RegionDiagram, RegionDiagramProps } from '../types';
import { Ctxt, Frame, HoleMask, M, Nerve, Part, Ten, ell, line, muscle, sp, useCtx, type Ctx, type Lab, type P, type Spot } from './hip';
import { FL_INSERT, FL_LAT, FlSoleInset, SOLE_INSET, soleInsetPt } from './footsole';

const W = 360;
const H = 520;

/**
 * Extra CSS for the leg/foot diagrams. The kit's injured glow (.thk-halo) duplicates a part and force-fills every
 * path; open texture strokes (fibres, tendon lines, bone lines) would then fill into stray wedges on curved
 * tendons, so they are hidden inside the glow copy. Scoped to diagrams that carry the `lf` class.
 */
export const LF_CSS = `.thk.lf .thk-halo :is(.fib, .fib-l, .ten-fib, .bone-ln, .nerve-ln, .seam, .raphe, .hi, .shade) { display: none !important; }`;
/** Props for Frame: adds the `lf` scope class. */
export const lfp = (p: RegionDiagramProps): RegionDiagramProps => ({ ...p, className: p.className ? `${p.className} lf` : 'lf' });
export const LfStyle = () => <style>{LF_CSS}</style>;

/* ═════════════ shared bones (posterior views: medial side at the viewer's left) ═════════════ */

const BB = {
  body: sp([
    [128, -30], [123, 30], [118, 90], [115, 150], [117, 205], [121, 260], [129, 316], [138, 366], [144, 404], [147, 438], [150, 468], [155, 492],
    [166, 506], [180, 509], [194, 506], [203, 494], [208, 472], [214, 452], [226, 432], [229, 412], [232, 372], [239, 322], [246, 262], [252, 196],
    [254, 140], [252, 86], [248, 30], [244, -30],
  ]),
  femur: sp([
    [152, -40], [148, -16], [138, -2], [130, 12], [129, 27], [136, 37], [150, 42], [164, 38], [172, 28], [176, 14], [184, 14], [188, 28], [196, 37],
    [210, 40], [222, 35], [229, 22], [227, 6], [218, -8], [208, -18], [206, -40],
  ]),
  femLn: line([[144, 4], [160, 10], [172, 24]]) + line([[214, 4], [200, 10], [188, 24]]),
  tibia: sp([
    [134, 50], [148, 44], [180, 47], [210, 44], [223, 49], [225, 59], [218, 69], [208, 82], [198, 104], [189, 136], [186, 180], [185, 250], [186, 320],
    [189, 366], [195, 392], [200, 406], [200, 420], [188, 424], [174, 422], [163, 424], [157, 430], [154, 440], [148, 442], [143, 434], [142, 416],
    [146, 398], [150, 372], [152, 320], [153, 250], [151, 180], [147, 138], [141, 108], [135, 86], [132, 66],
  ]),
  tibLn: line([[150, 70], [180, 64], [210, 66]]),
  fibula: sp([
    [228, 66], [235, 60], [244, 61], [249, 70], [246, 82], [240, 92], [238, 120], [236, 200], [233, 300], [229, 360], [228, 388], [230, 410], [228, 430],
    [223, 447], [216, 452], [210, 445], [208, 426], [210, 406], [214, 386], [219, 360], [223, 300], [226, 200], [229, 120], [228, 96], [225, 82],
  ]),
  talus: sp([[160, 422], [180, 419], [198, 421], [204, 432], [196, 440], [180, 442], [163, 441], [156, 432]]),
  calc: sp([[160, 440], [174, 435], [190, 436], [201, 443], [205, 460], [205, 480], [201, 494], [192, 501], [180, 503], [168, 501], [159, 494], [155, 480], [156, 458]]),
  calcLn: line([[164, 472], [180, 468], [196, 472]]),
};

/* ───────────── back view ───────────── */

const SOLEUS_B = {
  r: [
    [[148, 140], [178, 114], [208, 92], [234, 82]],
    [[127, 196], [180, 176], [238, 162]],
    [[125, 252], [180, 240], [237, 234]],
    [[132, 304], [180, 298], [229, 296]],
    [[146, 350], [180, 346], [216, 344]],
    [[162, 386], [180, 384], [198, 382]],
    [[171, 410], [180, 410], [189, 410]],
  ] as P[][],
  t1: [0.97, 0.94, 0.86, 0.93, 0.96],
  n: 14,
};

const BM = {
  gasM: muscle({
    r: [
      [[150, 6], [168, 2]],
      [[134, 44], [174, 40]],
      [[121, 96], [178, 92]],
      [[118, 148], [180, 146]],
      [[124, 198], [180.5, 196]],
      [[138, 238], [180, 232]],
      [[151, 266], [176, 258]],
      [[159, 282], [167, 278]],
    ],
    t0: 0.05,
    n: 12,
  }),
  gasL: muscle({
    r: [
      [[194, 4], [212, 8]],
      [[186, 42], [222, 48]],
      [[183, 94], [230, 100]],
      [[182, 146], [229, 152]],
      [[183, 192], [222, 198]],
      [[186, 228], [212, 232]],
      [[193, 250], [204, 252]],
    ],
    t0: 0.05,
    n: 9,
  }),
  sol: muscle(SOLEUS_B),
  fl: muscle({
    r: [
      [[236, 76], [247, 80]],
      [[240, 120], [252, 126]],
      [[241, 180], [252, 186]],
      [[238, 236], [247, 240]],
      [[234, 290], [240, 292]],
      [[229, 340], [235, 342]],
      [[224, 386], [230, 388]],
      [[219, 422], [226, 426]],
      [[215, 448], [222, 454]],
    ],
    t1: 0.42,
    n: 4,
  }),
  fb: muscle({
    r: [
      [[232, 210], [243, 214]],
      [[227, 268], [243, 274]],
      [[223, 326], [239, 332]],
      [[219, 374], [233, 380]],
      [[214, 410], [226, 416]],
      [[211, 438], [220, 444]],
    ],
    t1: 0.68,
    n: 5,
  }),
  fhl: muscle({
    r: [
      [[210, 340], [226, 346]],
      [[205, 380], [224, 386]],
      [[199, 410], [216, 414]],
      [[191, 432], [202, 436]],
    ],
    t1: 0.76,
    n: 4,
  }),
};

const ACH_B: P[] = [[182, 300], [181, 340], [180, 384], [180, 424], [180, 452], [180, 474], [180, 492]];
const ACH_BW = [30, 24, 18, 15.5, 17, 24, 29];
/** gastrocnemius aponeurosis: the broad flat tendon under the two heads that narrows into the Achilles tendon */
const GAS_APO = sp([
  [146, 196], [164, 186], [182, 182], [204, 186], [218, 196], [214, 232], [204, 262], [194, 296], [188, 330], [185, 352], [181, 362, 1], [177, 352],
  [172, 330], [164, 298], [152, 262], [144, 228],
]);
const GAS_APO_LN =
  line([[160, 214], [170, 270], [178, 340]]) + line([[182, 204], [181, 280], [181, 352]]) + line([[204, 212], [194, 270], [184, 340]]);
const TIB_NERVE_TOP: P[] = [[183, -40], [182, 0], [182, 30], [182, 56]];

function CalfBack({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'gastrocnemius', t: '腓腹筋・内側頭', at: [140, 120], x: 104, y: 112, a: 'end' },
    { id: 'soleus', t: 'ヒラメ筋', at: [134, 292], x: 104, y: 286, a: 'end' },
    { id: 'achilles-tendon', t: 'アキレス腱', at: [178, 408], x: 104, y: 394, a: 'end' },
    { id: 'tibia', t: '脛骨（内果）', at: [147, 430], x: 104, y: 432, a: 'end' },
    { id: 'calcaneus', t: '踵骨', at: [166, 488], x: 104, y: 486, a: 'end' },
    { id: 'fibula', t: '腓骨（腓骨頭）', at: [242, 70], x: 266, y: 58 },
    { id: 'gastrocnemius', t: '腓腹筋・外側頭', at: [214, 130], x: 266, y: 118 },
    { id: 'fibularis-longus', t: '長腓骨筋', at: [246, 180], x: 266, y: 186 },
    { id: 'soleus', t: 'ヒラメ筋', at: [231, 262], x: 266, y: 256 },
    { id: 'fibularis-brevis', t: '短腓骨筋', at: [229, 336], x: 266, y: 330 },
    { id: 'flexor-hallucis-longus', t: '長母趾屈筋', at: [214, 386], x: 266, y: 384 },
    { id: 'fibula', t: '腓骨（外果）', at: [222, 436], x: 266, y: 440 },
  ];
  const spots: Spot[] = [
    { id: 'calf-upper', at: [150, 176] },
    { id: 'calf-lower', at: [160, 366] },
  ];
  // fibularis longus shown on its own (muscle page): add a sole inset below the heel with its insertion
  const flSolo = k.hl['fibularis-longus'] === 'selected' || k.hl['fibularis-longus'] === 'muscle';
  if (flSolo) {
    labels.push(
      { id: 'fibularis-longus', t: '長腓骨筋腱', at: soleInsetPt(FL_LAT), x: 266, y: 588 },
      { id: 'fibularis-longus', t: '停止：\n第1中足骨底\n内側楔状骨', at: soleInsetPt(FL_INSERT), x: 104, y: 600, a: 'end' },
    );
  }
  return (
    <Frame
      k={k}
      p={lfp(p)}
      w={W}
      h={flSolo ? SOLE_INSET.y + SOLE_INSET.h + 8 : H}
      title="右のふくらはぎを後ろから見た図（左が内側、右が外側）"
      cap={['← 内側', '右脚・後ろから']}
      labels={labels}
      spots={spots}
      fade={{ top: 34 }}
      defs={<LfStyle />}
      overlay={
        flSolo && (
          <FlSoleInset k={k} from={[222, 458]}>
            <text className="cap-t" x={104} y={SOLE_INSET.y + 14} textAnchor="end">
              足の裏
            </text>
            <text className="cap-t" x={104} y={SOLE_INSET.y + 31} textAnchor="end">
              （下から）
            </text>
          </FlSoleInset>
        )
      }
    >
      <Ctxt k={k}>
        <path className="body" d={BB.body} />
        <path className="bone" d={BB.femur} />
        <path className="bone-ln" d={BB.femLn} />
        <path className="bone" d={BB.talus} />
      </Ctxt>
      <Part k={k} id="tibia">
        <path className="bone" d={BB.tibia} />
        <path className="bone-ln" d={BB.tibLn} />
      </Part>
      <Part k={k} id="fibula">
        <path className="bone" d={BB.fibula} />
      </Part>
      <Part k={k} id="calcaneus">
        <path className="bone" d={BB.calc} />
        <path className="bone-ln" d={BB.calcLn} />
      </Part>
      <Ctxt k={k}>
        {/* tibialis posterior & flexor digitorum longus tendons behind the medial malleolus */}
        <Ten c={[[162, 384], [154, 406], [150, 426], [151, 446]]} w={[6, 6, 6, 4]} lines={1} />
        <Ten c={[[168, 388], [161, 408], [157, 428], [158, 450]]} w={[5, 5, 5, 3.5]} lines={1} />
        {/* hamstring tendons and tibial nerve at the back of the knee */}
        <Ten c={[[146, -40], [141, 0], [139, 30], [141, 56]]} w={[12, 11, 10, 8]} lines={2} />
        <Ten c={[[226, -40], [234, 0], [238, 34], [240, 60]]} w={[14, 12, 10, 8]} lines={2} />
        <Nerve c={TIB_NERVE_TOP} w={8} />
      </Ctxt>
      <Part k={k} id="flexor-hallucis-longus">
        <M g={BM.fhl} />
      </Part>
      <Part k={k} id="fibularis-brevis">
        <M g={BM.fb} />
      </Part>
      <Part k={k} id="fibularis-longus">
        <M g={BM.fl} />
      </Part>
      <Part k={k} id="soleus">
        <M g={BM.sol} />
      </Part>
      <Part k={k} id="achilles-tendon">
        <Ten c={ACH_B} w={ACH_BW} lines={3} />
      </Part>
      <Part k={k} id="gastrocnemius">
        <path className="ten" d={GAS_APO} />
        <path className="ten-fib" d={GAS_APO_LN} />
        <M g={BM.gasL} />
        <M g={BM.gasM} />
      </Part>
    </Frame>
  );
}

/* ───────────── deep view (gastrocnemius removed, window in soleus) ───────────── */

const DM = {
  gasMStump: muscle({ r: [[[150, 6], [168, 2]], [[134, 44], [174, 40]], [[130, 58], [175, 54]]], t0: 0.16, n: 7 }),
  gasLStump: muscle({ r: [[[194, 4], [212, 8]], [[186, 42], [222, 48]], [[186, 54], [225, 60]]], t0: 0.16, n: 6 }),
  popl: muscle({
    r: [
      [[212, 40], [220, 46]],
      [[198, 58], [208, 70]],
      [[170, 70], [186, 98]],
      [[144, 76], [152, 128]],
    ],
    t0: 0.22,
    n: 7,
  }),
  tp: muscle({
    r: [
      [[184, 92], [212, 90]],
      [[168, 150], [222, 152]],
      [[167, 220], [220, 222]],
      [[174, 280], [210, 284]],
      [[180, 324], [194, 328]],
      [[168, 370], [178, 374]],
      [[155, 408], [163, 412]],
      [[149, 432], [156, 438]],
    ],
    t1: 0.55,
    pen: 'bi',
    penD: 0.06,
    n: 13,
  }),
  fdl: muscle({
    r: [
      [[154, 136], [168, 132]],
      [[151, 200], [167, 198]],
      [[152, 270], [166, 270]],
      [[155, 330], [165, 332]],
      [[157, 378], [164, 380]],
      [[155, 416], [162, 420]],
      [[152, 440], [159, 446]],
    ],
    t1: 0.6,
    n: 6,
  }),
  fhl: muscle({
    r: [
      [[224, 156], [235, 164]],
      [[210, 220], [236, 230]],
      [[204, 290], [234, 300]],
      [[198, 350], [228, 360]],
      [[190, 396], [214, 406]],
      [[184, 424], [196, 430]],
      [[178, 448], [188, 454]],
    ],
    t1: 0.8,
    pen: 'uni',
    penD: 0.07,
    n: 12,
  }),
};
const SOL_WIN = sp([
  [152, 178], [170, 158], [194, 148], [214, 144], [226, 160], [228, 200], [225, 250], [218, 298], [205, 334], [186, 346], [167, 338], [155, 310],
  [149, 262], [148, 214],
]);
const TIB_NERVE: P[] = [[183, -40], [182, 40], [182, 100], [184, 150], [188, 210], [190, 262], [186, 316], [176, 364], [166, 402], [162, 430], [164, 452]];

function CalfDeep({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const hole = `${k.uid}-solwin`;
  const labels: Lab[] = [
    { id: 'gastrocnemius', t: '腓腹筋（切断）', at: [142, 50], x: 104, y: 56, a: 'end' },
    { t: '膝窩筋', at: [164, 90], x: 104, y: 96, a: 'end' },
    { t: '長趾屈筋', at: [160, 238], x: 104, y: 222, a: 'end' },
    { id: 'tibialis-posterior', t: '後脛骨筋', at: [192, 272], x: 104, y: 262, a: 'end' },
    { id: 'soleus', t: 'ヒラメ筋', at: [136, 318], x: 104, y: 324, a: 'end' },
    { id: 'tibia', t: '脛骨（内果）', at: [147, 430], x: 104, y: 420, a: 'end' },
    { id: 'achilles-tendon', t: 'アキレス腱', at: [178, 466], x: 104, y: 466, a: 'end' },
    { id: 'fibula', t: '腓骨（腓骨頭）', at: [242, 70], x: 266, y: 70 },
    { id: 'soleus', t: 'ヒラメ筋', at: [232, 132], x: 266, y: 130 },
    { t: '脛骨神経', at: [188, 206], x: 266, y: 186 },
    { id: 'flexor-hallucis-longus', t: '長母趾屈筋', at: [216, 262], x: 266, y: 256 },
    { id: 'fibularis-brevis', t: '短腓骨筋', at: [229, 336], x: 266, y: 336 },
    { id: 'fibula', t: '腓骨（外果）', at: [222, 436], x: 266, y: 440 },
  ];
  const spots: Spot[] = [
    { id: 'calf-lower', at: [160, 366] },
    { id: 'shin-inner', at: [148, 296] },
  ];
  return (
    <Frame
      k={k}
      p={lfp(p)}
      w={W}
      h={H}
      title="右のふくらはぎの深層を後ろから見た図（腓腹筋を取り除き、ヒラメ筋に窓を開けたところ。左が内側）"
      cap={['← 内側', '右脚・深層（腓腹筋を除く）']}
      labels={labels}
      spots={spots}
      fade={{ top: 34 }}
      defs={
        <>
          <LfStyle />
          <HoleMask id={hole} d={SOL_WIN} w={W} h={H} />
        </>
      }
    >
      <Ctxt k={k}>
        <path className="body" d={BB.body} />
        <path className="bone" d={BB.femur} />
        <path className="bone-ln" d={BB.femLn} />
        <path className="bone" d={BB.talus} />
      </Ctxt>
      <Part k={k} id="tibia">
        <path className="bone" d={BB.tibia} />
        <path className="bone-ln" d={BB.tibLn} />
      </Part>
      <Part k={k} id="fibula">
        <path className="bone" d={BB.fibula} />
      </Part>
      <Part k={k} id="calcaneus">
        <path className="bone" d={BB.calc} />
        <path className="bone-ln" d={BB.calcLn} />
      </Part>
      <Part k={k} id="tibialis-posterior">
        <M g={DM.tp} />
      </Part>
      <Ctxt k={k}>
        <M g={DM.fdl} ctx />
        <M g={DM.popl} ctx />
        <Ten c={[[146, -40], [141, 0], [139, 30], [141, 56]]} w={[12, 11, 10, 8]} lines={2} />
        <Ten c={[[226, -40], [234, 0], [238, 34], [240, 60]]} w={[14, 12, 10, 8]} lines={2} />
      </Ctxt>
      <Part k={k} id="flexor-hallucis-longus">
        <M g={DM.fhl} />
      </Part>
      <Part k={k} id="fibularis-brevis">
        <M g={BM.fb} />
      </Part>
      <Part k={k} id="fibularis-longus">
        <M g={BM.fl} />
      </Part>
      <Ctxt k={k}>
        <Nerve c={TIB_NERVE} w={[8, 8, 7, 7, 7, 6, 6, 6, 5, 5, 5]} />
      </Ctxt>
      <Part k={k} id="soleus">
        <g mask={`url(#${hole})`}>
          <M g={BM.sol} />
        </g>
        <path className="rimc" d={SOL_WIN} />
        <path className="rim" d={SOL_WIN} />
      </Part>
      <Part k={k} id="achilles-tendon">
        <Ten c={ACH_B.slice(1)} w={[6, 16, 15.5, 17, 24, 29]} lines={3} />
      </Part>
      <Part k={k} id="gastrocnemius">
        <M g={DM.gasMStump} />
        <M g={DM.gasLStump} />
        <path className="cutf" d={ell(152.5, 56, 22.5, 4, -5)} />
        <path className="cutf" d={ell(205.5, 57, 19.5, 4, 8)} />
      </Part>
    </Frame>
  );
}

/* ───────────── front view: right shin from the front (lateral side at the viewer's left) ───────────── */

const FB = {
  body: sp([
    [118, -30], [116, 30], [112, 90], [108, 160], [108, 230], [113, 300], [119, 360], [122, 400], [121, 430], [120, 462], [112, 500], [106, 540],
    [236, 540], [232, 500], [226, 466], [224, 430], [224, 400], [226, 370], [230, 320], [236, 270], [242, 210], [244, 150], [244, 90], [240, 30], [238, -30],
  ]),
  femur: sp([
    [150, -40], [146, -16], [132, 0], [124, 16], [124, 30], [132, 40], [152, 44], [172, 40], [180, 30], [188, 40], [208, 44], [226, 40], [234, 30],
    [234, 14], [226, 0], [214, -16], [210, -40],
  ]),
  tibia: sp([
    [131, 52], [146, 45], [180, 48], [212, 45], [227, 51], [228, 62], [220, 72], [210, 84], [203, 110], [200, 160], [200, 250], [202, 320], [205, 370],
    [210, 398], [216, 412], [220, 428], [215, 442], [207, 442], [201, 426], [186, 421], [168, 423], [158, 418], [161, 398], [166, 370], [170, 320],
    [170, 250], [171, 180], [170, 130], [163, 100], [150, 86], [138, 76], [130, 64],
  ]),
  tuber: line([[168, 70], [170, 84], [178, 93], [188, 90], [194, 78]]),
  crest: line([[180, 92], [174, 130], [172, 190], [173, 260], [176, 320], [184, 370]]),
  /** subtle shading: the broad antero-medial surface turns away towards the medial border */
  tibSh: sp([[190, 120], [198, 116], [200, 170], [200, 260], [202, 330], [205, 372], [196, 372], [192, 320], [190, 250], [189, 170]]),
  fibula: sp([
    [118, 70], [126, 62], [136, 64], [140, 74], [136, 86], [133, 96], [132, 160], [133, 260], [136, 340], [140, 380], [146, 404], [148, 426], [144, 446],
    [136, 454], [128, 450], [123, 432], [122, 408], [124, 380], [124, 340], [122, 260], [121, 160], [121, 96], [117, 84],
  ]),
  malL: sp([[125, 372], [133, 366], [139, 384], [145, 404], [147, 426], [143, 446], [136, 453], [128, 449], [123, 432], [122, 408], [123, 388]]),
  patella: sp([[160, -40], [182, -46], [200, -38], [204, -18], [196, 0], [182, 8, 1], [168, 0], [158, -18]]),
};
const FM = {
  ta: muscle({
    r: [
      [[146, 52], [170, 58]],
      [[142, 110], [173, 112]],
      [[141, 180], [171.5, 180]],
      [[146, 250], [172.5, 250]],
      [[156, 310], [174, 312]],
      [[168, 360], [180, 362]],
      [[178, 400], [188, 402]],
      [[188, 436], [198, 438]],
      [[195, 462], [204, 466]],
      [[198, 478], [206, 482]],
    ],
    t1: [0.47, 0.45, 0.42],
    n: 10,
  }),
  edl: muscle({
    r: [
      [[128, 64], [146, 60]],
      [[125, 120], [142, 118]],
      [[125, 200], [141.5, 198]],
      [[128, 270], [146.5, 268]],
      [[137, 330], [150, 330]],
      [[146, 380], [155, 382]],
      [[151, 420], [159, 422]],
      [[152, 456], [162, 458]],
      [[146, 500], [162, 502]],
      [[138, 536], [160, 538]],
    ],
    t1: 0.52,
    n: 6,
  }),
  ehl: muscle({
    r: [
      [[144, 220], [148, 222]],
      [[146, 280], [155, 282]],
      [[155, 330], [162, 332]],
      [[163, 380], [169, 382]],
      [[168, 420], [174, 422]],
      [[172, 456], [178, 458]],
      [[175, 500], [181, 502]],
      [[177, 536], [183, 538]],
    ],
    t1: 0.38,
    n: 3,
  }),
  fl: muscle({
    r: [
      [[114, 70], [128, 72]],
      [[110, 120], [126, 122]],
      [[109.5, 190], [125, 192]],
      [[113, 250], [127, 250]],
      [[118, 300], [124, 300]],
      [[121, 350], [125, 350]],
      [[123, 392], [127, 394]],
    ],
    t1: 0.52,
    n: 5,
  }),
  fb: muscle({
    r: [
      [[115, 200], [125, 198]],
      [[114, 260], [128, 258]],
      [[117, 320], [131, 318]],
      [[121, 366], [131, 366]],
      [[124, 398], [130, 400]],
    ],
    t1: 0.8,
    n: 5,
  }),
  gas: muscle({
    r: [
      [[202, 52], [214, 48]],
      [[201, 90], [232, 84]],
      [[201, 140], [240, 132]],
      [[201, 200], [238, 196]],
      [[204, 248], [228, 248]],
      [[212, 280], [218, 282]],
    ],
    t0: 0.04,
    n: 8,
  }),
  sol: muscle({
    r: [
      [[198, 150], [214, 146]],
      [[198, 210], [228, 206]],
      [[199, 280], [231, 276]],
      [[201, 340], [226, 340]],
      [[205, 390], [218, 392]],
      [[209, 424], [213, 426]],
    ],
    t1: 0.95,
    n: 7,
  }),
};
const MTB_F: P[] = [[200, 160], [200, 230], [200.5, 290], [202.5, 345], [206.5, 392]];

function CalfFront({ p, k }: { p: RegionDiagramProps; k: Ctx }) {
  const labels: Lab[] = [
    { id: 'fibula', t: '腓骨（腓骨頭）', at: [127, 72], x: 100, y: 62, a: 'end' },
    { id: 'fibularis-longus', t: '長腓骨筋', at: [117, 150], x: 100, y: 140, a: 'end' },
    { t: '長趾伸筋', at: [133, 200], x: 100, y: 198, a: 'end' },
    { id: 'tibialis-anterior', t: '前脛骨筋', at: [157, 236], x: 100, y: 252, a: 'end' },
    { id: 'fibularis-brevis', t: '短腓骨筋', at: [123, 330], x: 100, y: 322, a: 'end' },
    { id: 'fibula', t: '腓骨（外果）', at: [134, 428], x: 100, y: 428, a: 'end' },
    { t: '膝蓋腱', at: [181, 40], x: 258, y: 34 },
    { id: 'tibia', t: '脛骨', at: [190, 130], x: 258, y: 100 },
    { id: 'gastrocnemius', t: '腓腹筋', at: [226, 156], x: 258, y: 158 },
    { id: 'soleus', t: 'ヒラメ筋', at: [216, 300], x: 258, y: 290 },
    { id: 'medial-tibial-border', t: '脛骨内側縁', at: [202.5, 368], x: 258, y: 356 },
    { id: 'tibialis-anterior', t: '前脛骨筋腱', at: [184, 404], x: 258, y: 394 },
    { id: 'tibia', t: '脛骨（内果）', at: [213, 432], x: 258, y: 434 },
  ];
  const spots: Spot[] = [{ id: 'shin-inner', at: [201, 316] }];
  return (
    <Frame
      k={k}
      p={lfp(p)}
      w={W}
      h={H}
      title="右のすねを前から見た図（左が外側、右が内側）"
      cap={['右脚・前から', '内側 →']}
      labels={labels}
      spots={spots}
      fade={{ top: 34, bottom: 60 }}
      defs={<LfStyle />}
    >
      <Ctxt k={k}>
        <path className="body" d={FB.body} />
        <path className="bone" d={FB.femur} />
      </Ctxt>
      <Part k={k} id="fibula">
        <path className="bone" d={FB.fibula} />
      </Part>
      <Part k={k} id="soleus">
        <M g={FM.sol} />
      </Part>
      <Part k={k} id="gastrocnemius">
        <M g={FM.gas} />
      </Part>
      <Part k={k} id="tibia">
        <path className="bone" d={FB.tibia} />
        <path className="bone-sh" d={FB.tibSh} />
        <path className="bone-ln" d={FB.tuber} />
        <path className="bone-ln" d={FB.crest} />
      </Part>
      <Part k={k} id="medial-tibial-border">
        <Ten c={MTB_F} w={[5, 8, 9, 9, 7]} cls="fascia-t" lines={1} />
      </Part>
      <Part k={k} id="fibularis-brevis">
        <M g={FM.fb} />
      </Part>
      <Part k={k} id="fibularis-longus">
        <M g={FM.fl} />
      </Part>
      <Part k={k} id="fibula">
        <path className="bone" d={FB.malL} />
        <path className="bone-ln" d={line([[128, 392], [136, 410], [138, 432]])} />
      </Part>
      <Ctxt k={k}>
        <M g={FM.edl} ctx />
        <M g={FM.ehl} ctx />
      </Ctxt>
      <Part k={k} id="tibialis-anterior">
        <M g={FM.ta} />
      </Part>
      <Ctxt k={k}>
        {/* patellar tendon & patella */}
        <Ten c={[[182, -6], [181, 30], [180, 64]]} w={[24, 20, 17]} lines={3} />
        <path className="bone" d={FB.patella} />
      </Ctxt>
    </Frame>
  );
}

/* ───────────── component & registration ───────────── */

function CalfDiagram(p: RegionDiagramProps) {
  const k = useCtx(p);
  switch (p.view ?? 'back') {
    case 'front':
      return <CalfFront p={p} k={k} />;
    case 'deep':
      return <CalfDeep p={p} k={k} />;
    default:
      return <CalfBack p={p} k={k} />;
  }
}

const diagram: RegionDiagram = {
  region: 'calf',
  views: [
    { id: 'back', label: '後ろから' },
    { id: 'front', label: '前から' },
    { id: 'deep', label: '後ろ・深層' },
  ],
  parts: {
    back: [
      'tibia', 'fibula', 'calcaneus', 'flexor-hallucis-longus', 'fibularis-brevis', 'fibularis-longus', 'soleus', 'achilles-tendon', 'gastrocnemius',
    ],
    front: ['fibula', 'tibia', 'soleus', 'gastrocnemius', 'medial-tibial-border', 'fibularis-brevis', 'fibularis-longus', 'tibialis-anterior'],
    deep: [
      'tibia', 'fibula', 'calcaneus', 'tibialis-posterior', 'flexor-hallucis-longus', 'fibularis-brevis', 'fibularis-longus', 'soleus',
      'achilles-tendon', 'gastrocnemius',
    ],
  },
  spots: {
    back: ['calf-upper', 'calf-lower'],
    front: ['shin-inner'],
    deep: ['calf-lower', 'shin-inner'],
  },
  Component: CalfDiagram,
};
export default diagram;
