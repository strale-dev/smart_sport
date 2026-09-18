import { SwordsIcon } from "lucide-react";

import { MatchEmptyStateFromFixture } from "@/components/match/MatchEmptyState";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import type { Fixture, H2HSummary } from "@/types/domain";

type H2HCompactCardProps = {
  fixture: Pick<
    Fixture,
    "externalId" | "status" | "homeTeam" | "awayTeam" | "league"
  >;
  h2h: H2HSummary;
};

export function H2HCompactCard({ fixture, h2h }: H2HCompactCardProps) {
  const homeName = fixture.homeTeam.name;
  const awayName = fixture.awayTeam.name;
  const hasMeetings = h2h.meetings.length > 0;

  const homeWins =
    h2h.teamAExternalId === fixture.homeTeam.externalId
      ? h2h.teamAWins
      : h2h.teamBWins;
  const awayWins =
    h2h.teamAExternalId === fixture.homeTeam.externalId
      ? h2h.teamBWins
      : h2h.teamAWins;

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-2">
        <MatchCardTitle>Head to head</MatchCardTitle>
        <MatchCardDescription>
          Last {h2h.windowSize} meetings · All competitions
        </MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent>
        {!hasMeetings ? (
          <MatchEmptyStateFromFixture
            id="h2h"
            fixture={fixture}
            icon={SwordsIcon}
          />
        ) : (
          <p className="text-center text-sm font-medium tabular-nums">
            {homeName} <span className="font-mono text-base">{homeWins}</span>
            <span className="text-muted-foreground mx-2">|</span>
            Draw <span className="font-mono text-base">{h2h.draws}</span>
            <span className="text-muted-foreground mx-2">|</span>
            {awayName} <span className="font-mono text-base">{awayWins}</span>
          </p>
        )}
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
