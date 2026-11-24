// Dev harness for the 3D engine. Open /dev/engine.html with URL params:
//   ?muscle=<id> | ?exercise=<id> | ?hl=id:role,id:role | ?pose=<BASE_POSE>
//   ?condition=<id> (exactly what /#/condition/<id> shows in its 3D card: scene, content highlights & roles, 340 px)
//   ?region=<id>[&sel=<muscle>] (the region page's 3D card: key muscles, the tapped chip as 'selected', its framing)
//   &scene=<json> (with ?condition / ?region: merge these fields into that teaching scene for this page only, to try a
//   camera / frame / ghost before editing scenes.ts, e.g. &scene={"ghost":{"patella":0.4},"minSize":0.2})
//   ?t=0..1 (freeze) ?cam=front|back|left|right|top|iso|isoBack|isoLeft ?focus=<region>
//   ?j=shoulder_R.flex:170,elbow_R.flex:90 (joint overrides)  ?labels=0 ?skin=0.25 ?all=1 ?debug=1 [&lm=<bone>] ?coverage=1 ?card=1 (320px card) ?controls=0 ?theme=dark
// Robustness tests: ?multi=1 (several viewers on one page, one below the fold) · ?remount=<n> (mount/unmount n times)
//   ?nogl=1 (simulate WebGL unavailable) · ?lose=1 (simulate a lost WebGL context after the first frame)
// window.__tribody = { ready, setTime(t), engine, engines, remounts, done } for screenshot scripts.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CONDITIONS, EXERCISES, MUSCLES, REGIONS, STRUCTURES } from '../src/data/registry';
import type { ConditionId, ExerciseId, MuscleId, RegionId, StructureId } from '../src/data/registry';
import { getCondition, getRegion } from '../src/data';
import { conditionHighlights3d, regionViewer } from '../src/lib/viewerHighlights';
import AnatomyViewer from '../src/three/AnatomyViewer';
import { CLIPS } from '../src/three/clips';
import type { Highlight3DRole } from '../src/three/contract';
import type { Engine } from '../src/three/engine';
import { BASE_POSE_NAMES, type BasePoseName, type CameraPresetName, type Pose } from '../src/three/rig';
import { MUSCLE_RIGS, STRUCTURE_RIGS } from '../src/three/rig-data';
import { CONDITION_SCENES, REGION_SCENES, type Scene3D } from '../src/three/scenes';

declare global {
  interface Window {
    __tribody?: {
      ready: boolean;
      setTime: (t: number) => void;
      engine: Engine | null;
      /** every live engine (multi / remount tests) */
      engines: Set<Engine>;
      remounts: number;
      done: boolean;
    };
  }
}

const q = new URLSearchParams(location.search);
const num = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined);
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme')!;

/** &scene=<json>: tuning overrides merged into the page's teaching scene (this page load only; a field set to null is
 *  removed). Unknown condition / region ids or bad JSON only warn. */
if (q.get('scene') && (q.get('condition') || q.get('region'))) {
  try {
    const patch = JSON.parse(q.get('scene')!) as Record<string, unknown>;
    const cid = q.get('condition') as ConditionId | null;
    const table = (cid ? CONDITION_SCENES : REGION_SCENES) as Partial<Record<string, Scene3D>>;
    const key = cid ?? q.get('region')!;
    const sc: Record<string, unknown> = { ...(table[key] ?? {}) };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete sc[k];
      else sc[k] = v;
    }
    table[key] = sc as Scene3D;
    console.info('[harness] scene override', key, sc);
  } catch (e) {
    console.warn('[harness] bad &scene= JSON', e);
  }
}

window.__tribody = { ready: false, setTime: () => {}, engine: null, engines: new Set(), remounts: 0, done: false };

let loseFired = false;
if (q.get('nogl') === '1') {
  // simulate a browser without WebGL
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
    if (/webgl/i.test(type)) return null;
    return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
  } as typeof orig;
}

/** ?j=shoulder_R.flex:170,elbow_R.flex:90 → joint overrides (pose / highlights mode) */
function parseJoints(s: string | null) {
  if (!s) return undefined;
  const out: Record<string, Record<string, number>> = {};
  for (const part of s.split(',')) {
    const m = /^([a-zA-Z_]+)\.([a-zA-Z]+):(-?[\d.]+)$/.exec(part.trim());
    if (!m) continue;
    (out[m[1]] ??= {})[m[2]] = Number(m[3]);
  }
  return out as Pose['joints'];
}

