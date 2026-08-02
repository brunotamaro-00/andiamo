"use client";

import { useId } from "react";

/**
 * A boolean choice that needs a sentence of explanation — a full-width row with
 * a native checkbox, so it carries the same weight as the fields around it
 * instead of hiding as a bare tick under the form.
 */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={[
        "flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-150",
        checked
          ? "border-special/40 bg-special-bg"
          : "border-border bg-surface-2 hover:border-border-strong",
      ].join(" ")}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-faint accent-special focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
      />
      <span className="min-w-0">
        <span className={`block text-sm ${checked ? "text-special font-semibold" : "text-ink-2"}`}>
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-caption text-ink-3">{hint}</span>}
      </span>
    </label>
  );
}
