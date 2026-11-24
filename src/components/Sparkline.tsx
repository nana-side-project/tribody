// Hand-written SVG mini line chart for pain-score trends (0–10).
// Recessive grid, a dashed reference line at the pain-rule threshold (3), the day's max during exercise / daily life as
// a 2px line (last point emphasised), and — optionally — the 起床時 (next-morning) scores as a second, dashed series
// with square markers, so 「翌朝に悪化していない」 can be read from the chart.
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
const MORNING = 'var(--swim)';

export function Sparkline({
  points,
  morning = [],
  days = 28,
  end,
}: {
  /** day max during exercise / daily life */
  points: SparkPoint[];
  /** day max on waking (起床時) */
  morning?: SparkPoint[];
  days?: number;
  end: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const start = addDays(end, -(days - 1));
  const t0 = parseISODate(start).getTime();
  const span = parseISODate(end).getTime() - t0 || 1;
  const x = (d: string) => PAD_X + ((parseISODate(d).getTime() - t0) / span) * (W - 2 * PAD_X);
  const y = (v: number) => PAD_Y + (1 - v / 10) * (H - 2 * PAD_Y);
  const inRange = (list: SparkPoint[]) => list.filter((p) => p.date >= start && p.date <= end).sort((a, b) => (a.date < b.date ? -1 : 1));
  const pts = inRange(points);
  const mpts = inRange(morning);
  const path = (list: SparkPoint[]) => list.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const mlast = mpts[mpts.length - 1];
  const dates = [...new Set([...pts, ...mpts].map((p) => p.date))].sort();
  const at = (list: SparkPoint[], d: string | null) => (d ? list.find((p) => p.date === d) : undefined);
  const hp = at(pts, hover);
  const hm = at(mpts, hover);
  const summary = [
    pts.length ? `運動・日常: ${pts.map((p) => `${formatShort(p.date)} ${p.value}`).join('、')}` : '',
    mpts.length ? `起床時: ${mpts.map((p) => `${formatShort(p.date)} ${p.value}`).join('、')}` : '',
  ]
    .filter(Boolean)
    .join('。');

  const marker = (p: SparkPoint, color: string, square: boolean, big: boolean, key: string) => (
    <span
      key={key}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: `${(x(p.date) / W) * 100}%`,
        top: -H + y(p.value),
        width: big ? 10 : 7,
        height: big ? 10 : 7,
        transform: 'translate(-50%, -50%)',
        borderRadius: square ? 2 : '50%',
        background: big ? color : 'var(--surface)',
        border: `2px solid ${color}`,
        boxShadow: '0 0 0 2px var(--surface)',
        pointerEvents: 'none',
      }}
    />
  );

  return (
    <div>
      <svg
        className="spark"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`過去${days}日の痛みの推移。${summary || '記録なし'}`}
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
        {mpts.length > 1 && (
          <path
            d={path(mpts)}
            fill="none"
            stroke={MORNING}
            strokeWidth={1.75}
            strokeDasharray="5 3"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {pts.length > 1 && (
          <path d={path(pts)} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
        {dates.map((d) => (
          <rect
            key={d}
            x={x(d) - 10}
            y={0}
            width={20}
            height={H}
            fill="transparent"
            onPointerEnter={() => setHover(d)}
            onPointerDown={() => setHover(d)}
          />
        ))}
      </svg>
      {/* markers drawn in HTML so they stay round / square with preserveAspectRatio="none" */}
      <div style={{ position: 'relative', height: 0 }}>
        {mpts.map((p) => marker(p, MORNING, true, p === mlast || hover === p.date, `m${p.date}`))}
        {pts.map((p) => marker(p, 'var(--accent)', false, p === last || hover === p.date, `a${p.date}`))}
        {hover && (hp || hm) && (
          <span
            style={{
              position: 'absolute',
              left: `clamp(48px, ${(x(hover) / W) * 100}%, calc(100% - 48px))`,
              top: -H - 26 + y(Math.max(hp?.value ?? 0, hm?.value ?? 0)),
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
            {formatShort(hover)}
            {hp && `　${hp.value}/10`}
            {hm && `　起床時 ${hm.value}`}
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
      {mpts.length > 0 && (
        <div className="spark__legend" aria-hidden="true">
          {pts.length > 0 && (
            <span>
              <i className="spark__key" /> 運動・日常
            </span>
          )}
          <span>
            <i className="spark__key spark__key--morning" /> 起床時
          </span>
        </div>
      )}
    </div>
  );
}
