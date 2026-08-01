"use client";

import { useId } from "react";
import { Minus, Plus } from "lucide-react";
import { MAX_NIGHTS } from "@/app/actions/_schemas";
import { labelClass } from "./Field";

/**
 * Nights as a stepper instead of a number input.
 *
 * Nights is the one number that changes the whole trip — it's what the itinerary
 * walk consumes — so it reads as an editorial numeral, not a form field. The
 * typed input stays underneath (a jump from 3 to 12 shouldn't take nine taps),
 * and 0 is a real value: a transit stop lands on the cursor day without
 * advancing it.
 */
export function NightsStepper({
  value,
  onChange,
  name = "nights",
}: {
  value: number;
  onChange: (n: number) => void;
  name?: string;
}) {
  const id = useId();
  const clamp = (n: number) => Math.max(0, Math.min(MAX_NIGHTS, n));

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Noches
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-1.5">
        <StepButton
          label="Una noche menos"
          icon={Minus}
          disabled={value <= 0}
          onClick={() => onChange(clamp(value - 1))}
        />
        <div className="flex flex-1 flex-col items-center justify-center">
          <input
            id={id}
            name={name}
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_NIGHTS}
            value={String(value)}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              onChange(Number.isFinite(n) ? clamp(n) : 0);
            }}
            aria-describedby={`${id}-unit`}
            className="w-full bg-transparent text-center font-numeral text-[26px] leading-none text-ink [appearance:textfield] focus:outline-none focus-visible:text-brick [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span
            id={`${id}-unit`}
            className="mt-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3"
          >
            {value === 0 ? "tránsito · mismo día" : value === 1 ? "noche" : "noches"}
          </span>
        </div>
        <StepButton
          label="Una noche más"
          icon={Plus}
          disabled={value >= MAX_NIGHTS}
          onClick={() => onChange(clamp(value + 1))}
        />
      </div>
    </div>
  );
}

function StepButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink transition-colors duration-150 hover:border-border-strong disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
