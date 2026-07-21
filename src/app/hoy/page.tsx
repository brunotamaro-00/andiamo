import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getCurrentStopSlug } from "@/lib/current-stop";

// "Hoy" is no longer a dashboard — it resolves the current stop (per viewer and
// today's date) and redirects to its detail page. The TabBar "Hoy" button and
// "/" both land here. Dynamic: the target depends on the date and the cookie.
export const dynamic = "force-dynamic";

export default async function HoyPage() {
  await requireAuth();
  const slug = await getCurrentStopSlug();
  redirect(slug ? `/stops/${slug}` : "/stops");
}
