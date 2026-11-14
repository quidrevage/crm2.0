import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@/types/domain";
import { createClient } from "./supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  /** Name to show in the interface: full name, or the e-mail until a name is entered. */
  displayName: string;
  role: Role;
  isAdvocate: boolean;
};

/** The signed-in, active user for this request, or null. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  // Row-level security returns no row for a deactivated account.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_advocate, is_active")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    displayName: profile.full_name || profile.email,
    role: profile.role,
    isAdvocate: profile.is_advocate,
  };
});

/** For protected pages and actions: returns the user or sends the visitor to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  // A session without an active profile (deactivated account) is cleared on the way out.
  if (!user) redirect("/auth/signout");
  return user;
}
