import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 gap-10">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="w-full max-w-xs h-44 rounded-[6px]" />
    </div>
  );
}
