"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SparklesIcon } from "lucide-react";

import { ChartCardSkeleton } from "@/components/match/ChartCardSkeleton";
import { PlayerCareerTab } from "@/components/player/PlayerCareerTab";
import { PlayerMatchesTab } from "@/components/player/PlayerMatchesTab";
import { PlayerOverviewFacts } from "@/components/player/PlayerOverviewFacts";
import { PlayerStatisticsTab } from "@/components/player/PlayerStatisticsTab";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parsePlayerTab } from "@/lib/players/url";
import type {
  Player,
  PlayerCareerEntry,
  PlayerMatchHistoryPage,
  PlayerSeasonStatistics,
} from "@/types/domain";

const PlayerAttributeOverviewCardLazy = dynamic(
  () =>
    import("@/components/player/PlayerAttributeOverviewCard").then(
      (module) => module.PlayerAttributeOverviewCard
    ),
  {
    loading: () => <ChartCardSkeleton title="Attribute overview" />,
  }
);

type PlayerDetailsTabsProps = {
  player: Player;
  seasonStats: PlayerSeasonStatistics | null;
  matchHistory: PlayerMatchHistoryPage;
  career: PlayerCareerEntry[];
};

export function PlayerDetailsTabs({
  player,
  seasonStats,
  matchHistory,
  career,
}: PlayerDetailsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parsePlayerTab(searchParams.get("tab") ?? undefined);

  function handleTabChange(value: string) {
    const next = new URLSearchParams(searchParams.toString());

    if (value === "overview") {
      next.delete("tab");
    } else {
      next.set("tab", value);
    }

    if (value !== "matches") {
      next.delete("page");
    }

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full gap-5"
    >
      <TabsList
        variant="line"
        className="border-border/70 w-full justify-start overflow-x-auto border-b pb-0"
      >
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="matches">Matches</TabsTrigger>
        <TabsTrigger value="statistics">Statistics</TabsTrigger>
        <TabsTrigger value="career">Career</TabsTrigger>
        <TabsTrigger value="ai">AI Insight</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <PlayerOverviewFacts player={player} seasonStats={seasonStats} />
        <PlayerAttributeOverviewCardLazy
          position={player.position}
          stats={seasonStats}
        />
      </TabsContent>

      <TabsContent value="matches">
        <PlayerMatchesTab playerId={player.externalId} history={matchHistory} />
      </TabsContent>

      <TabsContent value="statistics">
        <PlayerStatisticsTab
          leagueExternalId={seasonStats?.leagueExternalId ?? null}
          leagueName={seasonStats?.leagueName ?? "League"}
          seasonYear={seasonStats?.seasonYear ?? null}
          position={player.position}
          stats={seasonStats}
        />
      </TabsContent>

      <TabsContent value="career">
        <PlayerCareerTab career={career} />
      </TabsContent>

      <TabsContent value="ai">
        <PlayerAIInsightPanel />
      </TabsContent>
    </Tabs>
  );
}

function PlayerAIInsightPanel() {
  return (
    <Card className="border-primary/20 bg-card/70 ring-primary/10 min-h-[min(28vh,14rem)] w-full ring-1">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SparklesIcon
            aria-hidden="true"
            className="text-primary size-4 shrink-0"
          />
          <CardTitle className="font-heading text-lg">
            AI playing profile
          </CardTitle>
          <Badge variant="outline">Coming soon</Badge>
        </div>
        <CardDescription className="max-w-lg">
          AI summaries of current form, role, and playing style will appear here
          once the AI engine launches in a future update.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
