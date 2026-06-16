'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import {
  MARINA_ACCESS_INFO,
  PUBLIC_LAUNCHES,
  type BoatLaunch,
  type Marina
} from '../../lib/marinas';
import { snapMarinaList } from '../../lib/marina-snap';
import { SCORE_BANDS, buildWeeklyOutlook, scoreBand, type DailyOutlook } from '../../lib/outlook';
import { degToCardinal } from '../../lib/format';
import { seoSlugForMarina } from '../../lib/seo-slugs';
import { CURRENT_PASSES, type CurrentEvent, type CurrentPassForecast } from '../../lib/current-passes';
import { LOCATIONS } from '../../lib/locations';
import { HOME_MARINA_STORAGE_KEY, normalizeHomeMarinaId } from '../../lib/home-marina';

type TripMapProps = {
  marinas: Marina[];
};

type SheetState = 'collapsed' | 'half' | 'full';
type PlannerResult =
  | { kind: 'marina'; marina: Marina }
  | { kind: 'launch'; launch: BoatLaunch };
type PlannerOutlooks = Record<string, DailyOutlook[]>;
type CurrentForecasts = Record<string, CurrentPassForecast>;
type RouteStopNode = { kind: 'stop'; marinaId: number };
type RouteWaypointNode = { kind: 'waypoint'; id: string; lat: number; lon: number };
type RouteNode = RouteStopNode | RouteWaypointNode;
type PlanToast = { message: string; undoNodes: RouteNode[] } | null;
type DepartInputParts = { date: string; hour: string; minute: string; meridiem: 'AM' | 'PM' };
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
const DEFAULT_PLANNER_OVERVIEW_ZOOM = 7;
const ALL_MARKERS_OVERVIEW_ZOOM = DEFAULT_PLANNER_OVERVIEW_ZOOM + 1;
const ALL_MARKERS_OVERVIEW_MOBILE_ZOOM = DEFAULT_PLANNER_OVERVIEW_ZOOM;
const ALL_MARKERS_OVERVIEW_CENTER = { lat: 48.78, lon: -123.95 };
const DEFAULT_HOME_MARINA_OVERVIEW_ZOOM = 11;
const DEFAULT_HOME_MARINA_WATER_LON_OFFSET = -0.2;
const DEFAULT_MARINA_FOCUS_ZOOM = 13;
const LINKED_MARINA_FOCUS_ZOOM = DEFAULT_MARINA_FOCUS_ZOOM - 2;
const MOBILE_LINKED_MARINA_FOCUS_ZOOM = 10;
const MAX_CLUSTER_ZOOM = 8;
const CLUSTER_DISTANCE_PX = 46;

