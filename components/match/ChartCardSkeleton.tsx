import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ChartCardSkeletonProps = {
  title: string;
};

export function ChartCardSkeleton({ title }: ChartCardSkeletonProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-5 w-40" aria-hidden="true" />
        <span className="sr-only">{title} loading</span>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" aria-hidden="true" />
      </CardContent>
    </Card>
  );
}
