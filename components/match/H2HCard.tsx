"use client";

import { useState } from "react";

import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFixtureKickoffDateTime } from "@/lib/fixtures/display";
import { resolveMatchFixtureContext } from "@/lib/match/fixture-context";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import type { Fixture, H2HScope, H2HSummary } from "@/types/domain";
import { SwordsIcon } from "lucide-react";

type H2HCardProps = {
  fixture: Pick<
    Fixture,
    "externalId" | "status" | "homeTeam" | "awayTeam" | "league"
  >;
  h2hAll: H2HSummary;
  h2hSameComp: H2HSummary;
  premiumAnalytics?: boolean;
};

export function H2HCard({
  fixture,
  h2hAll,
  h2hSameComp,
  premiumAnalytics = true,
}: H2HCardProps) {
  const fixtureId = fixture.externalId;
  const homeTeamName = fixture.homeTeam.name;
  const awayTeamName = fixture.awayTeam.name;
  const timeZone = useViewerTimezone();
  const [scope, setScope] = useState<H2HScope>("ALL");
  const summary = scope === "ALL" ? h2hAll : h2hSameComp;
  const h2hSameCompLabel = resolveMatchFixtureContext({
    leagueExternalId: fixture.league.externalId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  }).h2hSameCompLabel;

  function handleScopeChange(value: string) {
    const nextScope = value as H2HScope;
    if (nextScope === "SAME_COMP" && !premiumAnalytics) {
      return;
    }
    setScope(nextScope);
    void captureClientEvent(POSTHOG_EVENTS.matchH2hScopeChanged, {
      fixture_id: fixtureId,
      scope: nextScope,
    });
  }

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MatchCardTitle>Head to head</MatchCardTitle>
          <Tabs value={scope} onValueChange={handleScopeChange}>
            <TabsList>
              <TabsTrigger value="ALL">All comps</TabsTrigger>
              <TabsTrigger value="SAME_COMP" disabled={!premiumAnalytics}>
                {h2hSameCompLabel}
                {premiumAnalytics ? "" : " · Premium"}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <MatchCardDescription>
          Last {summary.windowSize} meetings between {homeTeamName} and{" "}
          {awayTeamName}
        </MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent className="space-y-4">
        {summary.meetings.length === 0 ? (
          <MatchEmptyStateFromFixture
            id="h2h"
            fixture={fixture}
            icon={SwordsIcon}
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="font-mono text-xl tabular-nums">
                  {summary.teamAWins}
                </p>
                <p className="text-muted-foreground text-xs">
                  {homeTeamName} wins
                </p>
              </div>
              <div>
                <p className="font-mono text-xl tabular-nums">
                  {summary.draws}
                </p>
                <p className="text-muted-foreground text-xs">Draws</p>
              </div>
              <div>
                <p className="font-mono text-xl tabular-nums">
                  {summary.teamBWins}
                </p>
                <p className="text-muted-foreground text-xs">
                  {awayTeamName} wins
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {summary.meetings.map((meeting) => (
                <div
                  key={meeting.fixtureExternalId}
                  className="border-border/70 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {meeting.homeTeamName} vs {meeting.awayTeamName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatFixtureKickoffDateTime(
                        meeting.kickoffAt,
                        timeZone
                      )}
                      {meeting.leagueName ? ` · ${meeting.leagueName}` : ""}
                    </p>
                  </div>
                  <p className="font-mono tabular-nums">
                    {meeting.homeScore ?? "–"} - {meeting.awayScore ?? "–"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
