export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse-skeleton skeleton-shimmer relative overflow-hidden rounded-lg bg-surface-2 border border-border ${className}`}
      aria-hidden="true"
    />
  );
}
