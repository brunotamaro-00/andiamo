import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center text-center",
        compact ? "py-5" : "py-10",
      ].join(" ")}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-2 border border-border mb-4"
        aria-hidden="true"
      >
        <Icon size={20} strokeWidth={1.5} className="text-ink-3" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="text-xs text-ink-2 mt-1.5 max-w-[15rem] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
