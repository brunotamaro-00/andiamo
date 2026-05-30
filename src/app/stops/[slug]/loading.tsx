import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-[1000] bg-canvas/90 backdrop-blur border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        <Skeleton className="h-5 w-24" />
        <div className="flex-1 flex justify-center">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="w-20" />
      </header>
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 flex-1" />
        </div>
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </main>
    </div>
  );
}
