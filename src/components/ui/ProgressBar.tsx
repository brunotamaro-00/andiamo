/** Shared progress/quantity bar — one shape for spend categories and uploads.
 *  `value` is 0–100; color via `fillClass` token class (default gold).
 *  `animateIn` draws the fill in from the left on mount (pure CSS scaleX);
 *  `delayMs` staggers that draw when several bars mount together. Live
 *  progress (uploads) leaves `animateIn` off so it tracks value, not mount. */
export function ProgressBar({
  value,
  fillClass = "bg-gold",
  className = "",
  animateIn = false,
  delayMs = 0,
}: {
  value: number;
  fillClass?: string;
  className?: string;
  animateIn?: boolean;
  delayMs?: number;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className={`h-1.5 bg-surface-2 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${fillClass} ${
          animateIn ? "animate-grow-in" : ""
        }`}
        style={{ width: `${pct}%`, animationDelay: delayMs ? `${delayMs}ms` : undefined }}
      />
    </div>
  );
}
