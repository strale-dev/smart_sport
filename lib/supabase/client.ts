import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env.client";
import type { Database } from "@/types/supabase";

export const createClient = () =>
  createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
