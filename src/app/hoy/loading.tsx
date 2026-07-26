import { HeaderSkeleton } from "@/components/ui/HeaderSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** /hoy is force-dynamic and resolves the current stop server-side before
 *  redirecting, so tapping the "Hoy" tab has a visible wait. Mirror the stop
 *  detail layout it redirects to, so the skeleton doesn't jump on arrival. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <HeaderSkeleton />
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        {/* City header card */}
        <Skeleton className="h-40 rounded-xl" />
        {/* Prev / next stop */}
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        {/* Guide links */}
        <Skeleton className="h-32 rounded-xl" />
        {/* Notes */}
        <Skeleton className="h-40 rounded-xl" />
      </main>
    </div>
  );
}
