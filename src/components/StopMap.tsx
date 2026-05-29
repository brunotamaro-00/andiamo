"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ExternalLink } from "lucide-react";

export interface PoiMarker {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  done: boolean;
}

/* Hora Dorada palette applied to map markers */
const POI_COLORS: Record<string, string> = {
  hostel:     "#E0A458",  /* gold-400 */
  museo:      "#B89BD1",  /* special */
  actividad:  "#6FB07F",  /* success */
  comida:     "#E07450",  /* warm coral-orange */
  mirador:    "#D9C441",  /* warm yellow */
  transporte: "#A89F94",  /* sand-400 */
  otro:       "#6B5D4F",  /* sand-600 */
};

const POI_LABEL: Record<string, string> = {
  hostel: "Hostel / Hotel", museo: "Museo", actividad: "Actividad",
  comida: "Comida", mirador: "Mirador", transporte: "Transporte", otro: "Otro",
};

function makeIcon(type: string, done: boolean): string {
  const color = done ? "#463C30" : (POI_COLORS[type] ?? "#6B5D4F");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}" opacity="${done ? 0.5 : 1}"/>
    <circle cx="12" cy="12" r="5" fill="#14110E" opacity="0.85"/>
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

    const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number };
    if (container._leaflet_id) return;
    if (mapInstanceRef.current) return;

    let L: typeof import("leaflet");

    import("leaflet").then((mod) => {
      L = mod;

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
            `<div style="font-size:13px;min-width:130px;font-family:system-ui,sans-serif">
              <strong style="color:#EDE6DB">${poi.name}</strong>
              <br/><span style="color:#A89F94;font-size:11px;text-transform:capitalize">
                ${POI_LABEL[poi.type] ?? poi.type}
              </span>
              ${poi.done ? '<br/><span style="color:#6FB07F;font-size:11px">Hecho</span>' : ""}
              <br/><a href="https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}"
                target="_blank" style="color:#E0A458;font-size:11px">Ver en Google Maps ↗</a>
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLng]);

  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}`;

  return (
    <Card>
      <SectionHeader
        title="Mapa"
        action={
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gold-400 hover:text-gold-300 transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 rounded"
            aria-label={`Abrir ${stopName} en Google Maps`}
          >
            Google Maps
            <ExternalLink size={11} strokeWidth={1.5} aria-hidden="true" />
          </a>
        }
      />

      <div
        className="h-56 rounded-xl overflow-hidden bg-sand-850"
        aria-label={`Mapa de ${stopName}`}
      >
        <div ref={mapRef} className="h-full w-full" />
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
                <span className="text-xs text-sand-400 capitalize">
                  {POI_LABEL[type]}
                </span>
              </div>
            ))}
        </div>
      )}

      {pois.length === 0 && (
        <p className="text-xs text-sand-600 mt-2 text-center">
          Aún no hay puntos de interés — agregá el hostel y actividades
        </p>
      )}
    </Card>
  );
}
