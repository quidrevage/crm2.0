import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Client with the secret key: bypasses row-level security.
 * Used only to send and withdraw account invitations, after the caller has been
 * verified as an administrator. Never import this from client code.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Missing environment variable SUPABASE_SECRET_KEY. See .env.example.");
  return createClient(SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
