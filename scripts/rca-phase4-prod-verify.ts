/**
 * RCA Phase 4 — production verification (Postgres coverage + cron route probes).
 *
 * Usage:
 *   npm.cmd run rca:phase4:verify
 *   npm.cmd run rca:phase4:verify -- --strict --write-report
 */
import fs from "node:fs";
import path from "node:path";

import {
  evaluateRcaProdVerification,
  formatRcaVerificationReport,
  RCA_PHASE4_CRON_PATHS,
  type RcaFixtureWalkRow,
} from "@/lib/ingestion/rca-prod-verification";
import { createAdminClient } from "@/lib/supabase/admin";

function parseArgs(argv: string[]) {
  return {
    strict: argv.includes("--strict"),
    writeReport: argv.includes("--write-report"),
    json: argv.includes("--json"),
  };
}

function resolveProductionSiteUrl(): string {
  const fromVar = process.env.PRODUCTION_SITE_URL?.trim();
  if (fromVar) {
    return fromVar.replace(/\/+$/, "");
  }

  const publicSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (publicSite && !/localhost|127\.0\.0\.1/i.test(publicSite)) {
    return publicSite.replace(/\/+$/, "");
  }

  return "https://scorence.app";
}

async function probeCronRoute(
  siteUrl: string,
  cronPath: string
): Promise<number> {
  const response = await fetch(`${siteUrl}${cronPath}`, {
    method: "GET",
    redirect: "manual",
  });
  return response.status;
}

function readAiEligible(
  prematchReadiness: { aiEligible?: boolean } | null
): boolean | null {
  if (prematchReadiness == null) {
    return null;
  }
  return prematchReadiness.aiEligible === true;
}

async function loadCoverageMetrics(
  client: ReturnType<typeof createAdminClient>
) {
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: upcomingRows, error: upcomingError } = await client
    .from("fixtures")
    .select("id, provider_id, prematch_readiness")
    .in("status", ["NS", "TBD"])
    .gte("kickoff_at", now.toISOString())
    .lt("kickoff_at", in7d);

  if (upcomingError) {
    throw new Error(`Upcoming fixtures query failed: ${upcomingError.message}`);
  }

  const upcoming = upcomingRows ?? [];
  const upcoming7d = upcoming.length;
  const eligibleUpcoming = upcoming.filter(
    (row) =>
      readAiEligible(
        row.prematch_readiness as { aiEligible?: boolean } | null
      ) === true
  ).length;

  const upcomingIds = upcoming.map((row) => row.id);
  let upcomingWithPrematchInsight = 0;

  if (upcomingIds.length > 0) {
    const { data: insightRows, error: insightError } = await client
      .from("ai_insights")
      .select("fixture_id")
      .eq("type", "PREMATCH")
      .in("fixture_id", upcomingIds);

    if (insightError) {
      throw new Error(`ai_insights query failed: ${insightError.message}`);
    }

    upcomingWithPrematchInsight = new Set(
      (insightRows ?? []).map((row) => row.fixture_id)
    ).size;
  }

  const staleCutoff = new Date(
    now.getTime() - 2 * 60 * 60 * 1000
  ).toISOString();
  const { count: stuckRunningSyncRuns, error: stuckError } = await client
    .from("ingestion_sync_runs")
    .select("*", { count: "exact", head: true })
    .eq("status", "running")
    .lt("started_at", staleCutoff);

  if (stuckError) {
    throw new Error(`ingestion_sync_runs query failed: ${stuckError.message}`);
  }

  return {
    upcoming7d,
    eligibleUpcoming,
    upcomingWithPrematchInsight,
    stuckRunningSyncRuns: stuckRunningSyncRuns ?? 0,
  };
}

