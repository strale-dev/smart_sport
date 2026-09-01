"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { GoogleButton } from "@/components/auth/GoogleButton";
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
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { authCallbackUrl } from "@/lib/auth/callback-url";
import { mapAuthError } from "@/lib/auth/errors";
import { DEFAULT_RETURN_TO } from "@/lib/auth/return-to";
import { loginSchema, type LoginValues } from "@/lib/auth/schema";
import { captureAuthSuccess } from "@/lib/posthog/auth";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  returnTo: string;
  errorCode?: string;
};

export function LoginForm({ returnTo, errorCode }: LoginFormProps) {
  const router = useRouter();
  const { consent } = useCookieConsent();
  const [formError, setFormError] = useState<string | null>(
    errorCode ? mapAuthError({ code: errorCode }) : null
  );
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    setUnconfirmedEmail(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      const mapped = mapAuthError(error);
      setFormError(mapped);
      if (error.code === "email_not_confirmed") {
        setUnconfirmedEmail(values.email);
      }
      return;
    }

    if (data.user) {
      await captureAuthSuccess({
        event: POSTHOG_EVENTS.loginCompleted,
        userId: data.user.id,
        consent,
      });
    }

    router.push(returnTo || DEFAULT_RETURN_TO);
    router.refresh();
  }

  async function resendConfirmation() {
    if (!unconfirmedEmail) {
      return;
    }

    setIsResending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: unconfirmedEmail,
      options: { emailRedirectTo: authCallbackUrl(returnTo) },
    });
    setIsResending(false);

    if (error) {
      setFormError(mapAuthError(error));
      return;
    }

    setFormError(null);
    toast.add({
      type: "success",
      title: "Confirmation email sent",
      description: "Check your inbox and spam folder for hello@scorence.app.",
    });
  }

  return (
    <AuthCard
      title="Log in"
      description="Sign in to follow matches and unlock AI insights."
    >
      <div className="flex flex-col gap-4">
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
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/reset-password"
                      className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      disabled={isSubmitting}
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
            {unconfirmedEmail ? (
              <Button
                type="button"
                variant="outline"
                disabled={isResending}
                onClick={() => {
                  void resendConfirmation();
                }}
              >
                {isResending ? (
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                ) : null}
                Resend confirmation email
              </Button>
            ) : null}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {form.formState.isSubmitting ? (
                <>
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Log in"
              )}
            </Button>
          </form>
        </Form>
        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href={
              returnTo === DEFAULT_RETURN_TO
                ? "/signup"
                : `/signup?returnTo=${encodeURIComponent(returnTo)}`
            }
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
