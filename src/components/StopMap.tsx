"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface PoiMarker {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  done: boolean;
}

const POI_COLORS: Record<string, string> = {
  hostel: "#38bdf8",
  museo: "#a78bfa",
  actividad: "#34d399",
  comida: "#fb923c",
  mirador: "#fbbf24",
  transporte: "#94a3b8",
  otro: "#64748b",
};

function makeIcon(type: string, done: boolean): string {
  const color = done ? "#475569" : (POI_COLORS[type] ?? "#64748b");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}" opacity="${done ? 0.4 : 1}"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
  </svg>`;
}

interface StopMapProps {
  centerLat: number;
  centerLng: number;
  pois: PoiMarker[];
  stopName: string;
}

export function StopMap({ centerLat, centerLng, pois, stopName }: StopMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Guard against React StrictMode double-invoke and re-renders
    const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number };
    if (container._leaflet_id) return;
    if (mapInstanceRef.current) return;

    let L: typeof import("leaflet");

    import("leaflet").then((mod) => {
      L = mod;

      // Override default icon URLs to avoid broken images in Next.js
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current || (mapRef.current as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return;

      const map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      pois.forEach((poi) => {
        const svgIcon = L.divIcon({
          html: makeIcon(poi.type, poi.done),
          className: "",
          iconSize: [24, 32],
          iconAnchor: [12, 32],
          popupAnchor: [0, -32],
        });

        L.marker([poi.latitude, poi.longitude], { icon: svgIcon })
          .bindPopup(
            `<div style="font-size:13px;min-width:120px">
              <strong>${poi.name}</strong>
              <br/><span style="color:#94a3b8;font-size:11px;text-transform:capitalize">${poi.type}</span>
              ${poi.done ? '<br/><span style="color:#4ade80;font-size:11px">✓ Hecho</span>' : ""}
              <br/><a href="https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}"
                target="_blank" style="color:#38bdf8;font-size:11px">Ver en Google Maps ↗</a>
            </div>`
          )
          .addTo(map);
      });

      if (pois.length > 0) {
        const bounds = L.latLngBounds(pois.map((p) => [p.latitude, p.longitude]));
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 });
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  // Only re-run if coordinates or POIs change significantly (stringify for deep compare)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLng]);

  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}`;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mapa</h2>
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          Abrir en Google Maps ↗
        </a>
      </div>

      <div className="h-56 rounded-xl overflow-hidden bg-slate-800">
        <div ref={mapRef} className="h-full w-full" />
      </div>

      {pois.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(["hostel", "museo", "actividad", "comida", "mirador", "transporte", "otro"] as const)
            .filter((t) => pois.some((p) => p.type === t))
            .map((type) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: POI_COLORS[type] }} />
                <span className="text-xs text-slate-400 capitalize">{type}</span>
              </div>
            ))}
        </div>
      )}

      {pois.length === 0 && (
        <p className="text-xs text-slate-600 mt-2 text-center">
          Aún no hay puntos de interés — agregá el hostel y actividades
        </p>
      )}
    </div>
  );
}
