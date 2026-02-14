import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { LOCATIONS, type LocationId } from '../../../lib/locations';
import { isoToLocalDay, isoToLocalTime, round } from '../../../lib/format';
import { AlertFeed, Card, ForecastStrip, KpiRow, TideList, WindArrow } from './ui';
import { TideMiniChart, WindChart } from './charts';
import { IconMap, IconPartlyCloudy, IconRain, IconSun, IconSunrise, IconSunset, IconThermometer, IconTide, IconWind } from './icons';

export default async function LocationPage({
  params
}: {
  params: { locationId: string };
}) {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  if (!loc) return notFound();

  const [nowRes, forecastRes, tidesRes, marineRes] = await Promise.all([
    fetch(`${baseUrl()}/api/${params.locationId}/now`, { cache: 'no-store' }),
    fetch(`${baseUrl()}/api/${params.locationId}/forecast?hours=120`, {
      cache: 'no-store'
    }),
    fetch(`${baseUrl()}/api/${params.locationId}/tides?days=2`, { cache: 'no-store' }),
    fetch(`${baseUrl()}/api/${params.locationId}/marine-warnings`, { cache: 'no-store' })
  ]);

  const now = nowRes.ok ? await nowRes.json() : null;
  const forecast = forecastRes.ok ? await forecastRes.json() : null;
  const tides = tidesRes.ok ? await tidesRes.json() : null;
  const marine = marineRes.ok ? await marineRes.json() : null;

  const alerts = [
    ...((marine?.items || []).map((it: any) => ({
      t: now?.asOf ?? new Date().toISOString(),
      severity: it.severity || 'info',
      title: it.title,
      body: it.body
    })) as any[]),
    ...computeDefaultAlerts({ now, forecast: forecast?.forecast ?? [] })
  ];

  const windSpeed = now?.wind?.speedKts;
  const gust = now?.wind?.gustKts;
  const dir = now?.wind?.directionDeg;
  const webcamVideoId = id === 'north-saanich' ? 'zeKV78ULlpY' : 'T0oUufecXeE';
  const nextTide = getNextTideSummary({ events: tides?.events ?? [] });
  const tidePhase = getTidePhaseSummary({ events: tides?.events ?? [] });
  const windTrend = getWindTrendSummary(forecast?.forecast ?? []);
  const rainEta = getRainEtaSummary(forecast?.forecast ?? []);
  const advisoryText = getAdvisorySummary(marine?.items ?? []);
  const launchWindow = getBestLaunchWindowSummary({
    forecast: forecast?.forecast ?? [],
    sunriseIso: now?.sun?.sunrise,
    sunsetIso: now?.sun?.sunset
  });

  return (
    <main className="container">
      <header className="topbar">
        <div className="headerBrand">
          <div className="brand" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img className="fbLogo" src="/fb-logo.svg" alt="Freedom Boat Planner" width={72} height={72} style={{ display: 'block' }} />
              <div className="brandTitle">
                <span className="brandFreedom">FREEDOM</span>
                <span className="brandBoat">BOAT PLANNER</span>
              </div>
            </div>
          </div>
        </div>

        <div className="headerInfo">
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.78)', fontSize: 15 }}>
            <b style={{ color: 'rgba(255,255,255,0.92)' }}>{loc.name}</b>
            {now?.asOf ? <span style={{ opacity: 0.75 }}>{` • as of ${formatAsOf(now.asOf)}`}</span> : null}
          </div>
          {loc.address ? <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{loc.address}</div> : null}
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a className={`seg ${id === 'port-moody' ? 'segActive' : ''}`} href="/location/port-moody">Port Moody</a>
            <a className={`seg ${id === 'north-saanich' ? 'segActive' : ''}`} href="/location/north-saanich">North Saanich</a>
          </div>
        </div>

        <div className="sunBadgeWrap" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="badge" style={{ padding: 8, alignItems: 'stretch', borderRadius: 14 }}>
            <span style={{ display: 'grid', gap: 6 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255, 206, 64, 0.95)' }}>
                <span style={{ display: 'inline-flex' }}><IconSunrise size={16} /></span>
                <span style={{ color: 'rgba(255,255,255,0.90)' }}>{now?.sun?.sunrise ? formatAsOf(now.sun.sunrise) : '—'}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(251, 113, 133, 0.95)' }}>
                <span style={{ display: 'inline-flex' }}><IconSunset size={16} /></span>
                <span style={{ color: 'rgba(255,255,255,0.90)' }}>{now?.sun?.sunset ? formatAsOf(now.sun.sunset) : '—'}</span>
              </span>
            </span>
          </span>
        </div>
      </header>

      <div className="grid" style={{ marginTop: 24 }}>
        {alerts.length ? (
          <Card
            className="alertsCard"
            title="Alerts"
            icon={<span style={{ fontWeight: 900, fontSize: 16 }}>⚠</span>}
          >
            <AlertFeed items={alerts} topLine={now?.asOf ? formatAsOfWithDay(now.asOf) : '—'} />
          </Card>
        ) : null}

        <Card
          className="weeklyCard"
          title={<span className="weeklyTitleMain">Weekly outlook</span>}
          subtitle={<span className="weeklyTitleSub">(best boating day highlighted)</span>}
          icon={<span style={{ fontWeight: 900, fontSize: 17, color: 'rgba(11,18,32,0.92)' }}>◉</span>}
          right={null}
          headerStackOnMobile
        >
          {(() => {
            const week = buildWeeklyOutlook(forecast?.forecast ?? [], forecast?.sunByDay ?? [], 5);
            const best = week.reduce((acc, d) => (acc == null || d.score > acc.score ? d : acc), null as DailyOutlook | null);
            if (!week.length) return <div className="miniNote">No forecast available.</div>;
            return (
              <div className="outlookGrid">
                {week.map((d) => {
                  const isBest = best?.day === d.day;
                  return (
                    <div key={d.day} className={`dayBox ${isBest ? 'dayBest' : ''}`}>
                      {(() => {
                        const rain = (d.totalPrecipMm ?? 0) >= 1 || (d.maxPrecipProb ?? 0) >= 50;
                        const wind = (d.maxWind ?? 0) >= 20 || (d.maxGust ?? 0) >= 28;
                        const sunKind = rain ? null : (d.maxPrecipProb ?? 0) <= 20 && (d.totalPrecipMm ?? 0) < 0.2 ? 'sun' : 'partly';

                        return (
                          <div className="dayTitleRow">
                            <div className="dayTitle">{d.label}</div>
                            <div className="dayIcons" style={{ marginTop: 0 }}>
                              {sunKind === 'sun' ? (
                                <span className="dayIcon dayIconSun" title="Sunny-ish">
                                  <IconSun size={16} />
                                </span>
                              ) : sunKind === 'partly' ? (
                                <span className="dayIcon dayIconSun" title="Partly cloudy-ish">
                                  <IconPartlyCloudy size={16} />
                                </span>
                              ) : null}

                              {wind ? (
                                <span className="dayIcon dayIconWind" title="Windy">
                                  <IconWind size={16} />
                                </span>
                              ) : null}

                              {rain ? (
                                <span className="dayIcon dayIconRain" title="Rain risk">
                                  <IconRain size={16} />
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="dayScorePill" title="Boating score (higher is better)">{d.score}/100</div>
                      <div className="dayMeta">
                        <div>temp: {round(d.minTempC, 0) ?? '—'}/{round(d.maxTempC, 0) ?? '—'}°C</div>
                        <div>max wind: {round(d.maxWind, 0)} kt</div>
                        <div>max gust: {round(d.maxGust, 0)} kt</div>
                        <div>precip chance: {round(d.maxPrecipProb, 0)}%</div>
                        <div>rain total: {round(d.totalPrecipMm, 1)} mm</div>
                      </div>
                      {isBest ? (
                        <div
                          style={{ marginTop: 10, gap: 6, padding: '5px 8px' }}
                          className="pill sevInfo"
                        >
                          <span style={{ fontWeight: 900 }}>⛵</span>
                          Best day
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        <Card
          className="desktopIconDrop2 quickLookCard"
          title="Boating quick look"
          icon={<span style={{ fontWeight: 900, fontSize: 16, filter: 'grayscale(1)', opacity: 0.85 }}>📌</span>}
          right={<span>at-a-glance guidance</span>}
        >
          <div className="quickLookGrid"><div className="quickItem">
              <div className="quickLabel">Wind trend (3h)</div>
              <div className="quickValue">{windTrend.label}</div>
              <div className="miniNote">{windTrend.detail}</div>
            </div>
            <div className="quickItem">
              <div className="quickLabel">Rain ETA</div>
              <div className="quickValue">{rainEta.label}</div>
              <div className="miniNote">{rainEta.detail}</div>
            </div>
            <div className="quickItem">
              <div className="quickLabel">Best launch window</div>
              <div className="quickValue">{launchWindow.label}</div>
              <div className="miniNote">{launchWindow.detail}</div>
            </div>
            <div className="quickItem">
              <div className="quickLabel">Advisory</div>
              <div className="quickValue">{advisoryText.label}</div>
              <div className="miniNote">{advisoryText.detail}</div>
            </div>
          </div>
        </Card>

        <Card className="desktopIconDrop2 liveLookCard" title="Live look" icon={<IconWind />} right={<span>Wind · Temp · Rain</span>}>
          <KpiRow
            className="liveLookGrid"
            items={[
              {
                label: 'Map',
                value: (
                  <div
                    style={{
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid rgba(11,18,32,0.10)',
                      height: 185
                    }}
                  >
                    <iframe
                      title={`${loc.name} mini map`}
                      width="100%"
                      height="240"
                      style={{ border: 0, display: 'block', transform: 'translateY(-22px)' }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                        `${loc.lon - 0.015},${loc.lat - 0.01},${loc.lon + 0.015},${loc.lat + 0.01}`
                      )}&layer=mapnik&marker=${encodeURIComponent(`${loc.lat},${loc.lon}`)}`}
                    />
                  </div>
                )
              },
              {
                label: 'Webcam',
                value: (
                  <div
                    style={{
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid rgba(11,18,32,0.10)',
                      height: 185,
                      position: 'relative'
                    }}
                  >
                    <iframe
                      title="Port Moody YouTube webcam"
                      src={`https://www.youtube.com/embed/${webcamVideoId}?autoplay=1&mute=1&playsinline=1&controls=0&modestbranding=1&iv_load_policy=3&rel=0`}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        border: 0,
                        transform: 'scale(1.8)',
                        transformOrigin: 'center center'
                      }}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                )
              },
              {
                label: 'Conditions',
                icon: <IconWind />,
                value: (
                  <div className="conditionsWindRow">
                    <span className="conditionsWindSpeed">{round(windSpeed, 0) ?? '—'} kt</span>
                    <span className="conditionsWindDir">
                      <WindArrow deg={dir} />
                    </span>
                  </div>
                ),
                sub: (
                  <div className="conditionsDetailGrid">
                    <span className="conditionsDetailLine">
                      Gust: {round(gust, 0) ?? '—'} kt
                    </span>
                    <span className="conditionsDetailLine">
                      Temp: {now?.tempC != null ? `${round(now.tempC, 0)}°C` : '—'}
                    </span>
                    <span className="conditionsDetailLine">
                      Precip: {now?.precipMmHr != null ? String(round(now?.precipMmHr, 1)) : '—'} mm/hr
                    </span>
                    <span className="conditionsDetailLine">
                      Tide: {nextTide ? `${nextTide.kindLabel} ${nextTide.etaLabel}` : '—'}
                    </span>
                    {tidePhase ? (
                      <div className="tidePhaseRow" style={{ marginTop: 2 }}>
                        <div
                          className="tidePhaseRing"
                          style={{
                            background: `conic-gradient(rgba(14,165,164,0.95) ${Math.round(tidePhase.progress * 360)}deg, rgba(11,18,32,0.16) 0deg)`
                          }}
                          title={`Tide phase: ${tidePhase.phase}`}
                        >
                          <span className="tidePhaseInner" />
                        </div>
                        <div className="tidePhaseText">
                          <div className="miniNote" style={{ fontWeight: 700 }}>
                            {tidePhase.phase} · {Math.round(tidePhase.progress * 100)}%
                          </div>
                          <div className="miniNote">Next turn {tidePhase.etaLabel}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              }
            ]}
          />
        </Card>

        <Card className="desktopIconDrop2 windCard" title="Wind (next 24h)" icon={<IconWind />} right={<span>speed + gust</span>}>
          <WindChart forecast={forecast?.forecast ?? []} />
          <hr className="soft" />
          <ForecastStrip forecast={forecast?.forecast ?? []} />
        </Card>

        <Card
          className="desktopIconDrop2 tidesCard"
          title="Tides"
          icon={<IconTide />}
          right={(() => {
            const next = getNextTideSummary({ nowIso: now?.asOf, events: tides?.events ?? [] });
            if (next && tides?.station?.name) {
              return (
                <span>
                  Next: {next.kindLabel} {next.etaLabel}{tides.station.name ? ` · ${tides.station.name}` : ''}
                </span>
              );
            }
            if (tides?.station?.name) {
              return (
                <span>
                  {tides.station.name} · {Math.round(tides.station.distanceKm)} km
                </span>
              );
            }
            return '—';
          })()}
        >
          <TideMiniChart events={tides?.events ?? []} />
          <hr className="soft" />
          <TideList events={tides?.events ?? []} />
        </Card>
      </div>
    </main>
  );
}

function getNextTideSummary({
  nowIso,
  events
}: {
  nowIso?: string | null;
  events: Array<{ t: string; kind: 'high' | 'low'; heightM?: number }>;
}) {
  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
  const future = (events || [])
    .map((e) => ({ ...e, ms: new Date(e.t).getTime() }))
    .filter((e) => Number.isFinite(e.ms) && e.ms >= nowMs - 60 * 1000)
    .sort((a, b) => a.ms - b.ms);

  const n = future[0];
  if (!n) return null;

  const kind = n.kind === 'high' ? 'High' : 'Low';
  const etaMs = Math.max(0, n.ms - nowMs);
  return { kindLabel: kind, etaLabel: formatEta(etaMs) };
}

function getTidePhaseSummary({
  nowIso,
  events
}: {
  nowIso?: string | null;
  events: Array<{ t: string; kind: 'high' | 'low'; heightM?: number }>;
}) {
  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
  const sorted = (events || [])
    .map((e) => ({ ...e, ms: new Date(e.t).getTime() }))
    .filter((e) => Number.isFinite(e.ms))
    .sort((a, b) => a.ms - b.ms);

  if (sorted.length < 2) return null;

  let prev = sorted[0];
  let next = sorted[sorted.length - 1];
  let foundBracket = false;

  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i].ms > nowMs) {
      if (i === 0) {
        const first = sorted[0];
        const second = sorted[1] ?? sorted[0];
        const interval = Math.max(1, second.ms - first.ms);
        prev = {
          ...first,
          kind: first.kind === 'high' ? 'low' : 'high',
          ms: first.ms - interval
        };
        next = first;
      } else {
        prev = sorted[i - 1];
        next = sorted[i];
      }
      foundBracket = true;
      break;
    }
  }

  if (!foundBracket) {
    prev = sorted[sorted.length - 2];
    next = sorted[sorted.length - 1];
  }

  if (!prev || !next || next.ms <= prev.ms) return null;

  const progressRaw = (nowMs - prev.ms) / (next.ms - prev.ms);
  const progress = Math.max(0, Math.min(1, progressRaw));
  const phase = next.kind === 'high' ? 'Rising' : 'Falling';
  const kind = next.kind === 'high' ? 'High' : 'Low';
  const h = typeof next.heightM === 'number' ? `${round(next.heightM, 2)}m` : '';
  const t = isoToLocalTime(next.t);
  const etaMs = Math.max(0, next.ms - nowMs);
  return {
    progress,
    phase,
    nextLabel: `${kind} ${h ? h + ' ' : ''}@ ${t}`,
    etaLabel: formatEta(etaMs)
  };
}

function formatEta(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `in ${m}m`;
  return `in ${h}h ${m}m`;
}

function getWindTrendSummary(forecast: Array<{ windSpeedKts?: number }>) {
  const rows = (forecast || []).slice(0, 4);
  if (rows.length < 2) return { label: '—', detail: 'Not enough data' };
  const first = Number(rows[0]?.windSpeedKts ?? 0);
  const last = Number(rows[rows.length - 1]?.windSpeedKts ?? 0);
  const delta = last - first;
  if (delta >= 4) return { label: 'Increasing ↑', detail: `~${Math.round(delta)} kt higher than now` };
  if (delta <= -4) return { label: 'Easing ↓', detail: `~${Math.abs(Math.round(delta))} kt lower than now` };
  return { label: 'Steady →', detail: 'Little change expected' };
}

function getRainEtaSummary(forecast: Array<{ t: string; precipProbPct?: number }>) {
  const hit = (forecast || []).slice(0, 24).find((h) => (h?.precipProbPct ?? 0) >= 60);
  if (!hit) return { label: 'None soon', detail: 'No strong rain signal in next 24h' };
  return { label: isoToLocalTime(hit.t), detail: `Precip chance ~${Math.round(hit.precipProbPct ?? 0)}%` };
}

function getGoNoGoSummary({
  now,
  marineItems
}: {
  now: any;
  marineItems: Array<{ severity?: string }>;
}) {
  const wind = Number(now?.wind?.speedKts ?? 0);
  const gust = Number(now?.wind?.gustKts ?? wind);
  const severe = (marineItems || []).some((m) => ['warning', 'danger'].includes(String(m?.severity || '').toLowerCase()));
  if (severe || wind >= 25 || gust >= 32) return { label: 'No-go', tone: 'toneBad', reason: 'Strong wind/warning right now' };
  if (wind >= 16 || gust >= 24) return { label: 'Caution', tone: 'toneWarn', reason: 'Choppy conditions likely' };
  return { label: 'Go', tone: 'toneGood', reason: 'Within calmer operating range' };
}

function getAdvisorySummary(items: Array<{ title?: string; severity?: string }>) {
  if (!items?.length) return { label: 'No advisory', detail: 'No active marine warnings' };
  const top = items[0];
  return { label: top.title || 'Marine advisory', detail: `Severity: ${top.severity || 'info'}` };
}

function getBestLaunchWindowSummary({
  forecast,
  sunriseIso,
  sunsetIso
}: {
  forecast: Array<{ t: string; windSpeedKts?: number; windGustKts?: number; precipProbPct?: number }>;
  sunriseIso?: string;
  sunsetIso?: string;
}) {
  const rows = (forecast || []).slice(0, 24);
  if (!rows.length) return { label: '—', detail: 'No forecast data' };

  const sunriseHour = sunriseIso ? new Date(sunriseIso).getHours() : 6;
  const sunsetHour = sunsetIso ? new Date(sunsetIso).getHours() : 18;

  const daylightRows = rows.filter((h) => {
    const d = new Date(h.t);
    const hour = d.getHours();
    return Number.isFinite(hour) && hour >= sunriseHour && hour <= sunsetHour;
  });

  if (daylightRows.length < 3) {
    return { label: '—', detail: 'No usable daylight window yet' };
  }

  const scored = daylightRows.map((h) => {
    const wind = Number(h.windSpeedKts ?? 0);
    const gust = Number(h.windGustKts ?? wind);
    const rain = Number(h.precipProbPct ?? 0);
    const score = Math.max(0, 100 - wind * 3 - gust * 1.2 - rain * 0.6);
    return { ...h, score };
  });

  let bestStart = -1;
  let bestAvg = -1;
  for (let i = 0; i <= scored.length - 3; i += 1) {
    const window = scored.slice(i, i + 3);
    const avg = window.reduce((a, b) => a + b.score, 0) / window.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
  }

  if (bestStart < 0) return { label: '—', detail: 'No suitable window found' };

  const start = scored[bestStart];
  const end = scored[Math.min(bestStart + 2, scored.length - 1)];
  return {
    label: `${isoToLocalTime(start.t)}–${isoToLocalTime(end.t)}`,
    detail: 'Best 3-hour window between sunrise and sunset'
  };
}

function baseUrl() {
  // In prod (Vercel), never call back to localhost. Build an absolute URL from forwarded headers.
  const h = headers();
  const forwardedHost = h.get('x-forwarded-host');
  const host = forwardedHost || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';

  // Optional explicit override (useful for local dev or unusual proxies)
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase;

  if (host) return `${proto}://${host}`;

  // Vercel fallback
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return 'http://localhost:3000';
}

function extractHour(isoLike?: string) {
  const s = String(isoLike || '');
  const m = s.match(/T(\d{2}):/);
  if (!m) return null;
  const hh = Number(m[1]);
  return Number.isFinite(hh) ? hh : null;
}

type DailyOutlook = {
  day: string; // YYYY-MM-DD
  label: string;
  score: number;
  maxWind: number;
  maxGust: number;
  maxPrecipProb: number;
  totalPrecipMm: number;
  minTempC?: number;
  maxTempC?: number;
};

function buildWeeklyOutlook(
  forecast: Array<{ t: string; tempC?: number; windSpeedKts: number; windGustKts?: number; precipMm?: number; precipProbPct?: number }>,
  sunByDay: Array<{ day: string; sunrise?: string; sunset?: string }> = [],
  days = 5
): DailyOutlook[] {
  const daylightHoursByDay = new Map<string, { sunriseHour: number; sunsetHour: number }>();
  for (const s of sunByDay || []) {
    const day = String(s?.day || '');
    if (!day) continue;
    const sunriseHour = extractHour(s?.sunrise) ?? 8;
    const sunsetHour = extractHour(s?.sunset) ?? 18;
    daylightHoursByDay.set(day, { sunriseHour, sunsetHour });
  }

  const byDay = new Map<string, any[]>();
  for (const h of forecast || []) {
    const day = typeof h.t === 'string' ? h.t.slice(0, 10) : null;
    if (!day) continue;

    // Keep lows/highs in true daylight for each day (sunrise -> sunset), not overnight.
    const hour = Number(h.t.slice(11, 13));
    if (!Number.isFinite(hour)) continue;
    const daylight = daylightHoursByDay.get(day) ?? { sunriseHour: 8, sunsetHour: 18 };
    if (hour < daylight.sunriseHour || hour > daylight.sunsetHour) continue;

    const arr = byDay.get(day) ?? [];
    arr.push(h);
    byDay.set(day, arr);
  }

  const daysSorted = [...byDay.keys()].sort().slice(0, days);
  const out: DailyOutlook[] = [];

  for (const day of daysSorted) {
    const rows = byDay.get(day) ?? [];
    const maxWind = Math.max(...rows.map((r) => (typeof r.windSpeedKts === 'number' ? r.windSpeedKts : 0)), 0);
    const maxGust = Math.max(...rows.map((r) => (typeof r.windGustKts === 'number' ? r.windGustKts : r.windSpeedKts ?? 0)), 0);
    const maxPrecipProb = Math.max(...rows.map((r) => (typeof r.precipProbPct === 'number' ? r.precipProbPct : 0)), 0);
    const totalPrecipMm = rows.reduce((acc, r) => acc + (typeof r.precipMm === 'number' ? r.precipMm : 0), 0);

    const temps = rows
      .map((r) => (typeof r.tempC === 'number' && Number.isFinite(r.tempC) ? r.tempC : null))
      .filter((v) => v != null) as number[];
    const minTempC = temps.length ? Math.min(...temps) : undefined;
    const maxTempC = temps.length ? Math.max(...temps) : undefined;

    // Heuristic score: lower gust + lower precip probability + lower total precip wins.
    // 100 is best, 0 is worst.
    const raw = 100 - (maxGust * 2.2 + maxWind * 0.6 + maxPrecipProb * 0.6 + totalPrecipMm * 6);
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    out.push({
      day,
      label: isoToLocalDay(`${day}T12:00:00`),
      score,
      maxWind,
      maxGust,
      maxPrecipProb,
      totalPrecipMm,
      minTempC,
      maxTempC
    });
  }

  return out;
}

function formatAsOfWithDay(iso: string) {
  const s = String(iso || '');
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);

  if (!hasTz) {
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const hhRaw = Number(m[4]);
      const mm = m[5];
      if ([y, mo, d, hhRaw].every(Number.isFinite)) {
        const dt = new Date(y, mo - 1, d);
        const day = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Vancouver', weekday: 'short' }).format(dt);
        let hh = hhRaw;
        const ampm = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12;
        if (hh === 0) hh = 12;
        return `${day} ${hh}:${mm} ${ampm}`;
      }
    }
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

function formatAsOf(iso: string) {
  // Open-Meteo returns timestamps *without* a timezone suffix when you pass `timezone=...`.
  // If we parse those with `new Date()` on the server (UTC) vs client (local), you can get wrong hours.
  // So: if there's no timezone designator, treat it as a local clock time and format it manually.
  const s = String(iso || '');
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  if (!hasTz) {
    const m = s.match(/T(\d{2}):(\d{2})/);
    if (m) {
      let hh = Number(m[1]);
      const mm = m[2];
      if (!Number.isFinite(hh)) return s;
      const ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12;
      if (hh === 0) hh = 12;
      return `${hh}:${mm} ${ampm}`;
    }
    return s;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  // Force stable formatting across server/client to avoid hydration mismatch.
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

function envCanadaWindCategory(speedKts: number | null | undefined) {
  const v = typeof speedKts === 'number' && Number.isFinite(speedKts) ? speedKts : null;
  if (v == null) return null;

  // Environment Canada marine wind warning categories (sustained wind, excluding gusts)
  if (v >= 64) {
    return { code: 'hurricane', title: 'Hurricane Force Wind', severity: 'warning' as const };
  }
  if (v >= 48) {
    return { code: 'storm', title: 'Storm', severity: 'warning' as const };
  }
  if (v >= 34) {
    return { code: 'gale', title: 'Gale', severity: 'warning' as const };
  }
  if (v >= 20) {
    return { code: 'strong', title: 'Strong Wind', severity: 'caution' as const };
  }
  return null;
}

function computeDefaultAlerts({ now, forecast }: { now: any; forecast: any[] }) {
  const out: Array<{ t: string; severity: string; title: string; body?: string }> = [];

  const sustainedNow = now?.wind?.speedKts ?? null;
  const gustNow = now?.wind?.gustKts ?? null;

  const next6 = (forecast || []).slice(0, 6);
  const next24 = (forecast || []).slice(0, 24);

  const maxSustainedNext6 = Math.max(
    ...(next6 || []).map((h) => (typeof h.windSpeedKts === 'number' ? h.windSpeedKts : 0))
  );
  const maxSustainedNext24 = Math.max(
    ...(next24 || []).map((h) => (typeof h.windSpeedKts === 'number' ? h.windSpeedKts : 0))
  );

  const maxGustNext6 = Math.max(
    ...(next6 || []).map((h) => (typeof h.windGustKts === 'number' ? h.windGustKts : 0))
  );
  const maxGustNext24 = Math.max(
    ...(next24 || []).map((h) => (typeof h.windGustKts === 'number' ? h.windGustKts : 0))
  );

  // Live look category (sustained)
  const catNow = envCanadaWindCategory(sustainedNow);
  if (catNow) {
    out.push({
      t: now?.asOf ?? new Date().toISOString(),
      severity: catNow.severity,
      title: `${catNow.title} (live)`,
      body: `Sustained ~${Math.round(sustainedNow)} kt${gustNow != null ? ` (gusts ~${Math.round(gustNow)} kt)` : ''}.`
    });
  }

  // Next 6 hours category (sustained)
  const cat6 = envCanadaWindCategory(Number.isFinite(maxSustainedNext6) ? maxSustainedNext6 : null);
  if (cat6) {
    out.push({
      t: next6?.[0]?.t ?? new Date().toISOString(),
      severity: cat6.severity,
      title: `${cat6.title} expected (next 6h)`,
      body: `Max sustained ~${Math.round(maxSustainedNext6)} kt${Number.isFinite(maxGustNext6) && maxGustNext6 > 0 ? ` (max gust ~${Math.round(maxGustNext6)} kt)` : ''}.`
    });
  }

  // Next 24 hours category (sustained)
  const cat24 = envCanadaWindCategory(Number.isFinite(maxSustainedNext24) ? maxSustainedNext24 : null);
  if (cat24) {
    out.push({
      t: next24?.[0]?.t ?? new Date().toISOString(),
      severity: cat24.severity,
      title: `${cat24.title} possible (next 24h)`,
      body: `Max sustained ~${Math.round(maxSustainedNext24)} kt${Number.isFinite(maxGustNext24) && maxGustNext24 > 0 ? ` (max gust ~${Math.round(maxGustNext24)} kt)` : ''}.`
    });
  }

  // Rain heads-up: first hour with precipProb >= 60%
  const rain = (forecast || [])
    .slice(0, 24)
    .find((h) => typeof h.precipProbPct === 'number' && h.precipProbPct >= 60);
  if (rain) {
    out.push({
      t: rain.t,
      severity: 'info',
      title: 'Rain likely soon',
      body: `~${Math.round(rain.precipProbPct)}% chance within the next 24 hours.`
    });
  }

  // De-dupe titles
  const seen = new Set<string>();
  return out.filter((a) => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });
}




