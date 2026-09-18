import { BarChart3Icon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { LeagueLink } from "@/components/common/LeagueLink";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlayerPosition, PlayerSeasonStatistics } from "@/types/domain";

type PlayerStatisticsTabProps = {
  leagueExternalId: number | null;
  leagueName: string;
  seasonYear: number | null;
  position: PlayerPosition | null;
  stats: PlayerSeasonStatistics | null;
};

type StatRow = {
  label: string;
  value: string | number | null;
};

function StatSection({ title, rows }: { title: string; rows: StatRow[] }) {
  const visibleRows = rows.filter((row) => row.value != null);

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-heading text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleRows.map((row) => (
            <div
              key={row.label}
              className="bg-muted/40 min-w-0 rounded-lg px-3 py-2.5"
            >
              <dt className="text-muted-foreground text-[11px] tracking-wide uppercase">
                {row.label}
              </dt>
              <dd className="mt-1 font-mono text-sm font-medium tabular-nums">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function PlayerStatisticsTab({
  leagueExternalId,
  leagueName,
  seasonYear,
  position,
  stats,
}: PlayerStatisticsTabProps) {
  if (!stats) {
    return (
      <EmptyState
        icon={BarChart3Icon}
        title="Statistics unavailable"
        description="Season statistics will appear once the provider publishes them for this competition."
        actions={[{ label: "Browse fixtures", href: "/fixtures" }]}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader className="gap-2">
          <CardTitle className="font-heading text-base">
            Season statistics
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-1">
            {leagueExternalId != null ? (
              <LeagueLink
                leagueExternalId={leagueExternalId}
                leagueName={leagueName}
              />
            ) : (
              <span>{leagueName}</span>
            )}
            {seasonYear ? <span>· {seasonYear}</span> : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Appearances", value: stats.appearances },
              { label: "Lineups", value: stats.lineups },
              { label: "Minutes", value: stats.minutes },
              {
                label: "Average rating",
                value: stats.averageRating?.toFixed(2) ?? null,
              },
            ]
              .filter((row) => row.value != null)
              .map((row) => (
                <div
                  key={row.label}
                  className="bg-muted/40 min-w-0 rounded-lg px-3 py-2.5"
                >
                  <dt className="text-muted-foreground text-[11px] tracking-wide uppercase">
                    {row.label}
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-medium tabular-nums">
                    {row.value}
                  </dd>
                </div>
              ))}
          </dl>
        </CardContent>
      </Card>

      <StatSection
        title="Attacking"
        rows={[
          { label: "Goals", value: stats.goals },
          { label: "Assists", value: stats.assists },
          { label: "Shots", value: stats.shotsTotal },
          { label: "Shots on target", value: stats.shotsOnTarget },
          { label: "Key passes", value: stats.keyPasses },
          { label: "Penalties scored", value: stats.penaltiesScored },
        ]}
      />

      {position === "GK" ? (
        <StatSection
          title="Goalkeeping"
          rows={[
            { label: "Saves", value: stats.saves },
            { label: "Goals conceded", value: stats.goalsConceded },
          ]}
        />
      ) : null}

      <StatSection
        title="Passing"
        rows={[
          { label: "Passes", value: stats.passesTotal },
          {
            label: "Pass accuracy",
            value:
              stats.passesAccuracy != null ? `${stats.passesAccuracy}%` : null,
          },
        ]}
      />

      <StatSection
        title="Defending"
        rows={[
          { label: "Tackles", value: stats.tacklesTotal },
          { label: "Interceptions", value: stats.interceptions },
          { label: "Blocks", value: stats.blocks },
          { label: "Dribbles attempted", value: stats.dribblesAttempted },
          { label: "Dribbles success", value: stats.dribblesSuccess },
        ]}
      />

      <StatSection
        title="Discipline"
        rows={[
          { label: "Yellow cards", value: stats.yellowCards },
          { label: "Red cards", value: stats.redCards },
          { label: "Fouls committed", value: stats.foulsCommitted },
          { label: "Fouls drawn", value: stats.foulsDrawn },
        ]}
      />
    </div>
  );
}
