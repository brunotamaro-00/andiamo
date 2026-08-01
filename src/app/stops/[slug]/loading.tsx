import { Skeleton } from "@/components/ui/Skeleton";
import { HeaderSkeleton } from "@/components/ui/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-canvas">
      <HeaderSkeleton />
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        {/* City header card */}
        <Skeleton className="h-28 rounded-xl" />
        {/* Prev / next nav */}
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-lg" />
          <Skeleton className="h-11 flex-1 rounded-lg" />
        </div>
        {/* Notes / docs cards */}
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </main>
    </div>
  );
}
