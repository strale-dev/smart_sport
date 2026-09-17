import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PreferencesForm } from "@/components/profile/PreferencesForm";
import {
  listPreferrableLeagues,
  readProfileForUser,
  readUserPreferences,
} from "@/lib/services/userService";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: "Preferences",
};

export default async function ProfilePreferencesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnTo=/profile/preferences");
  }

  const [profile, preferences, leagues] = await Promise.all([
    readProfileForUser(user.id),
    readUserPreferences(user.id),
    listPreferrableLeagues(),
  ]);

  if (!profile || !preferences) {
    redirect("/login?returnTo=/profile/preferences");
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Preferences</h1>
        <p className="text-muted-foreground text-sm">
          How Scorence shows times, leagues, alerts, and sound.
        </p>
      </div>

      <PreferencesForm
        profile={profile}
        preferences={preferences}
        leagues={leagues}
      />
    </div>
  );
}
