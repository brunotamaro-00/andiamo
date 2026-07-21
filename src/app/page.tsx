import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getCurrentStopSlug } from "@/lib/current-stop";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireAuth();
  const slug = await getCurrentStopSlug();
  redirect(slug ? `/stops/${slug}` : "/stops");
}
