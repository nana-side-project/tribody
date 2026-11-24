// Region diagram: 首・肩上部 (neck).
//   back: seen from behind — the person's LEFT half (viewer's left) superficial (trapezius),
//         RIGHT half deep (trapezius removed: levator scapulae, rhomboids, cervical spine exposed).
//   side: right side view (face to the viewer's right) — cervical lordosis, deep neck flexors on the
//         front of the vertebral bodies, levator scapulae and upper trapezius behind.
// Drawing kit + posterior shoulder layers come from ./shoulder.tsx. All artwork is original.
import type { RegionDiagram, RegionDiagramProps } from '../types';
import {
  Ctxt,
  Frame,
  M,
  PS,
  Part,
  Rib,
  ShoulderBackLayers,
  att,
  muscle,
  sp,
  spinePost,
  strap,
  tube,
  useCtx,
  vertPost,
  type OIMap,
  type Ctx,
  type Lab,
  type P,
  type Spot,
  type XY,
} from './shoulder';

const W = 360;
const H = 380;

/* ═════════════════════════ back view ═════════════════════════ */
const MX = 176; // midline
// The shoulder's posterior layers (midline 78, ≈10 u/cm, T1 at y 56) are reused at 0.75 / 0.77 scale.
const SH_R = 'matrix(0.75 0 0 0.77 117.5 114.88)';
const SH_L = 'matrix(-0.75 0 0 0.77 234.5 114.88)';
const S = (s: string, mirror = false): P[] =>
  PS(s).map((q) => {
    const x = MX + (q[0] - 78) * 0.75;
    const y = 158 + (q[1] - 56) * 0.77;
    return [mirror ? 2 * MX - x : x, y] as P;
  });
const mir = (pts: readonly P[]): P[] => pts.map((q) => [2 * MX - q[0], q[1]] as P);

const CV = [66, 81, 96, 111, 126, 141]; // C2–C7 centres
const TV = [158, 175, 192, 209, 226, 243, 260, 277, 294, 311, 328, 345, 362]; // T1…

const ribPts = (y: number, i: number) => {
  const k = Math.min(1, 0.6 + i * 0.08);
  return PS(`${MX + 22},${y - 7} ${MX + 38},${y - 4} ${MX + 38 + 26 * k},${y + 6 * k} ${MX + 38 + 52 * k},${y + 22 * k} ${MX + 38 + 74 * k},${y + 42 * k} ${MX + 38 + 86 * k},${y + 62 * k}`);
};
const NB = {
  skull: sp(PS('106,-30 246,-30 248,6 242,26 232,40 220,54,1 210,44 198,38 186,35 176,36 166,35 154,38 142,44 132,54,1 120,40 110,26 104,6')),
  skullLn: sp(PS('124,18 150,10 176,8 202,10 228,18'), false) + sp(PS('146,30 176,24 206,30'), false),
  c1: tube(PS('140,52 158,56 176,58 194,56 212,52'), [9, 7, 8, 7, 9]),
  c1tp: sp(PS('130,46 142,44 146,52 140,58 130,56')) + sp(mir(PS('130,46 142,44 146,52 140,58 130,56'))),
  cerv: CV.map((y, i) =>
    vertPost(MX, y, i === 0 ? { tp: 22, sp: 13, w: 12, tpY: -5, spW: 5.5 } : i === 5 ? { tp: 27, sp: 17, w: 11, tpY: -6, spW: 3.6 } : { tp: 23, sp: 10, w: 11, tpY: -5, spW: 3 }),
  ).join(''),
  cervSpin: CV.map((y, i) => spinePost(MX, y, i === 0 ? 13 : i === 5 ? 17 : 10, i === 0 ? 5.5 : i === 5 ? 3.6 : 3)).join(''),
  thor: TV.map((y, i) => vertPost(MX, y, { tp: 24 - i * 0.3, sp: 17, w: 9, spW: 2.8, tpY: -7 })).join(''),
  thorSpin: TV.map((y) => spinePost(MX, y, 17, 2.8)).join(''),
  ribsR: TV.slice(0, 11)
    .map((y, i) => sp(ribPts(y, i), false))
    .join(''),
  ribsL: TV.slice(0, 11)
    .map((y, i) => sp(mir(ribPts(y, i)), false))
    .join(''),
};

