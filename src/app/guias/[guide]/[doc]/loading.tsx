import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-strong px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        <Skeleton className="h-5 w-16" />
        <div className="flex-1 flex justify-center">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="w-20" />
      </header>
      <main className="px-4 py-5 max-w-lg mx-auto pb-24 space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    </div>
  );
}
