// Dev harness for the hip & knee region diagrams.
//   /dev/diagrams-hip-knee.html                         gallery: every view × (plain, labels off, highlights, spots)
//   ?r=hip&v=front&m=plain|nolabels|hl|spots|sel&hl=<set>  one diagram in a phone-like card (390 px)
//   &theme=dark|light   force theme   &zoom=x,y,w,h   crop the viewBox (detail check)
// Console: warns about overlapping / clipped labels and about `parts` / `spots` maps that do not match
// what a view actually draws (scripts/shot.mjs prints console output).
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PAIN_SPOTS, type MuscleId, type PainSpotId, type StructureId } from '../src/data/registry';
import type { Highlights, RegionDiagram } from '../src/svg/types';
import hip from '../src/svg/regions/hip';
import knee from '../src/svg/regions/knee';

const q = new URLSearchParams(location.search);
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme')!;

const DIAGRAMS: Record<string, RegionDiagram | undefined> = { hip, knee };

/** Highlight sets ≈ the condition pages (primary role → injured, others → involved). */
const SETS: Record<string, Highlights> = {
  gluteal: {
    'gluteal-tendons': 'injured',
    'trochanteric-bursa': 'injured',
    'iliotibial-band': 'involved',
    'gluteus-medius': 'involved',
    'gluteus-minimus': 'involved',
    'tensor-fasciae-latae': 'involved',
  },
  flexor: {
    iliopsoas: 'injured',
    'rectus-femoris': 'involved',
    'tensor-fasciae-latae': 'involved',
    sartorius: 'involved',
    'gluteus-maximus': 'involved',
  },
  labrum: { 'hip-labrum': 'injured', 'hip-joint': 'involved', iliopsoas: 'involved' },
  dgs: { 'sciatic-nerve': 'injured', piriformis: 'involved', 'gluteus-maximus': 'involved', 'gluteus-medius': 'involved' },
  pht: {
    'proximal-hamstring-tendon': 'injured',
    'ischial-tuberosity': 'injured',
    'biceps-femoris': 'involved',
    semitendinosus: 'involved',
    semimembranosus: 'involved',
    'gluteus-maximus': 'involved',
    'sciatic-nerve': 'involved',
  },
  groin: {
    'adductor-longus': 'injured',
    'pubic-symphysis': 'injured',
    gracilis: 'involved',
    'adductor-magnus': 'involved',
    'rectus-abdominis': 'involved',
  },
  pfp: {
    patella: 'injured',
    'patellofemoral-cartilage': 'involved',
    'vastus-medialis': 'involved',
    'vastus-lateralis': 'involved',
    'rectus-femoris': 'involved',
    'gluteus-medius': 'involved',
    'gluteus-maximus': 'involved',
  },
  itbs: {
    'lateral-femoral-epicondyle': 'injured',
    'iliotibial-band': 'involved',
    'tensor-fasciae-latae': 'involved',
    'gluteus-medius': 'involved',
    'gluteus-maximus': 'involved',
  },
  pt: {
    'patellar-tendon': 'injured',
    'vastus-lateralis': 'involved',
    'vastus-medialis': 'involved',
    'rectus-femoris': 'involved',
  },
  pes: {
    'pes-anserinus': 'injured',
    'pes-anserine-bursa': 'injured',
    semitendinosus: 'involved',
    gracilis: 'involved',
    sartorius: 'involved',
    'vastus-medialis': 'involved',
  },
  calf: { gastrocnemius: 'injured', soleus: 'injured', 'biceps-femoris': 'involved' },
};

