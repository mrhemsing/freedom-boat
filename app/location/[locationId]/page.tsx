import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { LOCATIONS, isTidalLocation, type LocationId } from '../../../lib/locations';
import { degToCardinal, isoToLocalDay, isoToLocalTime, round } from '../../../lib/format';
import { buildWeeklyOutlook, scoreBand, type DailyOutlook } from '../../../lib/outlook';
import { areaHubForPlace, canonicalUrl, marinaPath, SEO_MARINAS, seoSlugForMarina, type SeoMarina } from '../../../lib/seo-slugs';
import { breadcrumbJsonLd, placeJsonLd } from '../../../lib/seo-schema';
import { ISR_REVALIDATE_SECONDS } from '../../../lib/seo-config';
import { getLocationWeatherSnapshot } from '../../../lib/weather-snapshots';
import { BoatingAlertsModule, Card, ForecastStrip, KpiRow, TideList, WindArrow, type BoatingAlert } from './ui';
import { TideMiniChart, WindChart } from './charts';
import { IconMap, IconPartlyCloudy, IconRain, IconSun, IconSunrise, IconSunset, IconThermometer, IconTide, IconWind } from './icons';
import MarinaJump, { type MarinaJumpGroup } from './MarinaJump';
import LazyFrame from './LazyFrame';
import GlobalHeader from '../../GlobalHeader';
import SiteFooter from '../../SiteFooter';

export const revalidate = ISR_REVALIDATE_SECONDS;

