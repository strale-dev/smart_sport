import { Skeleton } from "@/components/ui/skeleton";

export default function LiveLoading() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-20 shrink-0" />
          ))}
        </div>
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-12" />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
