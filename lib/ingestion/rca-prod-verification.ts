/**
 * RCA Phase 4 — production verification helpers (DB metrics + HTTP probes).
 */

export const RCA_PHASE4_CRON_PATHS = [
  "/api/cron/warm-ai-prematch",
  "/api/cron/sync-fixtures-today",
  "/api/cron/sync-fixtures-future",
  "/api/cron/sync-live-center",
] as const;

export type RcaCoverageMetrics = {
  upcoming7d: number;
  eligibleUpcoming: number;
  upcomingWithPrematchInsight: number;
  stuckRunningSyncRuns: number;
};

export type RcaCronRouteProbe = {
  path: string;
  httpStatus: number;
};

export type RcaFixtureWalkRow = {
  providerId: number;
  status: string;
  kickoffAt: string | null;
  aiEligible: boolean | null;
  hasPrematchInsight: boolean;
  hasPrematchPrediction: boolean;
  bucket: "working" | "broken";
};

export type RcaProdVerificationInput = {
  coverage: RcaCoverageMetrics;
  cronProbes: RcaCronRouteProbe[];
  fixtureWalk: RcaFixtureWalkRow[];
  productionSiteUrl: string;
};

export type RcaProdVerificationResult = {
  ok: boolean;
  failures: string[];
  warnings: string[];
};

/** Cron routes must exist and reject unauthenticated calls (401 or 503). */
export function isAcceptableCronProbeStatus(httpStatus: number): boolean {
  return httpStatus === 401 || httpStatus === 503;
}

export function evaluateRcaProdVerification(
  input: RcaProdVerificationInput
): RcaProdVerificationResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (input.coverage.stuckRunningSyncRuns > 0) {
    failures.push(
      `${input.coverage.stuckRunningSyncRuns} ingestion_sync_runs stuck in running (>2h)`
    );
  }

  for (const probe of input.cronProbes) {
    if (probe.httpStatus === 404) {
      failures.push(`Production missing cron route ${probe.path} (404)`);
    } else if (probe.httpStatus >= 500) {
      failures.push(
        `Production cron ${probe.path} returned HTTP ${probe.httpStatus}`
      );
    } else if (!isAcceptableCronProbeStatus(probe.httpStatus)) {
      warnings.push(
        `Unexpected cron probe ${probe.path}: HTTP ${probe.httpStatus} (expected 401 or 503 without auth)`
      );
    }
  }

  if (input.coverage.upcoming7d > 0 && input.coverage.eligibleUpcoming === 0) {
    warnings.push(
      "No upcoming fixtures marked aiEligible — run sync-fixtures-today / readiness refresh on production"
    );
  }

  if (
    input.coverage.eligibleUpcoming > 0 &&
    input.coverage.upcomingWithPrematchInsight === 0
  ) {
    warnings.push(
      "Eligible upcoming fixtures exist but none have PREMATCH ai_insights yet — check warm-ai-prematch GHA schedule"
    );
  }

  const working = input.fixtureWalk.filter((row) => row.bucket === "working");
  const broken = input.fixtureWalk.filter((row) => row.bucket === "broken");
  if (working.length === 0) {
    warnings.push(
      "Fixture walk: no sample with PREMATCH insight found in DB (pipeline may still be warming)"
    );
  }
  if (broken.length === 0 && input.coverage.upcoming7d > 0) {
    warnings.push("Fixture walk: no upcoming counter-sample without insight");
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
  };
}

export function formatRcaVerificationReport(
  input: RcaProdVerificationInput,
  result: RcaProdVerificationResult,
  verifiedAt: string
): string {
  const lines = [
    "# RCA Phase 4 — Production verification report",
    "",
    `**Verified at:** ${verifiedAt}`,
    `**Production URL:** ${input.productionSiteUrl}`,
    "",
    "## Coverage (Postgres)",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Upcoming fixtures (7d, NS/TBD) | ${input.coverage.upcoming7d} |`,
    `| aiEligible upcoming | ${input.coverage.eligibleUpcoming} |`,
    `| Upcoming with PREMATCH insight | ${input.coverage.upcomingWithPrematchInsight} |`,
    `| Stuck sync runs (>2h running) | ${input.coverage.stuckRunningSyncRuns} |`,
    "",
    "## Cron route probes (no auth)",
    "",
    "| Route | HTTP |",
    "| --- | ---: |",
    ...input.cronProbes.map(
      (probe) => `| \`${probe.path}\` | ${probe.httpStatus} |`
    ),
    "",
    "## Fixture walk (samples from DB)",
    "",
    "| Bucket | Provider ID | Status | aiEligible | Insight | Prediction |",
    "| --- | ---: | --- | --- | --- | --- |",
    ...input.fixtureWalk.map(
      (row) =>
        `| ${row.bucket} | ${row.providerId} | ${row.status} | ${row.aiEligible ?? "null"} | ${row.hasPrematchInsight} | ${row.hasPrematchPrediction} |`
    ),
    "",
    "## Result",
    "",
    result.ok ? "**PASS** (no blocking failures)" : "**FAIL**",
    "",
  ];

  if (result.failures.length > 0) {
    lines.push("### Failures", "");
    for (const failure of result.failures) {
      lines.push(`- ${failure}`);
    }
    lines.push("");
  }

  if (result.warnings.length > 0) {
    lines.push("### Warnings", "");
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
