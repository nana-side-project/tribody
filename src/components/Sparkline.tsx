// Hand-written SVG mini line chart for pain-score trends (0–10), one series per chart.
// Recessive grid, a dashed reference line at the pain-rule threshold (3), 2px line, last point emphasised.
import { useState } from 'react';
import { addDays, formatShort, parseISODate } from '../lib/date';

export interface SparkPoint {
  date: string; // YYYY-MM-DD
  value: number; // 0–10
}

const W = 300;
const H = 64;
const PAD_X = 6;
const PAD_Y = 6;

export function Sparkline({ points, days = 28, end }: { points: SparkPoint[]; days?: number; end: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const start = addDays(end, -(days - 1));
  const t0 = parseISODate(start).getTime();
  const span = parseISODate(end).getTime() - t0 || 1;
  const x = (d: string) => PAD_X + ((parseISODate(d).getTime() - t0) / span) * (W - 2 * PAD_X);
  const y = (v: number) => PAD_Y + (1 - v / 10) * (H - 2 * PAD_Y);
  const pts = points.filter((p) => p.date >= start && p.date <= end).sort((a, b) => (a.date < b.date ? -1 : 1));
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const active = hover !== null ? pts[hover] : null;
  const summary = pts.map((p) => `${formatShort(p.date)} ${p.value}`).join('、');

  return (
    <div>
      <svg
        className="spark"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`過去${days}日の痛みの推移: ${summary || '記録なし'}`}
        onPointerLeave={() => setHover(null)}
      >
        {[0, 5, 10].map((v) => (
          <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <line
          x1={0}
          x2={W}
          y1={y(3)}
          y2={y(3)}
          stroke="var(--ok)"
          strokeWidth={1}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
          opacity={0.8}
        />
        {pts.length > 1 && (
          <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
        {pts.map((p, i) => (
          <g key={p.date}>
            <rect
              x={x(p.date) - 10}
              y={0}
              width={20}
              height={H}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
      {/* markers drawn in HTML so they stay round with preserveAspectRatio="none" */}
      <div style={{ position: 'relative', height: 0 }}>
        {pts.map((p, i) => {
          const isLast = p === last;
          const on = hover === i;
          return (
            <span
              key={p.date}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: `${(x(p.date) / W) * 100}%`,
                top: -H + y(p.value),
                width: on || isLast ? 10 : 7,
                height: on || isLast ? 10 : 7,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: isLast || on ? 'var(--accent)' : 'var(--surface)',
                border: `2px solid var(--accent)`,
                boxShadow: '0 0 0 2px var(--surface)',
                pointerEvents: 'none',
              }}
            />
          );
        })}
        {active && (
          <span
            style={{
              position: 'absolute',
              left: `clamp(24px, ${(x(active.date) / W) * 100}%, calc(100% - 24px))`,
              top: -H - 26 + y(active.value),
              transform: 'translateX(-50%)',
              padding: '2px 8px',
              borderRadius: 8,
              background: 'var(--text)',
              color: 'var(--bg)',
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {formatShort(active.date)}　{active.value}/10
          </span>
        )}
      </div>
      <div className="spark__axis">
        <span>{formatShort(start)}</span>
        <span>
          <span style={{ color: 'var(--ok)' }}>- - -</span> 3（目安）
        </span>
        <span>{formatShort(end)}</span>
      </div>
    </div>
  );
}
