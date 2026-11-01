import { cache } from "react";

import { getFixtureById } from "@/lib/services/footballService";
import type { ServiceResult } from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

/** Dedupe fixture fetch between generateMetadata and page in the same request. */
export const getFixtureByIdForRequest = cache(
  async (id: number): Promise<ServiceResult<Fixture | null>> =>
    getFixtureById(id)
);
