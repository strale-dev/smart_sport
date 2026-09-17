import Link from "next/link";
import { RadioIcon, SparklesIcon, TrophyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildLeagueHref } from "@/lib/leagues/url";

type DashboardQuickLinksProps = {
  preferredLeagueProviderId?: number | null;
};

export function DashboardQuickLinks({
  preferredLeagueProviderId = null,
}: DashboardQuickLinksProps) {
  return (
    <div className="flex w-full flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href="/predictions" />}
      >
        <SparklesIcon />
        Predictions Center
      </Button>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href="/live" />}
      >
        <RadioIcon />
        Live Center
      </Button>
      {preferredLeagueProviderId != null ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={buildLeagueHref(preferredLeagueProviderId)} />}
        >
          <TrophyIcon />
          Your league
        </Button>
      ) : null}
    </div>
  );
}
