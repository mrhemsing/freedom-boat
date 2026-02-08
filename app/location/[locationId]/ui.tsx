'use client';

import React from 'react';
import { degToCardinal, isoToLocalDayTime, isoToLocalTime, round } from '../../../lib/format';

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid #e5e5e5', borderRadius: 14, padding: 16, background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}

export function KpiRow({ items }: { items: Array<{ label: string; value: React.ReactNode; sub?: React.ReactNode }> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
      {items.map((it) => (
        <div key={it.label} style={{ padding: 12, borderRadius: 12, background: '#fafafa', border: '1px solid #eee' }}>
          <div style={{ fontSize: 12, color: '#666' }}>{it.label}</div>
          <div style={{ fontSize: 18, fontWeight: 650, marginTop: 6 }}>{it.value}</div>
          {it.sub ? <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{it.sub}</div> : null}
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
          border: '1px solid #ddd',
          position: 'relative',
          background: 'white'
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
            borderBottom: '9px solid #111'
          }}
        />
      </span>
      <span style={{ fontSize: 12, color: '#666' }}>{dir ?? '—'}</span>
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
            <div key={h.t} style={{ border: '1px solid #eee', borderRadius: 12, padding: 10, background: '#fafafa' }}>
              <div style={{ fontSize: 12, color: '#666' }}>{isoToLocalTime(h.t)}</div>
              <div style={{ marginTop: 6, fontWeight: 650 }}>{ws ?? '—'} kt</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                gust {wg ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                precip {pp ?? '—'}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AlertFeed({ items }: { items: Array<{ t: string; severity: string; title: string; body?: string }> }) {
  if (!items?.length) {
    return <div style={{ color: '#666' }}>No alerts right now.</div>;
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((a, idx) => (
        <div key={idx} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontWeight: 650 }}>{a.title}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{isoToLocalDayTime(a.t)}</div>
          </div>
          {a.body ? <div style={{ marginTop: 6, color: '#444' }}>{a.body}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function TideList({ events }: { events: Array<{ t: string; kind: 'high' | 'low'; heightM?: number }> }) {
  if (!events?.length) {
    return <div style={{ color: '#666' }}>No tide events returned.</div>;
  }

  const next = events.slice(0, 8);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {next.map((e) => (
        <div key={e.t + e.kind} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 650 }}>{e.kind === 'high' ? 'High tide' : 'Low tide'}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#666' }}>{isoToLocalDayTime(e.t)}</div>
            <div style={{ marginTop: 4 }}>{e.heightM != null ? `${round(e.heightM, 2)} m` : '—'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
