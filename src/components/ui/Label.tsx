/**
 * Label — canonical form/section label of the Andiamo design system.
 *
 * The visual voice (11px · 800 · uppercase · 0.08em) lives in the `label-caps`
 * utility (globals.css); this module owns the canonical *form-label* string —
 * `Field.tsx` re-exports it, nothing else redefines it.
 */

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  as?: "label" | "span" | "p";
}

export const labelClass = "block text-left label-caps text-ink-3 mb-1.5 leading-none";
const BASE = labelClass;

export function Label({ children, htmlFor, className, as: Tag = "label" }: LabelProps) {
  return (
    <Tag
      {...(Tag === "label" && htmlFor ? { htmlFor } : {})}
      className={`${BASE} ${className ?? ""}`.trim()}
    >
      {children}
    </Tag>
  );
}
