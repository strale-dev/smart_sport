import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env.server";
import type { Database } from "@/types/supabase";

export function createAdminClient() {
  const env = getServerEnv();

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
