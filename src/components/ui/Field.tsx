"use client";

import { useId } from "react";

const inputClass =
  "mt-1 w-full bg-sand-850 border border-sand-700 rounded-xl px-3 py-2.5 text-sm text-sand-100 " +
  "placeholder:text-sand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-950 disabled:opacity-50 transition-colors";

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
      <label htmlFor={id} className="text-xs font-medium text-sand-400">
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
      <label htmlFor={id} className="text-xs font-medium text-sand-400">
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
      <label htmlFor={id} className="text-xs font-medium text-sand-400">
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
