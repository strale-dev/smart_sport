import { runProductionEvaluation } from "@/lib/analytics/production-eval";

async function main() {
  const periodDays = Number.parseInt(process.argv[2] ?? "21", 10);
  if (!Number.isFinite(periodDays) || periodDays <= 0) {
    console.error("Usage: npm run model:production-eval -- [periodDays=21]");
    process.exit(1);
  }

  const summary = await runProductionEvaluation(periodDays);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("model:production-eval failed:", error);
  process.exit(1);
});
