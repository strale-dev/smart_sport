import Link from "next/link";
import { BriefcaseIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { TeamLogo } from "@/components/match/TeamLogo";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlayerCareerEntry } from "@/types/domain";

type PlayerCareerTabProps = {
  career: PlayerCareerEntry[];
};

function formatCareerPeriod(
  fromDate: string | null,
  toDate: string | null
): string {
  const from = fromDate
    ? new Date(`${fromDate}T00:00:00.000Z`).getFullYear()
    : null;
  const to = toDate
    ? new Date(`${toDate}T00:00:00.000Z`).getFullYear()
    : "Present";

  if (from && to) {
    return `${from} – ${to}`;
  }

  if (from) {
    return `${from} – Present`;
  }

  if (toDate) {
    return `Until ${to}`;
  }

  return "Period unknown";
}

export function PlayerCareerTab({ career }: PlayerCareerTabProps) {
  if (career.length === 0) {
    return (
      <EmptyState
        icon={BriefcaseIcon}
        title="Career history unavailable"
        description="Previous clubs will appear once transfer or squad history is available from the provider."
        actions={[{ label: "Browse fixtures", href: "/fixtures" }]}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-heading text-base">Career</CardTitle>
        <CardDescription>Previous clubs and transfers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {career.map((entry) => (
          <div
            key={entry.team.externalId}
            className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <TeamLogo
                name={entry.team.name}
                logoUrl={entry.team.logoUrl}
                className="size-8"
              />
              <div className="min-w-0 space-y-1">
                <Link
                  href={`/teams/${entry.team.externalId}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {entry.team.name}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {formatCareerPeriod(entry.fromDate, entry.toDate)}
                </p>
              </div>
            </div>

            {entry.transferType ? (
              <Badge variant="outline" className="shrink-0 capitalize">
                {entry.transferType}
              </Badge>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
