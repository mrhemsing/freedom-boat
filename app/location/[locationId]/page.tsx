import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { LOCATIONS, type LocationId } from '../../../lib/locations';
import { degToCardinal, isoToLocalDay, isoToLocalTime, round } from '../../../lib/format';
import { buildWeeklyOutlook, type DailyOutlook } from '../../../lib/outlook';
import { marinaPath, SEO_MARINAS, seoSlugForMarina, type SeoMarina } from '../../../lib/seo-slugs';
import { getLocationWeatherSnapshot } from '../../../lib/weather-snapshots';
import { AlertFeed, Card, ForecastStrip, KpiRow, TideList, WindArrow } from './ui';
import { TideMiniChart, WindChart } from './charts';
import { IconMap, IconPartlyCloudy, IconRain, IconSun, IconSunrise, IconSunset, IconThermometer, IconTide, IconWind } from './icons';
import MarinaJump from './MarinaJump';

export async function generateMetadata({
  params
}: {
  params: { locationId: string };
}): Promise<Metadata> {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  const name = loc?.name ?? 'Marina';

  return {
    title: `FAIRTIDE Boat Planner - ${name}`,
    description: `Hyper-local boating conditions for ${name}.`
  };
}

export default async function LocationPage({
  params
}: {
  params: { locationId: string };
}) {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  if (!loc) return notFound();

  const [weatherSnapshot, tidesRes, marineRes] = await Promise.all([
    getLocationWeatherSnapshot(id).catch(() => null),
    fetch(`${baseUrl()}/api/${params.locationId}/tides?days=2`, { cache: 'no-store' }),
    fetch(`${baseUrl()}/api/${params.locationId}/marine-warnings`, { cache: 'no-store' })
  ]);

  const now = weatherSnapshot?.now ?? null;
  const forecast = weatherSnapshot
    ? {
        forecast: weatherSnapshot.forecast.slice(0, 120),
        sunByDay: weatherSnapshot.sunByDay,
        fetchedAt: weatherSnapshot.fetchedAt,
        provider: weatherSnapshot.provider
      }
    : null;
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
  const webcam = getLocationWebcam(id);
  const nextTide = getNextTideSummary({ events: tides?.events ?? [] });
  const tidePhase = getTidePhaseSummary({ events: tides?.events ?? [] });
  const windTrend = getWindTrendSummary(forecast?.forecast ?? []);
  const rainEta = getRainEtaSummary(forecast?.forecast ?? []);
  const advisoryText = getAdvisorySummary(marine?.items ?? []);
  const launchWindow = getBestLaunchWindowSummary({
    forecast: forecast?.forecast ?? [],
    sunriseIso: now?.sun?.sunrise,
    sunsetIso: now?.sun?.sunset,
    sunByDay: forecast?.sunByDay ?? []
  });
  const slackTide = getSlackTideSummary({ nowIso: now?.asOf, events: tides?.events ?? [] });
  const windTideRisk = getWindTideRiskSummary({ now, tidePhase, forecast: forecast?.forecast ?? [] });
  const visibility = getVisibilityRiskSummary({ now, forecast: forecast?.forecast ?? [], marineItems: marine?.items ?? [] });
  const marinaJumpGroups = buildMarinaJumpGroups();
  const mapHref = plannerMapHrefForLocation(id);

  return (
    <main className="container">
      <header className="topbar">
        <div className="headerBrand">
          <div className="brand" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <img className="fbLogo" src="/fb-logo.svg?v=7" alt="FAIRTIDE" width={72} height={72} style={{ display: 'block' }} />
              <div className="brandTitle">
                <span className="brandFreedom">FAIRTIDE</span>
                <span className="brandBoat">BOAT PLANNER</span>
              </div>
            </div>
          </div>
        </div>
        <a className="planMapButton" href={mapHref} aria-label={`Open ${loc.name} on trip map`}>
          <IconMap size={22} />
        </a>

        <div className="headerInfo">
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.78)', fontSize: 15 }}>
            <b style={{ color: 'rgba(255,255,255,0.92)' }}>{loc.name}</b>
            {now?.asOf ? <span style={{ opacity: 0.75 }}>{` • as of ${formatAsOf(now.asOf)}`}</span> : null}
          </div>
          {loc.address ? <div className="locationAddress" style={{ marginTop: 6, color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{loc.address}</div> : null}
          <div className="marinaJumpWrap">
            <MarinaJump value={id} groups={marinaJumpGroups} />
          </div>
        </div>

        <div className="sunBadgeWrap" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="badge" style={{ padding: 8, alignItems: 'stretch', borderRadius: 14 }}>
            <span style={{ display: 'grid', gap: 6 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255, 206, 64, 0.95)' }}>
                <span style={{ display: 'inline-flex' }}><IconSunrise size={17} /></span>
                <span style={{ color: 'rgba(255,255,255,0.90)', fontSize: 13 }}>{now?.sun?.sunrise ? formatAsOf(now.sun.sunrise) : '—'}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(251, 113, 133, 0.95)' }}>
                <span style={{ display: 'inline-flex' }}><IconSunset size={17} /></span>
                <span style={{ color: 'rgba(255,255,255,0.90)', fontSize: 13 }}>{now?.sun?.sunset ? formatAsOf(now.sun.sunset) : '—'}</span>
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
          title={<span className="weeklyTitleMain">5-day outlook</span>}
          subtitle={<span className="weeklyTitleSub">(best boating day highlighted)</span>}
          icon={<span style={{ fontWeight: 900, fontSize: 17, color: 'rgba(11,18,32,0.62)' }}>◉</span>}
          right={null}
          headerStackOnMobile
        >
          {(() => {
            const week = buildWeeklyOutlook(forecast?.forecast ?? [], forecast?.sunByDay ?? [], 5);
            const best = week.reduce((acc, d) => (acc == null || d.score > acc.score ? d : acc), null as DailyOutlook | null);
            if (!week.length) return <div className="miniNote">No forecast available.</div>;
            return (
              <div className="outlookGrid">
                {week.map((d, idx) => {
                  const isBest = best?.day === d.day;
                  return (
                    <div
                      key={d.day}
                      className={`dayBox dayBoxAnimate ${isBest ? 'dayBest' : ''}`}
                      style={{ animationDelay: `${250 + idx * 220}ms` }}
                    >
                      {(() => {
                        const rain = (d.totalPrecipMm ?? 0) >= 1 || (d.maxPrecipProb ?? 0) >= 50;
                        const wind = (d.maxWind ?? 0) >= 20 || (d.maxGust ?? 0) >= 28;
                        const sunKind = rain ? null : (d.maxPrecipProb ?? 0) <= 20 && (d.totalPrecipMm ?? 0) < 0.2 ? 'sun' : 'partly';

                        return (
                          <div className="dayTitleRow">
                            <div className="dayTitle">{d.label}</div>
                            <div className="dayTempTopMobile">{round(d.minTempC, 0) ?? '—'}/{round(d.maxTempC, 0) ?? '—'}°C</div>
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

                      <div className="dayTempLine">{round(d.minTempC, 0) ?? '—'}/{round(d.maxTempC, 0) ?? '—'}°C</div>
                      <div className="dayScorePill" title="Boating score (higher is better)">{d.score}/100</div>
                      <div className="dayMeta">
                        <div><span className="dayMetaIcon" style={{ fontSize: 11 }}>🌀</span>Max wind {round(d.maxWind, 0)} kt {degToCardinal(d.maxWindDirDeg) ?? ''}</div>
                        <div><span className="dayMetaIcon">💨</span>Max gust {round(d.maxGust, 0)} kt</div>
                        <div><span className="dayMetaIcon">☁</span>P.O.P. {round(d.maxPrecipProb, 0)}%</div>
                        <div><span className="dayMetaIcon">💧</span>Rain {round(d.totalPrecipMm, 1)} mm</div>
                      </div>
                      {isBest ? (
                        <div
                          style={{ marginTop: 12, marginBottom: 4, gap: 6, padding: '5px 8px 7px' }}
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
          icon={<span style={{ fontWeight: 900, fontSize: 16, filter: 'grayscale(1)', opacity: 0.92 }}>📌</span>}
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
              <div className="quickLabel">Slack tide</div>
              <div className="quickValue">{slackTide.label}</div>
              <div className="miniNote">{slackTide.detail}</div>
            </div>
            <div className="quickItem">
              <div className="quickLabel">Wind × tide risk</div>
              <div className="quickValue">{windTideRisk.label}</div>
              <div className="miniNote">{windTideRisk.detail}</div>
            </div>
            <div className="quickItem">
              <div className="quickLabel">Visibility / fog</div>
              <div className="quickValue">{visibility.label}</div>
              <div className="miniNote">{visibility.detail}</div>
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
                    {webcam.videoId ? (
                      <iframe
                        title={`${loc.name} YouTube webcam`}
                        src={`https://www.youtube.com/embed/${webcam.videoId}?autoplay=1&mute=1&playsinline=1&controls=0&modestbranding=1&iv_load_policy=3&rel=0`}
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
                    ) : webcam.embedUrl ? (
                      <iframe
                        title={`${loc.name} live webcam`}
                        src={webcam.embedUrl}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          border: 0
                        }}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    ) : webcam.url ? (
                      <a
                        href={webcam.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          placeItems: 'center',
                          padding: 18,
                          textAlign: 'center',
                          color: 'rgba(11,18,32,0.78)',
                          background: 'linear-gradient(135deg, rgba(14,165,164,0.16), rgba(255,255,255,0.92))',
                          fontWeight: 800
                        }}
                      >
                        Open {webcam.label ?? `${loc.name} live webcam`}
                      </a>
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          placeItems: 'center',
                          padding: 18,
                          textAlign: 'center',
                          color: 'rgba(11,18,32,0.72)',
                          background: 'linear-gradient(135deg, rgba(11,18,32,0.06), rgba(255,255,255,0.92))',
                          fontWeight: 800
                        }}
                      >
                        Live webcam currently unavailable
                      </div>
                    )}
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

      <footer className="siteFooter">
        <section className="sourceLegend" aria-label="Data sources">
          <div className="sourceLegendTitle">Data sources</div>
          <ul className="sourceLegendList">
            <li>
              <span>Conditions + forecast</span>
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo Forecast API</a>
            </li>
            <li>
              <span>Marine advisories</span>
              <a href="https://weather.gc.ca/rss/warning/bc_e.xml" target="_blank" rel="noreferrer">Environment Canada warnings RSS</a>
            </li>
            <li>
              <span>Tides + water levels</span>
              <a href="https://api-iwls.dfo-mpo.gc.ca/" target="_blank" rel="noreferrer">DFO / Canadian Hydrographic Service IWLS</a>
            </li>
          </ul>
        </section>
        <div className="footerBrandRow">
          <span>© {new Date().getFullYear()}</span>
          <a className="baBadge baBadgeWhite" href="https://www.b-average.com/" target="_blank" rel="noreferrer">B AVERAGE</a>
        </div>
      </footer>
    </main>
  );
}

const BC_LOCATION_ORDER = new Map([
  ['Port Moody', 0],
  ['West Vancouver', 1],
  ['North Saanich', 2],
  ['Oak Bay', 3]
]);

function buildMarinaJumpGroups() {
  const groups = new Map<string, Array<{ label: string; path: string }>>();

  for (const marina of [...SEO_MARINAS].filter((marina) => marina.freedomClub && marina.locationId).sort(compareMarinaOptions)) {
    const label = regionLabel(menuRegion(marina));
    const path = marinaPath(marina);
    groups.set(label, [
      ...(groups.get(label) ?? []),
      {
        label: marina.area,
        path
      }
    ]);
  }

  return [...groups.entries()].map(([label, options]) => ({ label, options }));
}

function plannerMapHrefForLocation(locationId: LocationId) {
  const marina = SEO_MARINAS.find((candidate) => candidate.locationId === locationId);
  return marina ? `/plan-my-trip?marina=${seoSlugForMarina(marina)}` : '/plan-my-trip';
}

function compareMarinaOptions(a: SeoMarina, b: SeoMarina) {
  return (
    regionRank(a) - regionRank(b) ||
    withinRegionRank(a) - withinRegionRank(b) ||
    a.name.localeCompare(b.name)
  );
}

function withinRegionRank(marina: SeoMarina) {
  if (menuRegion(marina) === 'BC') {
    const locationRank = BC_LOCATION_ORDER.get(marina.area);
    if (marina.freedomClub && locationRank != null) return locationRank;
    return 1000 - marina.lat;
  }

  return (marina.freedomClub ? 0 : 1000) - marina.lat;
}

function regionRank(marina: SeoMarina) {
  const region = menuRegion(marina);
  if (region === 'BC') return 0;
  if (region === 'WA') return 1;
  if (region === 'OR') return 2;
  if (region === 'ID') return 3;
  return 4;
}

function menuRegion(marina: SeoMarina) {
  return marina.address.match(/,\s*(BC|WA|OR|ID)\b/)?.[1] ?? 'OTHER';
}

function regionLabel(region: string) {
  if (region === 'BC') return 'British Columbia';
  if (region === 'WA') return 'Washington';
  if (region === 'OR') return 'Oregon';
  if (region === 'ID') return 'Idaho';
  return 'Other';
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

function getSlackTideSummary({
  nowIso,
  events
}: {
  nowIso?: string | null;
  events: Array<{ t: string; kind: 'high' | 'low'; heightM?: number }>;
}) {
  const next = getNextTideSummary({ nowIso, events });
  if (!next) return { label: '—', detail: 'No upcoming tide turn available' };
  return {
    label: next.etaLabel,
    detail: `Next slack near ${next.kindLabel.toLowerCase()} tide turn`
  };
}

function getWindTideRiskSummary({
  now,
  tidePhase,
  forecast
}: {
  now: any;
  tidePhase: ReturnType<typeof getTidePhaseSummary>;
  forecast: Array<{ windSpeedKts?: number; windGustKts?: number }>;
}) {
  const windNow = Number(now?.wind?.speedKts ?? 0);
  const gustNow = Number(now?.wind?.gustKts ?? windNow);
  const next6 = (forecast || []).slice(0, 6);
  const maxWind6 = Math.max(...next6.map((h) => Number(h.windSpeedKts ?? 0)), windNow);
  const maxGust6 = Math.max(...next6.map((h) => Number(h.windGustKts ?? h.windSpeedKts ?? 0)), gustNow);

  const tideMoving = tidePhase ? Math.abs((tidePhase.progress ?? 0) - 0.5) > 0.18 : false;
  const windy = maxWind6 >= 16 || maxGust6 >= 22;

  if (tideMoving && (maxWind6 >= 22 || maxGust6 >= 30)) {
    return { label: 'High', detail: 'Steeper chop possible in current flow' };
  }
  if ((tideMoving && windy) || maxWind6 >= 18 || maxGust6 >= 25) {
    return { label: 'Moderate', detail: 'Expect some chop where current is strongest' };
  }
  return { label: 'Low', detail: 'Limited wind/current interaction signal' };
}

function getVisibilityRiskSummary({
  now,
  forecast,
  marineItems
}: {
  now: any;
  forecast: Array<{ precipProbPct?: number; precipMm?: number; t: string }>;
  marineItems: Array<{ title?: string; body?: string }>;
}) {
  const marineText = (marineItems || [])
    .map((m) => `${m.title || ''} ${m.body || ''}`.toLowerCase())
    .join(' ');

  if (marineText.includes('fog')) {
    return { label: 'Watch', detail: 'Fog mentioned in marine advisory text' };
  }

  const next12 = (forecast || []).slice(0, 12);
  const rainHit = next12.find((h) => Number(h.precipProbPct ?? 0) >= 70 || Number(h.precipMm ?? 0) >= 1.5);
  if (rainHit) {
    return { label: 'Reduced likely', detail: `Rain may reduce visibility around ${isoToLocalTime(rainHit.t)}` };
  }

  const precipNow = Number(now?.precipMmHr ?? 0);
  if (precipNow >= 0.8) {
    return { label: 'Reduced now', detail: 'Active rain can reduce visibility' };
  }

  return { label: 'Generally good', detail: 'No strong fog/rain visibility signal' };
}

function getBestLaunchWindowSummary({
  forecast,
  sunriseIso,
  sunsetIso,
  sunByDay = []
}: {
  forecast: Array<{ t: string; windSpeedKts?: number; windGustKts?: number; precipProbPct?: number }>;
  sunriseIso?: string;
  sunsetIso?: string;
  sunByDay?: Array<{ day: string; sunrise?: string; sunset?: string }>;
}) {
  const rows = (forecast || []).slice(0, 24);
  if (!rows.length) return { label: '—', detail: 'No forecast data' };

  const daylightByDay = new Map<string, { sunriseMinute: number; sunsetMinute: number }>();
  for (const s of sunByDay || []) {
    if (!s.day) continue;
    daylightByDay.set(s.day, {
      sunriseMinute: extractLocalMinuteOfDay(s.sunrise) ?? 6 * 60,
      sunsetMinute: extractLocalMinuteOfDay(s.sunset) ?? 18 * 60
    });
  }

  const today = extractLocalDay(sunriseIso) ?? extractLocalDay(sunsetIso);
  if (today && !daylightByDay.has(today)) {
    daylightByDay.set(today, {
      sunriseMinute: extractLocalMinuteOfDay(sunriseIso) ?? 6 * 60,
      sunsetMinute: extractLocalMinuteOfDay(sunsetIso) ?? 18 * 60
    });
  }

  const scored = rows.map((h) => {
    const wind = Number(h.windSpeedKts ?? 0);
    const gust = Number(h.windGustKts ?? wind);
    const rain = Number(h.precipProbPct ?? 0);
    const score = Math.max(0, 100 - wind * 3 - gust * 1.2 - rain * 0.6);
    const day = extractLocalDay(h.t);
    const minute = extractLocalMinuteOfDay(h.t);
    return { ...h, day, minute, score };
  });

  let bestStart = -1;
  let bestAvg = -1;
  for (let i = 0; i <= scored.length - 3; i += 1) {
    const window = scored.slice(i, i + 3);
    const [start, mid, end] = window;
    if (!start.day || start.minute == null || mid.minute == null || end.minute == null) continue;
    if (mid.day !== start.day || end.day !== start.day) continue;
    if (mid.minute !== start.minute + 60 || end.minute !== start.minute + 120) continue;

    const daylight = daylightByDay.get(start.day) ?? { sunriseMinute: 6 * 60, sunsetMinute: 18 * 60 };
    if (start.minute < daylight.sunriseMinute || start.minute + 180 > daylight.sunsetMinute) continue;

    const avg = window.reduce((a, b) => a + b.score, 0) / window.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
  }

  if (bestStart < 0) return { label: '—', detail: 'No suitable window found' };

  const start = scored[bestStart];
  return {
    label: `${formatAsOf(start.t)}–${formatLocalMinuteOfDay((start.minute ?? 0) + 180)}`,
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

type LocationWebcam =
  | { videoId: string; embedUrl?: never; url?: never; label?: never }
  | { embedUrl: string; videoId?: never; url?: never; label?: never }
  | { url: string; label: string; videoId?: never; embedUrl?: never }
  | { videoId?: never; embedUrl?: never; url?: never; label?: never };

function getLocationWebcam(id: LocationId): LocationWebcam {
  if (id === 'north-saanich') return { videoId: 'zeKV78ULlpY' };
  if (id === 'west-vancouver') return { videoId: 'MOKktH6RcpU' };
  if (id === 'port-moody') return { videoId: 'T0oUufecXeE' };
  if (id === 'bellingham') return { videoId: '6j0aasCRk_k' };
  if (id === 'everett') return { videoId: 'BsfcSCJZRFM' };
  if (id === 'lake-coeur-dalene') return { videoId: 'kwi4O3aDZ3Q' };
  if (id === 'oak-bay') return { url: 'https://oakbaymarina.com/weather/', label: 'Oak Bay live webcam' };
  if (id === 'elliott-bay-marina') return { url: 'https://www.elliottbaymarina.co/live/', label: 'Elliott Bay Marina live webcam' };
  if (id === 'olympia') return { url: 'https://swantown.portolympia.com/webcam/', label: 'Swantown Marina live webcam' };
  if (id === 'port-of-camas') return { url: 'https://portcw.com/marina/marina-webcam/', label: 'Port of Camas-Washougal live webcam' };
  return {};
}

function extractHour(isoLike?: string) {
  const s = String(isoLike || '');
  const m = s.match(/T(\d{2}):/);
  if (!m) return null;
  const hh = Number(m[1]);
  return Number.isFinite(hh) ? hh : null;
}

function extractLocalDay(isoLike?: string) {
  const m = String(isoLike || '').match(/^(\d{4}-\d{2}-\d{2})T/);
  return m?.[1] ?? null;
}

function extractLocalMinuteOfDay(isoLike?: string) {
  const m = String(isoLike || '').match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function formatLocalMinuteOfDay(totalMinutes: number) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hhRaw = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  const ampm = hhRaw >= 12 ? 'PM' : 'AM';
  let hh = hhRaw % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${String(mm).padStart(2, '0')} ${ampm}`;
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

  // Wind alert (single highest category only; no timeframe labels)
  const maxSustainedOverall = Math.max(
    typeof sustainedNow === 'number' ? sustainedNow : 0,
    Number.isFinite(maxSustainedNext6) ? maxSustainedNext6 : 0,
    Number.isFinite(maxSustainedNext24) ? maxSustainedNext24 : 0
  );
  const maxGustOverall = Math.max(
    typeof gustNow === 'number' ? gustNow : 0,
    Number.isFinite(maxGustNext6) ? maxGustNext6 : 0,
    Number.isFinite(maxGustNext24) ? maxGustNext24 : 0
  );

  const catOverall = envCanadaWindCategory(maxSustainedOverall);
  if (catOverall) {
    out.push({
      t: now?.asOf ?? next24?.[0]?.t ?? new Date().toISOString(),
      severity: catOverall.severity,
      title: catOverall.title,
      body: `Max sustained ~${Math.round(maxSustainedOverall)} kt${maxGustOverall > 0 ? `\n(max gust ~${Math.round(maxGustOverall)} kt)` : ''}`
    });
  }

  // Rain alert only if any hourly precip in next 24h exceeds 5 mm/hr
  const next24ForRain = (forecast || []).slice(0, 24);
  const heavyHour = next24ForRain.find((h) => typeof h.precipMm === 'number' && h.precipMm > 5);
  if (heavyHour) {
    out.push({
      t: heavyHour.t,
      severity: 'info',
      title: 'Heavy rain expected',
      body: `~${round(heavyHour.precipMm, 1)} mm/hr around ${isoToLocalTime(heavyHour.t)}`
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