/** Trapezius of the right side (mirrored onto the left half, where it is drawn). */
const TRAP_R = {
  o: PS('178,20 178,52 178,96 178,140 178,175 178,226 178,294 178,345'),
  i: PS('250,162 264,168 286,180 276,189 250,196 228,202 214,207 208,210'),
  c: PS('232,100 226,130 230,160 229,171 214,188 203,214 196,250 193,277'),
};
const NMB = {
  trapL: muscle({
    o: mir(TRAP_R.o),
    i: mir(TRAP_R.i),
    c: mir(TRAP_R.c),
    t0: [0, 0.02, 0.06, 0.12, 0.14, 0.06, 0.04, 0.06],
    t1: [1, 1, 1, 1, 1, 1, 0.9, 0.82],
    n: 22,
  }),
  trapGhostR: muscle({ o: TRAP_R.o, i: TRAP_R.i, c: TRAP_R.c, n: 2 }),
  levator: muscle({
    o: PS('214,48 200,62 199,77 199,92'),
    i: PS('213,182 210,190 207,198 205,206'),
    c: PS('232,112 222,124 215,136 208,150'),
    t0: [0.08, 0.1, 0.1, 0.1],
    n: 8,
  }),
  splenius: muscle({ o: PS('176,190 176,132'), i: PS('132,52 146,40'), c: PS('126,110 160,90'), n: 8 }),
  scm: strap({ c: PS('136,48 131,74 128,98 127,120'), w: [12, 11, 9, 6], n: 4 }),
};

function BackView({ k }: { k: Ctx }) {
  return (
    <>
      <Ctxt k={k}>
        <Rib d={NB.ribsR} w={5} />
        <Rib d={NB.ribsL} w={5} />
        <path className="bone" d={NB.skull} />
        <path className="bone-ln" d={NB.skullLn} />
      </Ctxt>
      <Part k={k} id="thoracic-spine">
        <path className="bone" d={NB.thor} />
      </Part>
      <Part k={k} id="cervical-spine">
        <path className="bone" d={NB.cerv} />
        <path className="bone" d={NB.c1} />
        <path className="bone" d={NB.c1tp} />
      </Part>
      {/* right half: deep layer (trapezius removed) */}
      <g transform={SH_R}>
        <ShoulderBackLayers k={k} deep skip={['ribs', 'spine', 'levator', 'trapGhost']} />
      </g>
      <Part k={k} id="levator-scapulae">
        <M g={NMB.levator} />
      </Part>
      <Part k={k} id="trapezius">
        <path className="ghost-mus" d={NMB.trapGhostR.body} />
      </Part>
      {/* left half: superficial layer */}
      <g transform={SH_L}>
        <ShoulderBackLayers k={k} deep={false} skip={['ribs', 'spine', 'trap']} />
      </g>
      <Ctxt k={k}>
        <M g={NMB.splenius} />
        <M g={NMB.scm} />
      </Ctxt>
      <Part k={k} id="trapezius">
        <M g={NMB.trapL} />
      </Part>
      <Part k={k} id="cervical-spine">
        <path className="bone" d={NB.cervSpin} />
      </Part>
      <Part k={k} id="thoracic-spine">
        <path className="bone" d={NB.thorSpin} />
      </Part>
    </>
  );
}

const BACK_DX = -8;
const LABELS_BACK_RAW: Lab[] = [
  { t: '後頭骨', at: [150, 22], x: 92, y: 34, a: 'end' },
  { id: 'trapezius', t: '僧帽筋', at: [130, 130], x: 92, y: 100, a: 'end' },
  { id: 'cervical-spine', t: '頸椎', at: [191, 92], x: 262, y: 40 },
  { id: 'levator-scapulae', t: '肩甲挙筋', at: [221, 118], x: 262, y: 96 },
  { id: 'supraspinatus', t: '棘上筋', at: [242, 186], x: 304, y: 150 },
  { id: 'scapula', t: '肩甲骨', at: [266, 198], x: 304, y: 218 },
  { id: 'rhomboids', t: '菱形筋', at: [194, 232], x: 304, y: 266 },
  { id: 'thoracic-spine', t: '胸椎', at: [MX, 300], x: 304, y: 314 },
];
const LABELS_BACK: Lab[] = LABELS_BACK_RAW.map((l) => ({ ...l, at: [l.at[0] + BACK_DX, l.at[1]] }));
const SPOTS_BACK: Spot[] = [
  { id: 'neck-back', at: [194 + BACK_DX, 100] },
  { id: 'neck-base', at: [222 + BACK_DX, 168] },
];

