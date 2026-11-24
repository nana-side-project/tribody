// Dev harness for UI-shell components that depend on parallel work (region diagrams).
// /dev/ui-shell.html — RegionFigure with a mock diagram (view tabs, spots, highlights, dim).
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { PainSpotId } from '../src/data/registry';
import type { RegionDiagram, RegionDiagramProps } from '../src/svg/types';
import { RegionFigure } from '../src/components/RegionFigure';
import '../src/styles/tokens.css';
import '../src/styles/base.css';
import '../src/styles/components.css';

function Mock({ view = 'front', highlights = {}, dimOthers, showSpots, selectedSpot, onSpotSelect }: RegionDiagramProps) {
  const fill = (id: string, base: string) => {
    const h = (highlights as Record<string, string>)[id];
    if (h === 'injured') return 'var(--injured)';
    if (h) return 'var(--muscle)';
    return base;
  };
  const op = (id: string) => (dimOthers && !(highlights as Record<string, string>)[id] ? 0.25 : 1);
  const spot = (id: PainSpotId, x: number, y: number) =>
    showSpots && (
      <circle
        key={id}
        data-spot={id}
        cx={x}
        cy={y}
        r={selectedSpot === id ? 12 : 9}
        fill={selectedSpot === id ? 'var(--injured)' : 'var(--accent-soft)'}
        stroke="var(--accent)"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={() => onSpotSelect?.(id)}
      />
    );
  return (
    <svg viewBox="0 0 300 260" role="img" aria-label={`mock ${view}`}>
      <rect width="300" height="260" fill="var(--surface)" />
      <rect data-part="tibia" x="130" y="150" width="40" height="100" rx="12" fill={fill('tibia', 'var(--bone)')} opacity={op('tibia')} stroke="var(--bone-ink)" />
      <ellipse data-part="patella" cx="150" cy="130" rx="22" ry="26" fill={fill('patella', 'var(--bone)')} opacity={op('patella')} stroke="var(--bone-ink)" />
      <path data-part="vastus-medialis" d="M110 20 C 90 80, 100 110, 130 120 L 140 30 Z" fill={fill('vastus-medialis', 'var(--muscle-light)')} opacity={op('vastus-medialis')} />
      {view === 'front' && (
        <path data-part="vastus-lateralis" d="M190 20 C 210 80, 200 110, 170 120 L 160 30 Z" fill={fill('vastus-lateralis', 'var(--muscle-light)')} opacity={op('vastus-lateralis')} />
      )}
      <text x="12" y="250" fontSize="11" fill="var(--text-2)">mock diagram — {view}</text>
      {view === 'front' ? [spot('knee-front', 150, 130), spot('knee-below', 150, 168)] : [spot('knee-outer', 200, 140)]}
    </svg>
  );
}

const mock: RegionDiagram = {
  region: 'knee',
  views: [
    { id: 'front', label: '前から' },
    { id: 'side', label: '横から' },
  ],
  parts: { front: ['patella', 'tibia', 'vastus-medialis', 'vastus-lateralis'], side: ['patella', 'tibia', 'vastus-medialis'] },
  spots: { front: ['knee-front', 'knee-below'], side: ['knee-outer'] },
  Component: Mock,
};

function App() {
  const [spot, setSpot] = useState<PainSpotId | null>(null);
  return (
    <main className="page" style={{ paddingTop: 16 }}>
      <h2>RegionFigure — spots</h2>
      <div style={{ marginTop: 10 }}>
        <RegionFigure region="knee" diagram={mock} showSpots selectedSpot={spot} onSpotSelect={(s) => setSpot((c) => (c === s ? null : s))} caption="tap a spot" />
      </div>
      <p className="small" id="sel">selected: {spot ?? '—'}</p>
      <h2 style={{ marginTop: 24 }}>RegionFigure — highlights (best view)</h2>
      <div style={{ marginTop: 10 }}>
        <RegionFigure region="knee" diagram={mock} highlights={{ patella: 'injured', 'vastus-lateralis': 'involved' }} dimOthers preferParts={['patella', 'vastus-lateralis']} />
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
