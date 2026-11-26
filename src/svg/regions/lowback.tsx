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
//   sagittal: lumbar spine and pelvis from the right side (front at the viewer's right), standing — the lumbar curve,
//         the tilt of the sacrum and pelvis, the psoas from the T12–L4 bodies in front of the hip joint to the lesser
//         trochanter (iliacus joining it), erector spinae and multifidus behind, rectus abdominis in front, gluteus
//         maximus, rectus femoris from the AIIS. No hotspots (no midline: spotSide does not apply).
// Drawing kit lives in ./shoulder.tsx. All artwork is original.
import type { RegionDiagram, RegionDiagramProps } from '../types';
import {
  Ctxt,
  Frame,
  M,
  PS,
  Part,
  Rib,
  att,
  band,
  fpt,
  lerp,
  muscle,
  pl,
  sp,
  spinePost,
  strap,
  tube,
  oiFrom,
  useCtx,
  vertPost,
  type OIMap,
  type Ctx,
  type Field,
  type Lab,
  type P,
  type Spot,
  type XY,
} from './shoulder';
import { once } from './lazy';
import { MText } from './mirror';

const W = 360;
const H = 380;
const MX = 180;
const mir = (pts: readonly P[]): P[] => pts.map((q) => (q[2] ? [2 * MX - q[0], q[1], 1] : [2 * MX - q[0], q[1]]) as unknown as P);
const PSm = (s: string) => mir(PS(s));

/* ═════════════════════════ back view ═════════════════════════ */
const LV = [80, 110, 140, 170, 200]; // L1–L5 centres
/** lumbar spinous process seen from behind: a broad, roughly rectangular plate */
const lumbSpin = (y: number) => sp(PS(`${MX - 5},${y - 3} ${MX + 5},${y - 3} ${MX + 5.5},${y + 9} ${MX + 4},${y + 16} ${MX - 4},${y + 16} ${MX - 5.5},${y + 9}`));
const ILIUM_R = once(() => PS('220,236 224,214 236,196 256,182 278,174 298,176 310,186 314,206 308,242 300,276 290,306 274,322 256,318 244,300 232,284 224,264 218,248'));
const B = once(() => ({
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
  iliumR: sp(ILIUM_R()),
  iliumL: sp(mir(ILIUM_R())),
  crestR: sp(PS('221,232 228,212 242,194 262,181 284,175 304,180'), false),
}));
const SIJ = once(() => tube(PS('218,228 217,242 214,258 210,276'), [4.4, 5, 5, 4]));

const LB = once(() => ({
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
}));
/** Thoracolumbar fascia (posterior layer) on the superficial side: diamond-shaped aponeurosis. */
const TLF_L = once(() => sp(PSm('178,-24 212,-24 238,60 256,120 262,150 256,182 242,204 226,226 212,256 200,286 190,312 180,322')));
const TLF_HATCH = once(() => {
  let d = '';
  for (let k = -10; k < 26; k++) {
    const y0 = -40 + k * 16;
    d += `M${MX} ${y0}L${MX - 130} ${y0 + 86}`; // superficial lamina (from the latissimus): down-laterally
    d += `M${MX} ${y0 + 8}L${MX - 130} ${y0 - 64}`; // deep lamina: up-laterally
  }
  return d;
});

