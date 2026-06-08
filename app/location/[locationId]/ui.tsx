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
      {title ? (
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
      ) : null}
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
      <span className="windDirNote" style={{ fontSize: 12, color: 'rgba(11,18,32,0.62)' }}>{dir ?? '—'}</span>
    </span>
  );
}

export function ForecastStrip({ forecast }: { forecast: any[] }) {
  const rows = (forecast || []).slice(0, 12);
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
      <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(110px, 1fr)', gap: 10 }}>
        {rows.map((h) => {
          const ws = round(h.windSpeedKts, 0);
          const wg = h.windGustKts != null ? round(h.windGustKts, 0) : null;
          const pp = h.precipProbPct != null ? round(h.precipProbPct, 0) : null;
          return (
            <div key={h.t} style={{ border: '1px solid rgba(11,18,32,0.10)', borderRadius: 14, padding: 10, background: 'rgba(255,255,255,0.70)' }}>
              <div className="forecastTimeText" style={{ fontSize: 12, color: 'rgba(11,18,32,0.62)' }}>{isoToLocalTime(h.t)}</div>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: 18 }}>{ws ?? '—'} kt</div>
              <div className="forecastMetaText" style={{ fontSize: 12, color: 'rgba(11,18,32,0.62)', marginTop: 4 }}>
                <WindArrow deg={h.windDirDeg} />
              </div>
              <div className="forecastMetaText" style={{ fontSize: 12, color: 'rgba(11,18,32,0.62)', marginTop: 4 }}>
                gust {wg ?? '—'}
              </div>
              <div className="forecastMetaText" style={{ fontSize: 12, color: 'rgba(11,18,32,0.62)', marginTop: 4 }}>
                precip {pp ?? '—'}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type AlertTier = 'warning' | 'watch' | 'info';
export type AlertCategory = 'marine_warning' | 'wind' | 'rain' | 'visibility' | 'tide' | 'launch_window';

export interface BoatingAlert {
  id: string;
  tier: AlertTier;
  category: AlertCategory;
  icon: string;
  title: string;
  detail: string;
  window?: {
    start: string;
    peak?: string;
    end?: string;
  };
  source?: string;
}

const ALERT_TIER_LABELS: Record<AlertTier, string> = {
  warning: 'Warning',
  watch: 'Watch',
  info: 'Info'
};

function iconForAlert(name: string) {
  if (name === 'alert-triangle') return '!';
  if (name === 'wind') return '≈';
  if (name === 'cloud-rain') return '☔';
  if (name === 'eye') return '◉';
  if (name === 'wave-sine' || name === 'ripple') return '~';
  if (name === 'anchor') return '⌁';
  return 'i';
}

export function BoatingAlertsModule({
  items,
  dayLabel,
  daylight
}: {
  items: BoatingAlert[];
  dayLabel: string;
  daylight?: { start: string; end: string };
}) {
  const hasWarning = items.some((item) => item.tier === 'warning');
  const activeCount = items.length;

  return (
    <div className={`boatingAlertsModule ${hasWarning ? 'boatingAlertsModuleWarning' : ''}`.trim()}>
      <div className="boatingAlertsHeader">
        <div className="boatingAlertsTitle">
          <span className="boatingAlertsBell" aria-hidden="true">!</span>
          <span>Conditions to watch</span>
        </div>
        <div className="boatingAlertsMeta">{activeCount} active · {dayLabel}</div>
      </div>

      {!hasWarning ? (
        <div className={`marineWarningStrip ${activeCount ? '' : 'marineWarningStripCalm'}`.trim()}>
          <span className="marineWarningCheck" aria-hidden="true">✓</span>
          <span>
            {activeCount
              ? 'No active marine warnings (Environment Canada)'
              : 'No active warnings. Conditions look favorable.'}
          </span>
        </div>
      ) : null}

      {activeCount ? (
        <div className="boatingAlertRows">
          {items.map((item) => (
            <div key={item.id} className={`boatingAlertRow boatingAlertRow-${item.tier}`}>
              <div className="boatingAlertIcon" aria-hidden="true">{iconForAlert(item.icon)}</div>
              <div className="boatingAlertCopy">
                <div className="boatingAlertTopLine">
                  <div className="boatingAlertTitle">{item.title}</div>
                  <div className={`boatingAlertBadge boatingAlertBadge-${item.tier}`}>{ALERT_TIER_LABELS[item.tier]}</div>
                </div>
                <div className="boatingAlertDetail">{item.detail}</div>
                {item.source ? <div className="boatingAlertSource">{item.source}</div> : null}
                {item.window ? <AlertTimeBar window={item.window} daylight={daylight} /> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AlertTimeBar({
  window,
  daylight
}: {
  window: NonNullable<BoatingAlert['window']>;
  daylight?: { start: string; end: string };
}) {
  if (!daylight?.start || !daylight?.end) return null;

  const daylightStart = localMinute(daylight.start);
  const daylightEnd = localMinute(daylight.end);
  const start = localMinute(window.start);
  const end = localMinute(window.end ?? window.peak ?? window.start);
  const peak = window.peak ? localMinute(window.peak) : null;
  if (daylightStart == null || daylightEnd == null || start == null || end == null || daylightEnd <= daylightStart) {
    return null;
  }

  const scale = daylightEnd - daylightStart;
  const left = clampPercent(((start - daylightStart) / scale) * 100);
  const right = clampPercent(((end - daylightStart) / scale) * 100);
  const width = Math.max(3, right - left);
  const peakLeft = peak == null ? null : clampPercent(((peak - daylightStart) / scale) * 100);

  return (
    <div className="alertTimeBar" aria-label={`Window ${isoToLocalTime(window.start)} to ${isoToLocalTime(window.end ?? window.start)}`}>
      <div className="alertTimeTrack">
        <div className="alertTimeFill" style={{ left: `${left}%`, width: `${width}%` }} />
        {peakLeft != null ? <div className="alertTimePeak" style={{ left: `${peakLeft}%` }} /> : null}
      </div>
      <div className="alertTimeTicks">
        <span>{isoToLocalTime(daylight.start)}</span>
        <span>{isoToLocalTime(window.start)}</span>
        {window.peak ? <span>{isoToLocalTime(window.peak)}</span> : null}
        {window.end ? <span>{isoToLocalTime(window.end)}</span> : null}
      </div>
    </div>
  );
}

function localMinute(iso?: string) {
  const m = String(iso || '').match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
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
