import { MatchTabPanelFallback } from "@/components/match/panels/MatchTabPanelFallback";
import { Skeleton } from "@/components/ui/skeleton";

export default function MatchLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="glass-card border-border/80 space-y-5 rounded-xl px-6 pt-8 pb-8 sm:px-8 sm:pt-10 sm:pb-10">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mx-auto h-14 w-full max-w-md sm:h-20" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <MatchTabPanelFallback />
    </div>
  );
}