export async function generateMetadata({
  params
}: {
  params: { locationId: string };
}): Promise<Metadata> {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  const name = loc?.name ?? 'Marina';
  const homeMarina = loc ? getFreedomClubMarinaForLocation(id) : null;
  const primaryMarina = loc ? getPrimaryMarinaForLocation(id) : null;
  const area = primaryMarina ? areaHubForPlace(primaryMarina) : { name: 'Pacific Northwest', slug: 'pacific-northwest' };
  const seoSnapshot = loc ? await getLocationSeoSummary(id).catch(() => null) : null;
  const isTidal = loc ? isTidalLocation(loc) : true;
  const title = homeMarina
    ? `Boating from ${name} - Conditions${isTidal ? ', Tides' : ''} & Trip Planning`
    : `${name} Marine Forecast${isTidal ? ', Tides' : ''} & Boating Conditions`;
  const description = homeMarina
    ? `Heading out from ${name}? Today: ${seoSnapshot?.scoreText ?? 'live conditions updating'}. See wind${isTidal ? ', tides,' : ''} and marine advisories before you book. Plan your trip with Fair Tide.`
    : `Today's boating conditions for ${name}${area ? `, ${area.name}` : ''}: ${seoSnapshot?.scoreText ? `${seoSnapshot.scoreText}, ` : ''}${seoSnapshot?.windText ? `${seoSnapshot.windText}. ` : ''}Live marine forecast and trip planning.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl(`/location/${id}`)
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl(`/location/${id}`),
      type: 'website'
    }
  };
}

export function generateStaticParams() {
  return Object.keys(LOCATIONS).map((locationId) => ({ locationId }));
}

export default async function LocationPage({
  params,
  searchParams
}: {
  params: { locationId: string };
  searchParams?: { embed?: string; plannerScore?: string; plannerDay?: string };
}) {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  if (!loc) return notFound();
  const isTidal = isTidalLocation(loc);
  const includeMarineAdvisories = loc.waterType !== 'lake';
  const timeZone = loc.timeZone ?? 'America/Vancouver';

  const [weatherSnapshot, tidesRes, marineRes] = await Promise.all([
    getLocationWeatherSnapshot(id).catch(() => null),
    isTidal ? fetch(`${baseUrl()}/api/${params.locationId}/tides?days=2`, { cache: 'no-store' }) : Promise.resolve(null),
    includeMarineAdvisories ? fetch(`${baseUrl()}/api/${params.locationId}/marine-warnings`, { cache: 'no-store' }) : Promise.resolve(null)
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
  const tides = tidesRes?.ok ? await tidesRes.json() : null;
  const marine = marineRes?.ok ? await marineRes.json() : null;

  const windSpeed = now?.wind?.speedKts;
  const gust = now?.wind?.gustKts;
  const dir = now?.wind?.directionDeg;
  const webcam = getLocationWebcam(id);
  const nextTide = isTidal ? getNextTideSummary({ events: tides?.events ?? [] }) : null;
  const tidePhase = isTidal ? getTidePhaseSummary({ events: tides?.events ?? [] }) : null;
  const windTrend = getWindTrendSummary(forecast?.forecast ?? []);
  const boatingAlertDaylight = getDaylightWindow({
    now,
    fetchedAt: forecast?.fetchedAt,
    timeZone,
    sunByDay: forecast?.sunByDay ?? [],
    forecast: forecast?.forecast ?? []
  });
  const boatingAlertNowIso = getAlertNowIso({
    nowIso: now?.asOf,
    fetchedAt: forecast?.fetchedAt,
    daylight: boatingAlertDaylight,
    timeZone
  });
  const rainEta = getRainEtaSummary(forecast?.forecast ?? [], boatingAlertDaylight);
  const advisoryText = includeMarineAdvisories
    ? getAdvisorySummary(marine?.items ?? [])
    : { label: 'Not used', detail: 'Marine advisories are hidden for inland lake locations' };
  const launchWindow = getBestLaunchWindowSummary({
    forecast: forecast?.forecast ?? [],
    nowIso: now?.asOf,
    sunriseIso: now?.sun?.sunrise,
    sunsetIso: now?.sun?.sunset,
    sunByDay: forecast?.sunByDay ?? []
  });
  const slackTide = isTidal ? getSlackTideSummary({ nowIso: now?.asOf, events: tides?.events ?? [] }) : null;
  const windTideRisk = isTidal ? getWindTideRiskSummary({ now, tidePhase, forecast: forecast?.forecast ?? [] }) : null;
  const windRisk = isTidal ? null : getWindRiskSummary({ now, forecast: forecast?.forecast ?? [] });
  const visibility = getVisibilityRiskSummary({ now, forecast: forecast?.forecast ?? [], marineItems: marine?.items ?? [] });
  const weeklyStartDay = extractLocalDay(boatingAlertDaylight?.start) ?? extractLocalDay(boatingAlertNowIso ?? undefined);
  const weeklyOutlook = buildWeeklyOutlook(forecast?.forecast ?? [], forecast?.sunByDay ?? [], 5, weeklyStartDay);
  const marineAuthority = includeMarineAdvisories
    ? (typeof marine?.authority === 'string' ? marine.authority : warningAuthorityForLocation(loc))
    : 'Inland lake forecast';
  const marineWarningStatus = includeMarineAdvisories
    ? (marine?.status === 'unavailable' ? 'unavailable' : 'available')
    : 'available';
  const boatingAlerts = buildBoatingAlerts({
    now,
    forecast: forecast?.forecast ?? [],
    marineItems: marine?.items ?? [],
    tideEvents: tides?.events ?? [],
    visibility,
    daylight: boatingAlertDaylight,
    nowIso: boatingAlertNowIso,
    warningAuthority: marineAuthority,
    includeTide: isTidal
  });
  const boatingAlertDayLabel = formatDayLabel(boatingAlertDaylight?.start ?? now?.asOf ?? forecast?.forecast?.[0]?.t);
  const marinaJumpGroups = buildMarinaJumpGroups();
  const mapHref = plannerMapHrefForLocation(id);
  const isPlannerEmbed = searchParams?.embed === 'planner';
  const plannerScore = isPlannerEmbed ? parsePlannerScore(searchParams?.plannerScore) : null;
  const plannerDayIndex = isPlannerEmbed ? parsePlannerDayIndex(searchParams?.plannerDay) : 0;
  const homeMarina = getFreedomClubMarinaForLocation(id);
  const primaryMarina = getPrimaryMarinaForLocation(id);
  const area = primaryMarina ? areaHubForPlace(primaryMarina) : null;
  const todayOutlook = weeklyOutlook[0] ?? null;
  const displayedTodayScore = plannerScore != null && plannerDayIndex === 0 ? plannerScore : todayOutlook?.score;
  const answerFirstVerdict = buildAnswerFirstVerdict({
    placeName: loc.name,
    score: displayedTodayScore,
    windSpeed,
    gust,
    directionDeg: dir,
    advisoryLabel: advisoryText.label,
    nextTide,
    isTidalLocation: isTidal
  });
  const planLinkLabel = `Plan a trip to ${loc.name}`;

  return (
    <main className="container">
      {!isPlannerEmbed ? <GlobalHeader active="conditions" contextLabel={loc.name} /> : null}
      <header className="topbar">
        <div className="headerBrand">
          <div className="locationHeroTitle">
            <span>Boating Conditions</span>
            <h1>{homeMarina ? loc.name : `${loc.name} Boating Conditions`}</h1>
          </div>
        </div>
        <a className="planMapButton" href={mapHref} aria-label={`Open ${loc.name} on trip map`}>
          <IconMap size={22} />
        </a>

        <div className="headerInfo">
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.78)', fontSize: 15 }}>
            <b style={{ color: 'rgba(255,255,255,0.92)' }}>{loc.name}</b>
            {now?.asOf ? <span style={{ opacity: 0.75 }}>{` as of ${formatAsOf(now.asOf)}`}</span> : null}
          </div>
          {loc.address ? <div className="locationAddress" style={{ marginTop: 6, color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{loc.address}</div> : null}
          <div className="locationControlRow">
            <div className="marinaJumpWrap">
              <MarinaJump value={id} groups={marinaJumpGroups} />
            </div>
            <div className="mobileSunBadgeWrap">
              <SunBadge sunrise={now?.sun?.sunrise} sunset={now?.sun?.sunset} />
            </div>
          </div>
        </div>

        <div className="sunBadgeWrap" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <SunBadge sunrise={now?.sun?.sunrise} sunset={now?.sun?.sunset} />
        </div>
      </header>

      {!isPlannerEmbed && !homeMarina ? (
        <section className="answerFirstPanel" aria-label={`${loc.name} boating conditions summary`}>
          {area ? (
            <nav className="seoBreadcrumb locationBreadcrumb" aria-label="Breadcrumb">
              <a href="/">Home</a>
              <span>/</span>
              <a href={`/area/${area.slug}`}>{area.name}</a>
              <span>/</span>
              <span>{loc.name}</span>
            </nav>
          ) : null}
          <p>{answerFirstVerdict}</p>
          <a className="seoButton seoButtonPrimary locationPlanLink" href={mapHref} aria-label={planLinkLabel}>
            {planLinkLabel}
          </a>
        </section>
      ) : null}

      <div className="grid" style={{ marginTop: 24 }}>
        {boatingAlerts.length ? (
          <Card className="alertsCard" title={null} icon={null}>
            <BoatingAlertsModule
              items={boatingAlerts}
              dayLabel={boatingAlertDayLabel}
              daylight={boatingAlertDaylight}
              nowIso={boatingAlertNowIso}
              warningAuthority={marineAuthority}
              warningStatus={marineWarningStatus}
            />
          </Card>
        ) : (
          <BoatingAlertsModule
            items={boatingAlerts}
            dayLabel={boatingAlertDayLabel}
            daylight={boatingAlertDaylight}
            nowIso={boatingAlertNowIso}
            warningAuthority={marineAuthority}
            warningStatus={marineWarningStatus}
          />
        )}

        <Card
          className="weeklyCard"
          title={<span className="weeklyTitleMain">5-day outlook</span>}
          icon={<span style={{ fontWeight: 900, fontSize: 17, color: 'rgba(11,18,32,0.62)' }}>◉</span>}
          right={null}
          headerStackOnMobile
        >
          {(() => {
            const week = weeklyOutlook
              .map((day, index) => (
                plannerScore != null && index === plannerDayIndex
                  ? { ...day, score: plannerScore }
                  : day
              ));
            const best = week.reduce((acc, d) => (acc == null || d.score > acc.score ? d : acc), null as DailyOutlook | null);
            if (!week.length) return <div className="miniNote">No forecast available.</div>;
            return (
              <div className="outlookGrid">
                {week.map((d, idx) => {
                  const isBest = best?.day === d.day;
                  const score = scoreBand(d.score);
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
                      <div
                        className={`dayScorePill dayScorePill-${score.tone}`}
                        title={`Boating score: ${score.min}-${score.max} ${score.label}`}
                      >
                        <span>{d.score}/100</span><span className="dayScorePillLabel">{score.label}</span>
                      </div>
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
            {slackTide ? (
              <div className="quickItem">
                <div className="quickLabel">Slack tide</div>
                <div className="quickValue">{slackTide.label}</div>
                <div className="miniNote">{slackTide.detail}</div>
              </div>
            ) : null}
            {windTideRisk ? (
              <div className="quickItem">
                <div className="quickLabel">Wind × tide risk</div>
                <div className="quickValue">{windTideRisk.label}</div>
                <div className="miniNote">{windTideRisk.detail}</div>
              </div>
            ) : null}
            {windRisk ? (
              <div className="quickItem">
                <div className="quickLabel">Wind risk</div>
                <div className="quickValue">{windRisk.label}</div>
                <div className="miniNote">{windRisk.detail}</div>
              </div>
            ) : null}
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
                  <LazyFrame
                    className="liveFrame"
                    iframeClassName="liveFrameIframe liveFrameMap"
                      title={`${loc.name} mini map`}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                        `${loc.lon - 0.015},${loc.lat - 0.01},${loc.lon + 0.015},${loc.lat + 0.01}`
                      )}&layer=mapnik&marker=${encodeURIComponent(`${loc.lat},${loc.lon}`)}`}
                    placeholder={<div className="liveFramePlaceholder">Map loads when this section is in view.</div>}
                    />
                )
              },
              {
                label: 'Webcam',
                value: (
                  <div className="liveFrame">
                    {webcam.videoId ? (
                      <LazyFrame
                        title={`${loc.name} YouTube webcam`}
                        src={`https://www.youtube.com/embed/${webcam.videoId}?autoplay=1&mute=1&playsinline=1&controls=0&modestbranding=1&iv_load_policy=3&rel=0`}
                        className="liveFrameFill"
                        iframeClassName="liveFrameIframe liveFrameVideo"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        placeholder={<WebcamPoster videoId={webcam.videoId} label={webcam.label ?? `${loc.name} live webcam`} />}
                      />
                    ) : webcam.embedUrl ? (
                      <LazyFrame
                        title={`${loc.name} live webcam`}
                        src={webcam.embedUrl}
                        className="liveFrameFill"
                        iframeClassName="liveFrameIframe"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                        placeholder={<div className="liveFramePlaceholder">Webcam loads when this section is in view.</div>}
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
                    {isTidal ? (
                      <span className="conditionsDetailLine">
                        Tide: {nextTide ? `${nextTide.kindLabel} ${nextTide.etaLabel}` : '—'}
                      </span>
                    ) : null}
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

        {isTidal ? (
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
        ) : null}
      </div>

      {!isPlannerEmbed ? (
        <SiteFooter
          showIndependenceDisclosure={Boolean(homeMarina)}
          includeMarineAdvisories={includeMarineAdvisories}
          includeTides={isTidal}
        />
      ) : null}
      {!isPlannerEmbed && area ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              breadcrumbJsonLd([
                ['Home', '/'],
                [area.name, `/area/${area.slug}`],
                [loc.name, `/location/${id}`]
              ]),
              placeJsonLd({
                name: loc.name,
                address: loc.address,
                lat: loc.lat,
                lon: loc.lon,
                path: `/location/${id}`,
                regionName: area.name,
                commercial: Boolean(homeMarina)
              })
            ])
          }}
        />
      ) : null}
    </main>
  );
}

