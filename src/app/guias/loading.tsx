import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-strong px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        <Skeleton className="h-5 w-20" />
        <div className="flex-1 flex justify-center">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="w-20" />
      </header>
      <main className="px-4 py-5 max-w-lg mx-auto space-y-6 pb-24">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </main>
    </div>
  );
}
