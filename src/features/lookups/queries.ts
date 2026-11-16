import "server-only";
import { cache } from "react";
import { nameFromEmail, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CaseStatusItem, FinanceAccess, RefItem, Role, Tone, UserRef } from "@/types/domain";

export type Lookups = {
  me: { id: string; role: Role; finance: FinanceAccess };
  workspace: { id: string; name: string };
  users: UserRef[];
  clients: Array<{ id: string; name: string; archived: boolean }>;
  cases: Array<{ id: string; number: string; title: string; clientId: string; archived: boolean }>;
  courts: Array<{ id: string; name: string; city: string }>;
  practiceAreas: RefItem[];
  matterTypes: RefItem[];
  caseStatuses: CaseStatusItem[];
  partyRoles: RefItem[];
  documentCategories: RefItem[];
  courtTypes: RefItem[];
  settings: { memberFinanceAccess: FinanceAccess; maxUploadMb: number; maxUsers: number };
};

const ref = (r: { id: string; name: string; is_active: boolean }): RefItem => ({ id: r.id, name: r.name, isActive: r.is_active });

/**
 * Names and options used across the interface (users, clients, matters, reference lists).
 * Loaded once per request, for the current workspace.
 */
export const getLookups = cache(async (): Promise<Lookups> => {
  const user = await requireUser();
  const supabase = await createClient();
  const refCols = "id, name, is_active, sort_order";

  const [users, clients, cases, courts, areas, types, statuses, roles, categories, courtTypes] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("role, is_active, created_at, profile:profiles (id, full_name, email)")
      .eq("workspace_id", user.workspace.id)
      .order("created_at"),
    supabase.from("clients").select("id, name, archived_at").order("name"),
    supabase.from("cases").select("id, case_number, title, client_id, archived_at").order("case_number", { ascending: false }),
    supabase.from("courts").select("id, name, city").is("archived_at", null).order("name").limit(2000),
    supabase.from("practice_areas").select(refCols).order("sort_order"),
    supabase.from("matter_types").select(refCols).order("sort_order"),
    supabase.from("case_statuses").select(`${refCols}, is_closed, tone`).order("sort_order"),
    supabase.from("party_roles").select(refCols).order("sort_order"),
    supabase.from("document_categories").select(refCols).order("sort_order"),
    supabase.from("court_types").select(refCols).order("sort_order"),
  ]);

  const failed = [users, clients, cases, courts, areas, types, statuses, roles, categories, courtTypes].find((r) => r.error);
  if (failed?.error) throw new Error(`Failed to load reference data: ${failed.error.message}`);

  const memberFinanceAccess = user.workspace.memberFinanceAccess;
  return {
    me: { id: user.id, role: user.role, finance: user.role === "admin" ? "write" : memberFinanceAccess },
    workspace: { id: user.workspace.id, name: user.workspace.name },
    users: users
      .data!.filter((m) => m.profile)
      .map((m) => ({
        id: m.profile!.id,
        fullName: m.profile!.full_name || nameFromEmail(m.profile!.email),
        email: m.profile!.email,
        role: m.role,
        isActive: m.is_active,
      })),
    clients: clients.data!.map((c) => ({ id: c.id, name: c.name, archived: c.archived_at !== null })),
    cases: cases.data!.map((k) => ({ id: k.id, number: k.case_number, title: k.title, clientId: k.client_id, archived: k.archived_at !== null })),
    courts: courts.data!.map((c) => ({ id: c.id, name: c.name, city: c.city ?? "" })),
    practiceAreas: areas.data!.map(ref),
    matterTypes: types.data!.map(ref),
    caseStatuses: statuses.data!.map((r) => ({ ...ref(r), isClosed: r.is_closed, tone: r.tone as Tone })),
    partyRoles: roles.data!.map(ref),
    documentCategories: categories.data!.map(ref),
    courtTypes: courtTypes.data!.map(ref),
    settings: {
      memberFinanceAccess,
      maxUploadMb: user.workspace.maxUploadMb,
      maxUsers: user.workspace.maxUsers,
    },
  };
});
