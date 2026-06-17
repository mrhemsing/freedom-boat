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
  id,
  className,
  children
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  headerStackOnMobile?: boolean;
  titleNoWrap?: boolean;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`card ${className || ''}`.trim()} style={{ minWidth: 0 }}>
      {title ? (
        <div className={`cardHeader sectionHead ${headerStackOnMobile ? 'cardHeaderStackMobile' : ''}`.trim()}>
          <div className="cardHeaderLeft">
            <h2
              className={`sectionLabel ${titleNoWrap ? 'cardTitleNoWrap' : ''}`.trim()}
              style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
            >
              <span className="cardIcon">{icon}</span>
              {title}
            </h2>
            {subtitle ? <div className="cardSubtitle">{subtitle}</div> : null}
          </div>
          {right ? <div className="miniNote sectionMeta">{right}</div> : null}
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
      <span className="windDirNote" style={{ fontSize: 12 }}>{dir ?? '—'}</span>
    </span>
  );
}

export function ForecastStrip({ forecast }: { forecast: any[] }) {
  const rows = (forecast || []).slice(0, 12);
  return (
    <div className="hourlyStrip">
      <div className="hourlyStripInner">
        {rows.map((h) => {
          const ws = round(h.windSpeedKts, 0);
          const wg = h.windGustKts != null ? round(h.windGustKts, 0) : null;
          const pp = h.precipProbPct != null ? round(h.precipProbPct, 0) : null;
          return (
            <div key={h.t} className="hourlyCard">
              <div className="forecastTimeText" style={{ fontSize: 12 }}>{isoToLocalTime(h.t)}</div>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: 18 }}>{ws ?? '—'} kt</div>
              <div className="forecastMetaText" style={{ fontSize: 12, marginTop: 4 }}>
                <WindArrow deg={h.windDirDeg} />
              </div>
              <div className="forecastMetaText" style={{ fontSize: 12, marginTop: 4 }}>
                gust {wg ?? '—'}
              </div>
              <div className="forecastMetaText" style={{ fontSize: 12, marginTop: 4 }}>
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
  moreInfo?: string;
  link?: string;
  linkLabel?: string;
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

function formatAlertTitle(title: string) {
  const match = title.match(/^(.*?),\s*(Strait\s+Of\s+Georgia\b.*)$/i);
  if (!match) return title;

  const area = match[2].replace(/^Strait\s+Of\s+Georgia/i, 'Strait of Georgia');
  return (
    <>
      {match[1]}
      <br />
      {area}
    </>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function BoatingAlertsModule({
  items,
  dayLabel,
  daylight,
  nowIso,
  warningAuthority = 'Environment Canada',
  warningStatus = 'available'
}: {
  items: BoatingAlert[];
  dayLabel: string;
  daylight?: { start: string; end: string };
  nowIso?: string | null;
  warningAuthority?: string;
  warningStatus?: 'available' | 'unavailable';
}) {
  const hasWarning = items.some((item) => item.tier === 'warning');
  const activeCount = items.length;

  if (!activeCount) {
    return null;
  }

  return (
    <div className={`boatingAlertsModule ${hasWarning ? 'boatingAlertsModuleWarning' : ''}`.trim()}>
      <div className="boatingAlertsHeader">
        <div className="boatingAlertsTitle">
          <span className="boatingAlertsBell" aria-hidden="true"><BellIcon /></span>
          <span>Conditions to watch</span>
        </div>
        <div className="boatingAlertsMeta">{activeCount} active · {dayLabel}</div>
      </div>

      {activeCount ? (
        <div className="boatingAlertRows">
          {items.map((item) => {
            const canExpand = Boolean(item.moreInfo || item.link);
            const row = (
              <div className="boatingAlertCopy">
                <div className="boatingAlertTopLine">
                  <div className="boatingAlertTitle">{formatAlertTitle(item.title)}</div>
                  <div className={`boatingAlertBadge boatingAlertBadge-${item.tier}`}>{ALERT_TIER_LABELS[item.tier]}</div>
                </div>
                <div className="boatingAlertDetail">{item.detail}</div>
                {item.window?.confidence === 'sharp' ? <AlertTimeBar window={item.window} daylight={daylight} nowIso={nowIso} /> : null}
                {item.source ? <div className="boatingAlertSource">{item.source}</div> : null}
              </div>
            );

            if (!canExpand) {
              return (
                <div key={item.id} className={`boatingAlertRow boatingAlertRow-${item.tier}`}>
                  {row}
                </div>
              );
            }

            return (
              <details key={item.id} className={`boatingAlertDisclosure boatingAlertRow-${item.tier}`}>
                <summary className="boatingAlertRow">
                  {row}
                </summary>
                <div className="boatingAlertMore">
                  {item.moreInfo ? <p>{item.moreInfo}</p> : null}
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noreferrer">
                      {item.linkLabel || `View official alert from ${item.source || warningAuthority}`}
                    </a>
                  ) : null}
                </div>
              </details>
            );
          })}
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
  const rangeAnchorClass = left <= 20
    ? 'alertTimeRangeLabelDawn'
    : endPct >= 80
      ? 'alertTimeRangeLabelEvening'
      : 'alertTimeRangeLabelMidday';
  const rangeAnchorStyle = rangeAnchorClass === 'alertTimeRangeLabelEvening'
    ? { left: `${endPct}%` }
    : rangeAnchorClass === 'alertTimeRangeLabelDawn'
      ? { left: `${left}%` }
      : { left: `${left + (endPct - left) / 2}%` };
  const showPeak = Boolean(
    window.peak
    && Math.abs(localMs(window.peak) - localMs(window.start)) > 30 * 60_000
    && Math.abs(localMs(endIso) - localMs(window.peak)) > 30 * 60_000
  );
  const showPeakText = Boolean(showPeak && window.peak && width >= 28);
  const peakLeft = window.peak ? pct(window.peak, daylight.start, daylight.end) : null;
  const nowVisible = Boolean(nowIso && sameLocalDay(nowIso, daylight.start) && localMs(nowIso) >= localMs(daylight.start) && localMs(nowIso) <= localMs(daylight.end));
  const nowLeft = nowVisible && nowIso ? pct(nowIso, daylight.start, daylight.end) : null;

  if (!Number.isFinite(left) || !Number.isFinite(endPct) || localMs(daylight.end) <= localMs(daylight.start)) {
    return null;
  }

  return (
    <div className="alertTimeBar" aria-label={`Window ${formatWindowTimeLabel(window.start)} to ${formatWindowTimeLabel(endIso)}`}>
      <div className="alertTimeTrack">
        <div className="alertTimeFill" style={{ left: `${left}%`, width: `${width}%` }} />
        {showPeak && peakLeft != null ? <div className="alertTimePeak" style={{ left: `${peakLeft}%` }} /> : null}
        {nowLeft != null ? <div className="alertTimeNow" style={{ left: `${nowLeft}%` }} /> : null}
      </div>
      <div className="alertTimeLabels">
        <div className="alertTimeAxisLabels">
          <span className="alertTimeLabel alertTimeLabelEdgeLeft">
            {formatLocalTimeLabel(daylight.start)}
            <em>sunrise</em>
          </span>
          {nowLeft != null ? (
            <span className="alertTimeLabel alertTimeLabelNow" style={{ left: `${nowLeft}%` }}>
              now
            </span>
          ) : null}
          <span className="alertTimeLabel alertTimeLabelEdgeRight">
            {formatLocalTimeLabel(daylight.end)}
            <em>sunset</em>
          </span>
        </div>
        <div className="alertTimeWindowLabels">
          <span className={`alertTimeRangeLabel ${rangeAnchorClass}`} style={rangeAnchorStyle}>
            {formatWindowTimeLabel(window.start)}-{formatLocalTimeLabel(endIso)}
            {showPeakText && window.peak ? <em>peak {formatWindowTimeLabel(window.peak)}</em> : null}
          </span>
        </div>
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

function formatWindowTimeLabel(iso?: string) {
  const day = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T/)?.slice(1, 4);
  const time = formatLocalTimeLabel(iso);
  if (!day) return time;
  const dt = new Date(Date.UTC(Number(day[0]), Number(day[1]) - 1, Number(day[2]), 12));
  const label = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short' }).format(dt);
  return `${label} ${time}`;
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
