import React from 'react';
import { round, isoToLocalTime, isoToLocalDayTime } from '../../../lib/format';

type Point = { x: number; y: number };

function scaleLinear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const m = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * m;
}

function smoothStepPath(pts: Point[]) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  const [first, ...rest] = pts;
  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  let previous = first;

  for (const point of rest) {
    const midX = (previous.x + point.x) / 2;
    path += ` C ${midX.toFixed(2)} ${previous.y.toFixed(2)}, ${midX.toFixed(2)} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    previous = point;
  }

  return path;
}

function areaToBaselinePath(pts: Point[], baselineY: number) {
  if (!pts.length) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${smoothStepPath(pts)} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

function bandBetweenPaths(upper: Point[], lower: Point[]) {
  if (!upper.length || upper.length !== lower.length) return '';
  const reversedLower = [...lower].reverse();
  return `${smoothStepPath(upper)} L ${reversedLower.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
}

function interpolateIndexByTime(rows: Array<{ t: string }>, now = Date.now()) {
  const times = rows.map((row) => new Date(row.t).getTime());
  if (times.length < 2 || now < times[0] || now > times[times.length - 1]) return null;

  for (let i = 0; i < times.length - 1; i += 1) {
    const start = times[i];
    const end = times[i + 1];
    if (now >= start && now <= end) {
      const ratio = end === start ? 0 : (now - start) / (end - start);
      return i + ratio;
    }
  }

  return null;
}

function interpolateValueAtIndex(values: number[], index: number) {
  const startIndex = Math.floor(index);
  const endIndex = Math.min(values.length - 1, startIndex + 1);
  const ratio = index - startIndex;
  const start = values[startIndex] ?? values[0] ?? 0;
  const end = values[endIndex] ?? start;
  return start + (end - start) * ratio;
}

function clampedIndexByTime(rows: Array<{ t: string }>, now = Date.now()) {
  const interpolated = interpolateIndexByTime(rows, now);
  if (interpolated != null) return interpolated;

  const times = rows.map((row) => new Date(row.t).getTime());
  if (!times.length) return null;
  return now < times[0] ? 0 : times.length - 1;
}

function interpolateTideHeight(rows: Array<{ heightM?: number }>, index: number) {
  const startIndex = Math.floor(index);
  const endIndex = Math.min(rows.length - 1, startIndex + 1);
  const ratio = index - startIndex;
  const start = rows[startIndex]?.heightM ?? rows[0]?.heightM ?? 0;
  const end = rows[endIndex]?.heightM ?? start;
  const eased = (1 - Math.cos(Math.PI * ratio)) / 2;
  return start + (end - start) * eased;
}

export function WindChart({ forecast }: { forecast: any[] }) {
  const rows = (forecast || []).slice(0, 24);
  if (!rows.length) return <div className="miniNote">No forecast.</div>;

  const w = 920;
  const h = 210;
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
  const nowIndex = clampedIndexByTime(rows);
  const nowX = nowIndex == null ? null : sx(nowIndex);
  const nowWind = nowIndex == null ? null : interpolateValueAtIndex(speeds, nowIndex);
  const cautionZoneTop = max > 21 ? sy(Math.min(max, 34)) : null;
  const cautionZoneBottom = max > 21 ? sy(21) : null;
  const strongZoneTop = max > 34 ? sy(max) : null;
  const strongZoneBottom = max > 34 ? sy(34) : null;

  return (
    <div className="chartScrollX chart-plot">
      <svg className="chartSvg" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }} preserveAspectRatio="xMinYMin meet">
        <defs>
          <linearGradient id="windFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-wind)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--chart-wind)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gustFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-gust)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--chart-gust)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect className="chartSurface chartSurfaceWind" x="0" y="0" width={w} height={h} rx="14" fill="rgba(14, 165, 164, 0.06)" stroke="rgba(11, 18, 32, 0.10)" />
        {cautionZoneTop != null && cautionZoneBottom != null ? (
          <rect className="chartZoneCaution" x={pad} y={cautionZoneTop} width={w - pad * 2} height={Math.max(0, cautionZoneBottom - cautionZoneTop)} />
        ) : null}
        {strongZoneTop != null && strongZoneBottom != null ? (
          <rect className="chartZoneStrong" x={pad} y={strongZoneTop} width={w - pad * 2} height={Math.max(0, strongZoneBottom - strongZoneTop)} />
        ) : null}

        {/* grid */}
        {yTicks.map((t) => (
          <g key={t} className="chartGrid">
            <line x1={pad} x2={w - pad} y1={sy(t)} y2={sy(t)} />
            <text className="chartAxisLabel" x={8} y={sy(t) + 4} fontSize="11">{t} kt</text>
          </g>
        ))}

        <path d={bandBetweenPaths(ptsGust, ptsSpeed)} fill="url(#gustFill)" stroke="var(--chart-gust)" strokeOpacity="0.5" />
        <path d={areaToBaselinePath(ptsSpeed, h - pad)} fill="url(#windFill)" />
        <path className="chartLine" d={smoothStepPath(ptsSpeed)} fill="none" stroke="var(--chart-wind)" />
        {nowX != null ? (
          <g>
            <line className="chartNowLine" x1={nowX} x2={nowX} y1={12} y2={h - pad} />
            <text className="chartAxisLabel" x={nowX + 5} y={18} fontSize="10">Now</text>
            {nowWind != null ? <title>{`Now: ${round(nowWind, 0)} kt wind`}</title> : null}
          </g>
        ) : null}

        {/* x labels */}
        {rows.map((r, i) => {
          if (i % 4 !== 0) return null;
          return (
            <text className="chartAxisLabel" key={r.t} x={sx(i)} y={h - 8} fontSize="11" textAnchor="middle">
              {isoToLocalTime(r.t)}
            </text>
          );
        })}

        {/* legend */}
        <g>
          <rect className="chartLegend" x={w - 190} y={12} width={170} height={50} rx={10} />
          <line className="chartLegendSwatch" x1={w - 175} x2={w - 145} y1={28} y2={28} stroke="var(--chart-wind)" />
          <text className="chartLegendLabel" x={w - 135} y={32} fontSize="12" fill="rgba(11,18,32,0.70)">wind</text>
          <line className="chartLegendSwatch" x1={w - 175} x2={w - 145} y1={48} y2={48} stroke="var(--chart-gust)" />
          <text className="chartLegendLabel" x={w - 135} y={52} fontSize="12" fill="rgba(11,18,32,0.70)">gust envelope</text>
        </g>
      </svg>
    </div>
  );
}

