"use client";

import { useState } from "react";

import { CookieConsentBanner } from "@/components/marketing/CookieConsentBanner";
import { CookieConsentDialog } from "@/components/marketing/CookieConsentDialog";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export function CookieConsentShell() {
  const { consent, isReady } = useCookieConsent();
  const [manageOpen, setManageOpen] = useState(false);

  if (!isReady) {
    return null;
  }

  if (consent) {
    return null;
  }

  return (
    <>
      <CookieConsentBanner onManage={() => setManageOpen(true)} />
      <CookieConsentDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        trigger={null}
      />
    </>
  );
}

export function CookiePreferencesTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <CookieConsentDialog open={open} onOpenChange={setOpen} trigger={null} />
    </>
  );
}
