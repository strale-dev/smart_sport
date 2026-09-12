import type { Fixture } from "@/types/domain";

/** Live list row — optional fresh LIVE AI timestamp from server joins. */
export type LiveFixtureRow = Fixture & {
  aiUpdatedAt?: string | null;
};
