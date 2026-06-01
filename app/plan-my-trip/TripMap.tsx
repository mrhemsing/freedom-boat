'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MARINA_ACCESS_INFO,
  PUBLIC_LAUNCHES,
  type BoatLaunch,
  type Marina
} from '../../lib/marinas';
import { snapMarinaList } from '../../lib/marina-snap';
import { buildWeeklyOutlook, type DailyOutlook } from '../../lib/outlook';
import { seoSlugForLaunch, seoSlugForMarina } from '../../lib/seo-slugs';

type TripMapProps = {
  marinas: Marina[];
};

type SheetState = 'collapsed' | 'half' | 'full';
type PlannerOutlooks = Record<string, DailyOutlook[]>;
type VesselKey = 'kayak' | 'small' | 'cruiser' | 'large' | 'sail';
type VesselProfile = {
  label: string;
  windK: number;
  gustK: number;
  waveK: number;
  wind: [number, number];
  gust: [number, number];
  wave: [number, number];
};

const HOME = { lat: 49.2845, lon: -123.1116 };
const DAYS = ['Today', 'Mon', 'Tue', 'Wed', 'Thu'];
const DEFAULT_SPEED_KT = 18;
const VESSELS: Record<VesselKey, VesselProfile> = {
  kayak: { label: 'Kayak / SUP', windK: 5, gustK: 2, waveK: 55, wind: [10, 15], gust: [13, 19], wave: [0.3, 0.6] },
  small: { label: 'Small open boat', windK: 3.4, gustK: 1.5, waveK: 34, wind: [14, 20], gust: [18, 26], wave: [0.5, 0.9] },
  cruiser: { label: 'Runabout / cruiser', windK: 2.4, gustK: 1.1, waveK: 22, wind: [18, 25], gust: [24, 32], wave: [0.8, 1.4] },
  large: { label: 'Cruiser 10 m+', windK: 1.7, gustK: 0.8, waveK: 15, wind: [22, 30], gust: [28, 38], wave: [1.2, 2] },
  sail: { label: 'Sailboat', windK: 1.4, gustK: 0.7, waveK: 18, wind: [25, 33], gust: [30, 40], wave: [1.2, 2.2] }
};
const TIDE_STATION_HINTS = [
  { name: 'Vancouver', lat: 49.288, lon: -123.115 },
  { name: 'Point Atkinson', lat: 49.33, lon: -123.25 },
  { name: 'Squamish', lat: 49.69, lon: -123.16 },
  { name: 'Nanaimo', lat: 49.17, lon: -123.94 },
  { name: 'Sidney', lat: 48.65, lon: -123.4 },
  { name: 'Ganges Harbour', lat: 48.85, lon: -123.5 }
];

/* LIVE DATA
   Set USE_OSM to true on freedom.b-average.com to replace the curated
   marina and launch lists with OpenStreetMap data at runtime.

   Overpass query:
   [out:json][timeout:30];
   ( nwr["leisure"="marina"](48.35,-124.45,49.95,-122.30);
     nwr["leisure"="slipway"](48.35,-124.45,49.95,-122.30); );
   out center tags;

   BBOX order is S,W,N,E. The parser skips access=private and members-only
   style club names, pulls fee/fuel tags when present, sorts nearest-first,
   and falls back to the curated data on any failure.
*/
const USE_OSM = false;
const OVERPASS_URL = '/api/overpass';
const OVERPASS_QUERY = `[out:json][timeout:30];
( nwr["leisure"="marina"](48.35,-124.45,49.95,-122.30);
  nwr["leisure"="slipway"](48.35,-124.45,49.95,-122.30); );
out center tags;`;

/* CHS / DFO IWLS TIDES
   Uses the same-origin /api/iwls proxy so production can fetch IWLS
   predictions without depending on browser CORS support. If the proxy or
   upstream API fails, the synthetic mixed-semidiurnal model stays in place.
*/
const USE_CHS = true;
const IWLS_BASE = '/api/iwls';
const CHS_REGION = 'PAC';
const MAX_CHS_STATION_KM = 60;

