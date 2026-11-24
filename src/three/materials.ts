// Palette (from CSS variables) and the engine's materials / shaders.
import {
  Color,
  DoubleSide,
  FrontSide,
  LessEqualDepth,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  ShaderMaterial,
  type Material,
} from 'three';

export interface Palette {
  dark: boolean;
  muscle: string;
  muscleLight: string;
  muscleDeep: string;
  tendon: string;
  bone: string;
  boneInk: string;
  cartilage: string;
  origin: string;
  insertion: string;
  injured: string;
  involved: string;
  nerve: string;
  bursa: string;
  skin: string;
  skinRim: string;
  text: string;
  text2: string;
  surface: string;
  ghost: string;
  prop: string;
  propDark: string;
}

const LIGHT: Palette = {
  dark: false,
  muscle: '#b9504a',
  muscleLight: '#e6a49e',
  muscleDeep: '#8c2a25',
  tendon: '#e9dcc0',
  bone: '#e4e1dc',
  boneInk: '#6f6a64',
  cartilage: '#dfe3e6',
  origin: '#d9772b',
  insertion: '#3f6fd1',
  injured: '#e0342b',
  involved: '#e0a23b',
  nerve: '#e2b93b',
  bursa: '#8fb8de',
  skin: '#e0b496',
  skinRim: '#b27a5a',
  text: '#1e1b18',
  text2: '#5f5852',
  surface: '#ffffff',
  ghost: '#c98f88',
  prop: '#cfc7bd',
  propDark: '#9a9086',
};
const DARK: Palette = {
  ...LIGHT,
  dark: true,
  muscle: '#d8675f',
  muscleLight: '#9c4c46',
  muscleDeep: '#f08a80',
  tendon: '#bfae8a',
  bone: '#8f8a84',
  boneInk: '#d8d3cc',
  cartilage: '#8b9297',
  origin: '#f0954d',
  insertion: '#7aa2ff',
  injured: '#ff5a4f',
  involved: '#f0b450',
  nerve: '#f3cf5a',
  bursa: '#6f9cc8',
  skin: '#c9a58b',
  skinRim: '#f1d3bd',
  text: '#f2ede7',
  text2: '#b5ada5',
  surface: '#1e1b19',
  ghost: '#8a5550',
  prop: '#5b544e',
  propDark: '#3f3a36',
};

/** Read colour tokens from CSS custom properties (falls back to the documented light/dark values). */
export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const get = (name: string) => cs.getPropertyValue(name).trim();
  const bg = get('--bg') || get('--surface');
  let dark = false;
  if (bg) {
    try {
      const c = new Color(bg);
      dark = c.r * 0.3 + c.g * 0.59 + c.b * 0.11 < 0.35;
    } catch {
      /* ignore */
    }
  } else if (typeof matchMedia !== 'undefined') {
    dark = matchMedia('(prefers-color-scheme: dark)').matches;
  }
  const base = dark ? DARK : LIGHT;
  const pick = (name: string, fallback: string) => {
    const v = get(name);
    if (!v) return fallback;
    try {
      new Color(v);
      return v;
    } catch {
      return fallback;
    }
  };
  return {
    ...base,
    muscle: pick('--muscle', base.muscle),
    muscleLight: pick('--muscle-light', base.muscleLight),
    tendon: pick('--tendon', base.tendon),
    bone: pick('--bone', base.bone),
    boneInk: pick('--bone-ink', base.boneInk),
    origin: pick('--origin', base.origin),
    insertion: pick('--insertion', base.insertion),
    injured: pick('--injured', base.injured),
    nerve: pick('--nerve', base.nerve),
    bursa: pick('--bursa', base.bursa),
    text: pick('--text', base.text),
    text2: pick('--text-2', base.text2),
    surface: pick('--surface', base.surface),
  };
}

// ── bone: matte with darker silhouette edges

export interface RimUniforms {
  uInk: { value: Color };
  uEdge: { value: number };
}