/* ═════════════════════════ side view (right side, facing right) ═════════════════════════ */

/** Vertebral body centres (lateral view): C2…C7, T1…T3. */
const BODY: XY[] = [
  [214, 116],
  [219, 140],
  [222, 164],
  [222, 188],
  [219, 212],
  [213, 236],
  [205, 260],
  [196, 284],
  [186, 308],
];
const BW = [17, 17, 17, 17, 17, 17, 21, 21, 21];
const BH = [20, 14, 14, 14, 14, 14, 17, 17, 17];
const SPL = [34, 30, 30, 32, 38, 50, 52, 54, 56];
const DROP = [6, 8, 9, 10, 12, 14, 18, 22, 26];
const frame = (i: number) => {
  const a = BODY[Math.max(0, i - 1)];
  const b = BODY[Math.min(BODY.length - 1, i + 1)];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ax = (b[0] - a[0]) / len;
  const ay = (b[1] - a[1]) / len;
  // n points anterior (viewer's right)
  return { ax, ay, nx: -ay, ny: ax, at: (u: number, v: number): P => [BODY[i][0] + -ay * u + ax * v, BODY[i][1] + ax * u + ay * v] };
};
const fixN = (i: number) => {
  const f = frame(i);
  // make sure n points to +x
  if (f.nx < 0) return { ...f, nx: -f.nx, ny: -f.ny, at: (u: number, v: number): P => [BODY[i][0] + f.ay * u + f.ax * v, BODY[i][1] - f.ax * u + f.ay * v] };
  return f;
};
function roundBox(i: number, w: number, h: number, du = 0, dv = 0): string {
  const f = fixN(i);
  const r = Math.min(w, h) * 0.3;
  const q = (u: number, v: number) => f.at(u + du, v + dv);
  return sp([q(-w / 2 + r, -h / 2), q(w / 2 - r, -h / 2), q(w / 2, -h / 2 + r), q(w / 2, h / 2 - r), q(w / 2 - r, h / 2), q(-w / 2 + r, h / 2), q(-w / 2, h / 2 - r), q(-w / 2, -h / 2 + r)]);
}
const LAT = (() => {
  const bodies: string[] = [];
  const discs: string[] = [];
  const post: string[] = [];
  const pillars: string[] = [];
  BODY.forEach((_, i) => {
    const w = BW[i];
    const h = BH[i];
    const f = fixN(i);
    bodies.push(roundBox(i, w, h));
    if (i < BODY.length - 1) {
      const gap = (BH[i] + BH[i + 1]) / 2;
      const mid = f.at(0, gap / 2 + 0.5);
      const g = fixN(i);
      const dw = (w + BW[i + 1]) / 4;
      const dh = Math.max(2.6, (Math.hypot(BODY[i + 1][0] - BODY[i][0], BODY[i + 1][1] - BODY[i][1]) - gap) / 2 + 1);
      const at = (u: number, v: number): P => [mid[0] + g.nx * u + g.ax * v, mid[1] + g.ny * u + g.ay * v];
      discs.push(sp([at(-dw, -dh), at(dw - 1, -dh), at(dw + 1, 0), at(dw - 1, dh), at(-dw, dh), at(-dw - 1, 0)]));
    }
    const sl = SPL[i];
    const dr = DROP[i];
    const b = -w / 2;
    post.push(
      sp([
        f.at(b + 1, -5),
        f.at(b - 8, -7),
        f.at(b - 20, -6),
        f.at(b - sl + 6, dr - 5),
        f.at(b - sl, dr),
        f.at(b - sl + 5, dr + 5),
        f.at(b - 22, 7),
        f.at(b - 8, 6),
        f.at(b + 1, 5),
      ]),
    );
    if (i < 6) pillars.push(roundBox(i, 10, 13, b - 9, 1));
  });
  return { bodies, discs, post, pillars };
})();
const C1 = {
  ant: sp(PS('226,90 234,88 238,96 234,104 226,102')),
  mass: sp(PS('204,90 218,92 220,104 206,106 198,100')),
  post: tube(PS('200,98 186,100 174,103 166,104'), [9, 7, 6, 8]),
  dens: sp(PS('209,84 217,83 219,96 216,108 208,108')),
};
/** Deep neck flexors run on the front of the vertebral bodies, from the skull base to T3. */
const DNF_PATH: P[] = [[222, 80] as P, [232, 94] as P, ...BODY.map((_, i) => fixN(i).at(BW[i] / 2 + 4.6, 0))];

