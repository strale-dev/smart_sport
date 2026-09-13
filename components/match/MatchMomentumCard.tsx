"use client";

import { useEffect, useRef } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import type { Fixture } from "@/types/domain";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import type { MomentumBucket } from "@/lib/momentum/computeMatchMomentum";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import { ActivityIcon } from "lucide-react";

type MatchMomentumCardProps = {
  fixture: Pick<
    Fixture,
    "externalId" | "status" | "homeTeam" | "awayTeam" | "league"
  >;
  buckets: MomentumBucket[];
};

export function MatchMomentumCard({
  fixture,
  buckets,
}: MatchMomentumCardProps) {
  const { externalId: fixtureId, status } = fixture;
  const homeTeamName = fixture.homeTeam.name;
  const awayTeamName = fixture.awayTeam.name;
  const capturedRef = useRef(false);

  const hasSignal = buckets.some(
    (bucket) => bucket.homeIntensity > 0 || bucket.awayIntensity > 0
  );

  useEffect(() => {
    if (!hasSignal || capturedRef.current) {
      return;
    }

    capturedRef.current = true;
    void captureClientEvent(POSTHOG_EVENTS.matchMomentumViewed, {
      fixture_id: fixtureId,
      status,
      bucket_count: buckets.length,
    });
  }, [buckets.length, fixtureId, hasSignal, status]);

  if (!hasSignal) {
    return (
      <MatchAnalyticsCard>
        <MatchCardHeader>
          <MatchCardTitle>Match momentum</MatchCardTitle>
        </MatchCardHeader>
        <MatchCardContent>
          <MatchEmptyStateFromFixture
            id="momentum"
            fixture={fixture}
            icon={ActivityIcon}
          />
        </MatchCardContent>
      </MatchAnalyticsCard>
    );
  }

  const chartData = buckets.map((bucket) => ({
    label: `${bucket.minuteStart}-${bucket.minuteEnd}'`,
    home: bucket.homeIntensity,
    away: bucket.awayIntensity,
  }));

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <MatchCardTitle>Match momentum</MatchCardTitle>
        <MatchCardDescription>
          5-minute intensity buckets from events and shots
        </MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent className="h-64">
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
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
