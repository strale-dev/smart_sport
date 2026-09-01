import type { Metadata } from "next";
import { UserIcon } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <EmptyState
      icon={UserIcon}
      title="Profile coming soon"
      description="Manage your display name, avatar, and preferences here."
    />
  );
}
