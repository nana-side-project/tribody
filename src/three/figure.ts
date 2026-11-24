// The mannequin: one Object3D per rig segment carrying its bone pieces and translucent skin volumes.
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, type MeshStandardMaterial, Object3D, type ShaderMaterial, SphereGeometry } from 'three';
import { capsule, merge } from './geometry';
import { colorOf, type Palette, rimMaterial, type RimUniforms, skinMaterials } from './materials';
import { type RigState, SEGMENTS, SKIN_PRIMS, type Side } from './rig';
import { buildSkeletonGeometry } from './skeleton';
import { SkinLoft } from './skin-loft';

type BoneMat = 'bone' | 'cartilage' | 'ink';
/**
 * The bones are drawn as ONE merged mesh per segment + material (≈ 35 draw calls instead of 85 pieces). Each piece
 * keeps its contiguous index range, so a tinted piece is split off on demand: its triangles leave the merged index
 * (compacted, drawRange) and a part mesh sharing the same vertex buffers draws them with the tint material.
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
    if (p.kind === 'capsule') g = capsule(p.a, p.b, p.ra, p.rb, 20, 5);
    else {
      const big = Math.max(p.r.x, p.r.y, p.r.z) > 0.07;
      g = new SphereGeometry(1, big ? 28 : 20, big ? 18 : 13);
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
  private tinted = new Map<string, MeshStandardMaterial>();
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
    this.boneMat = rimMaterial(pal.bone, pal.boneInk, 0.5, this.rim);
    this.cartMat = rimMaterial(pal.cartilage, pal.boneInk, 0.5, this.rim);
    this.cartMat.roughness = 0.6;
    this.inkMat = rimMaterial(pal.dark ? '#3a3632' : '#8d857d', pal.boneInk, 0.2, this.rim);
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
    this.inkMat.color.set(pal.dark ? '#3a3632' : '#8d857d');
    this.rim.uInk.value.set(pal.boneInk);
    this.rim.uEdge.value = pal.dark ? 0.3 : 0.42;
    (this.skinMat.uniforms.uColor.value as Color).set(pal.skin);
    (this.skinMat.uniforms.uRim.value as Color).set(pal.skinRim);
  }

  /** Tint a bone piece (null colour = reset). The piece is split off its merged mesh while tinted. */
  tint(part: string, side: Side | null, color: Color | null, emissive: number) {
    const key = partKey(part, side);
    const insts = this.parts.get(key);
    if (!insts) return;
    if (!color) {
      const t = this.tinted.get(key);
      if (!t) return;
      for (const inst of insts) {
        const m = inst.split.get(key);
        if (m) m.removeFromParent();
        inst.split.delete(key);
        this.rebuildIndex(inst);
      }
      t.dispose();
      this.tinted.delete(key);
      return;
    }
    let mat = this.tinted.get(key);
    if (!mat) {
      mat = rimMaterial(this.pal.bone, this.pal.boneInk, 0.45, this.rim);
      this.tinted.set(key, mat);
      for (const inst of insts) {
        const m = this.partMesh(inst, key);
        m.material = mat;
        inst.split.set(key, m);
        this.segs[inst.grp.segIdx].add(m);
        this.rebuildIndex(inst);
      }
    }
    mat.color.copy(colorOf(this.pal.bone)).lerp(color, 0.62);
    mat.emissive.copy(color);
    mat.emissiveIntensity = emissive;
  }

  /** Meshes currently drawing a piece on its own (only while it is tinted). */
  partMeshes(part: string, side: Side | null): Mesh[] {
    const key = partKey(part, side);
    return (this.parts.get(key) ?? []).map((inst) => inst.split.get(key)).filter((m): m is Mesh => !!m);
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
    for (const m of this.tinted.values()) m.dispose();
    this.loft.dispose();
    // part geometries share the merged vertex buffers: drop them before the merged ones (double removal is harmless)
    for (const g of this.partGeos) g.dispose();
    for (const g of this.ownGeos) g.dispose();
  }
}

interface BoneInst {
  grp: BoneGroup;
  mesh: Mesh;
  /** the full merged index (the live index array is compacted while pieces are split off) */
  full: Uint16Array | Uint32Array;
  /** split-off (tinted) pieces currently drawn on their own */
  split: Map<string, Mesh>;
  cache?: Map<string, Mesh>;
}

function partKey(part: string, side: Side | null) {
  return side ? `${part}_${side}` : part;
}

