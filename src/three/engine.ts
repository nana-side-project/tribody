// TriBody 3D engine: renderer, scene, playback loop, camera, interaction & lifecycle.
import {
  CanvasTexture,
  DirectionalLight,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { dataReady, getConditionSafe, getExerciseSafe as getExercise, getMuscleSafe as getMuscle, loadData } from './data-access';
import type { ConditionId, ExerciseId, MuscleId, RegionId, StructureId } from '../data/registry';
import { STRUCTURES } from '../data/registry';
import { AnatomyLayer, isMuscleId, labelName, type PartId, type ZoneSpec } from './anatomy';
import { CAMERA_PRESETS, framePoints, PRESET_DIRS, REGION_CAMERA, regionMinSize, regionPoints } from './camera';
import { CONDITION_SCENES, REGION_SCENES, type Scene3D } from './scenes';
import {
  clipPhase,
  compileClip,
  type CompiledClip,
  DEMO_T_ACTION,
  DEMO_T_STRETCH,
  evalClip,
  muscleDemoClip,
  phaseLabel,
  placeState,
  staticClip,
} from './clip';
import { CLIPS } from './clips';
import type { CameraSpec, Clip } from './clips/types';
import type { Highlight3DRole } from './contract';
import { Figure } from './figure';
import { DebugLabels, LabelLayer, type LabelSpec, type MaskCord } from './labels';
import { type CompiledPoint, compileRef, evalPoint, LANDMARKS, pointSeg } from './landmarks';
import { type Palette, readPalette } from './materials';
import { PropLayer } from './props';
import {
  type BasePoseName,
  type CameraPresetName,
  type Pose,
  forEachSkinBox,
  newPoseVec,
  referencePoseVec,
  RigState,
  SEGMENTS,
  type Side,
  skinBounds,
  solveFK,
} from './rig';
import { MUSCLE_RIGS, STRUCTURE_RIGS } from './rig-data';
import { isMidlinePart } from './skeleton-parts';

export interface ViewSpec {
  muscle?: MuscleId;
  exercise?: ExerciseId;
  highlights?: Partial<Record<MuscleId | StructureId, Highlight3DRole>>;
  /** highlights mode: the condition they belong to (picks its teaching scene, see scenes.ts) */
  condition?: ConditionId;
  focus?: RegionId;
  labels: boolean;
  autoPlay: boolean;
  // ── dev / harness options
  pose?: BasePoseName;
  cam?: CameraPresetName;
  skin?: number;
  all?: boolean;
  debug?: boolean;
  /** freeze the clip at normalised time 0..1 */
  t?: number;
  /** debug: only name landmarks of this bone */
  lm?: string;
  /** dev: extra joint angles applied on top of the base pose (pose / highlights mode) */
  joints?: Pose['joints'];
  /** dev: root override */
  root?: Pose['root'];
}

export interface EngineUiState {
  playing: boolean;
  animated: boolean;
  note: string | null;
  legend: boolean;
  speed: number;
  mode: 'muscle' | 'exercise' | 'highlights' | 'pose';
}

export interface EngineEvents {
  onPhase?: (label: string | null) => void;
  onTime?: (t: number) => void;
  onUi?: (s: EngineUiState) => void;
  onError?: (kind: 'lost', msg: string) => void;
  /** the browser restored a lost context: the viewer should be rebuilt (remount) */
  onRestored?: () => void;
  onReady?: () => void;
}

export class WebGLUnavailableError extends Error {}

/** Playback renders at most every ~33 ms while nobody touches the view (every 2nd frame at 60 Hz): the slow clips
 *  look the same and CPU / GPU work halves. Orbiting, zooming and the reset tween stay at the display rate. */
const PLAY_FRAME_MS = 1000 / 30 - 3;
/** injured glow pulse on a static view: ~20 fps is smooth for a 2 s breathing glow */
const PULSE_FRAME_MS = 48;

/** Software rasterisers (SwiftShader, llvmpipe…): MSAA multiplies their per-frame cost 2–4×. Probed once. */
let softwareGL: boolean | undefined;
const SOFTWARE_RE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** Our own WebGL2 context (three uses it): no MSAA on high-DPR screens (phones: jaggies are tiny there and MSAA
 *  costs fill rate) nor on software GL; null when WebGL is unavailable (no console error from three). */
function createContext(): { canvas: HTMLCanvasElement; gl: WebGL2RenderingContext } | null {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const attrs = (antialias: boolean): WebGLContextAttributes => ({
    alpha: true,
    antialias,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  const want = dpr < 2 && softwareGL !== true;
  let canvas = document.createElement('canvas');
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', attrs(want));
  } catch {
    gl = null;
  }
  if (!gl) return null;
  if (softwareGL === undefined) {
    let name = '';
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
    } catch {
      /* ignore */
    }
    softwareGL = SOFTWARE_RE.test(name);
    if (softwareGL && want) {
      // recreate without MSAA (a canvas keeps its first context): release this one right away
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas = document.createElement('canvas');
      try {
        gl = canvas.getContext('webgl2', attrs(false));
      } catch {
        gl = null;
      }
      if (!gl) return null;
    }
  }
  return { canvas, gl };
}

const ROLE_ORDER: Highlight3DRole[] = ['injured', 'selected', 'primary', 'involved', 'secondary'];
/** Label tier: major roles get full pills; minor roles are smaller and may collapse into 「+N」. */
const MINOR_ROLES = new Set<Highlight3DRole>(['involved', 'secondary']);
const MAX_LABELS = 10;
/** Muscle demo framing: a point part-way from the insertion toward the next joint, so the moving limb stays in view. */
const DISTAL_REF: Partial<Record<string, string>> = {
  humerus: 'humerus:lateral_epicondyle',
  forearm: 'forearm:radius_distal',
  hand: 'hand:fingertips',
  femur: 'femur:lateral_epicondyle',
  patella: 'tibia:distal_ant',
  tibia: 'tibia:lateral_malleolus',
  foot: 'toes:toe_tips',
  toes: 'toes:toe_tips',
};
/** how far toward the distal joint: the whole way, so the segment the muscle moves (its insertion bone up to the next
 *  joint: thigh to the knee, shin to the ankle, upper arm to the elbow…) stays in view through the loop — at 60 % a
 *  300 px card cut the thigh of a gluteus medius / piriformis demo off under the player bar */
const distalFraction = (_aspect: number) => 1;

/** Framing keeps clear of the phase pill (top 10 px + ~26 px tall) with a small gap. */
const INSET_TOP_PILL = 46;
/** head / upper trunk landmarks for the "headless crop" check (exercise clips with a `frame` crop) */
const HEAD_REFS = ['head:vertex', 'head:chin'] as const;
const TRUNK_REFS = ['neck:spinous_C7', 'thorax:xiphoid', 'thorax:sternum_body', 'thorax:spinous_T10', 'thorax:costal_margin', 'lumbar:spinous_L3'] as const;

const isRigged = (id: string) =>
  isMuscleId(id) ? !!MUSCLE_RIGS[id]?.strands?.length : !!STRUCTURE_RIGS[id as StructureId]?.parts?.length;

/** Times sampled for framing: every key (start & hold end) + 16 uniform samples. */
function framingTimes(cc: CompiledClip): number[] {
  if (!cc.animated) return [0];
  const set = new Set<number>();
  const add = (t: number) => set.add(Math.round(Math.min(1, Math.max(0, t)) * 1e4) / 1e4);
  for (const k of cc.keys) {
    add(k.t);
    add(k.tEnd);
  }
  for (let i = 0; i < 16; i++) add(i / 16);
  if (cc.loop === 'pingpong') add(1);
  return [...set].sort((a, b) => a - b);
}

/** Quiet compile (the anatomy layer already warns about bad refs). */
function quietCompile(ref: Parameters<typeof compileRef>[0], side: Side): CompiledPoint | null {
  try {
    return compileRef(ref, side);
  } catch {
    return null;
  }
}
const STRUCTURE_REGION = new Map<string, RegionId>(STRUCTURES.map((x) => [x.id, x.region as RegionId]));
const _right = new Vector3();
const _up = new Vector3();
const _back = new Vector3();

function nearlyEqual(a: Matrix4, b: Matrix4, eps = 1e-6) {
  const x = a.elements;
  const y = b.elements;
  for (let i = 0; i < 16; i++) if (Math.abs(x[i] - y[i]) > eps) return false;
  return true;
}

function blobTexture(inner: number, outer: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, `rgba(40,28,20,${inner})`);
  grd.addColorStop(0.55, `rgba(40,28,20,${inner * 0.45})`);
  grd.addColorStop(1, `rgba(40,28,20,${outer})`);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export class Engine {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(30, 1, 0.02, 60);
  readonly controls: OrbitControls;
  private pal: Palette;
  private figure: Figure;
  private anatomy: AnatomyLayer;
  private props: PropLayer;
  private labels: LabelLayer;
  private debugLabels: DebugLabels | null = null;
  private debugPanel: HTMLPreElement | null = null;
  private lmMesh: InstancedMesh | null = null;
  private lmPoints: { cp: CompiledPoint; name: string; bone: string }[] = [];
  private state = new RigState();
  private refState = new RigState();
  private vec = newPoseVec();
  private clip: CompiledClip | null = null;
  private spec: ViewSpec = { labels: true, autoPlay: true };
  private key: DirectionalLight;
  private fill: DirectionalLight;
  private hemi: HemisphereLight;
  private shadow: Mesh;
  private floor: Mesh;
  private time = 0;
  private playing = false;
  private speed = 1;
  private frozenT: number | null = null;
  private lastPhase: string | null | undefined = undefined;
  private lastTimeEmit = 0;
  private raf = 0;
  private last = 0;
  private needsPose = true;
  private needsRender = true;
  private visible = true;
  private docHidden = false;
  private lost = false;
  private disposed = false;
  private userMoved = false;
  private home: { position: Vector3; target: Vector3 } | null = null;
  private tween: { from: { p: Vector3; t: Vector3 }; to: { p: Vector3; t: Vector3 }; start: number } | null = null;
  private width = 1;
  private height = 1;
  private reducedMotion = false;
  private ro: ResizeObserver | null = null;
  private io: IntersectionObserver | null = null;
  private mo: MutationObserver | null = null;
  private mq: MediaQueryList | null = null;
  private frameDt = 0;
  /** highlights mode: the teaching scene in use (scenes.ts) and the injured parts (framing) */
  private scene3d: Scene3D | null = null;
  private injuredIds = new Set<string>();
  /** loop bookkeeping: time of the last processed frame, labels still gliding, a context loss happened */
  private lastFrame = 0;
  private labelsMoving = false;
  private everLost = false;
  /** camera matrices at the last label layout (skip the layout when nothing moved) */
  private lastLabelCam = new Matrix4();
  private lastLabelProj = new Matrix4();
  /** muscle demo framing: insertion → distal joint pairs */
  private ctxPts: { ins: CompiledPoint; dist: CompiledPoint }[] = [];
  private mode: EngineUiState['mode'] = 'pose';
  private note: string | null = null;
  private legend = false;
  private readyFired = false;
  private bounds = { min: new Vector3(), max: new Vector3() };
  private debugInfo = '';

  constructor(
    private host: HTMLElement,
    private overlay: HTMLElement,
    private events: EngineEvents = {},
  ) {
    let renderer: WebGLRenderer;
    // One context per mount, created by us (see createContext); no probe context is kept alive (browsers cap the
    // number of live contexts and drop the oldest).
    const ctx = createContext();
    if (!ctx) throw new WebGLUnavailableError('WebGL unavailable');
    try {
      renderer = new WebGLRenderer({ canvas: ctx.canvas, context: ctx.gl, alpha: true, powerPreference: 'high-performance' });
    } catch {
      ctx.gl.getExtension('WEBGL_lose_context')?.loseContext();
      throw new WebGLUnavailableError('WebGL unavailable');
    }
    this.renderer = renderer;
    // shader error checks read program logs synchronously (a ~0.2 s stall on the first frame): development only
    renderer.debug.checkShaderErrors = !!import.meta.env?.DEV;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.className = 'tb3d-gl';
    canvas.setAttribute('aria-label', '3D解剖モデル（ドラッグで回転、ピンチで拡大）');
    canvas.setAttribute('role', 'img');
    host.appendChild(canvas);
    canvas.addEventListener('webglcontextlost', this.onLost, false);
    canvas.addEventListener('webglcontextrestored', this.onRestored, false);

    this.reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pal = readPalette(host);

    // lights: soft hemisphere + camera-relative key & fill
    this.hemi = new HemisphereLight('#fffaf3', '#cbbcae', 1.55);
    this.key = new DirectionalLight('#fffaf4', 2.1);
    this.fill = new DirectionalLight('#eef2ff', 0.55);
    this.scene.add(this.hemi, this.key, this.key.target, this.fill, this.fill.target);

    // floor: faint disc + soft contact shadow
    this.floor = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: blobTexture(0.07, 0), transparent: true, depthWrite: false }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.renderOrder = 1;
    this.shadow = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: blobTexture(0.34, 0), transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 2;
    this.scene.add(this.floor, this.shadow);

    solveFK(referencePoseVec(), this.refState);
    this.figure = new Figure(this.pal, 0.25);
    this.scene.add(this.figure.root);
    this.anatomy = new AnatomyLayer(this.pal, this.figure, this.refState);
    this.scene.add(this.anatomy.group);
    this.props = new PropLayer(this.pal);
    this.scene.add(this.props.group);
    this.labels = new LabelLayer(overlay, () => {
      this.needsRender = true;
      this.kick();
    });
    this.labels.reducedMotion = this.reducedMotion;

    const controls = new OrbitControls(this.camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.85;
    controls.panSpeed = 0.6;
    controls.screenSpacePanning = true;
    controls.minDistance = 0.22;
    controls.maxDistance = 7;
    controls.addEventListener('start', () => {
      this.userMoved = true;
      this.tween = null;
      this.kick();
    });
    controls.addEventListener('change', () => {
      if (this.userMoved) this.clampTarget();
      this.needsRender = true;
      // pointer / wheel / keys move the camera outside the loop: wake it (it idles when nothing changes)
      this.kick();
    });
    this.controls = controls;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.io = new IntersectionObserver((ents) => {
      const v = ents.some((e) => e.isIntersecting);
      if (v !== this.visible) {
        this.visible = v;
        this.kick();
      }
    });
    this.io.observe(host);
    document.addEventListener('visibilitychange', this.onVis);
    // theme changes
    this.mq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;
    this.mq?.addEventListener?.('change', this.onTheme);
    this.mo = new MutationObserver(this.onTheme);
    this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    this.resize();
    this.kick();
    if (!dataReady())
      void loadData().then((ok) => {
        // exercise targets / muscle regions come from the content data: refresh once it is available
        if (!ok || this.disposed || !this.configured) return;
        if (this.mode === 'exercise' || (this.mode === 'muscle' && this.note)) this.reconfigureKeepingView();
      });
  }

  private configured = false;
  /** whether the React layer shows the player bar (affects framing insets) */
  uiControls = true;
  private lastFocus: RegionId | undefined;
  private lastCam: CameraSpec | undefined;

  private reconfigureKeepingView() {
    const moved = this.userMoved;
    const pos = this.camera.position.clone();
    const tgt = this.controls.target.clone();
    const time = this.time;
    const playing = this.playing;
    this.configure(this.spec);
    this.time = time;
    if (this.frozenT === null) this.playing = playing && !!this.clip?.animated;
    if (moved) {
      this.camera.position.copy(pos);
      this.controls.target.copy(tgt);
      this.userMoved = true;
    }
    this.emitUi();
  }

  // ───────────────────────────── configuration

  /** Apply a view. A broken rig / clip (data files are hand-written by several agents) must never crash the page:
   *  on an exception the viewer falls back to the plain standing figure with a short note. */
  configure(spec: ViewSpec) {
    try {
      this.configureInner(spec);
    } catch (e) {
      console.error('[tribody 3d] could not show this view — falling back to the base pose', e);
      try {
        this.configureInner({ labels: false, autoPlay: false, focus: spec.focus });
        this.spec = spec;
        this.note = '3Dモデルを表示できませんでした';
        this.emitUi();
      } catch {
        /* nothing more we can do */
      }
    }
  }

  private configureInner(spec: ViewSpec) {
    this.spec = spec;
    this.configured = true;
    let clipSrc: Clip;
    let scope: Partial<Record<PartId, Highlight3DRole>> = {};
    let markers = false;
    this.note = null;
    this.legend = false;
    let cameraSpec: CameraSpec | undefined;
    let focus: RegionId | undefined = spec.focus;
    let scene: Scene3D | null = null;
    /** highlights mode: lesion zones, their labels, and the part / zone that carries the one pulse */
    const zones: ZoneSpec[] = [];
    const zoneLabels = new Map<string, string>();
    let pulse: string | null | undefined = undefined;
    if (spec.muscle) {
      this.mode = 'muscle';
      const rig = MUSCLE_RIGS[spec.muscle];
      if (rig) {
        clipSrc = muscleDemoClip(rig);
        scope[spec.muscle] = 'primary';
        markers = true;
        this.legend = true;
      } else {
        clipSrc = staticClip(spec.pose ?? 'STAND');
        this.note = 'この筋肉の3Dモデルは準備中です';
        focus ??= getMuscle(spec.muscle)?.regions?.[0];
      }
    } else if (spec.exercise) {
      this.mode = 'exercise';
      const c = CLIPS[spec.exercise];
      clipSrc = c ?? staticClip('STAND', spec.exercise);
      const ex = getExercise(spec.exercise);
      if (ex && (ex.primary.length || ex.secondary.length)) {
        for (const m of ex.secondary) scope[m] = 'secondary';
        for (const m of ex.primary) scope[m] = 'primary';
        // if none of the data's target muscles is rigged yet, the clip's own highlights are shown instead
        if (c?.highlights && !Object.keys(scope).some(isRigged)) scope = { ...c.highlights };
      } else if (c?.highlights) scope = { ...c.highlights };
      // clip extras (e.g. a nerve on a nerve glide) on top of the exercise's own targets
      if (c?.extraHighlights) Object.assign(scope, c.extraHighlights);
      if (!c) {
        this.note = 'このエクササイズの3Dアニメーションは準備中です';
        focus ??= ex?.regions?.[0];
      }
    } else if (spec.highlights && Object.keys(spec.highlights).length) {
      this.mode = 'highlights';
      scope = { ...spec.highlights };
      // teaching scene: the condition's own; on a region page (highlights + focus, no condition) the region's
      scene = (spec.condition ? CONDITION_SCENES[spec.condition] : spec.focus ? REGION_SCENES[spec.focus] : undefined) ?? null;
      for (const [id, r] of Object.entries(scene?.roles ?? {}) as [PartId, Highlight3DRole][]) if (scope[id]) scope[id] = r;
      const ids = Object.keys(scope) as PartId[];
      const injured = ids.filter((id) => scope[id] === 'injured');
      const rigOf = (id: PartId) => (isMuscleId(id) ? MUSCLE_RIGS[id] : STRUCTURE_RIGS[id as StructureId]);
      const order = [...injured, ...ids.filter((id) => scope[id] !== 'injured')];
      // only structure rigs may suggest a base pose here (muscle-rig bases belong to their demo)
      const structBase = order.map((id) => (isMuscleId(id) ? undefined : STRUCTURE_RIGS[id as StructureId]?.base)).find(Boolean);
      clipSrc = staticClip(spec.pose ?? scene?.base ?? structBase ?? 'STAND');
      if (scene?.joints) clipSrc = { ...clipSrc, pose: { joints: scene.joints } };
      if (scene?.frame?.length) clipSrc = { ...clipSrc, frame: scene.frame };
      // camera: the scene's; else (or 'rig') the injured tissue's rig camera. A muscle rig's exact camera belongs to
      // its demo (it frames that muscle's movement), so here it only lends its direction and the view is fitted.
      const camId = order.find((id) => rigOf(id));
      const camRig = camId ? rigOf(camId) : undefined;
      let rigCam: CameraSpec | undefined = camRig?.camera;
      if (rigCam && typeof rigCam === 'object' && 'position' in rigCam && camId && isMuscleId(camId)) {
        const [px, py, pz] = rigCam.position;
        const [tx, ty, tz] = rigCam.target;
        rigCam = { dir: [px - tx, py - ty, pz - tz] };
      }
      cameraSpec = scene?.camera && scene.camera !== 'rig' ? scene.camera : rigCam;
      focus ??= camRig?.focus;
      // nothing rigged yet: still frame the right body region (structure registry region / muscle data)
      if (!camRig && ids.length) focus ??= isMuscleId(ids[0]) ? getMuscle(ids[0])?.regions?.[0] : STRUCTURE_REGION.get(ids[0]);
      // lesion zones (where in the part the problem sits): the zone is the injured red, the rest of the part takes
      // the zone's partRole (its own colour by default); framing treats the part as injured
      for (const [i, z] of (scene?.zones ?? []).entries()) {
        if (!scope[z.on]) continue;
        const key = z.key ?? `zone${i}:${z.on}`;
        zones.push({ ...z, key });
        zoneLabels.set(z.on, z.label);
        scope[z.on] = z.partRole === 'injured' ? 'injured' : z.partRole === 'involved' ? 'involved' : 'secondary';
      }
      // one pulse per view. A non-damage condition (the content says nothing is damaged, the page's legend reads
      // 「痛みやすい場所」) pulses nothing: steady red marks where it hurts, not a lesion
      const sensitive = scene?.sensitive ?? (spec.condition ? !!getConditionSafe(spec.condition)?.anatomyNote : false);
      if (sensitive) pulse = null;
      else if (scene?.primary) pulse = scene.primary;
      else if (zones.length) pulse = zones[0].key;
    } else {
      this.mode = 'pose';
      clipSrc = staticClip(spec.pose ?? 'STAND');
    }
    if (spec.highlights && this.mode !== 'highlights') Object.assign(scope, spec.highlights);
    if (spec.pose && this.mode !== 'exercise' && this.mode !== 'muscle') clipSrc = { ...clipSrc, base: spec.pose };
    if ((spec.joints || spec.root) && this.mode !== 'exercise' && this.mode !== 'muscle')
      clipSrc = { ...clipSrc, pose: { joints: { ...clipSrc.pose?.joints, ...spec.joints }, root: spec.root ?? clipSrc.pose?.root } };
    this.scene3d = scene;
    // see-through bone pieces of the scene (cleared on every view)
    this.figure.clearGhosts();
    for (const [part, op] of Object.entries(scene?.ghost ?? {}) as [string, number][])
      if (typeof op === 'number') this.figure.ghost(part, isMidlinePart(part) ? null : 'R', op);
    this.injuredIds = new Set([...Object.keys(scope).filter((id) => scope[id as PartId] === 'injured'), ...zones.map((z) => z.on)]);

    const cc = compileClip(clipSrc);
    this.clip = cc;
    // An authored clip / muscle rig frames itself (its own focus, or the whole movement): the page's `focus` prop is
    // only a fallback there (the UI passes the first region for every exercise / muscle).
    if (this.mode === 'exercise' && spec.exercise && CLIPS[spec.exercise]) focus = cc.focus;
    else if (this.mode === 'muscle' && spec.muscle && MUSCLE_RIGS[spec.muscle]) focus = cc.focus ?? spec.focus;
    else focus ??= cc.focus;
    const scopeSides = this.mode === 'highlights' || this.mode === 'muscle' ? [cc.side] : cc.sides;
    // sides per part: a scene's bilateral parts; an exercise clip's partSides (the stance-leg gluteus medius of a
    // knee drive, the floor-side obliques of a Copenhagen plank)
    const both = new Set<string>(scene?.both ?? []);
    const partSides = this.mode === 'exercise' ? cc.partSides : {};
    const sidesOf = (id: string): Side[] => partSides[id] ?? (both.has(id) ? ['R', 'L'] : scopeSides);
    this.anatomy.setScope(scope, scopeSides, {
      markers,
      ghosts: !!spec.all,
      fade: scene?.fade,
      xrayInjured: this.mode === 'highlights',
      sidesOf,
      pulse,
      zones,
      structures: scene?.structures,
    });
    this.ctxPts = this.mode === 'muscle' && spec.muscle ? this.muscleContext(spec.muscle, cc.side) : [];
    if (this.mode === 'highlights' && Object.keys(scope).length && !this.anatomy.hasVisuals) this.note = '3Dモデルは準備中です';
    if (this.mode === 'exercise' && !this.note && Object.keys(scope).length && !this.anatomy.hasVisuals) this.note = '筋肉の3Dモデルは準備中です';

    // reference placement (t = 0) for props & framing
    const st0 = new RigState();
    solveFK(evalClip(cc, 0, newPoseVec()), st0);
    placeState(cc, st0);
    this.props.setProps(cc.props, cc.side, cc.mirror, st0);

    // playback
    this.frozenT = typeof spec.t === 'number' && Number.isFinite(spec.t) ? Math.min(1, Math.max(0, spec.t)) : null;
    this.time = (this.frozenT ?? 0) * cc.duration;
    this.playing = spec.autoPlay && !this.reducedMotion && cc.animated && this.frozenT === null;
    this.lastPhase = undefined;

    // skin
    this.figure.setSkinOpacity(spec.skin ?? 0.25);

    // debug
    this.setupDebug(!!spec.debug);

    // camera
    skinBounds(st0, this.bounds);
    for (const p of this.props.framing) {
      this.bounds.min.min(p);
      this.bounds.max.max(p);
    }
    this.userMoved = false;
    this.lastFocus = focus;
    this.lastCam = cameraSpec ?? (this.mode === 'muscle' ? cc.camera : undefined);
    this.home = this.computeFraming(cc, this.lastCam, focus);
    this.applyHome();
    this.camera.lookAt(this.home.target);
    this.controls.update();

    // labels: one per highlighted part, on the side actually highlighted (both sides → the side nearer the camera)
    // (the label order takes the part a pulsing zone lies on)
    const pulsePart = pulse === undefined ? undefined : (zones.find((z) => z.key === pulse)?.on ?? pulse);
    this.setupLabels(scope, sidesOf, st0, new Set<string>(scene?.minor ?? []), zoneLabels, pulsePart);
    this.labels.visible = spec.labels;
    this.planLabels();
    // floor disc follows the reference bounds
    const cx = (this.bounds.min.x + this.bounds.max.x) / 2;
    const cz = (this.bounds.min.z + this.bounds.max.z) / 2;
    const span = Math.max(this.bounds.max.x - this.bounds.min.x, this.bounds.max.z - this.bounds.min.z);
    this.floor.position.set(cx, 0.0005, cz);
    this.floor.scale.setScalar(Math.max(1.6, span * 1.7));
    this.floor.visible = this.bounds.min.y < 0.5;

    if (spec.debug && this.mode === 'muscle') this.debugInfo = this.verifyDemo(cc);
    else if (spec.debug && cc.animated) this.debugInfo = this.clipRange(cc);
    else this.debugInfo = '';
    this.needsPose = true;
    this.needsRender = true;
    this.warmShaders();
    this.emitUi();
    this.kick();
  }

  private warmed = false;
  private compiling = false;
  /** First view: compile the shader programs in parallel (KHR_parallel_shader_compile) before the first frame, so
   *  linking does not block the main thread (~0.1–0.3 s on phones). Without the extension nothing changes. */
  private warmShaders() {
    if (this.warmed) return;
    this.warmed = true;
    if (!this.renderer.extensions.has('KHR_parallel_shader_compile')) return;
    this.compiling = true;
    const done = () => {
      if (!this.compiling || this.disposed) return;
      this.compiling = false;
      this.needsRender = true;
      this.kick();
    };
    this.updatePose(0);
    this.renderer.compileAsync(this.scene, this.camera).then(done, done);
    setTimeout(done, 1500);
  }

  private roleSwatch(role: Highlight3DRole) {
    const P = this.pal;
    return role === 'injured' ? P.injured : role === 'involved' ? P.involved : role === 'secondary' ? P.muscleLight : P.muscle;
  }

  /** Label dot colour: role colour, except non-injured structures keep their own colour (nerve yellow, bursa blue…). */
  private swatch(id: PartId, role: Highlight3DRole) {
    if (role === 'injured' || role === 'involved' || isMuscleId(id)) return this.roleSwatch(role);
    const P = this.pal;
    const type = STRUCTURE_RIGS[id as StructureId]?.parts?.[0]?.type;
    if (type === 'nerve') return P.nerve;
    if (type === 'bursa') return P.bursa;
    if (type === 'tendon' || type === 'ligament' || type === 'fascia') return P.tendon;
    return this.roleSwatch(role);
  }

  /** Label items (one per part, on the highlighted side nearest the home camera) + the overlap mask's cords. */
  private setupLabels(
    scope: Partial<Record<PartId, Highlight3DRole>>,
    sidesOf: (id: string) => Side[],
    st0: RigState,
    minor: ReadonlySet<string> = new Set(),
    zoneLabels: ReadonlyMap<string, string> = new Map(),
    /** the part carrying the view's pulse (undefined: the first injured part) — its label goes first */
    pulse?: string | null,
  ) {
    // highlighted anatomy as polylines per part & side: the overlap mask (labels avoid covering it) and each label's
    // fallback anchor points (used when its main anchor is off-view or under the player UI)
    const cords: MaskCord[] = [];
    const polys = new Map<string, CompiledPoint[][]>();
    /** per polyline: the muscle belly's arc range (tendon fractions excluded); null for cords / blobs */
    const bellies = new Map<string, ([number, number] | null)[]>();
    for (const [id, role] of Object.entries(scope) as [PartId, Highlight3DRole][]) {
      if (!role) continue;
      for (const side of sidesOf(id)) {
        const pl: CompiledPoint[][] = [];
        const bl: ([number, number] | null)[] = [];
        if (isMuscleId(id)) {
          for (const st of MUSCLE_RIGS[id]?.strands ?? []) {
            const cps = st.path.map((r) => quietCompile(r, side));
            if (!cps.every(Boolean)) continue;
            cords.push({ cps: cps as CompiledPoint[], r: st.radius * 1.15 + (st.flat ? st.flat.width * 0.4 : 0) });
            pl.push(cps as CompiledPoint[]);
            const [t0, t1] = st.tendon ?? [0, 0];
            bl.push(t0 > 0.02 || t1 > 0.02 ? [t0, 1 - t1] : null);
          }
        } else {
          for (const part of STRUCTURE_RIGS[id as StructureId]?.parts ?? []) {
            if ('path' in part) {
              const cps = part.path.map((r) => quietCompile(r, side));
              if (!cps.every(Boolean)) continue;
              cords.push({ cps: cps as CompiledPoint[], r: part.radius + (part.flat ? part.flat.width * 0.4 : 0) });
              pl.push(cps as CompiledPoint[]);
            } else if ('at' in part) {
              const cp = quietCompile(part.at, side);
              const r = part.type === 'spot' ? part.radius : Math.max(...part.radii);
              if (!cp) continue;
              cords.push({ cps: [cp], r });
              pl.push([cp]);
            }
          }
        }
        if (pl.length) {
          polys.set(`${id}:${side}`, pl);
          if (bl.some(Boolean)) bellies.set(`${id}:${side}`, bl);
        }
      }
    }
    this.labels.setCords(cords);

    const sideOf = new Map<string, Side>();
    if (Object.keys(scope).some((id) => sidesOf(id).length > 1)) {
      this.anatomy.pose(st0);
      const score = new Map<string, number>();
      const cam = this.camera;
      cam.updateMatrixWorld();
      const q = new Vector3();
      const inView = () => q.z < 1 && Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.9;
      this.anatomy.labelAnchors(st0, (key, id, _role, p) => {
        // prefer the side whose anchor is in view, then one with part of the muscle in view, then the nearer one
        q.copy(p).project(cam);
        let d = p.distanceTo(cam.position);
        if (!inView()) {
          let seen = 0;
          let all = 0;
          for (const pl of polys.get(key) ?? [])
            for (const cp of pl) {
              all++;
              evalPoint(cp, st0, q).project(cam);
              if (inView()) seen++;
            }
          d += seen ? 500 * (1 - seen / all) + 100 : 1000;
        }
        if (!(d >= (score.get(id) ?? Infinity))) {
          score.set(id, d);
          sideOf.set(id, key.slice(key.lastIndexOf(':') + 1) as Side);
        }
      });
      this.needsPose = true;
    }
    const items: (LabelSpec & { order: number })[] = [];
    // the pulsing part first (undefined: the first injured part, as in the anatomy layer)
    const pulseId = pulse === undefined ? (Object.keys(scope) as PartId[]).find((id) => scope[id] === 'injured') : pulse;
    // a selected part (region page chip): the muted key muscles' labels wait in 「+N」 (the chip row names them all)
    const selected = Object.values(scope).includes('selected');
    for (const [id, role0] of Object.entries(scope) as [PartId, Highlight3DRole][]) {
      if (!role0) continue;
      const zone = zoneLabels.get(id);
      // a lesion zone carries the part's label: injured red, major
      const role: Highlight3DRole = zone ? 'injured' : role0;
      const key = `${id}:${sideOf.get(id) ?? sidesOf(id)[0]}`;
      items.push({
        key,
        text: zone ?? labelName(id),
        color: this.swatch(id, role),
        tier: MINOR_ROLES.has(role) ? 1 : 0,
        alt: polys.get(key),
        altBelly: bellies.get(key),
        collapse: MINOR_ROLES.has(role) && (minor.has(id) || (selected && role === 'secondary')),
        order: id === pulseId ? -1 : ROLE_ORDER.indexOf(role),
      });
    }
    items.sort((a, b) => a.order - b.order);
    // more parts than labels fit (a region page's 12–14 key muscles): the rest goes into 「+N」 (named there), never
    // silently dropped
    this.labels.setItems(items.map(({ order: _o, ...it }, i) => (i < MAX_LABELS ? it : { ...it, overflow: true })));
  }

  /** Pre-pass over the clip with the home camera: decides which minor labels collapse into 「+N」. */
  private planLabels() {
    const cc = this.clip;
    if (!cc || !this.spec.labels) return;
    const all = framingTimes(cc);
    const step = Math.max(1, Math.ceil(all.length / 12));
    const ts = all.filter((_, i) => i % step === 0);
    const longest = cc.labels.reduce((m, l) => Math.max(m, l.label.length), 0);
    const zones = LabelLayer.guessZones(this.width, this.height, {
      bar: this.uiControls && cc.animated,
      float: this.uiControls && !cc.animated,
      phaseW: this.uiControls && cc.animated && longest ? longest * 12 + 36 : 0,
      legend: this.legend,
    });
    this.camera.updateMatrixWorld();
    const st = new RigState();
    const vec = newPoseVec();
    this.labels.planBegin();
    for (const t of ts) {
      solveFK(evalClip(cc, t, vec), st);
      placeState(cc, st);
      this.anatomy.pose(st);
      this.anatomy.labelAnchors(st, this.setLabelAnchor);
      this.labels.planFrame(this.camera, this.width, this.height, zones, st);
    }
    this.labels.planEnd();
    this.needsPose = true;
  }

  /** Muscle demo: insertion → distal-joint pairs (keeps the moving limb in the frame). */
  private muscleContext(id: MuscleId, side: Side) {
    const out: { ins: CompiledPoint; dist: CompiledPoint }[] = [];
    for (const st of MUSCLE_RIGS[id]?.strands ?? []) {
      const ins = quietCompile(st.path[st.path.length - 1], side);
      if (!ins) continue;
      const base = SEGMENTS[pointSeg(ins)].replace(/_[RL]$/, '');
      const ref = DISTAL_REF[base];
      const dist = ref ? quietCompile(ref as Parameters<typeof compileRef>[0], side) : null;
      if (dist) out.push({ ins, dist });
    }
    return out;
  }

  /** Muscle demo + exact camera: the muscle's points and its moving segment (insertion → next joint), sampled over the
   *  clip, must project inside the free area (card minus phase pill / player bar insets). If they do with the authored
   *  camera, it is kept as is; otherwise the view is fitted to those points along the authored direction (re-centred,
   *  like a `{ dir }` camera). Returns null when the authored camera is fine. */
  private fitExact(cc: CompiledClip, pos: Vector3, target: Vector3, aspect: number, focus: RegionId | undefined) {
    const dir = new Vector3().subVectors(pos, target);
    const d0 = dir.length();
    if (d0 < 1e-6) return null;
    dir.divideScalar(d0);
    const right = new Vector3().crossVectors(this.camera.up, dir).normalize();
    if (right.lengthSq() < 1e-6) return null;
    const camUp = new Vector3().crossVectors(dir, right);
    const tanV = Math.tan(((this.camera.fov * Math.PI) / 180) / 2);
    const tanH = tanV * aspect;
    const H = Math.max(1, this.height);
    const bar = this.uiControls;
    const iTop = bar && cc.animated ? INSET_TOP_PILL : 6;
    const iBot = bar ? (cc.animated ? 62 : 8) : 6;
    const up = tanV * Math.max(0.2, 1 - (2 * iTop) / H);
    const down = tanV * Math.max(0.2, 1 - (2 * iBot) / H);
    const m = 1.04;
    const st = new RigState();
    const pts: Vector3[] = [];
    const a = new Vector3();
    const b = new Vector3();
    for (const t of framingTimes(cc)) {
      solveFK(evalClip(cc, t, newPoseVec()), st);
      placeState(cc, st);
      this.anatomy.pose(st);
      this.anatomy.collectPoints(pts);
      for (const c of this.ctxPts) pts.push(evalPoint(c.ins, st, a).clone().lerp(evalPoint(c.dist, st, b), distalFraction(aspect)));
    }
    this.needsPose = true;
    const q = new Vector3();
    let fits = true;
    for (const p of pts) {
      q.subVectors(p, target);
      const x = Math.abs(q.dot(right)) * m;
      const y = q.dot(camUp) * m;
      const z = q.dot(dir);
      if (d0 < z + x / tanH || d0 < z + (y > 0 ? y / up : -y / down)) {
        fits = false;
        break;
      }
    }
    if (fits) return null;
    return framePoints(pts, dir, this.camera, aspect, {
      margin: aspect < 0.8 ? 1.16 : 1.1,
      minSize: focus ? regionMinSize(focus) * 0.85 : 0.42,
      heightPx: this.height,
      insetTop: iTop,
      insetBottom: iBot,
    });
  }

  private computeFraming(cc: CompiledClip, extraCam: CameraSpec | undefined, focus: RegionId | undefined) {
    const spec = this.spec;
    const aspect = this.width / Math.max(1, this.height);
    let camSpec: CameraSpec | undefined = spec.cam ?? extraCam ?? cc.camera;
    if (!spec.cam && cc.camera && typeof cc.camera === 'object' && 'position' in cc.camera) camSpec = cc.camera;
    if (camSpec && typeof camSpec === 'object' && 'position' in camSpec && !spec.cam) {
      const pos = new Vector3(...camSpec.position);
      const target = new Vector3(...camSpec.target);
      if (cc.mirror) {
        pos.x = -pos.x;
        target.x = -target.x;
      }
      const refAspect = 1.15;
      if (aspect < refAspect) pos.sub(target).multiplyScalar(Math.min(2.2, Math.pow(refAspect / aspect, 0.85))).add(target);
      // muscle demo: keep the authored view if the whole muscle and the segment it moves (up to the next joint) stay
      // clear of the card edges and the player UI through the loop; otherwise fit them along the authored direction
      if (this.mode === 'muscle' && this.anatomy.hasVisuals) return this.fitExact(cc, pos, target, aspect, focus) ?? { position: pos, target };
      return { position: pos, target };
    }
    let preset: CameraPresetName = (typeof camSpec === 'string' ? camSpec : undefined) ?? (focus ? REGION_CAMERA[focus] : 'iso');
    if (!CAMERA_PRESETS.includes(preset)) preset = 'iso';
    const dir =
      camSpec && typeof camSpec === 'object' && 'dir' in camSpec && !spec.cam ? new Vector3(...camSpec.dir).normalize() : PRESET_DIRS[preset].clone();
    if (cc.mirror) dir.x = -dir.x;
    if (this.mode === 'highlights') return this.highlightFraming(cc, dir, focus, aspect);
    const pts: Vector3[] = [];
    const st = new RigState();
    const ts = framingTimes(cc);
    let minSize = 0;
    const a = new Vector3();
    const b = new Vector3();
    for (const t of ts) {
      solveFK(evalClip(cc, t, newPoseVec()), st);
      placeState(cc, st);
      for (const cp of cc.frame) pts.push(evalPoint(cp, st, new Vector3()));
      if (cc.frame.length && !focus) {
        minSize = Math.max(minSize, 0.4);
        continue;
      }
      if (this.mode === 'muscle' && this.anatomy.hasVisuals) {
        this.anatomy.pose(st);
        this.anatomy.collectPoints(pts);
        for (const c of this.ctxPts) pts.push(evalPoint(c.ins, st, a).clone().lerp(evalPoint(c.dist, st, b), distalFraction(aspect)));
        minSize = focus ? regionMinSize(focus) * 0.85 : 0.42;
      } else if (focus) {
        regionPoints(focus, st, cc.side, pts);
        minSize = regionMinSize(focus);
      } else {
        forEachSkinBox(st, (x0, y0, z0, x1, y1, z1) => {
          pts.push(new Vector3(x0, y0, z0), new Vector3(x1, y1, z1));
        });
      }
    }
    if (this.mode === 'muscle' && this.anatomy.hasVisuals) this.needsPose = true;
    if (!focus && !cc.frame.length) pts.push(...this.props.framing);
    const bar = this.uiControls;
    const opts = {
      margin: this.mode === 'muscle' && aspect < 0.8 ? 1.16 : focus || this.mode === 'muscle' ? 1.1 : 1.06,
      minSize,
      heightPx: this.height,
      insetTop: bar && cc.animated ? INSET_TOP_PILL : 6,
      insetBottom: bar ? (cc.animated ? 62 : 8) : 6,
    };
    const home = framePoints(pts, dir, this.camera, aspect, opts);
    // A clip crop (`frame`) that cuts through the chest or neck leaves a headless figure whose head sits under the
    // phase pill: show the whole head instead (a crop at the hips or lower is a clean close-up and is kept).
    if (this.mode === 'exercise' && cc.frame.length && !focus && this.cutsHead(cc, home, aspect, opts.insetTop, opts.insetBottom)) {
      for (const t of ts) {
        solveFK(evalClip(cc, t, newPoseVec()), st);
        placeState(cc, st);
        for (const r of HEAD_REFS) {
          const cp = quietCompile(r, cc.side);
          if (cp) pts.push(evalPoint(cp, st, new Vector3()));
        }
      }
      return framePoints(pts, dir, this.camera, aspect, opts);
    }
    return home;
  }

  /** Does this home view show the upper trunk (neck base or breastbone) at some time of the clip while the top of the
   *  head is out of view (above the card / under the phase pill)? */
  private cutsHead(cc: CompiledClip, home: { position: Vector3; target: Vector3 }, aspect: number, insetTop: number, insetBottom: number) {
    const cam = new PerspectiveCamera(this.camera.fov, aspect, 0.02, 60);
    cam.position.copy(home.position);
    cam.lookAt(home.target);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    const H = Math.max(1, this.height);
    const yTop = 1 - (2 * insetTop) / H;
    const yBot = -1 + (2 * insetBottom) / H;
    const vis = (p: Vector3) => {
      p.project(cam);
      return p.z < 1 && Math.abs(p.x) < 1 && p.y < yTop && p.y > yBot;
    };
    const st = new RigState();
    const q = new Vector3();
    const vertex = quietCompile('head:vertex', cc.side);
    const trunk = TRUNK_REFS.map((r) => quietCompile(r, cc.side)).filter((c): c is CompiledPoint => !!c);
    if (!vertex) return false;
    for (const t of framingTimes(cc)) {
      solveFK(evalClip(cc, t, newPoseVec()), st);
      placeState(cc, st);
      if (vis(evalPoint(vertex, st, q))) continue;
      if (trunk.some((cp) => vis(evalPoint(cp, st, q)))) return true;
    }
    return false;
  }

  /** Highlights mode (condition / region pages): frame what the view is about — the scene's crop points, else the
   *  injured parts plus the focus region. Involved context parts never widen the frame (they may run off the card). */
  private highlightFraming(cc: CompiledClip, dir: Vector3, focus: RegionId | undefined, aspect: number) {
    const sc = this.scene3d;
    const pts: Vector3[] = [];
    const st = new RigState();
    const frameInjured = sc?.frameInjured ?? !cc.frame.length;
    const hasInjured = this.injuredIds.size > 0;
    for (const t of framingTimes(cc)) {
      solveFK(evalClip(cc, t, newPoseVec()), st);
      placeState(cc, st);
      for (const cp of cc.frame) pts.push(evalPoint(cp, st, new Vector3()));
      if (!cc.frame.length && focus) regionPoints(focus, st, cc.side, pts);
      if (this.anatomy.hasVisuals && (frameInjured || (!cc.frame.length && !focus))) {
        this.anatomy.pose(st);
        // the injured tissue (no injured part, e.g. a region page without focus: everything highlighted)
        this.anatomy.collectPoints(pts, hasInjured && (frameInjured || focus) ? this.injuredIds : undefined);
      }
    }
    this.needsPose = true;
    if (!pts.length) {
      solveFK(evalClip(cc, 0, newPoseVec()), st);
      placeState(cc, st);
      forEachSkinBox(st, (x0, y0, z0, x1, y1, z1) => {
        pts.push(new Vector3(x0, y0, z0), new Vector3(x1, y1, z1));
      });
    }
    const bar = this.uiControls;
    return framePoints(pts, dir, this.camera, aspect, {
      margin: sc ? 1.15 : 1.1,
      minSize: sc?.minSize ?? (focus ? regionMinSize(focus) : 0.45),
      heightPx: this.height,
      insetTop: bar && cc.animated ? INSET_TOP_PILL : 6,
      insetBottom: bar ? (cc.animated ? 62 : 8) : 6,
    });
  }

  /** Move the camera to the home framing; zoom limits follow it (a wide pose on a tall phone needs a far camera). */
  private applyHome() {
    if (!this.home) return;
    this.camera.position.copy(this.home.position);
    this.controls.target.copy(this.home.target);
    const d = this.home.position.distanceTo(this.home.target);
    this.controls.maxDistance = Math.max(7, d * 1.6);
    this.controls.minDistance = Math.min(0.22, d * 0.5);
    this.camera.far = Math.max(60, d * 8);
    this.camera.updateProjectionMatrix();
  }

  private clampTarget() {
    const t = this.controls.target;
    const b = this.bounds;
    const m = 0.5;
    t.x = Math.min(b.max.x + m, Math.max(b.min.x - m, t.x));
    t.y = Math.min(b.max.y + m, Math.max(b.min.y - 0.2, t.y));
    t.z = Math.min(b.max.z + m, Math.max(b.min.z - m, t.z));
  }

  // ───────────────────────────── playback API

  play() {
    if (!this.clip?.animated) return;
    this.frozenT = null;
    this.playing = true;
    this.emitUi();
    this.kick();
  }
  pause() {
    this.playing = false;
    this.emitUi();
  }
  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }
  setSpeed(s: number) {
    this.speed = s;
    this.emitUi();
  }
  /** Jump to normalised time (pauses playback). */
  setTime(t: number) {
    if (!this.clip) return;
    this.playing = false;
    this.frozenT = null;
    // exact (a key time shows that key's label); only t = 1 stays just before the wrap to 0
    const u = Math.min(1, Math.max(0, t));
    this.time = (u >= 1 ? 1 - 1e-6 : u) * this.clip.duration;
    this.needsPose = true;
    this.labels.snap();
    this.emitUi();
    this.kick();
  }
  resetView() {
    if (!this.home) return;
    // drop OrbitControls' leftover damping momentum first: otherwise it carries the camera off again after the tween
    const c = this.controls as unknown as { _sphericalDelta?: { set(a: number, b: number, c: number): void }; _panOffset?: Vector3; _scale?: number };
    c._sphericalDelta?.set(0, 0, 0);
    c._panOffset?.set(0, 0, 0);
    if (typeof c._scale === 'number') c._scale = 1;
    this.tween = {
      from: { p: this.camera.position.clone(), t: this.controls.target.clone() },
      to: { p: this.home.position.clone(), t: this.home.target.clone() },
      start: performance.now(),
    };
    this.userMoved = false;
    this.kick();
  }
  get isPlaying() {
    return this.playing;
  }
  /** Current normalised time. */
  get t() {
    if (!this.clip) return 0;
    return this.frozenT ?? clipPhase(this.clip, this.time);
  }

  private emitUi() {
    this.events.onUi?.({
      playing: this.playing,
      animated: !!this.clip?.animated,
      note: this.note,
      legend: this.legend,
      speed: this.speed,
      mode: this.mode,
    });
  }

  // ───────────────────────────── loop

  private kick() {
    if (this.disposed || this.lost) return;
    const active = this.visible && !this.docHidden;
    if (active && !this.raf) {
      // waking from idle: count the next frame's dt from now (no jump in playback time)
      if (!this.inLoop) this.lastFrame = Math.max(this.lastFrame, performance.now() - 1000 / 60);
      this.raf = requestAnimationFrame(this.loop);
    }
    if (!active && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private inLoop = false;

  /**
   * One display frame. Work is only done when something changed:
   * - playback: pose + render at most every PLAY_FRAME_MS (≈30 fps) unless the user is moving the camera;
   * - injured glow on a static view: only the glow (no geometry, no label layout) every PULSE_FRAME_MS;
   * - camera moves (drag, damping, reset tween), resizes, theme / view changes, gliding labels: render right away.
   * When nothing is animating the loop stops; OrbitControls' events, play() / setTime() etc. wake it (kick()).
   */
  private loop = (now: number) => {
    this.raf = 0;
    if (this.disposed || this.lost || !this.visible || this.docHidden) return;
    this.inLoop = true;
    let cam = false;
    if (this.tween) {
      const u = Math.min(1, (now - this.tween.start) / 450);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      this.camera.position.lerpVectors(this.tween.from.p, this.tween.to.p, e);
      this.controls.target.lerpVectors(this.tween.from.t, this.tween.to.t, e);
      if (u >= 1) this.tween = null;
      cam = true;
    }
    // damping momentum (and the lookAt of a tween step); true when the camera moved
    if (this.controls.update()) cam = true;
    const pulsing = this.anatomy.hasPulse && !this.reducedMotion;
    const since = now - this.lastFrame;
    let due = this.needsRender || this.needsPose || cam;
    if (!due && this.playing) due = since >= PLAY_FRAME_MS;
    else if (!due && this.labelsMoving) due = true;
    if (!due && pulsing) due = since >= PULSE_FRAME_MS;
    if (due && this.configured && !this.compiling) {
      const dt = Math.min(0.05, Math.max(0, since / 1000));
      this.lastFrame = now;
      this.frameDt = dt;
      if (this.playing && this.clip) {
        this.time += dt * this.speed;
        this.needsPose = true;
      }
      const posed = this.needsPose;
      if (posed) this.updatePose(now / 1000);
      else if (pulsing) this.anatomy.updatePulse(now / 1000);
      this.render(posed);
    }
    this.inLoop = false;
    const idle = !this.playing && !pulsing && !this.tween && !cam && !this.needsRender && !this.needsPose && !this.labelsMoving;
    if (!idle && !this.raf) this.raf = requestAnimationFrame(this.loop);
  };

  private updatePose(seconds: number) {
    const cc = this.clip;
    if (!cc) return;
    const t = this.frozenT ?? clipPhase(cc, this.time);
    evalClip(cc, t, this.vec);
    solveFK(this.vec, this.state);
    placeState(cc, this.state);
    this.figure.apply(this.state);
    this.props.update(this.state);
    this.updateShadow();
    const ph = phaseLabel(cc, t);
    if (ph !== this.lastPhase) {
      this.lastPhase = ph;
      this.events.onPhase?.(ph);
    }
    const nowMs = performance.now();
    if (nowMs - this.lastTimeEmit > 90 || !this.playing) {
      this.lastTimeEmit = nowMs;
      this.events.onTime?.(t);
    }
    this.anatomy.update(this.state, this.reducedMotion ? 0 : seconds, !this.reducedMotion);
    this.needsPose = false;
  }

  private shadowBounds = { min: new Vector3(), max: new Vector3() };
  private setLabelAnchor = (key: string, _id: PartId, _role: unknown, p: Vector3) => this.labels.setAnchor(key, p);
  /** Number of frames rendered (dev / tests: verifies pausing off-screen). */
  renders = 0;

  private updateShadow() {
    const b = skinBounds(this.state, this.shadowBounds);
    const cx = (b.min.x + b.max.x) / 2;
    const cz = (b.min.z + b.max.z) / 2;
    const sx = Math.max(0.25, (b.max.x - b.min.x) * 1.25);
    const sz = Math.max(0.25, (b.max.z - b.min.z) * 1.25);
    this.shadow.position.set(cx, 0.001, cz);
    this.shadow.scale.set(sx, sz, 1);
    const lift = Math.max(0, b.min.y);
    (this.shadow.material as MeshBasicMaterial).opacity = Math.max(0.15, 1 - lift * 2.2);
    this.shadow.visible = b.min.y < 0.6;
  }

  /** Draw a frame. `posed`: the pose changed this frame (labels follow their anchors). */
  private render(posed = true) {
    this.needsRender = false;
    // camera-relative lights (always lit from the viewer's upper-left)
    const cam = this.camera;
    const tgt = this.controls.target;
    const right = _right.setFromMatrixColumn(cam.matrixWorld, 0);
    const up = _up.setFromMatrixColumn(cam.matrixWorld, 1);
    const back = _back.subVectors(cam.position, tgt).normalize();
    this.key.position.copy(tgt).addScaledVector(back, 3).addScaledVector(right, -1.8).addScaledVector(up, 2.6);
    this.key.target.position.copy(tgt);
    this.fill.position.copy(tgt).addScaledVector(back, 1.5).addScaledVector(right, 2.5).addScaledVector(up, -0.5);
    this.fill.target.position.copy(tgt);
    // debug landmark dots are instance matrices: update them before drawing (after the draw they lagged a frame, so a
    // single setTime() showed them at the previous pose)
    if (this.spec.debug) {
      cam.updateMatrixWorld();
      this.renderDebug();
    }
    this.renderer.render(this.scene, cam);
    this.renders++;
    // labels: re-solved when the pose or the camera changed, while they glide, or when the label set / UI changed
    // (a glow-only frame of a static condition view moves nothing)
    this.labelsMoving = false;
    if (this.labels.visible) {
      // (OrbitControls' spherical round trip changes the camera by ~1e-9 every update(): compare with a tolerance)
      const camMoved = !nearlyEqual(this.lastLabelCam, cam.matrixWorld) || !nearlyEqual(this.lastLabelProj, cam.projectionMatrix);
      if (posed || camMoved || this.labels.pending) {
        this.lastLabelCam.copy(cam.matrixWorld);
        this.lastLabelProj.copy(cam.projectionMatrix);
        this.anatomy.labelAnchors(this.state, this.setLabelAnchor);
        this.labels.homeView = !this.userMoved;
        // keep rendering while labels glide to new positions
        this.labelsMoving = this.labels.layout(cam, this.width, this.height, this.frameDt, this.state);
      }
    }
    if (!this.readyFired) {
      this.readyFired = true;
      this.events.onReady?.();
    }
  }

  // ───────────────────────────── debug

  private setupDebug(on: boolean) {
    if (this.lmMesh) {
      this.scene.remove(this.lmMesh);
      this.lmMesh.geometry.dispose();
      (this.lmMesh.material as MeshBasicMaterial).dispose();
      this.lmMesh = null;
    }
    this.debugLabels?.dispose();
    this.debugLabels = null;
    this.debugPanel?.remove();
    this.debugPanel = null;
    if (!on) return;
    this.lmPoints = [];
    const seen = new Set<string>();
    for (const l of LANDMARKS) {
      for (const side of ['R', 'L'] as Side[]) {
        const cp = compileRef(`${l.bone}:${l.name}` as `${string}:${string}`, side);
        if (cp.k !== 0) continue;
        const key = `${cp.seg}:${cp.local.toArray().map((v) => v.toFixed(4)).join(',')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        this.lmPoints.push({ cp, name: l.name, bone: l.bone });
      }
    }
    const mesh = new InstancedMesh(new SphereGeometry(0.0032, 8, 6), new MeshBasicMaterial({ color: '#1d6fd6', depthTest: false, transparent: true, opacity: 0.85 }), this.lmPoints.length);
    mesh.renderOrder = 20;
    mesh.frustumCulled = false;
    this.lmMesh = mesh;
    this.scene.add(mesh);
    this.debugLabels = new DebugLabels(this.overlay);
    const pre = document.createElement('pre');
    pre.className = 'tb3d-debug';
    this.overlay.appendChild(pre);
    this.debugPanel = pre;
  }

  private renderDebug() {
    if (!this.lmMesh || !this.debugLabels) return;
    const m = new Matrix4();
    const p = new Vector3();
    const named: { p: Vector3; text: string }[] = [];
    const focusPts: Vector3[] = [];
    const tgt = this.controls.target;
    const dist = this.camera.position.distanceTo(tgt);
    this.lmPoints.forEach((l, i) => {
      evalPoint(l.cp, this.state, p);
      m.makeTranslation(p.x, p.y, p.z);
      this.lmMesh!.setMatrixAt(i, m);
      const wantName = this.spec.lm ? l.bone === this.spec.lm : p.distanceTo(tgt) < dist * 0.16;
      if (wantName && named.length < 70) named.push({ p: p.clone(), text: l.name });
      focusPts.push(p);
    });
    this.lmMesh.instanceMatrix.needsUpdate = true;
    this.debugLabels.render(this.camera, this.width, this.height, named);
    if (this.debugPanel) {
      const rs = this.anatomy
        .ratios()
        .map((r) => `${r.id}_${r.side}  L/L0 ${r.ratio.toFixed(3)}  belly ${r.belly.toFixed(3)}`)
        .join('\n');
      const low: Record<string, number> = {};
      forEachSkinBox(this.state, (_a, y0, _b, _c, _d, _e, seg) => {
        const n = SEGMENTS[seg];
        low[n] = Math.min(low[n] ?? 9, y0);
      });
      const contacts = Object.entries(low)
        .filter(([, v]) => v < 0.03)
        .map(([k, v]) => `${k}:${v.toFixed(3)}`)
        .join(' ');
      this.debugPanel.textContent = `t=${this.t.toFixed(3)}  pelvis y=${this.state.pos[0].y.toFixed(3)}\n${rs}\n${this.debugInfo}\ncontacts(<3cm): ${contacts}`;
    }
  }

  /** Verify the muscle demo: action must shorten, stretch must lengthen (printed in the debug panel). */
  private verifyDemo(cc: CompiledClip) {
    const out: string[] = [];
    const st = new RigState();
    const at = (t: number) => {
      solveFK(evalClip(cc, t, newPoseVec()), st);
      placeState(cc, st);
      this.anatomy.pose(st);
      return this.anatomy.ratios();
    };
    const rest = at(0);
    const act = at(DEMO_T_ACTION);
    const str = at(DEMO_T_STRETCH);
    for (let i = 0; i < act.length; i++) {
      const ok = act[i].ratio < rest[i].ratio - 0.005 && str[i].ratio > rest[i].ratio + 0.005;
      out.push(
        `${act[i].id}: rest ${rest[i].ratio.toFixed(3)} → action ${act[i].ratio.toFixed(3)} (belly ${act[i].belly.toFixed(3)}) / stretch ${str[i].ratio.toFixed(3)} (belly ${str[i].belly.toFixed(3)})  ${ok ? 'OK ✓' : 'CHECK ✗'}`,
      );
    }
    return out.join('\n');
  }

  private clipRange(cc: CompiledClip) {
    const st = new RigState();
    const acc = new Map<string, { min: number; max: number }>();
    for (let i = 0; i <= 40; i++) {
      solveFK(evalClip(cc, i / 40, newPoseVec()), st);
      placeState(cc, st);
      this.anatomy.pose(st);
      for (const r of this.anatomy.ratios()) {
        const k = `${r.id}_${r.side}`;
        const a = acc.get(k) ?? { min: 9, max: 0 };
        a.min = Math.min(a.min, r.ratio);
        a.max = Math.max(a.max, r.ratio);
        acc.set(k, a);
      }
    }
    return [...acc.entries()].map(([k, a]) => `${k}: clip range L/L0 ${a.min.toFixed(3)} – ${a.max.toFixed(3)}`).join('\n');
  }

  // ───────────────────────────── lifecycle

  private resize() {
    const r = this.host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.clip && !this.userMoved) {
      this.home = this.computeFraming(this.clip, this.lastCam, this.lastFocus);
      this.applyHome();
      if (this.configured) {
        this.camera.lookAt(this.home.target);
        this.planLabels();
      }
    }
    this.needsRender = true;
    this.kick();
  }

  private onVis = () => {
    this.docHidden = document.visibilityState === 'hidden';
    this.kick();
  };

  private onLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.everLost = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.events.onError?.('lost', '3D表示が一時的に停止しました。');
  };

  /** The browser gave the context back (GPU reset, backgrounding): the viewer rebuilds itself (React remount). */
  private onRestored = () => {
    if (this.disposed) return;
    this.events.onRestored?.();
  };

  private themeTimer = 0;
  private onTheme = () => {
    clearTimeout(this.themeTimer);
    this.themeTimer = window.setTimeout(() => {
      const p = readPalette(this.host);
      if (JSON.stringify(p) === JSON.stringify(this.pal)) return;
      this.pal = p;
      this.figure.setPalette(p);
      this.scene.remove(this.anatomy.group, this.props.group);
      this.anatomy.dispose();
      this.props.dispose();
      this.anatomy = new AnatomyLayer(p, this.figure, this.refState);
      this.props = new PropLayer(p);
      this.scene.add(this.anatomy.group, this.props.group);
      this.reconfigureKeepingView();
    }, 60);
  };

  get isDisposed() {
    return this.disposed;
  }

  dispose() {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    clearTimeout(this.themeTimer);
    this.ro?.disconnect();
    this.io?.disconnect();
    this.mo?.disconnect();
    this.mq?.removeEventListener?.('change', this.onTheme);
    document.removeEventListener('visibilitychange', this.onVis);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.onLost);
    canvas.removeEventListener('webglcontextrestored', this.onRestored);
    this.controls.dispose();
    this.labels.dispose();
    this.debugLabels?.dispose();
    this.debugPanel?.remove();
    // detach right away (the next page commits without waiting for the GPU)
    canvas.remove();
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const later = (fn: () => void) => (ric ? ric(fn, { timeout: 600 }) : setTimeout(fn, 50));
    // after a context loss every GL object belongs to a dead context: drop the references (garbage-collected) —
    // deleting them would only log INVALID_OPERATION warnings against the restored context. A context the browser
    // restored is live again, though (the viewer remounts with a new one): release it, or it stays counted against the
    // browser's live-context cap until garbage collection.
    if (this.everLost) {
      const r = this.renderer;
      later(() => {
        try {
          if (!r.getContext().isContextLost()) r.forceContextLoss();
        } catch {
          /* already gone */
        }
      });
      return;
    }
    this.setupDebug(false);
    this.anatomy.dispose();
    this.props.dispose();
    this.figure.dispose();
    for (const m of [this.floor, this.shadow]) {
      m.geometry.dispose();
      const mat = m.material as MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    // Release the context soon (browsers cap live contexts), but not inside React's unmount: forceContextLoss waits
    // for the GPU to finish (0.2–0.3 s), which would delay the next page's first paint.
    const r = this.renderer;
    later(() => {
      r.dispose();
      r.forceContextLoss();
    });
  }
}

