"use client";

import Link from "next/link";

import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import { useViewerTimezone } from "@/components/providers/ViewerTimezoneProvider";
import { Button } from "@/components/ui/button";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardFooter,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { formatFixtureKickoffDateTime } from "@/lib/fixtures/display";
import { buildMatchHref } from "@/lib/fixtures/match-url";
import type { Fixture, H2HSummary } from "@/types/domain";
import { SwordsIcon } from "lucide-react";

const PREVIEW_MEETING_COUNT = 3;

type H2HPreviewCardProps = {
  fixture: Pick<
    Fixture,
    "externalId" | "status" | "homeTeam" | "awayTeam" | "league"
  >;
  h2hAll: H2HSummary;
};

export function H2HPreviewCard({ fixture, h2hAll }: H2HPreviewCardProps) {
  const timeZone = useViewerTimezone();
  const previewMeetings = h2hAll.meetings.slice(0, PREVIEW_MEETING_COUNT);
  const matchesHref = buildMatchHref(fixture.externalId, "matches");
  const homeTeamName = fixture.homeTeam.name;
  const awayTeamName = fixture.awayTeam.name;
  const hasMeetings = h2hAll.meetings.length > 0;

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <MatchCardTitle>Head to head</MatchCardTitle>
        <MatchCardDescription>
          Last {h2hAll.windowSize} meetings · All competitions
        </MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent className="space-y-4">
        {!hasMeetings ? (
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
                  {h2hAll.teamAWins}
                </p>
                <p className="text-muted-foreground text-xs">
                  {homeTeamName} wins
                </p>
              </div>
              <div>
                <p className="font-mono text-xl tabular-nums">{h2hAll.draws}</p>
                <p className="text-muted-foreground text-xs">Draws</p>
              </div>
              <div>
                <p className="font-mono text-xl tabular-nums">
                  {h2hAll.teamBWins}
                </p>
                <p className="text-muted-foreground text-xs">
                  {awayTeamName} wins
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {previewMeetings.map((meeting) => (
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
      {hasMeetings ? (
        <MatchCardFooter className="border-border/70 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={matchesHref} />}
          >
            See full head-to-head on Matches
          </Button>
        </MatchCardFooter>
      ) : null}
    </MatchAnalyticsCard>
  );
}
