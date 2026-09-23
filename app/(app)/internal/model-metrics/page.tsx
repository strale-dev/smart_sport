import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { runProductionEvaluation } from "@/lib/analytics/production-eval";
import { isInternalAdmin } from "@/lib/auth/internal-admin";
import { API_FOOTBALL_CONFIG } from "@/lib/api-football/config";
import { getStoredQuotaSnapshot } from "@/lib/api-football/quota";
import { getLivePollStatsForDay } from "@/lib/live/poll-stats";
import { captureInternalModelMetricsViewed } from "@/lib/posthog/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export const metadata: Metadata = {
  title: "Model metrics (internal)",
  robots: { index: false, follow: false },
};

const PERIOD_OPTIONS = [7, 14, 21] as const;

function parsePeriod(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "21", 10);
  return PERIOD_OPTIONS.includes(parsed as (typeof PERIOD_OPTIONS)[number])
    ? parsed
    : 21;
}

function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatNum(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(4);
}

export default async function InternalModelMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!isInternalAdmin(user?.id ?? null)) {
    notFound();
  }

  const { period: periodRaw } = await searchParams;
  const periodDays = parsePeriod(periodRaw);

  const [summary, pollStats, quota] = await Promise.all([
    runProductionEvaluation(periodDays),
    getLivePollStatsForDay(),
    getStoredQuotaSnapshot(),
  ]);

  await captureInternalModelMetricsViewed({
    userId: user!.id,
    periodDays,
    evaluatedCount: summary.evaluatedCount,
  });

  const dailyLimit = API_FOOTBALL_CONFIG.quota.defaultDailyLimit;
  const quotaUsedPct =
    quota.dayRemaining != null
      ? ((dailyLimit - quota.dayRemaining) / dailyLimit) * 100
      : null;

  return (
    <div className="container max-w-5xl space-y-8 py-8">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Internal model metrics
        </h1>
        <p className="text-muted-foreground text-sm">
          Production prediction evaluation (PRD §8.6). Not linked in navigation.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {PERIOD_OPTIONS.map((days) => (
            <Link
              key={days}
              href={`/internal/model-metrics?period=${days}`}
              className={
                days === periodDays
                  ? "text-primary text-sm font-medium underline"
                  : "text-muted-foreground text-sm hover:underline"
              }
            >
              Last {days}d
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live polling & API budget (today UTC)</CardTitle>
          <CardDescription>
            Redis counters from internal poll routes; quota from last provider
            response headers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span>API-Football day remaining:</span>
            {quota.dayRemaining != null ? (
              <Badge variant={quota.isLowBudget ? "destructive" : "secondary"}>
                {quota.dayRemaining} / {dailyLimit}
                {quotaUsedPct != null
                  ? ` (${quotaUsedPct.toFixed(0)}% used)`
                  : ""}
              </Badge>
            ) : (
              <span className="text-muted-foreground">
                No quota snapshot yet
              </span>
            )}
            {quota.isLowBudget ? (
              <span className="text-muted-foreground">
                Low budget — server poll cadence ×1.25
              </span>
            ) : null}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 text-right font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-border/50 border-b">
                <td className="py-2">Fixture poll calls / ingest / skipped</td>
                <td className="py-2 text-right">
                  {pollStats.fixturePollCalls} / {pollStats.fixturePollIngest} /{" "}
                  {pollStats.fixturePollSkipped}
                </td>
              </tr>
              <tr className="border-border/50 border-b">
                <td className="py-2">
                  Live Center poll calls / ingest / skipped
                </td>
                <td className="py-2 text-right">
                  {pollStats.centerPollCalls} / {pollStats.centerPollIngest} /{" "}
                  {pollStats.centerPollSkipped}
                </td>
              </tr>
              <tr className="border-border/50 border-b">
                <td className="py-2">
                  Center API requests / fixtures upserted
                </td>
                <td className="py-2 text-right">
                  {pollStats.centerApiRequests} /{" "}
                  {pollStats.centerFixturesUpserted}
                </td>
              </tr>
              <tr className="border-border/50 border-b">
                <td className="py-2">
                  Follow-notification poll calls / ingest
                </td>
                <td className="py-2 text-right">
                  {pollStats.followPollCalls} / {pollStats.followPollIngest}
                </td>
              </tr>
              <tr>
                <td className="py-2">Active follow-notification chains</td>
                <td className="py-2 text-right">
                  {pollStats.followNotificationActiveChains ?? "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Evaluated fixtures</CardDescription>
            <CardTitle className="text-2xl">{summary.evaluatedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Coverage (eval / finished)</CardDescription>
            <CardTitle className="text-2xl">
              {formatPct(summary.coverageRatio)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>1X2 hit rate</CardDescription>
            <CardTitle className="text-2xl">
              {formatPct(summary.hitRate1x2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Log loss / Brier</CardDescription>
            <CardTitle className="text-lg">
              {formatNum(summary.logLoss)} / {formatNum(summary.brier)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calibration bins (max outcome prob)</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Bin</th>
                <th className="pb-2 text-right font-medium">n</th>
                <th className="pb-2 text-right font-medium">Avg predicted</th>
                <th className="pb-2 text-right font-medium">Actual rate</th>
              </tr>
            </thead>
            <tbody>
              {summary.calibrationBins.map((bin) => (
                <tr key={bin.label} className="border-border/50 border-b">
                  <td className="py-2">{bin.label}</td>
                  <td className="py-2 text-right">{bin.count}</td>
                  <td className="py-2 text-right">
                    {formatPct(bin.avgPredicted)}
                  </td>
                  <td className="py-2 text-right">
                    {bin.count > 0 ? formatPct(bin.actualRate) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Bucket</th>
                <th className="pb-2 text-right font-medium">n</th>
                <th className="pb-2 text-right font-medium">Hit rate</th>
                <th className="pb-2 text-right font-medium">Log loss</th>
              </tr>
            </thead>
            <tbody>
              {summary.byConfidence.map((row) => (
                <tr key={row.confidence} className="border-border/50 border-b">
                  <td className="py-2">{row.confidence}</td>
                  <td className="py-2 text-right">{row.count}</td>
                  <td className="py-2 text-right">
                    {formatPct(row.hitRate1x2)}
                  </td>
                  <td className="py-2 text-right">{formatNum(row.logLoss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By league (top)</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">League</th>
                <th className="pb-2 text-right font-medium">n</th>
                <th className="pb-2 text-right font-medium">Hit rate</th>
                <th className="pb-2 text-right font-medium">Log loss</th>
              </tr>
            </thead>
            <tbody>
              {summary.byLeague.slice(0, 15).map((row) => (
                <tr
                  key={`${row.leagueProviderId ?? "unknown"}-${row.leagueName ?? ""}`}
                  className="border-border/50 border-b"
                >
                  <td className="py-2">
                    {row.leagueName ?? "Unknown"}{" "}
                    {row.leagueProviderId != null ? (
                      <span className="text-muted-foreground">
                        ({row.leagueProviderId})
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 text-right">{row.count}</td>
                  <td className="py-2 text-right">
                    {formatPct(row.hitRate1x2)}
                  </td>
                  <td className="py-2 text-right">{formatNum(row.logLoss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
