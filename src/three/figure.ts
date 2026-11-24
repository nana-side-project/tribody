// The mannequin: one Object3D per rig segment carrying its bone pieces and translucent skin volumes.
import { BufferAttribute, BufferGeometry, Color, DoubleSide, FrontSide, Group, Mesh, type MeshStandardMaterial, Object3D, type ShaderMaterial, SphereGeometry } from 'three';
import { capsule, merge } from './geometry';
import { colorOf, type Palette, rimMaterial, type RimUniforms, skinMaterials } from './materials';
import { type RigState, SEGMENTS, SKIN_PRIMS, type Side } from './rig';
import { buildSkeletonGeometry } from './skeleton';
import { bonePieces } from './skeleton-parts';
import { SkinLoft } from './skin-loft';

type BoneMat = 'bone' | 'cartilage' | 'ink';
/**
 * The bones are drawn as ONE merged mesh per segment + material (≈ 35 draw calls instead of 85 pieces). Each piece
 * keeps its contiguous index range, so a tinted or ghosted piece is split off on demand: its triangles leave the
 * merged index (compacted, drawRange) and a part mesh sharing the same vertex buffers draws them with its own
 * material (tint colour and / or see-through "ghost" look). Reset puts it back.
 */
interface BoneGroup {
  segIdx: number;
  mat: BoneMat;
  geometry: BufferGeometry;
  /** part key → [start, count] in the index */
  ranges: Map<string, [number, number]>;
}
let boneGroupCache: BoneGroup[] | null = null;
let skinCache: Map<number, BufferGeometry> | null = null;

function boneGroups(): BoneGroup[] {
  if (boneGroupCache) return boneGroupCache;
  const by = new Map<string, { segIdx: number; mat: BoneMat; pieces: { key: string; g: BufferGeometry }[] }>();
  for (const piece of buildSkeletonGeometry()) {
    const segIdx = SEGMENTS.indexOf(piece.seg);
    const k = `${segIdx}/${piece.mat}`;
    let e = by.get(k);
    if (!e) by.set(k, (e = { segIdx, mat: piece.mat, pieces: [] }));
    e.pieces.push({ key: partKey(piece.part, piece.side), g: piece.geometry });
  }
  boneGroupCache = [...by.values()].map(({ segIdx, mat, pieces }) => {
    const ranges = new Map<string, [number, number]>();
    let at = 0;
    for (const { key, g } of pieces) {
      const n = g.index ? g.index.count : g.getAttribute('position').count;
      const r = ranges.get(key);
      // pieces of one part are adjacent (BONE_PIECES order) except when a part has two definitions; keep them
      // contiguous by merging in insertion order — a second, non-adjacent range would be a bug, so assert it
      if (r && r[0] + r[1] !== at) throw new Error(`bone part ${key} is not contiguous in its group`);
      ranges.set(key, r ? [r[0], r[1] + n] : [at, n]);
      at += n;
    }
    return { segIdx, mat, geometry: merge(pieces.map((p) => p.g)), ranges };
  });
  return boneGroupCache;
}

function skinGeometries(): Map<number, BufferGeometry> {
  if (skinCache) return skinCache;
  const per = new Map<number, BufferGeometry[]>();
  for (const p of SKIN_PRIMS) {
    if (p.loft) continue;
    let g: BufferGeometry;
    // the skin is drawn twice (depth pre-pass + colour): facets only where the silhouette needs them
    if (p.kind === 'capsule') {
      const small = Math.max(p.ra, p.rb) < 0.025;
      g = capsule(p.a, p.b, p.ra, p.rb, small ? 14 : 20, small ? 4 : 5);
    } else {
      const big = Math.max(p.r.x, p.r.y, p.r.z);
      g = new SphereGeometry(1, big > 0.07 ? 28 : big > 0.045 ? 20 : 16, big > 0.07 ? 18 : big > 0.045 ? 13 : 10);
      g.scale(p.r.x, p.r.y, p.r.z);
      g.applyQuaternion(p.q);
      g.translate(p.c.x, p.c.y, p.c.z);
    }
    const list = per.get(p.segIdx) ?? [];
    list.push(g);
    per.set(p.segIdx, list);
  }
  skinCache = new Map([...per.entries()].map(([k, v]) => [k, merge(v)]));
  return skinCache;
}

