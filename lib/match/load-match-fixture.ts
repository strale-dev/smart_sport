import "server-only";

import { cache } from "react";

import {
  getFixtureById,
  type ServiceResult,
} from "@/lib/services/footballService";
import type { Fixture } from "@/types/domain";

/** Dedupes fixture load between generateMetadata and the match page in one request. */
export const loadMatchFixture = cache(
  async (id: number): Promise<ServiceResult<Fixture | null>> =>
    getFixtureById(id)
);
