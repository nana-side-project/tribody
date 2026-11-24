// Dev harness for the upper-body region diagrams (shoulder / neck / lowback).
//   /dev/diagrams-upper.html                          gallery: every view × (plain, labels off, highlights, spots)
//   ?r=shoulder&v=front&m=plain|nolabels|hl|spots|sel  one diagram in a phone-like card (390 px)
//   &theme=dark|light   force theme   &zoom=x,y,w,h   crop the viewBox (detail check)
// Logs a console warning for overlapping / clipped labels (scripts/shot.mjs prints it).
import { StrictMode, useEffect, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import type { MuscleId, PainSpotId, StructureId } from '../src/data/registry';
import type { Highlights, RegionDiagram } from '../src/svg/types';
import shoulder from '../src/svg/regions/shoulder';
import neck from '../src/svg/regions/neck';
import lowback from '../src/svg/regions/lowback';

const q = new URLSearchParams(location.search);
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme')!;

const DIAGRAMS: Record<string, RegionDiagram | undefined> = { shoulder, neck, lowback };

/** Example highlight sets (≈ the condition pages): injured + involved, with dimOthers. */
const HL: Record<string, Highlights> = {
  shoulder: {
    supraspinatus: 'injured',
    'subacromial-bursa': 'injured',
    infraspinatus: 'involved',
    'posterior-capsule': 'involved',
    'pectoralis-minor': 'involved',
    'serratus-anterior': 'involved',
    trapezius: 'involved',
    'biceps-long-head-tendon': 'involved',
  },
  neck: {
    'cervical-spine': 'injured',
    trapezius: 'involved',
    'levator-scapulae': 'involved',
    'deep-neck-flexors': 'involved',
    rhomboids: 'involved',
  },
  lowback: {
    'intervertebral-disc': 'injured',
    'erector-spinae': 'injured',
    multifidus: 'involved',
    'transversus-abdominis': 'involved',
    'quadratus-lumborum': 'involved',
    'thoracolumbar-fascia': 'involved',
  },
};

const css = `
.page { max-width: 1240px; margin: 0 auto; padding: 16px; }
h1 { font-size: 18px; margin: 4px 0 2px; }
h2 { font-size: 15px; margin: 26px 0 8px; color: var(--text-2); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 12px; }
.card h3 { margin: 0 0 6px; font-size: 12px; color: var(--text-2); font-weight: 600; }
.phone { padding: 12px 16px; }
.readout { margin-top: 8px; font-size: 13px; color: var(--text-2); min-height: 20px; }
.tabs { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
.tabs button { flex: 1; min-height: 32px; border: 0; border-radius: 10px; background: var(--surface-2); color: var(--text-2); font: inherit; font-size: 12.5px; font-weight: 700; }
.tabs button[aria-pressed="true"] { background: var(--text); color: var(--surface); }
`;

type Mode = 'plain' | 'nolabels' | 'hl' | 'spots' | 'sel';

function Diagram({ d, view, mode, zoom }: { d: RegionDiagram; view: string; mode: Mode; zoom?: string }) {
  const C = d.Component;
  const spots = d.spots[view] ?? [];
  const [sel, setSel] = useState<PainSpotId | null>(mode === 'spots' ? (spots[0] ?? null) : null);
  const [picked, setPicked] = useState<MuscleId | StructureId | null>(mode === 'sel' ? (d.parts[view]?.[0] ?? null) : null);
  const hl: Highlights | undefined =
    mode === 'hl' ? HL[d.region] : picked ? { [picked]: 'selected' } : undefined;
  useEffect(() => {
    if (!zoom) return;
    const svg = document.querySelector('svg.tbu');
    if (svg) svg.setAttribute('viewBox', zoom.replace(/,/g, ' '));
  });
  return (
    <>
      <C
        view={view}
        highlights={hl}
        dimOthers={mode === 'hl' || mode === 'sel'}
        showLabels={mode !== 'nolabels'}
        showSpots={mode === 'spots'}
        selectedSpot={sel}
        onSpotSelect={(id) => setSel((c) => (c === id ? null : id))}
        onPartSelect={(id) => setPicked((c) => (c === id ? null : id))}
      />
      <div className="readout">
        {sel ? `spot: ${sel}` : ''} {picked ? `part: ${picked}` : ''}
      </div>
    </>
  );
}

function checkLabels() {
  const out: string[] = [];
  document.querySelectorAll<SVGSVGElement>('svg.tbu').forEach((svg, si) => {
    const vb = svg.viewBox.baseVal;
    const boxes = [...svg.querySelectorAll<SVGTextElement>('.tbu-lab text')].map((t) => ({ t: t.textContent, b: t.getBBox() }));
    for (const { t, b } of boxes) {
      if (b.x < vb.x - 0.5 || b.y < vb.y - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y + b.height > vb.y + vb.height + 0.5)
        out.push(`#${si} ${svg.getAttribute('aria-label')}: label "${t}" clipped`);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].b;
        const c = boxes[j].b;
        if (a.x < c.x + c.width && c.x < a.x + a.width && a.y < c.y + c.height && c.y < a.y + a.height)
          out.push(`#${si} ${svg.getAttribute('aria-label')}: "${boxes[i].t}" overlaps "${boxes[j].t}"`);
      }
    const caps = [...svg.querySelectorAll<SVGTextElement>('.cap-t')].map((t) => t.getBBox());
    for (const { t, b } of boxes)
      for (const c of caps)
        if (b.x < c.x + c.width && c.x < b.x + b.width && b.y < c.y + c.height && c.y < b.y + b.height)
          out.push(`#${si} ${svg.getAttribute('aria-label')}: "${t}" overlaps caption`);
  });
  if (out.length) console.warn(`LABEL CHECK\n${[...new Set(out)].join('\n')}`);
  else console.log('label check ok');
}

