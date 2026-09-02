import Link from "next/link";
import { ChevronDownIcon, GlobeIcon } from "lucide-react";

import { LeagueFilterLogo } from "@/components/live/LeagueFilterLogo";
import { LiveDot } from "@/components/common/LiveDot";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildFixturesHref } from "@/lib/fixtures/url";
import {
  LIVE_LEAGUE_MORE,
  LIVE_LEAGUE_TABS,
  type LiveLeagueTab,
} from "@/lib/live/constants";
import { cn } from "@/lib/utils";

type FixturesLeagueTabsProps = {
  league?: number;
  liveLeagueIds: number[];
  activeLeagueIds: number[];
};

function FilterTab({
  href,
  active,
  label,
  children,
  className,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 shrink-0 snap-start items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 text-sm font-medium whitespace-nowrap transition-colors sm:h-8",
        active
          ? "bg-background text-foreground dark:bg-input/30 shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        className
      )}
    >
      {children}
    </Link>
  );
}

function LeagueTabLabel({
  tab,
  showLive,
}: {
  tab: LiveLeagueTab;
  showLive: boolean;
}) {
  return (
    <>
      <LeagueFilterLogo providerId={tab.providerId} label={tab.label} />
      <span className="hidden sm:inline">{tab.shortLabel ?? tab.label}</span>
      {showLive ? <LiveDot className="shrink-0" /> : null}
    </>
  );
}

export function FixturesLeagueTabs({
  league,
  liveLeagueIds,
  activeLeagueIds,
}: FixturesLeagueTabsProps) {
  const currentParams = { league };
  const liveSet = new Set(liveLeagueIds);
  const activeSet = new Set(activeLeagueIds);
  const anyLive = liveLeagueIds.length > 0;

  const visiblePrimaryTabs = LIVE_LEAGUE_TABS.filter((tab) =>
    activeSet.has(tab.providerId)
  );
  const visibleMoreTabs = LIVE_LEAGUE_MORE.filter((tab) =>
    activeSet.has(tab.providerId)
  );

  const activeMoreLeague = LIVE_LEAGUE_MORE.find(
    (item) => item.providerId === league
  );
  const isMoreLeagueActive = activeMoreLeague != null;
  const moreLeagueLabel = activeMoreLeague?.label ?? "More";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        League
      </p>
      <div className="-mx-1 flex w-[calc(100%+0.5rem)] items-center sm:mx-0 sm:w-full">
        <div className="bg-muted/60 flex w-full snap-x snap-mandatory [scrollbar-width:none] items-center gap-1 overflow-x-auto rounded-lg p-1 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          <FilterTab
            href={buildFixturesHref(currentParams, { league: undefined })}
            active={league == null}
            label="All leagues"
          >
            <GlobeIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">All</span>
            {anyLive ? <LiveDot className="shrink-0" /> : null}
          </FilterTab>

          {visiblePrimaryTabs.map((tab) => (
            <FilterTab
              key={tab.providerId}
              href={buildFixturesHref(currentParams, {
                league: tab.providerId,
              })}
              active={league === tab.providerId}
              label={tab.label}
            >
              <LeagueTabLabel
                tab={tab}
                showLive={liveSet.has(tab.providerId)}
              />
            </FilterTab>
          ))}

          {visibleMoreTabs.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant={isMoreLeagueActive ? "secondary" : "ghost"}
                    size="sm"
                    className="h-9 shrink-0 snap-start gap-1.5 px-2.5 sm:h-8"
                    aria-label={
                      isMoreLeagueActive
                        ? `More leagues: ${moreLeagueLabel}`
                        : "More leagues"
                    }
                  />
                }
              >
                {activeMoreLeague ? (
                  <LeagueFilterLogo
                    providerId={activeMoreLeague.providerId}
                    label={activeMoreLeague.label}
                  />
                ) : null}
                <span className="hidden sm:inline">{moreLeagueLabel}</span>
                <span className="sm:hidden">
                  {isMoreLeagueActive ? moreLeagueLabel : "More"}
                </span>
                {visibleMoreTabs.some((tab) => liveSet.has(tab.providerId)) ? (
                  <LiveDot className="shrink-0" />
                ) : null}
                <ChevronDownIcon className="size-4 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                {visibleMoreTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.providerId}
                    render={
                      <Link
                        href={buildFixturesHref(currentParams, {
                          league: tab.providerId,
                        })}
                      />
                    }
                  >
                    <LeagueFilterLogo
                      providerId={tab.providerId}
                      label={tab.label}
                      size="md"
                    />
                    {tab.label}
                    {liveSet.has(tab.providerId) ? (
                      <LiveDot className="ml-auto shrink-0" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  );
}
