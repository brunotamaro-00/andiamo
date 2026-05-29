import { login } from "@/app/actions/auth";

export const metadata = { title: "Acceder — Trip 2026" };

interface Props {
  searchParams: Promise<{ error?: string; from?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const from = params.from ?? "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✈️</div>
          <h1 className="text-2xl font-bold text-slate-100">Europa 2026</h1>
          <p className="text-slate-400 text-sm mt-1">Guía de viaje personal</p>
        </div>

        <form action={login} className="bg-slate-900 rounded-2xl p-6 shadow-xl space-y-4">
          <input type="hidden" name="from" value={from} />

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          {params.error && (
            <p className="text-red-400 text-sm">Contraseña incorrecta. Intentá de nuevo.</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold rounded-lg transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
