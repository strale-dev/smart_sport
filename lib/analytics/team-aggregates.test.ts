import { describe, expect, it } from "vitest";

import {
  aggregateForm,
  collectFormResults,
} from "@/lib/analytics/compute-form";

describe("team aggregates helpers", () => {
  it("aggregates last 20 from fixture rows", () => {
    const rows = Array.from({ length: 25 }).map((_, index) => ({
      provider_id: index + 1,
      kickoff_at: new Date(Date.UTC(2024, 0, index + 1)).toISOString(),
      score_home: 2,
      score_away: 1,
      home_team: { provider_id: 42, name: "Arsenal" },
      away_team: { provider_id: 100 + index, name: `Opp ${index}` },
      league: { provider_id: 39, name: "Premier League" },
    }));

    const results = collectFormResults(rows, 42, 20);
    const snapshot = aggregateForm(results, "ALL", 20);

    expect(snapshot.results).toHaveLength(20);
    expect(snapshot.wins).toBe(20);
    expect(snapshot.ppg).toBe(3);
  });
});
