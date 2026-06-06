import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto">
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </header>
      <main className="px-4 py-5 max-w-lg mx-auto pb-24">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14 opacity-60" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-14" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-14 opacity-60" />
            <Skeleton className="h-14 opacity-40" />
          </div>
        </div>
      </main>
    </div>
  );
}
