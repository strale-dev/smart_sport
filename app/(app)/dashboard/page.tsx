import type { Metadata } from "next";
import { HomeIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <EmptyState
      icon={HomeIcon}
      title="Dashboard coming soon"
      description="Featured matches, live updates, and your followed teams will appear here."
    />
  );
}
