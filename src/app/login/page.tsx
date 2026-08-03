import { ArrowUpRight, ChevronRight } from "lucide-react";
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
  empty: "Ingresá la contraseña.",
  password: "Contraseña incorrecta.",
  throttled: "Demasiados intentos. Probá de nuevo en un minuto.",
};

interface Props {
  searchParams: Promise<{ error?: string; from?: string }>;
}

const CARD = `w-full ${cardClass} p-5`;

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const from = params.from ?? "/";
  const error = params.error ? (ERROR_COPY[params.error] ?? ERROR_COPY.password) : null;

  if (await isAuthenticated()) {
    const isSafePath = /^\/(?![/\\])/.test(from);
    redirect(isSafePath ? from : "/");
  }

  return (
    <main className="min-h-full flex flex-col items-center justify-center bg-canvas px-4 py-10 gap-7">
      <div className="animate-slide-up">
        <Lockup size="xl" tagline={BRAND_TAGLINE} />
      </div>

      <div className="w-full max-w-xs flex flex-col gap-4">
        {IS_DEMO ? (
          /* En el propio deploy de demo no hay nada que explicar ni que elegir:
             una pantalla, un botón, adentro. Quién sos lo resuelve el server
             (siempre Bruno) — ver actions/auth.ts. */
          <form action={login} className={`${CARD} animate-slide-up stagger-2`}>
            <input type="hidden" name="from" value={from} />
            <p className="text-sm text-ink-2 leading-relaxed">
              Estás entrando a la demo pública de Andiamo: la misma app que usamos en el viaje,
              con datos de ejemplo que se regeneran cada noche.
            </p>
            <Button type="submit" variant="primary" className="mt-4 w-full min-h-[52px]">
              Entrar a la demo
            </Button>
          </form>
        ) : (
          <>
            {/* Puerta principal: casi todo el tráfico de andiamo.lat llega desde
                el CV, así que la demo es el único focal de la pantalla y la
                contraseña se pliega abajo. */}
            <section className={`${CARD} animate-slide-up stagger-2`}>
              <Label as="p">¿Venís desde mi CV o LinkedIn?</Label>
              <p className="text-sm text-ink-2 leading-relaxed">
                Andiamo es la app que usamos todos los días en el viaje: itinerario, guías,
                documentos y los gastos en vivo. La demo pública es exactamente la misma app,
                con datos de ejemplo.
              </p>

              <Button
                variant="primary"
                href={DEMO_URL}
                rel="noopener"
                className="mt-4 w-full min-h-[52px] gap-2"
              >
                Entrar a la demo
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Button>
              <p className="mt-2.5 text-caption text-ink-3 text-center text-balance">
                Next.js 16 · React 19 · Prisma · PWA offline
              </p>
            </section>

            {/* El gate no compite con el CTA: vive plegado y se abre solo cuando
                hay un error que mostrar. `<details>` nativo — la pantalla sigue
                funcionando sin JS, igual que el resto del login. */}
            <details open={error !== null} className="group animate-slide-up stagger-3">
              <summary className="flex items-center justify-center gap-1 min-h-[44px] cursor-pointer list-none label-caps text-ink-3 hover:text-ink-2 transition-colors duration-150 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  className="w-3.5 h-3.5 transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none"
                  aria-hidden="true"
                />
                Soy Bruno o Katia
              </summary>

              <form action={login} className={`${CARD} mt-2 space-y-4`}>
                <input type="hidden" name="from" value={from} />

                <Field
                  label="Contraseña"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  autoFocus={error !== null}
                  aria-describedby={error ? "login-error" : undefined}
                  aria-invalid={params.error === "password" || params.error === "empty" || undefined}
                />

                <Button type="submit" variant="primary" className="w-full">
                  Entrar
                </Button>

                {/* Región siempre presente: si apareciera recién con el error,
                    algunos lectores de pantalla no anuncian el primero. */}
                <p
                  id="login-error"
                  role="alert"
                  aria-live="polite"
                  className="text-danger text-xs font-semibold uppercase tracking-wide empty:hidden"
                >
                  {error}
                </p>
              </form>
            </details>
          </>
        )}
      </div>
    </main>
  );
}
