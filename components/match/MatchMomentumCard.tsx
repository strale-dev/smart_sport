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

import { EmptyState } from "@/components/common/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MomentumBucket } from "@/lib/momentum/computeMatchMomentum";
import { ActivityIcon } from "lucide-react";

type MatchMomentumCardProps = {
  homeTeamName: string;
  awayTeamName: string;
  buckets: MomentumBucket[];
};

export function MatchMomentumCard({
  homeTeamName,
  awayTeamName,
  buckets,
}: MatchMomentumCardProps) {
  const hasSignal = buckets.some(
    (bucket) => bucket.homeIntensity > 0 || bucket.awayIntensity > 0
  );

  if (!hasSignal) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Match momentum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ActivityIcon}
            title="Not enough data for momentum"
            description="Momentum builds once events and shot data are available."
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = buckets.map((bucket) => ({
    label: `${bucket.minuteStart}-${bucket.minuteEnd}'`,
    home: bucket.homeIntensity,
    away: bucket.awayIntensity,
  }));

  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <CardTitle className="font-heading text-base">Match momentum</CardTitle>
        <CardDescription>
          5-minute intensity buckets from events and shots
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={28} />
            <Tooltip />
            <Bar
              dataKey="home"
              name={homeTeamName}
              fill="hsl(var(--primary))"
            />
            <Bar
              dataKey="away"
              name={awayTeamName}
              fill="hsl(var(--muted-foreground))"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
