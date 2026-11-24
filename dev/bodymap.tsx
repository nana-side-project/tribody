// Dev harness for the home-screen body map.
//   /dev/bodymap.html                     interactive map + gallery (labelled views, selected & intensity examples)
//   ?only=front|back|sole                 phone mock of the home screen with just the map
//   &labels=1 &debug=1 &sel=<spot> &side=right|left &heat=1 &active=1
import { StrictMode, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import type { PainSpotId } from '../src/data/registry';
import { PAIN_SPOTS } from '../src/data/registry';
import BodyMap, { BodyMapView } from '../src/svg/BodyMap';

type View = 'front' | 'back' | 'sole';
const q = new URLSearchParams(location.search);
const only = q.get('only') as View | null;
const flag = (k: string) => q.get(k) === '1';

const HEAT: Partial<Record<PainSpotId, number>> = {
  'achilles-mid': 7,
  'calf-lower': 4,
  'knee-outer': 9,
  'lowback-center': 2,
  'shoulder-top': 5,
  'heel-bottom': 8,
  arch: 3,
  'knee-front': 6,
  'hip-outer': 1,
};
const ACTIVE: PainSpotId[] = ['knee-front', 'shoulder-back', 'sit-bone', 'forefoot-ball', 'ankle-outer'];

const css = `
.page { max-width: 1100px; margin: 0 auto; padding: 16px; }
h1 { font-size: 18px; margin: 4px 0 2px; }
h2 { font-size: 15px; margin: 28px 0 8px; color: var(--text-2); font-weight: 600; }
.note { font-size: 12px; color: var(--text-2); margin: 0 0 12px; }
.seg { display: flex; gap: 4px; background: var(--surface-2); padding: 4px; border-radius: 999px; margin: 8px auto 6px; max-width: 320px; }
.seg button { flex: 1; min-height: 40px; border: 0; border-radius: 999px; background: transparent; color: var(--text-2); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.seg button[aria-pressed="true"] { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.readout { min-height: 44px; margin: 6px 0 0; padding: 10px 14px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); font-size: 14px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 12px; }
.card h3 { margin: 0 0 6px; font-size: 13px; color: var(--text-2); font-weight: 600; }
.phone { padding: 12px 16px 0; }
.phone .title { font-size: 20px; font-weight: 700; margin: 6px 0 2px; }
.phone .sub { font-size: 13px; color: var(--text-2); margin: 0; }
.labelled .tb-bodymap > svg { max-height: none; }
`;

function Interactive({ initial = 'front' as View, compact = false }) {
  const [view, setView] = useState<View>(only ?? initial);
  const [sel, setSel] = useState<{ id: PainSpotId; side: 'left' | 'right' } | null>(
    q.get('sel') ? { id: q.get('sel') as PainSpotId, side: (q.get('side') as 'left' | 'right') ?? 'right' } : null,
  );
  const label = sel ? PAIN_SPOTS.find((s) => s.id === sel.id)?.ja : null;
  return (
    <div>
      <div className="seg" role="group" aria-label="表示">
        {(['front', 'back', 'sole'] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
            {v === 'front' ? '前' : v === 'back' ? '後ろ' : '足裏'}
          </button>
        ))}
      </div>
      <BodyMapView
        view={view}
        selectedSpot={sel?.id ?? null}
        selectedSide={q.get('side') ? sel?.side : undefined}
        onSelect={(id, side) => setSel({ id, side })}
        activeSpots={flag('active') ? ACTIVE : undefined}
        intensity={flag('heat') ? HEAT : undefined}
        showLabels={flag('labels')}
        debugHits={flag('debug')}
        debugViewBox={q.get('vb')?.replace(/,/g, ' ') ?? undefined}
      />
      {!compact && (
        <div className="readout" aria-live="polite">
          {sel ? (
            <>
              選択: <b>{label}</b>（{sel.side === 'right' ? '右' : '左'}） <code style={{ fontSize: 11, opacity: 0.7 }}>{sel.id}</code>
            </>
          ) : (
            '痛む場所をタップしてください'
          )}
        </div>
      )}
    </div>
  );
}

function Phone() {
  return (
    <div className="phone" style={flag('big') ? ({ '--tb-bodymap-max-h': 'none' } as CSSProperties) : undefined}>
      <div className="title">どこが痛みますか？</div>
      <p className="sub">痛む場所をタップすると、考えられる原因が表示されます。</p>
      <Interactive />
    </div>
  );
}

function Gallery() {
  return (
    <div className="page">
      <h1>Body map — dev harness</h1>
      <p className="note">
        Original SVG artwork. Front view: the figure's right is on the viewer's left. Sole view: both soles seen from below
        (toes up) — the right sole is on the viewer's left. Hit areas are 44 px; ambiguous taps open a chooser.
      </p>

      <h2>Interactive</h2>
      <div style={{ maxWidth: 420 }}>
        <Interactive />
      </div>

      <h2>All hotspots labelled</h2>
      <div className="grid labelled">
        {(['front', 'back', 'sole'] as const).map((v) => (
          <div className="card" key={v}>
            <h3>{v}</h3>
            <BodyMapView view={v} showLabels />
          </div>
        ))}
      </div>

      <h2>Selected example (knee-outer, right) + active spots</h2>
      <div className="grid">
        <div className="card">
          <h3>front · selected knee-outer (right) · active</h3>
          <BodyMapView view="front" selectedSpot="knee-outer" selectedSide="right" activeSpots={ACTIVE} />
        </div>
        <div className="card">
          <h3>back · selected achilles-mid (both sides, no pick)</h3>
          <BodyMap view="back" selectedSpot="achilles-mid" activeSpots={ACTIVE} />
        </div>
      </div>

      <h2>Intensity example (pain log heat tint)</h2>
      <div className="grid">
        {(['front', 'back', 'sole'] as const).map((v) => (
          <div className="card" key={v}>
            <h3>{v} · intensity</h3>
            <BodyMap view={v} intensity={HEAT} activeSpots={ACTIVE} />
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <style>{css}</style>
      {only ? <Phone /> : <Gallery />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
