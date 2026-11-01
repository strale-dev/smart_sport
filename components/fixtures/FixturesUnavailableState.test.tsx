// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/match/MatchRow", () => ({
  MatchRow: ({ fixture }: { fixture: { externalId: number } }) => (
    <div data-testid={`match-row-${fixture.externalId}`} />
  ),
}));

vi.mock("@/components/fixtures/FixturesNowAnchor", () => ({
  FixturesNowAnchor: () => null,
}));

import { FixturesList } from "@/components/fixtures/FixturesList";
import { FixturesUnavailableState } from "@/components/fixtures/FixturesUnavailableState";
import { mapFixture } from "@/lib/api-football/adapter";
import type { RawApiFootballFixture } from "@/lib/api-football/types";
import type { FixturesData } from "@/lib/services/fixturesService";
import { loadApiFootballFixture } from "@/tests/helpers/load-api-football-fixture";

const sampleFixture = mapFixture(
  loadApiFootballFixture<RawApiFootballFixture[]>("fixture-by-id.json")
    .response[0]!
);

const UNAVAILABLE_TEST_ID = "fixtures-unavailable-state";

function baseFixturesData(overrides: Partial<FixturesData> = {}): FixturesData {
  return {
    upcomingDayGroups: [],
    pastDayGroups: [],
    dayGroups: [],
    liveLeagueIds: [],
    activeLeagueIds: [],
    nowAnchorFixtureId: null,
    todayDateKey: "2026-08-30",
    filters: {},
    isEmpty: true,
    meta: { cached: false, stale: false },
    providerSyncedAt: null,
    providerSyncSource: null,
    freshnessStale: false,
    providerUnavailable: true,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("FixturesUnavailableState", () => {
  it("exposes status semantics for tests and shows Serbian copy", () => {
    render(<FixturesUnavailableState />);

    const root = screen.getByTestId(UNAVAILABLE_TEST_ID);
    expect(root).toHaveAttribute("role", "status");
    expect(
      screen.getByText("Podaci o mečevima trenutno nisu dostupni")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Pokušajte ponovo za nekoliko minuta/i)
    ).toBeInTheDocument();
  });
});

describe("FixturesList unavailable vs empty", () => {
  it("shows unavailable state when isEmpty and providerUnavailable", () => {
    render(
      <FixturesList
        data={baseFixturesData({
          isEmpty: true,
          providerUnavailable: true,
        })}
      />
    );

    expect(screen.getByTestId(UNAVAILABLE_TEST_ID)).toBeInTheDocument();
    expect(
      screen.queryByText("No fixtures in this window")
    ).not.toBeInTheDocument();
  });

  it("shows the regular empty state when isEmpty without providerUnavailable", () => {
    render(
      <FixturesList
        data={baseFixturesData({
          isEmpty: true,
          providerUnavailable: false,
        })}
      />
    );

    expect(screen.queryByTestId(UNAVAILABLE_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByText("No fixtures in this window")).toBeInTheDocument();
  });

  it("renders the fixture list when not empty even if providerUnavailable", () => {
    render(
      <FixturesList
        data={baseFixturesData({
          isEmpty: false,
          providerUnavailable: true,
          upcomingDayGroups: [
            {
              dateKey: "2026-08-30",
              label: "Today",
              fixtures: [sampleFixture],
            },
          ],
          dayGroups: [
            {
              dateKey: "2026-08-30",
              label: "Today",
              fixtures: [sampleFixture],
            },
          ],
        })}
      />
    );

    expect(screen.queryByTestId(UNAVAILABLE_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });
});
