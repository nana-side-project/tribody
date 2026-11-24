// Muscles & structures in the scene: builds strands / bursae / spots for the ids in scope,
// applies highlight roles, length-driven thickness & colour, origin/insertion markers and glow.
import {
  Color,
  GreaterDepth,
  Group,
  type HSL,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { MuscleId, StructureId } from '../data/registry';
import { MUSCLES, STRUCTURES } from '../data/registry';
import type { Highlight3DRole } from './contract';
import { type AttachRef, type CompiledPoint, evalPoint, pointSeg, tryCompile } from './landmarks';
import { colorOf, haloMaterial, type Palette, solid, strandMaterial } from './materials';
import type { RigState, Side } from './rig';
import { MUSCLE_RIGS, STRUCTURE_RIGS } from './rig-data';
import type { StructurePart } from './rig-data/types';
import { type BonePartId, isMidlinePart } from './skeleton-parts';
import { RINGS, SegmentMesh, StrandMesh } from './strands';

export type PartId = MuscleId | StructureId;
export type Role = Highlight3DRole | 'ghost';

const MUSCLE_SET = new Set<string>(MUSCLES.map((m) => m.id));
export const isMuscleId = (id: string): id is MuscleId => MUSCLE_SET.has(id);
const JA = new Map<string, string>([...MUSCLES.map((m) => [m.id, m.ja] as const), ...STRUCTURES.map((s) => [s.id, s.ja] as const)]);
export const jaName = (id: string) => JA.get(id) ?? id;
/** Short label: drop long parenthetical notes. */
export function labelName(id: string): string {
  const n = jaName(id);
  if (n.length <= 9) return n;
  return n.replace(/（[^）]*）/g, '').trim() || n;
}

export interface BonePartHooks {
  tint: (part: string, side: Side | null, color: Color | null, emissive: number) => void;
}

interface Blob {
  mesh: Mesh;
  halo: Mesh | null;
  /** see-through copy (drawn only where something hides the blob) */
  xray: Mesh | null;
  cp: CompiledPoint;
  seg: number;
  off: Vector3;
  radii: Vector3;
  cushion?: 'cartilage' | 'fatpad';
}

interface Visual {
  id: PartId;
  /** injured: this part carries the view's one pulsing glow (+ halo); other injured parts are steady red */
  pulse: boolean;
  /** secondary drawn muted (something else is 'selected') */
  muted: boolean;
  /** a lesion zone on this part carries its label (see Zone) */
  noLabel: boolean;
  side: Side;
  role: Role;
  kind: 'muscle' | 'structure';
  strands: StrandMesh[];
  /** cushions, spots: world-space meshes following a point */
  blobs: Blob[];
  bones: { part: string; side: Side | null }[];
  material: MeshStandardMaterial;
  haloMat: ShaderMaterial | null;
  partType?: StructurePart['type'];
  belly: Color;
  tendon: Color;
  labelCp: CompiledPoint | null;
  markers: { mesh: Mesh; strand: StrandMesh; end: 0 | 1 }[];
  /** the structure also marks a focal point (spot): its bone tint stays lighter so the spot reads as the lesion */
  hasSpot: boolean;
  /** see-through copies of the strands (nerves; injured parts on condition pages) */
  xray: StrandMesh[];
  xrayColor: Color;
}

/** A lesion zone drawn on a part (scenes.ts `zones`): an injured-red cuff over a stretch of one of the part's strands
 *  (`range`, arc-length fractions) or a spot at a point (`at`). It replaces the part's label and may carry the view's
 *  pulse. */
export interface ZoneSpec {
  /** unique key (label / pulse target) */
  key: string;
  /** the part the lesion lies in */
  on: PartId;
  /** which strand / cord of the part (default 0) */
  strand?: number;
  /** arc-length fractions along that strand, 0 = its first path point … 1 = its last */
  range?: [number, number];
  /** cuff radius multiplier over the strand's (default 1.45) */
  grow?: number;
  /** or a spot at a point (radius m). Neither range nor at: the structure's own spot part (its focal lesion marker,
   *  e.g. the tibia's stress-fracture site), which the zone then replaces */
  at?: AttachRef;
  radius?: number;
}

interface Zone {
  spec: ZoneSpec;
  side: Side;
  pulse: boolean;
  seg: SegmentMesh | null;
  blob: Mesh | null;
  blobHalo: Mesh | null;
  blobXray: Mesh | null;
  cp: CompiledPoint | null;
  segIdx: number;
  /** point zone radius (m) */
  radius: number;
  material: MeshStandardMaterial;
  haloMat: ShaderMaterial | null;
}

export interface ScopeOptions {
  markers: boolean;
  ghosts: boolean;
  /** draw these parts translucent (opacity 0..1) — superficial parts that would hide the injured tissue */
  fade?: Partial<Record<PartId, number>>;
  /** injured parts get a see-through copy wherever other anatomy hides them (condition pages) */
  xrayInjured?: boolean;
  /** sides per part (default: `sides`): a scene's bilateral parts, a clip's `partSides` */
  sidesOf?: (id: PartId) => Side[];
  /** the ONE injured part (or zone key) that pulses with a halo; the other injured parts are steady red.
   *  undefined = the first injured part of the scope; null = nothing pulses (a 'sensitive' scene) */
  pulse?: string | null;
  /** lesion zones (scenes.ts) */
  zones?: ZoneSpec[];
  /** per-view overrides of structure rigs (scenes.ts `structures`): the bone pieces its `bone` part tints and its
   *  label anchor (Morton's neuroma: the 3rd / 4th metatarsals around the nerve; the `metatarsals` rig itself tints the
   *  stress-fracture rays 2–3) */
  structures?: Partial<Record<StructureId, StructureOverride>>;
}

/** A structure rig as one view needs it (a rig cannot vary by condition). */
export interface StructureOverride {
  /** bone pieces / group aliases tinted instead of the rig's `bone` part(s) */
  bones?: readonly BonePartId[];
  /** label anchor instead of the rig's `labelAt` */
  labelAt?: AttachRef;
}

/** emissive level of a steady (non-pulsing) injured part: about the pulse's mean, so it reads as the same red */
const STEADY = 0.45;
/** opacity of the secondary muscles while one is 'selected' (region pages) */
const MUTED_OPACITY = 0.5;

const _v = new Vector3();
const _q = new Quaternion();
const _col = new Color();
const _tint = new Color();
const _hsl: HSL = { h: 0, s: 0, l: 0 };

/** Injured spots (fracture site, impingement point…) are drawn larger than their rig radius: the focal point must be
 *  the brightest, clearest red in the view. */
const INJURED_SPOT_SCALE = 1.45;
/** see-through copies are a touch larger than the part so they never draw over its own visible surface */
const XRAY_GROW = 1.06;

export class AnatomyLayer {
  readonly group = new Group();
  private visuals: Visual[] = [];
  private markerGeo = new SphereGeometry(1, 14, 10);
  private blobGeo = new SphereGeometry(1, 24, 16);
  private originMat: MeshStandardMaterial;
  private insertionMat: MeshStandardMaterial;
  /** see-through copies: vertex-coloured strands / plain blobs, drawn only where they are behind something */
  private xrayStrandMat: MeshBasicMaterial;
  private xrayNerveMat: MeshBasicMaterial;
  /** the selected muscle's copy: stronger (it is what the user tapped, often behind the ribs / pelvis) */
  private xraySelectedMat: MeshBasicMaterial;
  private pulse = 0;
  private zones: Zone[] = [];
  missing: PartId[] = [];

  constructor(
    private pal: Palette,
    private bones: BonePartHooks,
    private refState: RigState,
  ) {
    this.originMat = solid(pal.origin, { roughness: 0.35, emissive: pal.origin, emissiveIntensity: 0.35 });
    this.insertionMat = solid(pal.insertion, { roughness: 0.35, emissive: pal.insertion, emissiveIntensity: 0.35 });
    this.xrayStrandMat = xrayHidden(0.55);
    this.xrayNerveMat = xrayHidden(0.5);
    this.xraySelectedMat = xrayHidden(0.78);
  }

  /** Replace the displayed set. */
  setScope(scope: Partial<Record<PartId, Highlight3DRole>>, sides: Side[], opts: ScopeOptions) {
    this.clear();
    this.missing = [];
    const entries = (Object.entries(scope) as [PartId, Highlight3DRole][]).filter(([, r]) => !!r);
    // one pulse per view: the scene's / caller's choice, else the first injured part (content order)
    const pulseKey = opts.pulse === undefined ? (entries.find(([, r]) => r === 'injured')?.[0] ?? null) : opts.pulse;
    // something selected (region page chip): the other key muscles step back (muted, translucent)
    const muted = entries.some(([, r]) => r === 'selected');
    // a zone is the part's lesion marker: the part's own spots give way to it
    const zoned = new Set<string>((opts.zones ?? []).map((z) => z.on));
    for (const [id, role] of entries) {
      let any = false;
      // an injured part is never faded (it is what the view is about)
      const fade = role === 'injured' ? undefined : opts.fade?.[id];
      let op = typeof fade === 'number' && fade < 1 ? Math.max(0.05, fade) : 1;
      const mute = muted && role === 'secondary';
      if (mute) op = Math.min(op, MUTED_OPACITY);
      const pulse = role === 'injured' && pulseKey === id;
      for (const side of opts.sidesOf?.(id) ?? sides) {
        const v = isMuscleId(id)
          ? this.buildMuscle(id, side, role, opts.markers, op, pulse)
          : this.buildStructure(id as StructureId, side, role, op, pulse, zoned.has(id), opts.structures?.[id as StructureId]);
        if (v) {
          v.muted = mute;
          // see-through copies: nerves always; injured parts on condition pages; the selected muscle (a deep one would
          // otherwise be lost under the superficial muscles / bones)
          if (v.partType === 'nerve' || (opts.xrayInjured && role === 'injured') || role === 'selected') this.addXray(v);
          this.visuals.push(v);
          any = true;
        }
      }
      if (!any) this.missing.push(id);
    }
    for (const z of opts.zones ?? []) this.buildZone(z, pulseKey === z.key, !!opts.xrayInjured);
    if (opts.ghosts) {
      for (const id of Object.keys(MUSCLE_RIGS) as MuscleId[]) {
        if (scope[id]) continue;
        for (const side of ['R', 'L'] as Side[]) {
          const v = this.buildMuscle(id, side, 'ghost', false, 1);
          if (v) this.visuals.push(v);
        }
      }
    }
  }

  get hasVisuals() {
    return this.visuals.some((v) => v.role !== 'ghost');
  }
  get hasInjured() {
    return this.visuals.some((v) => v.role === 'injured') || this.zones.length > 0;
  }
  /** something glows with the (animated) injured pulse */
  get hasPulse() {
    return this.visuals.some((v) => v.pulse) || this.zones.some((z) => z.pulse);
  }

  /** Lesion zone on an already built part (each side it is drawn on). */
  private buildZone(z: ZoneSpec, pulse: boolean, xray: boolean) {
    for (const v of this.visuals) {
      if (v.id !== z.on || v.role === 'ghost') continue;
      const material = solid(this.pal.injured, { roughness: 0.42, emissive: this.pal.injured, emissiveIntensity: STEADY });
      const zone: Zone = {
        spec: z,
        side: v.side,
        pulse,
        seg: null,
        blob: null,
        blobHalo: null,
        blobXray: null,
        cp: null,
        segIdx: 0,
        radius: z.radius ?? 0.006,
        material,
        haloMat: null,
      };
      if (pulse) zone.haloMat = haloMaterial(this.pal.injured);
      if (z.range) {
        const parent = v.strands[z.strand ?? 0];
        if (!parent) {
          material.dispose();
          zone.haloMat?.dispose();
          console.warn(`[tribody] zone ${z.key}: ${z.on} has no strand ${z.strand ?? 0}`);
          continue;
        }
        const seg = new SegmentMesh(parent, z.range, material, z.grow ?? 1.45);
        seg.mesh.renderOrder = 5;
        this.group.add(seg.mesh);
        if (zone.haloMat) {
          seg.enableHalo(zone.haloMat);
          this.group.add(seg.halo!);
        }
        if (xray) {
          seg.enableXray(new MeshBasicMaterial({ color: colorOf(this.pal.injured), transparent: true, opacity: 0.55, depthTest: true, depthFunc: GreaterDepth, depthWrite: false }));
          this.group.add(seg.xray!);
        }
        zone.seg = seg;
      } else if (z.at || v.kind === 'structure') {
        // a point zone: `at`, else the structure's own spot (its rig's focal lesion marker)
        const spot = z.at ? null : STRUCTURE_RIGS[v.id as StructureId]?.parts.find((p) => p.type === 'spot');
        const at = z.at ?? (spot && 'at' in spot ? spot.at : null);
        if (!at) {
          material.dispose();
          zone.haloMat?.dispose();
          console.warn(`[tribody] zone ${z.key}: no range / at and ${z.on} has no spot`);
          continue;
        }
        if (spot && spot.type === 'spot' && z.radius === undefined) zone.radius = spot.radius * INJURED_SPOT_SCALE;
        const cp = tryCompile(at, v.side, `zone ${z.key}`);
        if (!cp) {
          material.dispose();
          zone.haloMat?.dispose();
          continue;
        }
        zone.cp = cp;
        zone.segIdx = pointSeg(cp);
        zone.blob = new Mesh(this.blobGeo, material);
        zone.blob.renderOrder = 5;
        this.group.add(zone.blob);
        if (zone.haloMat) {
          zone.blobHalo = new Mesh(this.blobGeo, zone.haloMat);
          zone.blobHalo.renderOrder = 5;
          this.group.add(zone.blobHalo);
        }
        if (xray) {
          zone.blobXray = new Mesh(
            this.blobGeo,
            new MeshBasicMaterial({ color: colorOf(this.pal.injured), transparent: true, opacity: 0.55, depthTest: true, depthFunc: GreaterDepth, depthWrite: false }),
          );
          zone.blobXray.renderOrder = 6;
          this.group.add(zone.blobXray);
        }
      } else {
        material.dispose();
        zone.haloMat?.dispose();
        continue;
      }
      v.noLabel = true;
      this.zones.push(zone);
    }
  }

  private placeZone(z: Zone, state: RigState, geometry: boolean) {
    if (z.seg) {
      if (geometry) z.seg.write();
      else z.seg.pose();
    } else if (z.blob && z.cp) {
      evalPoint(z.cp, state, _v);
      const r = z.radius;
      z.blob.position.copy(_v);
      z.blob.scale.setScalar(r);
      if (z.blobHalo) {
        z.blobHalo.position.copy(_v);
        z.blobHalo.scale.setScalar(r * 1.75 + 0.004);
      }
      if (z.blobXray) {
        z.blobXray.position.copy(_v);
        z.blobXray.scale.setScalar(r * XRAY_GROW);
      }
    }
  }

  private zoneEmissive(z: Zone) {
    const e = z.pulse ? 0.2 + 0.45 * this.pulse : STEADY;
    z.material.emissiveIntensity = e;
    if (z.haloMat) z.haloMat.uniforms.uIntensity.value = 0.3 + 0.45 * this.pulse;
  }

  /** centre of a zone (label anchor) */
  private zoneCentre(z: Zone, out: Vector3) {
    if (z.seg) return out.copy(z.seg.rings[Math.floor(z.seg.rings.length / 2)]);
    if (z.blob) return out.copy(z.blob.position);
    return null;
  }

  private makeMaterial(role: Role, opacity: number): MeshStandardMaterial {
    if (role === 'ghost') return strandMaterial({ transparent: true, opacity: 0.28 });
    if (opacity < 1) return strandMaterial({ transparent: true, opacity });
    return strandMaterial();
  }

  private newVisual(id: PartId, side: Side, role: Role, kind: Visual['kind'], material: MeshStandardMaterial, pulse = false): Visual {
    return {
      id,
      pulse: role === 'injured' && pulse,
      muted: false,
      noLabel: false,
      side,
      role,
      kind,
      strands: [],
      blobs: [],
      bones: [],
      material,
      haloMat: null,
      belly: new Color(),
      tendon: new Color(this.pal.tendon),
      labelCp: null,
      markers: [],
      hasSpot: false,
      xray: [],
      xrayColor: new Color(),
    };
  }

  private buildMuscle(id: MuscleId, side: Side, role: Role, markers: boolean, opacity: number, pulse = false): Visual | null {
    const rig = MUSCLE_RIGS[id];
    if (!rig || !rig.strands?.length) return null;
    const material = this.makeMaterial(role, opacity);
    const v = this.newVisual(id, side, role, 'muscle', material, pulse);
    for (const [i, s] of rig.strands.entries()) {
      const cps = s.path.map((r, k) => tryCompile(r, side, `${id} strand ${s.name ?? i} point ${k}`));
      if (cps.some((c) => !c) || cps.length < 2) continue;
      const sm = new StrandMesh(cps as CompiledPoint[], { radius: s.radius, tendon: s.tendon ?? [0, 0], kind: 'muscle', flat: s.flat }, material, side);
      sm.setRest(sm.measure(this.refState));
      if (role === 'ghost' || opacity < 1) sm.mesh.renderOrder = 4;
      this.group.add(sm.mesh);
      v.strands.push(sm);
    }
    if (!v.strands.length) {
      material.dispose();
      return null;
    }
    // the halo is the view's ONE pulse: other injured parts are steady red without it
    if (v.pulse) this.addHalo(v, this.pal.injured);
    if (markers) this.addMarkers(v);
    return v;
  }

  private addHalo(v: Visual, color: string) {
    v.haloMat = haloMaterial(color);
    for (const s of v.strands) {
      s.enableHalo(v.haloMat);
      this.group.add(s.halo!);
    }
  }

  /** See-through copy: drawn after the opaque anatomy and before the skin, only where something is in front of the
   *  part (depth test GREATER), so a deep nerve or an injured tendon under a superficial muscle stays visible while
   *  its visible parts look exactly as before. */
  private addXray(v: Visual) {
    const nerve = v.partType === 'nerve';
    const mat = nerve ? this.xrayNerveMat : v.role === 'selected' ? this.xraySelectedMat : this.xrayStrandMat;
    for (const s of v.strands) {
      const p = s.profile;
      const sm = new StrandMesh(s.ctrl, { ...p, radius: p.radius * XRAY_GROW, flat: p.flat && { ...p.flat, width: p.flat.width * XRAY_GROW } }, mat, v.side);
      sm.setRest(s.L0);
      sm.mesh.renderOrder = 6;
      this.group.add(sm.mesh);
      v.xray.push(sm);
    }
    for (const b of v.blobs) {
      const m = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthTest: true, depthFunc: GreaterDepth, depthWrite: false });
      b.xray = new Mesh(this.blobGeo, m);
      b.xray.renderOrder = 6;
      this.group.add(b.xray);
    }
  }

  private addMarkers(v: Visual) {
    const seen: Vector3[] = [];
    for (const s of v.strands) {
      for (const end of [0, 1] as const) {
        s.measure(this.refState);
        const p = s.rings[end === 0 ? 0 : RINGS - 1].clone();
        if (seen.some((q) => q.distanceTo(p) < 0.008)) continue;
        seen.push(p);
        const mesh = new Mesh(this.markerGeo, end === 0 ? this.originMat : this.insertionMat);
        mesh.scale.setScalar(0.0068);
        mesh.renderOrder = 3;
        this.group.add(mesh);
        v.markers.push({ mesh, strand: s, end });
      }
    }
  }

  private buildStructure(
    id: StructureId,
    side: Side,
    role: Role,
    opacity: number,
    pulse = false,
    zoned = false,
    over?: StructureOverride,
  ): Visual | null {
    const rig = STRUCTURE_RIGS[id];
    if (!rig || !rig.parts?.length) return null;
    const v = this.newVisual(id, side, role, 'structure', null!, pulse);
    v.tendon = new Color();
    const labelAt = over?.labelAt ?? rig.labelAt;
    v.labelCp = labelAt ? tryCompile(labelAt, side, `${id} labelAt`) : null;
    const firstType = rig.parts[0].type;
    v.partType = firstType;
    const baseColor = this.structureColor(firstType);
    const transparent = firstType === 'fascia' || firstType === 'bursa' || firstType === 'spot' || opacity < 1;
    const baseOpacity = firstType === 'fascia' ? 0.88 : firstType === 'bursa' ? 0.82 : firstType === 'spot' ? 0.6 : 1;
    v.material = solid(baseColor, {
      roughness: firstType === 'bursa' ? 0.3 : 0.5,
      transparent,
      opacity: baseOpacity * opacity,
    });
    if (firstType !== 'bone' && firstType !== 'spot' && firstType !== 'bursa' && firstType !== 'cartilage' && firstType !== 'fatpad') {
      // strands use vertex colours
      v.material.dispose();
      v.material = firstType === 'fascia' || opacity < 1 ? strandMaterial({ transparent: true, opacity: baseOpacity * opacity }) : strandMaterial();
    }
    // a focal spot (fracture site, impingement point) is a lesion marker: shown when the structure is the injured
    // tissue; on a merely involved structure (e.g. the tibia in shin splints) it would read as a focal injury
    const hasOther = rig.parts.some((p) => p.type !== 'spot');
    // (a lesion zone on this structure is its focal marker instead: the bone tint stays as light as with a spot)
    const showSpots = (role === 'injured' || !hasOther) && !zoned;
    v.hasSpot = (showSpots || (zoned && role === 'injured')) && rig.parts.some((p) => p.type === 'spot');
    // injured: only the pulsing part has a halo; a spot-only structure in another role keeps its soft static glow
    const needHalo = role === 'injured' ? v.pulse : firstType === 'spot' && showSpots;
    if (needHalo) v.haloMat = haloMaterial(role === 'injured' ? this.pal.injured : this.roleColor(role, baseColor));
    for (const [i, part] of rig.parts.entries()) {
      if ('path' in part) {
        const cps = part.path.map((r, k) => tryCompile(r, side, `${id} part ${i} point ${k}`));
        if (cps.some((c) => !c) || cps.length < 2) continue;
        const sm = new StrandMesh(cps as CompiledPoint[], { radius: part.radius, tendon: [0, 0], kind: 'cord', flat: part.flat }, v.material, side);
        sm.setRest(sm.measure(this.refState));
        if (v.haloMat) {
          sm.enableHalo(v.haloMat);
          this.group.add(sm.halo!);
        }
        if (part.type === 'fascia' || opacity < 1) sm.mesh.renderOrder = 4;
        this.group.add(sm.mesh);
        v.strands.push(sm);
      } else if ('parts' in part) {
        for (const p of over?.bones ?? part.parts) v.bones.push({ part: p, side: isMidlinePart(p) ? null : side });
      } else {
        if (part.type === 'spot' && !showSpots) continue;
        const cp = tryCompile(part.at, side, `${id} part ${i}`);
        if (!cp) continue;
        const rs = part.type === 'spot' ? part.radius * (role === 'injured' ? INJURED_SPOT_SCALE : 1) : 0;
        const radii = part.type === 'spot' ? new Vector3(rs, rs, rs) : new Vector3(part.radii[0], part.radii[1], part.radii[2]);
        const offIn = part.type === 'spot' ? [0, 0, 0] : (part.off ?? [0, 0, 0]);
        const off = new Vector3(side === 'R' ? -offIn[0] : offIn[0], offIn[1], offIn[2]);
        const mat = part.type === 'spot' ? v.material : this.cushionMaterial(part.type, v, opacity);
        const mesh = new Mesh(this.blobGeo, mat);
        // spots / bursae draw after translucent sheets (an injured spot under the ITB must not be washed out by it)
        mesh.renderOrder = part.type === 'spot' || part.type === 'bursa' ? 5 : opacity < 1 ? 4 : 0;
        this.group.add(mesh);
        let halo: Mesh | null = null;
        if (v.haloMat) {
          halo = new Mesh(this.blobGeo, v.haloMat);
          halo.renderOrder = 5;
          this.group.add(halo);
        }
        const cushion = part.type === 'cartilage' || part.type === 'fatpad' ? part.type : undefined;
        v.blobs.push({ mesh, halo, xray: null, cp, seg: pointSeg(cp), off, radii, cushion });
      }
    }
    if (!v.strands.length && !v.blobs.length && !v.bones.length) {
      v.material.dispose();
      return null;
    }
    return v;
  }

  private cushionMaterial(type: StructurePart['type'], v: Visual, opacity: number): Material {
    if (type === 'bursa') return v.material;
    const c = type === 'fatpad' ? '#f0d9a8' : this.pal.cartilage;
    return solid(c, { roughness: 0.4, transparent: opacity < 1, opacity });
  }

  private structureColor(type: StructurePart['type']): string {
    switch (type) {
      case 'nerve':
        return this.pal.nerve;
      case 'bursa':
        return this.pal.bursa;
      case 'cartilage':
        return this.pal.cartilage;
      case 'fatpad':
        return '#f0d9a8';
      case 'spot':
        return this.pal.injured;
      default:
        return this.pal.tendon;
    }
  }

  private roleColor(role: Role, fallback: string): string {
    switch (role) {
      case 'injured':
        return this.pal.injured;
      case 'involved':
        return this.pal.involved;
      case 'primary':
      case 'selected':
        return this.pal.muscle;
      case 'secondary':
        return this.pal.muscleLight;
      default:
        return fallback;
    }
  }

  /** Belly colour for a muscle by role and length ratio. */
  private muscleColor(role: Role, ratio: number, out: Color, muted = false): Color {
    const P = this.pal;
    if (muted) {
      // a key muscle in the background while another one is selected: greyed, low-saturation version of its colour
      out.copy(colorOf(P.muscle)).lerp(colorOf(P.muscleLight), 0.5);
      out.getHSL(_hsl, SRGBColorSpace);
      const l = P.dark ? _hsl.l * 0.75 + 0.25 * 0.36 : _hsl.l * 0.55 + 0.45 * 0.8;
      return out.setHSL(_hsl.h, _hsl.s * 0.32, l, SRGBColorSpace);
    }
    switch (role) {
      case 'injured':
        // stays red whatever the length: shorter a little deeper, longer a little lighter (thickness shows the rest)
        return this.tone(out.copy(colorOf(P.injured)), ratio, 0.08, 0.05);
      case 'involved':
        // stays amber (blending toward the muscle's pinks would turn it salmon)
        return this.tone(out.copy(colorOf(P.involved)), ratio, 0.1, 0.1);
      case 'secondary':
        out.copy(colorOf(P.muscle)).lerp(colorOf(P.muscleLight), 0.5);
        break;
      case 'ghost':
        return out.copy(colorOf(P.ghost));
      default:
        out.copy(colorOf(P.muscle));
        // a touch more saturated for primary
        out.lerp(colorOf('#c8382f'), P.dark ? 0.1 : 0.22);
    }
    if (ratio > 1) out.lerp(colorOf(P.muscleLight), Math.min(1, (ratio - 1) / 0.22) * 0.8);
    else out.lerp(colorOf(P.muscleDeep), Math.min(1, (1 - ratio) / 0.2) * 0.75);
    return out;
  }

  /** Same hue, length-dependent lightness: shorter → deeper (−deep), longer → lighter (light theme) or more muted
   *  (dark theme, like --muscle-light there) by up to `long`. */
  private tone(out: Color, ratio: number, deep: number, long: number): Color {
    out.getHSL(_hsl, SRGBColorSpace);
    if (ratio < 1) {
      const f = Math.min(1, (1 - ratio) / 0.2);
      _hsl.l -= deep * f;
    } else {
      const f = Math.min(1, (ratio - 1) / 0.22);
      if (this.pal.dark) {
        _hsl.l -= long * 0.7 * f;
        _hsl.s -= long * 1.6 * f;
      } else {
        _hsl.l += long * f;
        _hsl.s -= long * 1.2 * f;
      }
    }
    return out.setHSL(_hsl.h, Math.min(1, Math.max(0, _hsl.s)), Math.min(0.95, Math.max(0.05, _hsl.l)), SRGBColorSpace);
  }

  /** Bone tint colour by role. The figure lerps the bone 62 % toward this colour, so an injured bone without a focal
   *  spot gets a boosted red (reads as a red glow, not pale pink); a bone that also has a spot, or is only involved,
   *  stays lighter so the lesion / the injured part next to it is the strongest red. */
  private boneTint(v: Visual): Color {
    const bone = colorOf(this.pal.bone);
    const c = colorOf(this.roleColor(v.role, this.pal.muscle));
    if (v.role === 'injured' && !v.hasSpot) {
      // extrapolate past the role colour (clamped): bone.lerp(result, 0.62) ≈ the injured red. Per channel by hand:
      // Color.sub() clamps every channel at 0, which turned the light theme's tint back into plain bone (the
      // injured patella of patellofemoral pain rendered untinted) and left the dark one salmon.
      const ex = (b: number, x: number) => Math.min(1, Math.max(0, b + (x - b) / 0.62));
      return _tint.setRGB(ex(bone.r, c.r), ex(bone.g, c.g), ex(bone.b, c.b));
    }
    return _tint.copy(bone).lerp(c, v.role === 'injured' ? 0.6 : 0.7);
  }

  private boneEmissive(v: Visual) {
    const p = v.pulse ? this.pulse : STEADY;
    if (v.role === 'injured') return v.hasSpot ? 0.06 + 0.12 * p : 0.14 + 0.4 * p;
    return v.role === 'involved' ? 0.06 : 0.05;
  }

  /** Per-frame update (geometry + colours). `time` (s) drives the injured pulse; pass a constant to freeze it. */
  update(state: RigState, time: number, pulse = true) {
    this.pulse = pulse ? 0.5 + 0.5 * Math.sin(time * 3.2) : 0.6;
    for (const v of this.visuals) {
      const role = v.role;
      const emph = role === 'primary' || role === 'selected' ? 1.08 : role === 'injured' ? 1.12 : role === 'ghost' ? 0.9 : 1;
      if (v.kind === 'muscle') {
        for (const s of v.strands) {
          // measure first: the colour follows the CURRENT belly ratio (not the previous frame's / a pre-pass sample)
          s.pose(state);
          this.muscleColor(role, s.bellyRatio, v.belly, v.muted);
          s.write(v.belly, v.tendon, emph);
        }
        if (v.xray.length) {
          if (role === 'selected') v.xrayColor.copy(colorOf(this.pal.muscle)).lerp(colorOf('#c8382f'), this.pal.dark ? 0.1 : 0.22);
          else v.xrayColor.copy(colorOf(this.pal.injured));
        }
        this.muscleEmissive(v);
      } else {
        const type = v.partType!;
        const base = this.structureColor(type);
        if (role === 'injured') _col.copy(colorOf(base)).lerp(colorOf(this.pal.injured), type === 'spot' ? 1 : 0.78);
        else if (role === 'involved') _col.copy(colorOf(base)).lerp(colorOf(this.pal.involved), 0.72);
        else if (type === 'spot') _col.copy(colorOf(this.roleColor(role, base)));
        else _col.copy(colorOf(base));
        v.belly.copy(_col);
        v.tendon.copy(_col);
        v.xrayColor.copy(role === 'injured' ? colorOf(this.pal.injured) : role === 'involved' ? colorOf(this.pal.involved) : _col);
        for (const s of v.strands) s.update(state, v.belly, v.tendon, role === 'primary' || role === 'selected' ? 1.12 : 1);
        const m = v.material;
        if (m && 'color' in m && !(m as MeshStandardMaterial).vertexColors) (m as MeshStandardMaterial).color.copy(_col);
        if (m && role !== 'injured') {
          if (role === 'primary' || role === 'selected') {
            m.emissive.copy(_col);
            m.emissiveIntensity = 0.12;
          } else m.emissiveIntensity = 0;
        }
        for (const b of v.blobs) {
          if (b.cushion && b.mesh.material !== m) {
            // cartilage / fat-pad cushions have their own material: tint it by role like the rest of the structure
            const cm = b.mesh.material as MeshStandardMaterial;
            const cb = colorOf(this.structureColor(b.cushion));
            if (role === 'injured') cm.color.copy(cb).lerp(colorOf(this.pal.injured), 0.78);
            else if (role === 'involved') cm.color.copy(cb).lerp(colorOf(this.pal.involved), 0.72);
            else cm.color.copy(cb);
            if (role === 'involved') {
              cm.emissive.copy(colorOf(this.pal.involved));
              cm.emissiveIntensity = 0.1;
            } else if (role !== 'injured') cm.emissiveIntensity = 0;
          }
          if (b.xray) (b.xray.material as MeshBasicMaterial).color.copy(v.xrayColor);
        }
        this.placeBlobs(v, state);
        if (role !== 'injured') for (const bp of v.bones) this.bones.tint(bp.part, bp.side, this.boneTint(v), this.boneEmissive(v));
        this.structureEmissive(v);
      }
      if (v.xray.length) {
        // same emphasis as the part itself (the copy must stay just outside its surface)
        const thick = v.kind === 'muscle' ? emph : role === 'primary' || role === 'selected' ? 1.12 : 1;
        for (const x of v.xray) {
          x.pose(state);
          x.write(v.xrayColor, v.xrayColor, thick);
        }
      }
      if (v.haloMat) v.haloMat.uniforms.uIntensity.value = role === 'injured' ? 0.3 + 0.45 * this.pulse : 0.45;
      for (const mk of v.markers) {
        const s = mk.strand;
        mk.mesh.position.copy(s.rings[mk.end === 0 ? 0 : RINGS - 1]);
      }
    }
    // zones last: they read their part's freshly written rings / radii
    for (const z of this.zones) {
      this.placeZone(z, state, true);
      this.zoneEmissive(z);
    }
  }

  /** Only the injured glow pulse (no geometry): emissive intensities, halo strength and bone tints. */
  updatePulse(time: number) {
    this.pulse = 0.5 + 0.5 * Math.sin(time * 3.2);
    for (const v of this.visuals) {
      if (!v.pulse) continue;
      if (v.kind === 'muscle') this.muscleEmissive(v);
      else this.structureEmissive(v);
      if (v.haloMat) v.haloMat.uniforms.uIntensity.value = 0.3 + 0.45 * this.pulse;
    }
    for (const z of this.zones) if (z.pulse) this.zoneEmissive(z);
  }

  private muscleEmissive(v: Visual) {
    const m = v.material;
    const role = v.role;
    if (role === 'injured') {
      m.emissive.copy(colorOf(this.pal.injured));
      m.emissiveIntensity = 0.18 + 0.4 * (v.pulse ? this.pulse : STEADY);
    } else if (role === 'primary' || role === 'selected') {
      m.emissive.copy(colorOf(this.pal.muscle));
      m.emissiveIntensity = role === 'selected' ? 0.32 : 0.1;
    } else if (role === 'involved') {
      m.emissive.copy(colorOf(this.pal.involved));
      m.emissiveIntensity = 0.12;
    } else m.emissiveIntensity = 0;
  }

  /** time-dependent part of a structure's look (injured: pulsing emissive on the material, cushions and bones) */
  private structureEmissive(v: Visual) {
    if (v.role !== 'injured') return;
    const m = v.material;
    const e = 0.15 + 0.45 * (v.pulse ? this.pulse : STEADY);
    if (m) {
      m.emissive.copy(colorOf(this.pal.injured));
      m.emissiveIntensity = e;
    }
    for (const b of v.blobs) {
      if (b.cushion && b.mesh.material !== m) {
        const cm = b.mesh.material as MeshStandardMaterial;
        cm.emissive.copy(colorOf(this.pal.injured));
        cm.emissiveIntensity = e;
      }
    }
    for (const bp of v.bones) this.bones.tint(bp.part, bp.side, this.boneTint(v), this.boneEmissive(v));
  }

  private placeBlobs(v: Visual, state: RigState) {
    for (const b of v.blobs) {
      evalPoint(b.cp, state, _v);
      _q.copy(state.quat[b.seg]);
      b.mesh.position.copy(b.off).applyQuaternion(_q).add(_v);
      b.mesh.quaternion.copy(_q);
      b.mesh.scale.copy(b.radii);
      if (b.halo) {
        b.halo.position.copy(b.mesh.position);
        b.halo.quaternion.copy(_q);
        b.halo.scale.copy(b.radii).multiplyScalar(1.75).addScalar(0.004);
      }
      if (b.xray) {
        b.xray.position.copy(b.mesh.position);
        b.xray.quaternion.copy(_q);
        b.xray.scale.copy(b.radii).multiplyScalar(XRAY_GROW);
      }
    }
  }

  /** Centre lines and blob positions only (no geometry, no colours): for framing / label pre-passes over sampled
   *  poses. The next update() rebuilds everything for the displayed pose. */
  pose(state: RigState) {
    for (const v of this.visuals) {
      if (v.role === 'ghost') continue;
      for (const s of v.strands) s.pose(state);
      if (v.blobs.length) this.placeBlobs(v, state);
    }
    for (const z of this.zones) this.placeZone(z, state, false);
  }

  /** Label anchors (world) for visuals in scope (one per id+side). */
  labelAnchors(state: RigState, cb: (key: string, id: PartId, role: Role, p: Vector3) => void) {
    for (const z of this.zones) if (this.zoneCentre(z, _v)) cb(`${z.spec.on}:${z.side}`, z.spec.on, 'injured', _v);
    for (const v of this.visuals) {
      if (v.role === 'ghost' || v.noLabel) continue;
      if (v.labelCp) {
        evalPoint(v.labelCp, state, _v);
      } else if (v.strands.length) {
        _v.set(0, 0, 0);
        for (const s of v.strands) _v.add(s.rings[s.bellyRing]);
        _v.divideScalar(v.strands.length);
        if (v.kind === 'muscle' && v.strands.length > 2) {
          // snap to the strand nearest the average so the dot sits on muscle
          let best = v.strands[0].rings[v.strands[0].bellyRing];
          let bd = Infinity;
          for (const s of v.strands) {
            const d = s.rings[s.bellyRing].distanceToSquared(_v);
            if (d < bd) {
              bd = d;
              best = s.rings[s.bellyRing];
            }
          }
          _v.copy(best);
        }
      } else if (v.blobs.length) _v.copy(v.blobs[0].mesh.position);
      else continue;
      cb(`${v.id}:${v.side}`, v.id, v.role, _v);
    }
  }

  /** Current length ratios per muscle (mean over strands). */
  ratios(): { id: PartId; side: Side; ratio: number; belly: number; min: number; max: number }[] {
    return this.visuals
      .filter((v) => v.kind === 'muscle' && v.role !== 'ghost')
      .map((v) => {
        const rs = v.strands.map((s) => s.ratio);
        const bs = v.strands.map((s) => s.bellyRatio);
        const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
        return { id: v.id, side: v.side, ratio: mean(rs), belly: mean(bs), min: Math.min(...rs), max: Math.max(...rs) };
      });
  }

  /** Points (world) of everything in scope — for camera framing. `only`: just these ids. */
  collectPoints(out: Vector3[], only?: ReadonlySet<string>) {
    for (const v of this.visuals) {
      if (v.role === 'ghost') continue;
      if (only && !only.has(v.id)) continue;
      for (const s of v.strands) for (let k = 0; k < RINGS; k += 6) out.push(s.rings[k].clone());
      for (const b of v.blobs) out.push(b.mesh.position.clone());
    }
    for (const z of this.zones) {
      if (only && !only.has(z.spec.on) && !only.has(z.spec.key)) continue;
      if (z.seg) for (const p of z.seg.rings) out.push(p.clone());
      else if (z.blob) out.push(z.blob.position.clone());
    }
  }

  boneScope(): { part: string; side: Side | null }[] {
    return this.visuals.flatMap((v) => v.bones);
  }

  clear() {
    for (const v of this.visuals) {
      for (const s of [...v.strands, ...v.xray]) {
        this.group.remove(s.mesh);
        if (s.halo) this.group.remove(s.halo);
        s.dispose();
      }
      for (const b of v.blobs) {
        this.group.remove(b.mesh);
        if (b.halo) this.group.remove(b.halo);
        if (b.mesh.material !== v.material) (b.mesh.material as Material).dispose();
        if (b.xray) {
          this.group.remove(b.xray);
          (b.xray.material as Material).dispose();
        }
      }
      for (const m of v.markers) this.group.remove(m.mesh);
      for (const bp of v.bones) this.bones.tint(bp.part, bp.side, null, 0);
      v.material?.dispose();
      v.haloMat?.dispose();
    }
    this.visuals = [];
    for (const z of this.zones) {
      if (z.seg) {
        this.group.remove(z.seg.mesh);
        if (z.seg.halo) this.group.remove(z.seg.halo);
        if (z.seg.xray) {
          this.group.remove(z.seg.xray);
          (z.seg.xray.material as Material).dispose();
        }
        z.seg.dispose();
      }
      for (const m of [z.blob, z.blobHalo]) if (m) this.group.remove(m);
      if (z.blobXray) {
        this.group.remove(z.blobXray);
        (z.blobXray.material as Material).dispose();
      }
      z.material.dispose();
      z.haloMat?.dispose();
    }
    this.zones = [];
  }

  dispose() {
    this.clear();
    this.markerGeo.dispose();
    this.blobGeo.dispose();
    this.originMat.dispose();
    this.insertionMat.dispose();
    this.xrayStrandMat.dispose();
    this.xrayNerveMat.dispose();
    this.xraySelectedMat.dispose();
  }
}

/** Vertex-coloured see-through material that only draws where the part is hidden (depth GREATER than what is there). */
function xrayHidden(opacity: number) {
  return new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity, depthTest: true, depthFunc: GreaterDepth, depthWrite: false });
}
