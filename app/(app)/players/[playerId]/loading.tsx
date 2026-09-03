import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerLoading() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="border-border/70 w-full space-y-4 rounded-xl border p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-20 shrink-0" />
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
