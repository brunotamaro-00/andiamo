import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gold-400 text-sand-950 hover:bg-gold-300 active:bg-gold-500 font-semibold border border-transparent",
  secondary:
    "border border-sand-700 text-sand-400 hover:border-sand-600 hover:text-sand-200 bg-transparent",
  ghost:
    "text-sand-400 hover:text-sand-200 hover:bg-sand-850 border border-transparent",
  danger:
    "border border-danger/40 text-danger hover:bg-danger-bg bg-transparent",
};

const sizeClasses: Record<Size, string> = {
  sm: "py-1.5 px-3 text-xs",
  md: "py-2.5 px-4 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-950",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