/** Lateral skull (Frankfort plane ≈ y 56, porion ≈ 212,52), drawn from standard proportions. */
const SKULL_S = {
  cranium: sp(
    PS(
      '104,-30 104,0 112,28 118,48 124,62,1 146,76 168,86 186,92 198,94 206,90 214,82 220,72 230,64 250,66 268,66 282,68 288,80 284,92 278,98,1 300,100 318,100 328,98 331,88 332,80,1 324,74 322,58 325,44,1 316,32 312,24,1 318,12 322,-4 322,-30',
    ),
  ),
  orbit: sp(PS('278,24 292,17 306,20 312,32 310,48 300,57 286,57 278,46 275,34')),
  nasal: sp(PS('318,46 325,53 327,66 323,78 316,74 314,58')),
  temporal: sp(PS('226,18 256,6 284,10 280,56 252,60 230,58')),
  eam: 'M206 56a6 5 0 1 0 12 0a6 5 0 1 0-12 0Z',
  zygLn: sp(PS('226,58 250,56 270,56 286,54'), false),
  upperTeeth: sp(PS('278,96 300,98 318,98 328,98 328,104 316,104 300,103 280,102')),
  mand: sp(
    PS('218,61 226,57 231,63 230,74 238,80 246,78 255,63,1 262,70 262,88 268,99 300,104 320,104 329,107 331,122 328,136 316,150 290,148 262,140 242,132,1 236,118 232,96 226,77 220,69'),
  ),
  lowerTeeth: sp(PS('282,104 300,105 318,105 327,107 326,112 316,111 300,110 284,110')),
  mandLn: sp(PS('262,124 290,132 314,136'), false),
  mastoid: sp(PS('192,66 204,66 208,78 203,92 196,84')),
  hyoid: tube(PS('244,160 256,162 268,162 276,158'), [4, 5, 6, 6]),
  occLn: sp(PS('116,52 132,68 156,80'), false),
};
const SKIN_SIDE =
  sp(PS('98,-30 96,10 104,40 114,64 126,84 134,108 138,140 139,180 136,214 128,246 118,280 108,320 100,380'), false) +
  sp(PS('328,-30 334,-4 326,16 330,26 344,52 356,74 346,82 340,88 344,98 338,108 342,116 336,128 338,140 328,154 300,160 276,164 266,176 264,206 268,238 276,262 292,296 310,340 322,380'), false);
const CLAV_SIDE = tube(PS('230,274 250,278 268,282 284,286'), [12, 10, 10, 13]);
const SCAP_SIDE = {
  spine: sp(PS('236,264 246,268 244,277 226,281 200,285 176,291 152,299 136,305 127,299 132,289 150,286 174,280 198,274 222,268')),
  body: sp(PS('130,292 148,292 154,320 154,390 132,390 126,330')),
};
const RIBS_SIDE = sp(PS('204,268 226,276 250,286 272,296 284,302'), false) + sp(PS('194,292 218,302 244,314 268,326 286,334'), false);

