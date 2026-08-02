import { Skeleton } from "@/components/ui/Skeleton";
import { HeaderSkeleton } from "@/components/ui/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-canvas">
      <HeaderSkeleton />
      <main className="px-4 py-5 max-w-lg mx-auto pb-24">
        {/* Stats grid — mirrors page.tsx: py-5 / mb-5 / space-y-3 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        {/* Stop rows */}
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  );
}
