import { Skeleton } from "@/components/ui/Skeleton";
import { HeaderSkeleton } from "@/components/ui/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <HeaderSkeleton />
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        {/* Notes card */}
        <Skeleton className="h-44 rounded-xl" />
        {/* Documents card */}
        <Skeleton className="h-44 rounded-xl" />
      </main>
    </div>
  );
}
