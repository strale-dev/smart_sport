"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { updateNotificationPreferences } from "@/lib/profile/preferences.actions";
import type { UserPreferencesRow } from "@/lib/services/userService";
import { useCallback, useState } from "react";

type NotificationPreferenceSwitchesProps = {
  initial: Pick<
    UserPreferencesRow,
    | "notifyGoal"
    | "notifyFullTime"
    | "notifyLineupConfirmed"
    | "notifyPredictionShift"
    | "notifyAiInsightRefreshed"
  >;
};

type NotificationKey =
  | "notifyGoal"
  | "notifyFullTime"
  | "notifyLineupConfirmed"
  | "notifyPredictionShift"
  | "notifyAiInsightRefreshed";

const ITEMS: Array<{
  key: NotificationKey;
  id: string;
  label: string;
  description: string;
  patchKey:
    | "notifyGoal"
    | "notifyFullTime"
    | "notifyLineupConfirmed"
    | "notifyPredictionShift"
    | "notifyAiInsightRefreshed";
}> = [
  {
    key: "notifyGoal",
    id: "pref-notify-goal",
    label: "Goals for followed teams",
    description: "When a team you follow scores.",
    patchKey: "notifyGoal",
  },
  {
    key: "notifyFullTime",
    id: "pref-notify-ft",
    label: "Full-time results",
    description: "Final score for followed teams.",
    patchKey: "notifyFullTime",
  },
  {
    key: "notifyLineupConfirmed",
    id: "pref-notify-lineup",
    label: "Confirmed lineups",
    description: "Starting XI about 60 minutes before kickoff.",
    patchKey: "notifyLineupConfirmed",
  },
  {
    key: "notifyPredictionShift",
    id: "pref-notify-prediction",
    label: "Prediction shifts",
    description: "Major confidence changes on watched matches.",
    patchKey: "notifyPredictionShift",
  },
  {
    key: "notifyAiInsightRefreshed",
    id: "pref-notify-ai",
    label: "AI insight refreshed",
    description: "When analysis updates on a match you are viewing.",
    patchKey: "notifyAiInsightRefreshed",
  },
];

export function NotificationPreferenceSwitches({
  initial,
}: NotificationPreferenceSwitchesProps) {
  const [values, setValues] = useState(initial);

  const persist = useCallback(
    async (patchKey: NotificationKey, checked: boolean, previous: boolean) => {
      const result = await updateNotificationPreferences({
        [patchKey]: checked,
      });
      if (!result.ok) {
        setValues((current) => ({ ...current, [patchKey]: previous }));
        toast.add({
          type: "error",
          title: "Could not save notification setting.",
        });
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      {ITEMS.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor={item.id}>{item.label}</Label>
            <p className="text-muted-foreground text-xs">{item.description}</p>
          </div>
          <Switch
            id={item.id}
            checked={values[item.key]}
            onCheckedChange={(checked) => {
              const previous = values[item.key];
              setValues((current) => ({ ...current, [item.key]: checked }));
              void persist(item.patchKey, checked, previous);
            }}
          />
        </div>
      ))}
    </div>
  );
}
