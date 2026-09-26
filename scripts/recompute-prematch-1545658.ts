import { getOrComputePrematch } from "@/lib/services/predictionService";

const fixtureId = 1545658;

async function main() {
  const result = await getOrComputePrematch(fixtureId);

  if (!result) {
    console.error("getOrComputePrematch returned null");
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        fixtureId,
        predictionId: result.predictionId,
        fromCache: result.fromCache,
        winProbabilities: result.winProbabilities,
        form5HomePpg: result.inputSnapshot?.form5HomePpg ?? null,
        form5AwayPpg: result.inputSnapshot?.form5AwayPpg ?? null,
        homeLeagueRank: result.inputSnapshot?.homeLeagueRank ?? null,
        awayLeagueRank: result.inputSnapshot?.awayLeagueRank ?? null,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
