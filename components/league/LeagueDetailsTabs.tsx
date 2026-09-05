"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { LeagueFixturesTab } from "@/components/league/LeagueFixturesTab";
import { LeagueOverviewTab } from "@/components/league/LeagueOverviewTab";
import { LeagueStandingsTab } from "@/components/league/LeagueStandingsTab";
import { LeagueTopStatsTab } from "@/components/league/LeagueTopStatsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseLeagueTab } from "@/lib/leagues/url";
import type {
  Fixture,
  League,
  LeaguePlayerLeaderboardRow,
  LeagueStatLeaderboard,
  Season,
  StandingsGroup,
} from "@/types/domain";

type LeagueDetailsTabsProps = {
  league: League;
  seasons: Season[];
  seasonYear: number | null;
  standings: StandingsGroup[];
  fixtures: Fixture[];
  topScorers: LeaguePlayerLeaderboardRow[];
  topStats: LeagueStatLeaderboard[];
};

export function LeagueDetailsTabs({
  league,
  seasons,
  seasonYear,
  standings,
  fixtures,
  topScorers,
  topStats,
}: LeagueDetailsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseLeagueTab(searchParams.get("tab") ?? undefined);

  function handleTabChange(value: string) {
    if (value === activeTab) {
      return;
    }

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
        <TabsTrigger value="standings">Standings</TabsTrigger>
        <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
        <TabsTrigger value="top-stats">Top stats</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <LeagueOverviewTab
          league={league}
          seasons={seasons}
          seasonYear={seasonYear}
          standings={standings}
          topScorers={topScorers}
          fixtures={fixtures}
        />
      </TabsContent>

      <TabsContent value="standings">
        <LeagueStandingsTab leagueName={league.name} standings={standings} />
      </TabsContent>

      <TabsContent value="fixtures">
        <LeagueFixturesTab fixtures={fixtures} />
      </TabsContent>

      <TabsContent value="top-stats">
        <LeagueTopStatsTab leaderboards={topStats} />
      </TabsContent>
    </Tabs>
  );
}
