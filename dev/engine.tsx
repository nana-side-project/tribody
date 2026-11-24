// Dev harness for the 3D engine. Open /dev/engine.html with URL params:
//   ?muscle=<id> | ?exercise=<id> | ?hl=id:role,id:role | ?pose=<BASE_POSE>
//   ?t=0..1 (freeze) ?cam=front|back|left|right|top|iso|isoBack|isoLeft ?focus=<region>
//   ?j=shoulder_R.flex:170,elbow_R.flex:90 (joint overrides)  ?labels=0 ?skin=0.25 ?all=1 ?debug=1 [&lm=<bone>] ?coverage=1 ?card=1 (320px card) ?controls=0 ?theme=dark
// window.__tribody = { ready, setTime(t), engine } for screenshot scripts.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EXERCISES, MUSCLES, REGIONS, STRUCTURES } from '../src/data/registry';
import type { ExerciseId, MuscleId, RegionId, StructureId } from '../src/data/registry';
import AnatomyViewer from '../src/three/AnatomyViewer';
import { CLIPS } from '../src/three/clips';
import type { Highlight3DRole } from '../src/three/contract';
import type { Engine } from '../src/three/engine';
import { BASE_POSE_NAMES, type BasePoseName, type CameraPresetName, type Pose } from '../src/three/rig';
import { MUSCLE_RIGS, STRUCTURE_RIGS } from '../src/three/rig-data';

declare global {
  interface Window {
    __tribody?: { ready: boolean; setTime: (t: number) => void; engine: Engine | null };
  }
}

const q = new URLSearchParams(location.search);
const num = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined);
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme')!;

window.__tribody = { ready: false, setTime: () => {}, engine: null };

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
  const highlights = parseHl(q.get('hl'));
  const focus = (q.get('focus') as RegionId) || undefined;
  const pose = (q.get('pose') as BasePoseName) || undefined;
  const card = q.get('card') === '1';
  if (pose && !(BASE_POSE_NAMES as readonly string[]).includes(pose) && pose !== 'ANATOMICAL') console.warn('unknown pose', pose);
  const viewer = (
    <AnatomyViewer
      muscle={muscle}
      exercise={exercise}
      highlights={highlights}
      focus={focus && REGIONS.some((r) => r.id === focus) ? focus : undefined}
      labels={q.get('labels') !== '0'}
      controls={q.get('controls') !== '0'}
      autoPlay={q.get('autoplay') !== '0'}
      height={card ? (num('h') ?? 320) : '100%'}
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
          window.__tribody!.engine = e;
          window.__tribody!.setTime = (t: number) => e?.setTime(t);
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
      <h1 style={{ fontSize: 20, margin: '8px 0 4px' }}>{muscle ? MUSCLES.find((m) => m.id === muscle)?.ja : exercise ? EXERCISES.find((x) => x.id === exercise)?.ja : '3D'}</h1>
      <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 12px' }}>カードに埋め込んだ表示（アプリ内と同じ 320px）</p>
      <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: '0 1px 2px rgb(30 27 24 / .04), 0 8px 24px -12px rgb(30 27 24 / .16)', overflow: 'hidden' }}>
        {viewer}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
        ドラッグで回転、ピンチで拡大できます。オレンジの点が起始、青い点が停止です。
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode>{q.get('coverage') === '1' ? <Coverage /> : <Harness />}</StrictMode>);
