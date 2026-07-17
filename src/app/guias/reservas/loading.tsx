import { Skeleton } from "@/components/ui/Skeleton";
import { HeaderSkeleton } from "@/components/ui/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <HeaderSkeleton />
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        {/* Intro banner */}
        <Skeleton className="h-14 rounded-xl" />
        {/* Reservas cards */}
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </main>
    </div>
  );
}
