// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LiveStatsCard } from "@/components/match/LiveStatsCard";
import {
  makeMatchTestFixture,
  makeTeamStats,
} from "@/components/match/match-test-fixtures";

describe("LiveStatsCard", () => {
  it("shows stats rows when team statistics exist (B1 regression)", () => {
    const fixture = makeMatchTestFixture("FT");
    render(
      <LiveStatsCard
        fixture={fixture}
        stats={[makeTeamStats(10), makeTeamStats(20)]}
      />
    );

    expect(screen.getByText("Live stats")).toBeInTheDocument();
    expect(
      screen.queryByText("Stats not available yet")
    ).not.toBeInTheDocument();
  });

  it("shows empty state when no team stats", () => {
    const fixture = makeMatchTestFixture("1H");
    render(<LiveStatsCard fixture={fixture} stats={[]} />);

    expect(screen.getByText("Stats not in yet")).toBeInTheDocument();
  });
});