function SunBadge({ sunrise, sunset }: { sunrise?: string; sunset?: string }) {
  return (
    <span className="badge sunBadge">
      <span className="sunBadgeStack">
        <span className="sunBadgeTime sunBadgeRise">
          <span className="sunBadgeIcon"><IconSunrise size={17} /></span>
          <span>{sunrise ? formatAsOf(sunrise) : '—'}</span>
        </span>
        <span className="sunBadgeTime sunBadgeSet">
          <span className="sunBadgeIcon"><IconSunset size={17} /></span>
          <span>{sunset ? formatAsOf(sunset) : '—'}</span>
        </span>
      </span>
    </span>
  );
}

function WebcamPoster({ videoId, label }: { videoId: string; label: string }) {
  return (
    <div
      className="webcamPoster"
      style={{ backgroundImage: `linear-gradient(rgba(4, 18, 31, 0.22), rgba(4, 18, 31, 0.44)), url(https://img.youtube.com/vi/${videoId}/hqdefault.jpg)` }}
    >
      <span className="webcamPlay" aria-hidden="true">▶</span>
      <span>{label}</span>
    </div>
  );
}

async function getLocationSeoSummary(locationId: LocationId) {
  const snapshot = await getLocationWeatherSnapshot(locationId);
  const forecast = snapshot
    ? buildWeeklyOutlook(snapshot.forecast.slice(0, 120), snapshot.sunByDay, 1)[0] ?? null
    : null;
  const scoreText = forecast ? `${forecast.score}/100 ${scoreBand(forecast.score).label}` : null;
  const wind = snapshot?.now?.wind;
  const windText = wind?.speedKts != null
    ? `wind ${round(wind.speedKts, 0)} kt${wind.directionDeg != null ? ` ${degToCardinal(wind.directionDeg) ?? ''}` : ''}`
    : null;

  return { scoreText, windText };
}

function getFreedomClubMarinaForLocation(locationId: LocationId) {
  return SEO_MARINAS.find((marina) => marina.locationId === locationId && marina.freedomClub) ?? null;
}

function getPrimaryMarinaForLocation(locationId: LocationId) {
  return getFreedomClubMarinaForLocation(locationId)
    ?? SEO_MARINAS.find((marina) => marina.locationId === locationId)
    ?? null;
}

