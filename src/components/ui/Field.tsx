"use client";

import { useId } from "react";

const labelClass = "block text-[11px] font-semibold text-ink-3 uppercase tracking-widest mb-1.5";

const inputClass =
  "w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-ink " +
  "placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 " +
  "focus-visible:border-brick focus-visible:ring-offset-0 disabled:opacity-50 " +
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
  autoFocus?: boolean;
  accept?: string;
}

export function Field({ label, name, type = "text", ...rest }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} name={name} type={type} className={inputClass} {...rest} />
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
