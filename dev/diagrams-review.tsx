// Independent review harness for ALL 2D illustrations (8 region diagrams + body map).
//
//   /dev/diagrams-review.html?r=knee                 phone-width gallery of every view of a region (plain)
//   ?r=knee&m=hl                                     every condition of the region, as its condition page shows it
//   ?r=knee&m=spots | nolabels                       every view with hotspots / without labels
//   ?r=knee&v=front[&m=..][&c=<conditionId>][&part=<id>][&zoom=x,y,w,h]   one view
//   ?c=<conditionId>                                 one condition (best view, injured/involved highlights, dimOthers)
//   ?bm=front|back|sole[&labels=1]                   body map
//   ?check=1                                         automated contract checks (results in console + on page)
//   &theme=dark|light                                force theme
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import '../src/styles/tokens.css';
import '../src/styles/base.css';
import '../src/styles/components.css';
import { MUSCLES, PAIN_SPOTS, STRUCTURES, type MuscleId, type PainSpotId, type RegionId, type StructureId } from '../src/data/registry';
import { conditions, muscles, structures } from '../src/data';
import type { Highlights, RegionDiagram } from '../src/svg/types';
import { getRegionDiagram } from '../src/svg/regions';
import { bestView, findDiagramFor } from '../src/components/RegionFigure';
import BodyMapView from '../src/svg/bodymap/BodyMapView';

const q = new URLSearchParams(location.search);
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme')!;

const REGIONS: RegionId[] = ['shoulder', 'neck', 'lowback', 'hip', 'knee', 'calf', 'ankle', 'foot'];
const PRIMARY = new Set(['injured', 'irritated', 'compressed']);
const IDS = new Set<string>([...MUSCLES.map((m) => m.id), ...STRUCTURES.map((s) => s.id)]);

function conditionHighlights(cid: string): { region: RegionId; hl: Highlights; refs: string[] } | null {
  const c = conditions.find((x) => x.id === cid);
  if (!c) return null;
  const hl: Highlights = {};
  for (const i of c.involved ?? []) hl[i.ref] = PRIMARY.has(i.role) ? 'injured' : 'involved';
  return { region: c.region, hl, refs: (c.involved ?? []).map((i) => i.ref as string) };
}

const css = `
.rv { max-width: 640px; margin: 0 auto; padding: 12px 16px 40px; }
.rv h1 { font-size: 16px; margin: 4px 0 8px; }
.rv h2 { font-size: 13px; margin: 18px 0 6px; color: var(--text-2); font-weight: 700; }
.rv .cardx { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 12px; box-shadow: 0 1px 2px rgb(0 0 0 / .05); }
.rv .meta { font-size: 11px; color: var(--text-2); margin: 6px 0 0; line-height: 1.5; word-break: break-all; }
.rv .meta b { color: var(--injured); }
.rv pre { white-space: pre-wrap; font-size: 11px; line-height: 1.45; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 10px; }
.rv .bm { max-width: 390px; margin: 0 auto; }
`;

function View({ d, view, hl, dim, mode, zoom, onPick }: { d: RegionDiagram; view: string; hl?: Highlights; dim?: boolean; mode: string; zoom?: string; onPick?: (s: string) => void }) {
  const C = d.Component;
  const [sel, setSel] = useState<PainSpotId | null>(null);
  const [picked, setPicked] = useState<MuscleId | StructureId | null>((q.get('part') as MuscleId | null) ?? null);
  useEffect(() => {
    if (!zoom) return;
    document.querySelectorAll('svg[viewBox]').forEach((s) => {
      if (s.closest('.cardx')) s.setAttribute('viewBox', zoom.replace(/,/g, ' '));
    });
  });
  const h: Highlights | undefined = hl ?? (picked ? { [picked]: 'selected' } : undefined);
  return (
    <C
      view={view}
      highlights={h}
      dimOthers={dim ?? !!picked}
      showLabels={mode !== 'nolabels'}
      showSpots={mode === 'spots'}
      selectedSpot={sel}
      onSpotSelect={(id) => {
        setSel((c) => (c === id ? null : id));
        onPick?.(`spot ${id}`);
      }}
      onPartSelect={(id) => {
        if (!hl) setPicked((c) => (c === id ? null : id));
        onPick?.(`part ${id}`);
      }}
    />
  );
}

