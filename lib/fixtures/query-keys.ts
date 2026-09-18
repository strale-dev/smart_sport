import type { FixturesSearchParams } from "@/lib/fixtures/url";

export const fixturesKeys = {
  all: ["fixtures"] as const,
  list: (params: FixturesSearchParams, timeZone: string) =>
    [...fixturesKeys.all, "list", params, timeZone] as const,
};
