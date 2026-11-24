// Region diagram: 腰・体幹 (low back & trunk).
//   back: seen from behind — person's LEFT half (viewer's left) superficial (thoracolumbar fascia,
//         latissimus, gluteals), RIGHT half deep (erector spinae, multifidus, quadratus lumborum,
//         sacroiliac joint exposed).
//   side: cross-section at the L4/5 disc, seen from above (belly at the top): the "corset" —
//         transversus abdominis / obliques / rectus wrapping round to the thoracolumbar fascia,
//         with the disc, psoas, QL, erector spinae and multifidus.
//   front: the abdominal wall from the front — person's RIGHT half (viewer's left) superficial (external
//         oblique, rectus abdominis with its tendinous intersections; anterior rectus sheath left out),
//         LEFT half deep (external oblique removed: internal oblique, with a window onto transversus abdominis).
// Drawing kit lives in ./shoulder.tsx. All artwork is original.
import type { RegionDiagram, RegionDiagramProps } from '../types';
import {
  Ctxt,
  Frame,
  M,
  PS,
  Part,
  Rib,
  band,
  fpt,
  muscle,
  pl,
  sp,
  spinePost,
  strap,
  tube,
  useCtx,
  vertPost,
  type Ctx,
  type Field,
  type Lab,
  type P,
  type Spot,
} from './shoulder';

const W = 360;
const H = 380;
const MX = 180;
const mir = (pts: readonly P[]): P[] => pts.map((q) => (q[2] ? [2 * MX - q[0], q[1], 1] : [2 * MX - q[0], q[1]]) as unknown as P);
const PSm = (s: string) => mir(PS(s));

/* ═════════════════════════ back view ═════════════════════════ */
const LV = [80, 110, 140, 170, 200]; // L1–L5 centres
/** lumbar spinous process seen from behind: a broad, roughly rectangular plate */
const lumbSpin = (y: number) => sp(PS(`${MX - 5},${y - 3} ${MX + 5},${y - 3} ${MX + 5.5},${y + 9} ${MX + 4},${y + 16} ${MX - 4},${y + 16} ${MX - 5.5},${y + 9}`));
const ILIUM_R = PS('220,236 224,214 236,196 256,182 278,174 298,176 310,186 314,206 308,242 300,276 290,306 274,322 256,318 244,300 232,284 224,264 218,248');
const B = {
  thor: [vertPost(MX, -6, { tp: 22, sp: 18, w: 10, spW: 3.2, tpY: -6 }), vertPost(MX, 22, { tp: 22, sp: 18, w: 10, spW: 3.4, tpY: -6 }), vertPost(MX, 50, { tp: 18, sp: 16, w: 11, spW: 4.5, tpY: -5 })].join(''),
  lumb: LV.map((y, i) => vertPost(MX, y, { tp: [24, 28, 34, 30, 28][i], sp: 15, w: 13, spW: 5, tpY: i === 4 ? -6 : -3 })).join(''),
  spinous: [spinePost(MX, -6, 18, 3.2), spinePost(MX, 22, 18, 3.4), spinePost(MX, 50, 16, 4.5)].join('') + LV.map(lumbSpin).join(''),
  rib12R: sp(PS('198,46 216,52 236,62 252,76'), false),
  rib11R: sp(PS('200,18 224,24 250,36 276,54'), false),
  sacrum: sp(PS('180,216 196,217 210,221 222,228 220,248 214,268 204,290 192,306 184,312 176,312 168,306 156,290 146,268 140,248 138,228 150,221 164,217')),
  sacLn: sp(PS('180,224 180,302'), false),
  foramina: [240, 258, 276, 292]
    .map((y, i) => {
      const dx = 18 - i * 2.6;
      return `M${MX + dx - 3} ${y}a3 3.6 0 1 0 6 0a3 3.6 0 1 0-6 0ZM${MX - dx - 3} ${y}a3 3.6 0 1 0 6 0a3 3.6 0 1 0-6 0Z`;
    })
    .join(''),
  coccyx: sp(PS('176,314 184,314 186,324 182,336 178,336 174,324')),
  iliumR: sp(ILIUM_R),
  iliumL: sp(mir(ILIUM_R)),
  crestR: sp(PS('221,232 228,212 242,194 262,181 284,175 304,180'), false),
};
const SIJ = tube(PS('218,228 217,242 214,258 210,276'), [4.4, 5, 5, 4]);

