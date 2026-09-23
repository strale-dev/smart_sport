import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { CalibrationProposal } from "@/lib/models/propose-calibration";
import { parseModelCoefficients } from "@/lib/models/coefficients";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

async function main() {
  const activate = process.argv.includes("--activate");
  const positional = process.argv
    .slice(2)
    .filter((arg) => arg !== "--activate" && !arg.startsWith("--"));
  const configPath = resolve(
    process.cwd(),
    positional[0] ?? "tmp/model-calibration-proposal.json"
  );

  const raw = readFileSync(configPath, "utf8");
  const proposal = JSON.parse(raw) as CalibrationProposal;
  const coefficients = parseModelCoefficients(proposal.coefficients);
  const description = `Calibration retrain from ${proposal.baselineVersion}; holdout log-loss ${proposal.metrics.proposedHoldoutLogLoss.toFixed(4)} vs baseline ${proposal.metrics.baselineHoldoutLogLoss.toFixed(4)}`;

  if (!activate) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          wouldInsert: {
            version: proposal.proposedVersion,
            description,
            coefficients,
          },
        },
        null,
        2
      )
    );
    console.error(
      "\nPass --activate to insert and flip is_active in Supabase."
    );
    return;
  }

  const client = createAdminClient();

  const { data: existing, error: existingError } = await client
    .from("model_versions")
    .select("id, version")
    .eq("version", proposal.proposedVersion)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check model_versions: ${existingError.message}`);
  }

  let versionId = existing?.id;

  if (!versionId) {
    const { data: inserted, error: insertError } = await client
      .from("model_versions")
      .insert({
        version: proposal.proposedVersion,
        description,
        coefficients: coefficients as Json,
        is_active: false,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Failed to insert model version: ${insertError.message}`);
    }

    versionId = inserted.id;
  }

  const { error: deactivateError } = await client
    .from("model_versions")
    .update({ is_active: false })
    .eq("is_active", true);

  if (deactivateError) {
    throw new Error(`Failed to deactivate models: ${deactivateError.message}`);
  }

  const { error: activateError } = await client
    .from("model_versions")
    .update({ is_active: true })
    .eq("id", versionId);

  if (activateError) {
    throw new Error(
      `Failed to activate model version: ${activateError.message}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        activatedVersion: proposal.proposedVersion,
        modelVersionId: versionId,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("model:activate-version failed:", error);
  process.exit(1);
});
