"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Volume2Icon, VolumeXIcon } from "lucide-react";

import { useSoundPreference } from "@/hooks/useSoundPreference";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SoundToggle() {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const {
    soundGoalEnabled,
    soundFullTimeEnabled,
    setSoundGoalEnabled,
    setSoundFullTimeEnabled,
    unlockAudio,
  } = useSoundPreference();

  const anyEnabled = soundGoalEnabled || soundFullTimeEnabled;

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onToggleChange = async (
    setter: (value: boolean) => void,
    checked: boolean
  ) => {
    if (checked) {
      await unlockAudio();
    }
    setter(checked);
  };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        aria-label={
          anyEnabled
            ? "Match sound settings (on)"
            : "Match sound settings (off)"
        }
        onClick={() => setOpen((value) => !value)}
      >
        {anyEnabled ? (
          <Volume2Icon className="size-4" aria-hidden />
        ) : (
          <VolumeXIcon className="size-4" aria-hidden />
        )}
      </Button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Match sound settings"
          className="bg-popover text-popover-foreground ring-foreground/10 absolute top-full right-0 z-50 mt-1.5 w-56 rounded-md p-3 shadow-md ring-1"
        >
          <p className="text-muted-foreground mb-3 text-xs leading-snug">
            Plays on this tab when a goal or full-time occurs.
          </p>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="sound-goal" className="text-sm font-normal">
              Goal sound
            </Label>
            <Switch
              id="sound-goal"
              checked={soundGoalEnabled}
              onCheckedChange={(checked) =>
                void onToggleChange(setSoundGoalEnabled, checked)
              }
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Label htmlFor="sound-full-time" className="text-sm font-normal">
              Full-time whistle
            </Label>
            <Switch
              id="sound-full-time"
              checked={soundFullTimeEnabled}
              onCheckedChange={(checked) =>
                void onToggleChange(setSoundFullTimeEnabled, checked)
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
