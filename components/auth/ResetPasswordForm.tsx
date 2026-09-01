"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InboxIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/AuthCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { passwordRecoveryCallbackUrl } from "@/lib/auth/callback-url";
import { mapAuthError } from "@/lib/auth/errors";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/lib/auth/schema";
import { createClient } from "@/lib/supabase/client";

type ResetView = "form" | "sent";

export function ResetPasswordForm() {
  const [view, setView] = useState<ResetView>("form");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: passwordRecoveryCallbackUrl(),
    });

    if (error) {
      setFormError(mapAuthError(error));
      return;
    }

    setSubmittedEmail(values.email);
    setView("sent");
    toast.add({
      type: "success",
      title: "Reset email sent",
      description: "Check your inbox for a link to set a new password.",
    });
  }

  if (view === "sent") {
    return (
      <AuthCard title="Check your email">
        <EmptyState
          icon={InboxIcon}
          title="Reset link sent"
          description={`If an account exists for ${submittedEmail}, you will receive a password reset link shortly.`}
        />
        <p className="text-muted-foreground text-center text-sm">
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Back to log in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset password"
      description="Enter your email and we will send a reset link."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    disabled={form.formState.isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {formError ? (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2Icon className="animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </Form>
      <p className="text-muted-foreground mt-4 text-center text-sm">
        <Link
          href="/login"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
