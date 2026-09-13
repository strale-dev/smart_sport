"use client";

import { useState } from "react";

import { TeamFormPanel } from "@/components/match/TeamFormPanel";
import {
  MatchAnalyticsCard,
  MatchCardContent,
  MatchCardDescription,
  MatchCardHeader,
  MatchCardTitle,
} from "@/components/match/MatchAnalyticsCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import type { Fixture, FormSnapshot } from "@/types/domain";

type FormCardProps = {
  fixture: Pick<
    Fixture,
    "externalId" | "status" | "homeTeam" | "awayTeam" | "league"
  >;
  homeForm5: FormSnapshot;
  homeForm10: FormSnapshot;
  awayForm5: FormSnapshot;
  awayForm10: FormSnapshot;
};

export function FormCard({
  fixture,
  homeForm5,
  homeForm10,
  awayForm5,
  awayForm10,
}: FormCardProps) {
  const fixtureId = fixture.externalId;
  const homeTeamName = fixture.homeTeam.name;
  const awayTeamName = fixture.awayTeam.name;
  const [matchCount, setMatchCount] = useState<5 | 10>(10);

  function handleMatchCountChange(value: string) {
    const matches = Number(value) as 5 | 10;
    setMatchCount(matches);
    void captureClientEvent(POSTHOG_EVENTS.matchFormScopeChanged, {
      fixture_id: fixtureId,
      scope: "ALL",
      matches,
    });
  }

  return (
    <MatchAnalyticsCard>
      <MatchCardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MatchCardTitle>Recent form</MatchCardTitle>
          <Tabs
            value={String(matchCount)}
            onValueChange={handleMatchCountChange}
          >
            <TabsList>
              <TabsTrigger value="5">Last 5</TabsTrigger>
              <TabsTrigger value="10">Last 10</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <MatchCardDescription>All competitions</MatchCardDescription>
      </MatchCardHeader>
      <MatchCardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{homeTeamName}</h3>
          <TeamFormPanel
            fixture={fixture}
            teamName={homeTeamName}
            teamExternalId={fixture.homeTeam.externalId}
            form5={homeForm5}
            form10={homeForm10}
            matchCount={matchCount}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{awayTeamName}</h3>
          <TeamFormPanel
            fixture={fixture}
            teamName={awayTeamName}
            teamExternalId={fixture.awayTeam.externalId}
            form5={awayForm5}
            form10={awayForm10}
            matchCount={matchCount}
          />
        </div>
      </MatchCardContent>
    </MatchAnalyticsCard>
  );
}