export class Figure {
  readonly root = new Group();
  readonly segs: Object3D[];
  private boneMat: MeshStandardMaterial;
  private cartMat: MeshStandardMaterial;
  private inkMat: MeshStandardMaterial;
  private rim: RimUniforms;
  /** part key → the merged groups that contain it */
  private parts = new Map<string, BoneInst[]>();
  private groups: BoneInst[] = [];
  /** split-off pieces (tinted and / or ghosted), by part key */
  private looks = new Map<string, PartLook>();
  /** rim strength of ghosted pieces: stronger than the bones' (the outline carries the shape) */
  private ghostEdge: { value: number };
  private skinMat: ShaderMaterial;
  private prepassMat;
  private skinMeshes: Mesh[] = [];
  private loft = new SkinLoft();
  /** per-instance GPU geometries (clones of the CPU-side caches) */
  private ownGeos: BufferGeometry[] = [];
  /** per-instance piece geometries (index only; vertex buffers shared with a merged group) */
  private partGeos: BufferGeometry[] = [];

  constructor(
    private pal: Palette,
    skinOpacity: number,
  ) {
    this.rim = { uInk: { value: new Color(pal.boneInk) }, uEdge: { value: pal.dark ? 0.3 : 0.42 } };
    this.ghostEdge = { value: ghostEdge(pal) };
    this.boneMat = rimMaterial(pal.bone, pal.boneInk, 0.5, this.rim);
    this.cartMat = rimMaterial(pal.cartilage, pal.boneInk, 0.5, this.rim);
    this.cartMat.roughness = 0.6;
    this.inkMat = rimMaterial(this.inkColor(), pal.boneInk, 0.2, this.rim);
    this.segs = SEGMENTS.map((name) => {
      const o = new Object3D();
      o.name = name;
      this.root.add(o);
      return o;
    });
    for (const grp of boneGroups()) {
      const geo = grp.geometry.clone();
      this.ownGeos.push(geo);
      const mat = grp.mat === 'bone' ? this.boneMat : grp.mat === 'ink' ? this.inkMat : this.cartMat;
      const mesh = new Mesh(geo, mat);
      mesh.userData.defaultMat = mat;
      this.segs[grp.segIdx].add(mesh);
      const inst: BoneInst = { grp, mesh, full: (geo.index!.array as Uint16Array | Uint32Array).slice(), split: new Map() };
      this.groups.push(inst);
      for (const key of grp.ranges.keys()) {
        const list = this.parts.get(key) ?? [];
        list.push(inst);
        this.parts.set(key, list);
      }
    }
    const { prepass, skin } = skinMaterials(pal.skin, pal.skinRim, skinOpacity);
    this.skinMat = skin;
    this.prepassMat = prepass;
    for (const [segIdx, g0] of skinGeometries()) {
      const g = g0.clone();
      this.ownGeos.push(g);
      const pre = new Mesh(g, prepass);
      pre.renderOrder = 10;
      const col = new Mesh(g, skin);
      col.renderOrder = 11;
      this.segs[segIdx].add(pre, col);
      this.skinMeshes.push(pre, col);
    }
    for (const g of this.loft.geometries) {
      const pre = new Mesh(g, prepass);
      pre.renderOrder = 10;
      const col = new Mesh(g, skin);
      col.renderOrder = 11;
      for (const m of [pre, col]) {
        m.frustumCulled = false;
        m.matrixAutoUpdate = false;
      }
      this.root.add(pre, col);
      this.skinMeshes.push(pre, col);
    }
  }

  apply(state: RigState) {
    this.loft.update(state);
    for (let i = 0; i < this.segs.length; i++) {
      this.segs[i].position.copy(state.pos[i]);
      this.segs[i].quaternion.copy(state.quat[i]);
    }
    this.root.updateMatrixWorld(true);
  }

  setSkinOpacity(o: number) {
    this.skinMat.uniforms.uOpacity.value = o;
    const show = o > 0.001;
    for (const m of this.skinMeshes) m.visible = show;
  }

  setPalette(pal: Palette) {
    this.pal = pal;
    this.boneMat.color.set(pal.bone);
    this.cartMat.color.set(pal.cartilage);
    this.inkMat.color.set(this.inkColor());
    this.rim.uInk.value.set(pal.boneInk);
    this.rim.uEdge.value = pal.dark ? 0.3 : 0.42;
    this.ghostEdge.value = ghostEdge(pal);
    for (const l of this.looks.values()) this.applyLook(l);
    (this.skinMat.uniforms.uColor.value as Color).set(pal.skin);
    (this.skinMat.uniforms.uRim.value as Color).set(pal.skinRim);
  }

  /**
   * Tint a bone piece (null colour = reset). The piece is split off its merged mesh while tinted. `part` may be a
   * group alias ('metatarsals', 'cuneiforms': every member is tinted). Cheap to call every frame (pulse).
   */
  tint(part: string, side: Side | null, color: Color | null, emissive: number) {
    for (const p of bonePieces(part)) {
      const key = partKey(p, side);
      if (!color) {
        const l = this.looks.get(key);
        if (!l?.tint) continue;
        l.tint = null;
        this.settle(l);
        continue;
      }
      const l = this.look(key);
      if (!l) continue;
      l.tint = (l.tint ?? new Color()).copy(color);
      l.emissive = emissive;
      this.applyLook(l);
    }
  }

