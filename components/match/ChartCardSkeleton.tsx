import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardHeader,
} from "@/components/match/MatchAnalyticsCard";
import { Skeleton } from "@/components/ui/skeleton";

type ChartCardSkeletonProps = {
  title: string;
};

export function ChartCardSkeleton({ title }: ChartCardSkeletonProps) {
  return (
    <MatchAnalyticsCard>
      <MatchCardHeader>
        <Skeleton className="h-5 w-40" aria-hidden="true" />
        <span className="sr-only">{title} loading</span>
      </MatchCardHeader>
      <MatchCardContent>
        <Skeleton className="h-64 w-full" aria-hidden="true" />
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
