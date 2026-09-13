import {
  probeApiFootballQuota,
  runIngestionDiagnosis,
  type ApiFootballProbeResult,
  type FixtureIngestionReport,
  type IngestionDiagnosis,
} from "@/lib/ingestion/diagnostics";

function parseArgs(argv: string[]) {
  const fixtureIdArg = argv.find((arg) => arg.startsWith("--fixture-id="));
  const json = argv.includes("--json");
  const strict = argv.includes("--strict");

  const fixtureId = fixtureIdArg
    ? Number.parseInt(fixtureIdArg.slice("--fixture-id=".length), 10)
    : undefined;

  return {
    fixtureId: Number.isFinite(fixtureId) ? fixtureId : undefined,
    json,
    strict,
  };
}

function formatFixtureRow(row: FixtureIngestionReport): string {
  const db = row.inDatabase ? (row.status ?? "?") : "NOT IN DB";
  const overview = row.overviewExpectsDbData
    ? row.overviewHasData
      ? "overview OK"
      : "overview MISSING data"
    : "overview pre-match shell";

  return [
    `  ${row.label} (${row.providerId})`,
    `    path: ${row.matchPath}`,
    `    db: ${db} | stats=${row.statRows} events=${row.eventRows} lineups=${row.lineupRows}`,
    `    ${overview}`,
  ].join("\n");
}

function formatApiProbe(probe: ApiFootballProbeResult): string {
  if (probe.skipped) {
    return `API probe skipped: ${probe.reason}`;
  }

  if (!probe.ok) {
    return `API probe failed: ${probe.error}`;
  }

  const remaining = probe.quota.dayRemaining;
  const pct =
    remaining != null ? Math.round((remaining / probe.dailyLimit) * 100) : null;

  const low =
    remaining != null && remaining / probe.dailyLimit <= 0.1
      ? " ⚠ low budget (<10%)"
      : "";

  return [
    "API-Football probe:",
    `  fixtures today (provider): ${probe.fixturesTodayFromApi}`,
    `  quota day remaining: ${remaining ?? "unknown"} / ${probe.dailyLimit}${
      pct != null ? ` (${pct}%)` : ""
    }${low}`,
    `  quota minute remaining: ${probe.quota.minuteRemaining ?? "unknown"}`,
  ].join("\n");
}

function printHumanReport(
  diagnosis: IngestionDiagnosis,
  apiProbe: ApiFootballProbeResult
): void {
  console.log("=== Ingestion diagnosis ===\n");

  console.log("1) Environment");
  console.log(`  app env: ${diagnosis.env.appEnv}`);
  console.log(`  API_FOOTBALL_INGEST_ONLY: ${diagnosis.env.ingestOnly}`);
  console.log(
    `  keys: api_football=${diagnosis.env.hasApiFootballKey} service_role=${diagnosis.env.hasSupabaseServiceRole} redis=${diagnosis.env.hasRedis}`
  );
  console.log(
    `  API daily limit (configured): ${diagnosis.env.apiFootballDailyLimit}`
  );

  console.log("\n2) Ingestion config");
  console.log(
    `  fixture window ±${diagnosis.config.fixtureWindowDays} day(s), throttle ${diagnosis.config.providerThrottleMs}ms, lineups cron enabled=${diagnosis.config.lineupsSyncEnabled}, allowlist leagues=${diagnosis.config.leagueCount}`
  );

  console.log("\n3) Global DB counts");
  console.log(JSON.stringify(diagnosis.globalCounts, null, 2));

  console.log("\n4) Fixtures today (UTC)");
  console.log(
    `  count=${diagnosis.fixturesTodayUtc.count} sample provider ids=${diagnosis.fixturesTodayUtc.sampleProviderIds.join(", ") || "(none)"}`
  );

  console.log("\n5) Pinned QA fixtures");
  for (const row of diagnosis.pinnedReports) {
    console.log(formatFixtureRow(row));
  }

  if (diagnosis.extraFixtureReport) {
    console.log("\n6) Extra fixture (--fixture-id)");
    console.log(formatFixtureRow(diagnosis.extraFixtureReport));
  } else {
    console.log("\n6) Extra fixture: (none — pass --fixture-id=...)");
  }

  console.log("\n7) API quota");
  console.log(formatApiProbe(apiProbe));

  console.log("\nGaps:");
  if (diagnosis.gaps.length === 0) {
    console.log("  (none)");
  } else {
    for (const gap of diagnosis.gaps) {
      console.log(`  [${gap.severity}] ${gap.message}`);
    }
  }

  console.log("\nNext steps:");
  for (const command of diagnosis.recommendedCommands) {
    console.log(`  ${command}`);
  }

  console.log(
    `\nStrict gate: ${diagnosis.strictWouldFail ? "WOULD FAIL" : "would pass"}`
  );
}

async function main() {
  const { fixtureId, json, strict } = parseArgs(process.argv.slice(2));

  const [diagnosis, apiProbe] = await Promise.all([
    runIngestionDiagnosis({ extraFixtureId: fixtureId }),
    probeApiFootballQuota(),
  ]);

  if (json) {
    console.log(JSON.stringify({ diagnosis, apiProbe }, null, 2));
  } else {
    printHumanReport(diagnosis, apiProbe);
  }

  if (strict && diagnosis.strictWouldFail) {
    console.error(
      "\ndiagnose:ingestion --strict failed (fixtures today or pinned FT overview data missing)."
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("diagnose:ingestion failed:", error);
  process.exit(1);
});