function buildAnswerFirstVerdict({
  placeName,
  score,
  windSpeed,
  gust,
  directionDeg,
  advisoryLabel,
  nextTide,
  isTidalLocation
}: {
  placeName: string;
  score?: number;
  windSpeed?: number;
  gust?: number;
  directionDeg?: number;
  advisoryLabel: string;
  nextTide: ReturnType<typeof getNextTideSummary>;
  isTidalLocation: boolean;
}) {
  const scoreText = typeof score === 'number'
    ? `${Math.round(score)}/100 ${scoreBand(score).label}`
    : 'forecast score updating';
  const windText = typeof windSpeed === 'number'
    ? `Winds ${round(windSpeed, 0)} kt${typeof directionDeg === 'number' ? ` ${degToCardinal(directionDeg) ?? ''}` : ''}${typeof gust === 'number' ? `, gusting ${round(gust, 0)} kt` : ''}`
    : 'Wind forecast updating';
  const tideText = isTidalLocation
    ? nextTide
      ? `Next ${nextTide.kindLabel.toLowerCase()} tide ${isoToLocalTime(nextTide.t)}${nextTide.heightM != null ? ` (${round(nextTide.heightM, 2)} m)` : ''}.`
      : 'next tide updating'
    : null;
  const warningText = advisoryLabel === 'No advisory' ? 'no active marine advisory' : advisoryLabel.toLowerCase();

  return `Boating conditions at ${placeName} today: ${scoreText}. ${windText}; ${warningText}.${tideText ? ` ${tideText}` : ''}`;
}

const BC_LOCATION_ORDER = new Map([
  ['Port Moody', 0],
  ['West Vancouver', 1],
  ['North Saanich', 2],
  ['Oak Bay', 3]
]);

