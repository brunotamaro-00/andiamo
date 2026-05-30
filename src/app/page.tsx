import { redirect } from "next/navigation";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { requireAuth } from "@/lib/auth";

export default async function HomePage() {
  await requireAuth();
  const slug = await getCurrentStopSlug();
  if (slug) {
    redirect(`/stops/${slug}`);
  }
  redirect("/stops");
}
