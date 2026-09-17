"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { NotificationPreferenceSwitches } from "@/components/profile/NotificationPreferenceSwitches";
import { SoundPreferenceSwitches } from "@/components/profile/SoundPreferenceSwitches";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { filterTimezones } from "@/lib/datetime/timezone-options";
import { VIEWER_TIMEZONE_COOKIE } from "@/lib/datetime/viewer-timezone";
import { sanitizeTimezone } from "@/lib/datetime/timezone";
import { updateEmailMarketingOptIn } from "@/lib/profile/preferences.actions";
import {
  updatePreferredLeague,
  updateTimezone,
} from "@/lib/profile/profile.actions";
import type {
  PreferrableLeague,
  UserPreferencesRow,
  UserProfileRow,
} from "@/lib/services/userService";
import { cn } from "@/lib/utils";

type PreferencesFormProps = {
  profile: UserProfileRow;
  preferences: UserPreferencesRow;
  leagues: PreferrableLeague[];
};

function writeViewerTimezoneCookie(timeZone: string): void {
  document.cookie = `${VIEWER_TIMEZONE_COOKIE}=${encodeURIComponent(timeZone)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function PreferencesForm({
  profile,
  preferences,
  leagues,
}: PreferencesFormProps) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(profile.timezone);
  const [timezoneQuery, setTimezoneQuery] = useState("");
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [preferredLeagueId, setPreferredLeagueId] = useState<string>(
    profile.preferredLeagueId ?? ""
  );
  const [savingLeague, setSavingLeague] = useState(false);
  const [emailMarketing, setEmailMarketing] = useState(
    preferences.emailMarketingOptin
  );

  const timezoneOptions = useMemo(
    () => filterTimezones(timezoneQuery, 100),
    [timezoneQuery]
  );

  async function saveTimezone(nextTimezone: string) {
    const safe = sanitizeTimezone(nextTimezone);
    setSavingTimezone(true);
    try {
      const result = await updateTimezone(safe);
      if (!result.ok) {
        toast.add({ type: "error", title: "Could not save timezone." });
        return;
      }
      setTimezone(safe);
      writeViewerTimezoneCookie(safe);
      toast.add({ type: "success", title: "Timezone updated" });
      router.refresh();
    } finally {
      setSavingTimezone(false);
    }
  }

  async function savePreferredLeague() {
    setSavingLeague(true);
    try {
      const leagueId = preferredLeagueId.trim() || null;
      const result = await updatePreferredLeague(leagueId);
      if (!result.ok) {
        toast.add({ type: "error", title: "Could not save preferred league." });
        return;
      }
      toast.add({ type: "success", title: "Preferred league updated" });
      router.refresh();
    } finally {
      setSavingLeague(false);
    }
  }

  async function onEmailMarketingChange(checked: boolean) {
    const previous = emailMarketing;
    setEmailMarketing(checked);
    const result = await updateEmailMarketingOptIn(checked);
    if (!result.ok) {
      setEmailMarketing(previous);
      toast.add({ type: "error", title: "Could not save email preference." });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timezone</CardTitle>
          <CardDescription>
            Used for match day grouping and kickoff times when set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone-search">Search timezones</Label>
            <Input
              id="timezone-search"
              value={timezoneQuery}
              onChange={(event) => setTimezoneQuery(event.target.value)}
              placeholder="e.g. Europe/Belgrade"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-md border p-2">
            {timezoneOptions.map((zone) => (
              <button
                key={zone}
                type="button"
                className={cn(
                  "hover:bg-muted w-full rounded px-2 py-1.5 text-left text-sm",
                  zone === timezone && "bg-muted font-medium"
                )}
                onClick={() => setTimezone(zone)}
              >
                {zone}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Selected: <span className="font-mono">{timezone}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={savingTimezone}
              onClick={() => void saveTimezone(timezone)}
            >
              {savingTimezone ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : null}
              Save timezone
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={savingTimezone}
              onClick={() => {
                const device = sanitizeTimezone(
                  Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"
                );
                setTimezone(device);
                void saveTimezone(device);
              }}
            >
              Use my device timezone
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferred league</CardTitle>
          <CardDescription>
            Defaults your Fixtures and Live tabs and boosts that league on your
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={preferredLeagueId || "none"}
            onValueChange={(value) =>
              setPreferredLeagueId(value === "none" ? "" : (value ?? ""))
            }
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Choose a league" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id}>
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            disabled={savingLeague}
            onClick={() => void savePreferredLeague()}
          >
            {savingLeague ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : null}
            Save league
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>
            In-app alerts for matches you follow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPreferenceSwitches
            initial={{
              notifyGoal: preferences.notifyGoal,
              notifyFullTime: preferences.notifyFullTime,
              notifyLineupConfirmed: preferences.notifyLineupConfirmed,
              notifyPredictionShift: preferences.notifyPredictionShift,
              notifyAiInsightRefreshed: preferences.notifyAiInsightRefreshed,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sound</CardTitle>
          <CardDescription>
            Off by default. Requires interaction in this tab before audio can
            play.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SoundPreferenceSwitches />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email</CardTitle>
          <CardDescription>
            Product updates and marketing (optional).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="pref-email-marketing">Marketing emails</Label>
            <Switch
              id="pref-email-marketing"
              checked={emailMarketing}
              onCheckedChange={(checked) =>
                void onEmailMarketingChange(checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Language</CardTitle>
          <CardDescription>English only in MVP.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value="en" disabled>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        <Link
          href="/profile"
          className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}
        >
          Back to profile
        </Link>
      </p>
    </div>
  );
}
