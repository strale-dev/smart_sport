// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AIInsightProvider } from "@/components/ai/AIInsightProvider";
import { MatchOverviewLiveClient } from "@/components/match/MatchOverviewLiveClient";
import {
  emptyForm,
  emptyPlayersToWatch,
  makeGoalEvent,
  makeMatchTestFixture,
  makeTeamStats,
} from "@/components/match/match-test-fixtures";

vi.mock("@/components/match/MatchLiveSession", () => ({
  useMatchLiveContext: () => null,
}));

vi.mock("@/components/match/overview-chart-cards", () => ({
  MatchMomentumCardLazy: () => (
    <div data-testid="card-momentum">Match momentum</div>
  ),
}));

vi.mock("@/components/match/MatchDetailsMetadataCard", () => ({
  MatchDetailsMetadataCard: () => (
    <div data-testid="card-match-details">Match details</div>
  ),
}));

vi.mock("@/components/match/OverviewAiEngineCard", () => ({
  OverviewAiEngineCard: () => <div data-testid="card-ai-engine">AI engine</div>,
}));

vi.mock("@/components/match/TimelineCard", () => ({
  TimelineCard: () => <div data-testid="card-timeline">Timeline</div>,
}));

vi.mock("@/lib/live/live-probability-delta", () => ({
  fetchLiveProbabilityDelta: vi.fn().mockResolvedValue({
    prematch: { home: 0.5, draw: 0.25, away: 0.25 },
    live: { home: 0.55, draw: 0.2, away: 0.25 },
    liveMinute: 55,
    prematchPrediction: null,
  }),
}));

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const fixture = makeMatchTestFixture("1H");
  return render(
    <QueryClientProvider client={client}>
      <AIInsightProvider
        fixtureId={fixture.externalId}
        fixtureStatus={fixture.status}
        kickoffAt={fixture.kickoffAt}
        isGuest
      >
        {ui}
      </AIInsightProvider>
    </QueryClientProvider>
  );
}

describe("MatchOverviewLiveClient", () => {
  it("uses SSR initial events when live context is missing (B2 regression)", () => {
    const fixture = makeMatchTestFixture("1H");
    const stats = [makeTeamStats(10), makeTeamStats(20)];
    const events = [makeGoalEvent(10)];

    renderWithProviders(
      <MatchOverviewLiveClient
        fixture={fixture}
        returnTo="/matches/1001"
        premiumAnalytics
        initialEvents={events}
        initialStatistics={stats}
        homeForm3={emptyForm}
        awayForm3={emptyForm}
        playersToWatch={emptyPlayersToWatch}
        lineups={[]}
        lineupPerformances={[]}
        lineupSidelined={[]}
      />
    );

    expect(screen.getByText("AI engine")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.queryByText("Live stats")).not.toBeInTheDocument();
  });
});
