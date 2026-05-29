import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visible label for screen readers — required */
  label: string;
  icon: LucideIcon;
  iconSize?: number;
  /** Danger styling for destructive actions */
  danger?: boolean;
}

export function IconButton({
  label,
  icon: Icon,
  iconSize = 16,
  danger = false,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      {...props}
      className={[
        "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
        danger
          ? "text-sand-500 hover:text-danger hover:bg-danger-bg"
          : "text-sand-500 hover:text-sand-200 hover:bg-sand-850",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-950",
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