function parseHl(s: string | null) {
  if (!s) return undefined;
  const out: Partial<Record<MuscleId | StructureId, Highlight3DRole>> = {};
  for (const part of s.split(',')) {
    const [id, role] = part.split(':');
    if (id) out[id as MuscleId] = (role as Highlight3DRole) || 'primary';
  }
  return out;
}

/** ?condition=<id>: the condition page's 3D props (src/pages/ConditionPage.tsx, via the shared
 *  src/lib/viewerHighlights.ts → conditionHighlights3d). */
function conditionView(id: string) {
  const c = getCondition(id);
  if (!c) {
    console.warn('unknown condition', id, '— ids:', CONDITIONS.map((x) => x.id).join(' '));
    return null;
  }
  return { title: c.nameJa, condition: c.id as ConditionId, focus: c.region as RegionId, highlights: conditionHighlights3d(c) };
}

/** ?region=<id>[&sel=<muscle>]: the region page's 3D props (src/pages/RegionPage.tsx, via the shared
 *  src/lib/viewerHighlights.ts → regionViewer): key muscles 'secondary', the tapped chip 'selected', its framing. */
function regionView(id: string, sel: string | null) {
  const r = getRegion(id);
  if (!r) {
    console.warn('unknown region', id);
    return null;
  }
  const keys = (r.keyMuscles ?? []) as MuscleId[];
  const selMuscle = sel && keys.includes(sel as MuscleId) ? (sel as MuscleId) : null;
  if (sel && !selMuscle) console.warn(`sel=${sel} is not a key muscle of ${id}:`, keys.join(' '));
  const v = regionViewer(id as RegionId, keys, selMuscle);
  return { title: r.nameJa ?? id, condition: undefined as ConditionId | undefined, focus: v.focus, highlights: v.highlights };
}

// Which rig / clip file owns each id (see docs/ENGINE.md → "Ownership").
const R2_MUSCLES = new Set(['deep-neck-flexors', 'erector-spinae', 'multifidus', 'transversus-abdominis', 'obliques', 'rectus-abdominis', 'quadratus-lumborum', 'rectus-femoris', 'vastus-lateralis', 'vastus-medialis', 'biceps-femoris', 'semitendinosus', 'semimembranosus']);
const R4_MUSCLES = new Set(['gastrocnemius', 'soleus', 'tibialis-anterior', 'tibialis-posterior', 'fibularis-longus', 'fibularis-brevis', 'flexor-hallucis-longus', 'abductor-hallucis', 'flexor-digitorum-brevis']);
function muscleOwner(id: string, owner: string) {
  if (R2_MUSCLES.has(id)) return 'r2-trunk-thigh';
  if (R4_MUSCLES.has(id)) return 'r4-leg-foot';
  return owner === 'A' ? 'r1-shoulder' : owner === 'B' ? 'r3-hip' : 'r2-trunk-thigh';
}
function structureOwner(id: string, region: string) {
  if (['thoracic-spine', 'cervical-spine', 'lumbar-spine', 'intervertebral-disc', 'sacroiliac-joint', 'thoracolumbar-fascia'].includes(id)) return 'r2-trunk-thigh';
  if (region === 'shoulder' || region === 'neck') return 'r1-shoulder';
  if (region === 'lowback' || region === 'knee') return 'r2-trunk-thigh';
  if (region === 'hip') return 'r3-hip';
  return 'r4-leg-foot';
}
const K3_D = new Set(['ex-short-foot', 'ex-plantar-fascia-stretch', 'ex-towel-heel-raise']);
const K4_C = new Set(['ex-calf-raise-straight', 'ex-calf-raise-bent', 'ex-isometric-calf-hold', 'ex-gastroc-stretch', 'ex-soleus-stretch', 'ex-tibialis-raise', 'ex-pogo-hops']);
function clipOwner(id: string, owner: string) {
  if (owner === 'A' || owner === 'E') return 'k1-upper-core';
  if (owner === 'B') return 'k2-hip';
  if (owner === 'C') return K4_C.has(id) ? 'k4-calf-ankle' : 'k3-knee-foot';
  return K3_D.has(id) ? 'k3-knee-foot' : 'k4-calf-ankle';
}

