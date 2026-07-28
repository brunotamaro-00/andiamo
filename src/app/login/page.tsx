import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { Lockup } from "@/components/Brand";
import { Label } from "@/components/ui/Label";
import { isAuthenticated } from "@/lib/auth";
import { BRAND_NAME, BRAND_OG_IMAGE, BRAND_TAGLINE, BRAND_TITLE } from "@/lib/brand";
import { PEOPLE, personLabel } from "@/lib/person";

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
      <div className="animate-slide-up">
        <Lockup size="xl" tagline={BRAND_TAGLINE} />
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
