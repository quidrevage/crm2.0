import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CaseStatusItem, FinanceAccess, RefItem, Role, Tone, UserRef } from "@/types/domain";

export type Lookups = {
  me: { id: string; role: Role; finance: FinanceAccess };
  users: UserRef[];
  clients: Array<{ id: string; name: string; archived: boolean }>;
  cases: Array<{ id: string; number: string; title: string; clientId: string; archived: boolean }>;
  courts: Array<{ id: string; name: string }>;
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
 * Loaded once per request; a two-person practice keeps these lists small.
 */
export const getLookups = cache(async (): Promise<Lookups> => {
  const user = await requireUser();
  const supabase = await createClient();
  const refCols = "id, name, is_active, sort_order";

  const [users, clients, cases, courts, areas, types, statuses, roles, categories, courtTypes, settings] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, is_active").order("created_at"),
    supabase.from("clients").select("id, name, archived_at").order("name"),
    supabase.from("cases").select("id, case_number, title, client_id, archived_at").order("case_number", { ascending: false }),
    supabase.from("courts").select("id, name").is("archived_at", null).order("name"),
    supabase.from("practice_areas").select(refCols).order("sort_order"),
    supabase.from("matter_types").select(refCols).order("sort_order"),
    supabase.from("case_statuses").select(`${refCols}, is_closed, tone`).order("sort_order"),
    supabase.from("party_roles").select(refCols).order("sort_order"),
    supabase.from("document_categories").select(refCols).order("sort_order"),
    supabase.from("court_types").select(refCols).order("sort_order"),
    supabase.from("app_settings").select("member_finance_access, max_upload_mb, max_users").single(),
  ]);

  const failed = [users, clients, cases, courts, areas, types, statuses, roles, categories, courtTypes, settings].find((r) => r.error);
  if (failed?.error) throw new Error(`Failed to load reference data: ${failed.error.message}`);

  const memberFinanceAccess = settings.data!.member_finance_access;
  return {
    me: { id: user.id, role: user.role, finance: user.role === "admin" ? "write" : memberFinanceAccess },
    users: users.data!.map((u) => ({ id: u.id, fullName: u.full_name || u.email, email: u.email, role: u.role, isActive: u.is_active })),
    clients: clients.data!.map((c) => ({ id: c.id, name: c.name, archived: c.archived_at !== null })),
    cases: cases.data!.map((k) => ({ id: k.id, number: k.case_number, title: k.title, clientId: k.client_id, archived: k.archived_at !== null })),
    courts: courts.data!,
    practiceAreas: areas.data!.map(ref),
    matterTypes: types.data!.map(ref),
    caseStatuses: statuses.data!.map((r) => ({ ...ref(r), isClosed: r.is_closed, tone: r.tone as Tone })),
    partyRoles: roles.data!.map(ref),
    documentCategories: categories.data!.map(ref),
    courtTypes: courtTypes.data!.map(ref),
    settings: {
      memberFinanceAccess,
      maxUploadMb: settings.data!.max_upload_mb,
      maxUsers: settings.data!.max_users,
    },
  };
});