export function rimMaterial(color: string, ink: string, edge = 0.5, rimShared?: RimUniforms): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, side: DoubleSide });
  const uni: RimUniforms = rimShared ?? { uInk: { value: new Color(ink) }, uEdge: { value: edge } };
  m.userData.rim = uni;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uInk = uni.uInk;
    shader.uniforms.uEdge = uni.uEdge;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uInk;\nuniform float uEdge;')
      .replace(
        '#include <opaque_fragment>',
        `{
          float rimF = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
          outgoingLight = mix(outgoingLight, uInk, uEdge * smoothstep(0.62, 1.0, rimF));
        }
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => 'tb-rim';
  return m;
}

// ── muscle strands: vertex colours + subtle longitudinal fibre lines (attribute aFib: x=around, y=belly)

export function strandMaterial(opts: { transparent?: boolean; opacity?: number } = {}): MeshStandardMaterial {
  const m = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.52,
    metalness: 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    depthWrite: !opts.transparent,
    side: FrontSide,
  });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aFib;\nvarying vec2 vFib;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFib = aFib;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFib;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float fl = 0.5 + 0.5 * cos(vFib.x * 6.2831853 * 9.0);
          diffuseColor.rgb *= 1.0 - 0.13 * smoothstep(0.55, 1.0, fl) * vFib.y;
        }`,
      );
  };
  m.customProgramCacheKey = () => 'tb-strand' + (opts.transparent ? 't' : 'o');
  return m;
}

// ── translucent mannequin skin: fresnel rim, drawn once per pixel thanks to a depth pre-pass

const SKIN_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const SKIN_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uRim;
uniform float uOpacity;
varying vec3 vN;
varying vec3 vV;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 1.7);
  vec3 L = normalize(vec3(-0.35, 0.7, 0.62));
  float diff = 0.62 + 0.38 * max(dot(n, L), 0.0);
  vec3 col = mix(uColor * diff, uRim, smoothstep(0.15, 1.0, fres) * 0.7);
  float a = uOpacity * 0.5 + fres * (0.3 + uOpacity * 1.1);
  gl_FragColor = vec4(col, clamp(a, 0.0, 0.88));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function skinMaterials(color: string, rim: string, opacity: number) {
  const prepass = new MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true, opacity: 1 });
  const color3 = new Color(color);
  const rim3 = new Color(rim);
  const skin = new ShaderMaterial({
    uniforms: { uColor: { value: color3 }, uRim: { value: rim3 }, uOpacity: { value: opacity } },
    vertexShader: SKIN_VERT,
    fragmentShader: SKIN_FRAG,
    transparent: true,
    depthWrite: false,
    depthFunc: LessEqualDepth,
    blending: NormalBlending,
  });
  return { prepass, skin };
}

// ── soft glow halo (fresnel, normal blending — reads well on light backgrounds)

const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vN;
varying vec3 vV;
void main() {
  float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
  float a = (0.12 + 0.88 * pow(1.0 - ndv, 1.3)) * (1.0 - pow(1.0 - ndv, 6.0)) * uIntensity;
  gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

export function haloMaterial(color: string): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uIntensity: { value: 0.5 } },
    vertexShader: SKIN_VERT,
    fragmentShader: HALO_FRAG,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });
}

export function solid(color: string, opts: { roughness?: number; emissive?: string; emissiveIntensity?: number; transparent?: boolean; opacity?: number; side?: typeof FrontSide | typeof DoubleSide } = {}) {
  return new MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.6,
    metalness: 0,
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    depthWrite: !opts.transparent,
    side: opts.side ?? FrontSide,
  });
}

const COLOR_CACHE = new Map<string, Color>();
/** Parsed colour for a CSS colour string, cached (read-only — copy it, never mutate it). Lets per-frame code
 *  avoid `Color.set(string)`, which parses (and allocates) on every call. */
export function colorOf(css: string): Color {
  let c = COLOR_CACHE.get(css);
  if (!c) {
    c = new Color(css);
    COLOR_CACHE.set(css, c);
  }
  return c;
}

export function disposeMaterial(m: Material | Material[]) {
  if (Array.isArray(m)) m.forEach((x) => x.dispose());
  else m.dispose();
}
