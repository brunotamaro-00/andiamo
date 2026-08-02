import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { Lockup } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Label } from "@/components/ui/Label";
import { cardClass } from "@/components/ui/Card";
import { isAuthenticated } from "@/lib/auth";
import { BRAND_NAME, BRAND_OG_IMAGE, BRAND_TAGLINE, BRAND_TITLE } from "@/lib/brand";
import { DEMO_URL, IS_DEMO } from "@/lib/demo";
import { PEOPLE, personLabel, type Person } from "@/lib/person";
import { getPerson } from "@/lib/person-server";

// `/` redirige acá cuando no hay sesión, así que ESTA es la página que ve un
// crawler al desplegar la tarjeta del link (Word, WhatsApp, Slack). El título
// tiene que ser el de la marca, no "Acceder".
export const metadata: Metadata = {
  title: BRAND_TITLE,
  description: BRAND_TAGLINE,
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: BRAND_TITLE,
    description: BRAND_TAGLINE,
    locale: "es_ES",
    images: [{ url: BRAND_OG_IMAGE, width: 1200, height: 630, alt: BRAND_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_TITLE,
    description: BRAND_TAGLINE,
    images: [BRAND_OG_IMAGE],
  },
};

const ERROR_COPY: Record<string, string> = {
  person: "Elegí Bruno o Katia para entrar.",
  empty: "Ingresá la contraseña.",
  password: "Contraseña incorrecta.",
  throttled: "Demasiados intentos. Probá de nuevo en un minuto.",
};

interface Props {
  searchParams: Promise<{ error?: string; from?: string }>;
}

const CARD = `w-full ${cardClass} p-6`;

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const from = params.from ?? "/";
  const error = params.error ? (ERROR_COPY[params.error] ?? ERROR_COPY.person) : null;

  if (await isAuthenticated()) {
    const isSafePath = /^\/(?![/\\])/.test(from);
    redirect(isSafePath ? from : "/");
  }

  // Enter en el campo de contraseña dispara el PRIMER submit del form, así que
  // el orden de los chips decide con quién entrás sin tocar la pantalla. La
  // cookie `trip_person` (365 días) sobrevive a que expire la sesión, no a un
  // logout explícito — justo el comportamiento que queremos en un dispositivo
  // compartido: sin pista de quién fue el último.
  const last = await getPerson();
  const people: readonly Person[] =
    last === null ? PEOPLE : [last, ...PEOPLE.filter((p) => p !== last)];

  return (
    <main className="min-h-full flex flex-col items-center justify-center bg-canvas px-4 py-10 gap-8">
      <div className="animate-slide-up">
        <Lockup size="xl" tagline={BRAND_TAGLINE} />
      </div>

      <div className="w-full max-w-xs flex flex-col gap-5">
        {/* Puerta principal: casi todo el tráfico de andiamo.lat llega desde el
            CV, así que la demo es la acción primaria y la contraseña la excepción.
            En el propio deploy de demo este bloque sobra. */}
        {!IS_DEMO && (
          <section className={`${CARD} animate-slide-up stagger-2`}>
            <Label as="p">¿Venís desde mi CV o LinkedIn?</Label>
            <p className="text-sm text-ink-2 leading-relaxed">
              Andiamo es la app que usamos día a día en el viaje: por eso pide contraseña. La
              demo pública es exactamente la misma app, con datos de ejemplo.
            </p>
            <Button
              variant="primary"
              href={DEMO_URL}
              rel="noopener"
              className="mt-4 w-full min-h-[48px] gap-2"
            >
              Entrar a la demo
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </section>
        )}

        {!IS_DEMO && (
          <div className="flex items-center gap-3 animate-slide-up stagger-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="label-caps text-ink-faint">
              o
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        )}

        <form action={login} className={`${CARD} space-y-5 animate-slide-up stagger-4`}>
          <input type="hidden" name="from" value={from} />

          {!IS_DEMO && (
            <Field
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              enterKeyHint="go"
              aria-describedby={error ? "login-error" : undefined}
              aria-invalid={params.error === "password" || params.error === "empty" || undefined}
            />
          )}

          <fieldset>
            <legend>
              <Label as="span">¿Quién sos?</Label>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {people.map((p) => (
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

          {/* Región siempre presente: si apareciera recién con el error, algunos
              lectores de pantalla no anuncian el primero. */}
          <p
            id="login-error"
            role="alert"
            aria-live="polite"
            className="text-danger text-xs font-semibold uppercase tracking-wide empty:hidden"
          >
            {error}
          </p>
        </form>
      </div>
    </main>
  );
}
