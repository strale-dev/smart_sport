"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { AIHeroDetailedPanel } from "@/components/ai/AIHeroDetailedPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseMatchTab } from "@/lib/fixtures/match-url";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import type { TeamRef } from "@/types/domain";

type MatchDetailsTabsProps = {
  fixtureId: number;
  homeTeam: Pick<TeamRef, "name" | "code">;
  awayTeam: Pick<TeamRef, "name" | "code">;
  overview: ReactNode;
  lineups: ReactNode;
  standings: ReactNode;
  matches: ReactNode;
};

export function MatchDetailsTabs({
  fixtureId,
  homeTeam,
  awayTeam,
  overview,
  lineups,
  standings,
  matches,
}: MatchDetailsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseMatchTab(searchParams.get("tab") ?? undefined);

  function handleTabChange(value: string) {
    const next = new URLSearchParams(searchParams.toString());

    if (value === "overview") {
      next.delete("tab");
    } else {
      next.set("tab", value);
    }

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });

    void captureClientEvent(POSTHOG_EVENTS.matchTabChanged, {
      tab: value,
      fixture_id: fixtureId,
    });
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full gap-4"
    >
      <TabsList
        variant="line"
        className="border-border/70 w-full justify-start overflow-x-auto border-b pb-0"
      >
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="ai">AI Engine</TabsTrigger>
        <TabsTrigger value="lineups">Lineups</TabsTrigger>
        <TabsTrigger value="standings">Standings</TabsTrigger>
        <TabsTrigger value="matches">Matches</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        {overview}
      </TabsContent>

      <TabsContent value="ai">
        <AIHeroDetailedPanel homeTeam={homeTeam} awayTeam={awayTeam} />
      </TabsContent>

      <TabsContent value="lineups">{lineups}</TabsContent>

      <TabsContent value="standings" className="space-y-4">
        {standings}
      </TabsContent>

      <TabsContent value="matches" className="space-y-4">
        {matches}
      </TabsContent>
    </Tabs>
  );
}
