import { SparklesIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PredictionChangeSummary } from "@/lib/ingestion/db-read";

type AIInsightsSectionProps = {
  insights: PredictionChangeSummary[];
};

function formatDelta(delta: number): string {
  const percent = Math.round(delta * 100);
  return percent > 0 ? `+${percent}%` : `${percent}%`;
}

export function AIInsightsSection({ insights }: AIInsightsSectionProps) {
  if (insights.length === 0) {
    return (
      <EmptyState
        icon={SparklesIcon}
        title="Prediction insights coming soon"
        description="Notable AI prediction changes will appear here once the prediction engine is live."
      />
    );
  }

  return (
    <div className="space-y-2">
      {insights.map((insight) => (
        <Card key={`${insight.fixtureExternalId}-${insight.updatedAt}`}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium">
                {insight.homeTeamName} vs {insight.awayTeamName}
              </p>
              <p className="text-muted-foreground text-xs">
                Updated {new Date(insight.updatedAt).toLocaleString()}
              </p>
            </div>
            <Badge variant="info" className="font-mono tabular-nums">
              Home win {formatDelta(insight.homeWinDelta)}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
