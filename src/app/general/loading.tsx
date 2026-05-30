import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        <Skeleton className="h-5 w-24" />
        <div className="flex-1 flex justify-center">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="w-20" />
      </header>
      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </main>
    </div>
  );
}