async function loadFixtureWalk(
  client: ReturnType<typeof createAdminClient>
): Promise<RcaFixtureWalkRow[]> {
  const { data: workingRows, error: workingError } = await client
    .from("fixtures")
    .select("id, provider_id, status, kickoff_at, prematch_readiness")
    .eq("status", "FT")
    .order("kickoff_at", { ascending: false })
    .limit(30);

  if (workingError) {
    throw new Error(`Working fixture sample failed: ${workingError.message}`);
  }

  const workingCandidates = workingRows ?? [];
  const walk: RcaFixtureWalkRow[] = [];

  for (const row of workingCandidates) {
    if (walk.filter((item) => item.bucket === "working").length >= 2) {
      break;
    }

    const { count, error } = await client
      .from("ai_insights")
      .select("*", { count: "exact", head: true })
      .eq("fixture_id", row.id)
      .eq("type", "PREMATCH");

    if (error) {
      throw new Error(`Insight count failed: ${error.message}`);
    }

    if ((count ?? 0) === 0) {
      continue;
    }

    const { count: predCount } = await client
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("fixture_id", row.id)
      .eq("type", "PREMATCH");

    walk.push({
      providerId: row.provider_id,
      status: row.status,
      kickoffAt: row.kickoff_at,
      aiEligible: readAiEligible(
        row.prematch_readiness as { aiEligible?: boolean } | null
      ),
      hasPrematchInsight: true,
      hasPrematchPrediction: (predCount ?? 0) > 0,
      bucket: "working",
    });
  }

  const nowIso = new Date().toISOString();
  const { data: brokenRows, error: brokenError } = await client
    .from("fixtures")
    .select("id, provider_id, status, kickoff_at, prematch_readiness")
    .in("status", ["NS", "TBD"])
    .gt("kickoff_at", nowIso)
    .order("kickoff_at", { ascending: true })
    .limit(40);

  if (brokenError) {
    throw new Error(`Broken fixture sample failed: ${brokenError.message}`);
  }

  for (const row of brokenRows ?? []) {
    if (walk.filter((item) => item.bucket === "broken").length >= 2) {
      break;
    }

    const { count: insightCount } = await client
      .from("ai_insights")
      .select("*", { count: "exact", head: true })
      .eq("fixture_id", row.id)
      .eq("type", "PREMATCH");

    if ((insightCount ?? 0) > 0) {
      continue;
    }

    const { count: predCount } = await client
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("fixture_id", row.id)
      .eq("type", "PREMATCH");

    walk.push({
      providerId: row.provider_id,
      status: row.status,
      kickoffAt: row.kickoff_at,
      aiEligible: readAiEligible(
        row.prematch_readiness as { aiEligible?: boolean } | null
      ),
      hasPrematchInsight: false,
      hasPrematchPrediction: (predCount ?? 0) > 0,
      bucket: "broken",
    });
  }

  return walk;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const productionSiteUrl = resolveProductionSiteUrl();
  const client = createAdminClient();

  const coverage = await loadCoverageMetrics(client);
  const fixtureWalk = await loadFixtureWalk(client);

  const cronProbes = [];
  for (const cronPath of RCA_PHASE4_CRON_PATHS) {
    const httpStatus = await probeCronRoute(productionSiteUrl, cronPath);
    cronProbes.push({ path: cronPath, httpStatus });
  }

  const input = {
    productionSiteUrl,
    coverage,
    cronProbes,
    fixtureWalk,
  };

  const verifiedAt = new Date().toISOString();
  const result = evaluateRcaProdVerification(input);

  if (args.json) {
    console.log(JSON.stringify({ verifiedAt, ...input, result }, null, 2));
  } else {
    console.log(formatRcaVerificationReport(input, result, verifiedAt));
  }

  if (args.writeReport) {
    const reportPath = path.join(
      process.cwd(),
      "docs",
      "rca",
      "PHASE-4-VERIFICATION-REPORT.md"
    );
    fs.writeFileSync(
      reportPath,
      `${formatRcaVerificationReport(input, result, verifiedAt)}\n`
    );
    console.log(`\nWrote ${reportPath}`);
  }

  if (args.strict && !result.ok) {
    process.exit(1);
  }

  if (!args.strict && result.warnings.length > 0) {
    console.log(
      "\n(Warnings only — re-run with --strict to fail on blockers.)"
    );
  }
}

main().catch((error) => {
  console.error("rca:phase4:verify failed:", error);
  process.exit(1);
});
