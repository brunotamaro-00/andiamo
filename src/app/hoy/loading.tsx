import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto">
          <Skeleton className="h-6 w-32" />
        </div>
      </header>
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
        <Skeleton className="h-16" />
      </main>
    </div>
  );
}
