import { Skeleton } from "@/components/ui/Skeleton";
import { HeaderSkeleton } from "@/components/ui/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="min-h-full bg-canvas">
      <HeaderSkeleton />
      <main className="px-4 py-5 max-w-lg mx-auto pb-24">
        {/* Search input */}
        <Skeleton className="h-11 rounded-xl mb-6" />
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg opacity-60" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-14 rounded-lg opacity-60" />
            <Skeleton className="h-14 rounded-lg opacity-40" />
          </div>
        </div>
      </main>
    </div>
  );
}
