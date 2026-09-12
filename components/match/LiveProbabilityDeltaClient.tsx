"use client";

import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMatchLiveContext } from "@/components/match/MatchLiveSession";
import { formatWinProbability } from "@/lib/ai/format";
import {
  fetchLiveProbabilityDelta,
  type LiveProbabilityDeltaResponse,
} from "@/lib/live/live-probability-delta";
import { liveKeys } from "@/lib/live/query-keys";
import { isFinishedFixtureStatus } from "@/lib/fixtures/display";
import { isLiveFixtureStatus } from "@/lib/redis/keys";
import type { WinProbabilities } from "@/types/prediction";
import { TrendingUpIcon } from "lucide-react";

type LiveProbabilityDeltaClientProps = {
  fixtureProviderId: number;
  fixtureStatus: string;
  initialData?: LiveProbabilityDeltaResponse;
};

function DeltaRow({
  label,
  from,
  to,
}: {
  label: string;
  from: number | null;
  to: number | null;
}) {
  if (from == null && to == null) {
    return null;
  }

  const delta =
    from != null && to != null ? Number((to - from).toFixed(3)) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">
        {from != null ? formatWinProbability(from) : "—"} →{" "}
        {to != null ? formatWinProbability(to) : "—"}
        {delta != null && Math.abs(delta) >= 0.005 ? (
          <span
            className={
              delta > 0 ? "ml-2 text-emerald-500" : "ml-2 text-red-400"
            }
          >
            {delta > 0 ? "▲" : "▼"} {formatWinProbability(Math.abs(delta))}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function renderRows(
  prematch: WinProbabilities | null,
  live: WinProbabilities | null
) {
  return (
    <div className="space-y-2">
      <DeltaRow
        label="Home"
        from={prematch?.home ?? null}
        to={live?.home ?? null}
      />
      <DeltaRow
        label="Draw"
        from={prematch?.draw ?? null}
        to={live?.draw ?? null}
      />
      <DeltaRow
        label="Away"
        from={prematch?.away ?? null}
        to={live?.away ?? null}
      />
    </div>
  );
}

export function LiveProbabilityDeltaClient({
  fixtureProviderId,
  fixtureStatus,
  initialData,
}: LiveProbabilityDeltaClientProps) {
  const liveContext = useMatchLiveContext();
  const isLive = isLiveFixtureStatus(
    fixtureStatus as Parameters<typeof isLiveFixtureStatus>[0]
  );
  const isFinished = isFinishedFixtureStatus(
    fixtureStatus as Parameters<typeof isFinishedFixtureStatus>[0]
  );

  const query = useQuery({
    queryKey: liveKeys.probabilityDelta(fixtureProviderId),
    queryFn: () => fetchLiveProbabilityDelta(fixtureProviderId),
    initialData,
    enabled: isLive || isFinished || liveContext?.isLive === true,
  });

  const prematch = query.data?.prematch ?? null;
  const live = query.data?.live ?? null;

  if (!prematch && !live) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Live win probability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={TrendingUpIcon}
            title="No model baseline yet"
            description="Pre-match probabilities will appear here once the fixture is analyzed."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="gap-1">
        <CardTitle className="font-heading text-base">
          Live win probability
        </CardTitle>
        {live == null ? (
          <p className="text-muted-foreground text-xs">
            Waiting for the model to react to live events.
          </p>
        ) : query.data?.liveMinute != null ? (
          <p className="text-muted-foreground text-xs">
            Updated at {query.data.liveMinute}&apos;
          </p>
        ) : null}
      </CardHeader>
      <CardContent>{renderRows(prematch, live)}</CardContent>
    </Card>
  );
}