const SMB = {
  dnf: strap({ c: DNF_PATH, w: [6, 8, 9, 9, 10, 10, 10, 9, 8, 7, 6], t0: 0.05, n: 5 }),
  levator: muscle({
    o: PS('205,100 201,118 205,140 208,162'),
    i: PS('130,302 133,296 136,290 140,284'),
    c: PS('194,206 192,214 191,220 190,226'),
    t0: [0.06, 0.08, 0.1, 0.12],
    n: 7,
  }),
  trap: muscle({
    o: PS('122,64 134,96 140,128 142,160 142,192 140,222 136,250'),
    i: PS('254,272 236,270 220,272 202,278 182,284 162,290 144,296'),
    c: PS('150,120 156,140 158,166 158,196 154,222 148,244 142,262'),
    c2: PS('160,230 166,236 170,242 168,250 160,258 152,266 144,280'),
    t0: [0.02, 0.03, 0.04, 0.05, 0.08, 0.1, 0.1],
    n: 16,
  }),
};

function SideView({ k }: { k: Ctx }) {
  return (
    <>
      <Ctxt k={k}>
        <path className="skin" d={SKIN_SIDE} />
        <path className="ghost" d={SCAP_SIDE.body} />
        <path className="ghost" d={RIBS_SIDE} />
        <path className="bone" d={SKULL_S.cranium} />
        <path className="bone-sh" d={SKULL_S.temporal} />
        <path className="hole" d={SKULL_S.orbit} />
        <path className="hole" d={SKULL_S.nasal} />
        <path className="bone-ln" d={SKULL_S.zygLn} />
        <path className="bone-ln" d={SKULL_S.occLn} />
        <path className="tooth" d={SKULL_S.upperTeeth} />
        <path className="bone" d={SKULL_S.mand} />
        <path className="tooth" d={SKULL_S.lowerTeeth} />
        <path className="bone-ln" d={SKULL_S.mandLn} />
        <path className="bone" d={SKULL_S.hyoid} />
      </Ctxt>
      <Part k={k} id="thoracic-spine">
        {LAT.discs.slice(5).map((d, i) => (
          <path key={i} className="cart" d={d} />
        ))}
        {LAT.post.slice(6).map((d, i) => (
          <path key={i} className="bone" d={d} />
        ))}
        {LAT.bodies.slice(6).map((d, i) => (
          <path key={i} className="bone" d={d} />
        ))}
      </Part>
      <Part k={k} id="cervical-spine">
        {LAT.discs.slice(0, 5).map((d, i) => (
          <path key={i} className="cart" d={d} />
        ))}
        {LAT.post.slice(0, 6).map((d, i) => (
          <path key={i} className="bone" d={d} />
        ))}
        {LAT.pillars.map((d, i) => (
          <path key={i} className="bone" d={d} />
        ))}
        {LAT.bodies.slice(0, 6).map((d, i) => (
          <path key={i} className="bone" d={d} />
        ))}
        <path className="bone" d={C1.dens} />
        <path className="bone" d={C1.post} />
        <path className="bone" d={C1.mass} />
        <path className="bone" d={C1.ant} />
      </Part>
      <Ctxt k={k}>
        <path className="bone" d={SKULL_S.mastoid} />
        <path className="hole" d={SKULL_S.eam} />
      </Ctxt>
      <Part k={k} id="deep-neck-flexors">
        <M g={SMB.dnf} />
      </Part>
      <Part k={k} id="levator-scapulae">
        <M g={SMB.levator} />
      </Part>
      <Part k={k} id="scapula">
        <path className="bone" d={SCAP_SIDE.spine} />
      </Part>
      <Part k={k} id="trapezius">
        <M g={SMB.trap} />
      </Part>
      <Ctxt k={k}>
        <path className="bone" d={CLAV_SIDE} />
      </Ctxt>
    </>
  );
}

