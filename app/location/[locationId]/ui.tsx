'use client';

import React from 'react';
import { degToCardinal, isoToLocalDayTime, isoToLocalTime, round } from '../../../lib/format';
// icons are rendered in the server component (page.tsx) to avoid RSC dev manifest issues

export function Card({
  title,
  subtitle,
  icon,
  right,
  headerStackOnMobile,
  titleNoWrap,
  className,
  children
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  headerStackOnMobile?: boolean;
  titleNoWrap?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`card ${className || ''}`.trim()} style={{ minWidth: 0 }}>
      <div className={`cardHeader ${headerStackOnMobile ? 'cardHeaderStackMobile' : ''}`.trim()}>
        <div className="cardHeaderLeft">
          <h2
            className={titleNoWrap ? 'cardTitleNoWrap' : undefined}
            style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <span className="cardIcon" style={{ color: 'rgba(11,18,32,0.75)' }}>{icon}</span>
            {title}
          </h2>
          {subtitle ? <div className="cardSubtitle">{subtitle}</div> : null}
        </div>
        {right ? <div className="miniNote">{right}</div> : null}
      </div>
      <div className="cardBody">{children}</div>
    </section>
  );
}

export function KpiRow({
  items,
  className
}: {
  items: Array<{ label: string; icon?: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode }>;
  className?: string;
}) {
  return (
    <div className={`kpiGrid ${className || ''}`.trim()}>
      {items.map((it) => (
        <div key={it.label} className="kpi">
          {it.label ? (
            <div className="kpiLabel" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {it.icon ? <span style={{ opacity: 0.75 }}>{it.icon}</span> : null}
              {it.label}
            </div>
          ) : null}
          <div className="kpiValue">{it.value}</div>
          {it.sub ? <div className="kpiSub">{it.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function WindArrow({ deg }: { deg?: number | null }) {
  const dir = degToCardinal(deg ?? null);
  const angle = typeof deg === 'number' ? deg : 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 18,
          height: 18,
          display: 'inline-block',
          transform: `rotate(${angle}deg)`,
          transition: 'transform 120ms ease',
          borderRadius: 999,
          border: '1px solid rgba(11,18,32,0.20)',
          position: 'relative',
          background: 'rgba(255,255,255,0.9)'
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: 2,
            width: 0,
            height: 0,
            transform: 'translateX(-50%)',
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: '9px solid rgba(11,18,32,0.90)'
          }}
        />
      </span>
      <span style={{ fontSize: 12, color: 'rgba(11,18,32,0.62)' }}>{dir ?? '—'}</span>
    </span>
  );
}

export function ForecastStrip({ forecast }: { forecast: any[] }) {
  const rows = (forecast || []).slice(0, 12);
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(110px, 1fr)', gap: 10 }}>
        {rows.map((h) => {
          const ws = round(h.windSpeedKts, 0);
          const wg = h.windGustKts != null ? round(h.windGustKts, 0) : null;
          const pp = h.precipProbPct != null ? round(h.precipProbPct, 0) : null;
          return (
            <div key={h.t} style={{ border: '1px solid rgba(11,18,32,0.10)', borderRadius: 14, padding: 10, background: 'rgba(255,255,255,0.70)' }}>
              <div style={{ fontSize: 12, color: 'rgba(11,18,32,0.62)' }}>{isoToLocalTime(h.t)}</div>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: 18 }}>{ws ?? '—'} kt</div>
              <div style={{ fontSize: 12, color: 'rgba(11,18,32,0.62)', marginTop: 4 }}>
                gust {wg ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(11,18,32,0.62)', marginTop: 4 }}>
                precip {pp ?? '—'}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function severityClass(sev: string) {
  if (sev === 'warning') return 'sevWarning';
  if (sev === 'caution') return 'sevCaution';
  return 'sevInfo';
}

export function AlertFeed({
  items,
  topLine
}: {
  items: Array<{ t: string; severity: string; title: string; body?: string }>;
  topLine?: string;
}) {
  if (!items?.length) {
    return <div className="miniNote">No alerts right now.</div>;
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((a, idx) => (
        <div key={idx} style={{ border: '1px solid rgba(11,18,32,0.10)', borderRadius: 14, padding: 12, background: 'rgba(255,255,255,0.70)' }}>
          {idx === 0 && topLine ? <div style={{ marginBottom: 8 }}>{topLine}</div> : null}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`pill ${severityClass(a.severity)}`}>{a.severity}</span>
              {a.title}
            </div>
            {idx === 0 && topLine ? null : <div className="miniNote">{isoToLocalDayTime(a.t)}</div>}
          </div>
          {a.body ? <div style={{ marginTop: 8, color: 'rgba(11,18,32,0.80)' }}>{a.body}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function TideList({ events }: { events: Array<{ t: string; kind: 'high' | 'low'; heightM?: number }> }) {
  if (!events?.length) {
    return <div className="miniNote">No tide events returned.</div>;
  }

  const next = events.slice(0, 4);
  return (
    <div className="tideGrid">
      {next.map((e) => (
        <div key={e.t + e.kind} className="tideItem">
          <div style={{ fontWeight: 800 }}>{e.kind === 'high' ? 'High tide' : 'Low tide'}</div>
          <div className="tideItemRight">
            <div className="miniNote">{isoToLocalDayTime(e.t)}</div>
            <div style={{ marginTop: 4, fontWeight: 700 }}>{e.heightM != null ? `${round(e.heightM, 2)} m` : '—'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// (Icons object removed)