const LB = {
  ql: muscle({ o: PS('288,178 262,184 238,196'), i: PS('242,68 224,66 206,70'), c: PS('268,122 246,128 222,134'), n: 10 }),
  multifidus: muscle({
    o: PS('186,66 186,96 186,126 186,156 186,186 184,218'),
    i: PS('200,116 204,146 208,176 212,208 212,248 200,294'),
    c: PS('192,92 195,122 197,152 199,182 199,222 190,262'),
    t0: 0.06,
    n: 16,
  }),
  // erector spinae: longissimus (medial column) and iliocostalis (lateral column), fusiform in the lumbar region,
  // arising below from the erector aponeurosis on the iliac crest / sacrum (drawn lateral so multifidus stays visible)
  es: muscle({
    o: PS('208,252 222,238 238,222 254,204'),
    i: PS('204,-24 218,-24 234,-24 248,-24'),
    c: PS('196,116 216,104 240,96 270,104'),
    // muscle–aponeurosis junction: fleshy fibres reach lower medially (longissimus) than laterally (iliocostalis)
    t0: [0.31, 0.2, 0.15, 0.13, 0.1],
    seams: [0.56],
    n: 16,
  }),
  // superficial (left) side
  latL: muscle({ o: PSm('212,-24 238,60 256,120 260,160'), i: PSm('270,-60 300,-40 320,-10 336,20'), c: PSm('246,-44 272,8 292,56 304,96'), n: 13 }),
  eoL: muscle({ o: PSm('262,84 290,98'), i: PSm('254,196 280,200'), c: PSm('260,140 286,150'), n: 7 }),
  gmedL: muscle({ o: PSm('230,212 252,196 274,186 294,188'), i: PSm('300,330 306,326 312,322 318,318'), c: PSm('250,260 268,250 284,244 302,246'), n: 10 }),
  gmaxL: muscle({ o: PSm('218,226 204,256 194,286 188,316 184,340'), i: PSm('290,300 298,336 304,372 310,408 314,444'), c: PSm('254,250 250,282 246,314 244,346 246,378'), t0: 0.04, n: 14 }),
};
/** Thoracolumbar fascia (posterior layer) on the superficial side: diamond-shaped aponeurosis. */
const TLF_L = sp(PSm('178,-24 212,-24 238,60 256,120 262,150 256,182 242,204 226,226 212,256 200,286 190,312 180,322'));
const TLF_HATCH = (() => {
  let d = '';
  for (let k = -10; k < 26; k++) {
    const y0 = -40 + k * 16;
    d += `M${MX} ${y0}L${MX - 130} ${y0 + 86}`; // superficial lamina (from the latissimus): down-laterally
    d += `M${MX} ${y0 + 8}L${MX - 130} ${y0 - 64}`; // deep lamina: up-laterally
  }
  return d;
})();

function BackView({ k, uid }: { k: Ctx; uid: string }) {
  return (
    <>
      <Ctxt k={k}>
        <Rib d={B.rib12R + B.rib11R + sp(mir(PS('198,46 216,52 236,62 252,76')), false) + sp(mir(PS('200,18 224,24 250,36 276,54')), false)} w={6} />
        <path className="bone" d={B.thor} />
        <path className="bone" d={B.iliumL} />
        <path className="bone" d={B.iliumR} />
        <path className="bone-ln" d={B.crestR} />
        <path className="bone" d={B.coccyx} />
      </Ctxt>
      <Part k={k} id="lumbar-spine">
        <path className="bone" d={B.lumb} />
      </Part>
      <Ctxt k={k}>
        <path className="bone" d={B.sacrum} />
        <path className="hole" d={B.foramina} />
        <path className="bone-ln" d={B.sacLn} />
      </Ctxt>
      <Part k={k} id="sacroiliac-joint">
        <path className="cart" d={SIJ} />
      </Part>
      {/* right half: deep */}
      <Part k={k} id="quadratus-lumborum">
        <M g={LB.ql} deep />
      </Part>
      <Part k={k} id="multifidus">
        <M g={LB.multifidus} />
      </Part>
      <Part k={k} id="erector-spinae">
        <M g={LB.es} />
      </Part>
      {/* left half: superficial */}
      <Part k={k} id="gluteus-medius">
        <M g={LB.gmedL} deep />
      </Part>
      <Part k={k} id="obliques">
        <M g={LB.eoL} />
      </Part>
      <Part k={k} id="thoracolumbar-fascia">
        <path className="fascia" d={TLF_L} />
        <path className="ten-fib" d={TLF_HATCH} clipPath={`url(#${uid}-tlf)`} />
      </Part>
      <Part k={k} id="latissimus-dorsi">
        <M g={LB.latL} />
      </Part>
      <Part k={k} id="gluteus-maximus">
        <M g={LB.gmaxL} />
      </Part>
      <Part k={k} id="lumbar-spine">
        <path className="bone" d={B.spinous} />
      </Part>
    </>
  );
}

