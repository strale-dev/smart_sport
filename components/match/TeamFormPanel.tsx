"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import { buildTeamHref } from "@/lib/teams/url";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import { FormCompactSummary } from "@/components/match/form-display";
import { formatFixtureKickoffDateTime } from "@/lib/fixtures/display";
import type { Fixture, FormSnapshot } from "@/types/domain";
import { TrendingUpIcon } from "lucide-react";

type TeamFormPanelProps = {
  fixture?: Pick<
    Fixture,
    "externalId" | "status" | "homeTeam" | "awayTeam" | "league"
  >;
  teamName: string;
  teamExternalId?: number;
  form5: FormSnapshot;
  form10: FormSnapshot;
  matchCount: 5 | 10;
};

export function TeamFormPanel({
  fixture,
  teamName,
  teamExternalId,
  form5,
  form10,
  matchCount,
}: TeamFormPanelProps) {
  const timeZone = useViewerTimezone();
  const form = matchCount === 5 ? form5 : form10;

  if (form.results.length === 0) {
    if (fixture && teamExternalId != null) {
      return (
        <MatchEmptyStateFromFixture
          id="formTeam"
          fixture={fixture}
          teamName={teamName}
          teamExternalId={teamExternalId}
          icon={TrendingUpIcon}
          className="py-4"
        />
      );
    }

    return (
      <EmptyState
        icon={TrendingUpIcon}
        title={`No recent results for ${teamName}`}
        description="Finished matches will show here once we have results in our window."
        actions={
          teamExternalId != null
            ? [
                {
                  label: `${teamName} fixtures`,
                  href: buildTeamHref(teamExternalId, "matches"),
                },
              ]
            : undefined
        }
        className="py-4"
      />
    );
  }

  return (
    <div className="space-y-4">
      <FormCompactSummary form={form} />
      <div className="space-y-2">
        {form.results.map((entry) => (
          <div
            key={`${entry.fixtureExternalId}-row`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="min-w-0 truncate">
              {entry.isHome ? "vs" : "@"} {entry.opponentName}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatFixtureKickoffDateTime(entry.kickoffAt, timeZone)}
            </span>
            <span className="font-mono tabular-nums">
              {entry.goalsFor}-{entry.goalsAgainst}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
