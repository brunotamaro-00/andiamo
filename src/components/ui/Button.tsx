import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-coral text-white hover:bg-coral-hover active:bg-coral-press font-semibold border border-transparent",
  secondary:
    "border border-border text-ink-2 hover:border-border-strong hover:text-ink bg-surface",
  ghost:
    "text-ink-2 hover:text-ink hover:bg-surface-2 border border-transparent",
  danger:
    "border border-danger/40 text-danger hover:bg-danger-bg bg-transparent",
};

const sizeClasses: Record<Size, string> = {
  sm: "py-1.5 px-3.5 text-xs",
  md: "py-2 px-5 text-sm",
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
        "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "disabled:opacity-40 disabled:cursor-not-allowed",
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
