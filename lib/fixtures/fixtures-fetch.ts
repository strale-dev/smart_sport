import { buildFixturesApiHref } from "@/lib/fixtures/url";
import type { FixturesData } from "@/lib/services/fixturesService";
import type { FixturesSearchParams } from "@/lib/fixtures/url";

export async function fetchFixturesData(
  params: FixturesSearchParams
): Promise<FixturesData> {
  const response = await fetch(buildFixturesApiHref(params), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`fixtures_${response.status}`);
  }

  return (await response.json()) as FixturesData;
}
