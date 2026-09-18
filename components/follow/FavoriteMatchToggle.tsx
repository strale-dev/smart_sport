"use client";

import { BookmarkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { showFollowActionErrorToast } from "@/components/follow/follow-action-toast";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/lib/follow/actions";
import { loginHref } from "@/lib/auth/return-to";
import { captureClientEvent } from "@/lib/posthog/client";
import { POSTHOG_EVENTS } from "@/lib/posthog/events";

type FavoriteMatchToggleProps = {
  fixtureProviderId: number;
  initialFavorited: boolean;
  isAuthenticated: boolean;
  returnTo: string;
  className?: string;
};

export function FavoriteMatchToggle({
  fixtureProviderId,
  initialFavorited,
  isAuthenticated,
  returnTo,
  className,
}: FavoriteMatchToggleProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isAuthenticated) {
      router.push(loginHref(returnTo));
      return;
    }

    if (isPending) {
      return;
    }

    const previous = favorited;
    const next = !favorited;
    setFavorited(next);

    startTransition(async () => {
      try {
        const result = await toggleFavorite({ fixtureProviderId });

        if (!result.ok) {
          setFavorited(previous);
          showFollowActionErrorToast(result.code, result.message);
          return;
        }

        setFavorited(result.favorited);
        void captureClientEvent(
          result.favorited
            ? POSTHOG_EVENTS.favoriteAdded
            : POSTHOG_EVENTS.favoriteRemoved,
          { fixture_id: fixtureProviderId }
        );
      } catch {
        setFavorited(previous);
        showFollowActionErrorToast("UNKNOWN");
      }
    });
  }

  return (
    <Button
      type="button"
      variant={favorited ? "secondary" : "outline"}
      size="sm"
      className={className}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favorites" : "Favorite match"}
      onClick={handleClick}
    >
      <BookmarkIcon
        aria-hidden="true"
        className={favorited ? "size-4 fill-current" : "size-4"}
      />
      {isPending ? "Saving…" : favorited ? "Favorited" : "Favorite"}
    </Button>
  );
}
