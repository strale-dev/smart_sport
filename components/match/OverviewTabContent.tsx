import { Fragment, type ReactNode } from "react";

import { MatchBlockUnavailableCard } from "@/components/match/MatchBlockUnavailableCard";
import { FormPreviewCard } from "@/components/match/FormPreviewCard";
import { LineupTeaserCard } from "@/components/match/LineupTeaserCard";
import { H2HCompactCard } from "@/components/match/H2HCompactCard";
import { MatchDetailsMetadataCard } from "@/components/match/MatchDetailsMetadataCard";
import { MatchStandingsSnippetCard } from "@/components/match/MatchStandingsSnippetCard";
import { MatchMomentumCardLazy } from "@/components/match/overview-chart-cards";
import { OverviewAiEngineCard } from "@/components/match/OverviewAiEngineCard";
import { PlayerOfTheMatchCard } from "@/components/match/PlayerOfTheMatchCard";
import { PlayersToWatchCard } from "@/components/match/PlayersToWatchCard";
import { TimelineCard } from "@/components/match/TimelineCard";
import { aggregateForm } from "@/lib/analytics/compute-form";
import {
  getMatchOverviewRenderMode,
  getOverviewCardOrder,
  isOverviewCardVisible,
  type MatchOverviewRenderMode,
  type OverviewCardId,
} from "@/lib/fixtures/overview-layout";
import { buildMatchHref } from "@/lib/fixtures/match-url";
import {
  hasFormPreviewContent,
  hasH2HContent,
  hasLineupTeaserContent,
  hasMomentumContent,
  hasPlayerOfTheMatchContent,
  hasPlayersToWatchContent,
  hasStandingsSnippetContent,
  hasTimelineContent,
} from "@/lib/match/overview-card-gates";
import type { UnavailableOverviewCards } from "@/lib/match/overview-block-status";
import type { MomentumBucket } from "@/lib/momentum/computeMatchMomentum";
import type { PlayersToWatchResult } from "@/lib/services/playersToWatchService";
import type {
  Fixture,
  FixtureEvent,
  FixturePlayerPerformance,
  FixtureSidelinedPlayer,
  FormSnapshot,
  H2HSummary,
  Lineup,
  StandingsGroup,
} from "@/types/domain";

const EMPTY_FORM_3: FormSnapshot = aggregateForm([], "ALL", 3);

type OverviewTabContentProps = {
  fixture: Fixture;
  renderMode: MatchOverviewRenderMode;
  returnTo: string;
  premiumAnalytics?: boolean;
  events: FixtureEvent[];
  momentumBuckets: MomentumBucket[];
  homeForm3?: FormSnapshot;
  awayForm3?: FormSnapshot;
  h2h?: H2HSummary;
  standings?: StandingsGroup[];
  playersToWatch: PlayersToWatchResult;
  lineups: Lineup[];
  lineupPerformances?: FixturePlayerPerformance[];
  lineupSidelined?: FixtureSidelinedPlayer[];
  playerOfTheMatch?: FixturePlayerPerformance | null;
  /** Cards whose provider call errored — they show "unavailable", not "empty". */
  unavailableCards?: UnavailableOverviewCards;
};

const UNAVAILABLE_CARD_TITLES: Partial<Record<OverviewCardId, string>> = {
  timeline: "Timeline",
  momentum: "Match momentum",
  standingsSnippet: "Standings",
  h2hCompact: "Head to head",
  formPreview: "Recent form",
  playersToWatch: "Players to Watch",
  lineupTeaser: "Lineups",
  playerOfMatch: "Player of the match",
};

