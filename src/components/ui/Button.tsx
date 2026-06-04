import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary: [
    "bg-brick text-white hover:bg-brick-hover active:bg-brick-press",
    "font-display uppercase tracking-wide border border-transparent",
    "rounded-[2px] hard-shadow-ink",
    "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
  ].join(" "),
  secondary:
    "border-2 border-ink text-ink-2 hover:text-ink bg-surface rounded-full",
  ghost:
    "text-ink-2 hover:text-ink hover:bg-surface-2 border-2 border-transparent rounded-full",
  danger:
    "border-2 border-danger/40 text-danger hover:bg-danger-bg bg-transparent rounded-full",
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
        "inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/50",
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
