// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { OverviewTabContent } from "@/components/match/OverviewTabContent";

import {
  emptyForm,
  emptyPlayersToWatch,
  makeGoalEvent,
  makeMatchTestFixture,
  makeTeamStats,
} from "@/components/match/match-test-fixtures";

import { computeMatchMomentum } from "@/lib/momentum/computeMatchMomentum";
import { summarizeH2HMeetings } from "@/lib/analytics/compute-h2h";

vi.mock("@/components/match/overview-chart-cards", () => ({
  MatchMomentumCardLazy: () => (
    <div data-testid="card-momentum">Match momentum</div>
  ),
}));

vi.mock("@/components/match/OverviewAiEngineCard", () => ({
  OverviewAiEngineCard: () => <div data-testid="card-ai-engine">AI engine</div>,
}));

vi.mock("@/components/match/FormPreviewCard", () => ({
  FormPreviewCard: () => (
    <div data-testid="card-form-preview">Recent form preview</div>
  ),
}));

vi.mock("@/components/match/H2HCompactCard", () => ({
  H2HCompactCard: () => <div data-testid="card-h2h-compact">H2H compact</div>,
}));

vi.mock("@/components/match/MatchStandingsSnippetCard", () => ({
  MatchStandingsSnippetCard: () => (
    <div data-testid="card-standings-snippet">Standings snippet</div>
  ),
}));

vi.mock("@/components/match/MatchDetailsMetadataCard", () => ({
  MatchDetailsMetadataCard: () => (
    <div data-testid="card-match-details">Match details</div>
  ),
}));

vi.mock("@/components/match/PlayerOfTheMatchCard", () => ({
  PlayerOfTheMatchCard: () => (
    <div data-testid="card-potm">Player of the match</div>
  ),
}));

vi.mock("@/components/match/PlayersToWatchCard", () => ({
  PlayersToWatchCard: () => (
    <div data-testid="card-players">Players to watch</div>
  ),
}));

vi.mock("@/components/match/TimelineCard", () => ({
  TimelineCard: () => <div data-testid="card-timeline">Timeline</div>,
}));

vi.mock("@/components/match/LineupTeaserCard", () => ({
  LineupTeaserCard: () => (
    <div data-testid="card-lineup-teaser">Lineup teaser</div>
  ),
}));

function cardOrder(container: HTMLElement): string[] {
  const wrapper = container.firstElementChild;

  if (!wrapper) {
    return [];
  }

  return Array.from(wrapper.children).map(
    (el) => el.getAttribute("data-testid") ?? el.textContent ?? ""
  );
}

afterEach(() => {
  cleanup();
});

describe("OverviewTabContent", () => {
  it("orders finished overview per redesign", () => {
    const fixture = makeMatchTestFixture("FT");

    const stats = [makeTeamStats(10), makeTeamStats(20)];

    const events = [makeGoalEvent(10)];

    const momentumBuckets = computeMatchMomentum(events, stats, 90);

    const { container } = render(
      <OverviewTabContent
        fixture={fixture}
        renderMode="finished"
        returnTo="/matches/1001"
        events={events}
        momentumBuckets={momentumBuckets}
        homeForm3={emptyForm}
        awayForm3={emptyForm}
        playersToWatch={emptyPlayersToWatch}
        lineups={[]}
        playerOfTheMatch={null}
      />
    );

    expect(cardOrder(container)).toEqual([
      "card-ai-engine",
      "card-timeline",
      "card-momentum",
      "card-potm",
      "card-match-details",
      "card-form-preview",
      "card-lineup-teaser",
    ]);
  });

  it("orders pre-match overview per redesign", () => {
    const fixture = makeMatchTestFixture("NS");
    const h2h = summarizeH2HMeetings(
      [],
      fixture.homeTeam.externalId,
      fixture.awayTeam.externalId,
      10,
      "ALL"
    );

    const { container } = render(
      <OverviewTabContent
        fixture={fixture}
        renderMode="pre"
        returnTo="/matches/1001"
        events={[]}
        momentumBuckets={[]}
        homeForm3={emptyForm}
        awayForm3={emptyForm}
        h2h={h2h}
        standings={[]}
        playersToWatch={emptyPlayersToWatch}
        lineups={[]}
      />
    );

    expect(cardOrder(container)).toEqual([
      "card-ai-engine",
      "card-standings-snippet",
      "card-h2h-compact",
      "card-form-preview",
      "card-match-details",
      "card-players",
      "card-lineup-teaser",
    ]);

    expect(screen.queryByTestId("card-timeline")).not.toBeInTheDocument();
  });

  it("swaps an empty block for an unavailable notice when its provider call failed", () => {
    const fixture = makeMatchTestFixture("FT");

    render(
      <OverviewTabContent
        fixture={fixture}
        renderMode="finished"
        returnTo="/matches/1001"
        events={[]}
        momentumBuckets={[]}
        homeForm3={emptyForm}
        awayForm3={emptyForm}
        playersToWatch={emptyPlayersToWatch}
        lineups={[]}
        playerOfTheMatch={null}
        unavailableCards={new Set(["timeline"])}
      />
    );

    expect(screen.queryByTestId("card-timeline")).not.toBeInTheDocument();
    expect(screen.getByText("Temporarily unavailable")).toBeInTheDocument();
  });

  it("keeps the genuine empty state when the provider call succeeded", () => {
    const fixture = makeMatchTestFixture("FT");

    render(
      <OverviewTabContent
        fixture={fixture}
        renderMode="finished"
        returnTo="/matches/1001"
        events={[]}
        momentumBuckets={[]}
        homeForm3={emptyForm}
        awayForm3={emptyForm}
        playersToWatch={emptyPlayersToWatch}
        lineups={[]}
        playerOfTheMatch={null}
      />
    );

    expect(screen.getByTestId("card-timeline")).toBeInTheDocument();
    expect(
      screen.queryByText("Temporarily unavailable")
    ).not.toBeInTheDocument();
  });

  it("leaves a block with data alone even when its group failed", () => {
    const fixture = makeMatchTestFixture("FT");

    render(
      <OverviewTabContent
        fixture={fixture}
        renderMode="finished"
        returnTo="/matches/1001"
        events={[makeGoalEvent(10)]}
        momentumBuckets={[]}
        homeForm3={emptyForm}
        awayForm3={emptyForm}
        playersToWatch={emptyPlayersToWatch}
        lineups={[]}
        playerOfTheMatch={null}
        unavailableCards={new Set(["timeline"])}
      />
    );

    expect(screen.getByTestId("card-timeline")).toBeInTheDocument();
  });
});
