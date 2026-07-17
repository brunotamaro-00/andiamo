"use client";

import { useState, useTransition } from "react";
import { setPerson } from "@/app/actions/person";
import { PEOPLE, personLabel, type PersonView } from "@/lib/person";
import { Modal } from "@/components/ui/Modal";

/** Header chip showing who is viewing the expenses, with a modal to switch.
 *  Only the Spitwise spend surfaces read this — everything else is shared. */
export function PersonSwitcher({ person }: { person: PersonView }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const choose = (value: string) => {
    startTransition(async () => {
      await setPerson(value);
      setOpen(false);
    });
  };

  const options: Array<{ value: string; label: string; hint: string }> = [
    ...PEOPLE.map((p) => ({
      value: p as string,
      label: personLabel(p),
      hint: "Su mitad de los gastos compartidos + sus gastos propios",
    })),
    { value: "ambos", label: "Ambos", hint: "Todos los gastos del viaje, sin dividir" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ver gastos de: ${personLabel(person)}. Cambiar`}
        className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink-2 transition-colors duration-150 px-3 py-1.5 rounded-full hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
      >
        {personLabel(person)}
      </button>

      {open && (
        <Modal title="¿Quién sos?" onClose={() => setOpen(false)}>
          <p className="text-sm text-ink-2 mb-4">
            Define de quién son los gastos que ves. El resto del viaje es igual para los dos.
          </p>
          <div className="space-y-2">
            {options.map((opt, i) => {
              const active = (person ?? "ambos") === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  autoFocus={i === 0}
                  disabled={isPending}
                  onClick={() => choose(opt.value)}
                  className={`w-full text-left min-h-[44px] px-3 py-2.5 rounded-lg border-2 transition-colors duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 ${
                    active
                      ? "bg-brick-bg border-brick"
                      : "bg-surface-2 border-border hover:border-border-strong"
                  }`}
                >
                  <span
                    className={`block text-[11px] font-extrabold uppercase tracking-[0.08em] ${
                      active ? "text-brick-ink" : "text-ink"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="block text-[12px] text-ink-2 mt-0.5">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}
