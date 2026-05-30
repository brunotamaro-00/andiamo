type Variant = "default" | "warning" | "special" | "muted" | "success" | "active";

const variantClasses: Record<Variant, string> = {
  default:  "bg-surface-2 text-ink-2 border border-border",
  warning:  "bg-warning-bg text-warning border border-warning/30",
  special:  "bg-special-bg text-special border border-special/30",
  muted:    "bg-surface-2 text-ink-3 border border-border",
  success:  "bg-success-bg text-success border border-success/30",
  active:   "bg-coral-bg text-coral-ink border border-coral-border/60 font-semibold",
};

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
