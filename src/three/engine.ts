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
import { dataReady, getExerciseSafe as getExercise, getMuscleSafe as getMuscle, loadData } from './data-access';
import type { ExerciseId, MuscleId, RegionId, StructureId } from '../data/registry';
import { STRUCTURES } from '../data/registry';
import { AnatomyLayer, isMuscleId, labelName, type PartId } from './anatomy';
import { CAMERA_PRESETS, framePoints, PRESET_DIRS, REGION_CAMERA, regionMinSize, regionPoints } from './camera';
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
import { colorOf, type Palette, readPalette, xrayMaterial } from './materials';
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
import { StrandMesh } from './strands';

export interface ViewSpec {
  muscle?: MuscleId;
  exercise?: ExerciseId;
  highlights?: Partial<Record<MuscleId | StructureId, Highlight3DRole>>;
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
  onReady?: () => void;
}

export class WebGLUnavailableError extends Error {}

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
  patella: 'tibia:anterior_crest_mid',
  tibia: 'tibia:lateral_malleolus',
  foot: 'foot:met_head_3',
  toes: 'toes:toe_tips',
};
const DISTAL_FRACTION = 0.6;

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
const _proj = new Vector3();

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
  /** nerves in scope: see-through copy so a deep nerve stays visible behind muscles / bones */
  private xray: { sm: StrandMesh; role: Highlight3DRole }[] = [];
  private xrayMat = xrayMaterial();
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
    try {
      // No separate probe canvas: a probe would hold an extra WebGL context per mount (browsers cap the number of
      // live contexts and drop the oldest). WebGLRenderer throws when no context can be created.
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      throw new WebGLUnavailableError('WebGL unavailable');
    }
    this.renderer = renderer;
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
    });
    controls.addEventListener('change', () => {
      if (this.userMoved) this.clampTarget();
      this.needsRender = true;
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
      const ids = Object.keys(spec.highlights) as PartId[];
      // only structure rigs may suggest a base pose here (muscle-rig bases belong to their demo)
      const structBase = ids.map((id) => (isMuscleId(id) ? undefined : STRUCTURE_RIGS[id as StructureId]?.base)).find(Boolean);
      clipSrc = staticClip(spec.pose ?? structBase ?? 'STAND');
      scope = { ...spec.highlights };
      const firstRig = ids.map((id) => (isMuscleId(id) ? MUSCLE_RIGS[id] : STRUCTURE_RIGS[id as StructureId])).find(Boolean);
      cameraSpec = firstRig?.camera;
      focus ??= firstRig?.focus;
      // nothing rigged yet: still frame the right body region (structure registry region / muscle data)
      if (!firstRig && ids.length) focus ??= isMuscleId(ids[0]) ? getMuscle(ids[0])?.regions?.[0] : STRUCTURE_REGION.get(ids[0]);
    } else {
      this.mode = 'pose';
      clipSrc = staticClip(spec.pose ?? 'STAND');
    }
    if (spec.highlights && this.mode !== 'highlights') Object.assign(scope, spec.highlights);
    if (spec.pose && this.mode !== 'exercise' && this.mode !== 'muscle') clipSrc = { ...clipSrc, base: spec.pose };
    if ((spec.joints || spec.root) && this.mode !== 'exercise' && this.mode !== 'muscle')
      clipSrc = { ...clipSrc, pose: { joints: spec.joints, root: spec.root } };

    const cc = compileClip(clipSrc);
    this.clip = cc;
    // An authored clip / muscle rig frames itself (its own focus, or the whole movement): the page's `focus` prop is
    // only a fallback there (the UI passes the first region for every exercise / muscle).
    if (this.mode === 'exercise' && spec.exercise && CLIPS[spec.exercise]) focus = cc.focus;
    else if (this.mode === 'muscle' && spec.muscle && MUSCLE_RIGS[spec.muscle]) focus = cc.focus ?? spec.focus;
    else focus ??= cc.focus;
    const scopeSides = this.mode === 'highlights' || this.mode === 'muscle' ? [cc.side] : cc.sides;
    this.anatomy.setScope(scope, scopeSides, { markers, ghosts: !!spec.all });
    this.buildXray(scope, scopeSides);
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
    this.setupLabels(scope, scopeSides, st0);
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
    this.emitUi();
    this.kick();
  }

  private roleSwatch(role: Highlight3DRole) {
    const P = this.pal;
    return role === 'injured' ? P.injured : role === 'involved' ? P.involved : role === 'secondary' ? P.muscleLight : P.muscle;
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
      return { position: pos, target };
    }
    let preset: CameraPresetName = (typeof camSpec === 'string' ? camSpec : undefined) ?? (focus ? REGION_CAMERA[focus] : 'iso');
    if (!CAMERA_PRESETS.includes(preset)) preset = 'iso';
    const dir =
      camSpec && typeof camSpec === 'object' && 'dir' in camSpec && !spec.cam ? new Vector3(...camSpec.dir).normalize() : PRESET_DIRS[preset].clone();
    if (cc.mirror) dir.x = -dir.x;
    const pts: Vector3[] = [];
    const st = new RigState();
    const ts = cc.animated ? [0, 0.2, 0.4, 0.6, 0.8] : [0];
    let minSize = 0;
    for (const t of ts) {
      solveFK(evalClip(cc, t, newPoseVec()), st);
      placeState(cc, st);
      for (const cp of cc.frame) pts.push(evalPoint(cp, st, new Vector3()));
      if (cc.frame.length && !focus) {
        minSize = Math.max(minSize, 0.4);
        continue;
      }
      if (this.mode === 'muscle' && this.anatomy.hasVisuals) {
        this.anatomy.update(st, 0, false);
        this.anatomy.collectPoints(pts);
        minSize = focus ? regionMinSize(focus) * 0.85 : 0.42;
      } else if (focus) {
        regionPoints(focus, st, cc.side, pts);
        minSize = regionMinSize(focus);
        if (this.mode === 'highlights' && this.anatomy.hasVisuals) {
          this.anatomy.update(st, 0, false);
          this.anatomy.collectPoints(pts);
        }
      } else if (this.mode === 'highlights' && this.anatomy.hasVisuals) {
        this.anatomy.update(st, 0, false);
        this.anatomy.collectPoints(pts);
        minSize = 0.45;
      } else {
        forEachSkinBox(st, (x0, y0, z0, x1, y1, z1) => {
          pts.push(new Vector3(x0, y0, z0), new Vector3(x1, y1, z1));
        });
      }
    }
    if (!focus && !cc.frame.length) pts.push(...this.props.framing);
    const bar = this.uiControls;
    return framePoints(pts, dir, this.camera, aspect, {
      margin: focus || this.mode === 'muscle' ? 1.1 : 1.06,
      minSize,
      heightPx: this.height,
      insetTop: bar && cc.animated ? 40 : 6,
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
    this.time = Math.min(1, Math.max(0, t)) * this.clip.duration * 0.99999;
    this.needsPose = true;
    this.emitUi();
    this.kick();
  }
  resetView() {
    if (!this.home) return;
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
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
    if (!active && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private loop = (now: number) => {
    this.raf = 0;
    if (this.disposed || this.lost || !this.visible || this.docHidden) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    let render = this.needsRender;
    if (this.playing && this.clip) {
      this.time += dt * this.speed;
      this.needsPose = true;
    }
    const pulsing = this.anatomy.hasInjured && !this.reducedMotion;
    if (this.needsPose || pulsing) {
      this.updatePose(now / 1000);
      render = true;
    }
    if (this.tween) {
      const u = Math.min(1, (now - this.tween.start) / 450);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      this.camera.position.lerpVectors(this.tween.from.p, this.tween.to.p, e);
      this.controls.target.lerpVectors(this.tween.from.t, this.tween.to.t, e);
      if (u >= 1) this.tween = null;
      render = true;
    }
    if (this.controls.update()) render = true;
    if (render) this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private updatePose(seconds: number) {
    const cc = this.clip;
    if (!cc) return;
    if (this.needsPose) {
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

  private render() {
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
    this.renderer.render(this.scene, cam);
    this.renders++;
    // labels
    if (this.labels.visible) {
      this.anatomy.labelAnchors(this.state, this.setLabelAnchor);
      const c = _proj.copy(tgt).project(cam);
      this.labels.layout(cam, this.width, this.height, ((c.x + 1) / 2) * this.width);
    }
    if (this.spec.debug) this.renderDebug();
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
      this.anatomy.update(st, 0, false);
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
      this.anatomy.update(st, 0, false);
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
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.events.onError?.('lost', '3D表示が一時的に停止しました。');
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
    clearTimeout(this.themeTimer);
    this.ro?.disconnect();
    this.io?.disconnect();
    this.mo?.disconnect();
    this.mq?.removeEventListener?.('change', this.onTheme);
    document.removeEventListener('visibilitychange', this.onVis);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onLost);
    this.controls.dispose();
    this.setupDebug(false);
    this.anatomy.dispose();
    this.props.dispose();
    this.labels.dispose();
    this.figure.dispose();
    for (const m of [this.floor, this.shadow]) {
      m.geometry.dispose();
      const mat = m.material as MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.renderer.dispose();
    // release the GL context right away (browsers cap live contexts); a lost context is already released
    if (!this.lost) this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