const LABELS_BACK: Lab[] = [
  { id: 'lumbar-spine', t: '腰椎', at: [MX + 3, 86], x: 304, y: 50 },
  { id: 'latissimus-dorsi', t: '広背筋', at: [86, 44], x: 58, y: 48, a: 'end' },
  { id: 'thoracolumbar-fascia', t: '胸腰筋膜', at: [140, 128], x: 58, y: 116, a: 'end' },
  { id: 'obliques', t: '腹斜筋', at: [94, 160], x: 58, y: 166, a: 'end' },
  { id: 'gluteus-medius', t: '中殿筋', at: [92, 222], x: 58, y: 222, a: 'end' },
  { id: 'gluteus-maximus', t: '大殿筋', at: [122, 296], x: 58, y: 296, a: 'end' },
  { id: 'erector-spinae', t: '脊柱\n起立筋', at: [244, 110], x: 304, y: 96 },
  { id: 'quadratus-lumborum', t: '腰方形\n筋', at: [272, 150], x: 304, y: 150 },
  { id: 'multifidus', t: '多裂筋', at: [196, 230], x: 304, y: 226 },
  { id: 'sacroiliac-joint', t: '仙腸\n関節', at: [216, 250], x: 304, y: 272 },
  { t: '仙骨', at: [MX, 286], x: MX, y: 366, a: 'middle' },
];
const SPOTS_BACK: Spot[] = [{ id: 'lowback-center', at: [200, 166] }];

/* ═════════════════════════ cross-section at L4/5 (seen from above, belly up) ═════════════════════════ */
const CY = 196;
const SEC = {
  skin: sp(PS('180,106 214,108 250,118 282,138 302,166 308,198 300,232 284,258 256,276 222,284 196,282 186,276 180,280 174,276 164,282 138,284 104,276 76,258 60,232 52,198 58,166 78,138 110,118 146,108')),
  cavity: sp(PS('180,140 214,142 244,152 266,170 270,196 256,214 226,204 206,200 196,206 180,204 164,206 154,200 134,204 104,214 90,196 94,170 116,152 146,142')),
  disc: sp(PS('180,194 194,195 206,200 212,210 210,222 200,230 190,230 184,226 180,227 176,226 170,230 160,230 150,222 148,210 154,200 166,195')),
  lamellae: [0.8, 0.62].map((s) => sp(PS('180,194 194,195 206,200 212,210 210,222 200,230 190,230 184,226 180,227 176,226 170,230 160,230 150,222 148,210 154,200 166,195').map(([x, y]) => [180 + (x - 180) * s, 212 + (y - 212) * s] as P))).join(''),
  nucleus: sp(PS('180,206 188,207 192,213 188,219 180,220 172,219 168,213 172,207')),
  post: sp(PS('180,236 188,236 196,240 204,238 210,244 206,252 198,254 190,260 186,272 180,276 174,272 170,260 162,254 154,252 150,244 156,238 164,240 172,236')),
  canal: sp(PS('180,232 190,233 194,240 188,248 180,250 172,248 166,240 170,233')),
  tps: sp(PS('198,226 214,222 230,220 234,226 230,230 214,232 200,232'), false) + sp(mir(PS('198,226 214,222 230,220 234,226 230,230 214,232 200,232'))),
  facetR: sp(PS('198,238 204,236 210,242 206,248 200,246')),
};
const cauda = [
  [176, 240],
  [181, 238],
  [186, 241],
  [178, 245],
  [184, 245],
  [180, 242],
]
  .map(([x, y]) => `M${x - 1.8} ${y}a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0Z`)
  .join('');
