/** Shared progress/quantity bar — one shape for spend categories and uploads.
 *  `value` is 0–100; color via `fillClass` token class (default gold). */
export function ProgressBar({
  value,
  fillClass = "bg-gold",
  className = "",
}: {
  value: number;
  fillClass?: string;
  className?: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className={`h-1.5 bg-surface-2 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${fillClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
