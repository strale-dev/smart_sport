import { MatchTabPanelFallback } from "@/components/match/panels/MatchTabPanelFallback";
import { Skeleton } from "@/components/ui/skeleton";

export default function MatchLoading() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-6 w-48" />
      </div>
      <MatchTabPanelFallback />
    </div>
  );
}
