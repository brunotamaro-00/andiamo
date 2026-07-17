import type { Metadata } from "next";
import { login } from "@/app/actions/auth";
import { Wordmark } from "@/components/Wordmark";
import { PEOPLE, personLabel } from "@/lib/person";

export const metadata: Metadata = { title: "Acceder · Andiamo" };

interface Props {
  searchParams: Promise<{ error?: string; from?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const from = params.from ?? "/";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 gap-10">
      {/* Logo */}
      <div className="text-center animate-slide-up">
        <Wordmark size="lg" />
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mt-2">
          Tu guía de viaje personal
        </p>
      </div>

      {/* Form card */}
      <form
        action={login}
        className="w-full max-w-xs bg-surface rounded-[6px] p-6 card-shadow space-y-5 border-2 border-border animate-slide-up stagger-2"
      >
        <input type="hidden" name="from" value={from} />

        <div>
          <label
            htmlFor="password"
            className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-1.5"
          >
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:border-brick transition-colors duration-150 hover:border-border-strong"
            placeholder="••••••••"
            required
          />
        </div>

        {/* Only decides whose share of los gastos se muestra — todo lo demás
            del viaje es idéntico para los dos. */}
        <fieldset>
          <legend className="block text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-1.5">
            ¿Quién sos?
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {PEOPLE.map((p) => (
              <label
                key={p}
                className="relative flex items-center justify-center min-h-[44px] px-3 bg-surface-2 border-2 border-border rounded-lg text-sm font-extrabold uppercase tracking-[0.08em] text-ink-2 cursor-pointer transition-colors duration-150 hover:border-border-strong has-[:checked]:bg-brick-bg has-[:checked]:border-brick has-[:checked]:text-brick-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brick/40"
              >
                <input
                  type="radio"
                  name="person"
                  value={p}
                  required
                  className="absolute opacity-0 w-0 h-0"
                />
                {personLabel(p)}
              </label>
            ))}
          </div>
        </fieldset>

        {params.error && (
          <p className="text-danger text-xs font-semibold uppercase tracking-wide">
            Contraseña incorrecta. Intentá de nuevo.
          </p>
        )}

        <button
          type="submit"
          className="w-full py-2.5 bg-brick hover:bg-brick-hover active:bg-brick-press active:translate-x-[3px] active:translate-y-[3px] active:shadow-none text-white font-display uppercase tracking-wide text-sm rounded-[2px] hard-shadow-ink transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
