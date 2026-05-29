import { redirect } from "next/navigation";
import { getCurrentStopSlug } from "@/lib/current-stop";

export default async function HomePage() {
  const slug = await getCurrentStopSlug();
  if (slug) {
    redirect(`/stops/${slug}`);
  }
  redirect("/stops");
}
