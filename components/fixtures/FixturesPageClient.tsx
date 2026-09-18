"use client";

import { FixturesList } from "@/components/fixtures/FixturesList";
import { useFixturesQuery } from "@/hooks/useFixturesQuery";
import type { FixturesSearchParams } from "@/lib/fixtures/url";
import type { FixturesData } from "@/lib/services/fixturesService";

type FixturesPageClientProps = {
  params: FixturesSearchParams;
  timeZone: string;
  initialData: FixturesData;
};

export function FixturesPageClient({
  params,
  timeZone,
  initialData,
}: FixturesPageClientProps) {
  const { data } = useFixturesQuery({ params, timeZone, initialData });

  return <FixturesList data={data} />;
}