export default function TripMap({ marinas }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const timebarRef = useRef<HTMLDivElement | null>(null);
  const sheetInnerRef = useRef<HTMLDivElement | null>(null);
  const listScrollTopRef = useRef(0);
  const restoreListScrollRef = useRef(false);
  const showSheetDetailRef = useRef(false);
  const grabDragStartYRef = useRef<number | null>(null);
  const pendingListScrollMarinaIdRef = useRef<number | null>(null);
  const pendingListScrollFrameRef = useRef<number | null>(null);
  const initialInteractiveMapHandledRef = useRef(false);
  const tripStopSetRef = useRef<Set<number>>(new Set());
  const leafletMapRef = useRef<any>(null);
  const initialMapBoundsRef = useRef<any>(null);
  const pendingMapViewportRef = useRef<{ center: { lat: number; lng: number }; zoom: number } | null>(null);
  const markerRefs = useRef<Record<number, any>>({});
  const launchMarkerRefs = useRef<Record<number, any>>({});
  const userLocationMarkerRef = useRef<any>(null);
  const clusterMarkerRefs = useRef<any[]>([]);
  const clusterRefreshRef = useRef<(() => void) | null>(null);
  const alwaysVisibleClusterIdsRef = useRef<Set<number>>(new Set());
  const routeLineRef = useRef<any>(null);
  const waypointMarkerRefs = useRef<Record<string, any>>({});
  const routeClickHandlerRef = useRef<((latlng: { lat: number; lng: number }) => void) | null>(null);
  const isRouteEditingRef = useRef(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [forecastFocusMarinaId, setForecastFocusMarinaId] = useState<number | null>(null);
  const [selectedLaunchId, setSelectedLaunchId] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>('half');
  const [mobileMarkerModal, setMobileMarkerModal] = useState(false);
  const [isTimebarPinned, setIsTimebarPinned] = useState(false);
  const [timebarHeight, setTimebarHeight] = useState(0);
  const [useMapDayOverlay, setUseMapDayOverlay] = useState(false);
  const [tripMode, setTripMode] = useState(false);
  const [showLaunches, setShowLaunches] = useState(false);
  const [showFreedomOnly, setShowFreedomOnly] = useState(false);
  const [showTransientOnly, setShowTransientOnly] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRouteEditing, setIsRouteEditing] = useState(false);
  const [vesselKey, setVesselKey] = useState<VesselKey>('cruiser');
  const [routeNodes, setRouteNodes] = useState<RouteNode[]>([]);
  const [departAt, setDepartAt] = useState(() => defaultDepartInput());
  const [speedKt, setSpeedKt] = useState(DEFAULT_SPEED_KT);
  const [shareText, setShareText] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [planToast, setPlanToast] = useState<PlanToast>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [mapReadyTick, setMapReadyTick] = useState(0);
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
  const hasRouteWaypoints = useMemo(() => routeNodes.some((node) => node.kind === 'waypoint'), [routeNodes]);
  const tripStopSet = useMemo(() => new Set(tripStops), [tripStops]);
  const tripStopOrder = useMemo(() => {
    return new Map(tripStops.map((id, index) => [id, index + 1]));
  }, [tripStops]);
  const resolvedRouteNodes = useMemo(() => resolveRouteNodes(routeNodes, activeMarinas), [routeNodes, activeMarinas]);
  const tripTray = useMemo(() => {
    const legs = buildTripLegs(resolvedRouteNodes, departAt, speedKt, dayIndex, vessel, weeklyOutlooks, liveTides, currentForecasts);
    return tripSummary(legs);
  }, [currentForecasts, dayIndex, departAt, liveTides, resolvedRouteNodes, speedKt, vessel, weeklyOutlooks]);
  const marinaListIndex = useMemo(() => {
    return new Map(activeMarinas.map((marina, index) => [marina.id, index + 1]));
  }, [activeMarinas]);
  const visibleMarinas = useMemo(() => {
    return activeMarinas.filter((marina) => {
      if (showFreedomOnly && !marina.freedomClub) return false;
      if (showTransientOnly && !isTransientFriendly(marina)) return false;
      return true;
    });
  }, [activeMarinas, showFreedomOnly, showTransientOnly]);

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
  const forecastFocusMarina = selected
    ?? (forecastFocusMarinaId ? activeMarinas.find((marina) => marina.id === forecastFocusMarinaId) ?? null : null);
  const focusedMarinaId = selectedId ?? forecastFocusMarinaId;
  const selectedLaunch = selectedLaunchId ? launches.find((launch) => launch.id === selectedLaunchId) ?? null : null;
  const showSheetDetail = Boolean((selected || selectedLaunch) && !mobileMarkerModal);
  const planButtonLabel = tripStops.length ? `View float plan (${tripStops.length})` : 'Plan a trip';
  const showTripTray = tripStops.length > 0 && !tripMode && !showSheetDetail;

  useEffect(() => {
    showSheetDetailRef.current = showSheetDetail;
  }, [showSheetDetail]);

  useEffect(() => {
    if (initialInteractiveMapHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const marinaSlug = params.get('marina');
    if (!marinaSlug) return;

    const marina = activeMarinas.find((candidate) => seoSlugForMarina(candidate) === marinaSlug);
    if (!marina) return;
    if (!leafletMapRef.current || !markerRefs.current[marina.id]) return;

    initialInteractiveMapHandledRef.current = true;
    focusLinkedMarina(marina);
  }, [activeMarinas, mapReadyTick]);

  useEffect(() => {
    tripStopSetRef.current = tripStopSet;
  }, [tripStopSet]);

  useEffect(() => {
    alwaysVisibleClusterIdsRef.current = new Set([
      ...(selectedId == null ? [] : [selectedId]),
      ...(forecastFocusMarinaId == null ? [] : [forecastFocusMarinaId]),
      ...tripStops
    ]);
    clusterRefreshRef.current?.();
  }, [forecastFocusMarinaId, selectedId, tripStops]);

  useEffect(() => {
    if (!planToast) return;
    const timer = window.setTimeout(() => setPlanToast(null), 5200);
    return () => window.clearTimeout(timer);
  }, [planToast]);

  useEffect(() => {
    setActiveMarinas(snapMarinaList(marinas));
  }, [marinas]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)');
    if (media.matches) setSheetState('collapsed');
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)');
    setUseMapDayOverlay(media.matches);

    function handleChange(event: MediaQueryListEvent) {
      setUseMapDayOverlay(event.matches);
    }

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
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
    const sheet = sheetInnerRef.current;
    if (!sheet) return;

    const frame = window.requestAnimationFrame(() => {
      const pendingMarinaId = pendingListScrollMarinaIdRef.current;
      if (pendingMarinaId != null && !showSheetDetail && !tripMode) {
        if (scrollPendingMarinaIntoView('smooth')) return;
      }

      if (showSheetDetail) {
        sheet.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }

      if (restoreListScrollRef.current) {
        sheet.scrollTo({ top: listScrollTopRef.current, behavior: 'auto' });
        restoreListScrollRef.current = false;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [routeNodes, selectedId, selectedLaunchId, showSheetDetail, tripMode]);

  useEffect(() => {
    if (!tripMode) return;
    const frame = window.requestAnimationFrame(() => {
      sheetInnerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tripMode]);

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
    const locationIds = [...new Set(activeMarinas.map(weatherLocationIdFor).filter(Boolean))] as string[];
    if (!locationIds.length) {
      setWeeklyOutlooks({});
      return;
    }

    let cancelled = false;
    Promise.all(locationIds.map(async (locationId) => {
      try {
        const res = await fetch(`/api/${locationId}/forecast?hours=120`);
        if (!res.ok) return null;
        const data = await res.json();
        return [
          locationId,
          buildWeeklyOutlook(data?.forecast ?? [], data?.sunByDay ?? [], 5)
        ] as const;
      } catch {
        return null;
      }
    }))
      .then((entries) => {
        if (!cancelled) setWeeklyOutlooks(Object.fromEntries(entries.filter((entry): entry is [string, DailyOutlook[]] => entry != null)));
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
    if ((!showFreedomOnly && !showTransientOnly) || selectedId == null) return;
    const selectedMarina = activeMarinas.find((marina) => marina.id === selectedId);
    if (selectedMarina && ((showFreedomOnly && !selectedMarina.freedomClub) || (showTransientOnly && !isTransientFriendly(selectedMarina)))) {
      setSelectedId(null);
      setForecastFocusMarinaId(null);
      setMobileMarkerModal(false);
    }
  }, [activeMarinas, selectedId, showFreedomOnly, showTransientOnly]);

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
      }).setView([49.25, -123.12], DEFAULT_PLANNER_OVERVIEW_ZOOM);
      leafletMapRef.current = map;
      map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        routeClickHandlerRef.current?.(event.latlng);
      });
      const handlePopupButtonClick = (event: MouseEvent) => {
        const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-planner-pin-action]');
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        const action = button.dataset.plannerPinAction;
        const id = Number(button.dataset.marinaId);
        const marina = activeMarinas.find((candidate) => candidate.id === id);
        if (!marina) return;
        if (action === 'toggle') {
          const isAdding = !tripStopSetRef.current.has(id);
          if (isAdding) {
            pendingListScrollMarinaIdRef.current = id;
            setTripMode(false);
            setSelectedId(null);
            setForecastFocusMarinaId(id);
            setSelectedLaunchId(null);
            setMobileMarkerModal(false);
            setSheetState('full');
          }
          toggleTripStop(id);
          map.closePopup();
        } else if (action === 'detail') {
          rememberListScroll();
          setSelectedId(id);
          setForecastFocusMarinaId(id);
          setSelectedLaunchId(null);
          setMobileMarkerModal(false);
          setSheetState('full');
          setIsFullscreen(false);
        }
      };
      map.getContainer().addEventListener('click', handlePopupButtonClick);

      L.control.zoom({ position: isMobilePlanner() ? 'bottomright' : 'topleft' }).addTo(map);
      const locateControl = new L.Control({ position: isMobilePlanner() ? 'bottomright' : 'topleft' });
      locateControl.onAdd = () => {
        const container = L.DomUtil.create('div', 'leaflet-bar plannerLocateControl');
        const button = L.DomUtil.create('button', 'plannerLocateButton', container);
        button.type = 'button';
        button.title = 'Show my location';
        button.setAttribute('aria-label', 'Show my location');
        button.innerHTML = '<span aria-hidden="true"></span>';
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        L.DomEvent.on(button, 'click', (event: Event) => {
          L.DomEvent.preventDefault(event);
          if (!navigator.geolocation) {
            button.title = 'Location is not available in this browser';
            return;
          }

          button.classList.add('is-loading');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const latlng: [number, number] = [position.coords.latitude, position.coords.longitude];
              const icon = L.divIcon({
                className: '',
                html: '<div class="tripMe"><div class="tripMeRing"></div><div class="tripMeCore"></div></div>',
                iconSize: [34, 34],
                iconAnchor: [17, 17]
              });

              if (userLocationMarkerRef.current) {
                userLocationMarkerRef.current.setLatLng(latlng);
                userLocationMarkerRef.current.setIcon(icon);
              } else {
                userLocationMarkerRef.current = L.marker(latlng, {
                  icon,
                  zIndexOffset: 900
                }).addTo(map);
              }

              map.setView(latlng, Math.max(map.getZoom(), 13), { animate: true });
              button.classList.remove('is-loading');
              button.classList.add('is-active');
              button.title = 'Location shown';
            },
            () => {
              button.classList.remove('is-loading');
              button.title = 'Location permission was denied';
            },
            {
              enableHighAccuracy: true,
              maximumAge: 60000,
              timeout: 10000
            }
          );
        });
        return container;
      };
      locateControl.addTo(map);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', {
        maxZoom: 20,
        subdomains: 'abcd',
        crossOrigin: true,
        attribution: '&copy; CARTO &copy; OpenStreetMap'
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      const initialBounds = L.latLngBounds([]);

      visibleMarinas.forEach((marina) => {
        bounds.extend([marina.lat, marina.lon]);
        if (isInitialBcFocus(marina)) {
          initialBounds.extend([marina.lat, marina.lon]);
        }
        const marker = L.marker([marina.lat, marina.lon], {
          icon: marinaIcon(L, marina, marinaListIndex.get(marina.id) ?? marina.id, tripStopOrder.get(marina.id), focusedMarinaId, tripStopSet.has(marina.id), dayIndex, vessel, weeklyOutlooks),
          bubblingMouseEvents: false,
          zIndexOffset: marina.freedomClub ? 600 : 0
        }).addTo(map);
        marker.bindPopup(marinaPopupHtml(marina, dayIndex, vessel, weeklyOutlooks, tripStopSet.has(marina.id), tripStopOrder.get(marina.id)));
        marker.on('click', () => {
          if (isMobilePlanner()) {
            rememberListScroll();
            setSelectedId(marina.id);
            setSelectedLaunchId(null);
            setMobileMarkerModal(true);
            setSheetState('collapsed');
          } else {
            revealMarinaInList(marina.id);
            marker.openPopup();
          }
        });
        markerRefs.current[marina.id] = marker;
      });

      const refreshClusters = () => {
        updatePlannerClusters(
          L,
          map,
          visibleMarinas,
          markerRefs.current,
          clusterMarkerRefs.current,
          alwaysVisibleClusterIdsRef.current
        );
      };
      clusterRefreshRef.current = refreshClusters;
      map.on('zoomend moveend', refreshClusters);
      refreshClusters();

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
            rememberListScroll();
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

      const loadBounds = wantsAllMarkersOverview() && bounds.isValid()
        ? bounds
        : initialBounds.isValid()
          ? initialBounds
          : bounds;
      initialMapBoundsRef.current = loadBounds;
      applyInitialPlannerMapView(map, loadBounds, false, activeMarinas);
      restorePreservedMapViewport(map);
      setMapReadyTick((tick) => tick + 1);

      setTimeout(() => {
        if (!disposed && leafletMapRef.current === map) {
          map.invalidateSize();
          applyInitialPlannerMapView(map, loadBounds, false, activeMarinas);
          restorePreservedMapViewport(map, true);
        }
      }, 0);

      cleanup = () => {
        markerRefs.current = {};
        launchMarkerRefs.current = {};
        clusterMarkerRefs.current.forEach((marker) => marker.remove());
        clusterMarkerRefs.current = [];
        clusterRefreshRef.current = null;
        waypointMarkerRefs.current = {};
        userLocationMarkerRef.current = null;
        routeLineRef.current = null;
        leafletMapRef.current = null;
        initialMapBoundsRef.current = null;
        map.getContainer().removeEventListener('click', handlePopupButtonClick);
        map.remove();
      };
    }

    mountMap();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [activeMarinas, launches, showLaunches, visibleMarinas]);

  useEffect(() => {
    let disposed = false;
    import('leaflet').then((L) => {
      if (disposed) return;
      visibleMarinas.forEach((marina) => {
        const marker = markerRefs.current[marina.id];
        if (!marker) return;
        const listIndex = marinaListIndex.get(marina.id) ?? marina.id;
        const order = tripStopOrder.get(marina.id);
        const inPlan = tripStopSet.has(marina.id);
        marker.setIcon(marinaIcon(L, marina, listIndex, order, focusedMarinaId, inPlan, dayIndex, vessel, weeklyOutlooks));
        marker.getPopup?.()?.setContent(marinaPopupHtml(marina, dayIndex, vessel, weeklyOutlooks, inPlan, order));
      });
    });
    clusterRefreshRef.current?.();
    return () => {
      disposed = true;
    };
  }, [dayIndex, focusedMarinaId, marinaListIndex, tripStopOrder, tripStopSet, vessel, visibleMarinas, weeklyOutlooks]);

  useEffect(() => {
    isRouteEditingRef.current = isRouteEditing;
  }, [isRouteEditing]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const map = leafletMapRef.current;
      if (!map) return;
      map.invalidateSize?.();
      applyInitialPlannerMapView(map, initialMapBoundsRef.current, isFullscreen, activeMarinas);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [activeMarinas, isFullscreen]);

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
          const order = tripStopOrder.get(marina.id);
          const inPlan = tripStopSet.has(marina.id);
          marker.setIcon(marinaIcon(L, marina, marinaListIndex.get(marina.id) ?? marina.id, order, focusedMarinaId, inPlan, dayIndex, vessel, weeklyOutlooks));
          marker.getPopup?.()?.setContent(marinaPopupHtml(marina, dayIndex, vessel, weeklyOutlooks, inPlan, order));
          marker.setZIndexOffset(focusedMarinaId === marina.id || inPlan || marina.freedomClub ? 700 : 0);
        }
      });
      clusterRefreshRef.current?.();
    });
    return () => {
      active = false;
    };
  }, [dayIndex, focusedMarinaId, marinaListIndex, tripStopOrder, tripStopSet, vessel, visibleMarinas, weeklyOutlooks]);

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
    };
  }, [activeMarinas, isRouteEditing, routeNodes]);

  useEffect(() => {
    let active = true;
    import('leaflet').then((L) => {
      if (!active) return;
      const map = leafletMapRef.current;
      if (!map) return;
      const coordinates: Array<[number, number]> = resolvedRouteNodes.map((node) => [node.lat, node.lon]);
      const hasWaypoints = routeNodes.some((node) => node.kind === 'waypoint');

      if (countRouteStops(routeNodes) >= 2 && coordinates.length >= 2) {
        const options = routeLineStyle(hasWaypoints);
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs(coordinates);
          routeLineRef.current.setStyle(options);
        } else {
          routeLineRef.current = L.polyline(coordinates, options).addTo(map);
        }
      } else {
        if (routeLineRef.current) {
          routeLineRef.current.remove();
          routeLineRef.current = null;
        }
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
        });
        nextMarker.on('click', () => {
          if (!isRouteEditingRef.current) return;
          setRouteNodes((nodes) => nodes.filter((candidate) => candidate.kind !== 'waypoint' || candidate.id !== node.id));
          setShareText('');
          setShareMessage('');
        });
        waypointMarkerRefs.current[node.id] = nextMarker;
      });
    });

    return () => {
      active = false;
    };
  }, [isRouteEditing, resolvedRouteNodes, routeNodes]);

  function openMarina(marina: Marina) {
    rememberListScroll();
    setSelectedId(marina.id);
    setForecastFocusMarinaId(marina.id);
    setSelectedLaunchId(null);
    setMobileMarkerModal(false);
    setSheetState('full');
    setIsFullscreen(false);
    markerRefs.current[marina.id]?.openPopup?.();
  }

  function revealMarinaInList(marinaId: number) {
    pendingListScrollMarinaIdRef.current = marinaId;
    setQuery('');
    setTripMode(false);
    setShowLaunches(false);
    setSelectedId(null);
    setForecastFocusMarinaId(marinaId);
    setSelectedLaunchId(null);
    setMobileMarkerModal(false);
    setSheetState('full');
    setIsFullscreen(false);
    schedulePendingMarinaScroll();
  }

  function focusLinkedMarina(marina: Marina) {
    const linkedFocusZoom = isMobilePlanner() ? MOBILE_LINKED_MARINA_FOCUS_ZOOM : LINKED_MARINA_FOCUS_ZOOM;
    if (isMobilePlanner()) {
      pendingListScrollMarinaIdRef.current = marina.id;
      setQuery('');
      setTripMode(false);
      setShowLaunches(false);
      setSelectedId(null);
      setForecastFocusMarinaId(marina.id);
      setSelectedLaunchId(null);
      setMobileMarkerModal(false);
      setSheetState('collapsed');
      setIsFullscreen(false);
    } else {
      revealMarinaInList(marina.id);
    }
    centerMapOnMarina(marina, linkedFocusZoom);
    window.setTimeout(() => centerMapOnMarina(marina, linkedFocusZoom), 700);
    window.setTimeout(() => centerMapOnMarina(marina, linkedFocusZoom), 1400);

    const openMarkerPopup = () => {
      markerRefs.current[marina.id]?.openPopup?.();
    };

    window.requestAnimationFrame(openMarkerPopup);
    window.setTimeout(openMarkerPopup, 160);
    window.setTimeout(openMarkerPopup, 420);
    window.setTimeout(openMarkerPopup, 900);
  }

  function centerMapOnMarina(marina: Marina, targetZoom = DEFAULT_MARINA_FOCUS_ZOOM) {
    const applyCenter = () => {
      const map = leafletMapRef.current;
      if (!map) return;
      map.setView([marina.lat, marina.lon], Math.max(map.getZoom(), targetZoom), { animate: true });
      clusterRefreshRef.current?.();
    };

    applyCenter();
    window.requestAnimationFrame(applyCenter);
    window.setTimeout(applyCenter, 120);
    window.setTimeout(applyCenter, 320);
  }

  function openLaunch(launch: BoatLaunch) {
    rememberListScroll();
    setSelectedLaunchId(launch.id);
    setSelectedId(null);
    setForecastFocusMarinaId(null);
    setMobileMarkerModal(false);
    setSheetState('full');
    setIsFullscreen(false);
  }

  function closeSelectedDetail() {
    restoreListScrollRef.current = true;
    setSelectedId(null);
    setForecastFocusMarinaId(null);
    setSelectedLaunchId(null);
    setMobileMarkerModal(false);
  }

  function rememberListScroll() {
    if (showSheetDetailRef.current) return;
    listScrollTopRef.current = sheetInnerRef.current?.scrollTop ?? 0;
  }

  function schedulePendingMarinaScroll() {
    if (pendingListScrollFrameRef.current != null) {
      window.cancelAnimationFrame(pendingListScrollFrameRef.current);
    }

    pendingListScrollFrameRef.current = window.requestAnimationFrame(() => {
      pendingListScrollFrameRef.current = window.requestAnimationFrame(() => {
        pendingListScrollFrameRef.current = null;
        scrollPendingMarinaIntoView('smooth');
      });
    });
  }

  function scrollPendingMarinaIntoView(behavior: ScrollBehavior) {
    const sheet = sheetInnerRef.current;
    const pendingMarinaId = pendingListScrollMarinaIdRef.current;
    if (!sheet || pendingMarinaId == null || showSheetDetailRef.current) return false;

    const row = sheet.querySelector<HTMLElement>(`[data-planner-marina-row="${pendingMarinaId}"]`);
    if (!row) return false;

    const rowTop = row.getBoundingClientRect().top - sheet.getBoundingClientRect().top + sheet.scrollTop;
    sheet.scrollTo({ top: Math.max(0, rowTop - 16), behavior });
    pendingListScrollMarinaIdRef.current = null;
    return true;
  }

  function preserveMapViewportAfterUpdate() {
    const map = leafletMapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    pendingMapViewportRef.current = { center, zoom };
    const restore = () => {
      const liveMap = leafletMapRef.current;
      if (!liveMap) return;
      restorePreservedMapViewport(liveMap, true);
    };
    window.requestAnimationFrame(() => {
      window.setTimeout(restore, 0);
      window.setTimeout(restore, 160);
    });
  }

  function restorePreservedMapViewport(map: any, clear = false) {
    const viewport = pendingMapViewportRef.current;
    if (!viewport) return;
    map.setView(viewport.center, viewport.zoom, { animate: false });
    if (clear) pendingMapViewportRef.current = null;
  }

  function toggleTripStop(marinaId: number, preserveViewport = true) {
    if (preserveViewport) preserveMapViewportAfterUpdate();
    setRouteNodes((nodes) => {
      const marina = activeMarinas.find((candidate) => candidate.id === marinaId);
      if (nodes.some((node) => node.kind === 'stop' && node.marinaId === marinaId)) {
        setPlanToast({
          message: `Removed ${marina?.name ?? 'destination'}`,
          undoNodes: nodes
        });
        return removeStopAndAdjacentWaypoints(nodes, marinaId);
      }
      setPlanToast(null);
      return [...nodes, { kind: 'stop', marinaId }];
    });
    setShareText('');
    setShareMessage('');
  }

  function toggleTripStopFromList(marina: Marina) {
    centerMapOnMarina(marina);
    toggleTripStop(marina.id, false);
  }

  function restorePlanToast() {
    if (!planToast) return;
    setRouteNodes(planToast.undoNodes);
    setPlanToast(null);
    setShareText('');
    setShareMessage('');
  }

  function toggleSheetFromGrab() {
    if (isMobilePlanner()) {
      setSheetState((state) => (state === 'collapsed' ? 'full' : 'collapsed'));
      return;
    }
    setSheetState((state) => nextSheetState(state));
  }

  function handleGrabPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!isMobilePlanner() || sheetState === 'collapsed') return;
    grabDragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleGrabPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const startY = grabDragStartYRef.current;
    grabDragStartYRef.current = null;
    if (startY == null || !isMobilePlanner()) return;
    if (event.clientY - startY > 24) {
      event.stopPropagation();
      setSheetState('collapsed');
    }
  }

  function reorderTripStop(fromIndex: number, toIndex: number) {
    setRouteNodes((nodes) => reorderStopNodes(nodes, fromIndex, toIndex));
    setTripMode(true);
    setShareText('');
    setShareMessage('');
  }

  async function shareFloatPlan() {
    const text = buildFloatPlanText(resolvedRouteNodes, vessel, departAt, speedKt, dayIndex, weeklyOutlooks, liveTides, currentForecasts);
    const url = typeof window === 'undefined' ? '' : window.location.href;
    setShareText('');
    setShareMessage('');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Fair Tide float plan', text, url });
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
    return forecastFocusMarina
      ? marinaScore(forecastFocusMarina, index, vessel, weeklyOutlooks)
      : averageScore(visibleMarinas.length ? visibleMarinas : activeMarinas, index, vessel, weeklyOutlooks);
  }

  function timebarWind(index: number) {
    if (forecastFocusMarina) return windLabel(conditionsFor(forecastFocusMarina, index, weeklyOutlooks));
    const marinasForWind = visibleMarinas.length ? visibleMarinas : activeMarinas;
    if (!marinasForWind.length) return null;
    const averageWind = Math.round(marinasForWind.reduce((sum, marina) => {
      return sum + conditionsFor(marina, index, weeklyOutlooks).wind;
    }, 0) / marinasForWind.length);
    return `${averageWind} kt`;
  }

  function timebarOutlook(index: number) {
    if (forecastFocusMarina?.locationId) {
      const selectedOutlook = weeklyOutlooks[forecastFocusMarina.locationId]?.[index];
      if (selectedOutlook) return selectedOutlook;
    }

    const marinasForDate = visibleMarinas.length ? visibleMarinas : activeMarinas;
    for (const marina of marinasForDate) {
      if (!marina.locationId) continue;
      const outlook = weeklyOutlooks[marina.locationId]?.[index];
      if (outlook) return outlook;
    }

    return null;
  }

  const timebar = (
      <div
        ref={timebarRef}
        className={`plannerTimebar ${isTimebarPinned ? 'plannerTimebarPinned' : ''}`}
        aria-label="Trip date"
      >
        {DAYS.map((label, index) => {
          const score = timebarScore(index);
          const wind = timebarWind(index);
          const outlook = timebarOutlook(index);
          const date = dayChipDate(index, outlook);
          const condition = dayConditionIcon(outlook, score);
          return (
            <button
              key={label}
              type="button"
              className={`plannerDay ${dayIndex === index ? 'active' : ''}`}
              onClick={() => setDayIndex(index)}
              aria-pressed={dayIndex === index}
              style={{
                '--day-score': scoreColor(score),
                '--day-score-width': `${Math.max(8, Math.min(100, score))}%`
              } as CSSProperties}
            >
              <span className="plannerDayTopline">
                <span>
                  <span className="plannerDayLabel">{date.isToday ? 'Today' : date.weekday}</span>
                  <b className="plannerDayDate">{date.monthDay}</b>
                </span>
                <span className="plannerDayIcon" aria-label={condition.label}>{condition.icon}</span>
              </span>
              <span className="plannerDayScoreValue" aria-label={`${score} boating score`}>{score}</span>
              <span className="plannerDayScoreBar" aria-label={`${score} boating score`}>
                <span />
              </span>
              <em className="plannerDayWind">
                <span>{windArrow(outlook?.maxWindDirDeg)}</span>
                <strong>{wind}</strong>
              </em>
            </button>
          );
        })}
      </div>
  );

  return (
    <div className={`plannerWrap ${isFullscreen ? 'plannerWrapExpanded' : ''}`}>
      {useMapDayOverlay ? null : timebar}
      {!useMapDayOverlay && isTimebarPinned ? <div className="plannerTimebarSpacer" style={{ height: timebarHeight }} /> : null}

      <div className={`plannerApp ${isFullscreen ? 'plannerAppExpanded' : ''}`}>
        <div className="plannerMapPane">
          <div ref={mapRef} className="plannerMap" aria-label="Vancouver and Gulf Islands marina map" />
          {useMapDayOverlay ? (
            <div className="plannerMapDayOverlay" aria-label="Trip date controls">
              {timebar}
            </div>
          ) : null}

          <div className="plannerTopbar">
            <button
              className={`plannerChip ${tripMode ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setTripMode((value) => !value);
                setSelectedId(null);
                setForecastFocusMarinaId(null);
                setSelectedLaunchId(null);
                setMobileMarkerModal(false);
                setIsFullscreen(false);
                setSheetState('full');
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              <span>{planButtonLabel}</span>
            </button>
            {tripStops.length >= 2 ? (
              <button
                className={`plannerChip plannerRouteChip ${isRouteEditing ? 'active' : ''}`}
                type="button"
                aria-pressed={isRouteEditing}
                onClick={() => {
                  setIsRouteEditing((value) => !value);
                  setTripMode(true);
                  setSheetState('full');
                  setSelectedId(null);
                  setForecastFocusMarinaId(null);
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
            ) : null}
            <button
              className={`plannerChip ${showTransientOnly ? 'active' : ''}`}
              type="button"
              aria-pressed={showTransientOnly}
              onClick={() => {
                preserveMapViewportAfterUpdate();
                setShowTransientOnly((value) => !value);
                setSelectedId(null);
                setForecastFocusMarinaId(null);
                setMobileMarkerModal(false);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 17h16" />
                <path d="M6 17v-6a4 4 0 0 1 8 0v6" />
                <path d="M14 13h3a3 3 0 0 1 3 3v1" />
                <path d="M8 11h4" />
              </svg>
              <span>Transient friendly</span>
            </button>
            <button
              className={`plannerChip plannerFullscreenChip ${isFullscreen ? 'active' : ''}`}
              type="button"
              aria-pressed={isFullscreen}
              onClick={() => {
                setSelectedId(null);
                setForecastFocusMarinaId(null);
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
            {[...SCORE_BANDS].reverse().map((band) => (
              <span key={band.label}>
                <i className={`score${band.label}`} />
                {band.label} {band.min}-{band.max}
              </span>
            ))}
            {tripStops.length >= 2 ? (
              <span>
                <i className={hasRouteWaypoints ? 'manualLineShape' : 'directLineShape'} />
                {hasRouteWaypoints ? 'Manual line - verify on charts' : 'Direct line - not a navigable route'}
              </span>
            ) : null}
            {showLaunches ? <span><i className="launchShape" />Launch</span> : null}
          </div>

          {mobileMarkerModal && (selected || selectedLaunch) ? (
            <div className="plannerMobileModal" role="dialog" aria-modal="true" aria-label="Marker details">
              <div className="plannerMobileModalCard">
                <button className="plannerMobileModalClose" type="button" onClick={closeSelectedDetail} aria-label="Close marker details">
                  <CloseIcon />
                </button>
                {selected ? (
                  <MarinaDetail
                    marina={selected}
                    dayIndex={dayIndex}
                    vessel={vessel}
                    weeklyOutlooks={weeklyOutlooks}
                    liveTide={liveTides[selected.id]}
                    inTrip={tripStopSet.has(selected.id)}
                    planOrder={tripStopOrder.get(selected.id)}
                    onToggleTrip={() => toggleTripStop(selected.id)}
                    onBack={closeSelectedDetail}
                  />
                ) : selectedLaunch ? (
                  <LaunchDetail
                    launch={selectedLaunch}
                    dayIndex={dayIndex}
                    onBack={closeSelectedDetail}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

      <section
        className={`plannerSheet plannerSheet-${sheetState} ${showSheetDetail ? 'plannerSheet-detail' : ''}`}
        aria-label="Marina results"
        onClick={() => {
          if (sheetState === 'collapsed') setSheetState('full');
        }}
      >
        <button
          type="button"
          className="plannerGrab"
          aria-label={sheetState === 'collapsed' ? 'Open destination sheet' : 'Collapse destination sheet'}
          onClick={(event) => {
            event.stopPropagation();
            toggleSheetFromGrab();
          }}
          onPointerDown={handleGrabPointerDown}
          onPointerUp={handleGrabPointerUp}
        >
          <span />
        </button>

        <div className="plannerSheetInner" ref={sheetInnerRef}>
          {showSheetDetail && selected ? (
            <MarinaDetail
              marina={selected}
              dayIndex={dayIndex}
              vessel={vessel}
              weeklyOutlooks={weeklyOutlooks}
              liveTide={liveTides[selected.id]}
              inTrip={tripStopSet.has(selected.id)}
              planOrder={tripStopOrder.get(selected.id)}
              onToggleTrip={() => toggleTripStop(selected.id)}
              onBack={closeSelectedDetail}
            />
          ) : showSheetDetail && selectedLaunch ? (
            <LaunchDetail
              launch={selectedLaunch}
              dayIndex={dayIndex}
              onBack={closeSelectedDetail}
            />
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
                isRouteEditing={isRouteEditing}
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
              onReorderStop={reorderTripStop}
              onRemoveWaypoint={(id) => {
                setRouteNodes((nodes) => nodes.filter((node) => node.kind !== 'waypoint' || node.id !== id));
                setShareText('');
                setShareMessage('');
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
                    preserveMapViewportAfterUpdate();
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
                <button
                  className={`plannerIconFilter ${showTransientOnly ? 'active' : ''}`}
                  type="button"
                  aria-label="Show transient friendly marinas only"
                  aria-pressed={showTransientOnly}
                  title="Transient friendly only"
                  data-tooltip="Transient friendly only"
                  onClick={() => {
                    preserveMapViewportAfterUpdate();
                    setShowTransientOnly((value) => !value);
                    setSelectedId(null);
                    setForecastFocusMarinaId(null);
                    setMobileMarkerModal(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 17h16" />
                    <path d="M6 17v-6a4 4 0 0 1 8 0v6" />
                    <path d="M14 13h3a3 3 0 0 1 3 3v1" />
                    <path d="M8 11h4" />
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
                    ? `${destinationLabel(showFreedomOnly, showTransientOnly)} and launches`
                    : destinationLabel(showFreedomOnly, showTransientOnly)}
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
                  const inPlan = tripStopSet.has(marina.id);
                  const order = tripStopOrder.get(marina.id);
                  return (
                    <div
                      key={`marina-${marina.id}`}
                      data-planner-marina-row={marina.id}
                      className={`plannerRow ${marina.freedomClub ? 'plannerRowFreedom' : ''} ${inPlan ? 'plannerRowInPlan' : ''}`}
                    >
                      <button
                        type="button"
                        className="plannerRowMain"
                        onClick={() => openMarina(marina)}
                      >
                        <span className={`plannerIdx ${marina.freedomClub ? 'plannerIdxFreedom' : ''} ${inPlan ? 'plannerIdxInPlan' : ''}`}>
                          {inPlan ? order : listIndex}
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
                      <PlanToggleButton
                        compact
                        name={marina.name}
                        inPlan={inPlan}
                        order={order}
                        onToggle={() => toggleTripStopFromList(marina)}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        {showTripTray ? (
          <TripTray
            stopCount={tripStops.length}
            distance={tripTray.distance}
            onOpen={() => {
              setTripMode(true);
              setSelectedId(null);
              setForecastFocusMarinaId(null);
              setSelectedLaunchId(null);
              setMobileMarkerModal(false);
              setIsFullscreen(false);
              setSheetState('full');
            }}
          />
        ) : null}
      </section>
      {planToast ? (
        <div className="plannerToast" role="status" aria-live="polite">
          <span>{planToast.message}</span>
          <button type="button" onClick={restorePlanToast}>Undo</button>
        </div>
      ) : null}
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
  planOrder,
  onToggleTrip,
  onBack
}: {
  marina: Marina;
  dayIndex: number;
  vessel: VesselProfile;
  weeklyOutlooks: PlannerOutlooks;
  liveTide?: LiveTide;
  inTrip: boolean;
  planOrder?: number;
  onToggleTrip: () => void;
  onBack: () => void;
}) {
  const score = marinaScore(marina, dayIndex, vessel, weeklyOutlooks);
  const conditions = conditionsFor(marina, dayIndex, weeklyOutlooks);
  const warning = vesselWarning(conditions, vessel);
  const info = accessInfoFor(marina);
  const tide = marina.waterType === 'lake' || marina.waterType === 'river' || marina.tidal === false
    ? null
    : tideState(marina, plannerTimeForDay(dayIndex), liveTide);

  return (
    <div className="plannerDetail">
      <div className="plannerDetailHeader">
        <button className="plannerBack" type="button" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All marinas
        </button>
        <button className="plannerDetailClose" type="button" aria-label="Close destination detail" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>
      <div className="plannerDetailSummary">
        <div className="plannerDetailTitleRow">
          <div>
            <h1>{marina.name}</h1>
            <p>{marina.address} - {distanceFromHome(marina).toFixed(1)} nm</p>
          </div>
        </div>

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
            <strong>{Math.round(conditions.gust)} <small>kt</small></strong>
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
      </div>
      <div className="plannerDetailFooter">
        <PlanToggleButton
          primary
          name={marina.name}
          inPlan={inTrip}
          order={planOrder}
          onToggle={onToggleTrip}
        />
      </div>
    </div>
  );
}

function PlanToggleButton({
  name,
  inPlan,
  order,
  compact = false,
  primary = false,
  onToggle
}: {
  name: string;
  inPlan: boolean;
  order?: number;
  compact?: boolean;
  primary?: boolean;
  onToggle: () => void;
}) {
  const label = inPlan ? `Remove ${name} from float plan` : `Add ${name} to float plan`;
  return (
    <button
      className={`plannerPlanToggle ${compact ? 'compact' : ''} ${primary ? 'primary' : ''} ${inPlan ? 'active' : ''}`}
      type="button"
      aria-pressed={inPlan}
      aria-label={label}
      onClick={onToggle}
    >
      {compact && inPlan ? null : <span className="plannerPlanToggleIcon">{inPlan ? (order ?? '') : '+'}</span>}
      <span className="plannerPlanToggleText">{inPlan ? 'In plan' : 'Add to trip'}</span>
      {inPlan ? <span className="plannerPlanToggleHover">Remove</span> : null}
    </button>
  );
}

function TripTray({
  stopCount,
  distance,
  onOpen
}: {
  stopCount: number;
  distance: number;
  onOpen: () => void;
}) {
  const stopLabel = `${stopCount} ${stopCount === 1 ? 'stop' : 'stops'}`;
  return (
    <button className="plannerTripTray" type="button" onClick={onOpen} aria-label={`View float plan for ${stopLabel}`}>
      <span>{stopLabel} · {distance.toFixed(1)} nm</span>
      <strong>View float plan →</strong>
    </button>
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="7" y1="7" x2="17" y2="17" />
      <line x1="17" y1="7" x2="7" y2="17" />
    </svg>
  );
}

function LaunchDetail({
  launch,
  dayIndex,
  onBack
}: {
  launch: BoatLaunch;
  dayIndex: number;
  onBack: () => void;
}) {
  const status = launchDepthStatus(launch, plannerTimeForDay(dayIndex));
  return (
    <div className="plannerDetail">
      <div className="plannerDetailHeader">
        <button className="plannerBack" type="button" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All launches
        </button>
        <button className="plannerDetailClose" type="button" aria-label="Close launch detail" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>
      <div className="plannerDetailSummary">
        <div className="plannerDetailTitleRow">
          <div>
            <h1>{launch.name}</h1>
            <p>{launch.area} - {distanceFromHome(launch).toFixed(1)} nm</p>
          </div>
        </div>
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
      </div>
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
  isRouteEditing,
  shareText,
  shareMessage,
  onBack,
  onBrowse,
  onDepartChange,
  onSpeedChange,
  onRemoveStop,
  onReorderStop,
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
  isRouteEditing: boolean;
  shareText: string;
  shareMessage: string;
  onBack: () => void;
  onBrowse: () => void;
  onDepartChange: (value: string) => void;
  onSpeedChange: (value: number) => void;
  onRemoveStop: (id: number) => void;
  onReorderStop: (fromIndex: number, toIndex: number) => void;
  onRemoveWaypoint: (id: string) => void;
  onShare: () => void;
}) {
  const legs = buildTripLegs(routeNodes, departAt, speedKt, dayIndex, vessel, weeklyOutlooks, liveTides, currentForecasts);
  const summary = tripSummary(legs);
  const stopCount = routeNodes.filter((node) => node.kind === 'stop').length;
  const waypointCount = routeNodes.length - stopCount;
  const tripSubtitle = [
    VESSELS[vesselKey].label,
    stopCount ? `${stopCount} stops${waypointCount ? ` + ${waypointCount} waypoints` : ''}` : 'Add stops from the map or list',
    stopCount >= 2 ? `${summary.distance.toFixed(1)} nm` : null,
    stopCount >= 2 ? `~${formatDuration(summary.durationMinutes)}` : null,
    stopCount >= 2 ? `ETA ${formatShortTime(summary.finish)}` : null
  ].filter(Boolean).join(' - ');
  const departParts = departInputParts(departAt);
  const updateDepartPart = (patch: Partial<DepartInputParts>) => {
    onDepartChange(updateDepartInput(departAt, patch));
  };

  return (
    <div className="plannerDetail plannerTripView">
      <button className="plannerBack" type="button" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to marinas
      </button>
      <h1>Float plan</h1>
      <p>{tripSubtitle}</p>

      <div className="plannerTripControls">
        <label className="plannerDepartDate">
          <span>Depart</span>
          <input type="date" value={departParts.date} onChange={(event) => updateDepartPart({ date: event.target.value })} />
        </label>
        <div className="plannerDepartTime" aria-label="Departure time">
          <span className="plannerDepartTimeLabel">Time</span>
          <div className="plannerDepartTimeFields">
            <select value={departParts.hour} onChange={(event) => updateDepartPart({ hour: event.target.value })}>
              {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((hour) => (
                <option key={hour} value={hour}>{hour}</option>
              ))}
            </select>
            <span className="plannerDepartSeparator" aria-hidden>:</span>
            <select value={departParts.minute} onChange={(event) => updateDepartPart({ minute: event.target.value })}>
              {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map((minute) => (
                <option key={minute} value={minute}>{minute}</option>
              ))}
            </select>
          </div>
          <div className="plannerDepartMeridiem" role="group" aria-label="AM or PM">
            {(['AM', 'PM'] as const).map((meridiem) => (
              <button
                key={meridiem}
                type="button"
                className={departParts.meridiem === meridiem ? 'active' : ''}
                aria-pressed={departParts.meridiem === meridiem}
                onClick={() => updateDepartPart({ meridiem })}
              >
                {meridiem}
              </button>
            ))}
          </div>
        </div>
        <label className="plannerTripSpeed">
          <span>Speed</span>
          <span className="plannerSpeedInput">
            <input
              type="number"
              min="4"
              max="45"
              step="1"
              value={speedKt}
              onChange={(event) => onSpeedChange(Number(event.target.value) || DEFAULT_SPEED_KT)}
            />
            <span>kt</span>
          </span>
          <span
            className="plannerTripScoreIndicator"
            style={{ '--trip-score-color': scoreColor(summary.score) } as CSSProperties}
          >
            <span>Trip score</span>
            <strong>{summary.score}/100 {verdict(summary.score)}</strong>
          </span>
        </label>
      </div>

      {stopCount ? (
        <>
          {stopCount < 2 || isRouteEditing || waypointCount ? (
            <p className="plannerTinyText">
              {stopCount < 2
                ? 'Add a second stop to show direct distance and ETA estimates.'
                : isRouteEditing
                  ? 'Click the map line to add a manual waypoint. Drag handles to shape your own course; verify on charts.'
                  : 'Manual waypoints are user-shaped course references. Verify on charts.'}
            </p>
          ) : null}
          {stopCount >= 2 ? (
            <div className="plannerRouteNotice">
              {waypointCount
                ? 'Manual line - verify your own course on charts.'
                : 'Direct line - not a navigable route. Verify your own course.'}
            </div>
          ) : null}
          <div className="plannerVerdictBar" style={{ background: scoreColor(summary.score) }}>
            {verdict(summary.score)} for {vessel.label.toLowerCase()}
          </div>
          <div className="plannerTripLegs">
            {legs.map((leg) => {
              if (leg.kind === 'waypoint') {
                return (
                  <div className="plannerLeg plannerWaypointLeg" key={leg.id}>
                    <span className="plannerLegNode waypoint">•</span>
                    <div>
                      <strong>Waypoint</strong>
                      <span>{leg.cumulativeDistance.toFixed(1)} nm direct from start</span>
                      <button type="button" onClick={() => onRemoveWaypoint(leg.id)}>Delete waypoint</button>
                    </div>
                  </div>
                );
              }

              const warning = vesselWarning(leg.conditions, vessel);
              return (
                <div
                  className="plannerLeg plannerStopLeg"
                  key={leg.marina.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(leg.stopIndex - 1));
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromIndex = Number(event.dataTransfer.getData('text/plain'));
                    if (Number.isFinite(fromIndex)) onReorderStop(fromIndex, leg.stopIndex - 1);
                  }}
                >
                  <span className="plannerLegNode stop">{leg.stopIndex}</span>
                  <div>
                    <strong>{leg.marina.name}</strong>
                    <StopMetricGrid leg={leg} />
                    {warning ? <em className={`plannerWarning ${warning.level}`}>{warning.text}</em> : null}
                    {leg.daylight.warning ? <em className={`plannerWarning ${leg.daylight.level}`}>{leg.daylight.warning}</em> : null}
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
          <button className="plannerPrimary plannerSharePlanButton" type="button" onClick={onShare}>Share float plan</button>
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

function StopMetricGrid({ leg }: { leg: StopRouteLeg }) {
  const metrics = [
    { label: 'Arrive', value: formatShortTime(leg.arrive) },
    leg.stopIndex > 1 ? { label: 'Leg', value: `${leg.segmentDistance.toFixed(1)} nm direct` } : null,
    leg.stopIndex > 1 ? { label: 'Total', value: `${leg.cumulativeDistance.toFixed(1)} nm direct` } : null,
    { label: 'Wind', value: windLabel(leg.conditions) },
    { label: 'Seas', value: `${leg.conditions.wave.toFixed(1)}m` },
    { label: 'Sunset', value: formatShortTime(leg.daylight.sunset) },
    leg.tide ? { label: 'Tide', value: `${leg.tide.height.toFixed(1)}m` } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <dl className="plannerStopMetrics">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function marinaIcon(L: any, marina: Marina, listIndex: number, tripOrder: number | undefined, selectedId: number | null, inTrip: boolean, dayIndex: number, vessel: VesselProfile, weeklyOutlooks: PlannerOutlooks = {}) {
  const score = marinaScore(marina, dayIndex, vessel, weeklyOutlooks);
  const cls = `${marina.freedomClub ? 'freedom' : ''} ${selectedId === marina.id ? 'sel' : ''} ${inTrip ? 'trip' : ''}`;
  const title = escapeHtml(`${listIndex}. ${marina.name} - score ${score}`);
  const bubble = inTrip ? tripOrder ?? listIndex : listIndex;
  return L.divIcon({
    className: '',
    html: `<div class="plannerPin ${cls}" title="${title}" style="--pin-score:${scoreColor(score)}"><span class="plannerPinScore"></span><span class="plannerPinBubble">${bubble}</span><span class="plannerPinTail"></span></div>`,
    iconSize: [40, 46],
    iconAnchor: [20, 44],
    popupAnchor: [0, -44]
  });
}

function marinaPopupHtml(
  marina: Marina,
  dayIndex: number,
  vessel: VesselProfile,
  weeklyOutlooks: PlannerOutlooks,
  inPlan: boolean,
  order?: number
) {
  const score = marinaScore(marina, dayIndex, vessel, weeklyOutlooks);
  const distance = distanceFromHome(marina).toFixed(1);
  const label = inPlan ? 'Remove' : 'Add to trip';
  const badge = inPlan ? `<span class="plannerPinPopupOrder">${order ?? ''}</span>` : '';
  return `
    <div class="plannerPinPopup">
      <div class="plannerPinPopupHead">
        <strong>${escapeHtml(marina.name)}</strong>
        ${badge}
      </div>
      <span>${score} score · ${distance} nm · ${escapeHtml(windLabel(conditionsFor(marina, dayIndex, weeklyOutlooks)))}</span>
      <div class="plannerPinPopupActions">
        <button type="button" data-planner-pin-action="toggle" data-marina-id="${marina.id}" aria-pressed="${inPlan}">
          ${inPlan ? '✓ In plan' : '+ Add to trip'}
          <em>${label}</em>
        </button>
        <button type="button" data-planner-pin-action="detail" data-marina-id="${marina.id}">Details</button>
      </div>
    </div>
  `;
}

function launchIcon(L: any, launch: BoatLaunch) {
  return L.divIcon({
    className: '',
    html: `<div class="plannerLaunchPin" title="${escapeHtml(launch.name)}"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="22"/><path d="M5 12a7 7 0 0 0 14 0"/></svg></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

function updatePlannerClusters(
  L: any,
  map: any,
  marinas: Marina[],
  markers: Record<number, any>,
  clusterMarkers: any[],
  alwaysVisibleIds: Set<number>
) {
  clusterMarkers.forEach((marker) => marker.remove());
  clusterMarkers.length = 0;

  if (map.getZoom() > MAX_CLUSTER_ZOOM) {
    marinas.forEach((marina) => {
      const marker = markers[marina.id];
      if (marker && !marker._map) marker.addTo(map);
    });
    return;
  }

  const clusters: Array<{
    lat: number;
    lon: number;
    count: number;
    ids: number[];
    point: { x: number; y: number };
  }> = [];

  marinas.forEach((marina) => {
    const marker = markers[marina.id];
    if (!marker) return;

    if (alwaysVisibleIds.has(marina.id)) {
      if (!marker._map) marker.addTo(map);
      return;
    }

    const point = map.latLngToLayerPoint([marina.lat, marina.lon]);
    const cluster = clusters.find((candidate) => {
      const dx = candidate.point.x - point.x;
      const dy = candidate.point.y - point.y;
      return Math.sqrt(dx * dx + dy * dy) <= CLUSTER_DISTANCE_PX;
    });

    if (cluster) {
      cluster.lat = (cluster.lat * cluster.count + marina.lat) / (cluster.count + 1);
      cluster.lon = (cluster.lon * cluster.count + marina.lon) / (cluster.count + 1);
      cluster.point = {
        x: (cluster.point.x * cluster.count + point.x) / (cluster.count + 1),
        y: (cluster.point.y * cluster.count + point.y) / (cluster.count + 1)
      };
      cluster.count += 1;
      cluster.ids.push(marina.id);
    } else {
      clusters.push({
        lat: marina.lat,
        lon: marina.lon,
        count: 1,
        ids: [marina.id],
        point
      });
    }
  });

  const clusteredIds = new Set<number>();
  clusters.forEach((cluster) => {
    if (cluster.count < 2) return;
    cluster.ids.forEach((id) => clusteredIds.add(id));
    const clusterMarker = L.marker([cluster.lat, cluster.lon], {
      icon: clusterIcon(L, cluster.count),
      zIndexOffset: 900,
      bubblingMouseEvents: false
    }).addTo(map);
    clusterMarker.on('click', () => {
      map.setView([cluster.lat, cluster.lon], Math.min(map.getZoom() + 2, 18), { animate: true });
    });
    clusterMarkers.push(clusterMarker);
  });

  marinas.forEach((marina) => {
    const marker = markers[marina.id];
    if (!marker) return;
    if (clusteredIds.has(marina.id)) {
      if (marker._map) marker.remove();
    } else if (!marker._map) {
      marker.addTo(map);
    }
  });
}

function clusterIcon(L: any, count: number) {
  return L.divIcon({
    className: '',
    html: `<button type="button" class="plannerCluster" aria-label="${count} overlapping destinations">${count}</button>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  });
}

function routeLineStyle(hasWaypoints: boolean) {
  return {
    color: '#0e7490',
    weight: hasWaypoints ? 4 : 2,
    opacity: hasWaypoints ? 0.85 : 0.35,
    dashArray: hasWaypoints ? undefined : '2 9',
    lineCap: 'round' as const,
    lineJoin: 'round' as const
  };
}

function dayChipDate(offset: number, outlook?: DailyOutlook | null) {
  const d = outlook?.day ? new Date(`${outlook.day}T12:00:00`) : new Date();
  if (!outlook?.day) d.setDate(d.getDate() + offset);
  const today = new Date();
  const isToday = d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate();
  return {
    isToday,
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  };
}

function dayConditionIcon(outlook: DailyOutlook | null | undefined, score: number) {
  const precipMm = outlook?.totalPrecipMm ?? 0;
  const precipProb = outlook?.maxPrecipProb ?? 0;
  if (precipMm >= 1.5 || precipProb >= 55) return { icon: '☔', label: 'Rain likely' };
  if (precipMm >= 0.2 || precipProb >= 30 || score < 62) return { icon: '☁', label: 'Cloudy' };
  return { icon: '☀', label: 'Clear' };
}

function windArrow(deg?: number) {
  if (typeof deg !== 'number' || !Number.isFinite(deg)) return '→';
  const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
  return arrows[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function nextSheetState(state: SheetState): SheetState {
  if (state === 'full') return 'half';
  if (state === 'half') return 'collapsed';
  return 'full';
}

function isInitialBcFocus(location: Pick<Marina | BoatLaunch, 'lat' | 'lon'>) {
  return location.lat >= 49.0 && location.lat <= 49.55 && location.lon >= -123.5 && location.lon <= -122.65;
}

function isMobilePlanner() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches;
}

function applyInitialPlannerMapView(map: any, bounds: any, isExpanded: boolean, marinas: Marina[]) {
  const searchParams = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
  const linkedMarinaSlug = searchParams?.get('marina') ?? null;
  const linkedMarina = linkedMarinaSlug
    ? marinas.find((marina) => seoSlugForMarina(marina) === linkedMarinaSlug) ?? null
    : null;
  const hasLinkedMarina = Boolean(linkedMarinaSlug);
  const showAllMarkersOverview = searchParams?.get('overview') === 'all';
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches;
  const homeMarina = isDesktop && !hasLinkedMarina ? findPlannerHomeMarina(marinas) : null;

  if (showAllMarkersOverview) {
    const isMobileOverview = isMobilePlanner();
    map.setView(
      [ALL_MARKERS_OVERVIEW_CENTER.lat, ALL_MARKERS_OVERVIEW_CENTER.lon],
      isMobileOverview ? ALL_MARKERS_OVERVIEW_MOBILE_ZOOM : ALL_MARKERS_OVERVIEW_ZOOM,
      { animate: false }
    );
    return;
  }

  if (linkedMarina) {
    const linkedFocusZoom = isMobilePlanner() ? MOBILE_LINKED_MARINA_FOCUS_ZOOM : LINKED_MARINA_FOCUS_ZOOM;
    map.setView([linkedMarina.lat, linkedMarina.lon], linkedFocusZoom, { animate: false });
    return;
  }

  if (homeMarina) {
    map.setView([homeMarina.lat, homeMarina.lon + DEFAULT_HOME_MARINA_WATER_LON_OFFSET], DEFAULT_HOME_MARINA_OVERVIEW_ZOOM, { animate: false });
    return;
  }

  fitPlannerMap(map, bounds, isExpanded);
}

function wantsAllMarkersOverview() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('overview') === 'all';
}

function findPlannerHomeMarina(marinas: Marina[]) {
  const homeId = normalizeHomeMarinaId(
    typeof window === 'undefined' ? null : window.localStorage.getItem(HOME_MARINA_STORAGE_KEY)
  );
  return (
    marinas.find((marina) => marina.locationId === homeId && marina.freedomClub) ??
    marinas.find((marina) => marina.locationId === homeId) ??
    null
  );
}

function fitPlannerMap(map: any, bounds: any, isExpanded: boolean, maxZoom = DEFAULT_PLANNER_OVERVIEW_ZOOM) {
  if (!map || !bounds?.isValid?.()) return;
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches;
  map.fitBounds(bounds.pad(0.16), {
    animate: false,
    maxZoom,
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
  const locationId = weatherLocationIdFor(marina);
  if (!locationId) return null;
  return weeklyOutlooks[locationId]?.[dayIndex] ?? null;
}

const NEAREST_WEATHER_ANCHOR_MAX_KM = 45;

function weatherLocationIdFor(marina: Marina) {
  if (marina.locationId) return marina.locationId;

  let best: { id: string; distanceKm: number } | null = null;
  for (const location of Object.values(LOCATIONS)) {
    const distanceKm = haversine(marina.lat, marina.lon, location.lat, location.lon) / 1000;
    if (!best || distanceKm < best.distanceKm) {
      best = { id: location.id, distanceKm };
    }
  }

  return best && best.distanceKm <= NEAREST_WEATHER_ANCHOR_MAX_KM ? best.id : null;
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
  return scoreBand(score).color;
}

function verdict(score: number) {
  return scoreBand(score).label;
}

function distanceFromHome(place: { lat: number; lon: number }) {
  const metres = haversine(HOME.lat, HOME.lon, place.lat, place.lon);
  return metres / 1852;
}

function legNm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  return haversine(a.lat, a.lon, b.lat, b.lon) / 1852;
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
  date.setHours(9, 0, 0, 0);
  if (date.getTime() <= Date.now()) {
    date.setDate(date.getDate() + 1);
  }
  return toLocalInput(date);
}

function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function departInputParts(value: string): DepartInputParts {
  const fallback = defaultDepartInput();
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value || fallback)
    ?? /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(fallback);
  const date = match?.[1] ?? fallback.slice(0, 10);
  const hour24 = Math.max(0, Math.min(23, Number(match?.[2] ?? 9)));
  const minute = String(Math.max(0, Math.min(59, Number(match?.[3] ?? 0)))).padStart(2, '0');
  const hour12 = hour24 % 12 || 12;
  return {
    date,
    hour: String(hour12).padStart(2, '0'),
    minute,
    meridiem: hour24 >= 12 ? 'PM' : 'AM'
  };
}

function updateDepartInput(current: string, patch: Partial<DepartInputParts>) {
  const parts = { ...departInputParts(current), ...patch };
  const hour12 = Math.max(1, Math.min(12, Number(parts.hour) || 9));
  const minute = String(Math.max(0, Math.min(59, Number(parts.minute) || 0))).padStart(2, '0');
  const hour24 = parts.meridiem === 'PM'
    ? (hour12 === 12 ? 12 : hour12 + 12)
    : (hour12 === 12 ? 0 : hour12);
  return `${parts.date}T${String(hour24).padStart(2, '0')}:${minute}`;
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

function removeStopAndAdjacentWaypoints(nodes: RouteNode[], marinaId: number) {
  const index = nodes.findIndex((node) => node.kind === 'stop' && node.marinaId === marinaId);
  if (index === -1) return nodes;

  const next = nodes.filter((node, candidateIndex) => {
    if (candidateIndex === index) return false;
    if (node.kind !== 'waypoint') return true;
    return !(candidateIndex > previousStopIndex(nodes, index) && candidateIndex < nextStopIndex(nodes, index));
  });
  return cleanRouteNodes(next);
}

function previousStopIndex(nodes: RouteNode[], index: number) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (nodes[i].kind === 'stop') return i;
  }
  return -1;
}

function nextStopIndex(nodes: RouteNode[], index: number) {
  for (let i = index + 1; i < nodes.length; i += 1) {
    if (nodes[i].kind === 'stop') return i;
  }
  return nodes.length;
}

function reorderStopNodes(nodes: RouteNode[], fromIndex: number, toIndex: number) {
  const stops = nodes.filter((node): node is RouteStopNode => node.kind === 'stop');
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= stops.length || toIndex >= stops.length || fromIndex === toIndex) {
    return nodes;
  }
  const [moved] = stops.splice(fromIndex, 1);
  stops.splice(toIndex, 0, moved);
  return cleanRouteNodes(stops);
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
};

function buildTripLegs(
  nodes: ResolvedRouteNode[],
  departAt: string,
  speedKt: number,
  dayIndex: number,
  vessel: VesselProfile,
  weeklyOutlooks: PlannerOutlooks = {},
  liveTides: Record<number, LiveTide> = {},
  currentForecasts: CurrentForecasts = {}
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

    if (node.kind === 'waypoint') {
      return {
        kind: 'waypoint',
        id: node.id,
        segmentDistance,
        cumulativeDistance,
        arrive: new Date(cursor)
      };
    }

    stopIndex += 1;
    const arrivalDayIndex = dayIndexForArrival(depart, cursor, dayIndex);
    const conditions = conditionsFor(node.marina, arrivalDayIndex, weeklyOutlooks);
    const tide = node.marina.waterType === 'lake' || node.marina.waterType === 'river' || node.marina.tidal === false
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
      currentAdvisories
    };
  });
}

function tripSummary(legs: TripLeg[]) {
  const stops = legs.filter((leg): leg is StopRouteLeg => leg.kind === 'stop');
  const finish = legs[legs.length - 1]?.arrive ?? new Date();
  const start = stops[0]?.arrive ?? finish;
  if (!stops.length) return { score: 50, maxWind: 0, maxWave: 0, finish, distance: 0, durationMinutes: 0 };
  return {
    score: Math.round(stops.reduce((sum, leg) => sum + leg.score, 0) / stops.length),
    maxWind: Math.max(...stops.map((leg) => leg.conditions.wind)),
    maxWave: Math.max(...stops.map((leg) => leg.conditions.wave)),
    finish,
    distance: legs[legs.length - 1]?.cumulativeDistance ?? 0,
    durationMinutes: Math.max(0, Math.round((finish.getTime() - start.getTime()) / 60000))
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
  currentForecasts: CurrentForecasts = {}
) {
  const legs = buildTripLegs(nodes, departAt, speedKt, dayIndex, vessel, weeklyOutlooks, liveTides, currentForecasts);
  const summary = tripSummary(legs);
  const depart = new Date(departAt || defaultDepartInput());
  const lines = [
    'Fair Tide float plan',
    `Vessel: ${vessel.label}`,
    `Depart: ${formatShortDateTime(depart)}`,
    `Cruise speed: ${speedKt || DEFAULT_SPEED_KT} kt`,
    ''
  ];
  legs.filter((leg): leg is StopRouteLeg => leg.kind === 'stop').forEach((leg) => {
    const distance = leg.stopIndex > 1
      ? ` - leg ${leg.segmentDistance.toFixed(1)} nm direct - total ${leg.cumulativeDistance.toFixed(1)} nm direct`
      : '';
    lines.push(`${leg.stopIndex}. ${leg.marina.name} - arrive ${formatShortTime(leg.arrive)}${distance} - wind ${windLabel(leg.conditions)} - seas ${leg.conditions.wave.toFixed(1)}m - sunset ${formatShortTime(leg.daylight.sunset)}${leg.daylight.warning ? ` - ${leg.daylight.warning}` : ''}${leg.tide ? ` - tide ${leg.tide.height.toFixed(1)}m` : ''}`);
    leg.currentAdvisories.forEach((advisory) => {
      lines.push(`   Current advisory: ${advisory.text}`);
    });
  });
  lines.push('');
  lines.push(`Max wind/seas: ${summary.maxWind} kt / ${summary.maxWave.toFixed(1)}m`);
  lines.push(`Estimated finish: ${formatShortDateTime(summary.finish)}`);
  lines.push('Distances are direct planning estimates, not a navigable route. Verify your own course on charts.');
  lines.push('Leave this plan ashore. JRCC Victoria: 1-800-567-5111.');
  return lines.join('\n');
}

function formatShortDateTime(value: Date) {
  return `${value.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} ${formatShortTime(value)}`;
}

function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
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

function isTransientFriendly(marina: Marina) {
  return accessInfoFor(marina)?.transient === 'Y';
}

function destinationLabel(showFreedomOnly: boolean, showTransientOnly: boolean) {
  if (showFreedomOnly && showTransientOnly) return 'Transient-friendly Freedom locations';
  if (showFreedomOnly) return 'Freedom Boat Club locations';
  if (showTransientOnly) return 'Transient-friendly marinas';
  return 'Destinations';
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
  const tidalMarinas = marinas.filter((marina) => marina.waterType !== 'lake' && marina.waterType !== 'river' && marina.tidal !== false);
  const stations = await fetchIwlsStations('wlp');
  const out: Record<number, LiveTide> = {};
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 8);

  const stationByMarina = new Map<number, IwlsStation>();
  const uniqueStations = new Map<string, IwlsStation>();
  tidalMarinas.forEach((marina) => {
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
  tidalMarinas.forEach((marina) => {
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
