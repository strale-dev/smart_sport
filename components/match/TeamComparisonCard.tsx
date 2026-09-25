"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import type {
  Fixture,
  FixtureTeamStatistics,
  FormSnapshot,
} from "@/types/domain";
import { GitCompareArrowsIcon } from "lucide-react";

type TeamComparisonCardProps = {
  fixture: Fixture;
  stats: FixtureTeamStatistics[];
  homeForm: FormSnapshot;
  awayForm: FormSnapshot;
  premiumAnalytics?: boolean;
};

function findTeamStats(
  stats: FixtureTeamStatistics[],
  teamExternalId: number
): FixtureTeamStatistics | undefined {
  return stats.find((entry) => entry.teamExternalId === teamExternalId);
}

export function TeamComparisonCard({
  fixture,
  stats,
  homeForm,
  awayForm,
  premiumAnalytics = true,
}: TeamComparisonCardProps) {
  const homeStats = findTeamStats(stats, fixture.homeTeam.externalId);
  const awayStats = findTeamStats(stats, fixture.awayTeam.externalId);

  const chartData = [
    {
      metric: "Shots",
      home: homeStats?.shotsTotal ?? homeForm.goalsFor,
      away: awayStats?.shotsTotal ?? awayForm.goalsFor,
    },
    {
      metric: "On target",
      home: homeStats?.shotsOnTarget ?? null,
      away: awayStats?.shotsOnTarget ?? null,
    },
    {
      metric: "Possession",
      home: homeStats?.ballPossession ?? homeForm.ppg,
      away: awayStats?.ballPossession ?? awayForm.ppg,
    },
    {
      metric: "Corners",
      home: homeStats?.corners ?? homeForm.wins,
      away: awayStats?.corners ?? awayForm.wins,
    },
  ].filter((row) => row.home != null || row.away != null);

  const visibleChartData = premiumAnalytics ? chartData : chartData.slice(0, 2);

  if (chartData.length === 0) {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>Team comparison</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          <MatchEmptyStateFromFixture
            id="comparison"
            fixture={fixture}
            icon={GitCompareArrowsIcon}
          />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  const flatData = visibleChartData.flatMap((row) => [
    {
      name: `${row.metric} (${fixture.homeTeam.name})`,
      value: row.home ?? 0,
      team: "home" as const,
    },
    {
      name: `${row.metric} (${fixture.awayTeam.name})`,
      value: row.away ?? 0,
      team: "away" as const,
    },
  ]);

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <MatchCardTitle>Team comparison</MatchCardTitle>
        <MatchCardDescription>
          Match stats when available, otherwise recent form proxies
        </MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={flatData}
            layout="vertical"
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 10 }}
            />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {flatData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={
                    entry.team === "home"
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