  /**
   * Draw a bone piece see-through (a "ghost"), e.g. the patella over the patellofemoral cartilage behind it:
   * `opacity` 0..1 (null = back to solid; default GHOST_OPACITY 0.3). The piece is split off its merged mesh and
   * drawn after the opaque anatomy without writing depth (front faces only, stronger rim), so whatever lies behind it
   * shows through; it stays tintable — `tint()` on a ghosted piece colours the ghost, and resetting the tint keeps
   * it ghosted (and vice versa). `part` may be a group alias. Unknown names are ignored.
   */
  ghost(part: string, side: Side | null, opacity: number | null = GHOST_OPACITY) {
    for (const p of bonePieces(part)) {
      const key = partKey(p, side);
      if (opacity === null) {
        const l = this.looks.get(key);
        if (!l || l.ghost === null) continue;
        l.ghost = null;
        this.settle(l);
        continue;
      }
      const l = this.look(key);
      if (!l) continue;
      l.ghost = Math.min(1, Math.max(0, opacity));
      this.applyLook(l);
    }
  }

  /** Make every ghosted piece solid again (tints are kept). */
  clearGhosts() {
    for (const l of [...this.looks.values()]) {
      if (l.ghost === null) continue;
      l.ghost = null;
      this.settle(l);
    }
  }

  /** Part keys (`patella_R`, `sacrum`…) currently drawn as ghosts. */
  ghosted(): string[] {
    return [...this.looks.values()].filter((l) => l.ghost !== null).map((l) => l.key);
  }

  /** Meshes currently drawing a piece on its own (only while it is tinted or ghosted). Group aliases expand. */
  partMeshes(part: string, side: Side | null): Mesh[] {
    const out: Mesh[] = [];
    for (const p of bonePieces(part)) for (const m of this.looks.get(partKey(p, side))?.meshes ?? []) out.push(m.mesh);
    return out;
  }

  /** The split-off look of a piece, splitting it off its merged meshes on first use (null: unknown part). */
  private look(key: string): PartLook | null {
    let l = this.looks.get(key);
    if (l) return l;
    const insts = this.parts.get(key);
    if (!insts) return null;
    l = { key, tint: null, emissive: 0, ghost: null, meshes: [] };
    for (const inst of insts) {
      const { mat } = this.partMaterial(inst.grp.mat, false);
      const mesh = this.partMesh(inst, key);
      mesh.material = mat;
      inst.split.set(key, mesh);
      this.segs[inst.grp.segIdx].add(mesh);
      this.rebuildIndex(inst);
      l.meshes.push({ inst, mesh, mat, rim: null });
    }
    this.looks.set(key, l);
    return l;
  }

  /** After a reset: put the piece back into its merged meshes when it is neither tinted nor ghosted. */
  private settle(l: PartLook) {
    if (l.tint || l.ghost !== null) {
      this.applyLook(l);
      return;
    }
    for (const m of l.meshes) {
      m.mesh.removeFromParent();
      m.inst.split.delete(l.key);
      this.rebuildIndex(m.inst);
      m.mat.dispose();
    }
    this.looks.delete(l.key);
  }

  private partMaterial(mat: BoneMat, ghost: boolean): { mat: MeshStandardMaterial; rim: RimUniforms | null } {
    if (!ghost) return { mat: rimMaterial(this.pal.bone, this.pal.boneInk, 0.45, this.rim), rim: null };
    // own rim uniforms: the outline takes the tint colour, so an injured ghost still reads as the injured bone
    const rim: RimUniforms = { uInk: { value: new Color(this.pal.boneInk) }, uEdge: this.ghostEdge };
    const m = rimMaterial(this.pal.bone, this.pal.boneInk, 0.45, rim);
    if (mat === 'cartilage') m.roughness = 0.6;
    m.transparent = true;
    m.depthWrite = false;
    m.side = FrontSide;
    // glass-like: the silhouette is more opaque than the face (fresnel alpha), so the shape stays readable at 0.3
    const rimCompile = m.onBeforeCompile;
    m.onBeforeCompile = (shader, renderer) => {
      rimCompile.call(m, shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `diffuseColor.a = clamp(diffuseColor.a * (1.0 + 1.7 * smoothstep(0.45, 1.0, 1.0 - abs(dot(normalize(normal), normalize(vViewPosition))))), 0.0, 1.0);
        #include <opaque_fragment>`,
      );
    };
    m.customProgramCacheKey = () => 'tb-rim-ghost';
    return { mat: m, rim };
  }

