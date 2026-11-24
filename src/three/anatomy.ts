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
import { type CompiledPoint, evalPoint, pointSeg, tryCompile } from './landmarks';
import { colorOf, haloMaterial, type Palette, solid, strandMaterial } from './materials';
import type { RigState, Side } from './rig';
import { MUSCLE_RIGS, STRUCTURE_RIGS } from './rig-data';
import type { StructurePart } from './rig-data/types';
import { isMidlinePart } from './skeleton-parts';
import { RINGS, StrandMesh } from './strands';

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

export interface ScopeOptions {
  markers: boolean;
  ghosts: boolean;
  /** draw these parts translucent (opacity 0..1) — superficial parts that would hide the injured tissue */
  fade?: Partial<Record<PartId, number>>;
  /** injured parts get a see-through copy wherever other anatomy hides them (condition pages) */
  xrayInjured?: boolean;
  /** these parts are drawn on both sides whatever `sides` says (bilateral problems in a scene) */
  both?: ReadonlySet<string>;
}

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
  private pulse = 0;
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
  }

  /** Replace the displayed set. */
  setScope(scope: Partial<Record<PartId, Highlight3DRole>>, sides: Side[], opts: ScopeOptions) {
    this.clear();
    this.missing = [];
    for (const [id, role] of Object.entries(scope) as [PartId, Highlight3DRole][]) {
      if (!role) continue;
      let any = false;
      // an injured part is never faded (it is what the view is about)
      const fade = role === 'injured' ? undefined : opts.fade?.[id];
      const op = typeof fade === 'number' && fade < 1 ? Math.max(0.05, fade) : 1;
      for (const side of opts.both?.has(id) ? (['R', 'L'] as Side[]) : sides) {
        const v = isMuscleId(id) ? this.buildMuscle(id, side, role, opts.markers, op) : this.buildStructure(id as StructureId, side, role, op);
        if (v) {
          if (v.partType === 'nerve' || (opts.xrayInjured && role === 'injured')) this.addXray(v);
          this.visuals.push(v);
          any = true;
        }
      }
      if (!any) this.missing.push(id);
    }
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
    return this.visuals.some((v) => v.role === 'injured');
  }

  private makeMaterial(role: Role, opacity: number): MeshStandardMaterial {
    if (role === 'ghost') return strandMaterial({ transparent: true, opacity: 0.28 });
    if (opacity < 1) return strandMaterial({ transparent: true, opacity });
    return strandMaterial();
  }

  private newVisual(id: PartId, side: Side, role: Role, kind: Visual['kind'], material: MeshStandardMaterial): Visual {
    return {
      id,
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

  private buildMuscle(id: MuscleId, side: Side, role: Role, markers: boolean, opacity: number): Visual | null {
    const rig = MUSCLE_RIGS[id];
    if (!rig || !rig.strands?.length) return null;
    const material = this.makeMaterial(role, opacity);
    const v = this.newVisual(id, side, role, 'muscle', material);
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
    if (role === 'injured') this.addHalo(v, this.pal.injured);
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
    const mat = nerve ? this.xrayNerveMat : this.xrayStrandMat;
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

  private buildStructure(id: StructureId, side: Side, role: Role, opacity: number): Visual | null {
    const rig = STRUCTURE_RIGS[id];
    if (!rig || !rig.parts?.length) return null;
    const v = this.newVisual(id, side, role, 'structure', null!);
    v.tendon = new Color();
    v.labelCp = rig.labelAt ? tryCompile(rig.labelAt, side, `${id} labelAt`) : null;
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
    const showSpots = role === 'injured' || !hasOther;
    v.hasSpot = showSpots && rig.parts.some((p) => p.type === 'spot');
    const needHalo = role === 'injured' || (firstType === 'spot' && showSpots);
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
        for (const p of part.parts) v.bones.push({ part: p, side: isMidlinePart(p) ? null : side });
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
  private muscleColor(role: Role, ratio: number, out: Color): Color {
    const P = this.pal;
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
      // extrapolate past the role colour (clamped): bone.lerp(result, 0.62) ≈ the injured red
      _tint.copy(c).sub(bone).multiplyScalar(1 / 0.62).add(bone);
      _tint.r = Math.min(1, Math.max(0, _tint.r));
      _tint.g = Math.min(1, Math.max(0, _tint.g));
      _tint.b = Math.min(1, Math.max(0, _tint.b));
      return _tint;
    }
    return _tint.copy(bone).lerp(c, v.role === 'injured' ? 0.6 : 0.7);
  }

  private boneEmissive(v: Visual) {
    if (v.role === 'injured') return v.hasSpot ? 0.06 + 0.12 * this.pulse : 0.14 + 0.4 * this.pulse;
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
          this.muscleColor(role, s.bellyRatio, v.belly);
          s.write(v.belly, v.tendon, emph);
        }
        if (v.xray.length) v.xrayColor.copy(colorOf(this.pal.injured));
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
  }

  /** Only the injured glow pulse (no geometry): emissive intensities, halo strength and bone tints. */
  updatePulse(time: number) {
    this.pulse = 0.5 + 0.5 * Math.sin(time * 3.2);
    for (const v of this.visuals) {
      if (v.role !== 'injured') continue;
      if (v.kind === 'muscle') this.muscleEmissive(v);
      else this.structureEmissive(v);
      if (v.haloMat) v.haloMat.uniforms.uIntensity.value = 0.3 + 0.45 * this.pulse;
    }
  }

  private muscleEmissive(v: Visual) {
    const m = v.material;
    const role = v.role;
    if (role === 'injured') {
      m.emissive.copy(colorOf(this.pal.injured));
      m.emissiveIntensity = 0.18 + 0.4 * this.pulse;
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
    const e = 0.15 + 0.45 * this.pulse;
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
  }

  /** Label anchors (world) for visuals in scope (one per id+side). */
  labelAnchors(state: RigState, cb: (key: string, id: PartId, role: Role, p: Vector3) => void) {
    for (const v of this.visuals) {
      if (v.role === 'ghost') continue;
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
  }

  dispose() {
    this.clear();
    this.markerGeo.dispose();
    this.blobGeo.dispose();
    this.originMat.dispose();
    this.insertionMat.dispose();
    this.xrayStrandMat.dispose();
    this.xrayNerveMat.dispose();
  }
}

/** Vertex-coloured see-through material that only draws where the part is hidden (depth GREATER than what is there). */
function xrayHidden(opacity: number) {
  return new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity, depthTest: true, depthFunc: GreaterDepth, depthWrite: false });
}
