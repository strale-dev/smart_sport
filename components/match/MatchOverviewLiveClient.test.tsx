// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

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

vi.mock("@/components/match/LiveProbabilityDeltaClient", () => ({
  LiveProbabilityDeltaClient: () => null,
}));

vi.mock("@/components/match/overview-chart-cards", () => ({
  MatchMomentumCardLazy: () => null,
  TeamComparisonCardLazy: () => null,
}));

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe("MatchOverviewLiveClient", () => {
  it("uses SSR initial stats when live context is missing (B2 regression)", () => {
    const fixture = makeMatchTestFixture("1H");
    const stats = [makeTeamStats(10), makeTeamStats(20)];
    const events = [makeGoalEvent(10)];

    renderWithQuery(
      <MatchOverviewLiveClient
        fixture={fixture}
        initialEvents={events}
        initialStatistics={stats}
        homeForm={emptyForm}
        awayForm={emptyForm}
        playersToWatch={emptyPlayersToWatch}
        lineups={[]}
      />
    );

    expect(screen.getByText("Live stats")).toBeInTheDocument();
    expect(
      screen.queryByText("Stats not available yet")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No events yet")).not.toBeInTheDocument();
  });
});
