import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { Wordmark } from "@/components/Wordmark";
import { Label } from "@/components/ui/Label";
import { isAuthenticated } from "@/lib/auth";
import { PEOPLE, personLabel } from "@/lib/person";

export const metadata: Metadata = { title: "Acceder · Andiamo" };

interface Props {
  searchParams: Promise<{ error?: string; from?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const from = params.from ?? "/";

  if (await isAuthenticated()) {
    const isSafePath = /^\/(?![/\\])/.test(from);
    redirect(isSafePath ? from : "/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 gap-10">
      <div className="text-center animate-slide-up">
        <Wordmark size="lg" />
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mt-2">
          Tu guía de viaje personal
        </p>
      </div>

      <form
        action={login}
        className="w-full max-w-xs bg-surface rounded-xl p-6 card-shadow space-y-5 border border-border animate-slide-up stagger-2"
      >
        <input type="hidden" name="from" value={from} />

        <fieldset>
          <legend>
            <Label as="span">¿Quién sos?</Label>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {PEOPLE.map((p) => (
              <button
                key={p}
                type="submit"
                name="person"
                value={p}
                className="flex items-center justify-center min-h-[56px] px-3 bg-surface-2 border-2 border-border rounded-lg text-sm font-extrabold uppercase tracking-[0.08em] text-ink-2 transition-all duration-150 hover:border-brick hover:bg-brick-bg hover:text-brick-ink active:translate-x-[1px] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
              >
                {personLabel(p)}
              </button>
            ))}
          </div>
        </fieldset>

        {params.error && (
          <p className="text-danger text-xs font-semibold uppercase tracking-wide">
            Elegí Bruno o Katia para entrar.
          </p>
        )}
      </form>
    </div>
  );
}
