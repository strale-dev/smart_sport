"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DataQualityChip } from "@/components/ai/DataQualityChip";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlayerAttributeMetrics } from "@/lib/players/attributes";
import type { PlayerPosition, PlayerSeasonStatistics } from "@/types/domain";
import { RadarIcon } from "lucide-react";

type PlayerAttributeOverviewCardProps = {
  position: PlayerPosition | null;
  stats: PlayerSeasonStatistics | null;
};

export function PlayerAttributeOverviewCard({
  position,
  stats,
}: PlayerAttributeOverviewCardProps) {
  if (!stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Attribute overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={RadarIcon}
            title="Attributes unavailable"
            description="Season statistics will appear once the provider publishes them for this competition."
            actions={[{ label: "Browse fixtures", href: "/fixtures" }]}
          />
        </CardContent>
      </Card>
    );
  }

  const metrics = getPlayerAttributeMetrics(stats, position);

  if (metrics.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Attribute overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={RadarIcon}
            title="Attributes unavailable"
            description="Not enough season data to build an attribute profile yet."
            actions={[{ label: "Browse fixtures", href: "/fixtures" }]}
          />
        </CardContent>
      </Card>
    );
  }

  const hasPartialData = metrics.length < 3;

  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">
            Attribute overview
          </CardTitle>
          {hasPartialData ? <DataQualityChip quality="PARTIAL" /> : null}
        </div>
        <CardDescription>
          Position-aware season summary for {stats.leagueName}{" "}
          {stats.seasonYear}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={metrics}
            layout="vertical"
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fontSize: 10 }}
            />
            <Tooltip />
            <Bar
              dataKey="value"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
