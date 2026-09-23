import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { proposeModelCalibration } from "@/lib/models/propose-calibration";

async function main() {
  const dryRun = !process.argv.includes("--write");
  const periodDays = Number.parseInt(
    process.argv.find((arg) => arg.startsWith("--period="))?.split("=")[1] ??
      "21",
    10
  );
  const holdoutDays = Number.parseInt(
    process.argv.find((arg) => arg.startsWith("--holdout="))?.split("=")[1] ??
      "7",
    10
  );

  const proposal = await proposeModelCalibration({ periodDays, holdoutDays });
  const payload = JSON.stringify(proposal, null, 2);

  if (dryRun) {
    console.log(payload);
    console.error(
      "\nDry run only. Pass --write to save ./tmp/model-calibration-proposal.json"
    );
    return;
  }

  const outPath = resolve(process.cwd(), "tmp/model-calibration-proposal.json");
  writeFileSync(outPath, payload, "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(payload);
}

main().catch((error) => {
  console.error("model:propose-calibration failed:", error);
  process.exit(1);
});
