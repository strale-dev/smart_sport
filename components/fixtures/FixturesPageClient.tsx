"use client";

import { StaleBadge } from "@/components/common/StaleBadge";
import { FixturesList } from "@/components/fixtures/FixturesList";
import { useFixturesQuery } from "@/hooks/useFixturesQuery";
import { sanitizeTimezone } from "@/lib/datetime/timezone";
import type { FixturesSearchParams } from "@/lib/fixtures/url";
import type { FixturesData } from "@/lib/services/fixturesService";

type FixturesPageClientProps = {
  params: FixturesSearchParams;
  timeZone: string;
  initialData: FixturesData;
};

function formatSyncedClock(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: sanitizeTimezone(timeZone),
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
}

function FixturesFreshness({
  data,
  timeZone,
}: {
  data: FixturesData;
  timeZone: string;
}) {
  return (
    <div className="space-y-1">
      <StaleBadge
        language="sr"
        stale={data.freshnessStale}
        updatedAt={data.providerSyncedAt}
      />
      {data.freshnessStale && data.providerSyncedAt ? (
        <p className="text-muted-foreground text-sm">
          Podaci možda nisu ažurirani — poslednje uspešno sinhronizovano u{" "}
          {formatSyncedClock(data.providerSyncedAt, timeZone)}
        </p>
      ) : null}
    </div>
  );
}

export function FixturesPageClient({
  params,
  timeZone,
  initialData,
}: FixturesPageClientProps) {
  const { data } = useFixturesQuery({ params, timeZone, initialData });

  return (
    <div className="flex flex-col gap-4">
      <FixturesFreshness data={data} timeZone={timeZone} />
      <FixturesList data={data} />
    </div>
  );
}
