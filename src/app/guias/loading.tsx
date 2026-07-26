import { Skeleton } from "@/components/ui/Skeleton";
import { HeaderSkeleton } from "@/components/ui/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <HeaderSkeleton />
      <main className="px-4 py-5 max-w-lg mx-auto space-y-6 pb-24">
        {/* "El viaje" list */}
        <Skeleton className="h-40 rounded-xl" />
        {/* Country guides */}
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </main>
    </div>
  );
}
