import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { buildMatchHref } from "@/lib/fixtures/match-url";
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
        title="No notable prediction shifts yet"
        description="When model probabilities move meaningfully, they'll show here. Browse today's ranked picks in the Predictions Center."
        actions={[
          { label: "Open Predictions Center", href: "/predictions" },
          { label: "Browse fixtures", href: "/fixtures", variant: "outline" },
        ]}
      />
    );
  }

  return (
    <div className="space-y-2">
      {insights.map((insight) => (
        <Card key={`${insight.fixtureExternalId}-${insight.updatedAt}`}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="min-w-0 space-y-1">
              <Link
                href={buildMatchHref(insight.fixtureExternalId, "ai")}
                className="hover:text-primary truncate text-sm font-medium hover:underline"
              >
                {insight.homeTeamName} vs {insight.awayTeamName}
              </Link>
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
