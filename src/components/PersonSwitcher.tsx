"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { setPerson } from "@/app/actions/person";
import { PEOPLE, personLabel, type PersonView } from "@/lib/person";
import { Modal } from "@/components/ui/Modal";
import { MutationErrorBanner } from "@/components/ui/MutationErrorBanner";

/** "Ya preguntamos en esta pestaña". sessionStorage y no un ref: cada navegación
 *  remonta el componente, así que sin esto el prompt reaparecería al volver a la
 *  lista. Se marca al cerrarlo, no al abrirlo — si el visitante se fue de la
 *  pantalla sin contestar, la pregunta sigue pendiente. */
const ASKED_KEY = "andiamo_person_asked";

/* El estado inicial no puede leer sessionStorage (no existe en el server), así
 * que el prompt se decide recién con la app hidratada — mismo patrón que
 * DemoIntro. Derivado en el render, no en un efecto: un setState sincrónico en
 * useEffect encadena renders (y lo prohíbe react-hooks/set-state-in-effect). */
const subscribeNoop = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

function alreadyAsked(): boolean {
  try {
    return sessionStorage.getItem(ASKED_KEY) === "1";
  } catch {
    // Safari en modo privado tira al tocar el storage. Sin memoria preferimos no
    // insistir: "Ambos" es un estado válido, no un formulario a medio llenar.
    return true;
  }
}

function markAsked() {
  try {
    sessionStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* idem */
  }
}

interface Props {
  person: PersonView;
  /** Abre el modal solo/solita la primera vez de la sesión. Lo pasa `/stops`
   *  cuando no hay cookie `trip_person` — el login ya no pregunta quién sos, así
   *  que la pregunta se hace acá, una vez, con la app ya a la vista. */
  promptWhenUnset?: boolean;
}

/** Header chip showing who is viewing the expenses, with a modal to switch.
 *  Only the Spitwise spend surfaces read this — everything else is shared. */
export function PersonSwitcher({ person, promptWhenUnset = false }: Props) {
  const hydrated = useSyncExternalStore(subscribeNoop, getTrue, getFalse);
  const [open, setOpen] = useState(false);
  const [promptAnswered, setPromptAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const prompting = promptWhenUnset && hydrated && !promptAnswered && !alreadyAsked();

  const close = () => {
    if (prompting) {
      markAsked();
      setPromptAnswered(true);
    }
    setOpen(false);
  };

  const choose = (value: string) => {
    startTransition(async () => {
      // setPerson resolves { error } instead of throwing — keep the sheet open
      // and surface it rather than reporting a switch that never happened.
      const result = await setPerson(value);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      close();
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
        className="min-h-[44px] label-caps text-ink-3 hover:text-ink-2 transition-colors duration-150 px-3 rounded-full hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
      >
        {personLabel(person)}
      </button>

      {(open || prompting) && (
        <Modal title="¿Quién sos?" onClose={close} locked={isPending}>
          <p className="text-sm text-ink-2 mb-4">
            Define de quién son los gastos que ves. El resto del viaje es igual para los dos.
          </p>
          <MutationErrorBanner message={error} />
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
                    className={`block label-caps ${
                      active ? "text-brick-ink" : "text-ink"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="block text-meta text-ink-2 mt-0.5">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}
