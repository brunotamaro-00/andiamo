import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary: [
    "bg-brick text-surface hover:bg-brick-hover active:bg-brick-press",
    "font-display uppercase tracking-wide border border-transparent",
    "rounded-md hard-shadow-ink",
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
    "motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0",
  ].join(" "),
  secondary:
    "border-2 border-ink text-ink-2 hover:text-ink bg-surface rounded-full",
  ghost:
    "text-ink-2 hover:text-ink hover:bg-surface-2 border-2 border-transparent rounded-full",
  danger:
    "border-2 border-danger/40 text-danger hover:bg-danger-bg bg-transparent rounded-full",
};

/* Both sizes keep a 44px touch target; `sm` only shrinks type and padding. */
const sizeClasses: Record<Size, string> = {
  sm: "min-h-[44px] py-1.5 px-3.5 text-xs",
  md: "min-h-[44px] py-2 px-5 text-sm",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and disables the button while a mutation is in flight. */
  loading?: boolean;
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
/** With `href` the same visual renders as an `<a>` — CTA links (demo, external)
 *  stop re-typing the sticker classes by hand. `loading` doesn't apply. */
type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsLink;

function composedClassName(
  variant: Variant,
  size: Size,
  className: string | undefined,
) {
  return [
    "inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/50",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "disabled:opacity-40 disabled:cursor-not-allowed",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className,
  children,
  ...props
}: ButtonProps) {
  if (props.href !== undefined) {
    return (
      <a {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)} className={composedClassName(variant, size, className)}>
        {children}
      </a>
    );
  }
  const { disabled, ...rest } = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={composedClassName(variant, size, className)}
    >
      {loading && <Loader2 size={14} className="animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}
