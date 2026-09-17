"use client";

import { useSoundPreference } from "@/hooks/useSoundPreference";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SoundPreferenceSwitches() {
  const {
    soundGoalEnabled,
    soundFullTimeEnabled,
    setSoundGoalEnabled,
    setSoundFullTimeEnabled,
    unlockAudio,
  } = useSoundPreference();

  const onToggle = async (
    setter: (value: boolean) => void,
    checked: boolean
  ) => {
    if (checked) {
      await unlockAudio();
    }
    setter(checked);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label htmlFor="pref-sound-goal">Goal sound</Label>
          <p className="text-muted-foreground text-xs">
            Plays on this tab when a followed team scores.
          </p>
        </div>
        <Switch
          id="pref-sound-goal"
          checked={soundGoalEnabled}
          onCheckedChange={(checked) =>
            void onToggle(setSoundGoalEnabled, checked)
          }
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label htmlFor="pref-sound-ft">Full-time whistle</Label>
          <p className="text-muted-foreground text-xs">
            Plays when a followed match finishes.
          </p>
        </div>
        <Switch
          id="pref-sound-ft"
          checked={soundFullTimeEnabled}
          onCheckedChange={(checked) =>
            void onToggle(setSoundFullTimeEnabled, checked)
          }
        />
      </div>
    </div>
  );
}
