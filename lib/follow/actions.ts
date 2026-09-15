"use server";

import { revalidatePath } from "next/cache";

import {
  EntityNotFoundError,
  FollowLimitReachedError,
  SignInRequiredError,
} from "@/lib/follow/errors";
import {
  favoriteFixture,
  followEntity,
  isFollowingProvider,
  isFixtureFavorited,
  unfavoriteFixture,
  unfollowEntity,
  type FollowObjectType,
} from "@/lib/services/followService";
import { getCurrentUser } from "@/lib/supabase/user";

export type FollowActionErrorCode =
  "FOLLOW_LIMIT_REACHED" | "ENTITY_NOT_FOUND" | "SIGN_IN_REQUIRED" | "UNKNOWN";

export type ToggleFollowResult =
  | { ok: true; following: boolean }
  | {
      ok: false;
      code: FollowActionErrorCode;
      limit?: number;
      message?: string;
    };

export type ToggleFavoriteResult =
  | { ok: true; favorited: boolean }
  | {
      ok: false;
      code: FollowActionErrorCode;
      message?: string;
    };

function mapActionError(error: unknown): {
  code: FollowActionErrorCode;
  limit?: number;
  message?: string;
} {
  if (error instanceof FollowLimitReachedError) {
    return { code: "FOLLOW_LIMIT_REACHED", limit: error.limit };
  }

  if (error instanceof EntityNotFoundError) {
    return { code: "ENTITY_NOT_FOUND", message: error.message };
  }

  if (error instanceof SignInRequiredError) {
    return { code: "SIGN_IN_REQUIRED" };
  }

  if (error instanceof Error) {
    return { code: "UNKNOWN", message: error.message };
  }

  return { code: "UNKNOWN" };
}

function revalidateFollowSurfaces(
  objectType: FollowObjectType,
  providerId: number
) {
  revalidatePath("/dashboard");
  revalidatePath("/favorites");

  if (objectType === "TEAM") {
    revalidatePath(`/teams/${providerId}`);
  } else if (objectType === "PLAYER") {
    revalidatePath(`/players/${providerId}`);
  } else {
    revalidatePath(`/leagues/${providerId}`);
  }
}

export async function toggleFollow(input: {
  objectType: FollowObjectType;
  providerId: number;
}): Promise<ToggleFollowResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  try {
    const currentlyFollowing = await isFollowingProvider(user.id, input);

    if (currentlyFollowing) {
      await unfollowEntity(user.id, input);
      revalidateFollowSurfaces(input.objectType, input.providerId);
      return { ok: true, following: false };
    }

    await followEntity(user.id, input);
    revalidateFollowSurfaces(input.objectType, input.providerId);
    return { ok: true, following: true };
  } catch (error: unknown) {
    const mapped = mapActionError(error);
    return { ok: false, ...mapped };
  }
}

export async function toggleFavorite(input: {
  fixtureProviderId: number;
}): Promise<ToggleFavoriteResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, code: "SIGN_IN_REQUIRED" };
  }

  try {
    const favorited = await isFixtureFavorited(
      user.id,
      input.fixtureProviderId
    );

    if (favorited) {
      await unfavoriteFixture(user.id, input.fixtureProviderId);
      revalidatePath(`/matches/${input.fixtureProviderId}`);
      return { ok: true, favorited: false };
    }

    await favoriteFixture(user.id, input.fixtureProviderId);
    revalidatePath(`/matches/${input.fixtureProviderId}`);
    return { ok: true, favorited: true };
  } catch (error: unknown) {
    const mapped = mapActionError(error);
    return { ok: false, ...mapped };
  }
}
