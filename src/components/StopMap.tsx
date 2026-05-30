"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, SectionHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExternalLink, MapPin } from "lucide-react";

export interface PoiMarker {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  done: boolean;
}

/* Andiamo light palette applied to map markers */
const POI_COLORS: Record<string, string> = {
  hostel:     "#FF385C",  /* coral */
  museo:      "#7C3AED",  /* special */
  actividad:  "#1A7F4B",  /* success */
  comida:     "#E07450",  /* warm orange */
  mirador:    "#B7791F",  /* warning */
  transporte: "#717171",  /* ink-2 */
  otro:       "#9A9A9A",  /* ink-3 */
};

const POI_LABEL: Record<string, string> = {
  hostel: "Hostel / Hotel", museo: "Museo", actividad: "Actividad",
  comida: "Comida", mirador: "Mirador", transporte: "Transporte", otro: "Otro",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeIcon(type: string, done: boolean): string {
  const color = done ? "#B0B0B0" : (POI_COLORS[type] ?? "#9A9A9A");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}" opacity="${done ? 0.5 : 1}"/>
    <circle cx="12" cy="12" r="5" fill="#FAF9F7" opacity="0.9"/>
  </svg>`;
}

interface StopMapProps {
  centerLat: number;
  centerLng: number;
  pois: PoiMarker[];
  stopName: string;
}

/** Build/refresh markers on a stable layer group without recreating the map. */
function renderMarkers(
  L: typeof import("leaflet"),
  map: LeafletMap,
  group: LayerGroup,
  pois: PoiMarker[]
) {
  group.clearLayers();

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
        `<div style="font-size:13px;min-width:130px;font-family:system-ui,sans-serif">
          <strong style="color:#EDE6DB">${escapeHtml(poi.name)}</strong>
          <br/><span style="color:#A89F94;font-size:11px;text-transform:capitalize">
            ${escapeHtml(POI_LABEL[poi.type] ?? poi.type)}
          </span>
          ${poi.done ? '<br/><span style="color:#6FB07F;font-size:11px">Hecho</span>' : ""}
          <br/><a href="https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}"
            target="_blank" rel="noopener" style="color:#E0A458;font-size:11px">Ver en Google Maps ↗</a>
        </div>`
      )
      .addTo(group);
  });

  if (pois.length > 0) {
    const bounds = L.latLngBounds(pois.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 });
  }
}

export function StopMap({ centerLat, centerLng, pois, stopName }: StopMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const groupRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);

  /* Create the map once per location — stays mounted across POI changes. */
  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number };
    if (container._leaflet_id || mapInstanceRef.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;
      if ((mapRef.current as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return;

      const map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const group = L.layerGroup().addTo(map);

      leafletRef.current = L;
      mapInstanceRef.current = map;
      groupRef.current = group;

      renderMarkers(L, map, group, pois);
      setReady(true);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        groupRef.current = null;
        leafletRef.current = null;
        setReady(false);
      }
    };
    // Only re-create when the location changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLng]);

  /* Refresh markers in place when POIs change (toggle/add/delete). */
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const group = groupRef.current;
    if (!L || !map || !group) return;
    renderMarkers(L, map, group, pois);
  }, [pois]);

  const poisWithCoords = pois.filter((p) => !p.done);
  let gmapsUrl: string;
  if (poisWithCoords.length >= 2) {
    const midLat = poisWithCoords.reduce((s, p) => s + p.latitude, 0) / poisWithCoords.length;
    const midLng = poisWithCoords.reduce((s, p) => s + p.longitude, 0) / poisWithCoords.length;
    gmapsUrl = `https://www.google.com/maps/@${midLat},${midLng},15z`;
  } else if (poisWithCoords.length === 1) {
    gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${poisWithCoords[0].latitude},${poisWithCoords[0].longitude}`;
  } else {
    gmapsUrl = `https://www.google.com/maps/@${centerLat},${centerLng},14z`;
  }

  return (
    <Card>
      <SectionHeader
        title="Mapa"
        action={
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-coral hover:text-coral-hover transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-coral rounded"
            aria-label={`Abrir ${stopName} en Google Maps`}
          >
            Google Maps
            <ExternalLink size={11} strokeWidth={1.5} aria-hidden="true" />
          </a>
        }
      />

      <div
        className="relative h-56 rounded-xl overflow-hidden bg-surface-2"
        role="application"
        aria-label={`Mapa de ${stopName}`}
      >
        <div ref={mapRef} className="h-full w-full" />
        {!ready && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-surface-2 animate-pulse"
            aria-hidden="true"
          >
            <MapPin size={24} strokeWidth={1.5} className="text-ink-faint" />
          </div>
        )}
      </div>

      {pois.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {(Object.keys(POI_COLORS) as (keyof typeof POI_COLORS)[])
            .filter((t) => pois.some((p) => p.type === t))
            .map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: POI_COLORS[type] }}
                  aria-hidden="true"
                />
                <span className="text-xs text-ink-2 capitalize">
                  {POI_LABEL[type]}
                </span>
              </div>
            ))}
        </div>
      )}

      {pois.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="Sin puntos en el mapa"
          description="Agregá el hostel y actividades para verlos acá."
          compact
        />
      )}
    </Card>
  );
}
