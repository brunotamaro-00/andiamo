type Variant = "default" | "warning" | "special" | "muted" | "success" | "active";

const variantClasses: Record<Variant, string> = {
  default:  "bg-sand-850 text-sand-300 border border-sand-800",
  warning:  "bg-warning-bg text-warning border border-warning/30",
  special:  "bg-special-bg text-special border border-special/30",
  muted:    "bg-sand-850 text-sand-500 border border-sand-800",
  success:  "bg-success-bg text-success border border-success/30",
  active:   "bg-gold-900 text-gold-400 border border-gold-700/50 font-semibold",
};

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium rounded-lg px-2 py-0.5 ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
