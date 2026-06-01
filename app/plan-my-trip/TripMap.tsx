'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Marina } from '../../lib/marinas';

type TripMapProps = {
  marinas: Marina[];
};

type SheetState = 'collapsed' | 'half' | 'full';

const HOME = { lat: 49.2845, lon: -123.1116 };
const DAYS = ['Today', 'Mon', 'Tue', 'Wed', 'Thu'];

export default function TripMap({ marinas }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef<Record<number, any>>({});
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>('half');
  const [tripMode, setTripMode] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return marinas;
    return marinas.filter((marina) =>
      `${marina.name} ${marina.address} ${marina.area}`.toLowerCase().includes(q)
    );
  }, [marinas, query]);

  const selected = selectedId ? marinas.find((marina) => marina.id === selectedId) ?? null : null;

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

      marinas.forEach((marina) => {
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

      map.fitBounds(bounds.pad(0.18), { maxZoom: 10 });

      setTimeout(() => {
        map.invalidateSize();
      }, 0);

      cleanup = () => {
        markerRefs.current = {};
        map.remove();
      };
    }

    mountMap();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [marinas]);

  useEffect(() => {
    let active = true;
    import('leaflet').then((L) => {
      if (!active) return;
      marinas.forEach((marina) => {
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
  }, [marinas, selectedId, tripMode, dayIndex]);

  function openMarina(marina: Marina) {
    setSelectedId(marina.id);
    setSheetState('full');
    markerRefs.current[marina.id]?.openPopup?.();
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
            <em style={{ color: scoreColor(averageScore(marinas, index)) }}>{averageScore(marinas, index)}</em>
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
                    placeholder="Marinas"
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

              <div className="plannerResultsHead">{query ? `Results - ${filtered.length}` : 'Results'}</div>

              <div className="plannerRows">
                {filtered.map((marina) => {
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

function distanceFromHome(marina: Marina) {
  const metres = haversine(HOME.lat, HOME.lon, marina.lat, marina.lon);
  return metres / 1852;
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
