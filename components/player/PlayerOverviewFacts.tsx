import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ageFromDateOfBirth,
  formatPlayerFoot,
  formatPlayerPosition,
} from "@/lib/players/display";
import type { Player } from "@/types/domain";

type PlayerOverviewFactsProps = {
  player: Player;
};

export function PlayerOverviewFacts({ player }: PlayerOverviewFactsProps) {
  const age = ageFromDateOfBirth(player.dateOfBirth);
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
    player.heightCm
      ? { label: "Height", value: `${player.heightCm} cm` }
      : null,
    player.weightKg
      ? { label: "Weight", value: `${player.weightKg} kg` }
      : null,
    player.currentTeam
      ? { label: "Club", value: player.currentTeam.name }
      : null,
  ].filter((fact): fact is { label: string; value: string } => fact != null);

  if (facts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
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
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="space-y-0.5">
              <dt className="text-muted-foreground text-xs">{fact.label}</dt>
              <dd className="text-sm font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
