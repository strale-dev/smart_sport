import { Skeleton } from "@/components/ui/skeleton";

export default function FavoritesLoading() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, dayIndex) => (
          <div key={dayIndex} className="space-y-4">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <Skeleton key={rowIndex} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
