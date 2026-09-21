"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

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
  showStandingsTab?: boolean;
  overview: ReactNode;
  lineups: ReactNode;
  statistics: ReactNode;
  standings: ReactNode;
  matches: ReactNode;
};

/** Matches TopNav `h-14` — tab bar pins directly beneath it. */
const MATCH_TAB_NAV_TOP_PX = 56;

const matchTabsListClassName =
  "flex h-auto min-h-11 w-full max-w-full flex-nowrap gap-2 border-b-0 pb-1 max-md:snap-x max-md:snap-mandatory max-md:scroll-px-1 max-md:overflow-x-auto max-md:overscroll-x-contain max-md:[scrollbar-width:none] md:gap-1 md:overflow-x-visible md:pb-0 max-md:[&::-webkit-scrollbar]:hidden";

const matchTabTriggerClassName =
  "max-md:snap-start shrink-0 px-4 py-2.5 md:min-w-0 md:flex-1 md:px-3 md:py-2";

function MatchTabNavList({ showStandingsTab }: { showStandingsTab: boolean }) {
  return (
    <>
      <TabsTrigger value="overview" className={matchTabTriggerClassName}>
        Overview
      </TabsTrigger>
      <TabsTrigger value="ai" className={matchTabTriggerClassName}>
        AI Engine
      </TabsTrigger>
      <TabsTrigger value="lineups" className={matchTabTriggerClassName}>
        Lineups
      </TabsTrigger>
      <TabsTrigger value="statistics" className={matchTabTriggerClassName}>
        Statistics
      </TabsTrigger>
      {showStandingsTab ? (
        <TabsTrigger value="standings" className={matchTabTriggerClassName}>
          Standings
        </TabsTrigger>
      ) : null}
      <TabsTrigger value="matches" className={matchTabTriggerClassName}>
        Matches
      </TabsTrigger>
    </>
  );
}

function MatchTabNavListBar({
  showStandingsTab,
}: {
  showStandingsTab: boolean;
}) {
  return (
    <TabsList variant="line" className={matchTabsListClassName}>
      <MatchTabNavList showStandingsTab={showStandingsTab} />
    </TabsList>
  );
}

export function MatchDetailsTabs({
  fixtureId,
  homeTeam,
  awayTeam,
  showStandingsTab = true,
  overview,
  lineups,
  statistics,
  standings,
  matches,
}: MatchDetailsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = parseMatchTab(searchParams.get("tab") ?? undefined);
  const activeTab =
    !showStandingsTab && requestedTab === "standings"
      ? "overview"
      : requestedTab;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [isNavPinned, setIsNavPinned] = useState(false);
  const [navHeight, setNavHeight] = useState(0);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) {
      return;
    }

    const syncHeight = () => {
      setNavHeight(nav.getBoundingClientRect().height);
    };

    syncHeight();
    const resizeObserver = new ResizeObserver(syncHeight);
    resizeObserver.observe(nav);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isNavPinned]);

  useEffect(() => {
    if (!showStandingsTab && requestedTab === "standings") {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("tab");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  }, [showStandingsTab, requestedTab, pathname, router, searchParams]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }

        setIsNavPinned(
          !entry.isIntersecting &&
            entry.boundingClientRect.top < MATCH_TAB_NAV_TOP_PX
        );
      },
      {
        root: null,
        rootMargin: `-${MATCH_TAB_NAV_TOP_PX}px 0px 0px 0px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, []);

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
      <div ref={sentinelRef} aria-hidden className="h-px w-full shrink-0" />

      <div
        ref={navRef}
        className={cn(
          "border-border/70 bg-background z-30 w-full border-b",
          isNavPinned
            ? "supports-[backdrop-filter]:bg-background/95 fixed right-0 left-0 border-b backdrop-blur-sm"
            : "bg-background/95 supports-[backdrop-filter]:bg-background/80 relative backdrop-blur-sm"
        )}
        style={isNavPinned ? { top: MATCH_TAB_NAV_TOP_PX } : undefined}
      >
        {isNavPinned ? (
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="mx-auto w-full max-w-3xl">
              <MatchTabNavListBar showStandingsTab={showStandingsTab} />
            </div>
          </div>
        ) : (
          <MatchTabNavListBar showStandingsTab={showStandingsTab} />
        )}
      </div>

      {isNavPinned ? (
        <div
          aria-hidden
          className="w-full shrink-0"
          style={{ height: navHeight }}
        />
      ) : null}

      <TabsContent value="overview" className="space-y-4">
        {overview}
      </TabsContent>

      <TabsContent value="ai">
        <AIHeroDetailedPanel homeTeam={homeTeam} awayTeam={awayTeam} />
      </TabsContent>

      <TabsContent value="lineups">{lineups}</TabsContent>

      <TabsContent value="statistics" className="space-y-4">
        {statistics}
      </TabsContent>

      {showStandingsTab ? (
        <TabsContent value="standings" className="space-y-4">
          {standings}
        </TabsContent>
      ) : null}

      <TabsContent value="matches" className="space-y-4">
        {matches}
      </TabsContent>
    </Tabs>
  );
}
