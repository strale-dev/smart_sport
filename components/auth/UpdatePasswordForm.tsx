"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/AuthCard";
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
import { mapAuthError } from "@/lib/auth/errors";
import {
  updatePasswordSchema,
  type UpdatePasswordValues,
} from "@/lib/auth/schema";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);

  const form = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setSessionMissing(true);
        setFormError(
          "This reset link is invalid or has expired. Request a new one."
        );
      }

      setSessionReady(true);
    });
  }, []);

  async function onSubmit(values: UpdatePasswordValues) {
    setFormError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setFormError(mapAuthError(error));
      return;
    }

    toast.add({
      type: "success",
      title: "Password updated",
      description: "Your password has been updated successfully.",
    });
    router.push("/dashboard");
    router.refresh();
  }

  if (!sessionReady) {
    return (
      <AuthCard
        title="Set a new password"
        description="Checking your reset link…"
      >
        <div className="text-muted-foreground flex justify-center py-6">
          <Loader2Icon className="size-6 animate-spin" aria-hidden="true" />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a password with at least 8 characters."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                    disabled={form.formState.isSubmitting}
                  />
                </FormControl>
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
            disabled={form.formState.isSubmitting || sessionMissing}
            className="w-full"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2Icon className="animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </Form>
      {sessionMissing ? (
        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link
            href="/reset-password"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Request a new reset link
          </Link>
        </p>
      ) : null}
    </AuthCard>
  );
}