function Single() {
  const d = DIAGRAMS[q.get('r') ?? 'shoulder'] ?? shoulder;
  const [view, setView] = useState(q.get('v') ?? d.views[0].id);
  const mode = (q.get('m') ?? 'plain') as Mode;
  useEffect(() => {
    const t = setTimeout(checkLabels, 300);
    return () => clearTimeout(t);
  }, [view]);
  return (
    <div className="phone">
      <div className="card">
        {d.views.length > 1 && (
          <div className="tabs">
            {d.views.map((v) => (
              <button key={v.id} aria-pressed={v.id === view} onClick={() => setView(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
        )}
        <Diagram key={view + mode} d={d} view={view} mode={mode} zoom={q.get('zoom') ?? undefined} />
      </div>
    </div>
  );
}

function Gallery() {
  useEffect(() => {
    const t = setTimeout(checkLabels, 500);
    return () => clearTimeout(t);
  }, []);
  const modes: Mode[] = ['plain', 'nolabels', 'hl', 'spots'];
  const only = q.get('r');
  return (
    <div className="page">
      <h1>Upper region diagrams</h1>
      {Object.entries(DIAGRAMS)
        .filter(([r]) => !only || r === only)
        .map(([r, d]) =>
          d ? (
            d.views.map((v) => (
              <section key={r + v.id}>
                <h2>
                  {r} · {v.id} ({v.label}) — parts: {d.parts[v.id]?.length ?? 0}, spots: {(d.spots[v.id] ?? []).join(', ')}
                </h2>
                <div className="grid">
                  {modes.map((m) => (
                    <div className="card" key={m} style={{ '--x': 1 } as CSSProperties}>
                      <h3>{m}</h3>
                      <Diagram d={d} view={v.id} mode={m} />
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <h2 key={r}>{r}: not implemented yet</h2>
          ),
        )}
    </div>
  );
}

function App() {
  return (
    <>
      <style>{css}</style>
      {q.get('v') || q.get('m') ? <Single /> : <Gallery />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
