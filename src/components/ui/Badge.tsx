type Variant =
  | "default"
  | "warning"
  | "special"
  | "muted"
  | "success"
  | "active"
  | "danger";

const variantClasses: Record<Variant, string> = {
  default:  "bg-surface-2 text-ink-2 border border-border",
  warning:  "bg-warning-bg text-warning border border-warning/30",
  special:  "bg-special-bg text-special border border-special/30",
  muted:    "bg-surface-2 text-ink-3 border border-border",
  success:  "bg-success-bg text-success border border-success/30",
  active:   "bg-brick-bg text-brick-ink border border-brick-border/60 font-semibold",
  danger:   "bg-danger-bg text-danger border border-danger/30 font-semibold",
};

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center text-caption font-semibold tracking-wide rounded-full px-2 py-0.5",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
