"use client";

import { useId } from "react";

import { labelClass } from "./Label";

/** Canonical label style — single source in Label.tsx. */
export { labelClass };

export const inputClass =
  "w-full min-h-[44px] bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-base text-ink " +
  "placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 " +
  "focus-visible:border-brick focus-visible:bg-surface focus-visible:ring-offset-0 disabled:opacity-50 " +
  "transition-colors duration-150 hover:border-border-strong";

/* ── Text / number / date / url / password / file input ── */

interface FieldProps {
  label: string;
  name: string;
  type?: React.HTMLInputTypeAttribute;
  required?: boolean;
  placeholder?: string;
  step?: string | number;
  defaultValue?: string | number;
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  min?: string | number;
  max?: string | number;
  autoFocus?: boolean;
  accept?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  enterKeyHint?: React.HTMLAttributes<HTMLInputElement>["enterKeyHint"];
  autoComplete?: string;
  /** Wires the input to an external error region (`role="alert"`) — the hint
   *  below is for static help text, not for validation feedback. */
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  hint?: string;
}

export function Field({ label, name, type = "text", hint, ...rest }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} name={name} type={type} className={inputClass} {...rest} />
      {hint && <p className="text-caption text-ink-3 mt-1">{hint}</p>}
    </div>
  );
}

/* ── Select ── */

interface SelectFieldProps {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  children: React.ReactNode;
}

export function SelectField({ label, name, children, ...rest }: SelectFieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select id={id} name={name} className={inputClass} {...rest}>
        {children}
      </select>
    </div>
  );
}

/* ── Textarea ── */

interface TextareaFieldProps {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  rows?: number;
}

export function TextareaField({ label, name, rows = 3, ...rest }: TextareaFieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        className={`${inputClass} resize-none`}
        {...rest}
      />
    </div>
  );
}
