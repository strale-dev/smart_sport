import {
  getFixtureLineups,
  getFixtureStatistics,
} from "@/lib/services/footballService";

const QA_FIXTURES = {
  ftWithXg: 1570355,
  ftWithoutXg: 1553856,
  nsNoLineups: 1552754,
} as const;

async function verifyRiskStates() {
  const [withXg, withoutXg, nsLineups] = await Promise.all([
    getFixtureStatistics(QA_FIXTURES.ftWithXg),
    getFixtureStatistics(QA_FIXTURES.ftWithoutXg),
    getFixtureLineups(QA_FIXTURES.nsNoLineups),
  ]);

  const withXgHasValue = withXg.data.some(
    (entry) => entry.expectedGoals != null
  );
  const withoutXgMissing = withoutXg.data.every(
    (entry) => entry.expectedGoals == null
  );

  console.log("Risk verification fixtures:", QA_FIXTURES);
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