/** Default highlight set per region view. */
const VIEW_SET: Record<string, string> = {
  'hip:front': 'flexor',
  'hip:back': 'pht',
  'hip:side': 'gluteal',
  'hip:deep': 'dgs',
  'knee:front': 'pfp',
  'knee:lateral': 'itbs',
  'knee:medial': 'pes',
  'knee:back': 'calf',
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

function Diagram({ d, view, mode, set, zoom }: { d: RegionDiagram; view: string; mode: Mode; set?: string; zoom?: string }) {
  const C = d.Component;
  const spots = d.spots[view] ?? [];
  const [sel, setSel] = useState<PainSpotId | null>(mode === 'spots' ? (spots[0] ?? null) : null);
  const [picked, setPicked] = useState<MuscleId | StructureId | null>(
    mode === 'sel' ? ((q.get('part') as MuscleId | StructureId | null) ?? d.parts[view]?.[0] ?? null) : null,
  );
  const hl: Highlights | undefined =
    mode === 'hl' ? SETS[set ?? VIEW_SET[`${d.region}:${view}`] ?? ''] : picked ? { [picked]: 'selected' } : undefined;
  useEffect(() => {
    if (!zoom) return;
    const svg = document.querySelector('svg.thk');
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

const overlap = (a: DOMRect, c: DOMRect) => a.x < c.x + c.width && c.x < a.x + a.width && a.y < c.y + c.height && c.y < a.y + a.height;

function checkLabels() {
  const out: string[] = [];
  document.querySelectorAll<SVGSVGElement>('svg.thk').forEach((svg, si) => {
    const name = svg.getAttribute('aria-label');
    const vb = svg.viewBox.baseVal;
    const boxes = [...svg.querySelectorAll<SVGTextElement>('.thk-lab text')].map((t) => ({ t: t.textContent, b: t.getBBox() }));
    for (const { t, b } of boxes) {
      if (b.x < vb.x - 0.5 || b.y < vb.y - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y + b.height > vb.y + vb.height + 0.5)
        out.push(`#${si} ${name}: label "${t}" clipped`);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        if (overlap(boxes[i].b, boxes[j].b)) out.push(`#${si} ${name}: "${boxes[i].t}" overlaps "${boxes[j].t}"`);
    const caps = [...svg.querySelectorAll<SVGTextElement>('.cap-t')].map((t) => t.getBBox());
    for (const { t, b } of boxes) for (const c of caps) if (overlap(b, c)) out.push(`#${si} ${name}: "${t}" overlaps caption`);
    // spots vs labels
    const spots = [...svg.querySelectorAll<SVGGElement>('.thk-spot .s-dot')].map((s) => s.getBBox());
    const spotIds = [...svg.querySelectorAll<SVGGElement>('.thk-spot')].map((s) => s.getAttribute('data-spot'));
    const ctm = (el: SVGGraphicsElement) => el.transform.baseVal.consolidate()?.matrix;
    [...svg.querySelectorAll<SVGGElement>('.thk-spot')].forEach((g, i) => {
      const m = ctm(g);
      if (!m) return;
      const r = new DOMRect(m.e - 9, m.f - 9, 18, 18);
      for (const { t, b } of boxes) if (overlap(b, r)) out.push(`#${si} ${name}: spot ${spotIds[i]} covers label "${t}"`);
    });
    void spots;
  });
  if (out.length) console.warn(`LABEL CHECK\n${[...new Set(out)].join('\n')}`);
  else console.log('label check ok');
}

/** parts / spots declared by the diagram must match what each view actually draws. */
function checkMaps(d: RegionDiagram, view: string, root: ParentNode) {
  const out: string[] = [];
  const drawn = new Set([...root.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part')!));
  const declared = new Set((d.parts[view] ?? []) as string[]);
  for (const id of drawn) if (!declared.has(id)) out.push(`${d.region}:${view} draws ${id} but parts[] does not list it`);
  for (const id of declared) if (!drawn.has(id)) out.push(`${d.region}:${view} lists ${id} in parts[] but does not draw it`);
  const sd = new Set([...root.querySelectorAll('[data-spot]')].map((e) => e.getAttribute('data-spot')!));
  const sdec = new Set((d.spots[view] ?? []) as string[]);
  if (sd.size) {
    for (const id of sd) if (!sdec.has(id)) out.push(`${d.region}:${view} draws spot ${id} not in spots[]`);
    for (const id of sdec) if (!sd.has(id)) out.push(`${d.region}:${view} lists spot ${id} but has no hotspot`);
  }
  return out;
}

function checkCoverage(d: RegionDiagram) {
  const all = new Set(Object.values(d.spots).flat() as string[]);
  return PAIN_SPOTS.filter((s) => s.region === d.region && !all.has(s.id)).map((s) => `${d.region}: pain spot ${s.id} has no hotspot`);
}

function Single() {
  const d = DIAGRAMS[q.get('r') ?? 'hip'] ?? hip!;
  const [view, setView] = useState(q.get('v') ?? d.views[0].id);
  const mode = (q.get('m') ?? 'plain') as Mode;
  useEffect(() => {
    const t = setTimeout(() => {
      checkLabels();
      if (mode === 'spots') {
        const issues = [...checkMaps(d, view, document), ...checkCoverage(d)];
        if (issues.length) console.warn(`MAP CHECK\n${issues.join('\n')}`);
        else console.log('map check ok');
      }
    }, 300);
    return () => clearTimeout(t);
  }, [view, d, mode]);
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
        <Diagram key={view + mode} d={d} view={view} mode={mode} set={q.get('hl') ?? undefined} zoom={q.get('zoom') ?? undefined} />
      </div>
    </div>
  );
}

function Gallery() {
  useEffect(() => {
    const t = setTimeout(() => {
      checkLabels();
      const issues: string[] = [];
      document.querySelectorAll<HTMLElement>('[data-mapcheck]').forEach((el) => {
        const [r, v] = el.dataset.mapcheck!.split(':');
        const d = DIAGRAMS[r];
        if (d) issues.push(...checkMaps(d, v, el));
      });
      for (const d of Object.values(DIAGRAMS)) if (d) issues.push(...checkCoverage(d));
      if (issues.length) console.warn(`MAP CHECK\n${[...new Set(issues)].join('\n')}`);
      else console.log('map check ok');
    }, 600);
    return () => clearTimeout(t);
  }, []);
  const modes: Mode[] = ['plain', 'nolabels', 'hl', 'spots'];
  const only = q.get('r');
  return (
    <div className="page">
      <h1>Hip &amp; knee region diagrams</h1>
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
                    <div className="card" key={m} data-mapcheck={m === 'spots' ? `${r}:${v.id}` : undefined}>
                      <h3>
                        {m}
                        {m === 'hl' ? ` (${VIEW_SET[`${r}:${v.id}`]})` : ''}
                      </h3>
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
