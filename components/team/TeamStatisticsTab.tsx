import { BarChart3Icon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeamSeasonStatistics } from "@/types/domain";

type TeamStatisticsTabProps = {
  leagueName: string;
  seasonYear: number | null;
  stats: TeamSeasonStatistics | null;
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
        <dl className="grid gap-3 sm:grid-cols-2">
          {visibleRows.map((row) => (
            <div key={row.label} className="space-y-0.5">
              <dt className="text-muted-foreground text-xs">{row.label}</dt>
              <dd className="font-mono text-sm font-medium tabular-nums">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function TeamStatisticsTab({
  leagueName,
  seasonYear,
  stats,
}: TeamStatisticsTabProps) {
  if (!stats) {
    return (
      <EmptyState
        icon={BarChart3Icon}
        title="Statistics unavailable"
        description="Season statistics will appear once the provider publishes them for this competition."
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
          <CardDescription>
            {leagueName}
            {seasonYear ? ` · ${seasonYear}` : ""}
          </CardDescription>
        </CardHeader>
        {stats.form ? (
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Form:{" "}
              <span className="text-foreground font-medium">{stats.form}</span>
            </p>
          </CardContent>
        ) : null}
      </Card>

      <StatSection
        title="Attacking"
        rows={[
          { label: "Goals", value: stats.goalsFor },
          { label: "Shots", value: stats.shotsTotal },
          { label: "Shots on target", value: stats.shotsOnTarget },
          { label: "Failed to score", value: stats.failedToScore },
        ]}
      />

      <StatSection
        title="Possession"
        rows={[
          {
            label: "Average possession",
            value:
              stats.averagePossession != null
                ? `${stats.averagePossession}%`
                : null,
          },
        ]}
      />

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
          { label: "Goals conceded", value: stats.goalsAgainst },
          { label: "Clean sheets", value: stats.cleanSheets },
          { label: "Tackles", value: stats.tacklesTotal },
          { label: "Interceptions", value: stats.interceptions },
        ]}
      />

      <StatSection
        title="Discipline"
        rows={[
          { label: "Yellow cards", value: stats.yellowCards },
          { label: "Red cards", value: stats.redCards },
          { label: "Fouls committed", value: stats.foulsCommitted },
        ]}
      />
    </div>
  );
}