export function OverviewTabContent({
  fixture,
  renderMode,
  returnTo,
  premiumAnalytics = true,
  events,
  momentumBuckets,
  homeForm3 = EMPTY_FORM_3,
  awayForm3 = EMPTY_FORM_3,
  h2h,
  standings = [],
  playersToWatch,
  lineups,
  lineupPerformances = [],
  lineupSidelined = [],
  playerOfTheMatch = null,
  unavailableCards,
}: OverviewTabContentProps) {
  const resolvedMode = renderMode ?? getMatchOverviewRenderMode(fixture.status);
  const order = getOverviewCardOrder(resolvedMode);

  const hasContent: Partial<Record<OverviewCardId, boolean>> = {
    timeline: hasTimelineContent(events),
    momentum: hasMomentumContent(momentumBuckets),
    standingsSnippet: hasStandingsSnippetContent(fixture, standings),
    h2hCompact: hasH2HContent(h2h),
    formPreview: hasFormPreviewContent(homeForm3, awayForm3),
    playersToWatch: hasPlayersToWatchContent(playersToWatch),
    lineupTeaser: hasLineupTeaserContent(lineups),
    playerOfMatch: hasPlayerOfTheMatchContent(playerOfTheMatch),
  };

  /**
   * A failed provider call leaves the same empty array a genuinely empty match
   * does, so without this the two are indistinguishable in the UI.
   */
  function withBlockStatus(cardId: OverviewCardId, card: ReactNode): ReactNode {
    if (card == null) {
      return null;
    }

    const title = UNAVAILABLE_CARD_TITLES[cardId];
    if (
      !title ||
      !unavailableCards?.has(cardId) ||
      hasContent[cardId] !== false
    ) {
      return card;
    }

    return (
      <MatchBlockUnavailableCard
        key={cardId}
        title={title}
        retryHref={buildMatchHref(fixture.externalId, "overview")}
      />
    );
  }

  const cards = {
    aiEngine: isOverviewCardVisible("aiEngine", resolvedMode) ? (
      <OverviewAiEngineCard
        key="aiEngine"
        fixture={fixture}
        renderMode={resolvedMode}
        returnTo={returnTo}
      />
    ) : null,
    standingsSnippet: isOverviewCardVisible(
      "standingsSnippet",
      resolvedMode
    ) ? (
      <MatchStandingsSnippetCard
        key="standingsSnippet"
        fixture={fixture}
        standings={standings}
      />
    ) : null,
    h2hCompact:
      isOverviewCardVisible("h2hCompact", resolvedMode) && h2h ? (
        <H2HCompactCard key="h2hCompact" fixture={fixture} h2h={h2h} />
      ) : null,
    timeline: isOverviewCardVisible("timeline", resolvedMode) ? (
      <TimelineCard
        key="timeline"
        fixture={fixture}
        events={events}
        lineups={lineups}
      />
    ) : null,
    momentum: isOverviewCardVisible("momentum", resolvedMode) ? (
      <MatchMomentumCardLazy
        key="momentum"
        fixture={fixture}
        buckets={momentumBuckets}
        premiumAnalytics={premiumAnalytics}
      />
    ) : null,
    playerOfMatch: isOverviewCardVisible("playerOfMatch", resolvedMode) ? (
      <PlayerOfTheMatchCard
        key="playerOfMatch"
        fixture={fixture}
        player={playerOfTheMatch}
      />
    ) : null,
    matchDetails: isOverviewCardVisible("matchDetails", resolvedMode) ? (
      <MatchDetailsMetadataCard key="matchDetails" fixture={fixture} />
    ) : null,
    formPreview: isOverviewCardVisible("formPreview", resolvedMode) ? (
      <FormPreviewCard
        key="formPreview"
        fixture={fixture}
        homeForm5={homeForm3}
        awayForm5={awayForm3}
        windowSize={3}
      />
    ) : null,
    playersToWatch: isOverviewCardVisible("playersToWatch", resolvedMode) ? (
      <PlayersToWatchCard
        key="playersToWatch"
        fixture={fixture}
        data={playersToWatch}
      />
    ) : null,
    lineupTeaser: isOverviewCardVisible("lineupTeaser", resolvedMode) ? (
      <LineupTeaserCard
        key="lineupTeaser"
        fixture={fixture}
        lineups={lineups}
        performances={lineupPerformances}
        events={events}
        sidelined={lineupSidelined}
      />
    ) : null,
  };

  return (
    <div className="space-y-3">
      {order.map((cardId) => (
        <Fragment key={cardId}>
          {withBlockStatus(cardId, cards[cardId])}
        </Fragment>
      ))}
    </div>
  );
}
