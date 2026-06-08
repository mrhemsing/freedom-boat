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

export type AlertTier = 'warning' | 'watch';
export type AlertCategory = 'marine_warning' | 'wind' | 'rain' | 'visibility' | 'tide';

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
    confidence: 'sharp' | 'soft';
  };
  source?: string;
}

const ALERT_TIER_LABELS: Record<AlertTier, string> = {
  warning: 'Warning',
  watch: 'Watch'
};

function iconForAlert(name: string) {
  if (name === 'alert-triangle') return '!';
  if (name === 'wind') return '≈';
  if (name === 'cloud-rain') return '☔';
  if (name === 'eye') return '◉';
  if (name === 'wave-sine' || name === 'ripple') return '~';
  return 'i';
}

export function BoatingAlertsModule({
  items,
  dayLabel,
  daylight,
  nowIso,
  warningAuthority = 'Environment Canada',
  warningStatus = 'available',
  calmSummary
}: {
  items: BoatingAlert[];
  dayLabel: string;
  daylight?: { start: string; end: string };
  nowIso?: string | null;
  warningAuthority?: string;
  warningStatus?: 'available' | 'unavailable';
  calmSummary?: string;
}) {
  const hasWarning = items.some((item) => item.tier === 'warning');
  const activeCount = items.length;

  if (!activeCount) {
    return (
      <div className="boatingAlertsModule boatingAlertsModuleCalm">
        <div className={`marineWarningStrip marineWarningStripCalm ${warningStatus === 'unavailable' ? 'marineWarningStripUnavailable' : ''}`.trim()}>
          <span className="marineWarningCheck" aria-hidden="true">{warningStatus === 'unavailable' ? '!' : '✓'}</span>
          <span>
            {warningStatus === 'unavailable' ? 'Marine warnings unavailable' : 'No active warnings or watches.'}
            <small>{warningAuthority}</small>
            {warningStatus !== 'unavailable' && calmSummary ? <small>{calmSummary}</small> : null}
          </span>
        </div>
      </div>
    );
  }

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
        <div className={`marineWarningStrip ${warningStatus === 'unavailable' ? 'marineWarningStripUnavailable' : ''}`.trim()}>
          <span className="marineWarningCheck" aria-hidden="true">{warningStatus === 'unavailable' ? '!' : '✓'}</span>
          <span>
            {warningStatus === 'unavailable'
              ? 'Marine warnings unavailable'
              : 'No active marine warnings'}
            <small>{warningAuthority}</small>
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
                {item.window?.confidence === 'sharp' ? <AlertTimeBar window={item.window} daylight={daylight} nowIso={nowIso} /> : null}
                {item.source ? <div className="boatingAlertSource">{item.source}</div> : null}
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
  daylight,
  nowIso
}: {
  window: NonNullable<BoatingAlert['window']>;
  daylight?: { start: string; end: string };
  nowIso?: string | null;
}) {
  if (!daylight?.start || !daylight?.end) return null;

  const endIso = window.end ?? window.peak ?? window.start;
  const left = pct(window.start, daylight.start, daylight.end);
  const endPct = pct(endIso, daylight.start, daylight.end);
  const width = Math.max(3, endPct - left);
  const showPeak = Boolean(
    window.peak
    && Math.abs(localMs(window.peak) - localMs(window.start)) > 30 * 60_000
    && Math.abs(localMs(endIso) - localMs(window.peak)) > 30 * 60_000
  );
  const peakLeft = window.peak ? pct(window.peak, daylight.start, daylight.end) : null;
  const nowVisible = Boolean(nowIso && sameLocalDay(nowIso, daylight.start) && localMs(nowIso) >= localMs(daylight.start) && localMs(nowIso) <= localMs(daylight.end));
  const nowLeft = nowVisible && nowIso ? pct(nowIso, daylight.start, daylight.end) : null;

  if (!Number.isFinite(left) || !Number.isFinite(endPct) || localMs(daylight.end) <= localMs(daylight.start)) {
    return null;
  }

  return (
    <div className="alertTimeBar" aria-label={`Window ${formatLocalTimeLabel(window.start)} to ${formatLocalTimeLabel(endIso)}`}>
      <div className="alertTimeTrack">
        <div className="alertTimeFill" style={{ left: `${left}%`, width: `${width}%` }} />
        {showPeak && peakLeft != null ? <div className="alertTimePeak" style={{ left: `${peakLeft}%` }} /> : null}
        {nowLeft != null ? <div className="alertTimeNow" style={{ left: `${nowLeft}%` }} /> : null}
      </div>
      <div className="alertTimeLabels">
        <span className="alertTimeLabel alertTimeLabelEdgeLeft">
          {formatLocalTimeLabel(daylight.start)}
          <em>sunrise</em>
        </span>
        {nowLeft != null ? (
          <span className="alertTimeLabel alertTimeLabelNow" style={{ left: `${nowLeft}%` }}>
            now
          </span>
        ) : null}
        <span className="alertTimeLabel" style={{ left: `${left}%` }}>
          {formatLocalTimeLabel(window.start)}
          <em>starts</em>
        </span>
        {showPeak && window.peak && peakLeft != null ? (
          <span className="alertTimeLabel" style={{ left: `${peakLeft}%` }}>
            {formatLocalTimeLabel(window.peak)}
            <em>peak</em>
          </span>
        ) : null}
        <span className="alertTimeLabel" style={{ left: `${endPct}%` }}>
          {formatLocalTimeLabel(endIso)}
          <em>eases</em>
        </span>
        <span className="alertTimeLabel alertTimeLabelEdgeRight">
          {formatLocalTimeLabel(daylight.end)}
          <em>sunset</em>
        </span>
      </div>
    </div>
  );
}

export function alertTimePct(t: string, sunrise: string, sunset: string) {
  return pct(t, sunrise, sunset);
}

function pct(t: string, sunrise: string, sunset: string) {
  const span = localMs(sunset) - localMs(sunrise);
  if (span <= 0) return 0;
  const value = ((localMs(t) - localMs(sunrise)) / span) * 100;
  return clampPercent(value);
}

function sameLocalDay(a?: string | null, b?: string | null) {
  const left = String(a || '').match(/^(\d{4}-\d{2}-\d{2})T/)?.[1];
  const right = String(b || '').match(/^(\d{4}-\d{2}-\d{2})T/)?.[1];
  return Boolean(left && right && left === right);
}

function localMs(iso?: string) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

function formatLocalTimeLabel(iso?: string) {
  const m = String(iso || '').match(/T(\d{2}):(\d{2})/);
  if (!m) return isoToLocalTime(String(iso || ''));
  let hh = Number(m[1]);
  const mm = m[2];
  if (!Number.isFinite(hh)) return isoToLocalTime(String(iso || ''));
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${mm} ${ampm}`;
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
