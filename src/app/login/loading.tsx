import { Skeleton } from "@/components/ui/Skeleton";
import { IS_DEMO } from "@/lib/demo";

export default function Loading() {
  return (
    <main className="min-h-full flex flex-col items-center justify-center bg-canvas px-4 py-10 gap-8">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="w-full max-w-xs flex flex-col gap-5">
        {/* Espeja las dos cards de page.tsx: la de demo (copy + CTA) y la del
            login. Sin esto la pantalla salta de forma al hidratar. */}
        {!IS_DEMO && <Skeleton className="h-[188px] w-full rounded-xl" />}
        <Skeleton className={`w-full rounded-xl ${IS_DEMO ? "h-[152px]" : "h-[236px]"}`} />
      </div>
    </main>
  );
}