function Coverage() {
  const row = (ok: boolean) => ({ color: ok ? '#2e7d32' : '#b0a79f' });
  const m = MUSCLES.filter((x) => MUSCLE_RIGS[x.id]).length;
  const s = STRUCTURES.filter((x) => STRUCTURE_RIGS[x.id]).length;
  const e = EXERCISES.filter((x) => CLIPS[x.id]).length;
  const cell: React.CSSProperties = { padding: '3px 6px', borderBottom: '1px solid var(--border)', fontSize: 12 };
  const Table = ({ title, rows }: { title: string; rows: { id: string; ja: string; ok: boolean; extra?: string }[] }) => (
    <section style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 15, margin: '12px 0 6px' }}>{title}</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...cell, ...row(r.ok), width: 20 }}>{r.ok ? '●' : '○'}</td>
              <td style={{ ...cell, fontFamily: 'ui-monospace, monospace' }}>{r.id}</td>
              <td style={cell}>{r.ja}</td>
              <td style={{ ...cell, color: 'var(--text-2)' }}>{r.extra ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
  return (
    <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18 }}>3D coverage</h1>
      <p style={{ fontSize: 13 }}>
        muscles {m}/{MUSCLES.length} · structures {s}/{STRUCTURES.length} · clips {e}/{EXERCISES.length}
      </p>
      <Table
        title="Muscles (rig-data)"
        rows={MUSCLES.map((x) => ({ id: x.id, ja: x.ja, ok: !!MUSCLE_RIGS[x.id], extra: `${muscleOwner(x.id, x.owner)}${MUSCLE_RIGS[x.id] ? ` · ${MUSCLE_RIGS[x.id]!.strands.length} strands` : ''}` }))}
      />
      <Table title="Structures (rig-data)" rows={STRUCTURES.map((x) => ({ id: x.id, ja: x.ja, ok: !!STRUCTURE_RIGS[x.id], extra: structureOwner(x.id, x.region) }))} />
      <Table title="Exercise clips" rows={EXERCISES.map((x) => ({ id: x.id, ja: x.ja, ok: !!CLIPS[x.id], extra: `${clipOwner(x.id, x.owner)}${CLIPS[x.id] ? ` · ${CLIPS[x.id]!.base}` : ''}` }))} />
    </div>
  );
}

function Harness() {
  const [, setN] = useState(0);
  const muscle = (q.get('muscle') as MuscleId) || undefined;
  const exercise = (q.get('exercise') as ExerciseId) || undefined;
  const page = q.get('condition') ? conditionView(q.get('condition')!) : q.get('region') ? regionView(q.get('region')!, q.get('sel')) : null;
  const highlights = page?.highlights ?? parseHl(q.get('hl'));
  const focus = page?.focus ?? ((q.get('focus') as RegionId) || undefined);
  const pose = (q.get('pose') as BasePoseName) || undefined;
  // condition / region views: the app's card (340 px, Viewer3DToggle) unless card=0
  const card = q.get('card') === '1' || (!!page && q.get('card') !== '0');
  if (pose && !(BASE_POSE_NAMES as readonly string[]).includes(pose) && pose !== 'ANATOMICAL') console.warn('unknown pose', pose);
  const viewer = (
    <AnatomyViewer
      muscle={muscle}
      exercise={exercise}
      highlights={highlights}
      condition={page?.condition}
      focus={focus && REGIONS.some((r) => r.id === focus) ? focus : undefined}
      labels={q.get('labels') !== '0'}
      controls={q.get('controls') !== '0'}
      autoPlay={q.get('autoplay') !== '0'}
      height={card ? (num('h') ?? (page ? 340 : 320)) : '100%'}
      onPhase={(l) => {
        document.title = `TriBody · ${l ?? ''}`;
      }}
      dev={{
        pose,
        cam: (q.get('cam') as CameraPresetName) || undefined,
        skin: num('skin'),
        all: q.get('all') === '1',
        debug: q.get('debug') === '1',
        t: num('t'),
        lm: q.get('lm') || undefined,
        joints: parseJoints(q.get('j')),
        onEngine: (e) => {
          const prev = window.__tribody!.engine;
          if (prev && !e) window.__tribody!.engines.delete(prev);
          if (e) window.__tribody!.engines.add(e);
          window.__tribody!.engine = e;
          window.__tribody!.setTime = (t: number) => e?.setTime(t);
          if (e && q.get('lose') === '1' && !loseFired) {
            loseFired = true; // once, so 「再表示する」 can be tested
            setTimeout(() => window.__tribody!.engine?.renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext(), 400);
          }
          if (e) {
            // ready after two frames (geometry built + first render)
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                window.__tribody!.ready = true;
                setN((n) => n + 1);
              }),
            );
          } else window.__tribody!.ready = false;
        },
      }}
    />
  );
  if (!card) return <div style={{ height: '100%' }}>{viewer}</div>;
  return (
    <div style={{ padding: 16, maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, margin: '8px 0 4px' }}>
        {page ? page.title : muscle ? MUSCLES.find((m) => m.id === muscle)?.ja : exercise ? EXERCISES.find((x) => x.id === exercise)?.ja : '3D'}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 12px' }}>
        {page ? `アプリのページと同じ3D表示（${num('h') ?? 340}px）` : 'カードに埋め込んだ表示（アプリ内と同じ 320px）'}
      </p>
      {/* condition / region views: the app's .viewer-frame (1 px border → the viewer is 356 px wide on a 390 px phone,
          so the framing matches the page exactly) */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: '0 1px 2px rgb(30 27 24 / .04), 0 8px 24px -12px rgb(30 27 24 / .16)',
          overflow: 'hidden',
          border: page ? '1px solid var(--card-border, var(--border))' : undefined,
        }}
      >
        {viewer}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
        ドラッグで回転、ピンチで拡大できます。オレンジの点が起始、青い点が停止です。
      </p>
    </div>
  );
}