  /** Colours / opacity of a split-off piece from its state (tint lerps the bone colour 62 % toward the role colour). */
  private applyLook(l: PartLook) {
    const ghost = l.ghost !== null;
    for (const m of l.meshes) {
      if (!!m.rim !== ghost) {
        // transparent ↔ opaque changes the program and the render list: a fresh material (rare: scene changes only)
        m.mat.dispose();
        const pm = this.partMaterial(m.inst.grp.mat, ghost);
        m.mat = pm.mat;
        m.rim = pm.rim;
        m.mesh.material = m.mat;
      }
      const mat = m.mat;
      if (l.tint) {
        // a see-through bone shows less of its colour: a tinted ghost takes more of the tint so it still reads as
        // the injured / involved bone
        mat.color.copy(colorOf(this.pal.bone)).lerp(l.tint, m.rim ? 0.85 : 0.62);
        mat.emissive.copy(l.tint);
        mat.emissiveIntensity = l.emissive;
      } else {
        mat.color.copy(colorOf(m.inst.grp.mat === 'bone' ? this.pal.bone : m.inst.grp.mat === 'ink' ? this.inkColor() : this.pal.cartilage));
        mat.emissive.setRGB(0, 0, 0);
        mat.emissiveIntensity = 0;
      }
      if (m.rim) {
        mat.opacity = l.ghost!;
        m.rim.uInk.value.copy(colorOf(this.pal.boneInk));
        if (l.tint) m.rim.uInk.value.lerp(l.tint, 0.75);
      }
    }
  }

  private inkColor() {
    return this.pal.dark ? '#3a3632' : '#8d857d';
  }

  /** A mesh for one piece of a merged group, sharing its vertex buffers (cached per instance). */
  private partMesh(inst: BoneInst, key: string): Mesh {
    const cached = inst.cache?.get(key);
    if (cached) return cached;
    const [start, count] = inst.grp.ranges.get(key)!;
    const src = inst.mesh.geometry;
    const g = new BufferGeometry();
    g.setAttribute('position', src.getAttribute('position'));
    g.setAttribute('normal', src.getAttribute('normal'));
    g.setIndex(new BufferAttribute(inst.full.slice(start, start + count), 1));
    const m = new Mesh(g, inst.mesh.material);
    (inst.cache ??= new Map()).set(key, m);
    this.partGeos.push(g);
    return m;
  }

  /** Merged index without the split-off pieces (compacted in place; drawRange = what is left). */
  private rebuildIndex(inst: BoneInst) {
    const idx = inst.mesh.geometry.index!;
    const arr = idx.array as Uint16Array | Uint32Array;
    if (!inst.split.size) {
      arr.set(inst.full);
      inst.mesh.geometry.setDrawRange(0, Infinity);
    } else {
      let o = 0;
      for (const [key, [start, count]] of inst.grp.ranges) {
        if (inst.split.has(key)) continue;
        arr.set(inst.full.subarray(start, start + count), o);
        o += count;
      }
      inst.mesh.geometry.setDrawRange(0, o);
      inst.mesh.visible = o > 0;
    }
    if (!inst.split.size) inst.mesh.visible = true;
    idx.needsUpdate = true;
  }

  dispose() {
    this.boneMat.dispose();
    this.cartMat.dispose();
    this.inkMat.dispose();
    this.skinMat.dispose();
    this.prepassMat.dispose();
    for (const l of this.looks.values()) for (const m of l.meshes) m.mat.dispose();
    this.loft.dispose();
    // part geometries share the merged vertex buffers: drop them before the merged ones (double removal is harmless)
    for (const g of this.partGeos) g.dispose();
    for (const g of this.ownGeos) g.dispose();
  }
}

/** Default opacity of a ghosted bone piece. */
export const GHOST_OPACITY = 0.3;
const ghostEdge = (pal: Palette) => (pal.dark ? 0.5 : 0.62);

/** A split-off piece: its tint and / or ghost state and the meshes (one per merged group containing it). */
interface PartLook {
  key: string;
  tint: Color | null;
  emissive: number;
  ghost: number | null;
  /** rim: own rim uniforms of a ghost material (null = solid) */
  meshes: { inst: BoneInst; mesh: Mesh; mat: MeshStandardMaterial; rim: RimUniforms | null }[];
}

interface BoneInst {
  grp: BoneGroup;
  mesh: Mesh;
  /** the full merged index (the live index array is compacted while pieces are split off) */
  full: Uint16Array | Uint32Array;
  /** split-off (tinted / ghosted) pieces currently drawn on their own */
  split: Map<string, Mesh>;
  cache?: Map<string, Mesh>;
}

function partKey(part: string, side: Side | null) {
  return side ? `${part}_${side}` : part;
}