function buildMarinaJumpGroups() {
  const groups = new Map<string, MarinaJumpGroup['options']>();

  for (const marina of [...SEO_MARINAS].filter((marina) => marina.freedomClub && marina.locationId).sort(compareMarinaOptions)) {
    const label = regionLabel(menuRegion(marina));
    const path = marinaPath(marina);
    groups.set(label, [
      ...(groups.get(label) ?? []),
      {
        label: marina.area,
        path,
        locationId: marina.locationId as LocationId
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
  return { kindLabel: kind, etaLabel: formatEta(etaMs), t: n.t, heightM: n.heightM };
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

function getRainEtaSummary(forecast: Array<{ t: string; precipProbPct?: number; precipMm?: number }>, daylight?: DaylightWindow) {
  const window = getRainWindow(forecast, daylight);
  if (!window) return { label: 'None soon', detail: 'No strong rain signal in next 24h' };
  return {
    label: isoToLocalTime(window.start),
    detail: `Starts around ${isoToLocalTime(window.start)}; peak ~${round(window.peakMm, 1)} mm/hr near ${isoToLocalTime(window.peak)}`
  };
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

function warningAuthorityForLocation(loc: { address?: string }) {
  const address = String(loc.address || '').toUpperCase();
  return /\bBC\b|\bCANADA\b/.test(address) ? 'Environment Canada' : 'National Weather Service';
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

function getWindRiskSummary({
  now,
  forecast
}: {
  now: any;
  forecast: Array<{ windSpeedKts?: number; windGustKts?: number }>;
}) {
  const windNow = Number(now?.wind?.speedKts ?? 0);
  const gustNow = Number(now?.wind?.gustKts ?? windNow);
  const next6 = (forecast || []).slice(0, 6);
  const maxWind6 = Math.max(...next6.map((h) => Number(h.windSpeedKts ?? 0)), windNow);
  const maxGust6 = Math.max(...next6.map((h) => Number(h.windGustKts ?? h.windSpeedKts ?? 0)), gustNow);

  if (maxWind6 >= 22 || maxGust6 >= 30) {
    return { label: 'High', detail: 'Strong wind signal for this inland location' };
  }
  if (maxWind6 >= 16 || maxGust6 >= 22) {
    return { label: 'Moderate', detail: 'Watch wind and gusts before leaving the dock' };
  }
  return { label: 'Low', detail: 'Limited wind signal' };
}

const VISIBILITY_RAIN_THRESHOLD_MM = 3;

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
  const rainHit = next12.find((h) => Number(h.precipMm ?? 0) >= VISIBILITY_RAIN_THRESHOLD_MM);
  if (rainHit) {
    return { label: 'Reduced likely', detail: `Rain may reduce visibility around ${isoToLocalTime(rainHit.t)}` };
  }

  const precipNow = Number(now?.precipMmHr ?? 0);
  if (precipNow >= VISIBILITY_RAIN_THRESHOLD_MM) {
    return { label: 'Reduced now', detail: 'Active rain can reduce visibility' };
  }

  return { label: 'Generally good', detail: 'No strong fog/rain visibility signal' };
}

function getVisibilityWatchWindow(forecast: ForecastAlertHour[], daylight?: DaylightWindow, nowIso?: string | null) {
  const daylightForecast = getTodayDaylightForecast(forecast, daylight);
  const qualifying = daylightForecast.filter((hour) => Number(hour.precipMm ?? 0) >= VISIBILITY_RAIN_THRESHOLD_MM);
  if (!qualifying.length) return null;

  const peak = qualifying.reduce((best, hour) => {
    const bestMm = Number(best.precipMm ?? 0);
    const mm = Number(hour.precipMm ?? 0);
    return mm > bestMm ? hour : best;
  }, qualifying[0]);

  const segment = contiguousWindowAroundPeak(
    daylightForecast,
    (hour) => Number(hour.precipMm ?? 0) >= VISIBILITY_RAIN_THRESHOLD_MM,
    peak.t
  );
  if (segment) return { start: segment.start, peak: peak.t, end: segment.end };

  const next = nextForecastHour(daylightForecast, peak.t);
  const fallbackEnd = next?.t ?? addLocalHours(peak.t, 1);
  const end = nowIso && compareLocalIso(fallbackEnd, nowIso) <= 0 ? addLocalHours(nowIso, 1) : fallbackEnd;
  return { start: peak.t, peak: peak.t, end };
}

function getBestLaunchWindowSummary({
  forecast,
  nowIso,
  sunriseIso,
  sunsetIso,
  sunByDay = []
}: {
  forecast: Array<{ t: string; windSpeedKts?: number; windGustKts?: number; precipProbPct?: number }>;
  nowIso?: string | null;
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

  const findBestStart = ({
    day,
    afterDay,
    nowDay,
    nowMinute
  }: {
    day?: string;
    afterDay?: string;
    nowDay?: string | null;
    nowMinute?: number | null;
  } = {}) => {
    let bestStart = -1;
    let bestAvg = -1;
    for (let i = 0; i <= scored.length - 3; i += 1) {
      const window = scored.slice(i, i + 3);
      const [start, mid, end] = window;
      if (!start.day || start.minute == null || mid.minute == null || end.minute == null) continue;
      if (afterDay && start.day <= afterDay) continue;
      if (day && start.day !== day) continue;
      if (mid.day !== start.day || end.day !== start.day) continue;
      if (mid.minute !== start.minute + 60 || end.minute !== start.minute + 120) continue;
      if (start.day === nowDay && nowMinute != null && start.minute + 180 <= nowMinute) continue;

      const daylight = daylightByDay.get(start.day) ?? { sunriseMinute: 6 * 60, sunsetMinute: 18 * 60 };
      if (start.minute < daylight.sunriseMinute || start.minute + 180 > daylight.sunsetMinute) continue;

      const avg = window.reduce((a, b) => a + b.score, 0) / window.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestStart = i;
      }
    }
    return bestStart;
  };

  const nowDay = extractLocalDay(nowIso ?? undefined);
  const nowMinute = extractLocalMinuteOfDay(nowIso ?? undefined);
  const todayDaylight = nowDay ? daylightByDay.get(nowDay) : null;
  if (
    nowDay
    && nowMinute != null
    && todayDaylight
    && todayDaylight.sunsetMinute - nowMinute < 2 * 60
  ) {
    const tomorrowStart = findBestStart({ afterDay: nowDay });
    if (tomorrowStart >= 0) {
      const start = scored[tomorrowStart];
      return {
        label: 'Done for today',
        detail: `Tomorrow's window: ${formatLaunchWindowRange(start.minute ?? 0)}`
      };
    }
    return { label: 'Done for today', detail: "Check tomorrow's launch window after the forecast refreshes" };
  }

  let bestStart = findBestStart({ day: nowDay ?? undefined, nowDay, nowMinute });
  if (bestStart < 0 && nowDay) {
    bestStart = findBestStart({ afterDay: nowDay });
  }
  if (bestStart < 0) return { label: '—', detail: 'No suitable window found' };

  const start = scored[bestStart];
  const labelPrefix = nowDay && start.day && compareLocalDays(start.day, nowDay) === 1 ? 'Tomorrow ' : '';
  const labelRange = start.day === nowDay && nowMinute != null && (start.minute ?? 0) < nowMinute
    ? `Now until ${formatLaunchWindowTime((start.minute ?? 0) + 180, true)}`
    : formatLaunchWindowRange(start.minute ?? 0);
  return {
    label: `${labelPrefix}${labelRange}`,
    detail: 'Best 3-hour window between sunrise and sunset'
  };
}

type ForecastAlertHour = {
  t: string;
  windSpeedKts?: number;
  windGustKts?: number;
  precipMm?: number;
  precipProbPct?: number;
};

type DaylightWindow = { start: string; end: string };

function buildBoatingAlerts({
  now,
  forecast,
  marineItems,
  tideEvents,
  visibility,
  daylight,
  nowIso,
  warningAuthority,
  includeTide = true
}: {
  now: any;
  forecast: ForecastAlertHour[];
  marineItems: Array<{ title?: string; body?: string; pubDate?: string }>;
  tideEvents: Array<{ t: string; kind: 'high' | 'low'; heightM?: number }>;
  visibility: { label: string; detail: string };
  daylight?: DaylightWindow;
  nowIso?: string | null;
  warningAuthority: string;
  includeTide?: boolean;
}): BoatingAlert[] {
  const hasMarineWarning = marineItems.length > 0;
  const rows: BoatingAlert[] = [];

  for (const item of marineItems.slice(0, 4)) {
    rows.push({
      id: `marine-${slugify(item.title || 'warning')}`,
      tier: 'warning',
      category: 'marine_warning',
      icon: 'alert-triangle',
      title: item.title || 'Marine warning',
      detail: item.body || 'Official marine warning is active for this area.',
      source: warningAuthority
    });
  }

  const daylightForecast = getTodayDaylightForecast(forecast, daylight);
  const maxWind = maxForecastValue(daylightForecast, (hour) => hour.windSpeedKts);
  const maxGust = maxForecastValue(daylightForecast, (hour) => hour.windGustKts ?? hour.windSpeedKts);
  if (!hasMarineWarning && (maxWind.value >= 12 || maxGust.value >= 18)) {
    const peak = maxGust.value >= 18 ? maxGust : maxWind;
    const windWindow = contiguousWindowAroundPeak(
      daylightForecast,
      (hour) => Number(hour.windSpeedKts ?? 0) >= 12 || Number(hour.windGustKts ?? hour.windSpeedKts ?? 0) >= 18,
      peak.t
    );
    const window = windWindow
      ? buildWatchWindow({ start: windWindow.start, peak: peak.t, end: windWindow.end, daylight, nowIso })
      : buildWatchWindow({ start: peak.t, peak: peak.t, end: peak.t, daylight, nowIso, forceSoft: true });
    if (window) {
      rows.push({
        id: 'wind-watch',
        tier: 'watch',
        category: 'wind',
        icon: 'wind',
        title: windWatchTitle({ window, peakIso: peak.t, nowIso }),
        detail: windWatchDetail({ window, peakIso: peak.t, maxGust: maxGust.value, nowIso }),
        window
      });
    }
  }

  const rainWindow = getRainWindow(forecast, daylight);
  if (rainWindow && rainWindow.peakMm >= 4) {
    const window = buildWatchWindow({ start: rainWindow.start, peak: rainWindow.peak, end: rainWindow.end, daylight, nowIso });
    if (window) {
      rows.push({
        id: `rain-${extractLocalDay(rainWindow.peak) ?? 'watch'}`,
        tier: 'watch',
        category: 'rain',
        icon: 'cloud-rain',
        title: 'Moderate rain',
        detail: rainWatchDetail({ window, peakMm: rainWindow.peakMm, peakIso: rainWindow.peak, nowIso }),
        window
      });
    }
  }

  if (visibility.label !== 'Generally good') {
    const visibilityWindow = getVisibilityWatchWindow(forecast, daylight, nowIso);
    const window = visibilityWindow
      ? buildWatchWindow({ start: visibilityWindow.start, peak: visibilityWindow.peak, end: visibilityWindow.end, daylight, nowIso, forceSoft: true })
      : undefined;
    if (window) {
      rows.push({
        id: 'visibility-watch',
        tier: 'watch',
        category: 'visibility',
        icon: 'eye',
        title: 'Reduced visibility',
        detail: visibilityDetail({ detail: visibility.detail, window, nowIso }),
        window
      });
    }
  }

  const tideRange = includeTide && daylight ? getDaylightTideRange(tideEvents, daylight) : null;
  if (tideRange && tideRange.rangeM >= 3.5) {
    const window = buildWatchWindow({ start: tideRange.start, peak: tideRange.peak, end: tideRange.end, daylight, nowIso });
    if (window) {
      rows.push({
        id: 'tide-watch',
        tier: 'watch',
        category: 'tide',
        icon: 'wave-sine',
        title: 'Large tide swing',
        detail: tideWatchDetail({ window, rangeM: tideRange.rangeM, nowIso }),
        window
      });
    }
  }

  return rows
    .sort(compareBoatingAlerts)
    .slice(0, 4);
}

function compareBoatingAlerts(a: BoatingAlert, b: BoatingAlert) {
  const tierRank: Record<BoatingAlert['tier'], number> = { warning: 0, watch: 1 };
  const tierDelta = tierRank[a.tier] - tierRank[b.tier];
  if (tierDelta !== 0) return tierDelta;
  return Date.parse(a.window?.start ?? '') - Date.parse(b.window?.start ?? '') || a.title.localeCompare(b.title);
}

function getDaylightWindow({
  now,
  fetchedAt,
  timeZone = 'America/Vancouver',
  sunByDay,
  forecast
}: {
  now: any;
  fetchedAt?: string;
  timeZone?: string;
  sunByDay: Array<{ day: string; sunrise?: string; sunset?: string }>;
  forecast: ForecastAlertHour[];
}): DaylightWindow | undefined {
  const fetchedLocal = fetchedAt ? isoToLocationLocalIso(fetchedAt, timeZone) : null;
  const localNowIso = now?.asOf ?? fetchedLocal ?? forecast[0]?.t;
  const localNowDay = extractLocalDay(localNowIso);
  const localNowMinute = extractLocalMinuteOfDay(localNowIso);
  const fallbackDay = extractLocalDay(forecast[0]?.t);
  const todaySun = sunByDay.find((entry) => entry.day === localNowDay);
  const todaySunsetMinute = extractLocalMinuteOfDay(todaySun?.sunset);
  const shouldUseTomorrow = Boolean(
    localNowDay
    && localNowMinute != null
    && todaySunsetMinute != null
    && localNowMinute >= todaySunsetMinute
  );
  const day = shouldUseTomorrow && localNowDay
    ? nextSunDay(localNowDay, sunByDay) ?? nextForecastDay(localNowDay, forecast) ?? localNowDay
    : localNowDay ?? fallbackDay;
  const sun = sunByDay.find((entry) => entry.day === day);
  const nowSunDay = extractLocalDay(now?.sun?.sunrise);
  const useNowSun = nowSunDay === day;
  const sunrise = useNowSun ? now?.sun?.sunrise : sun?.sunrise;
  const sunset = useNowSun ? now?.sun?.sunset : sun?.sunset;
  if (!sunrise || !sunset) return undefined;
  return { start: sunrise, end: sunset };
}

function getAlertNowIso({
  nowIso,
  fetchedAt,
  daylight,
  timeZone = 'America/Vancouver'
}: {
  nowIso?: string | null;
  fetchedAt?: string;
  daylight?: DaylightWindow;
  timeZone?: string;
}) {
  const day = extractLocalDay(daylight?.start);
  if (nowIso && (!day || extractLocalDay(nowIso) === day)) return nowIso;
  const fetchedLocal = fetchedAt ? isoToLocationLocalIso(fetchedAt, timeZone) : null;
  if (fetchedLocal && (!day || extractLocalDay(fetchedLocal) === day)) return fetchedLocal;
  return nowIso ?? fetchedLocal ?? null;
}

function isoToLocationLocalIso(iso: string, timeZone: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(d);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  const year = value('year');
  const month = value('month');
  const day = value('day');
  const hour = value('hour');
  const minute = value('minute');
  if (!year || !month || !day || !hour || !minute) return null;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function nextSunDay(day: string, sunByDay: Array<{ day: string }>) {
  return sunByDay
    .map((entry) => entry.day)
    .filter((candidate) => candidate > day)
    .sort()[0] ?? null;
}

function nextForecastDay(day: string, forecast: ForecastAlertHour[]) {
  return [...new Set((forecast || []).map((hour) => extractLocalDay(hour.t)).filter(Boolean) as string[])]
    .filter((candidate) => candidate > day)
    .sort()[0] ?? null;
}

function getRainWindow(forecast: ForecastAlertHour[], daylight?: DaylightWindow) {
  const rows = getTodayDaylightForecast(forecast, daylight);
  const qualifying = rows.filter((hour) => Number(hour.precipMm ?? 0) >= 0.2 || Number(hour.precipProbPct ?? 0) >= 60);
  if (!qualifying.length) return null;

  const peakHour = qualifying.reduce((best, hour) => {
    const bestMm = Number(best.precipMm ?? 0);
    const mm = Number(hour.precipMm ?? 0);
    if (mm !== bestMm) return mm > bestMm ? hour : best;
    return Number(hour.precipProbPct ?? 0) > Number(best.precipProbPct ?? 0) ? hour : best;
  }, qualifying[0]);

  return {
    start: qualifying[0].t,
    peak: peakHour.t,
    end: qualifying[qualifying.length - 1].t,
    peakMm: Number(peakHour.precipMm ?? 0),
    peakProb: Number(peakHour.precipProbPct ?? 0)
  };
}

function maxForecastValue(rows: ForecastAlertHour[], select: (hour: ForecastAlertHour) => number | undefined): { value: number; t: string } {
  let best = { value: 0, t: rows[0]?.t ?? new Date().toISOString() };
  for (const hour of rows) {
    const value = Number(select(hour) ?? 0);
    if (value > best.value) best = { value, t: hour.t };
  }
  return best;
}

function nextForecastHour(rows: ForecastAlertHour[], iso: string) {
  const index = rows.findIndex((hour) => hour.t === iso);
  if (index < 0) return null;
  return rows[index + 1] ?? null;
}

function contiguousWindowAroundPeak(rows: ForecastAlertHour[], predicate: (hour: ForecastAlertHour) => boolean, peakIso: string) {
  const peakIndex = rows.findIndex((hour) => hour.t === peakIso);
  if (peakIndex < 0 || !predicate(rows[peakIndex])) return null;

  let startIndex = peakIndex;
  let endIndex = peakIndex;
  while (startIndex > 0 && predicate(rows[startIndex - 1])) startIndex -= 1;
  while (endIndex < rows.length - 1 && predicate(rows[endIndex + 1])) endIndex += 1;

  return { start: rows[startIndex].t, end: rows[endIndex].t };
}

function buildWatchWindow({
  start,
  peak,
  end,
  daylight,
  nowIso,
  forceSoft = false
}: {
  start: string;
  peak?: string;
  end: string;
  daylight?: DaylightWindow;
  nowIso?: string | null;
  forceSoft?: boolean;
}): NonNullable<BoatingAlert['window']> | undefined {
  if (nowIso && isWindowOver({ start, peak, end, nowIso })) return undefined;
  const confidence = !forceSoft && isSharpWatchWindow({ start, peak, end, daylight }) ? 'sharp' : 'soft';
  return { start, peak, end, confidence };
}

function isSharpWatchWindow({
  start,
  peak,
  end,
  daylight
}: {
  start: string;
  peak?: string;
  end: string;
  daylight?: DaylightWindow;
}) {
  if (!daylight) return false;
  if (!isWithinWindow(start, daylight) || !isWithinWindow(end, daylight)) return false;
  if (peak && !isWithinWindow(peak, daylight)) return false;

  const startMinute = extractLocalMinuteOfDay(start);
  const endMinute = extractLocalMinuteOfDay(end);
  if (startMinute == null || endMinute == null) return false;
  if (peak) {
    const peakMinute = extractLocalMinuteOfDay(peak);
    if (peakMinute == null || startMinute >= peakMinute || peakMinute >= endMinute) return false;
  }

  const spanMinutes = endMinute - startMinute;
  return spanMinutes > 0 && spanMinutes <= 6 * 60;
}

function isWindowOver({
  start,
  peak,
  end,
  nowIso
}: {
  start: string;
  peak?: string;
  end: string;
  nowIso: string;
}) {
  const anchor = end || peak || start;
  if (extractLocalDay(anchor) !== extractLocalDay(nowIso)) return false;
  const anchorMinute = extractLocalMinuteOfDay(anchor);
  const nowMinute = extractLocalMinuteOfDay(nowIso);
  if (anchorMinute == null || nowMinute == null) return false;
  return anchorMinute < nowMinute;
}

function isWindowInProgress(window: NonNullable<BoatingAlert['window']>, nowIso?: string | null) {
  if (!nowIso || extractLocalDay(window.start) !== extractLocalDay(nowIso)) return false;
  const startMinute = extractLocalMinuteOfDay(window.start);
  const endMinute = extractLocalMinuteOfDay(window.end);
  const nowMinute = extractLocalMinuteOfDay(nowIso);
  if (startMinute == null || endMinute == null || nowMinute == null) return false;
  return startMinute < nowMinute && nowMinute < endMinute;
}

function windWatchDetail({
  window,
  peakIso,
  maxGust,
  nowIso
}: {
  window: NonNullable<BoatingAlert['window']>;
  peakIso: string;
  maxGust: number;
  nowIso?: string | null;
}) {
  const gustText = `gusts to ${round(maxGust, 0)} kt`;
  if (window.confidence === 'soft') {
    return `${capitalizeSentence(gustText)}.`;
  }
  if (isWindowInProgress(window, nowIso)) {
    return `Breezy now through ${alertLocalTime(window.end ?? peakIso, nowIso)}, peaking up to ${round(maxGust, 0)} kt near ${alertLocalTime(window.peak ?? peakIso, nowIso)}.`;
  }
  return `Plan for chop: gusts build from ${alertLocalTime(window.start, nowIso)}, peaking up to ${round(maxGust, 0)} kt near ${alertLocalTime(window.peak ?? peakIso, nowIso)}. Easing by ${alertLocalTime(window.end ?? window.start, nowIso)}.`;
}

function windWatchTitle({
  window,
  peakIso,
  nowIso
}: {
  window: NonNullable<BoatingAlert['window']>;
  peakIso: string;
  nowIso?: string | null;
}) {
  if (window.confidence === 'soft') return `Breezy around ${alertLocalTime(peakIso, nowIso)}`;
  return 'Breezy daylight window';
}

function rainWatchDetail({
  window,
  peakMm,
  peakIso,
  nowIso
}: {
  window: NonNullable<BoatingAlert['window']>;
  peakMm: number;
  peakIso: string;
  nowIso?: string | null;
}) {
  if (window.confidence === 'soft') return 'Reduced visibility likely through the afternoon as rain moves in.';
  if (isWindowInProgress(window, nowIso)) {
    return `Rain continues through ${alertLocalTime(window.end ?? peakIso, nowIso)}, peaking up to ${round(peakMm, 1)} mm/hr near ${alertLocalTime(window.peak ?? peakIso, nowIso)}.`;
  }
  return `Rain builds from ${alertLocalTime(window.start, nowIso)}, peaking up to ${round(peakMm, 1)} mm/hr near ${alertLocalTime(window.peak ?? peakIso, nowIso)}. Easing by ${alertLocalTime(window.end ?? window.start, nowIso)}.`;
}

function visibilityDetail({
  window,
  nowIso
}: {
  detail: string;
  window: NonNullable<BoatingAlert['window']>;
  nowIso?: string | null;
}) {
  if (nowIso && compareLocalIso(window.end ?? window.start, nowIso) <= 0) {
    return 'May linger as rain moves through.';
  }
  if (isWindowInProgress(window, nowIso)) {
    return `Possible now through ${alertLocalTime(window.end ?? window.start, nowIso)}.`;
  }
  if (nowIso && compareLocalIso(window.start, nowIso) <= 0) {
    return `Possible through ${alertLocalTime(window.end ?? window.start, nowIso)}.`;
  }
  const peakText = alertLocalTime(window.peak ?? window.start, nowIso);
  const endText = window.end && compareLocalIso(window.end, window.peak ?? window.start) > 0
    ? `, eases after ${alertLocalTime(window.end, nowIso)}`
    : '';
  return `Likely as rain peaks near ${peakText}${endText}.`;
}

function capitalizeSentence(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function tideWatchDetail({
  window,
  rangeM,
  nowIso
}: {
  window: NonNullable<BoatingAlert['window']>;
  rangeM: number;
  nowIso?: string | null;
}) {
  if (window.confidence === 'sharp') {
    if (isWindowInProgress(window, nowIso)) {
      return `${round(rangeM, 1)} m tide swing continues through ${alertLocalTime(window.end ?? window.start, nowIso)}. Stronger current near the turns.`;
    }
    return `${round(rangeM, 1)} m daylight range from ${alertLocalTime(window.start, nowIso)} to ${alertLocalTime(window.end ?? window.start, nowIso)}. Stronger current near the turns.`;
  }
  return `${round(rangeM, 1)} m range in daylight. Expect stronger current near the turns.`;
}

function alertLocalTime(iso: string, nowIso?: string | null) {
  const clock = formatAsOf(iso);
  const day = extractLocalDay(iso);
  const nowDay = extractLocalDay(nowIso ?? undefined);
  if (!day || !nowDay) return `${formatDayLabel(iso)} ~${clock}`;

  const minute = extractLocalMinuteOfDay(iso);
  const clockWithApprox = `~${clock}`;
  if (day === nowDay) {
    if (minute != null && minute < 12 * 60) return `this morning (${clockWithApprox})`;
    if (minute != null && minute >= 18 * 60) return `tonight ${clockWithApprox}`;
    return `today ${clockWithApprox}`;
  }

  if (compareLocalDays(day, nowDay) === 1) return `tomorrow ${clockWithApprox}`;
  return `${formatShortDayLabel(iso)} ${clockWithApprox}`;
}

function getDaylightTideRange(events: Array<{ t: string; heightM?: number }>, daylight: DaylightWindow) {
  const rows = events
    .filter((event) => isWithinWindow(event.t, daylight) && typeof event.heightM === 'number')
    .sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  if (rows.length < 2) return null;

  let min = rows[0];
  let max = rows[0];
  for (const row of rows) {
    if ((row.heightM ?? 0) < (min.heightM ?? 0)) min = row;
    if ((row.heightM ?? 0) > (max.heightM ?? 0)) max = row;
  }

  const sorted = [min, max].sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  return {
    rangeM: Math.abs((max.heightM ?? 0) - (min.heightM ?? 0)),
    start: sorted[0].t,
    peak: max.t,
    end: sorted[1].t
  };
}

function getTodayDaylightForecast(forecast: ForecastAlertHour[], daylight?: DaylightWindow) {
  const rows = (forecast || []);
  const day = extractLocalDay(daylight?.start) ?? extractLocalDay(rows[0]?.t);
  return rows
    .filter((hour) => !day || extractLocalDay(hour.t) === day)
    .filter((hour) => !daylight || isWithinWindow(hour.t, daylight));
}

function isWithinWindow(iso: string, window: DaylightWindow) {
  if (extractLocalDay(iso) !== extractLocalDay(window.start)) return false;
  const minute = extractLocalMinuteOfDay(iso);
  const start = extractLocalMinuteOfDay(window.start);
  const end = extractLocalMinuteOfDay(window.end);
  if (minute == null || start == null || end == null) return false;
  return minute >= start && minute <= end;
}

function addLocalHours(iso: string, hours: number) {
  const day = extractLocalDay(iso);
  const minute = extractLocalMinuteOfDay(iso);
  if (!day || minute == null) return iso;
  return `${day}T${formatLocalMinuteOfDay24(minute + hours * 60)}`;
}

function compareLocalIso(a?: string | null, b?: string | null) {
  const aDay = extractLocalDay(a ?? undefined);
  const bDay = extractLocalDay(b ?? undefined);
  const aMinute = extractLocalMinuteOfDay(a ?? undefined);
  const bMinute = extractLocalMinuteOfDay(b ?? undefined);
  if (!aDay || !bDay || aMinute == null || bMinute == null) return 0;
  if (aDay < bDay) return -1;
  if (aDay > bDay) return 1;
  return aMinute - bMinute;
}

function formatLocalMinuteOfDay24(totalMinutes: number) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'warning';
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

function formatLaunchWindowTime(totalMinutes: number, showPeriod: boolean) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hhRaw = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  const period = hhRaw >= 12 ? 'PM' : 'AM';
  let hh = hhRaw % 12;
  if (hh === 0) hh = 12;
  const minuteText = mm === 0 ? '' : `:${String(mm).padStart(2, '0')}`;
  return `${hh}${minuteText}${showPeriod ? ` ${period}` : ''}`;
}

function formatLaunchWindowRange(startMinute: number) {
  const endMinute = startMinute + 180;
  const startPeriod = (((startMinute % 1440) + 1440) % 1440) >= 720 ? 'PM' : 'AM';
  const endPeriod = (((endMinute % 1440) + 1440) % 1440) >= 720 ? 'PM' : 'AM';
  return `${formatLaunchWindowTime(startMinute, startPeriod !== endPeriod)}-${formatLaunchWindowTime(endMinute, true)}`;
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

function formatDayLabel(iso?: string) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (m) {
    const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      weekday: 'short'
    }).format(dt);
  }
  if (!iso) return 'Today';
  return formatAsOfWithDay(iso).split(' ')[0] ?? 'Today';
}

function formatShortDayLabel(iso?: string) {
  return formatDayLabel(iso);
}

function compareLocalDays(a: string, b: string) {
  const left = Date.parse(`${a}T00:00:00Z`);
  const right = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  return Math.round((left - right) / 86_400_000);
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

function parsePlannerScore(value?: string) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function parsePlannerDayIndex(value?: string) {
  const index = Number(value);
  if (!Number.isInteger(index)) return 0;
  return Math.max(0, Math.min(4, index));
}
