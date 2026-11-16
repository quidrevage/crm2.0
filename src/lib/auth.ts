import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { FinanceAccess, Role } from "@/types/domain";
import { nameFromEmail } from "./format";
import { createClient } from "./supabase/server";

export { nameFromEmail };

export type WorkspaceRef = { id: string; name: string; role: Role };

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  /** Name to show in the interface: the full name, or a readable fallback until one is entered. */
  displayName: string;
  /** Role in the current workspace. */
  role: Role;
  isAdvocate: boolean;
  workspace: { id: string; name: string; memberFinanceAccess: FinanceAccess; maxUploadMb: number; maxUsers: number };
  /** Every workspace this person is an active member of (for the switcher). */
  workspaces: WorkspaceRef[];
};

/**
 * The signed-in user and their current workspace for this request, or null when there is no
 * session or no active membership anywhere. Cached per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, is_advocate, current_workspace_id").eq("id", auth.user.id).maybeSingle(),
    supabase
      .from("workspace_members")
      .select("role, workspace:workspaces (id, name, member_finance_access, max_upload_mb, max_users)")
      .eq("user_id", auth.user.id)
      .eq("is_active", true),
  ]);
  if (!profile) return null;

  const active = (memberships ?? []).filter((m) => m.workspace);
  if (!active.length) return null;

  let current = active.find((m) => m.workspace!.id === profile.current_workspace_id);
  if (!current) {
    // The selected workspace is gone or access was removed: fall back to another one.
    current = [...active].sort((a, b) => a.workspace!.name.localeCompare(b.workspace!.name, "uk"))[0];
    const { error } = await supabase.from("profiles").update({ current_workspace_id: current.workspace!.id }).eq("id", profile.id);
    if (error) return null;
  }
  const ws = current.workspace!;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    displayName: profile.full_name || nameFromEmail(profile.email),
    role: current.role,
    isAdvocate: profile.is_advocate,
    workspace: {
      id: ws.id,
      name: ws.name,
      memberFinanceAccess: ws.member_finance_access,
      maxUploadMb: ws.max_upload_mb,
      maxUsers: ws.max_users,
    },
    workspaces: active
      .map((m) => ({ id: m.workspace!.id, name: m.workspace!.name, role: m.role }))
      .sort((a, b) => a.name.localeCompare(b.name, "uk")),
  };
});

/** For protected pages and actions: returns the user or sends the visitor to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  // A session without an active membership (access removed) is cleared on the way out.
  if (!user) redirect("/auth/signout");
  return user;
}