export default function TripMap({ marinas }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRefs = useRef<Record<number, any>>({});
  const launchMarkerRefs = useRef<Record<number, any>>({});
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedLaunchId, setSelectedLaunchId] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>('half');
  const [tripMode, setTripMode] = useState(false);
  const [showLaunches, setShowLaunches] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [vesselKey, setVesselKey] = useState<VesselKey>('cruiser');
  const [tripStops, setTripStops] = useState<number[]>([]);
  const [departAt, setDepartAt] = useState(() => defaultDepartInput());
  const [speedKt, setSpeedKt] = useState(DEFAULT_SPEED_KT);
  const [shareText, setShareText] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [activeMarinas, setActiveMarinas] = useState(() => snapMarinaList(marinas));
  const [launches, setLaunches] = useState(PUBLIC_LAUNCHES);
  const [liveTides, setLiveTides] = useState<Record<number, LiveTide>>({});
  const [weeklyOutlooks, setWeeklyOutlooks] = useState<PlannerOutlooks>({});
  const restoredPlanRef = useRef(false);
  const vessel = VESSELS[vesselKey];
  const tripMarinas = tripStops
    .map((id) => activeMarinas.find((marina) => marina.id === id))
    .filter(Boolean) as Marina[];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (showLaunches) {
      if (!q) return launches;
      return launches.filter((launch) =>
        `${launch.name} ${launch.area} ${launch.type}`.toLowerCase().includes(q)
      );
    }
    if (!q) return activeMarinas;
    return activeMarinas.filter((marina) =>
      `${marina.name} ${marina.address} ${marina.area}`.toLowerCase().includes(q)
    );
  }, [activeMarinas, launches, query, showLaunches]);

  const selected = selectedId ? activeMarinas.find((marina) => marina.id === selectedId) ?? null : null;
  const selectedLaunch = selectedLaunchId ? launches.find((launch) => launch.id === selectedLaunchId) ?? null : null;

  useEffect(() => {
    setActiveMarinas(snapMarinaList(marinas));
  }, [marinas]);

  useEffect(() => {
    const locationIds = [...new Set(activeMarinas.map((marina) => marina.locationId).filter(Boolean))] as string[];
    if (!locationIds.length) {
      setWeeklyOutlooks({});
      return;
    }

    let cancelled = false;
    Promise.all(locationIds.map(async (locationId) => {
      const res = await fetch(`/api/${locationId}/forecast?hours=120`);
      if (!res.ok) throw new Error(`forecast ${locationId}`);
      const data = await res.json();
      return [
        locationId,
        buildWeeklyOutlook(data?.forecast ?? [], data?.sunByDay ?? [], 5)
      ] as const;
    }))
      .then((entries) => {
        if (!cancelled) setWeeklyOutlooks(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) setWeeklyOutlooks({});
      });

    return () => {
      cancelled = true;
    };
  }, [activeMarinas]);

  useEffect(() => {
    const available = new Set(activeMarinas.map((marina) => marina.id));
    setTripStops((stops) => stops.filter((id) => available.has(id)));
  }, [activeMarinas]);

  useEffect(() => {
    if (restoredPlanRef.current || !activeMarinas.length) return;
    restoredPlanRef.current = true;
    const restored = restoreFloatPlanFromHash(activeMarinas);
    if (!restored) return;
    setVesselKey(restored.vesselKey);
    setDepartAt(restored.departAt);
    setSpeedKt(restored.speedKt);
    setTripStops(restored.stops);
    if (restored.stops.length) {
      setTripMode(true);
      setSheetState('full');
    }
  }, [activeMarinas]);

  useEffect(() => {
    if (!restoredPlanRef.current) return;
    writeFloatPlanHash({
      vesselKey,
      departAt,
      speedKt,
      stops: tripStops
    });
  }, [departAt, speedKt, tripStops, vesselKey]);

  useEffect(() => {
    if (!USE_OSM) return;
    let cancelled = false;
    loadOsmPlaces()
      .then((result) => {
        if (cancelled || !result) return;
        setActiveMarinas(result.marinas);
        setLaunches(result.launches);
      })
      .catch(() => {
        // Keep curated lists on any live-data failure.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!USE_CHS) return;
    let cancelled = false;
    loadCHSTides(activeMarinas)
      .then((tides) => {
        if (!cancelled) setLiveTides(tides);
      })
      .catch(() => {
        // Keep the synthetic tide model on any IWLS/CORS/schema failure.
      });
    return () => {
      cancelled = true;
    };
  }, [activeMarinas]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function mountMap() {
      const L = await import('leaflet');
      if (disposed || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        attributionControl: true,
        scrollWheelZoom: window.matchMedia('(min-width: 900px)').matches,
        zoomControl: false,
        dragging: true,
        doubleClickZoom: true,
        touchZoom: true
      }).setView([49.05, -123.25], 9);
      leafletMapRef.current = map;

      L.control.zoom({ position: 'topright' }).addTo(map);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', {
        maxZoom: 20,
        subdomains: 'abcd',
        crossOrigin: true,
        attribution: '&copy; CARTO &copy; OpenStreetMap'
      }).addTo(map);

      L.marker([HOME.lat, HOME.lon], {
        icon: L.divIcon({
          className: '',
          html: '<div class="tripMe"><div class="tripMeRing"></div><div class="tripMeCore"></div></div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        }),
        zIndexOffset: 700
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      activeMarinas.forEach((marina) => {
        bounds.extend([marina.lat, marina.lon]);
        const marker = L.marker([marina.lat, marina.lon], {
          icon: marinaIcon(L, marina, selectedId, tripStops.includes(marina.id), dayIndex, vessel, weeklyOutlooks),
          zIndexOffset: marina.freedomClub ? 600 : 0
        }).addTo(map);
        marker.on('click', () => {
          setSelectedId(marina.id);
          setSheetState('full');
        });
        markerRefs.current[marina.id] = marker;
      });

      if (showLaunches) {
        launches.forEach((launch) => {
          bounds.extend([launch.lat, launch.lon]);
          const marker = L.marker([launch.lat, launch.lon], {
            icon: launchIcon(L, launch),
            zIndexOffset: 500
          }).addTo(map);
          marker.on('click', () => {
            setSelectedId(null);
            setSelectedLaunchId(launch.id);
            setSheetState('full');
          });
          launchMarkerRefs.current[launch.id] = marker;
        });
      }

      map.fitBounds(bounds.pad(0.18), { maxZoom: 10 });

      setTimeout(() => {
        map.invalidateSize();
      }, 0);

      cleanup = () => {
        markerRefs.current = {};
        launchMarkerRefs.current = {};
        leafletMapRef.current = null;
        map.remove();
      };
    }

    mountMap();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [activeMarinas, launches, showLaunches, weeklyOutlooks]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      leafletMapRef.current?.invalidateSize?.();
    }, 260);
    return () => window.clearTimeout(timer);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsFullscreen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    let active = true;
    import('leaflet').then((L) => {
      if (!active) return;
      activeMarinas.forEach((marina) => {
        const marker = markerRefs.current[marina.id];
        if (marker) {
          marker.setIcon(marinaIcon(L, marina, selectedId, tripStops.includes(marina.id), dayIndex, vessel, weeklyOutlooks));
          marker.setZIndexOffset(selectedId === marina.id || tripStops.includes(marina.id) || marina.freedomClub ? 700 : 0);
        }
      });
    });
    return () => {
      active = false;
    };
  }, [activeMarinas, selectedId, tripStops, dayIndex, vessel, weeklyOutlooks]);

  function openMarina(marina: Marina) {
    setSelectedId(marina.id);
    setSelectedLaunchId(null);
    setSheetState('full');
    markerRefs.current[marina.id]?.openPopup?.();
  }

  function openLaunch(launch: BoatLaunch) {
    setSelectedLaunchId(launch.id);
    setSelectedId(null);
    setSheetState('full');
  }

  function toggleTripStop(marinaId: number) {
    setTripStops((stops) => (
      stops.includes(marinaId)
        ? stops.filter((id) => id !== marinaId)
        : [...stops, marinaId]
    ));
    setTripMode(true);
    setShareText('');
    setShareMessage('');
  }

  async function shareFloatPlan() {
    const text = buildFloatPlanText(tripMarinas, vessel, departAt, speedKt, dayIndex, weeklyOutlooks);
    const url = typeof window === 'undefined' ? '' : window.location.href;
    setShareText('');
    setShareMessage('');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FAIRTIDE float plan', text, url });
        setShareMessage('Share sheet opened.');
        return;
      }
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      setShareMessage('Float plan copied to clipboard.');
    } catch {
      setShareText(`${text}\n\n${url}`);
      setShareMessage('Copy the float plan below.');
    }
  }

  function timebarScore(index: number) {
    return selected
      ? marinaScore(selected, index, vessel, weeklyOutlooks)
      : averageScore(activeMarinas, index, vessel, weeklyOutlooks);
  }

  return (
    <div className={`plannerWrap ${isFullscreen ? 'plannerWrapFullscreen' : ''}`}>
      <div className="plannerTimebar" aria-label="Trip date">
        {DAYS.map((label, index) => {
          const score = timebarScore(index);
          return (
            <button
              key={label}
              type="button"
              className={`plannerDay ${dayIndex === index ? 'active' : ''}`}
              onClick={() => setDayIndex(index)}
            >
              <span>{label}</span>
              <b>{dayNumber(index)}</b>
              <em style={{ color: scoreColor(score) }}>{score}</em>
            </button>
          );
        })}
      </div>

      <div className={`plannerApp ${isFullscreen ? 'plannerAppFullscreen' : ''}`}>
        <div ref={mapRef} className="plannerMap" aria-label="Vancouver and Gulf Islands marina map" />

        <div className="plannerTopbar">
        <button
          className={`plannerChip ${showLaunches ? 'active' : ''}`}
          type="button"
          onClick={() => {
            setShowLaunches((value) => !value);
            setSelectedId(null);
            setSelectedLaunchId(null);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="5" r="2" />
            <line x1="12" y1="7" x2="12" y2="22" />
            <path d="M5 12a7 7 0 0 0 14 0" />
          </svg>
          <span>Launches</span>
        </button>
        <button
          className={`plannerChip ${tripMode ? 'active' : ''}`}
          type="button"
          onClick={() => {
            setTripMode((value) => !value);
            setSelectedId(null);
            setSelectedLaunchId(null);
            setSheetState('full');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          <span>Plan a trip</span>
        </button>
        <button
          className={`plannerChip plannerFullscreenChip ${isFullscreen ? 'active' : ''}`}
          type="button"
          aria-pressed={isFullscreen}
          onClick={() => setIsFullscreen((value) => !value)}
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <polyline points="8 3 8 8 3 8" />
              <polyline points="16 3 16 8 21 8" />
              <polyline points="8 21 8 16 3 16" />
              <polyline points="16 21 16 16 21 16" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <polyline points="8 3 3 3 3 8" />
              <polyline points="16 3 21 3 21 8" />
              <polyline points="8 21 3 21 3 16" />
              <polyline points="16 21 21 21 21 16" />
            </svg>
          )}
          <span>{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
        </button>
      </div>

      <section
        className={`plannerSheet plannerSheet-${sheetState} ${selected || selectedLaunch ? 'plannerSheet-detail' : ''}`}
        aria-label="Marina results"
      >
        <button
          type="button"
          className="plannerGrab"
          aria-label="Toggle marina sheet"
          onClick={() => setSheetState(nextSheetState(sheetState))}
        >
          <span />
        </button>

        <div className="plannerSheetInner">
          {selected ? (
            <MarinaDetail
              marina={selected}
              dayIndex={dayIndex}
              vessel={vessel}
              weeklyOutlooks={weeklyOutlooks}
              liveTide={liveTides[selected.id]}
              inTrip={tripStops.includes(selected.id)}
              onToggleTrip={() => toggleTripStop(selected.id)}
              onBack={() => setSelectedId(null)}
            />
          ) : selectedLaunch ? (
            <LaunchDetail launch={selectedLaunch} dayIndex={dayIndex} onBack={() => setSelectedLaunchId(null)} />
          ) : tripMode ? (
            <TripPlanView
              marinas={tripMarinas}
              vessel={vessel}
              vesselKey={vesselKey}
              departAt={departAt}
              speedKt={speedKt}
              dayIndex={dayIndex}
              weeklyOutlooks={weeklyOutlooks}
              shareText={shareText}
              shareMessage={shareMessage}
              onBack={() => setTripMode(false)}
              onBrowse={() => {
                setTripMode(false);
                setSheetState('half');
              }}
              onDepartChange={setDepartAt}
              onSpeedChange={setSpeedKt}
              onRemoveStop={toggleTripStop}
              onShare={shareFloatPlan}
            />
          ) : (
            <>
              <div className="plannerSearchRow">
                <label className="plannerSearch">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={showLaunches ? 'Launches' : 'Marinas'}
                    autoComplete="off"
                  />
                  {query ? (
                    <button type="button" onClick={() => setQuery('')}>
                      Clear
                    </button>
                  ) : null}
                </label>
                <button
                  className="plannerCollapse"
                  type="button"
                  aria-label="Collapse"
                  onClick={() => setSheetState('collapsed')}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <line x1="6" y1="9" x2="12" y2="15" />
                    <line x1="18" y1="9" x2="12" y2="15" />
                  </svg>
                </button>
              </div>

              {!showLaunches ? (
                <label className="plannerVesselRow">
                  <span>Boat profile</span>
                  <select
                    value={vesselKey}
                    onChange={(event) => setVesselKey(event.target.value as VesselKey)}
                    className="plannerVesselSelect"
                  >
                    {(Object.keys(VESSELS) as VesselKey[]).map((key) => (
                      <option key={key} value={key}>{VESSELS[key].label}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="plannerResultsHead">{query ? `Results - ${filtered.length}` : showLaunches ? 'Public launches' : 'Results'}</div>

              <div className="plannerRows">
                {showLaunches ? (filtered as BoatLaunch[]).map((launch) => (
                  <button
                    key={launch.id}
                    type="button"
                    className="plannerRow"
                    onClick={() => openLaunch(launch)}
                  >
                    <span className="plannerIdx plannerLaunchIdx">{launch.id}</span>
                    <span className="plannerBody">
                      <span className="plannerName">{launch.name}</span>
                      <span className="plannerAddr">{launch.area}</span>
                    </span>
                    <span className="plannerRight">
                      <b>{distanceFromHome(launch).toFixed(1)} nm</b>
                      <span>{launch.type}</span>
                    </span>
                  </button>
                )) : (filtered as Marina[]).map((marina) => {
                  const score = marinaScore(marina, dayIndex, vessel, weeklyOutlooks);
                  return (
                    <button
                      key={marina.id}
                      type="button"
                      className={`plannerRow ${marina.freedomClub ? 'plannerRowFreedom' : ''}`}
                      onClick={() => openMarina(marina)}
                    >
                      <span className={`plannerIdx ${marina.freedomClub ? 'plannerIdxFreedom' : ''}`}>
                        {marina.id}
                        <i style={{ background: scoreColor(score) }} />
                      </span>
                      <span className="plannerBody">
                        <span className="plannerName">
                          {marina.name}
                          {marina.freedomClub ? <em>Freedom Club Boat</em> : null}
                        </span>
                        <span className="plannerAddr">{marina.address}</span>
                      </span>
                      <span className="plannerRight">
                        <b>{distanceFromHome(marina).toFixed(1)} nm</b>
                        <span>{windFor(marina, dayIndex, weeklyOutlooks)} kt - {verdict(score)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

function MarinaDetail({
  marina,
  dayIndex,
  vessel,
  weeklyOutlooks,
  liveTide,
  inTrip,
  onToggleTrip,
  onBack
}: {
  marina: Marina;
  dayIndex: number;
  vessel: VesselProfile;
  weeklyOutlooks: PlannerOutlooks;
  liveTide?: LiveTide;
  inTrip: boolean;
  onToggleTrip: () => void;
  onBack: () => void;
}) {
  const score = marinaScore(marina, dayIndex, vessel, weeklyOutlooks);
  const conditions = conditionsFor(marina, dayIndex, weeklyOutlooks);
  const warning = vesselWarning(conditions, vessel);
  const info = accessInfoFor(marina);
  const tide = marina.waterType === 'lake' || marina.waterType === 'river'
    ? null
    : tideState(marina, plannerTimeForDay(dayIndex), liveTide);

  return (
    <div className="plannerDetail">
      <button className="plannerBack" type="button" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All marinas
      </button>
      <h1>{marina.name}</h1>
      <p>{marina.address} - {distanceFromHome(marina).toFixed(1)} nm</p>

      {info ? (
        <div className="plannerTags">
          <span className={`plannerTag ${info.access === 'Public' ? 'pub' : ''}`}>{info.access}</span>
          <span className="plannerTag">Transient: {transientLabel(info.transient)}</span>
          <span className="plannerTag">Fuel: {info.fuel}</span>
          <span className="plannerTag">Launch: {info.launch}</span>
          <span className="plannerTag">{info.moorage}</span>
          <span className="plannerTag verify">{info.verified ? 'verified' : 'verify before publish'}</span>
        </div>
      ) : null}

      <div className="plannerScoreHero">
        <div className="plannerScoreRing" style={{ background: scoreColor(score) }}>{score}</div>
        <div>
          <span>Trip score</span>
          <strong>{verdict(score)}</strong>
          <small>{vessel.label}</small>
        </div>
      </div>

      {warning ? <div className={`plannerWarning ${warning.level}`}>{warning.text}</div> : null}

      <div className="plannerMetrics">
        <div>
          <span>Wind</span>
          <strong>{conditions.wind} <small>kt</small></strong>
        </div>
        <div>
          <span>Gust</span>
          <strong>{conditions.gust} <small>kt</small></strong>
        </div>
        <div>
          <span>Wave</span>
          <strong>{conditions.wave.toFixed(1)} <small>m</small></strong>
        </div>
        <div>
          <span>Area</span>
          <strong>{marina.area}</strong>
        </div>
      </div>

      {tide ? <TideCard tide={tide} /> : <NonTidalWaterCard marina={marina} />}

      <button className={`plannerPrimary plannerTripAdd ${inTrip ? 'remove' : ''}`} type="button" onClick={onToggleTrip}>
        {inTrip ? 'Remove from float plan' : 'Add to float plan'}
      </button>

      <a
        className="plannerPrimary"
        href={`/marina/${seoSlugForMarina(marina)}`}
      >
        Open conditions
      </a>
      <button className="plannerPrimary plannerCloseBottom" type="button" onClick={onBack}>
        Close panel
      </button>
    </div>
  );
}

function NonTidalWaterCard({ marina }: { marina: Marina }) {
  return (
    <div className="plannerTide">
      <div className="plannerTideHead">
        <span>{marina.waterType === 'river' ? 'River' : 'Lake'}</span>
        <small>{marina.area}</small>
      </div>
      <div className="plannerTideNow">
        <strong>Weather first</strong>
        <span>No tide cycle</span>
      </div>
      <p className="plannerTinyText">
        Use the wind, gust, and local forecast score for this inland Freedom Club location.
      </p>
    </div>
  );
}

function TideCard({ tide }: { tide: TideState }) {
  return (
    <div className="plannerTide">
      <div className="plannerTideHead">
        <span>Tide</span>
        <small>{tide.station}</small>
      </div>
      <div className="plannerTideNow">
        <strong>{tide.height.toFixed(1)} m</strong>
        <span>{tide.rising ? 'rising' : 'falling'}</span>
      </div>
      <TideSparkline points={tide.points} nowIndex={tide.nowIndex} />
      <div className="plannerTideEvents">
        <div>
          <span>Next high</span>
          <strong>{formatShortTime(tide.nextHigh.t)} - {tide.nextHigh.height.toFixed(1)}m</strong>
        </div>
        <div>
          <span>Next low</span>
          <strong>{formatShortTime(tide.nextLow.t)} - {tide.nextLow.height.toFixed(1)}m</strong>
        </div>
        <div>
          <span>Slack</span>
          <strong>{formatShortTime(tide.slack.t)}</strong>
        </div>
      </div>
    </div>
  );
}

function TideSparkline({ points, nowIndex }: { points: TidePoint[]; nowIndex: number }) {
  const width = 320;
  const height = 58;
  const pad = 5;
  const min = Math.min(...points.map((point) => point.height));
  const max = Math.max(...points.map((point) => point.height));
  const range = max - min || 1;
  const xFor = (index: number) => pad + (index / (points.length - 1)) * (width - pad * 2);
  const yFor = (value: number) => (height - pad) - ((value - min) / range) * (height - pad * 2);
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${xFor(index).toFixed(1)},${yFor(point.height).toFixed(1)}`)
    .join(' ');
  const area = `${path} L${xFor(points.length - 1).toFixed(1)},${height} L${pad},${height} Z`;
  const now = points[nowIndex] ?? points[0];
  const cx = xFor(nowIndex);
  const cy = yFor(now.height);

  return (
    <svg className="plannerTideSpark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <path d={area} className="plannerTideArea" />
      <path d={path} className="plannerTideLine" />
      <circle cx={cx} cy={cy} r="3.6" className="plannerTideDot" />
    </svg>
  );
}

function LaunchDetail({ launch, dayIndex, onBack }: { launch: BoatLaunch; dayIndex: number; onBack: () => void }) {
  const status = launchDepthStatus(launch, plannerTimeForDay(dayIndex));
  return (
    <div className="plannerDetail">
      <button className="plannerBack" type="button" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All launches
      </button>
      <h1>{launch.name}</h1>
      <p>{launch.area} - {distanceFromHome(launch).toFixed(1)} nm</p>
      <div className="plannerTags">
        <span className="plannerTag pub">Public launch</span>
        <span className="plannerTag">{launch.type}</span>
        <span className="plannerTag">Usable tide: {launchMinTide(launch).toFixed(1)}m+</span>
        {launch.access ? <span className="plannerTag">Access: {launch.access}</span> : null}
        {launch.fee ? <span className="plannerTag">Fee: {launch.fee}</span> : null}
      </div>
      <div className={`plannerLaunchStatus ${status.ok ? 'ok' : 'warn'}`}>
        <strong>{status.ok ? 'Launchable now' : 'Too shallow'}</strong>
        <span>{status.message}</span>
      </div>
      <a
        className="plannerPrimary"
        href={`/launch/${seoSlugForLaunch(launch)}`}
      >
        Open launch conditions
      </a>
      <button className="plannerPrimary plannerCloseBottom" type="button" onClick={onBack}>
        Close panel
      </button>
    </div>
  );
}

function TripPlanView({
  marinas,
  vessel,
  vesselKey,
  departAt,
  speedKt,
  dayIndex,
  weeklyOutlooks,
  shareText,
  shareMessage,
  onBack,
  onBrowse,
  onDepartChange,
  onSpeedChange,
  onRemoveStop,
  onShare
}: {
  marinas: Marina[];
  vessel: VesselProfile;
  vesselKey: VesselKey;
  departAt: string;
  speedKt: number;
  dayIndex: number;
  weeklyOutlooks: PlannerOutlooks;
  shareText: string;
  shareMessage: string;
  onBack: () => void;
  onBrowse: () => void;
  onDepartChange: (value: string) => void;
  onSpeedChange: (value: number) => void;
  onRemoveStop: (id: number) => void;
  onShare: () => void;
}) {
  const legs = buildTripLegs(marinas, departAt, speedKt, dayIndex, vessel, weeklyOutlooks);
  const summary = tripSummary(legs);

  return (
    <div className="plannerDetail plannerTripView">
      <button className="plannerBack" type="button" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to marinas
      </button>
      <h1>Float plan</h1>
      <p>{VESSELS[vesselKey].label} - {marinas.length ? `${marinas.length} stops` : 'Add stops from the map or list'}</p>

      <div className="plannerTripControls">
        <label>
          <span>Depart</span>
          <input type="datetime-local" value={departAt} onChange={(event) => onDepartChange(event.target.value)} />
        </label>
        <label>
          <span>Speed</span>
          <input
            type="number"
            min="4"
            max="45"
            step="1"
            value={speedKt}
            onChange={(event) => onSpeedChange(Number(event.target.value) || DEFAULT_SPEED_KT)}
          />
        </label>
      </div>

      {marinas.length ? (
        <>
          <div className="plannerVerdictBar" style={{ background: scoreColor(summary.score) }}>
            {verdict(summary.score)} for {vessel.label.toLowerCase()}
          </div>
          <div className="plannerTripLegs">
            {legs.map((leg, index) => {
              const warning = vesselWarning(leg.conditions, vessel);
              return (
                <div className="plannerLeg" key={leg.marina.id}>
                  <span className="plannerLegNode">{index + 1}</span>
                  <div>
                    <strong>{leg.marina.name}</strong>
                    <span>{formatShortTime(leg.arrive)} - {leg.distance.toFixed(1)} nm - {leg.conditions.wind} kt / {leg.conditions.wave.toFixed(1)}m</span>
                    {warning ? <em className={`plannerWarning ${warning.level}`}>{warning.text}</em> : null}
                    <button type="button" onClick={() => onRemoveStop(leg.marina.id)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="plannerPrimary" type="button" onClick={onShare}>Share float plan</button>
          {shareMessage ? <div className="plannerShareMessage">{shareMessage}</div> : null}
          {shareText ? <textarea className="plannerShareText" readOnly value={shareText} /> : null}
        </>
      ) : (
        <div className="plannerTripEmpty">
          <p>Tap marinas on the map, then add them to the float plan from the detail card.</p>
          <button className="plannerPrimary" type="button" onClick={onBrowse}>Browse marinas</button>
        </div>
      )}
    </div>
  );
}

function marinaIcon(L: any, marina: Marina, selectedId: number | null, inTrip: boolean, dayIndex: number, vessel: VesselProfile, weeklyOutlooks: PlannerOutlooks = {}) {
  const score = marinaScore(marina, dayIndex, vessel, weeklyOutlooks);
  const cls = `${marina.freedomClub ? 'freedom' : ''} ${selectedId === marina.id ? 'sel' : ''} ${inTrip ? 'trip' : ''}`;
  return L.divIcon({
    className: '',
    html: `<div class="plannerPin ${cls}"><span class="plannerPinScore" style="background:${scoreColor(score)}"></span><span class="plannerPinBubble">${marina.id}</span><span class="plannerPinTail"></span></div>`,
    iconSize: [40, 46],
    iconAnchor: [20, 44],
    popupAnchor: [0, -44]
  });
}

function launchIcon(L: any, launch: BoatLaunch) {
  return L.divIcon({
    className: '',
    html: `<div class="plannerLaunchPin" title="${escapeHtml(launch.name)}"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="22"/><path d="M5 12a7 7 0 0 0 14 0"/></svg></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

function dayNumber(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getDate();
}

function nextSheetState(state: SheetState): SheetState {
  if (state === 'full') return 'half';
  if (state === 'half') return 'collapsed';
  return 'full';
}

function marinaScore(marina: Marina, dayIndex: number, vessel: VesselProfile, weeklyOutlooks: PlannerOutlooks = {}) {
  const outlook = outlookFor(marina, dayIndex, weeklyOutlooks);
  if (outlook) return outlook.score;

  const conditions = conditionsFor(marina, dayIndex, weeklyOutlooks);
  const exposure = marina.freedomClub ? 0.7 : 1;
  const score = 100
    - conditions.wind * vessel.windK
    - Math.max(0, conditions.gust - conditions.wind) * vessel.gustK
    - conditions.wave * vessel.waveK
    - exposure * 4
    - (marina.id % 5) * 2;
  return Math.max(24, Math.min(98, Math.round(score)));
}

function averageScore(marinas: Marina[], dayIndex: number, vessel: VesselProfile, weeklyOutlooks: PlannerOutlooks = {}) {
  return Math.round(marinas.reduce((sum, marina) => sum + marinaScore(marina, dayIndex, vessel, weeklyOutlooks), 0) / marinas.length);
}

function windFor(marina: Marina, dayIndex: number, weeklyOutlooks: PlannerOutlooks = {}) {
  const outlook = outlookFor(marina, dayIndex, weeklyOutlooks);
  if (outlook) return outlook.maxWind;

  return 5 + ((marina.id * 7 + dayIndex * 3) % 12);
}

function conditionsFor(marina: Marina, dayIndex: number, weeklyOutlooks: PlannerOutlooks = {}) {
  const outlook = outlookFor(marina, dayIndex, weeklyOutlooks);
  const wind = outlook?.maxWind ?? windFor(marina, dayIndex, weeklyOutlooks);
  const gust = outlook?.maxGust ?? wind + 5 + (marina.id % 4);
  const exposure = marina.freedomClub ? 0.2 : (marina.exp ?? 0.45);
  const wave = Math.max(0.2, (wind - 5) * 0.05 + exposure * 0.35);
  return { wind, gust, wave };
}

function outlookFor(marina: Marina, dayIndex: number, weeklyOutlooks: PlannerOutlooks) {
  if (!marina.locationId) return null;
  return weeklyOutlooks[marina.locationId]?.[dayIndex] ?? null;
}

function vesselWarning(conditions: ReturnType<typeof conditionsFor>, vessel: VesselProfile) {
  const label = vessel.label.toLowerCase();
  if (conditions.wind >= vessel.wind[1] || conditions.gust >= vessel.gust[1] || conditions.wave >= vessel.wave[1]) {
    return { level: 'poor' as const, text: `Rough for ${label}` };
  }
  if (conditions.wind >= vessel.wind[0] || conditions.gust >= vessel.gust[0] || conditions.wave >= vessel.wave[0]) {
    return { level: 'fair' as const, text: `Use caution for ${label}` };
  }
  return null;
}

function scoreColor(score: number) {
  if (score >= 75) return '#2fae6b';
  if (score >= 55) return '#e6a13c';
  return '#e0584f';
}

function verdict(score: number) {
  if (score >= 80) return 'Great day';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Marginal';
}

function distanceFromHome(place: { lat: number; lon: number }) {
  const metres = haversine(HOME.lat, HOME.lon, place.lat, place.lon);
  return metres / 1852;
}

function defaultDepartInput() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return toLocalInput(date);
}

function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function restoreFloatPlanFromHash(marinas: Marina[]) {
  if (typeof window === 'undefined' || !window.location.hash.startsWith('#plan=')) return null;
  try {
    const params = new URLSearchParams(window.location.hash.slice(6));
    const vesselParam = params.get('v');
    const vesselKey: VesselKey = vesselParam && vesselParam in VESSELS ? vesselParam as VesselKey : 'cruiser';
    const departAt = params.get('d') || defaultDepartInput();
    const speedKt = Math.max(4, Math.min(45, Number(params.get('s')) || DEFAULT_SPEED_KT));
    const available = new Set(marinas.map((marina) => marina.id));
    const stops = (params.get('stops') || '')
      .split(',')
      .map((value) => Number(value))
      .filter((id) => available.has(id));
    return { vesselKey, departAt, speedKt, stops };
  } catch {
    return null;
  }
}

function writeFloatPlanHash(plan: { vesselKey: VesselKey; departAt: string; speedKt: number; stops: number[] }) {
  if (typeof window === 'undefined') return;
  if (!plan.stops.length) {
    if (window.location.hash.startsWith('#plan=')) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    return;
  }
  const params = new URLSearchParams();
  params.set('v', plan.vesselKey);
  params.set('d', plan.departAt);
  params.set('s', String(plan.speedKt));
  params.set('stops', plan.stops.join(','));
  const next = `${window.location.pathname}${window.location.search}#plan=${params.toString()}`;
  window.history.replaceState(null, '', next);
}

function launchAsMarina(launch: BoatLaunch): Marina {
  return {
    id: 9000 + launch.id,
    osmId: launch.osmId || `launch-${launch.id}`,
    name: launch.name,
    address: launch.area,
    lat: launch.lat,
    lon: launch.lon,
    area: launch.area,
    exp: 0.5
  };
}

function launchMinTide(launch: BoatLaunch) {
  return launch.minTide ?? (launch.type.toLowerCase().includes('hand') ? 0.8 : 1.2);
}

function launchDepthStatus(launch: BoatLaunch, when: Date) {
  const pseudo = launchAsMarina(launch);
  const tide = tideState(pseudo, when);
  const minTide = launchMinTide(launch);
  if (tide.height >= minTide) {
    return {
      ok: true,
      message: `tide ${tide.height.toFixed(1)}m, usable until about ${formatShortTime(tide.nextLow.t)}`
    };
  }
  for (let minutes = 15; minutes <= 18 * 60; minutes += 15) {
    const t = new Date(when.getTime() + minutes * 60 * 1000);
    if (tideHeight(pseudo, t) >= minTide) {
      return {
        ok: false,
        message: `tide ${tide.height.toFixed(1)}m, OK from ${formatShortTime(t)}`
      };
    }
  }
  return {
    ok: false,
    message: `tide ${tide.height.toFixed(1)}m, no launch window in the next 18 hours`
  };
}

type TripLeg = {
  marina: Marina;
  distance: number;
  arrive: Date;
  conditions: ReturnType<typeof conditionsFor>;
  score: number;
};

function buildTripLegs(marinas: Marina[], departAt: string, speedKt: number, dayIndex: number, vessel: VesselProfile, weeklyOutlooks: PlannerOutlooks = {}): TripLeg[] {
  const speed = Math.max(4, speedKt || DEFAULT_SPEED_KT);
  let previous = HOME;
  let cursor = new Date(departAt || defaultDepartInput());
  return marinas.map((marina) => {
    const distance = haversine(previous.lat, previous.lon, marina.lat, marina.lon) / 1852;
    cursor = new Date(cursor.getTime() + (distance / speed) * 3600000);
    previous = marina;
    const conditions = conditionsFor(marina, dayIndex, weeklyOutlooks);
    return {
      marina,
      distance,
      arrive: new Date(cursor),
      conditions,
      score: marinaScore(marina, dayIndex, vessel, weeklyOutlooks)
    };
  });
}

function tripSummary(legs: TripLeg[]) {
  if (!legs.length) return { score: 50, maxWind: 0, maxWave: 0, finish: new Date() };
  return {
    score: Math.round(legs.reduce((sum, leg) => sum + leg.score, 0) / legs.length),
    maxWind: Math.max(...legs.map((leg) => leg.conditions.wind)),
    maxWave: Math.max(...legs.map((leg) => leg.conditions.wave)),
    finish: legs[legs.length - 1].arrive
  };
}

function buildFloatPlanText(marinas: Marina[], vessel: VesselProfile, departAt: string, speedKt: number, dayIndex: number, weeklyOutlooks: PlannerOutlooks = {}) {
  const legs = buildTripLegs(marinas, departAt, speedKt, dayIndex, vessel, weeklyOutlooks);
  const summary = tripSummary(legs);
  const depart = new Date(departAt || defaultDepartInput());
  const lines = [
    'FAIRTIDE float plan',
    `Vessel: ${vessel.label}`,
    `Depart: ${formatShortDateTime(depart)}`,
    `Cruise speed: ${speedKt || DEFAULT_SPEED_KT} kt`,
    ''
  ];
  legs.forEach((leg, index) => {
    lines.push(`${index + 1}. ${leg.marina.name} - arrive ${formatShortTime(leg.arrive)} - ${leg.distance.toFixed(1)} nm - wind ${leg.conditions.wind} kt - seas ${leg.conditions.wave.toFixed(1)}m`);
  });
  lines.push('');
  lines.push(`Max wind/seas: ${summary.maxWind} kt / ${summary.maxWave.toFixed(1)}m`);
  lines.push(`Estimated finish: ${formatShortDateTime(summary.finish)}`);
  lines.push('Leave this plan ashore. JRCC Victoria: 1-800-567-5111.');
  return lines.join('\n');
}

function formatShortDateTime(value: Date) {
  return `${value.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} ${formatShortTime(value)}`;
}

type TidePoint = {
  t: Date;
  height: number;
};

type TideEvent = {
  t: Date;
  height: number;
};

type TideExtreme = TideEvent & {
  kind: 'high' | 'low';
};

type LiveTide = {
  station: string;
  events: TideExtreme[];
  points: TidePoint[];
};

type IwlsStation = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

type TideState = {
  station: string;
  height: number;
  rising: boolean;
  points: TidePoint[];
  nowIndex: number;
  nextHigh: TideEvent;
  nextLow: TideEvent;
  slack: TideEvent;
};

function plannerTimeForDay(dayIndex: number) {
  const now = new Date();
  const selected = new Date(now);
  selected.setDate(now.getDate() + dayIndex);
  if (dayIndex === 0) {
    selected.setMinutes(0, 0, 0);
    return selected;
  }
  selected.setHours(12, 0, 0, 0);
  return selected;
}

function tideState(marina: Marina, when: Date, live?: LiveTide): TideState {
  const sampled = sampleTidePoints(marina, when, live);
  const current = live ? tideHeightFromSeries(live.points, when) ?? tideHeight(marina, when) : tideHeight(marina, when);
  const soonTime = new Date(when.getTime() + 10 * 60 * 1000);
  const soon = live ? tideHeightFromSeries(live.points, soonTime) ?? tideHeight(marina, soonTime) : tideHeight(marina, soonTime);
  const events = live?.events.filter((event) => event.t > when) ?? tideEvents(marina, when);
  const nextHigh = events.find((event) => event.kind === 'high') ?? { kind: 'high' as const, t: when, height: current };
  const nextLow = events.find((event) => event.kind === 'low') ?? { kind: 'low' as const, t: when, height: current };
  const slack = nextHigh.t < nextLow.t ? nextHigh : nextLow;

  return {
    station: live?.station ?? nearestTideStation(marina).name,
    height: current,
    rising: soon >= current,
    points: sampled.points,
    nowIndex: sampled.nowIndex,
    nextHigh,
    nextLow,
    slack
  };
}

function sampleTidePoints(marina: Marina, when: Date, live?: LiveTide) {
  const points: TidePoint[] = [];
  const start = new Date(when.getTime() - 6 * 60 * 60 * 1000);
  const stepMinutes = 20;
  const totalMinutes = 18 * 60;
  let nowIndex = 0;

  for (let minute = 0; minute <= totalMinutes; minute += stepMinutes) {
    const t = new Date(start.getTime() + minute * 60 * 1000);
    points.push({
      t,
      height: live ? tideHeightFromSeries(live.points, t) ?? tideHeight(marina, t) : tideHeight(marina, t)
    });
    if (Math.abs(t.getTime() - when.getTime()) < Math.abs(points[nowIndex].t.getTime() - when.getTime())) {
      nowIndex = points.length - 1;
    }
  }

  return { points, nowIndex };
}

function tideHeightFromSeries(points: TidePoint[], when: Date) {
  if (!points.length) return null;
  const sorted = [...points].sort((a, b) => a.t.getTime() - b.t.getTime());
  if (when < sorted[0].t || when > sorted[sorted.length - 1].t) return null;
  for (let index = 1; index < sorted.length; index += 1) {
    const prev = sorted[index - 1];
    const next = sorted[index];
    if (when <= next.t) {
      const span = next.t.getTime() - prev.t.getTime() || 1;
      const pct = (when.getTime() - prev.t.getTime()) / span;
      return prev.height + (next.height - prev.height) * pct;
    }
  }
  return sorted[sorted.length - 1].height;
}

function tideHeight(marina: Marina, when: Date) {
  const hours = when.getTime() / 3600000;
  const phase = hash(`${marina.osmId || marina.id}:tide`) * Math.PI * 2;
  const exposure = marina.freedomClub ? 0.3 : (marina.exp ?? 0.5);
  return 2.8 + exposure * 0.25
    + 1.35 * Math.cos((2 * Math.PI * hours) / 12.4206 + phase)
    + 0.42 * Math.cos((2 * Math.PI * hours) / 12 + phase * 1.1)
    + 0.72 * Math.cos((2 * Math.PI * hours) / 23.9345 + phase * 0.7)
    + 0.38 * Math.cos((2 * Math.PI * hours) / 25.8193 + phase * 0.5);
}

function tideEvents(marina: Marina, when: Date) {
  const out: Array<TideEvent & { kind: 'high' | 'low' }> = [];
  let previous = tideHeight(marina, when);
  let slope = tideHeight(marina, new Date(when.getTime() + 10 * 60 * 1000)) >= previous ? 1 : -1;

  for (let minute = 10; minute <= 18 * 60; minute += 10) {
    const t = new Date(when.getTime() + minute * 60 * 1000);
    const height = tideHeight(marina, t);
    if (slope > 0 && height < previous) {
      out.push({ kind: 'high', t: new Date(t.getTime() - 10 * 60 * 1000), height: previous });
      slope = -1;
    } else if (slope < 0 && height > previous) {
      out.push({ kind: 'low', t: new Date(t.getTime() - 10 * 60 * 1000), height: previous });
      slope = 1;
    }
    previous = height;
    if (out.some((event) => event.kind === 'high') && out.some((event) => event.kind === 'low')) break;
  }

  return out;
}

function nearestTideStation(marina: Marina) {
  return TIDE_STATION_HINTS.reduce((best, station) => {
    const current = haversine(marina.lat, marina.lon, station.lat, station.lon);
    const bestDistance = haversine(marina.lat, marina.lon, best.lat, best.lon);
    return current < bestDistance ? station : best;
  }, TIDE_STATION_HINTS[0]);
}

function formatShortTime(value: Date) {
  return value.toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(/\s/g, '').toLowerCase();
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function accessInfoFor(marina: Marina) {
  return marina.accessInfo || (marina.osmId ? MARINA_ACCESS_INFO[marina.osmId] : undefined);
}

function transientLabel(value: 'Y' | 'Limited' | 'N') {
  if (value === 'Y') return 'Yes';
  if (value === 'N') return 'No';
  return value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

async function loadCHSTides(marinas: Marina[]) {
  const stations = await fetchIwlsStations('wlp');
  const out: Record<number, LiveTide> = {};
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 8);

  const stationByMarina = new Map<number, IwlsStation>();
  const uniqueStations = new Map<string, IwlsStation>();
  marinas.forEach((marina) => {
    const station = nearestIwlsStation(marina, stations);
    if (!station) return;
    stationByMarina.set(marina.id, station);
    uniqueStations.set(station.id, station);
  });

  const stationData = new Map<string, { points: TidePoint[]; events: TideExtreme[] }>();
  const tasks = Array.from(uniqueStations.values()).map(async (station) => {
    const [curve, events] = await Promise.all([
      fetchIwlsSeries(station.id, 'wlp', from, to),
      fetchIwlsSeries(station.id, 'wlp-hilo', from, to)
    ]);
    if (curve.length < 4) return;
    stationData.set(station.id, {
      points: curve,
      events: events.length ? normalizeIwlsEvents(events) : inferTideExtremes(curve)
    });
  });

  await Promise.allSettled(tasks);
  marinas.forEach((marina) => {
    const station = stationByMarina.get(marina.id);
    const data = station ? stationData.get(station.id) : null;
    if (!station || !data) return;
    out[marina.id] = {
      station: station.name,
      points: data.points,
      events: data.events
    };
  });
  return out;
}

async function fetchIwlsStations(timeSeriesCode: string) {
  const url = iwlsUrl('/api/v1/stations');
  url.searchParams.set('chs-region-code', CHS_REGION);
  url.searchParams.set('time-series-code', timeSeriesCode);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`IWLS stations failed: ${res.status}`);
  const json = await res.json();
  const rows = Array.isArray(json) ? json : Array.isArray(json?.stations) ? json.stations : [];
  return rows.map(parseIwlsStation).filter(Boolean) as IwlsStation[];
}

function parseIwlsStation(row: Record<string, unknown>) {
  const id = stringField(row, ['id', 'code', 'stationId']);
  const lat = numberField(row, ['latitude', 'lat']);
  const lon = numberField(row, ['longitude', 'lon', 'lng']);
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    id,
    name: stringField(row, ['officialName', 'nameEn', 'name', 'code']) ?? id,
    lat,
    lon
  };
}

function nearestIwlsStation(marina: Marina, stations: IwlsStation[]) {
  let best: { station: IwlsStation; km: number } | null = null;
  for (const station of stations) {
    const km = haversine(marina.lat, marina.lon, station.lat, station.lon) / 1000;
    if (!best || km < best.km) best = { station, km };
  }
  return best && best.km <= MAX_CHS_STATION_KM ? best.station : null;
}

async function fetchIwlsSeries(stationId: string, timeSeriesCode: string, from: Date, to: Date) {
  const url = iwlsUrl(`/api/v1/stations/${stationId}/data`);
  url.searchParams.set('time-series-code', timeSeriesCode);
  url.searchParams.set('from', from.toISOString());
  url.searchParams.set('to', to.toISOString());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`IWLS ${timeSeriesCode} failed: ${res.status}`);
  const json = await res.json();
  const rows = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
  return rows.map(parseIwlsPoint).filter(Boolean) as Array<TidePoint & { qualifier?: string }>;
}

function iwlsUrl(path: string) {
  if (IWLS_BASE.startsWith('/')) {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    return new URL(`${IWLS_BASE}${path}`, origin);
  }
  return new URL(path, IWLS_BASE);
}

function parseIwlsPoint(row: Record<string, unknown>) {
  const time = stringField(row, ['eventDate', 'time', 'dateTime', 'timestamp', 't']);
  const value = numberField(row, ['value', 'height', 'heightM']);
  if (!time || !Number.isFinite(value)) return null;
  const t = new Date(time);
  if (Number.isNaN(t.getTime())) return null;
  const qualifier = stringField(row, ['qualifier', 'type', 'eventType']);
  return qualifier ? { t, height: value, qualifier } : { t, height: value };
}

function normalizeIwlsEvents(points: Array<TidePoint & { qualifier?: string }>): TideExtreme[] {
  const sorted = [...points].sort((a, b) => a.t.getTime() - b.t.getTime());
  const explicit: TideExtreme[] = [];
  sorted.forEach((point) => {
    const qualifier = point.qualifier?.toLowerCase() ?? '';
    if (qualifier.includes('flood') || qualifier.includes('high')) {
      explicit.push({ kind: 'high', t: point.t, height: point.height });
    }
    if (qualifier.includes('ebb') || qualifier.includes('low')) {
      explicit.push({ kind: 'low', t: point.t, height: point.height });
    }
  });
  if (explicit.length) return explicit;

  const out: TideExtreme[] = [];
  let nextKind: 'high' | 'low' = sorted[0] && sorted[1] && sorted[0].height < sorted[1].height ? 'low' : 'high';
  for (const point of sorted) {
    out.push({ kind: nextKind, t: point.t, height: point.height });
    nextKind = nextKind === 'high' ? 'low' : 'high';
  }
  return out;
}

function inferTideExtremes(points: TidePoint[]) {
  const sorted = [...points].sort((a, b) => a.t.getTime() - b.t.getTime());
  const out: TideExtreme[] = [];
  for (let index = 1; index < sorted.length - 1; index += 1) {
    const prev = sorted[index - 1];
    const current = sorted[index];
    const next = sorted[index + 1];
    if (current.height >= prev.height && current.height >= next.height) {
      out.push({ kind: 'high', t: current.t, height: current.height });
    } else if (current.height <= prev.height && current.height <= next.height) {
      out.push({ kind: 'low', t: current.t, height: current.height });
    }
  }
  return out;
}

function stringField(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function numberField(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return Number.NaN;
}

async function loadOsmPlaces() {
  const body = new URLSearchParams({ data: OVERPASS_QUERY });
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body
  });
  if (!res.ok) throw new Error(`Overpass failed: ${res.status}`);
  const data = await res.json();
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const marinas: Marina[] = [];
  const launches: BoatLaunch[] = [];

  for (const element of elements) {
    const tags = element.tags || {};
    if (tags.access === 'private') continue;
    const name = tags.name || tags['seamark:name'];
    const lat = Number(element.lat ?? element.center?.lat);
    const lon = Number(element.lon ?? element.center?.lon);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (isMembersOnlyName(name)) continue;

    if (tags.leisure === 'slipway') {
      launches.push({
        id: launches.length + 1,
        osmId: String(element.id),
        name,
        area: tags['addr:city'] || tags.place || 'Salish Sea',
        lat,
        lon,
        type: tags.boat === 'yes' ? 'Boat launch' : 'Slipway',
        access: tags.access,
        fee: tags.fee
      });
    } else if (tags.leisure === 'marina') {
      marinas.push({
        id: marinas.length + 1,
        osmId: String(element.id),
        name,
        address: osmAddress(tags),
        lat,
        lon,
        area: tags['addr:city'] || tags.place || 'Salish Sea',
        accessInfo: {
          access: 'Public',
          transient: 'Limited',
          fuel: tags.fuel === 'yes' || tags['fuel:diesel'] === 'yes' ? 'Y' : '?',
          launch: tags.leisure === 'slipway' ? 'Y' : '?',
          moorage: tags.fee === 'yes' ? 'fee tagged in OSM' : 'verify moorage',
          verified: false
        }
      });
    }
  }

  marinas.sort((a, b) => distanceFromHome(a) - distanceFromHome(b));
  launches.sort((a, b) => distanceFromHome(a) - distanceFromHome(b));
  return marinas.length ? { marinas: snapMarinaList(marinas).map((m, index) => ({ ...m, id: index + 1 })), launches } : null;
}

function osmAddress(tags: Record<string, string>) {
  const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:province']].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Address not listed in OSM';
}

function isMembersOnlyName(name: string) {
  const lower = name.toLowerCase();
  return lower.includes('yacht club') || lower.includes('members only');
}
