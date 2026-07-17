import type { ReactNode } from "react";
import { Wordmark } from "@/components/Wordmark";
import { LogoutButton } from "@/components/LogoutButton";

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
 */
export function PageHeader({ subtitle, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-surface backdrop-blur-md border-b border-border-strong px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0 min-w-0">
          <Wordmark size="sm" />
          {subtitle && (
            <span className="text-[9px] font-display uppercase tracking-[0.14em] text-ink-3 ml-8 -mt-0.5 truncate">
              {subtitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