function RegionGallery({ r }: { r: RegionId }) {
  const d = getRegionDiagram(r);
  const mode = q.get('m') ?? 'plain';
  const [msg, setMsg] = useState('');
  if (!d) return <p>{r}: no diagram</p>;
  if (q.get('v')) {
    const cid = q.get('c');
    const ch = cid ? conditionHighlights(cid) : null;
    return (
      <div className="cardx">
        <View d={d} view={q.get('v')!} hl={ch?.hl} dim={!!ch} mode={mode} zoom={q.get('zoom') ?? undefined} onPick={setMsg} />
        <p className="meta">{msg}</p>
      </div>
    );
  }
  if (mode === 'hl') {
    return (
      <>
        {conditions
          .filter((c) => c.region === r)
          .map((c) => {
            const ch = conditionHighlights(c.id)!;
            const v = bestView(d, ch.refs);
            const drawn = new Set((d.parts[v] ?? []) as string[]);
            const missing = (c.involved ?? []).filter((i) => !drawn.has(i.ref));
            return (
              <section key={c.id}>
                <h2>
                  {c.id} → {v}
                </h2>
                <div className="cardx">
                  <View d={d} view={v} hl={ch.hl} dim mode="plain" />
                  <p className="meta">
                    not in view:{' '}
                    {missing.map((i) => (
                      <span key={i.ref}>{PRIMARY.has(i.role) ? <b>{i.ref}*</b> : i.ref} </span>
                    ))}
                  </p>
                </div>
              </section>
            );
          })}
      </>
    );
  }
  return (
    <>
      {d.views.map((v) => (
        <section key={v.id}>
          <h2>
            {r} · {v.id}（{v.label}）
          </h2>
          <div className="cardx">
            <View d={d} view={v.id} mode={mode} onPick={setMsg} />
          </div>
        </section>
      ))}
      <p className="meta">{msg}</p>
    </>
  );
}

function ConditionOne({ cid }: { cid: string }) {
  const ch = conditionHighlights(cid);
  if (!ch) return <p>unknown condition</p>;
  const d = getRegionDiagram(ch.region);
  if (!d) return <p>no diagram</p>;
  const v = q.get('v') ?? bestView(d, ch.refs);
  return (
    <>
      <h2>
        {cid} → {ch.region}:{v}
      </h2>
      <div className="cardx">
        <View d={d} view={v} hl={ch.hl} dim mode="plain" zoom={q.get('zoom') ?? undefined} />
      </div>
    </>
  );
}

/** Every muscle as its muscle page shows it (findDiagramFor → selected + dimOthers). */
function MuscleGallery() {
  const only = q.get('mr');
  return (
    <>
      {muscles
        .filter((m) => !only || m.regions[0] === only)
        .map((m) => {
          const f = findDiagramFor(m.id, m.regions);
          const d = f ? getRegionDiagram(f.region) : undefined;
          return (
            <section key={m.id}>
              <h2>
                {m.id} → {f ? `${f.region}:${f.view}` : 'NONE'}
              </h2>
              {d && f && (
                <div className="cardx">
                  <View d={d} view={f.view} hl={{ [m.id]: 'selected' } as Highlights} dim mode="nolabels" />
                </div>
              )}
            </section>
          );
        })}
    </>
  );
}

function BodyMapOne() {
  const view = (q.get('bm') ?? 'front') as 'front' | 'back' | 'sole';
  const [sel, setSel] = useState<{ id: PainSpotId; side: string } | null>(null);
  return (
    <div className="bm">
      <BodyMapView
        view={view}
        showLabels={q.get('labels') === '1'}
        selectedSpot={sel?.id ?? (q.get('sel') as PainSpotId | null)}
        onSelect={(id, side) => setSel({ id, side })}
        debugViewBox={q.get('zoom')?.replace(/,/g, ' ')}
      />
      <p className="meta" id="bm-out">
        {sel ? `${sel.id} / ${sel.side}` : ''}
      </p>
    </div>
  );
}

/* ─────────────────────────────── automated checks ─────────────────────────────── */

const overlap = (a: DOMRect, c: DOMRect) => a.x < c.x + c.width - 0.5 && c.x < a.x + a.width - 0.5 && a.y < c.y + c.height - 0.5 && c.y < a.y + a.height - 0.5;

