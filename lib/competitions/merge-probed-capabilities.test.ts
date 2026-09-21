import { describe, expect, it } from "vitest";

import {
  applyProbeResultToCapabilities,
  mergeProbedCapabilitiesIntoRegistry,
  type CompetitionCapabilitiesProbeFile,
} from "@/lib/competitions/merge-probed-capabilities";
import type {
  CompetitionCapabilities,
  CompetitionRegistryFile,
} from "@/lib/competitions/types";

const BASE: CompetitionCapabilities = {
  fixtures: true,
  standings: true,
  lineups: true,
  fixtureStatistics: true,
  fixtureEvents: true,
  teamSeasonStatistics: true,
  playerLeaderboards: true,
};

function registryWith(
  providerId: number,
  capabilities: CompetitionCapabilities
): CompetitionRegistryFile {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    source: "api-football/leagues",
    totalFromApi: 1,
    enabledCount: 1,
    competitions: [
      {
        providerId,
        name: "Test League",
        countryName: "England",
        countryCode: "GB-ENG",
        providerType: "League",
        category: "domestic_league",
        tier: 1,
        enabled: true,
        capabilities,
      },
    ],
  };
}

describe("applyProbeResultToCapabilities", () => {
  it("leaves base unchanged when probe patch is empty", () => {
    expect(applyProbeResultToCapabilities(BASE, {})).toEqual(BASE);
    expect(applyProbeResultToCapabilities(BASE, undefined)).toEqual(BASE);
  });

  it("overrides only probed capability keys", () => {
    expect(
      applyProbeResultToCapabilities(BASE, {
        standings: false,
        lineups: false,
      })
    ).toEqual({
      ...BASE,
      standings: false,
      lineups: false,
    });
  });
});

describe("mergeProbedCapabilitiesIntoRegistry", () => {
  it("merges probe results for matching competitions only", () => {
    const registry = registryWith(39, BASE);
    const probeFile: CompetitionCapabilitiesProbeFile = {
      probedAt: "2026-01-02T00:00:00.000Z",
      source: "api-football/capability-probe",
      selectionNote: "test",
      results: [
        {
          providerId: 39,
          seasonYear: 2025,
          sampleFixtureId: 123,
          capabilities: { standings: false, fixtureEvents: false },
        },
        {
          providerId: 999,
          seasonYear: 2025,
          sampleFixtureId: 456,
          capabilities: { lineups: false },
        },
      ],
    };

    const merged = mergeProbedCapabilitiesIntoRegistry(registry, probeFile);
    expect(merged.competitions[0]?.capabilities).toEqual({
      ...BASE,
      standings: false,
      fixtureEvents: false,
    });
  });

  it("returns registry unchanged when probe file has no matching ids", () => {
    const registry = registryWith(39, BASE);
    const probeFile: CompetitionCapabilitiesProbeFile = {
      probedAt: "2026-01-02T00:00:00.000Z",
      source: "api-football/capability-probe",
      selectionNote: "test",
      results: [
        {
          providerId: 140,
          seasonYear: 2025,
          sampleFixtureId: null,
          capabilities: { standings: false },
        },
      ],
    };

    expect(mergeProbedCapabilitiesIntoRegistry(registry, probeFile)).toEqual(
      registry
    );
  });
});
