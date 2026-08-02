"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BookOpen, List, MapPin, FileText, Search } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { springNav } from "@/lib/motion";
import { useCurrentStopSlug } from "@/components/CurrentStopContext";

const TABS = [
  {
    href: "/stops",
    label: "Itinerario",
    icon: List,
    // Itinerario owns the whole itinerary section: the list and any stop detail.
    match: (p: string) => p === "/stops" || p.startsWith("/stops/"),
  },
  {
    href: "/hoy",
    label: "Hoy",
    icon: MapPin,
    match: (p: string) => p === "/hoy",
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
  const currentStopSlug = useCurrentStopSlug();
  const onStopDetail = pathname.startsWith("/stops/");

  // The current stop's detail belongs to "Hoy"; every other stop detail (and
  // the list) belongs to "Itinerario".
  const currentStopPath = currentStopSlug ? `/stops/${currentStopSlug}` : null;
  const onCurrentStop = onStopDetail && pathname === currentStopPath;

  // Remember the last stop detail visited this session, so returning to the
  // Itinerario tab reopens it instead of the list. Tapping Itinerario while
  // already on a stop detail goes back up to the list.
  const [lastStopPath, setLastStopPath] = useState<string | null>(null);
  useEffect(() => {
    if (onStopDetail) setLastStopPath(pathname);
  }, [onStopDetail, pathname]);

  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="shrink-0 bg-surface backdrop-blur-md border-t border-border-strong pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-center justify-around px-1 h-16">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active =
            href === "/hoy"
              ? pathname === "/hoy" || onCurrentStop
              : href === "/stops"
                ? match(pathname) && !onCurrentStop
                : match(pathname);
          // Itinerario reopens the last stop unless we're already on a detail
          // (then it goes up to the list).
          const targetHref =
            href === "/stops" && !onStopDetail
              ? (lastStopPath ?? "/stops")
              : href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={targetHref}
                aria-current={active ? "page" : undefined}
                onClick={() => { if (!active) haptics.tap(); }}
                className={[
                  "flex flex-col items-center justify-center gap-1 h-full min-h-[44px] rounded-lg transition-colors duration-150",
                  "active:scale-[0.96] motion-reduce:active:scale-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Icon with active pill bg — the pill slides between tabs */}
                <span className="relative flex items-center justify-center w-10 h-6">
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      transition={springNav}
                      className="absolute inset-0 rounded-full bg-brick-bg"
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={active ? 2 : 1.5}
                    aria-hidden="true"
                    className={`relative ${active ? "text-brick" : "text-ink-2"}`}
                  />
                </span>
                <span
                  className={`label-caps transition-colors duration-150 ${
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
