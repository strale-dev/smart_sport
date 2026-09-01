import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type AuthUserView = {
  id: string;
  email: string | undefined;
  displayName: string;
};

export function toAuthUserView(user: User): AuthUserView {
  const email = user.email ?? undefined;
  const metadataName = user.user_metadata?.name;
  const name = typeof metadataName === "string" ? metadataName.trim() : "";

  return {
    id: user.id,
    email,
    displayName: name || email?.split("@")[0] || "Account",
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
