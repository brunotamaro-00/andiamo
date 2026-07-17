import { Skeleton } from "@/components/ui/Skeleton";

/** Loading-state twin of PageHeader — same sticky container, background,
 *  border and paddings so the header doesn't jump when real content lands. */
export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-10 bg-surface backdrop-blur-md border-b border-border-strong px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3 min-h-[44px]">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-14 rounded-full" />
      </div>
    </header>
  );
}
