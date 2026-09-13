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

vi.mock("@/components/match/overview-chart-cards", () => ({
  MatchMomentumCardLazy: () => (
    <div data-testid="card-momentum">Match momentum</div>
  ),

  TeamComparisonCardLazy: () => (
    <div data-testid="card-comparison">Team comparison</div>
  ),
}));

vi.mock("@/components/match/FormPreviewCard", () => ({
  FormPreviewCard: () => (
    <div data-testid="card-form-preview">Recent form preview</div>
  ),
}));

vi.mock("@/components/match/H2HPreviewCard", () => ({
  H2HPreviewCard: () => (
    <div data-testid="card-h2h-preview">Head to head preview</div>
  ),
}));

vi.mock("@/components/match/LineupTeaserCard", () => ({
  LineupTeaserCard: () => (
    <div data-testid="card-lineup-teaser">Lineup teaser</div>
  ),
}));

vi.mock("@/components/match/PlayersToWatchCard", () => ({
  PlayersToWatchCard: () => (
    <div data-testid="card-players">Players to watch</div>
  ),
}));

vi.mock("@/components/match/LiveStatsCard", () => ({
  LiveStatsCard: () => <div data-testid="card-live-stats">Live stats</div>,
}));

vi.mock("@/components/match/TimelineCard", () => ({
  TimelineCard: () => <div data-testid="card-timeline">Timeline</div>,
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
  it("orders live/FT cards stats before momentum, timeline after comparison", () => {
    const fixture = makeMatchTestFixture("FT");

    const stats = [makeTeamStats(10), makeTeamStats(20)];

    const events = [makeGoalEvent(10)];

    const momentumBuckets = computeMatchMomentum(events, stats, 90);

    const { container } = render(
      <OverviewTabContent
        fixture={fixture}

        stats={stats}

        events={events}

        momentumBuckets={momentumBuckets}

        homeForm={emptyForm}

        awayForm={emptyForm}

        playersToWatch={emptyPlayersToWatch}

        lineups={[]}
      />
    );

    expect(cardOrder(container)).toEqual([
      "card-live-stats",

      "card-momentum",

      "card-comparison",

      "card-timeline",

      "card-players",

      "card-lineup-teaser",
    ]);
  });

  it("orders pre-match comparison before form and H2H previews", () => {
    const fixture = makeMatchTestFixture("NS");

    const { container } = render(
      <OverviewTabContent
        fixture={fixture}

        stats={[]}

        events={[]}

        momentumBuckets={[]}

        homeForm={emptyForm}

        awayForm={emptyForm}

        playersToWatch={emptyPlayersToWatch}

        lineups={[]}
      />
    );

    expect(cardOrder(container)).toEqual([
      "card-comparison",

      "card-form-preview",

      "card-h2h-preview",

      "card-players",

      "card-lineup-teaser",
    ]);

    expect(screen.queryByTestId("card-timeline")).not.toBeInTheDocument();
  });
});
