import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: LucideIcon;
  iconSize?: number;
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
        "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150",
        danger
          ? "text-ink-3 hover:text-danger hover:bg-danger-bg"
          : "text-ink-3 hover:text-ink hover:bg-surface-2",
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
