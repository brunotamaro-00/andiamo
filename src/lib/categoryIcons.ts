import {
  BedDouble,
  Bus,
  Gift,
  HeartPulse,
  type LucideIcon,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Ticket,
  UtensilsCrossed,
  Wine,
} from "lucide-react";

/** Nombre de categoría (catálogo Spitwise) → ícono Lucide. Fallback: Tag.
 *  Mismos íconos que Spitwise (su lib/chartTheme.ts) para que las dos apps se
 *  lean igual. El catálogo lo manda Spitwise: una categoría nueva llega sola por
 *  la API y cae en Tag hasta que se suma acá. */
const MAP: Record<string, LucideIcon> = {
  Alojamiento: BedDouble,
  Comida: UtensilsCrossed,
  Supermercado: ShoppingCart,
  Transporte: Bus,
  Actividades: Ticket,
  Compras: ShoppingBag,
  Salidas: Wine,
  Regalos: Gift,
  Salud: HeartPulse,
  Otros: Tag,
};

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && MAP[name]) || Tag;
}
