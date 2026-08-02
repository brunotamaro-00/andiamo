import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

type IconButtonVariant = "default" | "danger" | "quiet";

const variantClasses: Record<IconButtonVariant, string> = {
  default: "text-ink-3 hover:text-ink hover:bg-surface-2",
  danger: "text-ink-3 hover:text-danger hover:bg-danger-bg",
  /** Recedes into decorated surfaces (city header card): no hover fill,
   *  border-tone icon that inks up on hover. Target stays 44px. */
  quiet: "text-border-strong hover:text-ink hover:bg-transparent",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: LucideIcon;
  iconSize?: number;
  danger?: boolean;
  variant?: IconButtonVariant;
}

export function IconButton({
  label,
  icon: Icon,
  iconSize = 16,
  danger = false,
  variant,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      {...props}
      className={[
        "inline-flex items-center justify-center w-11 h-11 rounded-lg transition-colors duration-150",
        variantClasses[variant ?? (danger ? "danger" : "default")],
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40",
        "focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon size={iconSize} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
