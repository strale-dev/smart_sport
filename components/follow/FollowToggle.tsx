"use client";

import { UserPlusIcon, UserCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { showFollowActionErrorToast } from "@/components/follow/follow-action-toast";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/lib/follow/actions";
import { loginHref } from "@/lib/auth/return-to";
import type { Database } from "@/types/supabase";

type FollowObjectType = Database["public"]["Enums"]["follow_object"];

type FollowToggleProps = {
  objectType: FollowObjectType;
  providerId: number;
  initialFollowing: boolean;
  isAuthenticated: boolean;
  returnTo: string;
  size?: "sm" | "default";
  className?: string;
};

export function FollowToggle({
  objectType,
  providerId,
  initialFollowing,
  isAuthenticated,
  returnTo,
  size = "sm",
  className,
}: FollowToggleProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isAuthenticated) {
      router.push(loginHref(returnTo));
      return;
    }

    if (isPending) {
      return;
    }

    const previous = following;
    const next = !following;
    setFollowing(next);

    startTransition(async () => {
      try {
        const result = await toggleFollow({ objectType, providerId });

        if (!result.ok) {
          setFollowing(previous);
          showFollowActionErrorToast(result.code, result.message);
          return;
        }

        setFollowing(result.following);
      } catch {
        setFollowing(previous);
        showFollowActionErrorToast("UNKNOWN");
      }
    });
  }

  const label = following ? "Following" : "Follow";

  return (
    <Button
      type="button"
      variant={following ? "secondary" : "outline"}
      size={size}
      className={className}
      disabled={isPending}
      aria-pressed={following}
      onClick={handleClick}
    >
      {following ? (
        <UserCheckIcon aria-hidden="true" className="size-4" />
      ) : (
        <UserPlusIcon aria-hidden="true" className="size-4" />
      )}
      {isPending ? "Saving…" : label}
    </Button>
  );
}
