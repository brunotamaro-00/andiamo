import type { Metadata } from "next";
import { login } from "@/app/actions/auth";
import { Plane } from "lucide-react";

export const metadata: Metadata = { title: "Acceder — Trip 2026" };

interface Props {
  searchParams: Promise<{ error?: string; from?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const from = params.from ?? "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-950 px-4">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gold-900 border border-gold-700/50 flex items-center justify-center">
              <Plane
                size={22}
                strokeWidth={1.5}
                aria-hidden="true"
                className="text-gold-400"
              />
            </div>
          </div>
          <h1 className="text-2xl font-semibold font-display text-sand-100">
            Europa 2026
          </h1>
          <p className="text-sand-500 text-sm mt-1">Guía de viaje personal</p>
        </div>

        {/* Login form */}
        <form
          action={login}
          className="bg-sand-900 rounded-2xl p-6 shadow-xl space-y-4 border border-sand-800"
        >
          <input type="hidden" name="from" value={from} />

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-sand-300 mb-1.5"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              className="w-full px-3 py-2.5 bg-sand-850 border border-sand-700 rounded-xl text-sand-100 placeholder:text-sand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-900 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {params.error && (
            <p className="text-danger text-sm">
              Contraseña incorrecta. Intentá de nuevo.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-gold-400 hover:bg-gold-300 active:bg-gold-500 text-sand-950 font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-900"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
