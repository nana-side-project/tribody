// Muscles & structures in the scene: builds strands / bursae / spots for the ids in scope,
// applies highlight roles, length-driven thickness & colour, origin/insertion markers and glow.
import { Color, Group, type Material, Mesh, MeshStandardMaterial, Quaternion, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { MuscleId, StructureId } from '../data/registry';
import { MUSCLES, STRUCTURES } from '../data/registry';
import type { Highlight3DRole } from './contract';
import { type CompiledPoint, evalPoint, pointSeg, tryCompile } from './landmarks';
import { haloMaterial, type Palette, solid, strandMaterial } from './materials';
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

interface Visual {
  id: PartId;
  side: Side;
  role: Role;
  kind: 'muscle' | 'structure';
  strands: StrandMesh[];
  /** cushions, spots: world-space meshes following a point */
  blobs: { mesh: Mesh; halo: Mesh | null; cp: CompiledPoint; seg: number; off: Vector3; radii: Vector3 }[];
  bones: { part: string; side: Side | null }[];
  material: MeshStandardMaterial;
  haloMat: ShaderMaterial | null;
  partType?: StructurePart['type'];
  belly: Color;
  tendon: Color;
  labelCp: CompiledPoint | null;
  markers: { mesh: Mesh; strand: StrandMesh; end: 0 | 1 }[];
}

const _v = new Vector3();
const _q = new Quaternion();
const _col = new Color();
const _col2 = new Color();

export interface ScopeEntry {
  role: Highlight3DRole;
}

export class AnatomyLayer {
  readonly group = new Group();
  private visuals: Visual[] = [];
  private markerGeo = new SphereGeometry(1, 14, 10);
  private blobGeo = new SphereGeometry(1, 24, 16);
  private originMat: MeshStandardMaterial;
  private insertionMat: MeshStandardMaterial;
  private pulse = 0;
  missing: PartId[] = [];

  constructor(
    private pal: Palette,
    private bones: BonePartHooks,
    private refState: RigState,
  ) {
    this.originMat = solid(pal.origin, { roughness: 0.35, emissive: pal.origin, emissiveIntensity: 0.35 });
    this.insertionMat = solid(pal.insertion, { roughness: 0.35, emissive: pal.insertion, emissiveIntensity: 0.35 });
  }

  /** Replace the displayed set. */
  setScope(
    scope: Partial<Record<PartId, Highlight3DRole>>,
    sides: Side[],
    opts: { markers: boolean; ghosts: boolean },
  ) {
    this.clear();
    this.missing = [];
    for (const [id, role] of Object.entries(scope) as [PartId, Highlight3DRole][]) {
      if (!role) continue;
      let any = false;
      for (const side of sides) {
        const v = isMuscleId(id) ? this.buildMuscle(id, side, role, opts.markers) : this.buildStructure(id as StructureId, side, role);
        if (v) {
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
          const v = this.buildMuscle(id, side, 'ghost', false);
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

  private makeMaterial(role: Role): MeshStandardMaterial {
    if (role === 'ghost') {
      const m = strandMaterial({ transparent: true, opacity: 0.28 });
      return m;
    }
    return strandMaterial();
  }

  private buildMuscle(id: MuscleId, side: Side, role: Role, markers: boolean): Visual | null {
    const rig = MUSCLE_RIGS[id];
    if (!rig || !rig.strands?.length) return null;
    const material = this.makeMaterial(role);
    const v: Visual = {
      id,
      side,
      role,
      kind: 'muscle',
      strands: [],
      blobs: [],
      bones: [],
      material,
      haloMat: null,
      belly: new Color(),
      tendon: new Color(this.pal.tendon),
      labelCp: null,
      markers: [],
    };
    for (const [i, s] of rig.strands.entries()) {
      const cps = s.path.map((r, k) => tryCompile(r, side, `${id} strand ${s.name ?? i} point ${k}`));
      if (cps.some((c) => !c) || cps.length < 2) continue;
      const sm = new StrandMesh(cps as CompiledPoint[], { radius: s.radius, tendon: s.tendon ?? [0, 0], kind: 'muscle', flat: s.flat }, material, side);
      sm.setRest(sm.measure(this.refState));
      if (role === 'ghost') sm.mesh.renderOrder = 4;
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

  private buildStructure(id: StructureId, side: Side, role: Role): Visual | null {
    const rig = STRUCTURE_RIGS[id];
    if (!rig || !rig.parts?.length) return null;
    const v: Visual = {
      id,
      side,
      role,
      kind: 'structure',
      strands: [],
      blobs: [],
      bones: [],
      material: null!,
      haloMat: null,
      belly: new Color(),
      tendon: new Color(),
      labelCp: rig.labelAt ? tryCompile(rig.labelAt, side, `${id} labelAt`) : null,
      markers: [],
    };
    const firstType = rig.parts[0].type;
    v.partType = firstType;
    const baseColor = this.structureColor(firstType);
    const transparent = firstType === 'fascia' || firstType === 'bursa' || firstType === 'spot';
    v.material = solid(baseColor, {
      roughness: firstType === 'bursa' ? 0.3 : 0.5,
      transparent,
      opacity: firstType === 'fascia' ? 0.88 : firstType === 'bursa' ? 0.82 : firstType === 'spot' ? 0.6 : 1,
    });
    if (firstType !== 'bone' && firstType !== 'spot' && firstType !== 'bursa' && firstType !== 'cartilage' && firstType !== 'fatpad') {
      // strands use vertex colours
      v.material.dispose();
      v.material = strandMaterial();
    }
    const needHalo = role === 'injured' || firstType === 'spot';
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
        if (part.type === 'fascia') sm.mesh.renderOrder = 4;
        this.group.add(sm.mesh);
        v.strands.push(sm);
      } else if ('parts' in part) {
        for (const p of part.parts) v.bones.push({ part: p, side: isMidlinePart(p) ? null : side });
      } else {
        const cp = tryCompile(part.at, side, `${id} part ${i}`);
        if (!cp) continue;
        const radii =
          part.type === 'spot' ? new Vector3(part.radius, part.radius, part.radius) : new Vector3(part.radii[0], part.radii[1], part.radii[2]);
        const offIn = part.type === 'spot' ? [0, 0, 0] : (part.off ?? [0, 0, 0]);
        const off = new Vector3(side === 'R' ? -offIn[0] : offIn[0], offIn[1], offIn[2]);
        const mat = part.type === 'spot' ? v.material : this.cushionMaterial(part.type, v);
        const mesh = new Mesh(this.blobGeo, mat);
        mesh.renderOrder = part.type === 'spot' || part.type === 'bursa' ? 4 : 0;
        this.group.add(mesh);
        let halo: Mesh | null = null;
        if (v.haloMat) {
          halo = new Mesh(this.blobGeo, v.haloMat);
          halo.renderOrder = 5;
          this.group.add(halo);
        }
        v.blobs.push({ mesh, halo, cp, seg: pointSeg(cp), off, radii });
      }
    }
    if (!v.strands.length && !v.blobs.length && !v.bones.length) {
      v.material.dispose();
      return null;
    }
    return v;
  }

  private cushionMaterial(type: StructurePart['type'], v: Visual): Material {
    if (type === 'bursa') return v.material;
    const c = type === 'fatpad' ? '#f0d9a8' : this.pal.cartilage;
    const m = solid(c, { roughness: 0.4 });
    return m;
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
        out.set(P.injured);
        break;
      case 'involved':
        out.set(P.involved);
        break;
      case 'secondary':
        out.set(P.muscle).lerp(_col2.set(P.muscleLight), 0.5);
        break;
      case 'ghost':
        out.set(P.ghost);
        break;
      default:
        out.set(P.muscle);
        // a touch more saturated for primary
        out.lerp(_col2.set('#c8382f'), P.dark ? 0.1 : 0.22);
    }
    if (role === 'ghost') return out;
    if (ratio > 1) out.lerp(_col2.set(P.muscleLight), Math.min(1, (ratio - 1) / 0.22) * 0.8);
    else out.lerp(_col2.set(P.muscleDeep), Math.min(1, (1 - ratio) / 0.2) * 0.75);
    return out;
  }

  /** Per-frame update. `time` (s) drives the injured pulse; pass a constant to freeze it. */
  update(state: RigState, time: number, pulse = true) {
    this.pulse = pulse ? 0.5 + 0.5 * Math.sin(time * 3.2) : 0.6;
    for (const v of this.visuals) {
      const role = v.role;
      const emph = role === 'primary' || role === 'selected' ? 1.08 : role === 'injured' ? 1.12 : role === 'ghost' ? 0.9 : 1;
      if (v.kind === 'muscle') {
        for (const s of v.strands) {
          this.muscleColor(role, s.bellyRatio, v.belly);
          s.update(state, v.belly, v.tendon, emph);
        }
        const m = v.material;
        if (role === 'injured') {
          m.emissive.set(this.pal.injured);
          m.emissiveIntensity = 0.18 + 0.4 * this.pulse;
        } else if (role === 'primary' || role === 'selected') {
          m.emissive.set(this.pal.muscle);
          m.emissiveIntensity = role === 'selected' ? 0.32 : 0.1;
        } else if (role === 'involved') {
          m.emissive.set(this.pal.involved);
          m.emissiveIntensity = 0.12;
        } else m.emissiveIntensity = 0;
      } else {
        const type = v.partType!;
        const base = this.structureColor(type);
        if (role === 'injured') _col.set(base).lerp(_col2.set(this.pal.injured), type === 'spot' ? 1 : 0.78);
        else if (role === 'involved') _col.set(base).lerp(_col2.set(this.pal.involved), 0.72);
        else if (type === 'spot') _col.set(this.roleColor(role, base));
        else _col.set(base);
        v.belly.copy(_col);
        v.tendon.copy(_col);
        for (const s of v.strands) s.update(state, v.belly, v.tendon, role === 'primary' || role === 'selected' ? 1.12 : 1);
        const m = v.material;
        if (m && 'color' in m && !(m as MeshStandardMaterial).vertexColors) (m as MeshStandardMaterial).color.copy(_col);
        if (m) {
          if (role === 'injured') {
            m.emissive.set(this.pal.injured);
            m.emissiveIntensity = 0.15 + 0.45 * this.pulse;
          } else if (role === 'primary' || role === 'selected') {
            m.emissive.copy(_col);
            m.emissiveIntensity = 0.12;
          } else m.emissiveIntensity = 0;
        }
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
        }
        for (const bp of v.bones) {
          const em = role === 'injured' ? 0.12 + 0.35 * this.pulse : role === 'involved' ? 0.08 : 0.05;
          this.bones.tint(bp.part, bp.side, _col2.set(this.roleColor(role, this.pal.muscle)), em);
        }
      }
      if (v.haloMat) v.haloMat.uniforms.uIntensity.value = role === 'injured' ? 0.3 + 0.45 * this.pulse : 0.45;
      for (const mk of v.markers) {
        const s = mk.strand;
        mk.mesh.position.copy(s.rings[mk.end === 0 ? 0 : RINGS - 1]);
      }
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

  /** Points (world) of everything in scope — for camera framing. */
  collectPoints(out: Vector3[]) {
    for (const v of this.visuals) {
      if (v.role === 'ghost') continue;
      for (const s of v.strands) for (let k = 0; k < RINGS; k += 6) out.push(s.rings[k].clone());
      for (const b of v.blobs) out.push(b.mesh.position.clone());
    }
  }

  boneScope(): { part: string; side: Side | null }[] {
    return this.visuals.flatMap((v) => v.bones);
  }

  clear() {
    for (const v of this.visuals) {
      for (const s of v.strands) {
        this.group.remove(s.mesh);
        if (s.halo) this.group.remove(s.halo);
        s.dispose();
      }
      for (const b of v.blobs) {
        this.group.remove(b.mesh);
        if (b.halo) this.group.remove(b.halo);
        if (b.mesh.material !== v.material) (b.mesh.material as Material).dispose();
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
  }
}
