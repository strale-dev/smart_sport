"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TeamDetailsFacts } from "@/components/team/TeamDetailsFacts";
import { TeamFormCard } from "@/components/team/TeamFormCard";
import { TeamGroupedMatchesList } from "@/components/team/TeamGroupedMatchesList";
import { TeamSeasonSummaryCard } from "@/components/team/TeamSeasonSummaryCard";
import { TeamSquadTab } from "@/components/team/TeamSquadTab";
import { TeamStandingsTab } from "@/components/team/TeamStandingsTab";
import { TeamStatisticsTab } from "@/components/team/TeamStatisticsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TeamPrimaryContext } from "@/lib/teams/resolve-primary-league";
import { parseTeamTab } from "@/lib/teams/url";
import { splitFixturesByStatus } from "@/lib/teams/matches";
import type {
  Fixture,
  FormSnapshot,
  SquadPlayer,
  StandingsGroup,
  Team,
  TeamSeasonStatistics,
} from "@/types/domain";

type TeamDetailsTabsProps = {
  team: Team;
  fixtures: Fixture[];
  primaryContext: TeamPrimaryContext | null;
  standings: StandingsGroup[];
  squad: SquadPlayer[];
  seasonStats: TeamSeasonStatistics | null;
  form5All: FormSnapshot;
  form10All: FormSnapshot;
  form5Home: FormSnapshot;
  form10Home: FormSnapshot;
  form5Away: FormSnapshot;
  form10Away: FormSnapshot;
};

export function TeamDetailsTabs({
  team,
  fixtures,
  primaryContext,
  standings,
  squad,
  seasonStats,
  form5All,
  form10All,
  form5Home,
  form10Home,
  form5Away,
  form10Away,
}: TeamDetailsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseTeamTab(searchParams.get("tab") ?? undefined);
  const groups = splitFixturesByStatus(fixtures);

  function handleTabChange(value: string) {
    if (value === activeTab) {
      return;
    }

    const next = new URLSearchParams(searchParams.toString());

    if (value === "details") {
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
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="matches">Matches</TabsTrigger>
        <TabsTrigger value="standings">Standings</TabsTrigger>
        <TabsTrigger value="squad">Squad</TabsTrigger>
        <TabsTrigger value="statistics">Statistics</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        <TeamDetailsFacts team={team} />
        <TeamFormCard
          teamName={team.name}
          form5All={form5All}
          form10All={form10All}
          form5Home={form5Home}
          form10Home={form10Home}
          form5Away={form5Away}
          form10Away={form10Away}
        />
        <TeamSeasonSummaryCard
          teamExternalId={team.externalId}
          primaryContext={primaryContext}
          seasonStats={seasonStats}
        />
      </TabsContent>

      <TabsContent value="matches">
        <TeamGroupedMatchesList
          live={groups.live}
          upcoming={groups.upcoming}
          past={groups.past}
        />
      </TabsContent>

      <TabsContent value="standings">
        <TeamStandingsTab
          leagueName={primaryContext?.leagueName ?? "League"}
          standings={standings}
          teamExternalId={team.externalId}
        />
      </TabsContent>

      <TabsContent value="squad">
        <TeamSquadTab squad={squad} />
      </TabsContent>

      <TabsContent value="statistics">
        <TeamStatisticsTab
          leagueName={primaryContext?.leagueName ?? "League"}
          seasonYear={primaryContext?.seasonYear ?? null}
          stats={seasonStats}
        />
      </TabsContent>
    </Tabs>
  );
}
