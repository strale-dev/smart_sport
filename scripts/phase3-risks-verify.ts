import { PINNED_MATCH_QA_FIXTURES } from "@/lib/qa/match-fixtures";
import {
  getFixtureLineups,
  getFixtureStatistics,
} from "@/lib/services/footballService";

async function verifyRiskStates() {
  const [withXg, withoutXg, nsLineups] = await Promise.all([
    getFixtureStatistics(PINNED_MATCH_QA_FIXTURES.ftWithXg),
    getFixtureStatistics(PINNED_MATCH_QA_FIXTURES.ftWithoutXg),
    getFixtureLineups(PINNED_MATCH_QA_FIXTURES.nsNoLineups),
  ]);

  const withXgHasValue = withXg.data.some(
    (entry) => entry.expectedGoals != null
  );
  const withoutXgMissing = withoutXg.data.every(
    (entry) => entry.expectedGoals == null
  );

  console.log("Risk verification fixtures:", PINNED_MATCH_QA_FIXTURES);
  console.log("xG present on rich FT:", withXgHasValue);
  console.log("xG absent on partial FT:", withoutXgMissing);
  console.log("NS lineups empty:", nsLineups.data.length === 0);

  if (!withXgHasValue || !withoutXgMissing) {
    console.error("xG risk verification failed.");
    process.exit(1);
  }

  console.log("phase3:risks-verify passed.");
}

verifyRiskStates().catch((error) => {
  console.error("phase3:risks-verify failed:", error);
  process.exit(1);
});