/** ?multi=1 — several viewers on one page (the last one is below the fold, so it must stay paused). */
function Multi() {
  const card: React.CSSProperties = { background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 };
  const track = (e: Engine | null, key: string) => {
    const w = window as unknown as { __multi?: Record<string, Engine | null> };
    (w.__multi ??= {})[key] = e;
    if (e) window.__tribody!.engines.add(e);
    window.__tribody!.ready = Object.keys(w.__multi).length >= 4;
  };
  return (
    <div style={{ padding: 12 }}>
      <div style={card}>
        <AnatomyViewer muscle="gluteus-medius" height={260} dev={{ onEngine: (e) => track(e, 'a') }} />
      </div>
      <div style={card}>
        <AnatomyViewer exercise="ex-band-er" height={260} dev={{ onEngine: (e) => track(e, 'b') }} />
      </div>
      <div style={card}>
        <AnatomyViewer highlights={{ 'achilles-tendon': 'injured', gastrocnemius: 'involved' }} height={260} dev={{ onEngine: (e) => track(e, 'c') }} />
      </div>
      <div style={{ height: 1600 }} />
      <div style={card}>
        <AnatomyViewer muscle="soleus" height={260} dev={{ onEngine: (e) => track(e, 'offscreen') }} />
      </div>
    </div>
  );
}

/** ?remount=<n> — mount / unmount the viewer n times (watch the console for leaks / context warnings). */
function Remount({ n }: { n: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= n * 2) {
      window.__tribody!.done = true;
      return;
    }
    const id = setTimeout(() => setI((x) => x + 1), 180);
    return () => clearTimeout(id);
  }, [i, n]);
  const on = i % 2 === 0 || i >= n * 2;
  useEffect(() => {
    if (on) window.__tribody!.remounts++;
  }, [on]);
  const muscles: MuscleId[] = ['gluteus-medius', 'supraspinatus', 'gastrocnemius', 'soleus'];
  return (
    <div style={{ padding: 12 }}>
      <p style={{ fontSize: 12 }}>
        remount {Math.ceil(i / 2)} / {n} · live engines {window.__tribody!.engines.size}
      </p>
      {on ? (
        <AnatomyViewer
          muscle={muscles[(i / 2) % muscles.length | 0]}
          height={300}
          dev={{
            onEngine: (e) => {
              if (e) window.__tribody!.engines.add(e);
              else window.__tribody!.engines.forEach((x) => x.isDisposed && window.__tribody!.engines.delete(x));
              window.__tribody!.engine = e;
              window.__tribody!.ready = !!e;
            },
          }}
        />
      ) : (
        <div style={{ height: 300 }} />
      )}
    </div>
  );
}

const page =
  q.get('coverage') === '1' ? <Coverage /> : q.get('multi') === '1' ? <Multi /> : q.has('remount') ? <Remount n={Number(q.get('remount')) || 10} /> : <Harness />;
// one root per page: when hot reload re-runs this module (a file it imports changed mid-load), reuse it instead of
// calling createRoot() on the same container again (React warns)
const host = document.getElementById('root')! as HTMLElement & { __root?: ReturnType<typeof createRoot> };
host.__root ??= createRoot(host);
host.__root.render(<StrictMode>{page}</StrictMode>);
