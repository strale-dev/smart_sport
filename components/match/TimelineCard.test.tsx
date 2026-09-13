// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimelineCard } from "@/components/match/TimelineCard";
import {
  makeGoalEvent,
  makeMatchTestFixture,
} from "@/components/match/match-test-fixtures";

describe("TimelineCard", () => {
  it("renders events when present (B1 regression)", () => {
    const fixture = makeMatchTestFixture("2H");
    render(<TimelineCard fixture={fixture} events={[makeGoalEvent(10)]} />);

    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.queryByText("No events yet")).not.toBeInTheDocument();
  });

  it("shows live empty state when no events", () => {
    const fixture = makeMatchTestFixture("2H");
    render(<TimelineCard fixture={fixture} events={[]} />);
    expect(screen.getByText("No events yet")).toBeInTheDocument();
  });

  it("shows pre-match empty copy when fixture has not started", () => {
    const fixture = makeMatchTestFixture("NS");
    render(<TimelineCard fixture={fixture} events={[]} />);
    expect(screen.getByText("Kickoff has not started")).toBeInTheDocument();
  });
});
