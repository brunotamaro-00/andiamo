import { Skeleton } from "@/components/ui/Skeleton";
import { HeaderSkeleton } from "@/components/ui/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <HeaderSkeleton />
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        {/* Hero (current stop / countdown) */}
        <Skeleton className="h-32 rounded-xl" />
        {/* Spend strip */}
        <Skeleton className="h-16 rounded-xl" />
        {/* Pending POIs card */}
        <Skeleton className="h-40 rounded-xl" />
        {/* Docs / urgent */}
        <Skeleton className="h-24 rounded-xl" />
        {/* Next stop */}
        <Skeleton className="h-16 rounded-xl" />
      </main>
    </div>
  );
}
