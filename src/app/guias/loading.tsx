import { Skeleton } from "@/components/ui/Skeleton";
import { HeaderSkeleton } from "@/components/ui/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-canvas">
      <HeaderSkeleton />
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        {/* "El viaje" list */}
        <Skeleton className="h-36 rounded-xl" />
        {/* Country: grouped guide rows + doc chips */}
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </main>
    </div>
  );
}
