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
import { degToCardinal } from '../../lib/format';
import { marinaPath, seoSlugForLaunch } from '../../lib/seo-slugs';
import { CURRENT_PASSES, type CurrentEvent, type CurrentPassForecast } from '../../lib/current-passes';
import { COAST, type CoastPolygon } from '../../lib/coastline';
import { draftChannelRoute } from '../../lib/channel-network';

type TripMapProps = {
  marinas: Marina[];
};

type SheetState = 'collapsed' | 'half' | 'full';
type PlannerResult =
  | { kind: 'marina'; marina: Marina }
  | { kind: 'launch'; launch: BoatLaunch };
type PlannerOutlooks = Record<string, DailyOutlook[]>;
type CurrentForecasts = Record<string, CurrentPassForecast>;
type LandCollisionBySegment = Record<number, boolean>;
type RouteStopNode = { kind: 'stop'; marinaId: number };
type RouteWaypointNode = { kind: 'waypoint'; id: string; lat: number; lon: number };
type RouteNode = RouteStopNode | RouteWaypointNode;
type ResolvedStopNode = RouteStopNode & {
  name: string;
  lat: number;
  lon: number;
  marina: Marina;
};
type ResolvedWaypointNode = RouteWaypointNode & { name: string };
type ResolvedRouteNode = ResolvedStopNode | ResolvedWaypointNode;
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
  const timebarRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const initialMapBoundsRef = useRef<any>(null);
  const markerRefs = useRef<Record<number, any>>({});
  const launchMarkerRefs = useRef<Record<number, any>>({});
  const routeLineRef = useRef<any>(null);
  const routeLegLineRefs = useRef<Record<number, any>>({});
  const waypointMarkerRefs = useRef<Record<string, any>>({});
  const routeClickHandlerRef = useRef<((latlng: { lat: number; lng: number }) => void) | null>(null);
  const isRouteEditingRef = useRef(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedLaunchId, setSelectedLaunchId] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>('half');
  const [mobileMarkerModal, setMobileMarkerModal] = useState(false);
  const [isTimebarPinned, setIsTimebarPinned] = useState(false);
  const [timebarHeight, setTimebarHeight] = useState(0);
  const [tripMode, setTripMode] = useState(false);
  const [showLaunches, setShowLaunches] = useState(false);
  const [showFreedomOnly, setShowFreedomOnly] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRouteEditing, setIsRouteEditing] = useState(false);
  const [vesselKey, setVesselKey] = useState<VesselKey>('cruiser');
  const [routeNodes, setRouteNodes] = useState<RouteNode[]>([]);
  const [departAt, setDepartAt] = useState(() => defaultDepartInput());
  const [speedKt, setSpeedKt] = useState(DEFAULT_SPEED_KT);
  const [shareText, setShareText] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [draftRouteMessage, setDraftRouteMessage] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [activeMarinas, setActiveMarinas] = useState(() => snapMarinaList(marinas));
  const [launches, setLaunches] = useState(PUBLIC_LAUNCHES);
  const [liveTides, setLiveTides] = useState<Record<number, LiveTide>>({});
  const [weeklyOutlooks, setWeeklyOutlooks] = useState<PlannerOutlooks>({});
  const [currentForecasts, setCurrentForecasts] = useState<CurrentForecasts>({});
  const restoredPlanRef = useRef(false);
  const vessel = VESSELS[vesselKey];
  const tripStops = useMemo(() => routeNodes
    .filter((node): node is RouteStopNode => node.kind === 'stop')
    .map((node) => node.marinaId), [routeNodes]);
  const resolvedRouteNodes = useMemo(() => resolveRouteNodes(routeNodes, activeMarinas), [routeNodes, activeMarinas]);
  const landCollisions = useMemo(() => detectLandCollisions(resolvedRouteNodes), [resolvedRouteNodes]);
  const marinaListIndex = useMemo(() => {
    return new Map(activeMarinas.map((marina, index) => [marina.id, index + 1]));
  }, [activeMarinas]);
  const visibleMarinas = useMemo(() => {
    return showFreedomOnly ? activeMarinas.filter((marina) => marina.freedomClub) : activeMarinas;
  }, [activeMarinas, showFreedomOnly]);

  const filtered = useMemo<PlannerResult[]>(() => {
    const q = query.trim().toLowerCase();
    const marinaResults = visibleMarinas
      .filter((marina) => !q || `${marina.name} ${marina.address} ${marina.area}`.toLowerCase().includes(q))
      .map((marina) => ({ kind: 'marina' as const, marina }));

    const launchResults = showLaunches
      ? launches
        .filter((launch) => !q || `${launch.name} ${launch.area} ${launch.type}`.toLowerCase().includes(q))
        .map((launch) => ({ kind: 'launch' as const, launch }))
      : [];

    return [...marinaResults, ...launchResults];
  }, [launches, query, showLaunches, visibleMarinas]);

  const selected = selectedId ? activeMarinas.find((marina) => marina.id === selectedId) ?? null : null;
  const selectedLaunch = selectedLaunchId ? launches.find((launch) => launch.id === selectedLaunchId) ?? null : null;
  const showSheetDetail = Boolean((selected || selectedLaunch) && !mobileMarkerModal);

  useEffect(() => {
    setActiveMarinas(snapMarinaList(marinas));
  }, [marinas]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)');
    if (media.matches) setSheetState('collapsed');
  }, []);

  useEffect(() => {
    if (!mobileMarkerModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMarkerModal]);

  useEffect(() => {
    if (!mobileMarkerModal) return;
    const media = window.matchMedia('(max-width: 560px)');
    function handleChange(event: MediaQueryListEvent) {
      if (!event.matches) setMobileMarkerModal(false);
    }
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [mobileMarkerModal]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)');
    if (!media.matches || !timebarRef.current || isFullscreen) {
      setIsTimebarPinned(false);
      return;
    }

    const timebar = timebarRef.current;
    const pinAt = timebar.getBoundingClientRect().top + window.scrollY;
    setTimebarHeight(timebar.offsetHeight);

    function updatePinned() {
      setIsTimebarPinned(window.scrollY >= pinAt);
    }

    updatePinned();
    window.addEventListener('scroll', updatePinned, { passive: true });
    window.addEventListener('resize', updatePinned);
    return () => {
      window.removeEventListener('scroll', updatePinned);
      window.removeEventListener('resize', updatePinned);
    };
  }, [isFullscreen]);

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
    setRouteNodes((nodes) => cleanRouteNodes(nodes.filter((node) => node.kind === 'waypoint' || available.has(node.marinaId))));
  }, [activeMarinas]);

  useEffect(() => {
    if (!showFreedomOnly || selectedId == null) return;
    const selectedMarina = activeMarinas.find((marina) => marina.id === selectedId);
    if (selectedMarina && !selectedMarina.freedomClub) {
      setSelectedId(null);
      setMobileMarkerModal(false);
    }
  }, [activeMarinas, selectedId, showFreedomOnly]);

  useEffect(() => {
    if (resolvedRouteNodes.filter((node) => node.kind === 'stop').length < 2) {
      setCurrentForecasts({});
      return;
    }

    let cancelled = false;
    const from = new Date(departAt || defaultDepartInput());
    const to = new Date(from.getTime() + 5 * 86400000);
    const url = `/api/currents?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`currents ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.forecasts) ? data.forecasts as CurrentPassForecast[] : [];
        setCurrentForecasts(Object.fromEntries(rows.map((row) => [row.passId, row])));
      })
      .catch(() => {
        if (!cancelled) setCurrentForecasts({});
      });
    return () => {
      cancelled = true;
    };
  }, [departAt, resolvedRouteNodes]);

  useEffect(() => {
    if (restoredPlanRef.current || !activeMarinas.length) return;
    restoredPlanRef.current = true;
    const restored = restoreFloatPlanFromHash(activeMarinas);
    if (!restored) return;
    setVesselKey(restored.vesselKey);
    setDepartAt(restored.departAt);
    setSpeedKt(restored.speedKt);
    setRouteNodes(restored.nodes);
    if (restored.nodes.some((node) => node.kind === 'stop')) {
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
      nodes: routeNodes,
      marinas: activeMarinas
    });
  }, [activeMarinas, departAt, routeNodes, speedKt, vesselKey]);

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
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
        dragging: true,
        doubleClickZoom: true,
        touchZoom: true
      }).setView([49.05, -123.25], 9);
      leafletMapRef.current = map;
      map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        routeClickHandlerRef.current?.(event.latlng);
      });

      L.control.zoom({ position: isMobilePlanner() ? 'bottomright' : 'topleft' }).addTo(map);
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
      const initialBounds = L.latLngBounds([]);

      visibleMarinas.forEach((marina) => {
        bounds.extend([marina.lat, marina.lon]);
        if (isInitialBcFocus(marina)) {
          initialBounds.extend([marina.lat, marina.lon]);
        }
        const marker = L.marker([marina.lat, marina.lon], {
          icon: marinaIcon(L, marina, marinaListIndex.get(marina.id) ?? marina.id, selectedId, tripStops.includes(marina.id), dayIndex, vessel, weeklyOutlooks),
          bubblingMouseEvents: false,
          zIndexOffset: marina.freedomClub ? 600 : 0
        }).addTo(map);
        marker.on('click', () => {
          setSelectedId(marina.id);
          setSelectedLaunchId(null);
          if (isMobilePlanner()) {
            setMobileMarkerModal(true);
            setSheetState('collapsed');
          } else {
            setMobileMarkerModal(false);
            setSheetState('full');
            setIsFullscreen(false);
          }
        });
        markerRefs.current[marina.id] = marker;
      });

      if (showLaunches) {
        launches.forEach((launch) => {
          bounds.extend([launch.lat, launch.lon]);
          if (isInitialBcFocus(launch)) {
            initialBounds.extend([launch.lat, launch.lon]);
          }
          const marker = L.marker([launch.lat, launch.lon], {
            icon: launchIcon(L, launch),
            bubblingMouseEvents: false,
            zIndexOffset: 500
          }).addTo(map);
          marker.on('click', () => {
            setSelectedId(null);
            setSelectedLaunchId(launch.id);
            if (isMobilePlanner()) {
              setMobileMarkerModal(true);
              setSheetState('collapsed');
          } else {
            setMobileMarkerModal(false);
            setSheetState('full');
            setIsFullscreen(false);
          }
        });
          launchMarkerRefs.current[launch.id] = marker;
        });
      }

      const loadBounds = initialBounds.isValid() ? initialBounds : bounds;
      initialMapBoundsRef.current = loadBounds;
      fitPlannerMap(map, loadBounds, false);

      setTimeout(() => {
        if (!disposed && leafletMapRef.current === map) {
          map.invalidateSize();
          fitPlannerMap(map, loadBounds, false);
        }
      }, 0);

      cleanup = () => {
        markerRefs.current = {};
        launchMarkerRefs.current = {};
        waypointMarkerRefs.current = {};
        routeLegLineRefs.current = {};
        routeLineRef.current = null;
        leafletMapRef.current = null;
        initialMapBoundsRef.current = null;
        map.remove();
      };
    }

    mountMap();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [launches, marinaListIndex, showLaunches, visibleMarinas, weeklyOutlooks]);

  useEffect(() => {
    isRouteEditingRef.current = isRouteEditing;
  }, [isRouteEditing]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const map = leafletMapRef.current;
      if (!map) return;
      map.invalidateSize?.();
      fitPlannerMap(map, initialMapBoundsRef.current, isFullscreen);
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
      visibleMarinas.forEach((marina) => {
        const marker = markerRefs.current[marina.id];
        if (marker) {
          marker.setIcon(marinaIcon(L, marina, marinaListIndex.get(marina.id) ?? marina.id, selectedId, tripStops.includes(marina.id), dayIndex, vessel, weeklyOutlooks));
          marker.setZIndexOffset(selectedId === marina.id || tripStops.includes(marina.id) || marina.freedomClub ? 700 : 0);
        }
      });
    });
    return () => {
      active = false;
    };
  }, [marinaListIndex, selectedId, tripStops, dayIndex, vessel, visibleMarinas, weeklyOutlooks]);

  useEffect(() => {
    routeClickHandlerRef.current = (latlng) => {
      if (!isRouteEditing || countRouteStops(routeNodes) < 2) return;
      const resolved = resolveRouteNodes(routeNodes, activeMarinas);
      if (resolved.length < 2) return;
      const insertAt = nearestLegIndex(resolved, { lat: latlng.lat, lon: latlng.lng }) + 1;
      const waypoint: RouteWaypointNode = {
        kind: 'waypoint',
        id: waypointId(),
        lat: latlng.lat,
        lon: latlng.lng
      };
      setRouteNodes((nodes) => [
        ...nodes.slice(0, insertAt),
        waypoint,
        ...nodes.slice(insertAt)
      ]);
      setShareText('');
      setShareMessage('');
      setDraftRouteMessage('');
    };
  }, [activeMarinas, isRouteEditing, routeNodes]);

  useEffect(() => {
    let active = true;
    import('leaflet').then((L) => {
      if (!active) return;
      const map = leafletMapRef.current;
      if (!map) return;
      const coordinates: Array<[number, number]> = resolvedRouteNodes.map((node) => [node.lat, node.lon]);

      if (countRouteStops(routeNodes) >= 2 && coordinates.length >= 2) {
        if (routeLineRef.current) {
          routeLineRef.current.remove();
          routeLineRef.current = null;
        }

        const liveSegments = new Set<number>();
        for (let index = 1; index < coordinates.length; index += 1) {
          liveSegments.add(index);
          const line = routeLegLineRefs.current[index];
          const crossesLand = landCollisions[index] === true;
          const options = routeLegStyle(crossesLand);
          const latLngs = [coordinates[index - 1], coordinates[index]];
          if (line) {
            line.setLatLngs(latLngs);
            line.setStyle(options);
          } else {
            routeLegLineRefs.current[index] = L.polyline(latLngs, options).addTo(map);
          }
        }
        Object.entries(routeLegLineRefs.current).forEach(([key, line]) => {
          const segmentIndex = Number(key);
          if (!liveSegments.has(segmentIndex)) {
            line.remove();
            delete routeLegLineRefs.current[segmentIndex];
          }
        });
      } else {
        Object.values(routeLegLineRefs.current).forEach((line) => line.remove());
        routeLegLineRefs.current = {};
      }

      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }

      const liveWaypointIds = new Set(countRouteStops(routeNodes) >= 2
        ? routeNodes.filter((node): node is RouteWaypointNode => node.kind === 'waypoint').map((node) => node.id)
        : []);
      Object.entries(waypointMarkerRefs.current).forEach(([id, marker]) => {
        if (!liveWaypointIds.has(id)) {
          marker.remove();
          delete waypointMarkerRefs.current[id];
        }
      });

      routeNodes.forEach((node) => {
        if (countRouteStops(routeNodes) < 2) return;
        if (node.kind !== 'waypoint') return;
        const marker = waypointMarkerRefs.current[node.id];
        if (marker) {
          marker.setLatLng([node.lat, node.lon]);
          if (isRouteEditing) {
            marker.dragging?.enable?.();
          } else {
            marker.dragging?.disable?.();
          }
          return;
        }

        const nextMarker = L.marker([node.lat, node.lon], {
          draggable: isRouteEditing,
          icon: waypointIcon(L),
          bubblingMouseEvents: false,
          zIndexOffset: 650
        }).addTo(map);
        nextMarker.on('drag', (event: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
          const point = event.target.getLatLng();
          setRouteNodes((nodes) => nodes.map((candidate) => candidate.kind === 'waypoint' && candidate.id === node.id
            ? { ...candidate, lat: point.lat, lon: point.lng }
            : candidate));
          setShareText('');
          setShareMessage('');
          setDraftRouteMessage('');
        });
        nextMarker.on('click', () => {
          if (!isRouteEditingRef.current) return;
          setRouteNodes((nodes) => nodes.filter((candidate) => candidate.kind !== 'waypoint' || candidate.id !== node.id));
          setShareText('');
          setShareMessage('');
          setDraftRouteMessage('');
        });
        waypointMarkerRefs.current[node.id] = nextMarker;
      });
    });

    return () => {
      active = false;
    };
  }, [isRouteEditing, landCollisions, resolvedRouteNodes, routeNodes]);

  function openMarina(marina: Marina) {
    setSelectedId(marina.id);
    setSelectedLaunchId(null);
    setMobileMarkerModal(false);
    setSheetState('full');
    setIsFullscreen(false);
    markerRefs.current[marina.id]?.openPopup?.();
  }

  function openLaunch(launch: BoatLaunch) {
    setSelectedLaunchId(launch.id);
    setSelectedId(null);
    setMobileMarkerModal(false);
    setSheetState('full');
    setIsFullscreen(false);
  }

  function closeSelectedDetail() {
    setSelectedId(null);
    setSelectedLaunchId(null);
    setMobileMarkerModal(false);
  }

  function toggleTripStop(marinaId: number) {
    setRouteNodes((nodes) => {
      if (nodes.some((node) => node.kind === 'stop' && node.marinaId === marinaId)) {
        return cleanRouteNodes(nodes.filter((node) => node.kind !== 'stop' || node.marinaId !== marinaId));
      }
      return [...nodes, { kind: 'stop', marinaId }];
    });
    setTripMode(true);
    setShareText('');
    setShareMessage('');
    setDraftRouteMessage('');
  }

  function draftWaterRoute() {
    const stopNodes = routeNodes.filter((node): node is RouteStopNode => node.kind === 'stop');
    if (stopNodes.length < 2) return;

    const marinasById = new Map(activeMarinas.map((marina) => [marina.id, marina]));
    const nextNodes: RouteNode[] = [];
    let draftWaypointCount = 0;
    let draftedLegCount = 0;
    let skippedLegCount = 0;

    stopNodes.forEach((stop, index) => {
      nextNodes.push(stop);
      const nextStop = stopNodes[index + 1];
      if (!nextStop) return;

      const start = marinasById.get(stop.marinaId);
      const end = marinasById.get(nextStop.marinaId);
      if (!start || !end) return;

      if (!legCrossesLand(start, end, COAST)) return;

      const draftPoints = draftChannelRoute(start, end);
      if (!draftPoints.length) {
        skippedLegCount += 1;
        return;
      }

      draftedLegCount += 1;
      draftPoints.forEach((point) => {
        nextNodes.push({
          kind: 'waypoint',
          id: waypointId(),
          lat: point.lat,
          lon: point.lon
        });
        draftWaypointCount += 1;
      });
    });

    setRouteNodes(cleanRouteNodes(nextNodes));
    setTripMode(true);
    setIsRouteEditing(false);
    setSelectedId(null);
    setSelectedLaunchId(null);
    setMobileMarkerModal(false);
    setShareText('');
    setShareMessage('');
    setDraftRouteMessage(draftWaypointCount
      ? `Draft water route added ${draftWaypointCount} waypoint${draftWaypointCount === 1 ? '' : 's'} across ${draftedLegCount} land-crossing leg${draftedLegCount === 1 ? '' : 's'}. Verify on charts and refine with Edit route.`
      : skippedLegCount
        ? 'No draft channel path found for the land-crossing leg. Use Edit route to add manual waypoints.'
        : 'No land-crossing legs needed draft waypoints.');
  }

  async function shareFloatPlan() {
    const text = buildFloatPlanText(resolvedRouteNodes, vessel, departAt, speedKt, dayIndex, weeklyOutlooks, liveTides, currentForecasts, landCollisions);
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
      : averageScore(visibleMarinas.length ? visibleMarinas : activeMarinas, index, vessel, weeklyOutlooks);
  }

  function timebarWind(index: number) {
    return selected ? windLabel(conditionsFor(selected, index, weeklyOutlooks)) : null;
  }

  return (
    <div className={`plannerWrap ${isFullscreen ? 'plannerWrapExpanded' : ''}`}>
      <div
        ref={timebarRef}
        className={`plannerTimebar ${isTimebarPinned ? 'plannerTimebarPinned' : ''}`}
        aria-label="Trip date"
      >
        {DAYS.map((label, index) => {
          const score = timebarScore(index);
          const wind = timebarWind(index);
          return (
            <button
              key={label}
              type="button"
              className={`plannerDay ${dayIndex === index ? 'active' : ''}`}
              onClick={() => setDayIndex(index)}
            >
              <span>{label}</span>
              <b>{dayNumber(index)}</b>
              <em style={{ color: scoreColor(score) }}>{wind ? `${score} / ${wind}` : score}</em>
            </button>
          );
        })}
      </div>
      {isTimebarPinned ? <div className="plannerTimebarSpacer" style={{ height: timebarHeight }} /> : null}

      <div className={`plannerApp ${isFullscreen ? 'plannerAppExpanded' : ''}`}>
        <div className="plannerMapPane">
          <div ref={mapRef} className="plannerMap" aria-label="Vancouver and Gulf Islands marina map" />

          <div className="plannerTopbar">
            <button
              className={`plannerChip ${tripMode ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setTripMode((value) => !value);
                setSelectedId(null);
                setSelectedLaunchId(null);
                setMobileMarkerModal(false);
                setIsFullscreen(false);
                setSheetState('full');
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              <span>Plan a trip</span>
            </button>
            <button
              className={`plannerChip plannerRouteChip ${isRouteEditing ? 'active' : ''}`}
              type="button"
              aria-pressed={isRouteEditing}
              disabled={tripStops.length < 2}
              onClick={() => {
                setIsRouteEditing((value) => !value);
                setTripMode(true);
                setSheetState('full');
                setSelectedId(null);
                setSelectedLaunchId(null);
                setMobileMarkerModal(false);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="5" cy="19" r="2" />
                <circle cx="19" cy="5" r="2" />
                <path d="M7 18c5-1 3-11 10-12" />
              </svg>
              <span>Edit route</span>
            </button>
            <button
              className={`plannerChip plannerFullscreenChip ${isFullscreen ? 'active' : ''}`}
              type="button"
              aria-pressed={isFullscreen}
              onClick={() => {
                setSelectedId(null);
                setSelectedLaunchId(null);
                setMobileMarkerModal(false);
                setIsFullscreen((value) => !value);
              }}
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
              <span>{isFullscreen ? 'Show sidebar' : 'Expand map'}</span>
            </button>
          </div>

          <div className="plannerLegend" aria-label="Map legend">
            <span><i className="scoreGood" />Good</span>
            <span><i className="scoreFair" />Fair</span>
            <span><i className="scorePoor" />Poor</span>
            {showLaunches ? <span><i className="launchShape" />Launch</span> : null}
          </div>

          {mobileMarkerModal && (selected || selectedLaunch) ? (
            <div className="plannerMobileModal" role="dialog" aria-modal="true" aria-label="Marker details">
              <div className="plannerMobileModalCard">
                <button className="plannerMobileModalClose" type="button" onClick={closeSelectedDetail}>
                  Close
                </button>
                {selected ? (
                  <MarinaDetail
                    marina={selected}
                    dayIndex={dayIndex}
                    vessel={vessel}
                    weeklyOutlooks={weeklyOutlooks}
                    liveTide={liveTides[selected.id]}
                    inTrip={tripStops.includes(selected.id)}
                    onToggleTrip={() => toggleTripStop(selected.id)}
                    onBack={closeSelectedDetail}
                  />
                ) : selectedLaunch ? (
                  <LaunchDetail launch={selectedLaunch} dayIndex={dayIndex} onBack={closeSelectedDetail} />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

      <section
        className={`plannerSheet plannerSheet-${sheetState} ${showSheetDetail ? 'plannerSheet-detail' : ''}`}
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
          {showSheetDetail && selected ? (
            <MarinaDetail
              marina={selected}
              dayIndex={dayIndex}
              vessel={vessel}
              weeklyOutlooks={weeklyOutlooks}
              liveTide={liveTides[selected.id]}
              inTrip={tripStops.includes(selected.id)}
              onToggleTrip={() => toggleTripStop(selected.id)}
              onBack={closeSelectedDetail}
            />
          ) : showSheetDetail && selectedLaunch ? (
            <LaunchDetail launch={selectedLaunch} dayIndex={dayIndex} onBack={closeSelectedDetail} />
          ) : tripMode ? (
            <TripPlanView
              routeNodes={resolvedRouteNodes}
              vessel={vessel}
              vesselKey={vesselKey}
              departAt={departAt}
              speedKt={speedKt}
              dayIndex={dayIndex}
                weeklyOutlooks={weeklyOutlooks}
                liveTides={liveTides}
                currentForecasts={currentForecasts}
                landCollisions={landCollisions}
                isRouteEditing={isRouteEditing}
              shareText={shareText}
              shareMessage={shareMessage}
              draftRouteMessage={draftRouteMessage}
              onBack={() => setTripMode(false)}
              onBrowse={() => {
                setTripMode(false);
                setSheetState('half');
              }}
              onDepartChange={setDepartAt}
              onSpeedChange={setSpeedKt}
              onDraftWaterRoute={draftWaterRoute}
              onToggleRouteEditing={() => setIsRouteEditing((value) => !value)}
              onRemoveStop={toggleTripStop}
              onRemoveWaypoint={(id) => {
                setRouteNodes((nodes) => nodes.filter((node) => node.kind !== 'waypoint' || node.id !== id));
                setShareText('');
                setShareMessage('');
                setDraftRouteMessage('');
              }}
              onShare={shareFloatPlan}
            />
          ) : (
            <>
              <div className={`plannerSearchRow ${sheetState === 'collapsed' ? 'plannerSearchRow-collapsed' : ''}`}>
                <label className="plannerSearch">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={showLaunches ? 'Search destinations and launches' : 'Search destinations'}
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
                  aria-label={sheetState === 'collapsed' ? 'Open destination sheet' : 'Collapse destination sheet'}
                  onClick={() => setSheetState(sheetState === 'collapsed' ? 'full' : 'collapsed')}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    {sheetState === 'collapsed' ? (
                      <>
                        <line x1="6" y1="15" x2="12" y2="9" />
                        <line x1="18" y1="15" x2="12" y2="9" />
                      </>
                    ) : (
                      <>
                        <line x1="6" y1="9" x2="12" y2="15" />
                        <line x1="18" y1="9" x2="12" y2="15" />
                      </>
                    )}
                  </svg>
                </button>
              </div>

              <div className="plannerFilterTools" aria-label="Map filters">
                <button
                  className={`plannerIconFilter ${showLaunches ? 'active' : ''}`}
                  type="button"
                  aria-label="Show launches"
                  aria-pressed={showLaunches}
                  title="Show launches"
                  data-tooltip="Show launches"
                  onClick={() => {
                    setShowLaunches((value) => !value);
                    setSelectedLaunchId(null);
                    setMobileMarkerModal(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 4v15" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M5 13a7 7 0 0 0 14 0" />
                    <path d="M8 16h8" />
                  </svg>
                </button>
                <button
                  className={`plannerIconFilter ${showFreedomOnly ? 'active' : ''}`}
                  type="button"
                  aria-label="Filter only Freedom Boat Club locations"
                  aria-pressed={showFreedomOnly}
                  title="Freedom Boat Club only"
                  data-tooltip="Freedom Boat Club only"
                  onClick={() => {
                    setShowFreedomOnly((value) => !value);
                    setSelectedLaunchId(null);
                    setMobileMarkerModal(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M7 20V4" />
                    <path d="M7 5h10l-2 4 2 4H7" />
                    <path d="M10 8h4" />
                    <path d="M10 11h3" />
                  </svg>
                </button>
              </div>

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

              <div className="plannerResultsHead">
                {query
                  ? `Results - ${filtered.length}`
                  : showLaunches
                    ? `${showFreedomOnly ? 'Freedom Boat Club locations' : 'Destinations'} and launches`
                    : showFreedomOnly ? 'Freedom Boat Club locations' : 'Destinations'}
              </div>

              <div className="plannerRows">
                {filtered.map((result) => {
                  if (result.kind === 'launch') {
                    const { launch } = result;
                    return (
                      <button
                        key={`launch-${launch.id}`}
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
                    );
                  }

                  const { marina } = result;
                  const score = marinaScore(marina, dayIndex, vessel, weeklyOutlooks);
                  const listIndex = marinaListIndex.get(marina.id) ?? marina.id;
                  return (
                    <button
                      key={`marina-${marina.id}`}
                      type="button"
                      className={`plannerRow ${marina.freedomClub ? 'plannerRowFreedom' : ''}`}
                      onClick={() => openMarina(marina)}
                    >
                      <span className={`plannerIdx ${marina.freedomClub ? 'plannerIdxFreedom' : ''}`}>
                        {listIndex}
                        <i style={{ background: scoreColor(score) }} />
                      </span>
                      <span className="plannerBody">
                        <span className="plannerName">
                          {marina.name}
                          {marina.freedomClub ? <em>Freedom Boat Club</em> : null}
                        </span>
                        <span className="plannerAddr">{marina.address}</span>
                      </span>
                      <span className="plannerRight">
                        <b>{distanceFromHome(marina).toFixed(1)} nm</b>
                        <span>{score} score - {windLabel(conditionsFor(marina, dayIndex, weeklyOutlooks))} - {verdict(score)}</span>
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
          <strong>{windLabel(conditions)}</strong>
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
        href={marinaPath(marina)}
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
  routeNodes,
  vessel,
  vesselKey,
  departAt,
  speedKt,
  dayIndex,
  weeklyOutlooks,
  liveTides,
  currentForecasts,
  landCollisions,
  isRouteEditing,
  shareText,
  shareMessage,
  draftRouteMessage,
  onBack,
  onBrowse,
  onDepartChange,
  onSpeedChange,
  onDraftWaterRoute,
  onToggleRouteEditing,
  onRemoveStop,
  onRemoveWaypoint,
  onShare
}: {
  routeNodes: ResolvedRouteNode[];
  vessel: VesselProfile;
  vesselKey: VesselKey;
  departAt: string;
  speedKt: number;
  dayIndex: number;
  weeklyOutlooks: PlannerOutlooks;
  liveTides: Record<number, LiveTide>;
  currentForecasts: CurrentForecasts;
  landCollisions: LandCollisionBySegment;
  isRouteEditing: boolean;
  shareText: string;
  shareMessage: string;
  draftRouteMessage: string;
  onBack: () => void;
  onBrowse: () => void;
  onDepartChange: (value: string) => void;
  onSpeedChange: (value: number) => void;
  onDraftWaterRoute: () => void;
  onToggleRouteEditing: () => void;
  onRemoveStop: (id: number) => void;
  onRemoveWaypoint: (id: string) => void;
  onShare: () => void;
}) {
  const legs = buildTripLegs(routeNodes, departAt, speedKt, dayIndex, vessel, weeklyOutlooks, liveTides, currentForecasts, landCollisions);
  const summary = tripSummary(legs);
  const stopCount = routeNodes.filter((node) => node.kind === 'stop').length;
  const waypointCount = routeNodes.length - stopCount;
  const landWarningCount = legs.filter((leg) => leg.crossesLand).length;

  return (
    <div className="plannerDetail plannerTripView">
      <button className="plannerBack" type="button" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to marinas
      </button>
      <h1>Float plan</h1>
      <p>{VESSELS[vesselKey].label} - {stopCount ? `${stopCount} stops${waypointCount ? ` + ${waypointCount} waypoints` : ''}` : 'Add stops from the map or list'}</p>

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

      {stopCount ? (
        <>
          <div className="plannerRouteActions">
            <button
              className="plannerPrimary plannerDraftRouteButton"
              type="button"
              disabled={stopCount < 2}
              onClick={onDraftWaterRoute}
            >
              Draft water route
            </button>
            <button
              className={`plannerPrimary plannerRouteEditButton ${isRouteEditing ? 'active' : ''}`}
              type="button"
              disabled={stopCount < 2}
              onClick={onToggleRouteEditing}
            >
              {isRouteEditing ? 'Done editing' : 'Edit route'}
            </button>
          </div>
          <p className="plannerTinyText">
            {stopCount < 2
              ? 'Add a second stop to draw and bend the route.'
              : isRouteEditing
                ? 'Click the map line to add a waypoint. Drag handles to bend the route; click a handle to delete it.'
                : 'Draft water route adds editable channel waypoints where direct legs cross land. Verify on charts.'}
          </p>
          {draftRouteMessage ? <div className="plannerRouteNotice">{draftRouteMessage}</div> : null}
          <div className="plannerVerdictBar" style={{ background: scoreColor(summary.score) }}>
            {verdict(summary.score)} for {vessel.label.toLowerCase()}
          </div>
          {landWarningCount ? (
            <div className="plannerWarning poor">
              {landWarningCount} route leg{landWarningCount === 1 ? '' : 's'} cross land. Add waypoints to route around land; this does not check rocks, shoals, depth, or bridges.
            </div>
          ) : null}
          <div className="plannerTripLegs">
            {legs.map((leg, index) => {
              if (leg.kind === 'waypoint') {
                return (
                  <div className="plannerLeg plannerWaypointLeg" key={leg.id}>
                    <span className="plannerLegNode waypoint">•</span>
                    <div>
                      <strong>Waypoint</strong>
                      <span>{leg.cumulativeDistance.toFixed(1)} nm from start</span>
                      {leg.crossesLand ? <em className="plannerWarning poor">Previous leg crosses land — add a waypoint to route around it.</em> : null}
                      <button type="button" onClick={() => onRemoveWaypoint(leg.id)}>Delete waypoint</button>
                    </div>
                  </div>
                );
              }

              const warning = vesselWarning(leg.conditions, vessel);
              return (
                <div className="plannerLeg" key={leg.marina.id}>
                  <span className="plannerLegNode">{leg.stopIndex}</span>
                  <div>
                    <strong>{leg.marina.name}</strong>
                    <span>
                      {formatShortTime(leg.arrive)} - {leg.cumulativeDistance.toFixed(1)} nm total - {leg.segmentDistance.toFixed(1)} nm leg - {windLabel(leg.conditions)} / {leg.conditions.wave.toFixed(1)}m - sunset {formatShortTime(leg.daylight.sunset)}{leg.tide ? ` - tide ${leg.tide.height.toFixed(1)}m` : ''}
                    </span>
                    {warning ? <em className={`plannerWarning ${warning.level}`}>{warning.text}</em> : null}
                    {leg.daylight.warning ? <em className={`plannerWarning ${leg.daylight.level}`}>{leg.daylight.warning}</em> : null}
                    {leg.crossesLand ? <em className="plannerWarning poor">Previous leg crosses land — add a waypoint to route around it. Land only; not rocks, shoals, depth, or bridges.</em> : null}
                    {leg.currentAdvisories.map((advisory) => (
                      <em className={`plannerWarning ${advisory.level}`} key={`${leg.marina.id}-${advisory.passId}`}>
                        {advisory.text}
                      </em>
                    ))}
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

function marinaIcon(L: any, marina: Marina, listIndex: number, selectedId: number | null, inTrip: boolean, dayIndex: number, vessel: VesselProfile, weeklyOutlooks: PlannerOutlooks = {}) {
  const score = marinaScore(marina, dayIndex, vessel, weeklyOutlooks);
  const cls = `${marina.freedomClub ? 'freedom' : ''} ${selectedId === marina.id ? 'sel' : ''} ${inTrip ? 'trip' : ''}`;
  const title = escapeHtml(`${listIndex}. ${marina.name} - score ${score}`);
  return L.divIcon({
    className: '',
    html: `<div class="plannerPin ${cls}" title="${title}" style="--pin-score:${scoreColor(score)}"><span class="plannerPinScore"></span><span class="plannerPinBubble">${listIndex}</span><span class="plannerPinTail"></span></div>`,
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

function routeLegStyle(crossesLand: boolean) {
  return {
    color: crossesLand ? '#dc2626' : '#0e7490',
    weight: crossesLand ? 5 : 4,
    opacity: crossesLand ? 0.95 : 0.9,
    dashArray: crossesLand ? '6 6' : '10 8',
    lineCap: 'round' as const,
    lineJoin: 'round' as const
  };
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

function isInitialBcFocus(location: Pick<Marina | BoatLaunch, 'lat' | 'lon'>) {
  return location.lat >= 48.2 && location.lat <= 50.3 && location.lon >= -124.8 && location.lon <= -122.45;
}

function isMobilePlanner() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches;
}

function fitPlannerMap(map: any, bounds: any, isExpanded: boolean) {
  if (!map || !bounds?.isValid?.()) return;
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches;
  map.fitBounds(bounds.pad(0.16), {
    animate: false,
    maxZoom: 11,
    paddingTopLeft: [0, 0],
    paddingBottomRight: isDesktop && !isExpanded ? [24, 0] : [0, 0]
  });
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
  const windDirDeg = outlook?.maxWindDirDeg;
  const gust = outlook?.maxGust ?? wind + 5 + (marina.id % 4);
  const exposure = marina.freedomClub ? 0.2 : (marina.exp ?? 0.45);
  const wave = Math.max(0.2, (wind - 5) * 0.05 + exposure * 0.35);
  return { wind, windDirDeg, gust, wave };
}

function outlookFor(marina: Marina, dayIndex: number, weeklyOutlooks: PlannerOutlooks) {
  if (!marina.locationId) return null;
  return weeklyOutlooks[marina.locationId]?.[dayIndex] ?? null;
}

function windLabel(conditions: Pick<ReturnType<typeof conditionsFor>, 'wind' | 'windDirDeg'>) {
  const dir = degToCardinal(conditions.windDirDeg);
  return `${Math.round(conditions.wind)} kt${dir ? ` ${dir}` : ''}`;
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

function legNm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  return haversine(a.lat, a.lon, b.lat, b.lon) / 1852;
}

type BBox = [number, number, number, number];

const ENDPOINT_LAND_TOLERANCE_NM = 50 / 1852;

function detectLandCollisions(nodes: ResolvedRouteNode[]): LandCollisionBySegment {
  if (nodes.length < 2) return {};
  const collisions: LandCollisionBySegment = {};
  for (let index = 1; index < nodes.length; index += 1) {
    if (legCrossesLand(nodes[index - 1], nodes[index], COAST)) {
      collisions[index] = true;
    }
  }
  return collisions;
}

function legCrossesLand(a: { lat: number; lon: number }, b: { lat: number; lon: number }, land: readonly CoastPolygon[]) {
  const legBox = bboxForPoints([[a.lon, a.lat], [b.lon, b.lat]]);
  for (const polygon of land) {
    const polygonBox = bboxForPolygon(polygon);
    if (!bboxOverlap(legBox, polygonBox)) continue;
    if (segmentCrossesPolygon(a, b, polygon)) return true;
  }
  return false;
}

function segmentCrossesPolygon(a: { lat: number; lon: number }, b: { lat: number; lon: number }, polygon: CoastPolygon) {
  for (const ring of polygon) {
    if (ring.length < 2) continue;
    for (let index = 1; index < ring.length; index += 1) {
      const intersection = segmentGateCrossing(a, b, [
        [ring[index - 1][0], ring[index - 1][1]],
        [ring[index][0], ring[index][1]]
      ]);
      if (!intersection) continue;
      const fromStart = legNm(a, intersection);
      const fromEnd = legNm(intersection, b);
      if (fromStart > ENDPOINT_LAND_TOLERANCE_NM && fromEnd > ENDPOINT_LAND_TOLERANCE_NM) return true;
    }
  }

  const midpoint = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
  const segmentLength = legNm(a, b);
  return segmentLength > ENDPOINT_LAND_TOLERANCE_NM * 2 && pointInPolygon(midpoint, polygon);
}

function pointInPolygon(point: { lat: number; lon: number }, polygon: CoastPolygon) {
  let inside = false;
  for (const ring of polygon) {
    let ringInside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      const intersects = ((yi > point.lat) !== (yj > point.lat))
        && point.lon < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || 1e-12) + xi;
      if (intersects) ringInside = !ringInside;
    }
    if (ringInside) inside = !inside;
  }
  return inside;
}

function bboxForPolygon(polygon: CoastPolygon): BBox {
  return bboxForPoints(polygon.flat());
}

function bboxForPoints(points: readonly (readonly [number, number])[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

function bboxOverlap(a: BBox, b: BBox) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function currentAdvisoriesForSegment(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  depart: Date,
  speedKt: number,
  cumulativeBeforeSegment: number,
  currentForecasts: CurrentForecasts
): CurrentAdvisory[] {
  const advisories: CurrentAdvisory[] = [];
  for (const pass of CURRENT_PASSES) {
    const crossing = segmentGateCrossing(start, end, pass.gate);
    if (!crossing) continue;
    const distanceToGate = cumulativeBeforeSegment + legNm(start, crossing);
    const gateEta = new Date(depart.getTime() + (distanceToGate / speedKt) * 3600000);
    const events = currentForecasts[pass.id]?.events ?? [];
    const advisory = currentAdvisoryForPass(pass.id, pass.name, pass.maxCurrentKt, gateEta, events);
    if (advisory) advisories.push(advisory);
  }
  return advisories;
}

function segmentGateCrossing(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  gate: [[number, number], [number, number]]
) {
  const p = { x: start.lon, y: start.lat };
  const r = { x: end.lon - start.lon, y: end.lat - start.lat };
  const q = { x: gate[0][0], y: gate[0][1] };
  const s = { x: gate[1][0] - gate[0][0], y: gate[1][1] - gate[0][1] };
  const denom = cross2d(r, s);
  if (Math.abs(denom) < 1e-12) return null;
  const qp = { x: q.x - p.x, y: q.y - p.y };
  const t = cross2d(qp, s) / denom;
  const u = cross2d(qp, r) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return {
    lat: p.y + t * r.y,
    lon: p.x + t * r.x
  };
}

function cross2d(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.y - a.y * b.x;
}

function currentAdvisoryForPass(
  passId: string,
  passName: string,
  maxCurrentKt: number,
  gateEta: Date,
  events: CurrentEvent[]
): CurrentAdvisory | null {
  if (!events.length) return null;
  const nearestSlack = nearestCurrentEvent(events, gateEta, 'slack');
  const nearestMax = nearestCurrentEvent(events, gateEta);
  if (!nearestSlack && !nearestMax) return null;

  const slackMinutes = nearestSlack ? Math.round((gateEta.getTime() - new Date(nearestSlack.t).getTime()) / 60000) : null;
  const maxMinutes = nearestMax ? Math.abs(Math.round((gateEta.getTime() - new Date(nearestMax.t).getTime()) / 60000)) : Infinity;
  const peakSpeed = nearestMax?.speedKt ?? 0;
  const nearSlack = slackMinutes != null && Math.abs(slackMinutes) <= 45;
  const nearMax = maxMinutes <= 75 && peakSpeed >= Math.max(2.5, maxCurrentKt * 0.45);
  if (nearSlack && !nearMax) return null;

  const level = nearMax ? 'poor' : 'fair';
  const slackText = nearestSlack
    ? `nearest slack ${formatShortTime(new Date(nearestSlack.t))}`
    : 'nearest slack unavailable';
  const maxText = nearestMax
    ? `${nearestMax.kind === 'max_ebb' ? 'max ebb' : 'max flood'} ${nearestMax.speedKt.toFixed(1)} kt at ${formatShortTime(new Date(nearestMax.t))}`
    : 'peak current unavailable';

  return {
    passId,
    passName,
    level,
    text: `Advisory: ${passName} around ${formatShortTime(gateEta)} - ${maxText}; ${slackText}. Plan pass transits near slack.`
  };
}

function nearestCurrentEvent(events: CurrentEvent[], when: Date, kind?: CurrentEvent['kind']) {
  const filtered = kind ? events.filter((event) => event.kind === kind) : events.filter((event) => event.kind !== 'slack');
  let best: { event: CurrentEvent; delta: number } | null = null;
  for (const event of filtered) {
    const delta = Math.abs(new Date(event.t).getTime() - when.getTime());
    if (!best || delta < best.delta) best = { event, delta };
  }
  return best?.event ?? null;
}

function dayIndexForArrival(depart: Date, arrive: Date, fallbackDayIndex: number) {
  if (Number.isNaN(depart.getTime()) || Number.isNaN(arrive.getTime())) return fallbackDayIndex;
  const departDay = new Date(depart);
  departDay.setHours(0, 0, 0, 0);
  const arrivalDay = new Date(arrive);
  arrivalDay.setHours(0, 0, 0, 0);
  const offset = Math.round((arrivalDay.getTime() - departDay.getTime()) / 86400000);
  return Math.max(0, Math.min(4, fallbackDayIndex + offset));
}

function daylightArrival(marina: Pick<Marina, 'lat' | 'lon'>, arrive: Date): DaylightArrival {
  const sunset = estimateSunset(marina.lat, marina.lon, arrive);
  const minutesFromSunset = Math.round((sunset.getTime() - arrive.getTime()) / 60000);
  if (minutesFromSunset < 0) {
    return {
      sunset,
      minutesFromSunset,
      level: 'poor',
      warning: `Arrives after sunset (${formatShortTime(sunset)})`
    };
  }
  if (minutesFromSunset <= 30) {
    return {
      sunset,
      minutesFromSunset,
      level: 'fair',
      warning: `Arrives ${minutesFromSunset} min before sunset`
    };
  }
  return { sunset, minutesFromSunset, level: null, warning: null };
}

function estimateSunset(lat: number, lon: number, date: Date) {
  const localNoon = new Date(date);
  localNoon.setHours(12, 0, 0, 0);
  const startOfYear = new Date(localNoon.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((localNoon.getTime() - startOfYear.getTime()) / 86400000);
  const rad = Math.PI / 180;
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + 0.5);
  const equationOfTime = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );
  const decl =
    0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
  const latRad = lat * rad;
  const zenith = 90.833 * rad;
  const cosHourAngle = (Math.cos(zenith) / (Math.cos(latRad) * Math.cos(decl))) - Math.tan(latRad) * Math.tan(decl);
  const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosHourAngle))) / rad;
  const tzOffsetMinutes = -localNoon.getTimezoneOffset();
  const sunsetMinutes = 720 - 4 * (lon - hourAngle) - equationOfTime + tzOffsetMinutes;
  const sunset = new Date(localNoon);
  sunset.setHours(0, 0, 0, 0);
  sunset.setMinutes(Math.round(sunsetMinutes));
  return sunset;
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
    const route = params.get('route');
    const nodes = route ? parseRouteTokens(route, marinas) : restoreLegacyStops(params.get('stops'), marinas);
    return { vesselKey, departAt, speedKt, nodes };
  } catch {
    return null;
  }
}

function writeFloatPlanHash(plan: { vesselKey: VesselKey; departAt: string; speedKt: number; nodes: RouteNode[]; marinas: Marina[] }) {
  if (typeof window === 'undefined') return;
  if (!plan.nodes.some((node) => node.kind === 'stop')) {
    if (window.location.hash.startsWith('#plan=')) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    return;
  }
  const params = new URLSearchParams();
  params.set('v', plan.vesselKey);
  params.set('d', plan.departAt);
  params.set('s', String(plan.speedKt));
  params.set('route', encodeRouteNodes(plan.nodes, plan.marinas));
  const next = `${window.location.pathname}${window.location.search}#plan=${params.toString()}`;
  window.history.replaceState(null, '', next);
}

function parseRouteTokens(route: string, marinas: Marina[]): RouteNode[] {
  const byToken = new Map<string, Marina>();
  marinas.forEach((marina) => {
    byToken.set(stopTokenForMarina(marina), marina);
    byToken.set(String(marina.id), marina);
  });

  return route.split('|').flatMap((token): RouteNode[] => {
    if (token.startsWith('s:')) {
      const marina = byToken.get(decodeURIComponent(token.slice(2)));
      return marina ? [{ kind: 'stop', marinaId: marina.id }] : [];
    }
    if (token.startsWith('w:')) {
      const [latValue, lonValue] = token.slice(2).split(',');
      const lat = Number(latValue);
      const lon = Number(lonValue);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
      return [{ kind: 'waypoint', id: waypointId(), lat, lon }];
    }
    return [];
  });
}

function restoreLegacyStops(stopsParam: string | null, marinas: Marina[]): RouteNode[] {
  const available = new Set(marinas.map((marina) => marina.id));
  return (stopsParam || '')
    .split(',')
    .map((value) => Number(value))
    .filter((id) => available.has(id))
    .map((marinaId) => ({ kind: 'stop' as const, marinaId }));
}

function encodeRouteNodes(nodes: RouteNode[], marinas: Marina[]) {
  const byId = new Map(marinas.map((marina) => [marina.id, marina]));
  return nodes.flatMap((node) => {
    if (node.kind === 'waypoint') return [`w:${node.lat.toFixed(5)},${node.lon.toFixed(5)}`];
    const marina = byId.get(node.marinaId);
    return marina ? [`s:${encodeURIComponent(stopTokenForMarina(marina))}`] : [];
  }).join('|');
}

function stopTokenForMarina(marina: Marina) {
  return marina.osmId || String(marina.id);
}

function resolveRouteNodes(nodes: RouteNode[], marinas: Marina[]): ResolvedRouteNode[] {
  const byId = new Map(marinas.map((marina) => [marina.id, marina]));
  return nodes.flatMap((node): ResolvedRouteNode[] => {
    if (node.kind === 'waypoint') {
      return [{
        ...node,
        name: 'Waypoint',
        lat: node.lat,
        lon: node.lon
      }];
    }

    const marina = byId.get(node.marinaId);
    return marina ? [{
      ...node,
      name: marina.name,
      lat: marina.lat,
      lon: marina.lon,
      marina
    }] : [];
  });
}

function countRouteStops(nodes: RouteNode[]) {
  return nodes.filter((node) => node.kind === 'stop').length;
}

function cleanRouteNodes(nodes: RouteNode[]) {
  return countRouteStops(nodes) >= 2 ? nodes : nodes.filter((node) => node.kind === 'stop');
}

function waypointId() {
  return `wp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function waypointIcon(L: any) {
  return L.divIcon({
    className: '',
    html: '<div class="plannerWaypointPin" title="Drag waypoint. Click to delete."><span></span></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function nearestLegIndex(nodes: Array<Pick<ResolvedRouteNode, 'lat' | 'lon'>>, point: { lat: number; lon: number }) {
  let best = { index: 0, distance: Number.POSITIVE_INFINITY };
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const distance = pointToSegmentDistance(point, nodes[index], nodes[index + 1]);
    if (distance < best.distance) best = { index, distance };
  }
  return best.index;
}

function pointToSegmentDistance(point: { lat: number; lon: number }, a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const scale = Math.cos(toRadians((a.lat + b.lat) / 2));
  const px = point.lon * scale;
  const py = point.lat;
  const ax = a.lon * scale;
  const ay = a.lat;
  const bx = b.lon * scale;
  const by = b.lat;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
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

type TripLeg = StopRouteLeg | WaypointRouteLeg;

type StopRouteLeg = {
  kind: 'stop';
  stopIndex: number;
  marina: Marina;
  segmentDistance: number;
  cumulativeDistance: number;
  arrive: Date;
  conditions: ReturnType<typeof conditionsFor>;
  score: number;
  tide: TideState | null;
  daylight: DaylightArrival;
  currentAdvisories: CurrentAdvisory[];
  crossesLand: boolean;
};

type DaylightArrival = {
  sunset: Date;
  minutesFromSunset: number;
  level: 'fair' | 'poor' | null;
  warning: string | null;
};

type CurrentAdvisory = {
  passId: string;
  passName: string;
  level: 'fair' | 'poor';
  text: string;
};

type WaypointRouteLeg = {
  kind: 'waypoint';
  id: string;
  segmentDistance: number;
  cumulativeDistance: number;
  arrive: Date;
  crossesLand: boolean;
};

function buildTripLegs(
  nodes: ResolvedRouteNode[],
  departAt: string,
  speedKt: number,
  dayIndex: number,
  vessel: VesselProfile,
  weeklyOutlooks: PlannerOutlooks = {},
  liveTides: Record<number, LiveTide> = {},
  currentForecasts: CurrentForecasts = {},
  landCollisions: LandCollisionBySegment = {}
): TripLeg[] {
  const speed = Math.max(4, speedKt || DEFAULT_SPEED_KT);
  const depart = new Date(departAt || defaultDepartInput());
  let cursor = new Date(departAt || defaultDepartInput());
  let cumulativeDistance = 0;
  let stopIndex = 0;

  return nodes.map((node, index): TripLeg => {
    const previous = nodes[index - 1];
    const segmentDistance = previous ? legNm(previous, node) : 0;
    cumulativeDistance += segmentDistance;
    cursor = new Date(cursor.getTime() + (segmentDistance / speed) * 3600000);
    const crossesLand = landCollisions[index] === true;

    if (node.kind === 'waypoint') {
      return {
        kind: 'waypoint',
        id: node.id,
        segmentDistance,
        cumulativeDistance,
        arrive: new Date(cursor),
        crossesLand
      };
    }

    stopIndex += 1;
    const arrivalDayIndex = dayIndexForArrival(depart, cursor, dayIndex);
    const conditions = conditionsFor(node.marina, arrivalDayIndex, weeklyOutlooks);
    const tide = node.marina.waterType === 'lake' || node.marina.waterType === 'river'
      ? null
      : tideState(node.marina, cursor, liveTides[node.marina.id]);
    const daylight = daylightArrival(node.marina, cursor);
    const currentAdvisories = previous
      ? currentAdvisoriesForSegment(previous, node, depart, speed, cumulativeDistance - segmentDistance, currentForecasts)
      : [];
    return {
      kind: 'stop',
      stopIndex,
      marina: node.marina,
      segmentDistance,
      cumulativeDistance,
      arrive: new Date(cursor),
      conditions,
      score: marinaScore(node.marina, arrivalDayIndex, vessel, weeklyOutlooks),
      tide,
      daylight,
      currentAdvisories,
      crossesLand
    };
  });
}

function tripSummary(legs: TripLeg[]) {
  const stops = legs.filter((leg): leg is StopRouteLeg => leg.kind === 'stop');
  if (!stops.length) return { score: 50, maxWind: 0, maxWave: 0, finish: new Date() };
  return {
    score: Math.round(stops.reduce((sum, leg) => sum + leg.score, 0) / stops.length),
    maxWind: Math.max(...stops.map((leg) => leg.conditions.wind)),
    maxWave: Math.max(...stops.map((leg) => leg.conditions.wave)),
    finish: legs[legs.length - 1].arrive
  };
}

function buildFloatPlanText(
  nodes: ResolvedRouteNode[],
  vessel: VesselProfile,
  departAt: string,
  speedKt: number,
  dayIndex: number,
  weeklyOutlooks: PlannerOutlooks = {},
  liveTides: Record<number, LiveTide> = {},
  currentForecasts: CurrentForecasts = {},
  landCollisions: LandCollisionBySegment = {}
) {
  const legs = buildTripLegs(nodes, departAt, speedKt, dayIndex, vessel, weeklyOutlooks, liveTides, currentForecasts, landCollisions);
  const summary = tripSummary(legs);
  const depart = new Date(departAt || defaultDepartInput());
  const lines = [
    'FAIRTIDE float plan',
    `Vessel: ${vessel.label}`,
    `Depart: ${formatShortDateTime(depart)}`,
    `Cruise speed: ${speedKt || DEFAULT_SPEED_KT} kt`,
    ''
  ];
  legs.filter((leg): leg is StopRouteLeg => leg.kind === 'stop').forEach((leg) => {
    lines.push(`${leg.stopIndex}. ${leg.marina.name} - arrive ${formatShortTime(leg.arrive)} - ${leg.cumulativeDistance.toFixed(1)} nm total - wind ${windLabel(leg.conditions)} - seas ${leg.conditions.wave.toFixed(1)}m - sunset ${formatShortTime(leg.daylight.sunset)}${leg.daylight.warning ? ` - ${leg.daylight.warning}` : ''}${leg.tide ? ` - tide ${leg.tide.height.toFixed(1)}m` : ''}`);
    if (leg.crossesLand) {
      lines.push('   Land warning: previous leg crosses land. Add a waypoint around it. Land only; this does not check rocks, shoals, depth, or bridges.');
    }
    leg.currentAdvisories.forEach((advisory) => {
      lines.push(`   Current advisory: ${advisory.text}`);
    });
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
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function toRadians(value: number) {
  return value * Math.PI / 180;
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
