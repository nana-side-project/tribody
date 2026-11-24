// The mannequin: one Object3D per rig segment carrying its bone pieces and translucent skin volumes.
import { type BufferGeometry, Color, Group, Mesh, type MeshStandardMaterial, Object3D, type ShaderMaterial, SphereGeometry } from 'three';
import { capsule, merge } from './geometry';
import { colorOf, type Palette, rimMaterial, type RimUniforms, skinMaterials } from './materials';
import { type RigState, SEGMENTS, SKIN_PRIMS, type Side } from './rig';
import { buildSkeletonGeometry } from './skeleton';
import { SkinLoft } from './skin-loft';

let skeletonCache: ReturnType<typeof buildSkeletonGeometry> | null = null;
let skinCache: Map<number, BufferGeometry> | null = null;

function skinGeometries(): Map<number, BufferGeometry> {
  if (skinCache) return skinCache;
  const per = new Map<number, BufferGeometry[]>();
  for (const p of SKIN_PRIMS) {
    if (p.loft) continue;
    let g: BufferGeometry;
    if (p.kind === 'capsule') g = capsule(p.a, p.b, p.ra, p.rb, 24, 8);
    else {
      g = new SphereGeometry(1, 30, 20);
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
  private parts = new Map<string, Mesh[]>();
  private tinted = new Map<string, MeshStandardMaterial>();
  private skinMat: ShaderMaterial;
  private prepassMat;
  private skinMeshes: Mesh[] = [];
  private loft = new SkinLoft();
  /** per-instance GPU geometries (clones of the CPU-side caches) */
  private ownGeos: BufferGeometry[] = [];

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
    skeletonCache ??= buildSkeletonGeometry();
    for (const piece of skeletonCache) {
      const geo = piece.geometry.clone();
      this.ownGeos.push(geo);
      const mesh = new Mesh(geo, piece.mat === 'bone' ? this.boneMat : piece.mat === 'ink' ? this.inkMat : this.cartMat);
      mesh.userData.defaultMat = mesh.material;
      const segIdx = SEGMENTS.indexOf(piece.seg);
      this.segs[segIdx].add(mesh);
      const key = partKey(piece.part, piece.side);
      const list = this.parts.get(key) ?? [];
      list.push(mesh);
      this.parts.set(key, list);
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

  /** Tint a bone piece (null colour = reset). */
  tint(part: string, side: Side | null, color: Color | null, emissive: number) {
    const key = partKey(part, side);
    const meshes = this.parts.get(key);
    if (!meshes) return;
    if (!color) {
      for (const m of meshes) m.material = m.userData.defaultMat;
      const t = this.tinted.get(key);
      t?.dispose();
      this.tinted.delete(key);
      return;
    }
    let mat = this.tinted.get(key);
    if (!mat) {
      mat = rimMaterial(this.pal.bone, this.pal.boneInk, 0.45, this.rim);
      this.tinted.set(key, mat);
      for (const m of meshes) m.material = mat;
    }
    mat.color.copy(colorOf(this.pal.bone)).lerp(color, 0.62);
    mat.emissive.copy(color);
    mat.emissiveIntensity = emissive;
  }

  partMeshes(part: string, side: Side | null) {
    return this.parts.get(partKey(part, side)) ?? [];
  }

  dispose() {
    this.boneMat.dispose();
    this.cartMat.dispose();
    this.inkMat.dispose();
    this.skinMat.dispose();
    this.prepassMat.dispose();
    for (const m of this.tinted.values()) m.dispose();
    this.loft.dispose();
    for (const g of this.ownGeos) g.dispose();
  }
}

function partKey(part: string, side: Side | null) {
  return side ? `${part}_${side}` : part;
}

