// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  cleanup();
});

import { MatchMetaBar } from "@/components/match/MatchMetaBar";

describe("MatchMetaBar", () => {
  it("renders league link and trailing slot", () => {
    render(
      <MatchMetaBar
        leagueExternalId={39}
        leagueName="Premier League"
        trailing={<span data-testid="trailing">Live</span>}
      />
    );

    expect(screen.getByRole("link", { name: /Premier League/i })).toBeTruthy();
    expect(screen.getByTestId("trailing")).toBeTruthy();
  });
});
