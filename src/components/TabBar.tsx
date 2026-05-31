"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, MapPin, FileText, Search } from "lucide-react";

const TABS = [
  {
    href: "/stops",
    label: "Itinerario",
    icon: Map,
    match: (p: string) => p === "/stops",
  },
  {
    href: "/",
    label: "Hoy",
    icon: MapPin,
    match: (p: string) => p.startsWith("/stops/"),
  },
  {
    href: "/search",
    label: "Buscar",
    icon: Search,
    match: (p: string) => p.startsWith("/search"),
  },
  {
    href: "/general",
    label: "General",
    icon: FileText,
    match: (p: string) => p.startsWith("/general"),
  },
] as const;

export function TabBar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="shrink-0 bg-surface/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-center justify-around px-1 h-16">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex flex-col items-center justify-center gap-1 h-full min-h-[44px] rounded-xl transition-colors duration-150",
                  "active:scale-[0.96] motion-reduce:active:scale-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Icon with active pill bg */}
                <span
                  className={[
                    "flex items-center justify-center w-10 h-6 rounded-full transition-colors duration-150",
                    active ? "bg-coral-bg" : "",
                  ].join(" ")}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2 : 1.5}
                    aria-hidden="true"
                    className={active ? "text-coral" : "text-ink-2"}
                  />
                </span>
                <span
                  className={`text-[10px] font-semibold tracking-wide transition-colors duration-150 ${
                    active ? "text-coral" : "text-ink-3"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
