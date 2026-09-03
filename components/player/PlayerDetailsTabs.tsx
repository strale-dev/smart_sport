"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ComingSoonCard } from "@/components/common/ComingSoonCard";
import { PlayerOverviewFacts } from "@/components/player/PlayerOverviewFacts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parsePlayerTab } from "@/lib/players/url";
import type { Player } from "@/types/domain";

type PlayerDetailsTabsProps = {
  player: Player;
};

export function PlayerDetailsTabs({ player }: PlayerDetailsTabsProps) {
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
        <TabsTrigger value="matches">Matches</TabsTrigger>
        <TabsTrigger value="statistics">Statistics</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <PlayerOverviewFacts player={player} />
        <ComingSoonCard
          title="Attribute overview"
          description="Position-aware attributes will appear here in a later update."
        />
      </TabsContent>

      <TabsContent value="matches">
        <ComingSoonCard
          title="Matches"
          description="Appearances with goals, assists, cards, and minutes will appear here."
        />
      </TabsContent>

      <TabsContent value="statistics">
        <ComingSoonCard
          title="Statistics"
          description="Season and career totals will appear here."
        />
      </TabsContent>
    </Tabs>
  );
}
