import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type ExchangeCodeResult =
  | {
      ok: true;
      userId: string;
      createdAt: string | undefined;
      email: string | undefined;
      emailConfirmedAt: string | null | undefined;
      displayName: string | null | undefined;
    }
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

  const meta = data.user.user_metadata as Record<string, unknown> | undefined;
  const displayName =
    typeof meta?.name === "string"
      ? meta.name
      : typeof meta?.full_name === "string"
        ? meta.full_name
        : null;

  return {
    ok: true,
    userId: data.user.id,
    createdAt: data.user.created_at,
    email: data.user.email,
    emailConfirmedAt: data.user.email_confirmed_at,
    displayName,
  };
}