export function TideMiniChart({ events }: { events: Array<{ t: string; kind: string; heightM?: number }> }) {
  const rows = (events || []).filter((e) => typeof e.heightM === 'number').slice(0, 10);
  if (rows.length < 2) return <div className="miniNote">No tide heights yet.</div>;

  const w = 920;
  const h = 190;
  const pad = 28;

  const ys = rows.map((r) => r.heightM as number);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const domainPad = Math.max(0.1, (max - min) * 0.08);

  const sx = scaleLinear([0, rows.length - 1], [pad, w - pad]);
  const sy = scaleLinear([min - domainPad, max + domainPad], [h - pad, pad]);

  const pts = rows.map((r, i) => ({ x: sx(i), y: sy(r.heightM as number) }));
  const nowIndex = interpolateIndexByTime(rows);
  const nowHeight = nowIndex == null ? null : interpolateTideHeight(rows, nowIndex);
  const nowX = nowIndex == null ? null : sx(nowIndex);
  const nowY = nowHeight == null ? null : sy(nowHeight);

  return (
    <div className="chartScrollX chart-plot">
      <svg className="chartSvg" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }} preserveAspectRatio="xMinYMin meet">
        <defs>
          <linearGradient id="tideWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-tide)" stopOpacity="0.28" />
            <stop offset="55%" stopColor="var(--chart-tide)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--chart-tide)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect className="chartSurface chartSurfaceTide" x="0" y="0" width={w} height={h} rx="14" fill="rgba(34, 197, 94, 0.06)" stroke="rgba(11, 18, 32, 0.10)" />
        <path d={areaToBaselinePath(pts, h - pad)} fill="url(#tideWater)" />
        <path className="chartLine" d={smoothStepPath(pts)} fill="none" stroke="var(--chart-tide)" />
        {rows.map((r, i) => (
          <g key={r.t}>
            <circle cx={sx(i)} cy={sy(r.heightM as number)} r={3.5} fill="#fff" stroke="var(--chart-tide)" strokeWidth="2" />
            {i % 2 === 0 ? (
              <text className="chartAxisLabel" x={sx(i)} y={(r.kind || '').toLowerCase().includes('high') ? sy(r.heightM as number) - 10 : sy(r.heightM as number) + 18} fontSize="10" textAnchor="middle">
                {`${(r.kind || '').toLowerCase().includes('high') ? 'High' : 'Low'} ${round(r.heightM as number, 2)} m`}
              </text>
            ) : null}
            <title>{`${r.kind} ${round(r.heightM as number, 2)} m at ${isoToLocalDayTime(r.t)}`}</title>
          </g>
        ))}
        {nowX != null && nowY != null && nowHeight != null ? (
          <g>
            <circle className="chartNowDot" cx={nowX} cy={nowY} r={5} />
            <text className="chartAxisLabel" x={nowX + 7} y={nowY - 7} fontSize="10">Now</text>
            <title>{`Now: about ${round(nowHeight, 2)} m`}</title>
          </g>
        ) : null}
        <text className="chartAxisLabel" x={8} y={sy(max) + 4} fontSize="11">{round(max, 2)} m</text>
        <text className="chartAxisLabel" x={8} y={sy(min) + 4} fontSize="11">{round(min, 2)} m</text>
      </svg>
    </div>
  );
}
