import type { Metadata } from "next";
import { StarIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

export const metadata: Metadata = {
  title: "Favorites",
};

export default function FavoritesPage() {
  return (
    <EmptyState
      icon={StarIcon}
      title="Your favorites coming soon"
      description="Bookmark matches and quickly return to the ones you care about."
    />
  );
}
