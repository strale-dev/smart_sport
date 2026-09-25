import Link from "next/link";
import { BookOpenIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlayerBiographyView } from "@/lib/wikipedia/player-bio-service";

type PlayerBiographyCardProps = {
  bio: PlayerBiographyView | null;
};

export function PlayerBiographyCard({ bio }: PlayerBiographyCardProps) {
  if (!bio || bio.fetchStatus !== "OK" || !bio.excerpt) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-heading text-base">Biography</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BookOpenIcon}
            title="No biography available"
            description="We could not find a suitable Wikipedia article for this player yet."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="gap-2">
        <CardTitle className="font-heading text-base">Biography</CardTitle>
        <CardDescription>
          Short excerpt with attribution — not a substitute for the full
          article.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        <p>{bio.excerpt}</p>
        {bio.pageUrl ? (
          <p>
            <Link
              href={bio.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              Read on Wikipedia
            </Link>
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {bio.licenseNote}
          {bio.fetchedAt
            ? ` · Fetched ${new Date(bio.fetchedAt).toLocaleDateString()}`
            : null}
        </p>
      </CardContent>
    </Card>
  );
}
