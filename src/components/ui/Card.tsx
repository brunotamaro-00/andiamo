interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={[
        "bg-surface rounded-xl border border-border p-4 card-shadow",
        hover && "card-hover hover:card-shadow-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  count?: number | string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, count, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-ink-faint normal-case tracking-normal font-normal">
            ({count})
          </span>
        )}
      </h2>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
