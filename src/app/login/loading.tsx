import { Skeleton } from "@/components/ui/Skeleton";
import { IS_DEMO } from "@/lib/demo";

export default function Loading() {
  return (
    <main className="min-h-full flex flex-col items-center justify-center bg-canvas px-4 py-10 gap-7">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="w-full max-w-xs flex flex-col gap-4">
        {/* Espeja page.tsx: en producción la card de demo + el disclosure
            plegado del gate; en demo, la única card. Sin esto la pantalla salta
            de forma al hidratar. */}
        <Skeleton className={`w-full rounded-xl ${IS_DEMO ? "h-[150px]" : "h-[330px]"}`} />
        {!IS_DEMO && <Skeleton className="h-4 w-40 self-center" />}
      </div>
    </main>
  );
}
