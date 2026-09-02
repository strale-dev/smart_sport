"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AIHeroComingSoonCard } from "@/components/ai/AIHeroComingSoonCard";
import { AIHeroLockedCard } from "@/components/ai/AIHeroLockedCard";
import { MatchSectionPlaceholder } from "@/components/match/MatchSectionPlaceholder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseMatchTab } from "@/lib/fixtures/match-url";

type MatchDetailsTabsProps = {
  isGuest: boolean;
  returnTo: string;
};

export function MatchDetailsTabs({ isGuest, returnTo }: MatchDetailsTabsProps) {
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
        <TabsTrigger value="ai">AI analysis</TabsTrigger>
        <TabsTrigger value="lineups">Lineups</TabsTrigger>
        <TabsTrigger value="form">Form & H2H</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <MatchSectionPlaceholder
          title="Live stats"
          description="Shots, possession, corners, cards, and xG will appear here during and after the match."
        />
        <MatchSectionPlaceholder
          title="Timeline"
          description="Goals, cards, substitutions, and other match events will stream here."
        />
      </TabsContent>

      <TabsContent value="ai">
        {isGuest ? (
          <AIHeroLockedCard returnTo={returnTo} />
        ) : (
          <AIHeroComingSoonCard />
        )}
      </TabsContent>

      <TabsContent value="lineups">
        <MatchSectionPlaceholder
          title="Lineups"
          description="Confirmed or predicted starting elevens and substitutes will show here."
        />
      </TabsContent>

      <TabsContent value="form">
        <MatchSectionPlaceholder
          title="Form & head-to-head"
          description="Recent form and head-to-head history between these teams will appear here."
        />
      </TabsContent>
    </Tabs>
  );
}
