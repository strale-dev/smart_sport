"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { displayNameSchema } from "@/lib/profile/schema";
import { updateDisplayName } from "@/lib/profile/profile.actions";

const profileFormSchema = z.object({
  displayName: displayNameSchema,
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type ProfileIdentityFormProps = {
  email: string;
  displayName: string;
};

export function ProfileIdentityForm({
  email,
  displayName,
}: ProfileIdentityFormProps) {
  const router = useRouter();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { displayName },
  });

  async function onSubmit(values: ProfileFormValues) {
    const result = await updateDisplayName(values.displayName);
    if (!result.ok) {
      toast.add({ type: "error", title: "Could not update display name." });
      return;
    }

    toast.add({ type: "success", title: "Profile updated" });
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="nickname" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input value={email} disabled readOnly />
          </FormControl>
        </FormItem>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : null}
          Save changes
        </Button>
      </form>
    </Form>
  );
}
