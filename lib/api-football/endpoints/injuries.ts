import { mapFixtureSidelined } from "@/lib/api-football/adapter/sidelined";
import { apiFootballFetchResponse } from "@/lib/api-football/client";
import type { RawApiFootballInjury } from "@/lib/api-football/types";
import type { FixtureSidelinedPlayer } from "@/types/domain";

export async function getFixtureInjuries(
  fixtureId: number
): Promise<FixtureSidelinedPlayer[]> {
  const response = await apiFootballFetchResponse<RawApiFootballInjury>(
    "/injuries",
    { fixture: fixtureId }
  );
  return response.map(mapFixtureSidelined);
}
