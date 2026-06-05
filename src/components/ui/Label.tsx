/**
 * Label — canonical section/field label per the Andiamo design system.
 *
 * Spec (AGENTS.md): text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3
 *
 * Replaces the three divergent variants that existed before:
 *   - Field.tsx:  font-display + tracking-wide  (wrong — Anton instead of Hanken)
 *   - login:      tracking-widest               (wrong — too wide)
 *   - AGENTS.md:  font-extrabold + tracking-[0.08em]  ← THIS is the spec
 */

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  as?: "label" | "span" | "p";
}

const BASE = "block text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-1.5 leading-none";

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
