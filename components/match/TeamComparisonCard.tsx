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

import { EmptyState } from "@/components/common/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  if (chartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Team comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={GitCompareArrowsIcon}
            title="Comparison unavailable"
            description="We need match stats or recent form before comparing these teams."
          />
        </CardContent>
      </Card>
    );
  }

  const flatData = chartData.flatMap((row) => [
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
    <Card className="w-full">
      <CardHeader className="gap-2">
        <CardTitle className="font-heading text-base">
          Team comparison
        </CardTitle>
        <CardDescription>
          Match stats when available, otherwise recent form proxies
        </CardDescription>
      </CardHeader>
      <CardContent className="h-72">
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
      </CardContent>
    </Card>
  );
}
