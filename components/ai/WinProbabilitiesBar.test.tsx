// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WinProbabilitiesBar } from "@/components/ai/WinProbabilitiesBar";

vi.mock("motion/react", async () => {
  const actual =
    await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

const homeTeam = { name: "Arsenal", code: "ARS" };
const awayTeam = { name: "Chelsea", code: "CHE" };

describe("WinProbabilitiesBar", () => {
  it("renders three probability segments", () => {
    render(
      <WinProbabilitiesBar
        probabilities={{ home: 0.52, draw: 0.24, away: 0.24 }}
        winOutcome="1"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    );

    expect(screen.getByText("ARS")).toBeInTheDocument();
    expect(screen.getByText("Draw")).toBeInTheDocument();
    expect(screen.getByText("CHE")).toBeInTheDocument();
    expect(screen.getByText("52%")).toBeInTheDocument();
  });

  it("updates displayed values when probabilities change", () => {
    const { rerender } = render(
      <WinProbabilitiesBar
        probabilities={{ home: 0.52, draw: 0.24, away: 0.24 }}
        winOutcome="1"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    );

    rerender(
      <WinProbabilitiesBar
        probabilities={{ home: 0.61, draw: 0.2, away: 0.19 }}
        winOutcome="1"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    );

    expect(screen.getByText("61%")).toBeInTheDocument();
  });
});
