import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-strong px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        <Skeleton className="h-5 w-16" />
        <div className="flex-1 flex justify-center">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="w-20" />
      </header>
      <main className="px-4 py-5 max-w-lg mx-auto space-y-5 pb-24">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-28 w-full" />
      </main>
    </div>
  );
}
