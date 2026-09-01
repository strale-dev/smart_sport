import type { Metadata } from "next";
import { CalendarDaysIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

export const metadata: Metadata = {
  title: "Fixtures",
};

export default function FixturesPage() {
  return (
    <EmptyState
      icon={CalendarDaysIcon}
      title="Fixtures coming soon"
      description="Browse today's and upcoming matches across your leagues."
    />
  );
}
