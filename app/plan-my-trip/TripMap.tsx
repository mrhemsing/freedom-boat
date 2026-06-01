'use client';

import { useEffect, useRef } from 'react';
import type { Marina } from '../../lib/marinas';

type TripMapProps = {
  marinas: Marina[];
};

export default function TripMap({ marinas }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function mountMap() {
      const L = await import('leaflet');
      if (disposed || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        attributionControl: false,
        scrollWheelZoom: false,
        zoomControl: false,
        dragging: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      marinas.forEach((marina) => {
        const icon = L.divIcon({
          className: `tripLeafletMarker ${marina.freedomClub ? 'tripLeafletMarkerClub' : ''}`,
          html: `<span class="tripMarkerDot">${marina.id}</span><span class="tripMarkerLabel">${escapeHtml(marina.name)}</span>`,
          iconSize: undefined,
          iconAnchor: marina.freedomClub ? [22, 22] : [18, 18]
        });

        const marker = L.marker([marina.lat, marina.lon], { icon }).addTo(map);
        marker.on('click', () => {
          window.location.href = marina.locationId ? `/location/${marina.locationId}` : `#marina-${marina.id}`;
        });
      });

      setTimeout(() => {
        map.invalidateSize();
        map.setView([48.25, -123.34], 8);
      }, 0);
      cleanup = () => map.remove();
    }

    mountMap();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [marinas]);

  return <div className="tripLeafletMap" ref={mapRef} aria-label="Vancouver and Gulf Islands marina map" />;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
