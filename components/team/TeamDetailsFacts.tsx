import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Team } from "@/types/domain";

type TeamDetailsFactsProps = {
  team: Team;
};

function formatVenue(team: Team): string | null {
  if (!team.venue?.name) {
    return null;
  }

  if (team.venue.city) {
    return `${team.venue.name}, ${team.venue.city}`;
  }

  return team.venue.name;
}

export function TeamDetailsFacts({ team }: TeamDetailsFactsProps) {
  const venueLabel = formatVenue(team);
  const facts = [
    team.country?.name ? { label: "Country", value: team.country.name } : null,
    team.founded ? { label: "Founded", value: String(team.founded) } : null,
    venueLabel ? { label: "Venue", value: venueLabel } : null,
    team.venue?.capacity
      ? {
          label: "Capacity",
          value: team.venue.capacity.toLocaleString("en-GB"),
        }
      : null,
    team.venue?.surface
      ? { label: "Surface", value: team.venue.surface }
      : null,
  ].filter((fact): fact is { label: string; value: string } => fact != null);

  if (facts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Club details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Extra club details are not available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Club details</CardTitle>
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
