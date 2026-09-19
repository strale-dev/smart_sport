// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MatchStatisticsCard } from "@/components/match/MatchStatisticsCard";
import {
  makeMatchTestFixture,
  makeTeamStats,
} from "@/components/match/match-test-fixtures";

describe("MatchStatisticsCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows pre-match empty state", () => {
    const fixture = makeMatchTestFixture("NS");
    render(<MatchStatisticsCard fixture={fixture} renderMode="pre" />);

    expect(screen.getByText("Stats after kickoff")).toBeInTheDocument();
  });

  it("renders populated statistics with home and away values", () => {
    const fixture = makeMatchTestFixture("FT");
    const homeStats = {
      ...makeTeamStats(10),
      shotsTotal: 12,
      fouls: 8,
      expectedGoals: 1.42,
    };
    const awayStats = {
      ...makeTeamStats(20),
      shotsTotal: 7,
      fouls: 11,
      ballPossession: 48,
    };
    homeStats.ballPossession = 52;

    render(
      <MatchStatisticsCard
        fixture={fixture}
        stats={[homeStats, awayStats]}
        playerDerived={{
          home: { tacklesTotal: 15, duelsTotal: 40, averageRating: 7.1 },
          away: { tacklesTotal: 12, duelsTotal: 35, averageRating: 6.9 },
        }}
        renderMode="finished"
      />
    );

    expect(screen.getByText("Statistics")).toBeInTheDocument();
    expect(screen.getByText("Home FC")).toBeInTheDocument();
    expect(screen.getByText("Away FC")).toBeInTheDocument();
    expect(screen.getByText("Total shots")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Total shots: Home FC 12, Away FC 7")
    ).toBeInTheDocument();
    expect(screen.queryByText("Distance covered")).not.toBeInTheDocument();
  });

  it("shows empty state when no stat rows are available", () => {
    const fixture = makeMatchTestFixture("FT");

    render(
      <MatchStatisticsCard fixture={fixture} stats={[]} renderMode="finished" />
    );

    expect(screen.getByText("Full-time stats unavailable")).toBeInTheDocument();
  });
});
