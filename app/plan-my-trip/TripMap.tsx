'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MARINA_ACCESS_INFO,
  PUBLIC_LAUNCHES,
  type BoatLaunch,
  type Marina
} from '../../lib/marinas';

type TripMapProps = {
  marinas: Marina[];
};

type SheetState = 'collapsed' | 'half' | 'full';

const HOME = { lat: 49.2845, lon: -123.1116 };
const DAYS = ['Today', 'Mon', 'Tue', 'Wed', 'Thu'];
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
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OVERPASS_QUERY = `[out:json][timeout:30];
( nwr["leisure"="marina"](48.35,-124.45,49.95,-122.30);
  nwr["leisure"="slipway"](48.35,-124.45,49.95,-122.30); );
out center tags;`;

export default function TripMap({ marinas }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef<Record<number, any>>({});
  const launchMarkerRefs = useRef<Record<number, any>>({});
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedLaunchId, setSelectedLaunchId] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>('half');
  const [tripMode, setTripMode] = useState(false);
  const [showLaunches, setShowLaunches] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [activeMarinas, setActiveMarinas] = useState(marinas);
  const [launches, setLaunches] = useState(PUBLIC_LAUNCHES);

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
    setActiveMarinas(marinas);
  }, [marinas]);

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
          icon: marinaIcon(L, marina, selectedId, tripMode),
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
        map.remove();
      };
    }

    mountMap();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [activeMarinas, launches, showLaunches]);

  useEffect(() => {
    let active = true;
    import('leaflet').then((L) => {
      if (!active) return;
      activeMarinas.forEach((marina) => {
        const marker = markerRefs.current[marina.id];
        if (marker) {
          marker.setIcon(marinaIcon(L, marina, selectedId, tripMode));
          marker.setZIndexOffset(selectedId === marina.id || marina.freedomClub ? 700 : 0);
        }
      });
    });
    return () => {
      active = false;
    };
  }, [activeMarinas, selectedId, tripMode, dayIndex]);

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

  return (
    <div className="plannerApp">
      <div ref={mapRef} className="plannerMap" aria-label="Vancouver and Gulf Islands marina map" />

      <div className="plannerTopbar">
        <a className="plannerBrand" href="/location/port-moody" aria-label="Back to conditions">
          <span className="plannerBrandDot" />
          <span>Freedom Boat</span>
        </a>
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
          onClick={() => setTripMode((value) => !value)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          <span>Plan a trip</span>
        </button>
      </div>

      <div className="plannerTimebar" aria-label="Trip date">
        {DAYS.map((label, index) => (
          <button
            key={label}
            type="button"
            className={`plannerDay ${dayIndex === index ? 'active' : ''}`}
            onClick={() => setDayIndex(index)}
          >
            <span>{label}</span>
            <b>{dayNumber(index)}</b>
            <em style={{ color: scoreColor(averageScore(activeMarinas, index)) }}>{averageScore(activeMarinas, index)}</em>
          </button>
        ))}
      </div>

      <section className={`plannerSheet plannerSheet-${sheetState}`} aria-label="Marina results">
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
              onBack={() => setSelectedId(null)}
            />
          ) : selectedLaunch ? (
            <LaunchDetail launch={selectedLaunch} onBack={() => setSelectedLaunchId(null)} />
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
                  const score = marinaScore(marina, dayIndex);
                  return (
                    <button
                      key={marina.id}
                      type="button"
                      className="plannerRow"
                      onClick={() => openMarina(marina)}
                    >
                      <span className="plannerIdx">
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
                        <span>{windFor(marina, dayIndex)} kt - {verdict(score)}</span>
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
  );
}

function MarinaDetail({
  marina,
  dayIndex,
  onBack
}: {
  marina: Marina;
  dayIndex: number;
  onBack: () => void;
}) {
  const score = marinaScore(marina, dayIndex);
  const wind = windFor(marina, dayIndex);
  const gust = wind + 5 + (marina.id % 4);
  const wave = Math.max(0.2, (wind - 5) * 0.05 + (marina.freedomClub ? 0.1 : 0.25));
  const info = accessInfoFor(marina);
  const tide = tideState(marina, plannerTimeForDay(dayIndex));

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
        </div>
      </div>

      <div className="plannerMetrics">
        <div>
          <span>Wind</span>
          <strong>{wind} <small>kt</small></strong>
        </div>
        <div>
          <span>Gust</span>
          <strong>{gust} <small>kt</small></strong>
        </div>
        <div>
          <span>Wave</span>
          <strong>{wave.toFixed(1)} <small>m</small></strong>
        </div>
        <div>
          <span>Area</span>
          <strong>{marina.area}</strong>
        </div>
      </div>

      <TideCard tide={tide} />

      <a
        className="plannerPrimary"
        href={marina.locationId ? `/location/${marina.locationId}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${marina.name} ${marina.address}`)}`}
        target={marina.locationId ? undefined : '_blank'}
        rel={marina.locationId ? undefined : 'noreferrer'}
      >
        {marina.locationId ? 'Open conditions' : 'Open in Maps'}
      </a>
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

function LaunchDetail({ launch, onBack }: { launch: BoatLaunch; onBack: () => void }) {
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
        {launch.access ? <span className="plannerTag">Access: {launch.access}</span> : null}
        {launch.fee ? <span className="plannerTag">Fee: {launch.fee}</span> : null}
      </div>
      <a
        className="plannerPrimary"
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${launch.name} ${launch.area}`)}`}
        target="_blank"
        rel="noreferrer"
      >
        Open in Maps
      </a>
    </div>
  );
}

function marinaIcon(L: any, marina: Marina, selectedId: number | null, tripMode: boolean) {
  const score = marinaScore(marina, 0);
  const cls = `${selectedId === marina.id ? 'sel' : ''} ${tripMode && marina.freedomClub ? 'trip' : ''}`;
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

function marinaScore(marina: Marina, dayIndex: number) {
  const wind = windFor(marina, dayIndex);
  const exposure = marina.freedomClub ? 0.7 : 1;
  const score = 100 - wind * 2.6 - exposure * 8 - (marina.id % 5) * 2;
  return Math.max(34, Math.min(96, Math.round(score)));
}

function averageScore(marinas: Marina[], dayIndex: number) {
  return Math.round(marinas.reduce((sum, marina) => sum + marinaScore(marina, dayIndex), 0) / marinas.length);
}

function windFor(marina: Marina, dayIndex: number) {
  return 5 + ((marina.id * 7 + dayIndex * 3) % 12);
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

type TidePoint = {
  t: Date;
  height: number;
};

type TideEvent = {
  t: Date;
  height: number;
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

function tideState(marina: Marina, when: Date): TideState {
  const points: TidePoint[] = [];
  const start = new Date(when.getTime() - 6 * 60 * 60 * 1000);
  const stepMinutes = 20;
  const totalMinutes = 18 * 60;
  let nowIndex = 0;

  for (let minute = 0; minute <= totalMinutes; minute += stepMinutes) {
    const t = new Date(start.getTime() + minute * 60 * 1000);
    points.push({ t, height: tideHeight(marina, t) });
    if (Math.abs(t.getTime() - when.getTime()) < Math.abs(points[nowIndex].t.getTime() - when.getTime())) {
      nowIndex = points.length - 1;
    }
  }

  const current = tideHeight(marina, when);
  const soon = tideHeight(marina, new Date(when.getTime() + 10 * 60 * 1000));
  const events = tideEvents(marina, when);
  const nextHigh = events.find((event) => event.kind === 'high') ?? { kind: 'high' as const, t: when, height: current };
  const nextLow = events.find((event) => event.kind === 'low') ?? { kind: 'low' as const, t: when, height: current };
  const slack = nextHigh.t < nextLow.t ? nextHigh : nextLow;

  return {
    station: nearestTideStation(marina).name,
    height: current,
    rising: soon >= current,
    points,
    nowIndex,
    nextHigh,
    nextLow,
    slack
  };
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
  return marinas.length ? { marinas: marinas.map((m, index) => ({ ...m, id: index + 1 })), launches } : null;
}

function osmAddress(tags: Record<string, string>) {
  const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:province']].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Address not listed in OSM';
}

function isMembersOnlyName(name: string) {
  const lower = name.toLowerCase();
  return lower.includes('yacht club') || lower.includes('members only');
}