function runChecks(): string[] {
  const out: string[] = [];
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:0;top:0;width:358px;visibility:hidden';
  document.body.appendChild(host);
  const noAnim = document.createElement('style');
  noAnim.textContent = '* { transition: none !important; animation: none !important; }';
  document.head.appendChild(noAnim);
  const root = createRoot(host);
  const render = (el: React.ReactNode) => flushSync(() => root.render(el));

  for (const r of REGIONS) {
    const d = getRegionDiagram(r);
    if (!d) {
      out.push(`${r}: NO DIAGRAM`);
      continue;
    }
    const C = d.Component;
    const allDrawn = new Set<string>();
    const allSpots = new Set<string>();
    for (const v of d.views) {
      const tag = `${r}:${v.id}`;
      let tapped: string[] = [];
      render(
        <C
          view={v.id}
          showSpots
          onSpotSelect={(id) => tapped.push(`s:${id}`)}
          onPartSelect={(id) => tapped.push(`p:${id}`)}
        />,
      );
      const svg = host.querySelector('svg')!;
      if (!svg.getAttribute('viewBox')) out.push(`${tag}: svg without viewBox`);
      if (!svg.querySelector(':scope > title') && !svg.getAttribute('aria-label')) out.push(`${tag}: svg without title/aria-label`);
      const rect = svg.getBoundingClientRect();
      if (Math.abs(rect.width - 358) > 1) out.push(`${tag}: svg width ${rect.width.toFixed(0)} (expected 358)`);
      // parts
      const drawn = new Set([...host.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part')!));
      const declared = new Set((d.parts[v.id] ?? []) as string[]);
      for (const id of drawn) {
        allDrawn.add(id);
        if (!IDS.has(id)) out.push(`${tag}: data-part "${id}" NOT IN REGISTRY`);
        if (!declared.has(id)) out.push(`${tag}: draws ${id} but parts[] does not list it`);
      }
      for (const id of declared) if (!drawn.has(id)) out.push(`${tag}: parts[] lists ${id} but view does not draw it`);
      // spots
      const sEls = [...host.querySelectorAll<SVGGElement>('[data-spot]')];
      const sd = new Set(sEls.map((e) => e.getAttribute('data-spot')!));
      const sdec = new Set((d.spots[v.id] ?? []) as string[]);
      for (const id of sd) {
        allSpots.add(id);
        if (!sdec.has(id)) out.push(`${tag}: hotspot ${id} not in spots[]`);
      }
      for (const id of sdec) if (!sd.has(id)) out.push(`${tag}: spots[] lists ${id} but no hotspot drawn`);
      for (const e of sEls) {
        const b = e.getBoundingClientRect();
        if (b.width < 40 || b.height < 40) out.push(`${tag}: hotspot ${e.getAttribute('data-spot')} touch target ${b.width.toFixed(0)}×${b.height.toFixed(0)} px (<40)`);
      }
      // hotspots too close together → ambiguous taps
      const cs = sEls.map((e) => {
        const b = e.getBoundingClientRect();
        return { id: e.getAttribute('data-spot'), x: b.x + b.width / 2, y: b.y + b.height / 2 };
      });
      for (let i = 0; i < cs.length; i++)
        for (let j = i + 1; j < cs.length; j++) {
          const dd = Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y);
          if (dd < 34) out.push(`${tag}: hotspots ${cs[i].id} / ${cs[j].id} only ${dd.toFixed(0)} px apart`);
        }
      // labels
      const labs = [...host.querySelectorAll<SVGTextElement>('[class*="-lab"] text')];
      const boxes = labs.map((t) => ({ t: t.textContent ?? '', b: t.getBoundingClientRect() }));
      for (const { t, b } of boxes) {
        if (b.left < rect.left - 0.5 || b.right > rect.right + 0.5 || b.top < rect.top - 0.5 || b.bottom > rect.bottom + 0.5)
          out.push(`${tag}: label "${t}" clipped`);
        const fs = parseFloat(getComputedStyle(labs[boxes.findIndex((x) => x.t === t)]).fontSize) * (rect.width / svg.viewBox.baseVal.width);
        if (fs < 11 || fs > 13.5) out.push(`${tag}: label "${t}" renders at ${fs.toFixed(1)} px`);
      }
      const caps = [...host.querySelectorAll<SVGTextElement>('.cap-t')].map((t) => ({ t: t.textContent ?? '', b: t.getBoundingClientRect() }));
      for (const c of caps) {
        if (c.b.left < rect.left - 0.5 || c.b.right > rect.right + 0.5) out.push(`${tag}: caption "${c.t}" clipped`);
        for (const { t, b } of boxes) if (overlap(b, c.b)) out.push(`${tag}: label "${t}" overlaps caption "${c.t}"`);
      }
      for (let i = 0; i < caps.length; i++) for (let j = i + 1; j < caps.length; j++) if (overlap(caps[i].b, caps[j].b)) out.push(`${tag}: captions overlap`);
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) if (overlap(boxes[i].b, boxes[j].b)) out.push(`${tag}: "${boxes[i].t}" overlaps "${boxes[j].t}"`);
      for (const e of sEls) {
        const b = e.getBoundingClientRect();
        const c = new DOMRect(b.x + b.width / 2 - 8, b.y + b.height / 2 - 8, 16, 16);
        for (const { t, b: lb } of boxes) if (overlap(lb, c)) out.push(`${tag}: hotspot ${e.getAttribute('data-spot')} sits on label "${t}"`);
      }
      // taps
      tapped = [];
      for (const e of sEls) e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const st = tapped.filter((x) => x.startsWith('s:')).map((x) => x.slice(2));
      if (st.join() !== sEls.map((e) => e.getAttribute('data-spot')).join()) out.push(`${tag}: onSpotSelect mismatch ${st.join()}`);
      for (const id of drawn) {
        tapped = [];
        const el = host.querySelector(`[data-part="${id}"]`)!;
        const target = el.querySelector('path, ellipse, circle, rect') ?? el;
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (tapped[0] !== `p:${id}`) out.push(`${tag}: tapping ${id} → ${tapped.join() || 'nothing'}`);
      }
      // showLabels=false hides labels; showSpots=false hides spots
      render(<C view={v.id} showLabels={false} />);
      if (host.querySelectorAll('[class*="-lab"] text').length) out.push(`${tag}: labels still drawn with showLabels=false`);
      if (host.querySelectorAll('[data-spot]').length) out.push(`${tag}: hotspots drawn without showSpots`);
      // highlight + dim
      const first = [...drawn][0];
      if (first) {
        render(<C view={v.id} highlights={{ [first]: 'injured' } as Highlights} dimOthers />);
        const el = host.querySelector(`[data-part="${first}"]`)!;
        if (!/injured/.test(el.getAttribute('class') ?? '')) out.push(`${tag}: injured class missing on ${first}`);
        const others = [...host.querySelectorAll('[data-part]')].filter((e) => e.getAttribute('data-part') !== first);
        const notDim = others.filter((e) => parseFloat(getComputedStyle(e).opacity) > 0.4);
        if (notDim.length) out.push(`${tag}: dimOthers leaves ${notDim.length} parts undimmed (${[...new Set(notDim.map((e) => e.getAttribute('data-part')))].slice(0, 4).join(',')})`);
      }
    }
    // region completeness
    for (const s of PAIN_SPOTS.filter((s) => s.region === r)) if (!allSpots.has(s.id)) out.push(`${r}: pain spot ${s.id} unreachable`);
    for (const s of structures.filter((s) => s.regions?.[0] === r)) if (!allDrawn.has(s.id)) out.push(`${r}: structure ${s.id} (${s.nameJa}) not drawn in any view`);
    for (const m of muscles.filter((m) => m.regions?.[0] === r)) if (!allDrawn.has(m.id)) out.push(`${r}: primary muscle ${m.id} not drawn in any view`);
    for (const c of conditions.filter((c) => c.region === r)) {
      const ch = conditionHighlights(c.id)!;
      const v = bestView(d, ch.refs);
      const p = new Set((d.parts[v] ?? []) as string[]);
      const miss = (c.involved ?? []).filter((i) => PRIMARY.has(i.role) && !p.has(i.ref)).map((i) => i.ref);
      if (miss.length) out.push(`${r}: condition ${c.id} → ${v}: PRIMARY not shown: ${miss.join(', ')}`);
    }
  }
  root.unmount();
  host.remove();
  noAnim.remove();
  return out;
}

function Checks() {
  const [res, setRes] = useState<string[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const r = runChecks();
      setRes(r);
      console.warn(r.length ? `CHECKS: ${r.length} issue(s)\n${r.join('\n')}` : 'CHECKS: all ok');
    }, 200);
    return () => clearTimeout(t);
  }, []);
  return <pre>{res ? (res.length ? res.join('\n') : 'all ok') : 'running…'}</pre>;
}

function App() {
  const r = q.get('r') as RegionId | null;
  return (
    <div className="rv">
      <style>{css}</style>
      {q.get('check') ? (
        <Checks />
      ) : q.get('muscles') ? (
        <MuscleGallery />
      ) : q.get('bm') ? (
        <BodyMapOne />
      ) : q.get('c') && !r ? (
        <ConditionOne cid={q.get('c')!} />
      ) : r ? (
        <RegionGallery r={r} />
      ) : (
        <ul>
          {REGIONS.map((x) => (
            <li key={x}>
              <a href={`?r=${x}`}>{x}</a> · <a href={`?r=${x}&m=hl`}>conditions</a> · <a href={`?r=${x}&m=spots`}>spots</a>
            </li>
          ))}
          <li>
            <a href="?check=1">checks</a>
          </li>
        </ul>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