/** an elliptical cross-section blob with a few fascicle septa */
function blob(cx: number, cy: number, rx: number, ry: number, rot = 0, squash = 0) {
  const pts: P[] = [];
  for (let j = 0; j < 14; j++) {
    const a = (j / 14) * Math.PI * 2;
    const r = 1 + squash * Math.sin(a * 2);
    const x = Math.cos(a) * rx * r;
    const y = Math.sin(a) * ry * r;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return sp(pts);
}
function septa(cx: number, cy: number, rx: number, ry: number) {
  return [
    `M${cx - rx * 0.6} ${cy - ry * 0.2}Q${cx} ${cy - ry * 0.5} ${cx + rx * 0.5} ${cy - ry * 0.1}`,
    `M${cx - rx * 0.5} ${cy + ry * 0.35}Q${cx + rx * 0.1} ${cy + ry * 0.1} ${cx + rx * 0.6} ${cy + ry * 0.4}`,
    `M${cx - rx * 0.1} ${cy - ry * 0.8}Q${cx - rx * 0.2} ${cy} ${cx + rx * 0.05} ${cy + ry * 0.8}`,
  ].join('');
}
const SM = {
  psoas: [blob(213, 208, 15, 17, 0.3, 0.04), blob(147, 208, 15, 17, -0.3, 0.04)],
  psoasSep: septa(213, 208, 15, 17) + septa(147, 208, 15, 17),
  ql: [blob(240, 230, 15, 9, 0.35), blob(120, 230, 15, 9, -0.35)],
  qlSep: septa(240, 230, 15, 9) + septa(120, 230, 15, 9),
  es: [blob(222, 258, 25, 16, 0.18, 0.05), blob(138, 258, 25, 16, -0.18, 0.05)],
  esSep: septa(222, 258, 25, 16) + septa(138, 258, 25, 16),
  mf: [blob(195, 264, 10, 12, 0.2), blob(165, 264, 10, 12, -0.2)],
  mfSep: septa(195, 264, 10, 12) + septa(165, 264, 10, 12),
  ra: [blob(197, 124, 17, 7, 0.08), blob(163, 124, 17, 7, -0.08)],
  raSep: septa(197, 124, 17, 7) + septa(163, 124, 17, 7),
};
/** abdominal wall layers (right side), as straps following the flank from the rectus sheath to the TLF */
const WALL = {
  eo: PS('222,113 250,122 278,140 296,166 302,196 296,222'),
  io: PS('218,121 246,130 272,148 288,170 292,198 284,222 264,236'),
  ta: PS('216,129 242,138 266,154 280,174 283,198 274,220 258,234'),
};
const SMW = {
  eoR: strap({ c: WALL.eo, w: [3, 4, 6, 7, 7, 6], t0: 0.18, n: 3 }),
  ioR: strap({ c: WALL.io, w: [3, 4, 5, 6, 6, 5, 4], t0: 0.16, t1: 0.9, n: 3 }),
  taR: strap({ c: WALL.ta, w: [3, 3, 4, 5, 5, 4, 3], t0: 0.16, t1: 0.78, n: 3 }),
  eoL: strap({ c: mir(WALL.eo), w: [3, 4, 6, 7, 7, 6], t0: 0.18, n: 3 }),
  ioL: strap({ c: mir(WALL.io), w: [3, 4, 5, 6, 6, 5, 4], t0: 0.16, t1: 0.9, n: 3 }),
  taL: strap({ c: mir(WALL.ta), w: [3, 3, 4, 5, 5, 4, 3], t0: 0.16, t1: 0.78, n: 3 }),
};
/** thoracolumbar fascia: posterior layer over ES/MF, middle layer between QL and ES, anterior layer before QL, meeting at the lateral raphe */
const TLF_SEC_R = [
  tube(PS('180,278 196,278 214,276 234,272 250,264 260,250 262,238'), 2.6),
  tube(PS('232,226 246,234 258,236'), 2.2),
  tube(PS('226,220 240,218 254,224 262,236'), 1.8),
].join('');
const TLF_SEC = TLF_SEC_R + [
  tube(mir(PS('180,278 196,278 214,276 234,272 250,264 260,250 262,238')), 2.6),
  tube(mir(PS('232,226 246,234 258,236')), 2.2),
  tube(mir(PS('226,220 240,218 254,224 262,236')), 1.8),
].join('');
/** rectus sheath / linea alba (aponeuroses of the three layers in front) */
const SHEATH = tube(PS('146,114 164,112 180,112 196,112 214,114'), 2.2) + tube(PS('146,133 164,134 180,135 196,134 214,133'), 2) + tube(PS('180,113 180,134'), 3);

function SectionView({ k }: { k: Ctx }) {
  return (
    <>
      <Ctxt k={k}>
        <path className="sec-skin" d={SEC.skin} />
        <path className="sec-cav" d={SEC.cavity} />
      </Ctxt>
      <Part k={k} id="rectus-abdominis">
        {SM.ra.map((d, i) => (
          <path key={i} className="mus" d={d} />
        ))}
        <path className="fib" d={SM.raSep} />
        {SM.ra.map((d, i) => (
          <path key={`o${i}`} className="ol" d={d} />
        ))}
      </Part>
      <Part k={k} id="obliques">
        <M g={SMW.eoR} flat />
        <M g={SMW.eoL} flat />
        <M g={SMW.ioR} flat />
        <M g={SMW.ioL} flat />
      </Part>
      <Part k={k} id="transversus-abdominis">
        <M g={SMW.taR} flat />
        <M g={SMW.taL} flat />
      </Part>
      <Ctxt k={k}>
        <path className="ten" d={SHEATH} />
      </Ctxt>
      <Part k={k} id="iliopsoas">
        {SM.psoas.map((d, i) => (
          <path key={i} className="mus" d={d} />
        ))}
        <path className="fib" d={SM.psoasSep} />
        {SM.psoas.map((d, i) => (
          <path key={`o${i}`} className="ol" d={d} />
        ))}
      </Part>
      <Part k={k} id="quadratus-lumborum">
        {SM.ql.map((d, i) => (
          <path key={i} className="mus" d={d} />
        ))}
        <path className="fib" d={SM.qlSep} />
        {SM.ql.map((d, i) => (
          <path key={`o${i}`} className="ol" d={d} />
        ))}
      </Part>
      <Part k={k} id="intervertebral-disc">
        <path className="cart" d={SEC.disc} />
        <path className="lamella" d={SEC.lamellae} />
        <path className="nucleus" d={SEC.nucleus} />
      </Part>
      <Part k={k} id="erector-spinae">
        {SM.es.map((d, i) => (
          <path key={i} className="mus" d={d} />
        ))}
        <path className="fib" d={SM.esSep} />
        {SM.es.map((d, i) => (
          <path key={`o${i}`} className="ol" d={d} />
        ))}
      </Part>
      <Part k={k} id="multifidus">
        {SM.mf.map((d, i) => (
          <path key={i} className="mus" d={d} />
        ))}
        <path className="fib" d={SM.mfSep} />
        {SM.mf.map((d, i) => (
          <path key={`o${i}`} className="ol" d={d} />
        ))}
      </Part>
      <Part k={k} id="thoracolumbar-fascia">
        <path className="fascia" d={TLF_SEC} />
      </Part>
      <Part k={k} id="lumbar-spine">
        <path className="ghost" d={SEC.tps} />
        <path className="bone" d={SEC.post} />
        <path className="cart" d={SEC.facetR} />
        <path className="cart" d={sp(mir(PS('198,238 204,236 210,242 206,248 200,246')))} />
      </Part>
      <Ctxt k={k}>
        <path className="sec-canal" d={SEC.canal} />
        <path className="nerve" d={cauda} />
      </Ctxt>
    </>
  );
}

/** the section is drawn in its own coordinates and scaled into the canvas */
const SEC_TF = { s: 1.13, cx: 180, cy: 196, ty: 192 };
const T = (x: number, y: number): [number, number] => [SEC_TF.cx + (x - SEC_TF.cx) * SEC_TF.s, SEC_TF.ty + (y - SEC_TF.cy) * SEC_TF.s];
const SEC_TRANSFORM = `translate(${SEC_TF.cx} ${SEC_TF.ty}) scale(${SEC_TF.s}) translate(${-SEC_TF.cx} ${-SEC_TF.cy})`;
const LABELS_SEC: Lab[] = [
  { id: 'iliopsoas', t: '大腰筋', at: T(214, 206), x: 318, y: 140 },
  { id: 'intervertebral-disc', t: '椎間板', at: T(168, 212), x: 140, y: 52, a: 'end' },
  { id: 'rectus-abdominis', t: '腹直筋', at: T(200, 122), x: 226, y: 56 },
  { id: 'obliques', t: '腹斜筋', at: T(298, 176), x: 318, y: 96 },
  { id: 'transversus-abdominis', t: '腹横筋', at: T(76, 194), x: 43, y: 104, a: 'end' },
  { t: '内臓', at: [0, 0], x: T(112, 178)[0], y: T(112, 178)[1], a: 'middle', bare: true },
  { id: 'erector-spinae', t: '脊柱起立筋', at: T(132, 258), x: 120, y: 322, a: 'end' },
  { id: 'multifidus', t: '多裂筋', at: T(163, 268), x: 150, y: 346, a: 'end' },
  { id: 'lumbar-spine', t: '腰椎', at: T(180, 272), x: 180, y: 368, a: 'middle' },
  { id: 'thoracolumbar-fascia', t: '胸腰筋膜', at: T(250, 266), x: 214, y: 346 },
  { id: 'quadratus-lumborum', t: '腰方形筋', at: T(246, 230), x: 266, y: 322 },
];
const SPOTS_SEC: Spot[] = [{ id: 'lowback-center', at: T(222, 256) }];

/* ═════════════════════════ front view: the abdominal wall ═════════════════════════ */
// Geometry is authored for the person's right half (viewer's left) and mirrored with `mir` (≈ 8.5 units per cm):
// xiphoid ≈ y 40, umbilicus y 196, pubic crest y 330.
const UMB = 196;
/** rectus abdominis: origin = pubic crest / symphysis (bottom), insertion = xiphoid and 5th–7th costal cartilages (top) */
const RA_F: Field = { o: PS('177,333 166,332 153,328'), i: PS('175,42 160,36 140,31 118,28'), c: PS('176,188 146,186 116.5,184') };
const RA_FL: Field = { o: mir(RA_F.o), i: mir(RA_F.i), c: mir(RA_F.c!) };
/** fibre parameter s where fibre u of a (top-to-bottom monotonic) field crosses height y */
function sAtY(f: Field, u: number, y: number): number {
  let a = 0;
  let b = 1;
  const down = fpt(f, u, 0)[1] > fpt(f, u, 1)[1]; // s runs upward (origin at the bottom)
  for (let j = 0; j < 22; j++) {
    const m = (a + b) / 2;
    const ym = fpt(f, u, m)[1];
    if (ym > y === down) a = m;
    else b = m;
  }
  return (a + b) / 2;
}
/** tendinous intersections: thin transverse tendon bands at [medial y, lateral y] with a slight zig-zag */
function intersections(f: Field, rows: [number, number][]): string {
  const us = [0, 0.2, 0.4, 0.6, 0.8, 1];
  return rows
    .map(([ym, yl]) => {
      const y = us.map((u, j) => ym + (yl - ym) * u + (j % 2 ? 1.6 : -1.2));
      const s0 = us.map((u, j) => sAtY(f, u, y[j] + 2.6));
      const s1 = us.map((u, j) => sAtY(f, u, y[j] - 2.6));
      return band(f, 0, 1, s0, s1, 20, 2);
    })
    .join('');
}
const RA_ROWS: [number, number][] = [
  [UMB - 2, UMB - 6],
  [136, 130],
  [86, 78],
];
const EO_A: Field = { o: PS('80,8 58,44 44,88 36,134 34,178'), i: PS('120,40 121,100 126,170 136,250 152,328') };
const EO_B: Field = { o: PS('34,178 32,210 34,240'), i: PS('152,328 108,312 66,286') };
const ABF = {
  ra: muscle({ ...RA_F, t0: 0.05, n: 9 }),
  raL: muscle({ ...RA_FL, t0: 0.05, n: 9 }),
  raInt: intersections(RA_F, RA_ROWS) + intersections(RA_FL, RA_ROWS),
  // external oblique (person's right): fleshy on the flank, aponeurotic medially (semilunar line) and
  // below the spino-umbilical line; its free lower border rolls in as the inguinal ligament
  // (drawn as two fields — rib fibres to the aponeurosis / lower fibres to the inguinal ligament and iliac crest —
  // that share one fibre; their own outlines are dropped and `eoOutline` traces the union)
  eoA: { ...muscle({ ...EO_A, t1: [0.86, 0.82, 0.78, 0.72, 0.55], n: 15 }), body: '' },
  eoB: { ...muscle({ ...EO_B, t1: [0.55, 0.63, 0.98], n: 5 }), body: '' },
  eoOutline: (() => {
    const N = 16;
    const r = (n: number) => Array.from({ length: n + 1 }, (_, j) => j / n);
    const pts = [
      ...r(N).map((s) => fpt(EO_A, 0, s)),
      ...r(N).map((u) => fpt(EO_A, u, 1)),
      ...r(N / 2).map((u) => fpt(EO_B, u, 1)),
      ...r(N).map((s) => fpt(EO_B, 1, 1 - s)),
      ...r(N / 2).map((u) => fpt(EO_B, 1 - u, 0)),
      ...r(N).map((u) => fpt(EO_A, 1 - u, 0)),
    ];
    return pl(pts, true);
  })(),
  // internal oblique (person's left, external oblique removed): fans up-medially from the iliac crest and
  // the lateral inguinal ligament to the lower ribs and the aponeurosis at the semilunar line
  io: muscle({
    o: mir(PS('34,232 44,260 62,282 92,300 124,316')),
    i: mir(PS('52,140 86,110 122,170 130,246 152,328')),
    t1: [0.98, 0.95, 0.88, 0.75, 0.55],
    n: 14,
  }),
  // transversus abdominis: horizontal fibres from the flank to its aponeurosis (seen through the window)
  ta: muscle({ o: mir(PS('34,150 34,200 38,250 52,290')), i: mir(PS('124,150 128,200 134,250 144,296')), t1: [0.85, 0.8, 0.75, 0.65], n: 12 }),
};
/** cut window in the internal oblique (person's left) that shows transversus abdominis */
const IO_WIN = sp(mir(PS('56,190,1 108,182,1 114,250,1 64,258,1')));
/** ribs 6–11 seen from the front: the bony rib slopes down-medially to its costochondral junction, the cartilage turns up to the sternum / costal margin */
const RIBS_F = [
  PS('28,0 68,12 104,22 150,18 172,12'),
  PS('28,26 64,40 98,52 130,48 158,36 172,30'),
  PS('28,54 58,68 88,80 108,72 124,60'),
  PS('30,84 54,98 76,110 90,100 106,84'),
  PS('32,114 50,126 66,136 78,130 92,116'),
  PS('32,148 46,156 56,160'),
];
const COSTAL_MARGIN = PS('172,32 152,44 132,58 116,76 102,96 90,114 80,130 70,140');
const ribsF = [...RIBS_F, COSTAL_MARGIN].map((r) => sp(r, false) + sp(mir(r), false)).join('');
const AF = {
  sternum: sp(PS('170,-20 190,-20 191,20 186,30 182,46,1 178,46,1 174,30 169,20')),
  // anterior ilium (crest → ASIS → AIIS) and pubis (superior ramus + body), both sides
  pelvis: [PS('0,244 24,248 46,258 62,272 70,284,1 66,294 60,302 56,322 52,352 44,384 0,384'), PS('94,334 120,328 146,326 162,324 175,326 175,356 162,362 148,356 126,346 100,348')]
    .map((q) => sp(q) + sp(mir(q)))
    .join(''),
  asis: sp(PS('62,280 70,276 76,284 72,292 64,292')) + sp(mir(PS('62,280 70,276 76,284 72,292 64,292'))),
  inguinal: PS('66,286 94,304 124,318 152,329'),
  linea: tube(PS('180,44 180,120 180,196 180,262 180,330'), [10, 9, 8, 4, 3]),
  symph: tube(PS('180,327 180,357'), 7.5),
};

function FrontView({ k, uid }: { k: Ctx; uid: string }) {
  return (
    <>
      <Ctxt k={k}>
        <Rib d={ribsF} w={5.5} />
        <path className="bone" d={AF.sternum} />
        <path className="bone" d={AF.pelvis} />
      </Ctxt>
      <Part k={k} id="pubic-symphysis">
        <path className="cart" d={AF.symph} />
      </Part>
      {/* person's left (viewer's right): deep — transversus through a window in the internal oblique */}
      <Part k={k} id="transversus-abdominis">
        <g clipPath={`url(#${uid}-taw)`}>
          <M g={ABF.ta} deep flat />
        </g>
      </Part>
      <Part k={k} id="obliques">
        <g mask={`url(#${uid}-iow)`}>
          <M g={ABF.io} />
        </g>
        <path className="ol" d={IO_WIN} />
      </Part>
      {/* person's right (viewer's left): superficial — external oblique */}
      <Part k={k} id="obliques">
        <path className="drop" d={ABF.eoOutline} filter={`url(#${uid}-sh)`} transform="translate(.9 1.6)" />
        <M g={ABF.eoB} flat />
        <M g={ABF.eoA} flat />
        <path className="ol" d={ABF.eoOutline} />
      </Part>
      <Ctxt k={k}>
        <path className="lig" d={tube(AF.inguinal, 3.2)} />
        <path className="lig" d={tube(mir(AF.inguinal), 3.2)} />
        <path className="ten" d={AF.linea} />
      </Ctxt>
      <Part k={k} id="rectus-abdominis">
        <M g={ABF.ra} />
        <M g={ABF.raL} />
        <path className="ten" d={ABF.raInt} />
      </Part>
      <Ctxt k={k}>
        <path className="hole" d={`M${MX - 4} ${UMB}a4 5 0 1 0 8 0a4 5 0 1 0-8 0Z`} />
      </Ctxt>
      <Part k={k} id="asis">
        <path className="bone" d={AF.asis} />
      </Part>
    </>
  );
}

const LABELS_FRONT: Lab[] = [
  { id: 'obliques', t: '外腹斜筋', at: [74, 104], x: 57, y: 84, a: 'end' },
  { t: '腱画', at: [140, 134], x: 57, y: 140, a: 'end' },
  { id: 'rectus-abdominis', t: '腹直筋', at: [146, 236], x: 57, y: 196, a: 'end' },
  { id: 'asis', t: '上前\n腸骨棘', at: [68, 286], x: 57, y: 258, a: 'end' },
  { t: '鼠径靱帯', at: [110, 312], x: 57, y: 330, a: 'end' },
  { t: '肋骨弓', at: [251, 86], x: 306, y: 70 },
  // linea alba: labelled above the umbilicus (where it is widest), away from the person's left ASIS
  { t: '白線', at: [MX + 1, 110], x: 306, y: 112 },
  { id: 'obliques', t: '内腹斜筋', at: [268, 156], x: 306, y: 150 },
  { id: 'transversus-abdominis', t: '腹横筋', at: [278, 230], x: 306, y: 224 },
  { id: 'pubic-symphysis', t: '恥骨結合', at: [MX, 344], x: MX, y: 375, a: 'middle' },
];

/* ═════════════════════════ component & export ═════════════════════════ */

const VIEWS = [
  { id: 'back', label: '後ろから' },
  { id: 'side', label: '輪切り（断面）' },
  { id: 'front', label: 'おなか側' },
];

function LowbackDiagram(p: RegionDiagramProps) {
  const k = useCtx(p);
  const view = p.view === 'side' || p.view === 'front' ? p.view : 'back';
  if (view === 'front') {
    return (
      <Frame
        k={k}
        p={p}
        w={W}
        h={H}
        title="おなかを前から見た図（右半身は表層：外腹斜筋と腹直筋。腹直筋を包む腹直筋鞘の前葉は省略。左半身は外腹斜筋を外した深層：内腹斜筋と、その窓から見える腹横筋）"
        cap={['右半身：表層', '左半身：深層']}
        labels={LABELS_FRONT}
        spots={[]}
        fade={[26, 30]}
        fadeX={[46, 46]}
        defs={(uid) => (
          <>
            <clipPath id={`${uid}-taw`}>
              <path d={IO_WIN} />
            </clipPath>
            <mask id={`${uid}-iow`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={W + 40} height={H + 40}>
              <rect x={-20} y={-20} width={W + 40} height={H + 40} fill="#fff" />
              <path d={IO_WIN} fill="#000" />
            </mask>
          </>
        )}
      >
        <FrontView k={k} uid={k.uid} />
      </Frame>
    );
  }
  if (view === 'side') {
    return (
      <Frame
        k={k}
        p={p}
        w={W}
        h={H}
        title="腰の輪切り（第4・第5腰椎の間の高さを上から見た図。上がおなか側）"
        cap={['腰の輪切り（上から見た図）', '↑ おなか側']}
        labels={LABELS_SEC}
        spots={SPOTS_SEC}
        overlay={
          <text className="cap-t" x={W - 8} y={H - 8} textAnchor="end">
            ↓ 背中側
          </text>
        }
      >
        <g transform={SEC_TRANSFORM}>
          <SectionView k={k} />
        </g>
      </Frame>
    );
  }
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title="腰を後ろから見た図（左半分は表層、右半分は筋膜を外した深層）"
      cap={['左半身：表層', '右半身：深層']}
      labels={LABELS_BACK}
      spots={SPOTS_BACK}
      fade={[22, 44]}
      fadeX={[62, 60]}
      defs={(uid) => (
        <clipPath id={`${uid}-tlf`}>
          <path d={TLF_L} />
        </clipPath>
      )}
    >
      <BackView k={k} uid={k.uid} />
    </Frame>
  );
}

const diagram: RegionDiagram = {
  region: 'lowback',
  views: VIEWS,
  parts: {
    back: [
      'erector-spinae',
      'multifidus',
      'quadratus-lumborum',
      'thoracolumbar-fascia',
      'lumbar-spine',
      'sacroiliac-joint',
      'obliques',
      'latissimus-dorsi',
      'gluteus-maximus',
      'gluteus-medius',
    ],
    side: [
      'transversus-abdominis',
      'obliques',
      'rectus-abdominis',
      'erector-spinae',
      'multifidus',
      'quadratus-lumborum',
      'thoracolumbar-fascia',
      'intervertebral-disc',
      'lumbar-spine',
      'iliopsoas',
    ],
    front: ['rectus-abdominis', 'obliques', 'transversus-abdominis', 'pubic-symphysis', 'asis'],
  },
  spots: {
    back: ['lowback-center'],
    side: ['lowback-center'],
    front: [],
  },
  Component: LowbackDiagram,
};

export default diagram;
