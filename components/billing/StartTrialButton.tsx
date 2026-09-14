"use client";

import { useFormStatus } from "react-dom";

import { createCheckoutSession } from "@/lib/billing/actions";
import { Button } from "@/components/ui/button";

function SubmitLabel() {
  const { pending } = useFormStatus();
  return pending ? "Redirecting…" : "Start 7-day free trial";
}

export function StartTrialButton() {
  return (
    <form action={createCheckoutSession}>
      <Button type="submit" size="lg" className="w-full sm:w-auto">
        <SubmitLabel />
      </Button>
    </form>
  );
}
