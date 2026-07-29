import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { IS_DEMO } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireAuth();
  // En la demo el primer aterrizaje es el itinerario completo, centrado en la
  // parada de hoy: alguien que llega de un CV necesita ver que hay un viaje
  // atrás, no el detalle de una ciudad suelta. La parada del día sigue a un tap
  // de distancia en la TabBar (/hoy, que no se toca).
  if (IS_DEMO) redirect("/stops#current");

  const slug = await getCurrentStopSlug();
  redirect(slug ? `/stops/${slug}` : "/stops");
}
