"use client";

import {
  BedDouble, Landmark, Target, UtensilsCrossed, Binoculars,
  TrainFront, MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { togglePoiDone } from "@/app/actions/pois";
import { haptics } from "@/lib/haptics";
import { useOptimisticList } from "@/lib/use-optimistic-list";
import { MutationErrorBanner } from "@/components/ui/MutationErrorBanner";
import { Badge } from "@/components/ui/Badge";
import { PoiCheck } from "@/components/ui/PoiCheck";

const TYPE_ICON: Record<string, LucideIcon> = {
  hospedaje:  BedDouble,
  museo:      Landmark,
  actividad:  Target,
  comida:     UtensilsCrossed,
  mirador:    Binoculars,
  transporte: TrainFront,
  otro:       MapPin,
};

interface TodayPoi {
  id: string;
  name: string;
  type: string;
  done: boolean;
  reservationRequired: boolean;
}

/** Compact pending-POI checklist for the /hoy view — toggle-only; full
 *  management lives in PoiPanel on the stop detail page. */
export function TodayPoiList({ slug, pois }: { slug: string; pois: TodayPoi[] }) {
  const { items, mutate, mutationError, isPending } = useOptimisticList(
    pois,
    (state, id: string) => state.map((p) => (p.id === id ? { ...p, done: !p.done } : p)),
  );

  function handleToggle(poi: TodayPoi) {
    if (poi.done) haptics.tap(); else haptics.success();
    mutate(poi.id, () => togglePoiDone(poi.id, slug), "No se pudo guardar el cambio. Reintentá.");
  }

  return (
    <div>
      <MutationErrorBanner message={mutationError} />
      <ul className={`space-y-1 transition-opacity ${isPending ? "opacity-70" : ""}`}>
        {items.map((poi) => {
          const Icon = TYPE_ICON[poi.type] ?? MapPin;
          return (
            <li key={poi.id}>
              <button
                onClick={() => handleToggle(poi)}
                aria-pressed={poi.done}
                className="w-full flex items-center gap-2.5 px-2 py-2 min-h-[44px] rounded-lg text-left transition-colors duration-150 hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
              >
                <PoiCheck done={poi.done} />
                <Icon size={15} strokeWidth={1.5} aria-hidden="true" className="text-ink-3 shrink-0" />
                <span
                  className={`flex-1 min-w-0 truncate text-sm ${
                    poi.done ? "text-ink-faint line-through" : "text-ink"
                  }`}
                >
                  {poi.name}
                </span>
                {poi.reservationRequired && !poi.done && (
                  <Badge variant="danger">Reservar</Badge>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
