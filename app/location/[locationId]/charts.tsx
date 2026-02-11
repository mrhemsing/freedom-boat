import React from 'react';
import { round, isoToLocalTime, isoToLocalDayTime } from '../../../lib/format';

type Point = { x: number; y: number };

function scaleLinear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const m = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * m;
}

function pathFromPoints(pts: Point[]) {
  if (!pts.length) return '';
  return `M ${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')}`;
}

export function WindChart({ forecast }: { forecast: any[] }) {
  const rows = (forecast || []).slice(0, 24);
  if (!rows.length) return <div className="miniNote">No forecast.</div>;

  const w = 860;
  const h = 180;
  const pad = 28;

  const speeds = rows.map((r) => (typeof r.windSpeedKts === 'number' ? r.windSpeedKts : 0));
  const gusts = rows.map((r) => (typeof r.windGustKts === 'number' ? r.windGustKts : (typeof r.windSpeedKts === 'number' ? r.windSpeedKts : 0)));

  const max = Math.max(5, ...gusts);
  const min = 0;

  const sx = scaleLinear([0, rows.length - 1], [pad, w - pad]);
  const sy = scaleLinear([min, max], [h - pad, pad]);

  const ptsSpeed = speeds.map((v, i) => ({ x: sx(i), y: sy(v) }));
  const ptsGust = gusts.map((v, i) => ({ x: sx(i), y: sy(v) }));

  const yTicks = [0, Math.round(max / 2), Math.round(max)];

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Use a fixed SVG width and allow horizontal scroll on small screens.
          Avoid preserveAspectRatio="none" because it stretches text/axes and makes labels hard to read. */}
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: 'block' }} preserveAspectRatio="xMinYMin meet">
        <rect x="0" y="0" width={w} height={h} rx="14" fill="rgba(14, 165, 164, 0.06)" stroke="rgba(11, 18, 32, 0.10)" />

        {/* grid */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad} x2={w - pad} y1={sy(t)} y2={sy(t)} stroke="rgba(11,18,32,0.10)" />
            <text x={8} y={sy(t) + 4} fontSize="11" fill="rgba(11,18,32,0.55)">{t} kt</text>
          </g>
        ))}

        {/* gust area */}
        <path
          d={`${pathFromPoints(ptsGust)} L ${sx(rows.length - 1)} ${h - pad} L ${sx(0)} ${h - pad} Z`}
          fill="rgba(56, 189, 248, 0.18)"
        />

        {/* gust line */}
        <path d={pathFromPoints(ptsGust)} fill="none" stroke="rgba(56, 189, 248, 0.95)" strokeWidth="2" />

        {/* speed line */}
        <path d={pathFromPoints(ptsSpeed)} fill="none" stroke="rgba(14, 165, 164, 0.95)" strokeWidth="2" />

        {/* x labels */}
        {rows.map((r, i) => {
          if (i % 4 !== 0) return null;
          return (
            <text key={r.t} x={sx(i)} y={h - 8} fontSize="11" textAnchor="middle" fill="rgba(11,18,32,0.55)">
              {isoToLocalTime(r.t)}
            </text>
          );
        })}

        {/* legend */}
        <g>
          <rect x={w - 190} y={12} width={170} height={44} rx={10} fill="rgba(255,255,255,0.65)" stroke="rgba(11,18,32,0.12)" />
          <line x1={w - 175} x2={w - 145} y1={28} y2={28} stroke="rgba(14, 165, 164, 0.95)" strokeWidth={3} />
          <text x={w - 135} y={32} fontSize="12" fill="rgba(11,18,32,0.70)">wind</text>
          <line x1={w - 175} x2={w - 145} y1={46} y2={46} stroke="rgba(56, 189, 248, 0.95)" strokeWidth={3} />
          <text x={w - 135} y={50} fontSize="12" fill="rgba(11,18,32,0.70)">gust</text>
        </g>
      </svg>
    </div>
  );
}

export function TideMiniChart({ events }: { events: Array<{ t: string; kind: string; heightM?: number }> }) {
  const rows = (events || []).filter((e) => typeof e.heightM === 'number').slice(0, 10);
  if (rows.length < 2) return <div className="miniNote">No tide heights yet.</div>;

  const w = 860;
  const h = 160;
  const pad = 28;

  const ys = rows.map((r) => r.heightM as number);
  const min = Math.min(...ys);
  const max = Math.max(...ys);

  const sx = scaleLinear([0, rows.length - 1], [pad, w - pad]);
  const sy = scaleLinear([min, max], [h - pad, pad]);

  const pts = rows.map((r, i) => ({ x: sx(i), y: sy(r.heightM as number) }));

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: 'block' }} preserveAspectRatio="xMinYMin meet">
        <rect x="0" y="0" width={w} height={h} rx="14" fill="rgba(34, 197, 94, 0.06)" stroke="rgba(11, 18, 32, 0.10)" />
        <path d={pathFromPoints(pts)} fill="none" stroke="rgba(34, 197, 94, 0.95)" strokeWidth="2" />
        {rows.map((r, i) => (
          <g key={r.t}>
            <circle cx={sx(i)} cy={sy(r.heightM as number)} r={3.5} fill="rgba(34, 197, 94, 0.95)" />
            {i % 2 === 0 ? (
              <text x={sx(i)} y={h - 8} fontSize="11" textAnchor="middle" fill="rgba(11,18,32,0.55)">
                {isoToLocalDayTime(r.t).split(',')[0]}
              </text>
            ) : null}
          </g>
        ))}
        <text x={8} y={sy(max) + 4} fontSize="11" fill="rgba(11,18,32,0.55)">{round(max, 2)} m</text>
        <text x={8} y={sy(min) + 4} fontSize="11" fill="rgba(11,18,32,0.55)">{round(min, 2)} m</text>
      </svg>
    </div>
  );
}
