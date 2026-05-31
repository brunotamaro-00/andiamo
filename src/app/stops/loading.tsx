import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto">
          <Skeleton className="h-6 w-32" />
        </div>
      </header>
      <main className="px-4 py-6 max-w-lg mx-auto pb-24">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </div>
      </main>
    </div>
  );
}
