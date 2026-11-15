"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Browser-side client, used only for file uploads to private storage and for realtime
 * change notifications. It carries the user's own session, so row-level security applies.
 * All reads and writes of records go through the server.
 */
export function getBrowserClient() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}
