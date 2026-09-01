"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InboxIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PasswordStrengthHint } from "@/components/auth/PasswordStrengthHint";
import { SignupBenefits } from "@/components/auth/SignupBenefits";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { authCallbackUrl } from "@/lib/auth/callback-url";
import { mapAuthError } from "@/lib/auth/errors";
import { DEFAULT_RETURN_TO } from "@/lib/auth/return-to";
import { signupSchema, type SignupValues } from "@/lib/auth/schema";
import { BRAND } from "@/lib/marketing/copy";
import { captureAuthSuccess } from "@/lib/posthog/auth";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import { createClient } from "@/lib/supabase/client";

type SignupFormProps = {
  returnTo: string;
};

type SignupView = "form" | "check-email";

export function SignupForm({ returnTo }: SignupFormProps) {
  const router = useRouter();
  const { consent } = useCookieConsent();
  const [view, setView] = useState<SignupView>("form");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      marketingOptIn: false,
    },
  });

  const passwordValue = form.watch("password");
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: SignupValues) {
    setFormError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: authCallbackUrl(returnTo),
        data: {
          name: values.displayName,
          display_name: values.displayName,
          email_marketing_optin: values.marketingOptIn === true,
        },
      },
    });

    if (error) {
      setFormError(mapAuthError(error));
      return;
    }

    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setFormError("An account with this email already exists.");
      return;
    }

    if (data.session && data.user) {
      await captureAuthSuccess({
        event: POSTHOG_EVENTS.signupCompleted,
        userId: data.user.id,
        consent,
      });
      router.push(returnTo || DEFAULT_RETURN_TO);
      router.refresh();
      return;
    }

    setSubmittedEmail(values.email);
    setView("check-email");
  }

  async function resendConfirmation() {
    if (!submittedEmail) {
      return;
    }

    setIsResending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: submittedEmail,
      options: { emailRedirectTo: authCallbackUrl(returnTo) },
    });
    setIsResending(false);

    if (error) {
      setFormError(mapAuthError(error));
      return;
    }

    toast.add({
      type: "success",
      title: "Confirmation email sent",
      description: "Check your inbox and spam folder for hello@scorence.app.",
    });
  }

  if (view === "check-email") {
    return (
      <AuthCard title="Check your email">
        <EmptyState
          icon={InboxIcon}
          title="Confirm your address"
          description={`We sent a confirmation link to ${submittedEmail} from hello@scorence.app. Click the link to finish creating your account.`}
          actionLabel={isResending ? "Sending…" : "Resend email"}
          onAction={() => {
            void resendConfirmation();
          }}
        />
        <div className="text-muted-foreground mt-4 space-y-2 text-center text-sm">
          <p>
            Not in your inbox? Check spam or promotions — especially if this is
            your first email from {BRAND.name}.
          </p>
          <p>
            Wrong email?{" "}
            <button
              type="button"
              className="text-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setView("form");
                setFormError(null);
              }}
            >
              Go back
            </button>
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      description="Free to start. Confirm your email, then explore match intelligence."
    >
      <div className="flex flex-col gap-4">
        <SignupBenefits />
        <GoogleButton
          returnTo={returnTo}
          disabled={isSubmitting}
          onError={setFormError}
        />
        <AuthDivider />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="name"
                      placeholder="How we greet you in the app"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Shown in your profile and navigation menu.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      placeholder="you@example.com"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <PasswordStrengthHint password={passwordValue} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="border-border/60 flex flex-row items-start gap-3 space-y-0 rounded-lg border p-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="border-input mt-1 size-4 rounded border"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      disabled={isSubmitting}
                      aria-describedby="signup-terms-description"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      I accept the{" "}
                      <Link
                        href="/terms"
                        className="text-foreground underline-offset-4 hover:underline"
                        target="_blank"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="text-foreground underline-offset-4 hover:underline"
                        target="_blank"
                      >
                        Privacy Policy
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="marketingOptIn"
              render={({ field }) => (
                <FormItem className="border-border/60 flex flex-row items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="space-y-1">
                    <FormLabel className="font-normal">
                      Product updates (optional)
                    </FormLabel>
                    <FormDescription id="signup-terms-description">
                      Occasional email about new features — separate from
                      account emails.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {formError ? (
              <p className="text-destructive text-sm" role="alert">
                {formError}
              </p>
            ) : null}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {form.formState.isSubmitting ? (
                <>
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </Form>
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link
            href={
              returnTo === DEFAULT_RETURN_TO
                ? "/login"
                : `/login?returnTo=${encodeURIComponent(returnTo)}`
            }
            className="text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
