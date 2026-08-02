/** Card chrome without padding — the single source of the card look. Use it
 *  directly on `<Link>` cards or `divide-y` list cards that own their inner
 *  spacing; `<Card>` below adds the default `p-4`. Never re-type the string. */
export const cardClass = "bg-surface rounded-xl border border-border card-shadow";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={[
        cardClass,
        "p-4",
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
      <h2 className="label-caps text-ink-3 leading-none">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-caption text-ink-2 normal-case tracking-normal font-sans font-normal">
            ({count})
          </span>
        )}
      </h2>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
