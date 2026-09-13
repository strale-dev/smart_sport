import { Badge } from "@/components/ui/badge";
import type { FormSnapshot } from "@/types/domain";

export function formResultBadgeVariant(result: "W" | "D" | "L") {
  switch (result) {
    case "W":
      return "default" as const;
    case "D":
      return "secondary" as const;
    case "L":
      return "outline" as const;
  }
}

export function FormResultBadges({ form }: { form: FormSnapshot }) {
  return (
    <div className="flex flex-wrap gap-2">
      {form.results.map((entry) => (
        <Badge
          key={entry.fixtureExternalId}
          variant={formResultBadgeVariant(entry.result)}
        >
          {entry.result}
        </Badge>
      ))}
    </div>
  );
}

export function FormWdlCounts({ form }: { form: FormSnapshot }) {
  return (
    <div className="text-muted-foreground grid grid-cols-3 gap-3 text-center text-xs">
      <div>
        <p className="text-foreground font-mono text-lg tabular-nums">
          {form.wins}
        </p>
        <p>Wins</p>
      </div>
      <div>
        <p className="text-foreground font-mono text-lg tabular-nums">
          {form.draws}
        </p>
        <p>Draws</p>
      </div>
      <div>
        <p className="text-foreground font-mono text-lg tabular-nums">
          {form.losses}
        </p>
        <p>Losses</p>
      </div>
    </div>
  );
}

export function FormCompactSummary({ form }: { form: FormSnapshot }) {
  return (
    <div className="space-y-3">
      <FormResultBadges form={form} />
      <FormWdlCounts form={form} />
    </div>
  );
}
