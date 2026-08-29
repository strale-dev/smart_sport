"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCookieConsent } from "@/hooks/useCookieConsent";

type CookieConsentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
};

export function CookieConsentDialog({
  open,
  onOpenChange,
  trigger,
}: CookieConsentDialogProps) {
  const { consent, savePreferences } = useCookieConsent();
  const [analytics, setAnalytics] = useState(false);
  const idPrefix = useId();
  const analyticsId = `${idPrefix}-analytics`;
  const marketingId = `${idPrefix}-marketing`;
  const necessaryId = `${idPrefix}-necessary`;

  function handleOpenChange(next: boolean) {
    if (next) {
      setAnalytics(consent?.analytics ?? false);
    }
    onOpenChange(next);
  }

  function handleSave() {
    savePreferences(analytics);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cookie preferences</DialogTitle>
          <DialogDescription>
            Choose which cookies Kivora may use. Necessary cookies are always
            active.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor={necessaryId}>Necessary</Label>
              <p className="text-muted-foreground text-xs">
                Required for security and session management.
              </p>
            </div>
            <Switch id={necessaryId} checked disabled aria-readonly />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor={analyticsId}>Analytics</Label>
              <p className="text-muted-foreground text-xs">
                PostHog (EU) — helps us improve the product.
              </p>
            </div>
            <Switch
              id={analyticsId}
              checked={analytics}
              onCheckedChange={setAnalytics}
            />
          </div>

          <div className="flex items-center justify-between gap-4 opacity-60">
            <div className="space-y-1">
              <Label htmlFor={marketingId}>Marketing</Label>
              <p className="text-muted-foreground text-xs">Not used in MVP.</p>
            </div>
            <Switch id={marketingId} checked={false} disabled aria-readonly />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave}>
            Save preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
