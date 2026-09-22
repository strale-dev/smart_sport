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
          <div className="grid grid-cols-3 items-start gap-2 text-center text-sm">
            <div className="min-w-0">
              <p className="line-clamp-2 font-medium" title={homeName}>
                {homeName}
              </p>
              <p className="font-mono text-base tabular-nums">{homeWins}</p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground font-medium">Draw</p>
              <p className="font-mono text-base tabular-nums">{h2h.draws}</p>
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 font-medium" title={awayName}>
                {awayName}
              </p>
              <p className="font-mono text-base tabular-nums">{awayWins}</p>
            </div>
          </div>
        )}
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
