import Link from "next/link";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildTeamHref } from "@/lib/teams/url";
import type { TeamPrimaryContext } from "@/lib/teams/resolve-primary-league";
import type { TeamSeasonStatistics } from "@/types/domain";
import { TrophyIcon } from "lucide-react";

type TeamSeasonSummaryCardProps = {
  teamExternalId: number;
  primaryContext: TeamPrimaryContext | null;
  seasonStats: TeamSeasonStatistics | null;
};

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-mono text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function TeamSeasonSummaryCard({
  teamExternalId,
  primaryContext,
  seasonStats,
}: TeamSeasonSummaryCardProps) {
  if (!primaryContext) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Season summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={TrophyIcon}
            title="Season summary unavailable"
            description="Sync fixtures for this team to infer its primary competition."
          />
        </CardContent>
      </Card>
    );
  }

  const row = primaryContext.standingRow;
  const formString = seasonStats?.form ?? row?.form ?? null;

  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <CardTitle className="font-heading text-base">Season summary</CardTitle>
        <CardDescription>
          {primaryContext.leagueName}
          {primaryContext.seasonYear ? ` · ${primaryContext.seasonYear}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {row ? (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatItem label="Rank" value={row.rank} />
            <StatItem label="Points" value={row.points ?? "–"} />
            <StatItem label="Played" value={row.played ?? "–"} />
            <StatItem label="Goal diff" value={row.goalsDiff ?? "–"} />
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">
            Standings for {primaryContext.leagueName} are not available yet.
          </p>
        )}

        {(seasonStats || formString) && (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {seasonStats?.wins != null ? (
              <StatItem
                label="Record"
                value={`${seasonStats.wins}-${seasonStats.draws ?? 0}-${seasonStats.losses ?? 0}`}
              />
            ) : null}
            {seasonStats?.goalsFor != null ? (
              <StatItem
                label="Goals"
                value={`${seasonStats.goalsFor}-${seasonStats.goalsAgainst ?? 0}`}
              />
            ) : null}
            {seasonStats?.cleanSheets != null ? (
              <StatItem label="Clean sheets" value={seasonStats.cleanSheets} />
            ) : null}
          </dl>
        )}

        {formString ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">Recent form</span>
            {formString.split("").map((result, index) => (
              <Badge key={`${result}-${index}`} variant="outline">
                {result}
              </Badge>
            ))}
          </div>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={buildTeamHref(teamExternalId, "standings")} />}
        >
          View standings
        </Button>
      </CardContent>
    </Card>
  );
}
