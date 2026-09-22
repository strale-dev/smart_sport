import { BarChart3Icon } from "lucide-react";

import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import { StatComparisonRow } from "@/components/match/StatComparisonRow";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import type { Fixture, FixtureTeamStatistics } from "@/types/domain";

type LiveStatsCardProps = {
  fixture: Fixture;
  stats: FixtureTeamStatistics[];
};

function findTeamStats(
  stats: FixtureTeamStatistics[],
  teamExternalId: number
): FixtureTeamStatistics | undefined {
  return stats.find((entry) => entry.teamExternalId === teamExternalId);
}

export function LiveStatsCard({ fixture, stats }: LiveStatsCardProps) {
  const homeStats = findTeamStats(stats, fixture.homeTeam.externalId);
  const awayStats = findTeamStats(stats, fixture.awayTeam.externalId);

  if (!homeStats && !awayStats) {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader className="gap-2">
          <MatchCardTitle>Live stats</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          <MatchEmptyStateFromFixture
            id="liveStats"
            fixture={fixture}
            icon={BarChart3Icon}
          />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  const hasPartialData =
    homeStats?.expectedGoals == null || awayStats?.expectedGoals == null;

  const rows = [
    {
      label: "Shots",
      home: homeStats?.shotsTotal ?? null,
      away: awayStats?.shotsTotal ?? null,
    },
    {
      label: "On target",
      home: homeStats?.shotsOnTarget ?? null,
      away: awayStats?.shotsOnTarget ?? null,
    },
    {
      label: "Corners",
      home: homeStats?.corners ?? null,
      away: awayStats?.corners ?? null,
    },
    {
      label: "Cards",
      home:
        homeStats?.yellowCards != null || homeStats?.redCards != null
          ? (homeStats?.yellowCards ?? 0) + (homeStats?.redCards ?? 0)
          : null,
      away:
        awayStats?.yellowCards != null || awayStats?.redCards != null
          ? (awayStats?.yellowCards ?? 0) + (awayStats?.redCards ?? 0)
          : null,
    },
    ...(homeStats?.expectedGoals != null || awayStats?.expectedGoals != null
      ? [
          {
            label: "xG",
            home: homeStats?.expectedGoals ?? null,
            away: awayStats?.expectedGoals ?? null,
          },
        ]
      : []),
  ].filter((row) => row.home != null || row.away != null);

  const homePossession = homeStats?.ballPossession;
  const awayPossession = awayStats?.ballPossession;

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MatchCardTitle>Live stats</MatchCardTitle>
          {hasPartialData ? <DataQualityChip quality="PARTIAL" /> : null}
        </div>
        <MatchCardDescription className="line-clamp-2 break-words">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent className="space-y-4">
        {homePossession != null && awayPossession != null ? (
          <div className="space-y-2">
            <div className="text-muted-foreground flex justify-between text-xs">
              <span className="font-mono tabular-nums">{homePossession}%</span>
              <span>Possession</span>
              <span className="font-mono tabular-nums">{awayPossession}%</span>
            </div>
            <div className="bg-muted flex h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full"
                style={{ width: `${homePossession}%` }}
              />
              <div
                className="bg-muted-foreground/40 h-full"
                style={{ width: `${awayPossession}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {rows.map((row) => (
            <StatComparisonRow
              key={row.label}
              label={row.label}
              homeValue={row.home}
              awayValue={row.away}
              highlightHigher
            />
          ))}
        </div>
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
