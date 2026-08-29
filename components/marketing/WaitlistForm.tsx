"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { hasAnalyticsConsent } from "@/lib/cookies/consent";
import { getWaitlistAttribution } from "@/lib/marketing/utm";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import { waitlistSubscribeSchema } from "@/lib/waitlist/schema";

const waitlistFormSchema = waitlistSubscribeSchema.pick({ email: true });
type WaitlistFormValues = z.infer<typeof waitlistFormSchema>;

type WaitlistFormProps = {
  source: string;
  className?: string;
  compact?: boolean;
};

type SubmitState = "idle" | "submitting" | "success";

export function WaitlistForm({
  source,
  className,
  compact,
}: WaitlistFormProps) {
  const { consent } = useCookieConsent();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistFormSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: WaitlistFormValues) {
    if (hasAnalyticsConsent(consent)) {
      void captureClientEvent(POSTHOG_EVENTS.waitlistCtaClick, { source });
    }

    setSubmitState("submitting");

    try {
      const response = await fetch("/api/waitlist/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          source,
          ...getWaitlistAttribution(),
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        status?: "subscribed" | "already_subscribed";
        message?: string;
        emailSent?: boolean;
        error?: string;
        details?: Array<{ message: string }>;
      };

      if (!response.ok) {
        const message =
          payload.error === "RATE_LIMITED"
            ? "Too many attempts. Please try again later."
            : payload.error === "VALIDATION_ERROR"
              ? (payload.details?.[0]?.message ?? "Invalid email address.")
              : "Something went wrong. Please try again.";

        toast.add({ type: "error", title: message });
        setSubmitState("idle");
        return;
      }

      setSuccessMessage(payload.message ?? "You're on the list!");
      setSubmitState("success");
      form.reset();

      if (payload.emailSent === false && payload.status === "subscribed") {
        toast.add({
          type: "warning",
          title: payload.message ?? "You're on the list!",
          description:
            "Confirmation email could not be delivered. With Resend's test sender (onboarding@resend.dev), only your Resend account email receives mail until a domain is verified.",
        });
      } else {
        toast.add({
          type: "success",
          title: payload.message ?? "You're on the list!",
        });
      }
    } catch {
      toast.add({
        type: "error",
        title: "Network error. Please try again.",
      });
      setSubmitState("idle");
    }
  }

  if (submitState === "success") {
    return (
      <p
        className="text-success text-sm font-medium"
        role="status"
        aria-live="polite"
      >
        {successMessage}
      </p>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={className}
        noValidate
      >
        <div
          className={
            compact
              ? "flex flex-col gap-2 sm:flex-row"
              : "flex flex-col gap-3 sm:flex-row sm:items-start"
          }
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-label="Email address"
                    disabled={submitState === "submitting"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={submitState === "submitting"}
            className="shrink-0"
          >
            {submitState === "submitting" ? (
              <>
                <Loader2Icon className="animate-spin" aria-hidden="true" />
                Joining…
              </>
            ) : (
              "Join waitlist"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
