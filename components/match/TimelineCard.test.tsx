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
    render(
      <TimelineCard
        fixture={fixture}
        events={[
          {
            ...makeGoalEvent(10, 10),
            playerName: "Alex Striker",
            assistPlayerName: "Sam Playmaker",
          },
        ]}
      />
    );

    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("Alex Striker")).toBeInTheDocument();
    expect(screen.getByText(/Assist: Sam Playmaker/)).toBeInTheDocument();
  });

  it("shows newest event first", () => {
    const fixture = makeMatchTestFixture("2H");
    render(
      <TimelineCard
        fixture={fixture}
        events={[
          { ...makeGoalEvent(10, 10), playerName: "First" },
          { ...makeGoalEvent(10, 80), playerName: "Latest" },
        ]}
      />
    );

    const names = screen.getAllByText(/First|Latest/);
    expect(names[0]?.textContent).toBe("Latest");
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
