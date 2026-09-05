import { Skeleton } from "@/components/ui/skeleton";

export function MatchTabPanelFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
