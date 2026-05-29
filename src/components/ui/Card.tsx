interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={`bg-sand-900 rounded-2xl border border-sand-800 p-4 ${className ?? ""}`}>
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
      <h2 className="text-xs font-semibold text-sand-400 uppercase tracking-wider">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-sand-600 normal-case font-normal">({count})</span>
        )}
      </h2>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
