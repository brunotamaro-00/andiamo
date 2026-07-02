"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, List, MapPin, FileText, Search } from "lucide-react";

const TABS = [
  {
    href: "/stops",
    label: "Itinerario",
    icon: List,
    match: (p: string) => p === "/stops",
  },
  {
    href: "/",
    label: "Hoy",
    icon: MapPin,
    match: (p: string) => p.startsWith("/stops/"),
  },
  {
    href: "/guias",
    label: "Guías",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/guias"),
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
      className="shrink-0 bg-surface backdrop-blur-md border-t border-border-strong pb-[env(safe-area-inset-bottom)]"
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
                  "flex flex-col items-center justify-center gap-1 h-full min-h-[44px] rounded-[4px] transition-colors duration-150",
                  "active:scale-[0.96] motion-reduce:active:scale-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Icon with active pill bg */}
                <span
                  className={[
                    "flex items-center justify-center w-10 h-6 rounded-full transition-colors duration-150",
                    active ? "bg-brick-bg" : "",
                  ].join(" ")}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2 : 1.5}
                    aria-hidden="true"
                    className={active ? "text-brick" : "text-ink-2"}
                  />
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-[0.08em] transition-colors duration-150 ${
                    active ? "text-brick" : "text-ink-3"
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
