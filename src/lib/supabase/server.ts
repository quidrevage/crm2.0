import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Supabase client acting as the signed-in user (session from cookies).
 * Every query through it is subject to row-level security.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot write cookies; the request proxy refreshes the session instead.
        }
      },
    },
  });
}

export type ServerClient = Awaited<ReturnType<typeof createClient>>;
