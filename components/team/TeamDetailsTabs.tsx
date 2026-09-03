"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ComingSoonCard } from "@/components/common/ComingSoonCard";
import { TeamDetailsFacts } from "@/components/team/TeamDetailsFacts";
import { TeamMatchesList } from "@/components/team/TeamMatchesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseTeamTab } from "@/lib/teams/url";
import { splitFixturesByStatus } from "@/lib/teams/matches";
import type { Fixture, Team } from "@/types/domain";

type TeamDetailsTabsProps = {
  team: Team;
  fixtures: Fixture[];
};

export function TeamDetailsTabs({ team, fixtures }: TeamDetailsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseTeamTab(searchParams.get("tab") ?? undefined);
  const groups = splitFixturesByStatus(fixtures);

  function handleTabChange(value: string) {
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
        <ComingSoonCard
          title="Current form"
          description="Recent results and home/away splits will appear here."
        />
        <ComingSoonCard
          title="Season summary"
          description="A compact season snapshot will appear here when standings and stats are ready."
        />
      </TabsContent>

      <TabsContent value="matches">
        <TeamMatchesList
          live={groups.live}
          upcoming={groups.upcoming}
          past={groups.past}
        />
      </TabsContent>

      <TabsContent value="standings">
        <ComingSoonCard
          title="Standings"
          description="The league table with this club highlighted will appear here."
        />
      </TabsContent>

      <TabsContent value="squad">
        <ComingSoonCard
          title="Squad"
          description="Goalkeepers, defenders, midfielders, and forwards will appear here."
        />
      </TabsContent>

      <TabsContent value="statistics">
        <ComingSoonCard
          title="Statistics"
          description="Attacking, possession, passing, defending, and discipline stats will appear here."
        />
      </TabsContent>
    </Tabs>
  );
}
