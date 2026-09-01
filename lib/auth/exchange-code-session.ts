import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type ExchangeCodeResult =
  | { ok: true; userId: string; createdAt: string | undefined }
  | { ok: false; error: string };

export async function exchangeCodeForSession(
  code: string
): Promise<ExchangeCodeResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return {
      ok: false,
      error: error?.message ?? "Unable to establish session",
    };
  }

  return {
    ok: true,
    userId: data.user.id,
    createdAt: data.user.created_at,
  };
}
