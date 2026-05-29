"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, MapPin, FileText } from "lucide-react";

const TABS = [
  {
    href: "/stops",
    label: "Itinerario",
    icon: Map,
    /** Active on /stops (list only) */
    match: (p: string) => p === "/stops",
  },
  {
    href: "/",
    label: "Hoy",
    icon: MapPin,
    /** Active on any stop detail page */
    match: (p: string) => p.startsWith("/stops/"),
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

  /* Hide on login page */
  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 inset-x-0 z-[1000] bg-sand-900/95 backdrop-blur border-t border-sand-800"
    >
      <ul className="flex items-center justify-around px-2 h-16">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex flex-col items-center justify-center gap-1 h-full rounded-xl transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-900",
                  active
                    ? "text-gold-400"
                    : "text-sand-500 hover:text-sand-300",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2 : 1.5}
                  aria-hidden="true"
                />
                <span className={`text-[11px] font-medium ${active ? "text-gold-400" : ""}`}>
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