function BackView({ k, uid }: { k: Ctx; uid: string }) {
  return (
    <>
      <Ctxt k={k}>
        <Rib d={B().rib12R + B().rib11R + sp(mir(PS('198,46 216,52 236,62 252,76')), false) + sp(mir(PS('200,18 224,24 250,36 276,54')), false)} w={6} />
        <path className="bone" d={B().thor} />
        <path className="bone" d={B().iliumL} />
        <path className="bone" d={B().iliumR} />
        <path className="bone-ln" d={B().crestR} />
        <path className="bone" d={B().coccyx} />
      </Ctxt>
      <Part k={k} id="lumbar-spine">
        <path className="bone" d={B().lumb} />
      </Part>
      <Ctxt k={k}>
        <path className="bone" d={B().sacrum} />
        <path className="hole" d={B().foramina} />
        <path className="bone-ln" d={B().sacLn} />
      </Ctxt>
      <Part k={k} id="sacroiliac-joint">
        <path className="cart" d={SIJ()} />
      </Part>
      {/* right half: deep */}
      <Part k={k} id="quadratus-lumborum">
        <M g={LB().ql} deep />
      </Part>
      <Part k={k} id="multifidus">
        <M g={LB().multifidus} />
      </Part>
      <Part k={k} id="erector-spinae">
        <M g={LB().es} />
      </Part>
      {/* left half: superficial */}
      <Part k={k} id="gluteus-medius">
        <M g={LB().gmedL} deep />
      </Part>
      <Part k={k} id="obliques">
        <M g={LB().eoL} />
      </Part>
      <Part k={k} id="thoracolumbar-fascia">
        <path className="fascia" d={TLF_L()} />
        <path className="ten-fib" d={TLF_HATCH()} clipPath={`url(#${uid}-tlf)`} />
      </Part>
      <Part k={k} id="latissimus-dorsi">
        <M g={LB().latL} />
      </Part>
      <Part k={k} id="gluteus-maximus">
        <M g={LB().gmaxL} />
      </Part>
      <Part k={k} id="lumbar-spine">
        <path className="bone" d={B().spinous} />
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
const SEC = once(() => ({
  skin: sp(PS('180,106 214,108 250,118 282,138 302,166 308,198 300,232 284,258 256,276 222,284 196,282 186,276 180,280 174,276 164,282 138,284 104,276 76,258 60,232 52,198 58,166 78,138 110,118 146,108')),
  cavity: sp(PS('180,140 214,142 244,152 266,170 270,196 256,214 226,204 206,200 196,206 180,204 164,206 154,200 134,204 104,214 90,196 94,170 116,152 146,142')),
  disc: sp(PS('180,194 194,195 206,200 212,210 210,222 200,230 190,230 184,226 180,227 176,226 170,230 160,230 150,222 148,210 154,200 166,195')),
  lamellae: [0.8, 0.62].map((s) => sp(PS('180,194 194,195 206,200 212,210 210,222 200,230 190,230 184,226 180,227 176,226 170,230 160,230 150,222 148,210 154,200 166,195').map(([x, y]) => [180 + (x - 180) * s, 212 + (y - 212) * s] as P))).join(''),
  nucleus: sp(PS('180,206 188,207 192,213 188,219 180,220 172,219 168,213 172,207')),
  post: sp(PS('180,236 188,236 196,240 204,238 210,244 206,252 198,254 190,260 186,272 180,276 174,272 170,260 162,254 154,252 150,244 156,238 164,240 172,236')),
  canal: sp(PS('180,232 190,233 194,240 188,248 180,250 172,248 166,240 170,233')),
  tps: sp(PS('198,226 214,222 230,220 234,226 230,230 214,232 200,232'), false) + sp(mir(PS('198,226 214,222 230,220 234,226 230,230 214,232 200,232'))),
  facetR: sp(PS('198,238 204,236 210,242 206,248 200,246')),
}));
const cauda = once(() => [
  [176, 240],
  [181, 238],
  [186, 241],
  [178, 245],
  [184, 245],
  [180, 242],
]
  .map(([x, y]) => `M${x - 1.8} ${y}a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0Z`)
  .join(''));
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
const SM = once(() => ({
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
}));
/** abdominal wall layers (right side), as straps following the flank from the rectus sheath to the TLF */
const WALL = once(() => ({
  eo: PS('222,113 250,122 278,140 296,166 302,196 296,222'),
  io: PS('218,121 246,130 272,148 288,170 292,198 284,222 264,236'),
  ta: PS('216,129 242,138 266,154 280,174 283,198 274,220 258,234'),
}));
const SMW = once(() => ({
  eoR: strap({ c: WALL().eo, w: [3, 4, 6, 7, 7, 6], t0: 0.18, n: 3 }),
  ioR: strap({ c: WALL().io, w: [3, 4, 5, 6, 6, 5, 4], t0: 0.16, t1: 0.9, n: 3 }),
  taR: strap({ c: WALL().ta, w: [3, 3, 4, 5, 5, 4, 3], t0: 0.16, t1: 0.78, n: 3 }),
  eoL: strap({ c: mir(WALL().eo), w: [3, 4, 6, 7, 7, 6], t0: 0.18, n: 3 }),
  ioL: strap({ c: mir(WALL().io), w: [3, 4, 5, 6, 6, 5, 4], t0: 0.16, t1: 0.9, n: 3 }),
  taL: strap({ c: mir(WALL().ta), w: [3, 3, 4, 5, 5, 4, 3], t0: 0.16, t1: 0.78, n: 3 }),
}));
/** thoracolumbar fascia: posterior layer over ES/MF, middle layer between QL and ES, anterior layer before QL, meeting at the lateral raphe */
const TLF_SEC_R = once(() => [
  tube(PS('180,278 196,278 214,276 234,272 250,264 260,250 262,238'), 2.6),
  tube(PS('232,226 246,234 258,236'), 2.2),
  tube(PS('226,220 240,218 254,224 262,236'), 1.8),
].join(''));
const TLF_SEC = once(() => TLF_SEC_R() + [
  tube(mir(PS('180,278 196,278 214,276 234,272 250,264 260,250 262,238')), 2.6),
  tube(mir(PS('232,226 246,234 258,236')), 2.2),
  tube(mir(PS('226,220 240,218 254,224 262,236')), 1.8),
].join(''));
/** rectus sheath / linea alba (aponeuroses of the three layers in front) */
const SHEATH = once(() => tube(PS('146,114 164,112 180,112 196,112 214,114'), 2.2) + tube(PS('146,133 164,134 180,135 196,134 214,133'), 2) + tube(PS('180,113 180,134'), 3));

function SectionView({ k }: { k: Ctx }) {
  return (
    <>
      <Ctxt k={k}>
        <path className="sec-skin" d={SEC().skin} />
        <path className="sec-cav" d={SEC().cavity} />
      </Ctxt>
      <Part k={k} id="rectus-abdominis">
        {SM().ra.map((d, i) => (
          <path key={i} className="mus" d={d} />
        ))}
        <path className="fib" d={SM().raSep} />
        {SM().ra.map((d, i) => (
          <path key={`o${i}`} className="ol" d={d} />
        ))}
      </Part>
      <Part k={k} id="obliques">
        <M g={SMW().eoR} flat />
        <M g={SMW().eoL} flat />
        <M g={SMW().ioR} flat />
        <M g={SMW().ioL} flat />
      </Part>
      <Part k={k} id="transversus-abdominis">
        <M g={SMW().taR} flat />
        <M g={SMW().taL} flat />
      </Part>
      <Ctxt k={k}>
        <path className="ten" d={SHEATH()} />
      </Ctxt>
      <Part k={k} id="iliopsoas">
        {SM().psoas.map((d, i) => (
          <path key={i} className="mus" d={d} />
        ))}
        <path className="fib" d={SM().psoasSep} />
        {SM().psoas.map((d, i) => (
          <path key={`o${i}`} className="ol" d={d} />
        ))}
      </Part>
      <Part k={k} id="quadratus-lumborum">
        {SM().ql.map((d, i) => (
          <path key={i} className="mus" d={d} />
        ))}
        <path className="fib" d={SM().qlSep} />
        {SM().ql.map((d, i) => (
          <path key={`o${i}`} className="ol" d={d} />
        ))}
      </Part>
      <Part k={k} id="intervertebral-disc">
        <path className="cart" d={SEC().disc} />
        <path className="lamella" d={SEC().lamellae} />
        <path className="nucleus" d={SEC().nucleus} />
      </Part>
      <Part k={k} id="erector-spinae">
        {SM().es.map((d, i) => (
          <path key={i} className="mus" d={d} />
        ))}
        <path className="fib" d={SM().esSep} />
        {SM().es.map((d, i) => (
          <path key={`o${i}`} className="ol" d={d} />
        ))}
      </Part>
      <Part k={k} id="multifidus">
        {SM().mf.map((d, i) => (
          <path key={i} className="mus" d={d} />
        ))}
        <path className="fib" d={SM().mfSep} />
        {SM().mf.map((d, i) => (
          <path key={`o${i}`} className="ol" d={d} />
        ))}
      </Part>
      <Part k={k} id="thoracolumbar-fascia">
        <path className="fascia" d={TLF_SEC()} />
      </Part>
      <Part k={k} id="lumbar-spine">
        <path className="ghost" d={SEC().tps} />
        <path className="bone" d={SEC().post} />
        <path className="cart" d={SEC().facetR} />
        <path className="cart" d={sp(mir(PS('198,238 204,236 210,242 206,248 200,246')))} />
      </Part>
      <Ctxt k={k}>
        <path className="sec-canal" d={SEC().canal} />
        <path className="nerve" d={cauda()} />
      </Ctxt>
    </>
  );
}

/** the section is drawn in its own coordinates and scaled into the canvas */
const SEC_TF = { s: 1.13, cx: 180, cy: 196, ty: 192 };
const T = (x: number, y: number): [number, number] => [SEC_TF.cx + (x - SEC_TF.cx) * SEC_TF.s, SEC_TF.ty + (y - SEC_TF.cy) * SEC_TF.s];
const SEC_TRANSFORM = `translate(${SEC_TF.cx} ${SEC_TF.ty}) scale(${SEC_TF.s}) translate(${-SEC_TF.cx} ${-SEC_TF.cy})`;
const LABELS_SEC = once((): Lab[] => [
  { id: 'iliopsoas', t: '大腰筋', at: T(214, 206), x: 318, y: 140 },
  { id: 'intervertebral-disc', t: '椎間板', at: T(168, 212), x: 140, y: 52, a: 'end' },
  { id: 'rectus-abdominis', t: '腹直筋', at: T(200, 122), x: 226, y: 56 },
  { id: 'obliques', t: '腹斜筋', at: T(278, 140), x: 318, y: 96 }, // above the psoas leader: no crossing
  { id: 'transversus-abdominis', t: '腹横筋', at: T(76, 194), x: 43, y: 104, a: 'end' },
  { t: '内臓', at: [0, 0], x: T(112, 178)[0], y: T(112, 178)[1], a: 'middle', bare: true },
  { id: 'erector-spinae', t: '脊柱起立筋', at: T(132, 258), x: 120, y: 322, a: 'end' },
  { id: 'multifidus', t: '多裂筋', at: T(163, 268), x: 150, y: 346, a: 'end' },
  { id: 'lumbar-spine', t: '腰椎', at: T(180, 272), x: 180, y: 368, a: 'middle' },
  { id: 'thoracolumbar-fascia', t: '胸腰筋膜', at: T(234, 272), x: 214, y: 346 }, // medial to the QL leader
  { id: 'quadratus-lumborum', t: '腰方形筋', at: T(246, 230), x: 266, y: 322 },
]);
const SPOTS_SEC = once((): Spot[] => [{ id: 'lowback-center', at: T(222, 256) }]);

/* ═════════════════════════ front view: the abdominal wall ═════════════════════════ */
// Geometry is authored for the person's right half (viewer's left) and mirrored with `mir` (≈ 8.5 units per cm):
// xiphoid ≈ y 40, umbilicus y 196, pubic crest y 330.
const UMB = 196;
/** rectus abdominis: origin = pubic crest / symphysis (bottom), insertion = xiphoid and 5th–7th costal cartilages (top) */
const RA_F = once((): Field => ({ o: PS('177,333 166,332 153,328'), i: PS('175,42 160,36 140,31 118,28'), c: PS('176,188 146,186 116.5,184') }));
const RA_FL = once((): Field => ({ o: mir(RA_F().o), i: mir(RA_F().i), c: mir(RA_F().c!) }));
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
const EO_A = once((): Field => ({ o: PS('80,8 58,44 44,88 36,134 34,178'), i: PS('120,40 121,100 126,170 136,250 152,328') }));
const EO_B = once((): Field => ({ o: PS('34,178 32,210 34,240'), i: PS('152,328 108,312 66,286') }));
const ABF = once(() => ({
  ra: muscle({ ...RA_F(), t0: 0.05, n: 9 }),
  raL: muscle({ ...RA_FL(), t0: 0.05, n: 9 }),
  raInt: intersections(RA_F(), RA_ROWS) + intersections(RA_FL(), RA_ROWS),
  // external oblique (person's right): fleshy on the flank, aponeurotic medially (semilunar line) and
  // below the spino-umbilical line; its free lower border rolls in as the inguinal ligament
  // (drawn as two fields — rib fibres to the aponeurosis / lower fibres to the inguinal ligament and iliac crest —
  // that share one fibre; their own outlines are dropped and `eoOutline` traces the union)
  eoA: { ...muscle({ ...EO_A(), t1: [0.86, 0.82, 0.78, 0.72, 0.55], n: 15 }), body: '' },
  eoB: { ...muscle({ ...EO_B(), t1: [0.55, 0.63, 0.98], n: 5 }), body: '' },
  eoOutline: (() => {
    const N = 16;
    const r = (n: number) => Array.from({ length: n + 1 }, (_, j) => j / n);
    const pts = [
      ...r(N).map((s) => fpt(EO_A(), 0, s)),
      ...r(N).map((u) => fpt(EO_A(), u, 1)),
      ...r(N / 2).map((u) => fpt(EO_B(), u, 1)),
      ...r(N).map((s) => fpt(EO_B(), 1, 1 - s)),
      ...r(N / 2).map((u) => fpt(EO_B(), 1 - u, 0)),
      ...r(N).map((u) => fpt(EO_A(), 1 - u, 0)),
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
}));
/** cut window in the internal oblique (person's left) that shows transversus abdominis */
const IO_WIN = once(() => sp(mir(PS('56,190,1 108,182,1 114,250,1 64,258,1'))));
/** ribs 6–11 seen from the front: the bony rib slopes down-medially to its costochondral junction, the cartilage turns up to the sternum / costal margin */
const RIBS_F = once(() => [
  PS('28,0 68,12 104,22 150,18 172,12'),
  PS('28,26 64,40 98,52 130,48 158,36 172,30'),
  PS('28,54 58,68 88,80 108,72 124,60'),
  PS('30,84 54,98 76,110 90,100 106,84'),
  PS('32,114 50,126 66,136 78,130 92,116'),
  PS('32,148 46,156 56,160'),
]);
const COSTAL_MARGIN = once(() => PS('172,32 152,44 132,58 116,76 102,96 90,114 80,130 70,140'));
const ribsF = once(() => [...RIBS_F(), COSTAL_MARGIN()].map((r) => sp(r, false) + sp(mir(r), false)).join(''));
const AF = once(() => ({
  sternum: sp(PS('170,-20 190,-20 191,20 186,30 182,46,1 178,46,1 174,30 169,20')),
  // anterior ilium (crest → ASIS → AIIS) and pubis (superior ramus + body), both sides
  pelvis: [PS('0,244 24,248 46,258 62,272 70,284,1 66,294 60,302 56,322 52,352 44,384 0,384'), PS('94,334 120,328 146,326 162,324 175,326 175,356 162,362 148,356 126,346 100,348')]
    .map((q) => sp(q) + sp(mir(q)))
    .join(''),
  asis: sp(PS('62,280 70,276 76,284 72,292 64,292')) + sp(mir(PS('62,280 70,276 76,284 72,292 64,292'))),
  inguinal: PS('66,286 94,304 124,318 152,329'),
  linea: tube(PS('180,44 180,120 180,196 180,262 180,330'), [10, 9, 8, 4, 3]),
  symph: tube(PS('180,327 180,357'), 7.5),
}));

function FrontView({ k, uid }: { k: Ctx; uid: string }) {
  return (
    <>
      <Ctxt k={k}>
        <Rib d={ribsF()} w={5.5} />
        <path className="bone" d={AF().sternum} />
        <path className="bone" d={AF().pelvis} />
      </Ctxt>
      <Part k={k} id="pubic-symphysis">
        <path className="cart" d={AF().symph} />
      </Part>
      {/* person's left (viewer's right): deep — transversus through a window in the internal oblique */}
      <Part k={k} id="transversus-abdominis">
        <g clipPath={`url(#${uid}-taw)`}>
          <M g={ABF().ta} deep flat />
        </g>
      </Part>
      <Part k={k} id="obliques">
        <g mask={`url(#${uid}-iow)`}>
          <M g={ABF().io} />
        </g>
        <path className="ol" d={IO_WIN()} />
      </Part>
      {/* person's right (viewer's left): superficial — external oblique */}
      <Part k={k} id="obliques">
        <path className="drop" d={ABF().eoOutline} filter={`url(#${uid}-sh)`} transform="translate(.9 1.6)" />
        <M g={ABF().eoB} flat />
        <M g={ABF().eoA} flat />
        <path className="ol" d={ABF().eoOutline} />
      </Part>
      <Ctxt k={k}>
        <path className="lig" d={tube(AF().inguinal, 3.2)} />
        <path className="lig" d={tube(mir(AF().inguinal), 3.2)} />
        <path className="ten" d={AF().linea} />
      </Ctxt>
      <Part k={k} id="rectus-abdominis">
        <M g={ABF().ra} />
        <M g={ABF().raL} />
        <path className="ten" d={ABF().raInt} />
      </Part>
      <Ctxt k={k}>
        <path className="hole" d={`M${MX - 4} ${UMB}a4 5 0 1 0 8 0a4 5 0 1 0-8 0Z`} />
      </Ctxt>
      <Part k={k} id="asis">
        <path className="bone" d={AF().asis} />
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

/* ═════════════════════════ sagittal view: lumbar spine & pelvis from the right side ═════════════════════════ */
// Standing, seen from the person's right (front at the viewer's right, as the hip and neck side views). Authored in cm
// around the right hip-joint centre (x forward, y down) and drawn at 8 units / cm. Proportions from standard sagittal
// parameters of standing adults: sacral slope ≈ 40°, pelvic tilt ≈ 12° (the S1 endplate centre 11.5 cm from the hip
// axis), lumbar lordosis L1–S1 ≈ 55° with most of it at L4–S1 and its apex at L3; ASIS ≈ 4.6 cm in front of and 8.3 cm
// above the hip centre (hip-joint-centre regressions), so that the ASIS sits roughly above the pubic symphysis (anterior
// pelvic plane about vertical). Midline structures (spine, sacrum, symphysis) are drawn over the hip bone and the
// muscles are layered from the bone outwards (multifidus on the arches, erector spinae behind, psoas in front of the
// spine), so their relations read — a see-through drawing, not a literal lateral projection.
const SG = { x: 176, y: 278, s: 8 };
const cm = (x: number, y: number): XY => [SG.x + SG.s * x, SG.y + SG.s * y];
const CM = (s: string): P[] => PS(s).map((q) => (q[2] ? [...cm(q[0], q[1]), 1] : cm(q[0], q[1])) as unknown as P);
const rad = (d: number) => (d * Math.PI) / 180;
/** unit vectors of a vertebra tilted `a`° forward from vertical: forward (anterior) and up along its axis */
const fwd = (a: number): XY => [Math.cos(rad(a)), Math.sin(rad(a))];
const upw = (a: number): XY => [Math.sin(rad(a)), -Math.cos(rad(a))];
/** S1 endplate centre (cm) and its tilt: the sacral slope */
const S1C: XY = [-2.39, -11.25];
const SS = 40;

interface SegG {
  kind: 'disc' | 'body';
  name: string;
  d: number;
  h: number;
  /** tilt of the lower / upper endplate (° forward from vertical of the axis) */
  a0: number;
  a1: number;
  b: XY;
  t: XY;
}
/** Discs and bodies from the S1 endplate up to T12 (cm): depth, mid height, wedge (° anterior taller). */
const SPINE_S = once((): SegG[] => {
  const defs: [SegG['kind'], string, number, number, number][] = [
    ['disc', 'L5/S1', 3.9, 1.2, 14],
    ['body', 'L5', 3.9, 2.7, 3],
    ['disc', 'L4/5', 3.8, 1.2, 11],
    ['body', 'L4', 3.75, 2.7, 2],
    ['disc', 'L3/4', 3.7, 1.1, 11],
    ['body', 'L3', 3.65, 2.65, 1],
    ['disc', 'L2/3', 3.55, 1.0, 9],
    ['body', 'L2', 3.5, 2.6, 0],
    ['disc', 'L1/2', 3.45, 0.9, 6],
    ['body', 'L1', 3.4, 2.5, -2],
    ['disc', 'T12/L1', 3.3, 0.8, 1],
    ['body', 'T12', 3.2, 2.4, -3],
  ];
  let b = S1C;
  let a = SS;
  return defs.map(([kind, name, d, h, w]) => {
    const a1 = a - w;
    const m = (a + a1) / 2;
    const u = upw(m);
    const t: XY = [b[0] + h * u[0], b[1] + h * u[1]];
    const s: SegG = { kind, name, d, h, a0: a, a1, b, t };
    b = t;
    a = a1;
    return s;
  });
});
/** point of a segment (cm): s 0 → 1 back → front, v 0 → 1 lower → upper endplate */
function segAt(g: SegG, s: number, v: number): XY {
  const f0 = fwd(g.a0);
  const f1 = fwd(g.a1);
  const lo: XY = [g.b[0] + (s - 0.5) * g.d * f0[0], g.b[1] + (s - 0.5) * g.d * f0[1]];
  const hi: XY = [g.t[0] + (s - 0.5) * g.d * f1[0], g.t[1] + (s - 0.5) * g.d * f1[1]];
  return lerp(lo, hi, v);
}
const bodyOf = (name: string) => SPINE_S().find((g) => g.name === name)!;
/** local frame of a body (cm): u forward from its centre, v up from its centre */
function local(g: SegG) {
  const c = segAt(g, 0.5, 0.5);
  const m = (g.a0 + g.a1) / 2;
  const f = fwd(m);
  const up = upw(m);
  return (u: number, v: number): XY => [c[0] + u * f[0] + v * up[0], c[1] + u * f[1] + v * up[1]];
}
/** vertebral body outline: slightly concave walls and endplates, rounded corners */
const bodyPath = (g: SegG) =>
  sp(
    (
      [
        [0.07, 0], [0.5, 0.03], [0.93, 0], [1, 0.08], [0.975, 0.5], [1, 0.92], [0.93, 1], [0.5, 0.97], [0.07, 1], [0, 0.92], [0.02, 0.5], [0, 0.08],
      ] as const
    ).map(([s, v]) => cm(...segAt(g, s, v))),
  );
/** disc: reaches a little into the bodies (drawn over it), bulges a little front and back */
const discPath = (g: SegG) =>
  sp(([[0.03, -0.25], [0.97, -0.25], [1.035, 0.5], [0.97, 1.25], [0.03, 1.25], [-0.03, 0.5]] as const).map(([s, v]) => cm(...segAt(g, s, v))));
const nucleusPath = (g: SegG) =>
  sp(([[0.3, 0.5], [0.44, 0.2], [0.6, 0.24], [0.66, 0.5], [0.6, 0.78], [0.44, 0.8]] as const).map(([s, v]) => cm(...segAt(g, s, v))));
/**
 * Posterior arch of a lumbar vertebra (pedicle, articular processes, lamina, spinous process) in its local frame, cm from
 * the body centre: the spinous process ≈ 3 cm beyond the lamina, ≈ 9 cm from the front of the body to its tip.
 */
function archPts(g: SegG): P[] {
  const L = local(g);
  const p = -g.d / 2;
  const h = g.h / 2;
  return (
    [
      [p + 0.1, 0.78 * h], [p - 1.0, 0.8 * h], [p - 1.35, h + 0.2], [p - 1.5, h + 0.72, 1], [p - 2.05, h + 0.5], [p - 2.4, h - 0.25], [p - 2.6, 0.45 * h],
      [p - 4.8, 0.42 * h], [p - 5.5, 0.3 * h, 1], [p - 5.65, -0.4 * h], [p - 5.3, -0.95 * h, 1], [p - 4.3, -0.95 * h], [p - 3.0, -0.75 * h],
      [p - 2.75, -h - 0.35], [p - 2.45, -h - 0.85, 1], [p - 1.85, -h - 0.55], [p - 1.6, -0.3 * h], [p - 1.0, 0], [p + 0.1, 0, 1],
    ] as const
  ).map(([u, v, c]) => (c ? [...cm(...L(u, v)), 1] : cm(...L(u, v))) as unknown as P);
}
/** the spinous process alone (drawn again over the multifidus, which fills the gaps between them) */
function spinousPts(g: SegG): P[] {
  const L = local(g);
  const p = -g.d / 2;
  const h = g.h / 2;
  return (
    [
      [p - 3.2, 0.44 * h], [p - 4.8, 0.42 * h], [p - 5.5, 0.3 * h, 1], [p - 5.65, -0.4 * h], [p - 5.3, -0.95 * h, 1], [p - 4.3, -0.95 * h], [p - 3.2, -0.8 * h],
    ] as const
  ).map(([u, v, c]) => (c ? [...cm(...L(u, v)), 1] : cm(...L(u, v))) as unknown as P);
}
const LUMBAR = ['L5', 'L4', 'L3', 'L2', 'L1'];

const SAG = once(() => {
  const segs = SPINE_S();
  const bodies = segs.filter((g) => g.kind === 'body');
  const lum = LUMBAR.map(bodyOf);
  const t12 = bodyOf('T12');
  return {
    discs: segs.filter((g) => g.kind === 'disc').map(discPath),
    nuclei: segs.filter((g) => g.kind === 'disc').map(nucleusPath),
    lumbar: lum.map((g) => bodyPath(g)),
    arches: lum.map((g) => sp(archPts(g))),
    spinous: lum.map((g) => sp(spinousPts(g))).join(''),
    t12: bodyPath(t12) + sp(archPts(t12)),
    t12spinous: sp(spinousPts(t12)),
    bodies,
  };
});

/** Sacrum (S1 endplate, SAP of S1, concave pelvic surface, dorsal surface) and coccyx, cm. */
const SACRUM = once(() => ({
  bone: sp(
    CM(
      '-4.11,-12.7,1 -4.4,-12.95 -4.67,-14.13 -5.1,-14.5 -5.47,-14.42 -6.2,-12.6 -7.07,-10.92 -7.75,-9.2 -8.1,-7.8 -8.2,-6.3 -8.17,-5.15 -7.95,-3.9 -7.68,-2.97 -6.7,-1.28,1 ' +
        '-5.03,-2.19,1 -5.1,-3.28 -4.85,-4.69 -4.14,-6.17 -2.78,-7.85 -1.6,-9.0 -0.67,-9.8,1',
    ),
  ),
  // transverse ridges (fused S1–S5 bodies) and the sacral canal behind them
  ridges: [
    '-3.33,-8.36 -5.1,-10.6',
    '-4.45,-5.9 -6.3,-7.0',
    '-4.95,-4.15 -6.75,-4.4',
    '-5.08,-3.0 -6.6,-2.6',
  ]
    .map((s) => sp(CM(s), false))
    .join(''),
  canal: sp(CM('-5.1,-13.0 -5.9,-11.0 -6.7,-8.8 -7.05,-6.6 -7.1,-4.6 -6.85,-3.0'), false),
  coccyx: sp(CM('-6.7,-1.28,1 -6.15,-0.55 -5.35,0.1 -4.6,0.55 -4.0,0.66 -3.95,0.35 -4.35,-0.25 -4.75,-1.05 -5.03,-2.19,1')),
  coccyxLn: sp(CM('-5.85,-1.55 -5.15,-1.1'), false) + sp(CM('-5.1,-0.45 -4.55,-0.2'), false),
}));

/** Right hip bone seen from the outside (ilium, ischium, pubis) with the obturator foramen, cm. */
const HIPBONE = once(() => ({
  bone: sp(
    CM(
      '4.6,-8.3,1 3.6,-10.4 2.0,-12.6 -0.2,-14.4 -2.6,-15.4 -4.8,-15.55 -6.8,-14.7 -8.3,-13.0 -9.1,-11.1 -8.65,-9.9 -8.75,-8.6,1 -7.6,-7.1 -6.1,-5.8 -5.1,-4.4 ' +
        '-5.0,-2.8 -5.5,-1.3 -6.0,-0.3,1 -5.2,1.0 -4.95,2.6 -4.95,4.0 -4.5,5.6 -3.6,6.9 -2.4,7.3 -1.4,6.8 -0.3,6.1 1.2,5.3 2.6,4.8 3.7,4.5 4.6,3.7 5.15,2.1 5.25,0.6 ' +
        '4.7,-0.1 3.6,-0.6 2.75,-1.6 2.75,-2.9 3.15,-3.9 3.45,-4.8,1 3.6,-6.0 3.75,-6.9',
    ),
  ),
  obturator: sp(CM('0.0,2.4 0.9,1.4 2.4,1.05 3.6,1.4 4.15,2.3 3.7,3.5 2.5,4.05 1.0,4.0 0.1,3.4')),
  // acetabular fossa (shadow) and rim
  fossa: `M${cm(0, 0)[0] - 2.9 * SG.s} ${cm(0, 0)[1]}a${2.9 * SG.s} ${2.9 * SG.s} 0 1 0 ${5.8 * SG.s} 0a${2.9 * SG.s} ${2.9 * SG.s} 0 1 0 ${-5.8 * SG.s} 0Z`,
  // pelvic brim (arcuate line → pecten pubis), on the inner side
  brim: sp(CM('-3.4,-10.6 -1.2,-7.6 1.2,-4.9 3.0,-2.5 4.2,-0.9 5.0,0.3'), false),
  crestLn: sp(CM('3.9,-9.6 2.2,-12.0 -0.2,-13.7 -2.6,-14.7 -4.8,-14.85 -6.7,-14.0'), false),
}));
/** Proximal right femur (shaft, neck, greater trochanter, lesser trochanter behind), cm; the head is drawn by hip-joint. */
const FEMUR_S = once(() =>
  sp(
    CM(
      '-0.4,-1.3 -1.6,-1.55 -2.55,-0.9 -2.95,0.5 -2.75,2.1 -2.5,3.5 -2.55,4.4 -3.25,4.85 -3.45,5.4 -3.15,5.95 -2.45,6.35 -2.35,8.0 -2.3,10.5 -2.3,13.2 0.5,13.2 ' +
        '0.55,10.5 0.62,8.0 0.75,5.6 1.0,3.8 1.6,2.5 2.1,1.3',
    ),
  ),
);
const LT_S: XY = [-3.4, 5.35];
/** hip joint: femoral head and the cartilage of the socket (lunate surface) */
const HJ_S = once(() => ({
  head: `M${cm(0, 0)[0] - 2.35 * SG.s} ${cm(0, 0)[1]}a${2.35 * SG.s} ${2.35 * SG.s} 0 1 0 ${4.7 * SG.s} 0a${2.35 * SG.s} ${2.35 * SG.s} 0 1 0 ${-4.7 * SG.s} 0Z`,
  socket: tube(
    Array.from({ length: 13 }, (_, j) => {
      const a = rad(150 + (j / 12) * 250);
      return cm(2.62 * Math.cos(a), 2.62 * Math.sin(a));
    }),
    0.42 * SG.s,
  ),
}));

/** Muscles of the sagittal view (cm landmarks; geometry in units). */
const SGM = once(() => {
  const lum = LUMBAR.map(bodyOf);
  const t12 = bodyOf('T12');
  const behind = (g: SegG, back: number, v = 0) => cm(...local(g)(-g.d / 2 - back, v));
  // erector spinae: a long column behind the spinous processes, from its aponeurosis on the sacrum / iliac crest up
  const esC: P[] = [cm(-8.95, -9.2), ...lum.map((g) => behind(g, 5.95)), behind(t12, 5.95), behind(t12, 5.95, 3.6)];
  const es = strap({ c: esC, w: [1.9, 2.7, 3.05, 3.25, 3.3, 3.25, 3.2, 3.2].map((w) => w * SG.s), n: 9 });
  // multifidus: on the laminae and between the spinous processes, from the dorsal sacrum / mammillary processes up to
  // spinous processes two to four levels higher (fibres running up and back)
  const mam = (g: SegG) => cm(...local(g)(-g.d / 2 - 2.05, g.h / 2 + 0.35));
  const spi = (g: SegG) => cm(...local(g)(-g.d / 2 - 4.85, -g.h / 2 + 0.1));
  const [L5, L4, L3, L2, L1] = lum;
  const mo: XY[] = [cm(-7.55, -3.9), cm(-7.8, -6.6), cm(-7.1, -9.9), mam(L5), mam(L4), mam(L3), mam(L2), mam(L1)];
  const mi: XY[] = [spi(L5), cm(...local(L5)(-L5.d / 2 - 4.9, 0.35)), spi(L4), spi(L3), spi(L2), spi(L1), spi(t12), cm(...local(t12)(-t12.d / 2 - 4.6, 1.6))];
  const mf = muscle({ o: mo, i: mi, c: mo.map((q, j) => lerp(q, mi[j], 0.5)), n: 16 });
  // psoas major: along the front of the T12–L4 bodies, over the pelvic brim, in front of the hip joint, its tendon
  // turning back to the lesser trochanter
  const psoas = strap({
    c: CM('-0.5,-31.0 0.9,-28.2 1.9,-24.8 2.4,-21.0 2.05,-16.9 1.2,-13.2 0.95,-10.2 1.5,-7.1 2.35,-4.3 2.9,-1.7 3.05,0.4 2.5,2.3 1.05,3.85 -1.0,4.85 -2.9,5.3'),
    w: [1.1, 1.7, 2.2, 2.6, 2.9, 2.9, 2.6, 2.25, 1.8, 1.45, 1.2, 1.0, 0.9, 0.85, 0.75].map((w) => w * SG.s),
    t1: 0.74,
    n: 7,
  });
  // iliacus: from the iliac fossa / inner lip of the crest, converging on the psoas tendon in front of the hip
  const iliacus = muscle({
    o: CM('4.05,-9.35 2.9,-11.3 1.9,-12.5 0.9,-13.4'),
    i: CM('3.75,-1.6 3.55,-0.9 3.35,-0.2 3.1,0.5'),
    c: CM('4.3,-5.4 3.55,-6.5 2.7,-7.3 1.9,-7.9'),
    t1: 0.9,
    n: 9,
  });
  // gluteus maximus: from the posterior iliac crest, sacrum and coccyx down and forward to the iliotibial band and the
  // gluteal tuberosity; its free border is the buttock
  const gmax = muscle({
    o: CM('-9.75,-12.4 -10.4,-9.8 -11.2,-6.8 -11.8,-3.8 -11.9,-0.8 -11.2,2.2 -9.6,4.9'),
    i: CM('-1.95,-0.6 -2.35,0.9 -2.55,2.4 -2.5,3.9 -2.4,5.4 -2.35,6.9 -2.3,8.4'),
    c: CM('-6.4,-6.0 -6.9,-4.0 -7.4,-2.0 -7.7,0.4 -7.4,2.8 -6.6,5.0 -5.4,7.4'),
    n: 12,
  });
  // rectus femoris: from the AIIS (straight head), down the front of the thigh
  const rf = strap({
    c: CM('3.5,-4.8 3.8,-2.4 3.95,0.4 3.9,3.5 3.95,7.0 4.0,10.5 4.05,14.0'),
    w: [0.7, 0.75, 0.9, 1.45, 2.05, 2.35, 2.35].map((w) => w * SG.s),
    t0: 0.06,
    n: 8,
  });
  // rectus abdominis: a flat band down the front of the belly, from the ribs (above this crop) to the pubic crest
  const ra = strap({
    c: CM('4.95,0.25 5.6,-1.4 6.75,-4.6 8.05,-9.0 9.2,-14.0 9.75,-19.2 9.7,-24.2 9.15,-29.4 8.4,-34.6'),
    w: [0.62, 0.8, 0.95, 1.05, 1.1, 1.1, 1.05, 1.0, 1.0].map((w) => w * SG.s),
    t0: 0.04,
    n: 4,
  });
  return { es, mf, psoas, iliacus, gmax, rf, ra };
});
const SKIN_SAG = once(() =>
  sp(CM('-11.6,-35 -11.9,-31 -11.3,-27.5 -10.6,-24 -10.25,-20.5 -10.4,-17 -11.0,-13.5 -11.8,-9.6 -12.5,-6.0 -12.85,-2.0 -12.4,1.8 -10.8,5.0 -9.0,6.9 -8.4,9.0 -8.3,13.5'), false) +
  sp(CM('9.6,-35 10.4,-29 10.95,-23 11.0,-18 10.4,-13.0 9.3,-8.8 7.9,-5.0 6.7,-2.2 6.4,0.2 6.7,3.5 6.95,8.0 7.0,13.5'), false),
);
const ASIS_S = once(() => sp(CM('4.15,-8.75 4.75,-8.85 5.05,-8.35 4.8,-7.8 4.2,-7.85')));
/** pubic body at the symphysis (where the rectus abdominis attaches) */
const PUBIS_S = once(() => sp(CM('3.75,-0.35 4.75,-0.2 5.3,0.5 5.25,2.2 4.65,3.85 3.7,4.5 3.05,3.85 3.2,2.0 3.35,0.5')));

function SagittalView({ k }: { k: Ctx }) {
  const s = SAG();
  const m = SGM();
  return (
    <>
      <Ctxt k={k}>
        <path className="skin" d={SKIN_SAG()} />
      </Ctxt>
      <Ctxt k={k}>
        <path className="bone" d={SACRUM().bone} />
        <path className="bone-ln" d={SACRUM().ridges + SACRUM().canal} />
        <path className="bone" d={SACRUM().coccyx} />
        <path className="bone-ln" d={SACRUM().coccyxLn} />
      </Ctxt>
      <Part k={k} id="intervertebral-disc">
        {s.discs.slice(0, 5).map((d, i) => (
          <path key={i} className="cart" d={d} />
        ))}
        {s.nuclei.slice(0, 5).map((d, i) => (
          <path key={`n${i}`} className="nucleus" d={d} />
        ))}
      </Part>
      <Ctxt k={k}>
        <path className="cart" d={s.discs[5]} />
        <path className="bone" d={s.t12} />
      </Ctxt>
      <Part k={k} id="lumbar-spine">
        {s.lumbar.map((d, i) => (
          <g key={i}>
            <path className="bone" d={s.arches[i]} />
            <path className="bone" d={d} />
          </g>
        ))}
      </Part>
      <Part k={k} id="multifidus">
        <M g={m.mf} deep />
      </Part>
      <Ctxt k={k}>
        <path className="bone" d={s.t12spinous} />
      </Ctxt>
      <Part k={k} id="lumbar-spine">
        <path className="bone" d={s.spinous} />
      </Part>
      <Part k={k} id="erector-spinae">
        <M g={m.es} />
      </Part>
      {/* the right hip bone is the nearest bone: drawn see-through over the midline structures behind it */}
      <Ctxt k={k}>
        <path className="bone" d={HIPBONE().bone + HIPBONE().obturator} fillRule="evenodd" style={{ fillOpacity: 0.5 }} />
        <path className="bone-sh" d={HIPBONE().fossa} />
        <path className="bone-ln" d={HIPBONE().brim} />
      </Ctxt>
      <Part k={k} id="gluteus-maximus">
        <M g={m.gmax} />
      </Part>
      <Ctxt k={k}>
        <path className="bone" d={FEMUR_S()} />
      </Ctxt>
      <Part k={k} id="hip-joint">
        <path className="bone" d={HJ_S().head} />
        <path className="cart" d={HJ_S().socket} />
      </Part>
      <Ctxt k={k}>
        <path className="bone" d={PUBIS_S()} />
      </Ctxt>
      {/* iliopsoas over the see-through hip bone: iliacus (lining the inside of the iliac wing), then rectus femoris from
          the AIIS in front of it, then the psoas on top, so its tendon shows all the way to the lesser trochanter */}
      <Part k={k} id="iliopsoas">
        <M g={m.iliacus} deep />
      </Part>
      <Part k={k} id="rectus-femoris">
        <M g={m.rf} />
      </Part>
      <Part k={k} id="iliopsoas">
        <M g={m.psoas} />
      </Part>
      <Ctxt k={k}>
        {/* the outline of the hip bone, seen through the muscles in front of it */}
        <path className="ghost" d={HIPBONE().bone} />
      </Ctxt>
      <Part k={k} id="rectus-abdominis">
        <M g={m.ra} />
      </Part>
      <Part k={k} id="asis">
        <path className="bone" d={ASIS_S()} />
      </Part>
    </>
  );
}

const LABELS_SAG = once((): Lab[] => [
  { id: 'erector-spinae', t: '脊柱\n起立筋', at: cm(-9.6, -24), x: 62, y: 70, a: 'end' },
  { id: 'multifidus', t: '多裂筋', at: cm(-6.8, -15.5), x: 62, y: 150, a: 'end' },
  { id: 'lumbar-spine', t: '腰椎', at: cm(-2.5, -21.5), x: 62, y: 112, a: 'end' },
  { t: '仙骨', at: cm(-4.9, -7.6), x: 62, y: 214, a: 'end' },
  { id: 'gluteus-maximus', t: '大殿筋', at: cm(-10.2, 0.5), x: 62, y: 290, a: 'end' },
  { t: '小転子', at: cm(...LT_S), x: 62, y: 338, a: 'end' },
  { id: 'intervertebral-disc', t: '椎間板', at: cm(0.1, -15.8), x: 290, y: 150 },
  { id: 'rectus-abdominis', t: '腹直筋', at: cm(9.7, -21), x: 290, y: 108 },
  { id: 'iliopsoas', t: '大腰筋', at: cm(2.1, -24.6), x: 290, y: 66 },
  { id: 'iliopsoas', t: '腸骨筋', at: cm(2.85, -8.4), x: 290, y: 190 },
  { id: 'asis', t: '上前\n腸骨棘', at: cm(4.9, -8.3), x: 290, y: 220 },
  { id: 'hip-joint', t: '股関節', at: cm(1.2, -0.8), x: 290, y: 262 },
  { t: '恥骨', at: cm(4.7, 1.6), x: 290, y: 300 },
  { id: 'rectus-femoris', t: '大腿直筋', at: cm(4.4, 8), x: 290, y: 340 },
]);

/* ═════════════════════════ component & export ═════════════════════════ */

// (tab labels: with four views each fits a quarter of the 360 px phone's tab row, ≈ 5 characters — see .seg--sm)
const VIEWS = [
  { id: 'back', label: '後ろから' },
  { id: 'side', label: '輪切り' },
  { id: 'front', label: 'おなか側' },
  { id: 'sagittal', label: '横から' },
];

/**
 * 起始 / 停止 markers (muscle page). Back: quadratus lumborum (iliac crest → 12th rib and lumbar transverse
 * processes); erector spinae from its aponeurosis on the sacrum / iliac crest (it inserts above this crop); multifidus
 * from the sacrum and the mammillary processes (its sheet's lateral edge) to the spinous processes 2–4 levels up (its
 * medial edge). Front: rectus abdominis pubis → ribs / sternum; obliques — external from the ribs to its aponeurosis,
 * internal from the iliac crest / inguinal ligament up to the ribs and aponeurosis. Cross-section: transversus
 * abdominis from the thoracolumbar fascia (back) round to its aponeurosis at the rectus sheath (front).
 */
const OI_LB_BACK = once((): OIMap => ({
  ...oiFrom({ 'quadratus-lumborum': LB().ql, 'erector-spinae': LB().es }, [62, 22, 300, 336]),
  multifidus: { o: att(LB().multifidus, 'i', [0.35, 0.92]), i: att(LB().multifidus, 'o', [0.15, 0.6]) },
}));
const OI_LB_FRONT = once((): OIMap => oiFrom(
  { 'rectus-abdominis': [ABF().ra, ABF().raL], obliques: [ABF().eoA, ABF().io] },
  [40, 24, 320, 352],
));
const secPt = (q: readonly number[]) => T(q[0], q[1]);
const OI_LB_SEC = once((): OIMap => ({
  'transversus-abdominis': {
    o: [...att(SMW().taR, 'i', 0.5, 0.97), ...att(SMW().taL, 'i', 0.5, 0.97)].map(secPt),
    i: [...att(SMW().taR, 'o', 0.5, 0.03), ...att(SMW().taL, 'o', 0.5, 0.03)].map(secPt),
  },
}));

/**
 * Sagittal view: psoas from the T12–L1 bodies (iliacus from the iliac crest / fossa) to the lesser trochanter; erector
 * spinae from its aponeurosis on the sacrum (insertion above this crop); multifidus from the dorsal sacrum / mammillary
 * processes to the spinous processes; gluteus maximus from the posterior crest, sacrum and coccyx to the iliotibial band
 * and gluteal tuberosity; rectus femoris from the AIIS (insertion below the crop); rectus abdominis from the pubic crest
 * (insertion on the ribs above the crop).
 */
const OI_LB_SAG = once((): OIMap => {
  const m = SGM();
  const box = [4, 30, 356, 344] as const;
  const o = oiFrom({ 'erector-spinae': m.es, 'rectus-femoris': m.rf, 'rectus-abdominis': m.ra }, box);
  return {
    ...o,
    // psoas from the T12–L4 bodies (three dots down its origin), iliacus from the iliac crest / fossa
    iliopsoas: { o: [0, 0.14, 0.28].flatMap((t) => att(m.psoas, 'o', 0.15, t)).concat(att(m.iliacus, 'o', 0.12)), i: att(m.psoas, 'i', 0.5) },
    multifidus: { o: att(m.mf, 'o', [0.1, 0.6]), i: att(m.mf, 'i', [0.3, 0.85]) },
    'gluteus-maximus': { o: [cm(-9.6, -11.6), cm(-8.6, -6.4), cm(-6.3, -1.0)], i: att(m.gmax, 'i', [0.15, 0.7]) },
  };
});

function LowbackDiagram(p: RegionDiagramProps) {
  const k = useCtx(p);
  const view = p.view === 'side' || p.view === 'front' || p.view === 'sagittal' ? p.view : 'back';
  if (view === 'sagittal') {
    return (
      <Frame
        k={k}
        p={p}
        w={W}
        h={H}
        title="腰と骨盤を右横から見た図（立った姿勢。腰椎はゆるく前へカーブし、骨盤はやや前に傾いています。腸腰筋は腰椎から股関節の前を通り、太ももの骨の内側の小転子に付きます。筋肉は重なりがわかるように描いています）"
        cap={['← 背中側', '右横から・おなか側 →']}
        labels={LABELS_SAG()}
        spots={[]}
        fade={[28, 34]}
        oi={OI_LB_SAG()}
      >
        <SagittalView k={k} />
      </Frame>
    );
  }
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
        oi={OI_LB_FRONT()}
        defs={(uid) => (
          <>
            <clipPath id={`${uid}-taw`}>
              <path d={IO_WIN()} />
            </clipPath>
            <mask id={`${uid}-iow`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={W + 40} height={H + 40}>
              <rect x={-20} y={-20} width={W + 40} height={H + 40} fill="#fff" />
              <path d={IO_WIN()} fill="#000" />
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
        labels={LABELS_SEC()}
        spots={SPOTS_SEC()}
        spotMid={SEC_TF.cx}
        oi={OI_LB_SEC()}
        overlay={
          <MText mir={k.mir} className="cap-t" x={W - 8} y={H - 8} a="end">
            ↓ 背中側
          </MText>
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
      spotMid={MX}
      fade={[22, 44]}
      fadeX={[62, 60]}
      oi={OI_LB_BACK()}
      defs={(uid) => (
        <clipPath id={`${uid}-tlf`}>
          <path d={TLF_L()} />
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
    sagittal: [
      'lumbar-spine',
      'intervertebral-disc',
      'iliopsoas',
      'erector-spinae',
      'multifidus',
      'rectus-abdominis',
      'gluteus-maximus',
      'rectus-femoris',
      'asis',
      'hip-joint',
    ],
  },
  spots: {
    back: ['lowback-center'],
    side: ['lowback-center'],
    front: [],
    sagittal: [],
  },
  Component: LowbackDiagram,
};

export default diagram;