const LABELS_SIDE: Lab[] = [
  { t: '後頭骨', at: [128, 60], x: 92, y: 52, a: 'end' },
  { id: 'trapezius', t: '僧帽筋', at: [154, 196], x: 118, y: 156, a: 'end' },
  { id: 'levator-scapulae', t: '肩甲挙筋', at: [184, 206], x: 118, y: 214, a: 'end' },
  { id: 'scapula', t: '肩甲骨', at: [150, 296], x: 92, y: 322, a: 'end' },
  { id: 'deep-neck-flexors', t: '頸部深層\n屈筋群', at: [231, 176], x: 272, y: 172 },
  { id: 'cervical-spine', t: '頸椎', at: [219, 200], x: 272, y: 222 },
  { id: 'thoracic-spine', t: '胸椎', at: [190, 306], x: 228, y: 352 },
];
const SPOTS_SIDE: Spot[] = [
  { id: 'neck-back', at: [160, 168] },
  { id: 'neck-base', at: [190, 258] },
];

/* ═════════════════════════ component & export ═════════════════════════ */

const VIEWS = [
  { id: 'back', label: '後ろから' },
  { id: 'side', label: '横から' },
];

/**
 * 起始 / 停止 markers (muscle page). Trapezius (back view, superficial left half): along its origin from the skull and
 * the spinous processes, and its insertion on the clavicle, acromion and scapular spine. Levator scapulae: the upper
 * neck vertebrae → the upper corner of the scapula. Deep neck flexors run from the lower vertebrae (origin, lower end
 * of the strap) up to the upper vertebrae and the skull base (insertion, its upper end).
 */
const shift = (pts: readonly (readonly number[])[]) => pts.map((q) => [q[0] + BACK_DX, q[1]]);
const OI_NECK_BACK: OIMap = {
  trapezius: { o: shift(att(NMB.trapL, 'o', [0.06, 0.4, 0.78])), i: shift(att(NMB.trapL, 'i', [0.08, 0.45, 0.85])) },
  'levator-scapulae': { o: shift(att(NMB.levator, 'o')), i: shift(att(NMB.levator, 'i')) },
};
const OI_NECK_SIDE: OIMap = {
  trapezius: { o: att(SMB.trap, 'o', [0.12, 0.6]), i: att(SMB.trap, 'i', [0.15, 0.6]) },
  'levator-scapulae': { o: att(SMB.levator, 'o'), i: att(SMB.levator, 'i') },
  'deep-neck-flexors': { o: att(SMB.dnf, 'i', 0.5, 0.97), i: att(SMB.dnf, 'o', 0.5, 0.04) },
};

function NeckDiagram(p: RegionDiagramProps) {
  const k = useCtx(p);
  const view = p.view === 'side' ? 'side' : 'back';
  if (view === 'side') {
    return (
      <Frame k={k} p={p} w={W} h={H} title="首を右横から見た図" cap={['← 背中側', '右横から・顔側 →']} labels={LABELS_SIDE} spots={SPOTS_SIDE} fade={[30, 70]} oi={OI_NECK_SIDE}>
        <SideView k={k} />
      </Frame>
    );
  }
  return (
    <Frame
      k={k}
      p={p}
      w={W}
      h={H}
      title="首と肩の上部を後ろから見た図（左半分は表層、右半分は僧帽筋を外した深層）"
      cap={['左半身：表層', '右半身：深層']}
      labels={LABELS_BACK}
      spots={SPOTS_BACK}
      fade={[24, 64]}
      fadeX={[16, 74]}
      oi={OI_NECK_BACK}
    >
      <g transform={`translate(${BACK_DX} 0)`}>
        <BackView k={k} />
      </g>
    </Frame>
  );
}

const diagram: RegionDiagram = {
  region: 'neck',
  views: VIEWS,
  parts: {
    back: [
      'trapezius',
      'levator-scapulae',
      'rhomboids',
      'cervical-spine',
      'thoracic-spine',
      'supraspinatus',
      'infraspinatus',
      'teres-minor',
      'deltoid',
      'latissimus-dorsi',
      'triceps-brachii',
      'posterior-capsule',
      'scapula',
      'acromion',
    ],
    side: ['trapezius', 'levator-scapulae', 'deep-neck-flexors', 'cervical-spine', 'thoracic-spine', 'scapula'],
  },
  spots: {
    back: ['neck-back', 'neck-base'],
    side: ['neck-back', 'neck-base'],
  },
  Component: NeckDiagram,
};

export default diagram;
