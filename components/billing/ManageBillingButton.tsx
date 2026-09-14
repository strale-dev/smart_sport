"use client";

import { useFormStatus } from "react-dom";

import { openCustomerPortal } from "@/lib/billing/actions";
import { Button } from "@/components/ui/button";

function SubmitLabel() {
  const { pending } = useFormStatus();
  return pending ? "Opening portal…" : "Manage billing";
}

export function ManageBillingButton() {
  return (
    <form action={openCustomerPortal}>
      <Button type="submit" variant="outline">
        <SubmitLabel />
      </Button>
    </form>
  );
}
