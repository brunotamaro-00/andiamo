export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse-skeleton rounded-lg bg-surface-2 border border-border ${className}`}
      aria-hidden="true"
    />
  );
}
