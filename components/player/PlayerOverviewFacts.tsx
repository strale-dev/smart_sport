import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ageFromDateOfBirth,
  formatMarketValue,
  formatPlayerFoot,
  formatPlayerPosition,
} from "@/lib/players/display";
import type { Player, PlayerSeasonStatistics } from "@/types/domain";

type PlayerOverviewFactsProps = {
  player: Player;
  seasonStats: PlayerSeasonStatistics | null;
};

export function PlayerOverviewFacts({
  player,
  seasonStats,
}: PlayerOverviewFactsProps) {
  const age = ageFromDateOfBirth(player.dateOfBirth);
  const marketValueLabel = formatMarketValue(player.marketValue);
  const facts = [
    player.nationality
      ? { label: "Nationality", value: player.nationality }
      : null,
    player.dateOfBirth
      ? {
          label: "Date of birth",
          value:
            age != null ? `${player.dateOfBirth} (${age})` : player.dateOfBirth,
        }
      : null,
    formatPlayerPosition(player.position)
      ? { label: "Position", value: formatPlayerPosition(player.position)! }
      : null,
    formatPlayerFoot(player.preferredFoot)
      ? {
          label: "Preferred foot",
          value: formatPlayerFoot(player.preferredFoot)!,
        }
      : null,
    player.shirtNumber != null
      ? { label: "Shirt number", value: `#${player.shirtNumber}` }
      : null,
    player.heightCm
      ? { label: "Height", value: `${player.heightCm} cm` }
      : null,
    player.weightKg
      ? { label: "Weight", value: `${player.weightKg} kg` }
      : null,
    player.currentTeam
      ? {
          label: "Club",
          value: player.currentTeam.name,
          href: `/teams/${player.currentTeam.externalId}`,
        }
      : null,
    marketValueLabel
      ? { label: "Market value", value: marketValueLabel }
      : null,
    player.averageRating != null
      ? {
          label: "Average rating",
          value: `${player.averageRating.toFixed(2)}${
            seasonStats?.leagueName ? ` (${seasonStats.leagueName})` : ""
          }`,
        }
      : null,
  ].filter(
    (fact): fact is { label: string; value: string; href?: string } =>
      fact != null
  );

  if (facts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Extra player details are not available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-heading text-base">Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="bg-muted/40 min-w-0 rounded-lg px-3 py-2.5"
            >
              <dt className="text-muted-foreground text-[11px] tracking-wide uppercase">
                {fact.label}
              </dt>
              <dd className="mt-1 truncate text-sm font-medium">
                {fact.href ? (
                  <Link href={fact.href} className="hover:underline">
                    {fact.value}
                  </Link>
                ) : (
                  fact.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
