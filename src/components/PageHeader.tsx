import type { ReactNode } from "react";
import { BrandLink } from "@/components/BrandLink";
import { Wordmark } from "@/components/Brand";
import { LogoutButton } from "@/components/LogoutButton";
import { StickyHeader } from "@/components/StickyHeader";

interface PageHeaderProps {
  /** Gray uppercase label under the wordmark. Omit when a page needs no context line. */
  subtitle?: string;
  /** Extra actions rendered to the left of the Salir button (e.g. search
   *  shortcut, PersonSwitcher). Kept as a slot rather than reading cookies here:
   *  /guias renders this header and must stay SSG. */
  actions?: ReactNode;
}

/**
 * Standardized top bar for every screen: Andiamo wordmark + optional gray
 * context subtitle on the left, optional actions + Salir on the right.
 * Intra-section back navigation (e.g. guides hierarchy) lives in the page body,
 * never here — the TabBar already handles top-level navigation.
 *
 * The wordmark links to /stops#current so the itinerary opens scrolled to
 * today's stop (see HashScroller on the stops page). No cookies/DB here —
 * /guias must stay SSG.
 */
export function PageHeader({ subtitle, actions }: PageHeaderProps) {
  return (
    <StickyHeader>
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <BrandLink>
          <Wordmark size="sm" />
          {subtitle && (
            <span className="text-[11px] font-display uppercase tracking-[0.14em] text-ink-3 ml-8 -mt-0.5 truncate">
              {subtitle}
            </span>
          )}
        </BrandLink>
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          <LogoutButton />
        </div>
      </div>
    </StickyHeader>
  );
}
