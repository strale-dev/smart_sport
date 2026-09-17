"use client";

import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { deleteAccount } from "@/lib/profile/delete-account.actions";
import { createClient } from "@/lib/supabase/client";
import { resetAuthAnalytics } from "@/lib/posthog/auth";
import { cn } from "@/lib/utils";

type DeleteAccountDialogProps = {
  hasActiveSubscription: boolean;
};

export function DeleteAccountDialog({
  hasActiveSubscription,
}: DeleteAccountDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText === "DELETE";

  async function handleDelete() {
    if (!canDelete) {
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (!result.ok) {
        toast.add({
          type: "error",
          title: "Could not delete account",
          description: "Try again or contact support.",
        });
        return;
      }

      await resetAuthAnalytics();
      const supabase = createClient();
      await supabase.auth.signOut();
      setOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Delete account
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently removes your profile, follows, favorites, and
            preferences. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {hasActiveSubscription ? (
          <p className="text-warning text-sm">
            You have an active subscription. Cancel billing in{" "}
            <Link
              href="/profile/subscription"
              className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}
            >
              Subscription settings
            </Link>{" "}
            to avoid future charges. You can still delete your account now.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="delete-confirm">
            Type <span className="font-mono">DELETE</span> to confirm
          </Label>
          <Input
            id="delete-confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canDelete || deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : null}
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
