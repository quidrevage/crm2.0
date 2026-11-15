import "server-only";
import { notFound } from "next/navigation";
import type { Tables } from "@/types/database";
import { dayKey, kyivIso, shiftKey } from "../dates";
import { createClient, type ServerClient } from "../supabase/server";
import {
  toActivity, toCase, toClient, toContact, toCourt, toDocument, toEvent, toExpense, toFee, toNote, toParty, toPayment,
  toTask, toVersion,
} from "./mappers";

/**
 * Read queries for every screen. They run as the signed-in user, so row-level security decides
 * what comes back (for example, a member without finance access simply gets no payments).
 */

export const PAGE_SIZE = 25;

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(params: SearchParams, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function pageOf(params: SearchParams) {
  const page = Math.max(1, Math.min(10_000, Number.parseInt(param(params, "page"), 10) || 1));
  return { page, from: (page - 1) * PAGE_SIZE, to: page * PAGE_SIZE - 1 };
}

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

/** Builds a safe PostgREST `or` filter matching any of the columns against the search text. */
function anyColumnLike(columns: string[], q: string) {
  const text = q.replace(/[%_\\,()*:"]/g, " ").trim().slice(0, 100);
  if (!text) return null;
  return columns.map((c) => `${c}.ilike."%${text}%"`).join(",");
}

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

const DOCUMENT_COLUMNS = "*, current:document_versions!documents_current_version_fk(*)";
type DocumentRow = Tables<"documents"> & { current: Tables<"document_versions"> | null };
const EVENT_COLUMNS = "*, event_reminders(remind_at, dismissed_at)";

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function listClients(params: SearchParams) {
  const supabase = await createClient();
  const { from, to, page } = pageOf(params);
  let query = supabase.from("clients").select("*", { count: "exact" });
  query = param(params, "archived") === "1" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const type = param(params, "type");
  if (type === "individual" || type === "legal_entity") query = query.eq("client_type", type);
  const status = param(params, "status");
  if (["potential", "active", "inactive", "archived"].includes(status)) query = query.eq("status", status as Tables<"clients">["status"]);
  const assigned = param(params, "assigned");
  if (isUuid(assigned)) query = query.eq("assigned_to", assigned);
  const search = anyColumnLike(["name", "client_number", "edrpou", "rnokpp", "phone", "email"], param(params, "q"));
  if (search) query = query.or(search);
  const result = await query.order("name").range(from, to);
  return { rows: check(result).map(toClient), total: result.count ?? 0, page };
}

export async function getClientPage(id: string) {
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const client = check(await supabase.from("clients").select("*").eq("id", id).maybeSingle());
  if (!client) notFound();

  const [contacts, cases, documents, tasks, events, notes, activity, finance] = await Promise.all([
    supabase.from("client_contacts").select("*").eq("client_id", id).order("full_name"),
    supabase.from("cases").select("*").eq("client_id", id).order("opened_on", { ascending: false }),
    supabase.from("documents").select(DOCUMENT_COLUMNS).eq("client_id", id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("client_id", id).is("archived_at", null).order("due_date", { nullsFirst: false }),
    supabase.from("events").select(EVENT_COLUMNS).eq("client_id", id).is("archived_at", null).gte("starts_at", kyivIso(shiftKey(dayKey(), -30), "00:00")).order("starts_at"),
    supabase.from("notes").select("*").eq("client_id", id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("activity_logs").select("*").eq("client_id", id).order("occurred_at", { ascending: false }).limit(50),
    financeFor(supabase, { clientId: id }),
  ]);

  return {
    client: toClient(client),
    contacts: check(contacts).map(toContact),
    cases: check(cases).map(toCase),
    documents: (check(documents) as DocumentRow[]).map(toDocument),
    tasks: check(tasks).map(toTask),
    events: check(events).map(toEvent),
    notes: check(notes).map(toNote),
    activity: check(activity).map(toActivity),
    finance,
  };
}

// ---------------------------------------------------------------------------
// Matters
// ---------------------------------------------------------------------------

export async function listCases(params: SearchParams) {
  const supabase = await createClient();
  const { from, to, page } = pageOf(params);
  let query = supabase.from("cases").select("*", { count: "exact" });
  query = param(params, "archived") === "1" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  for (const [key, column] of [["status", "status_id"], ["area", "practice_area_id"], ["responsible", "responsible_id"], ["client", "client_id"], ["court", "court_id"]] as const) {
    const value = param(params, key);
    if (isUuid(value)) query = query.eq(column, value);
  }
  const q = param(params, "q");
  if (q) {
    // Also match matters whose client's name contains the text.
    const clientSearch = anyColumnLike(["name"], q);
    const { data: clients } = clientSearch ? await supabase.from("clients").select("id").or(clientSearch).limit(50) : { data: [] };
    const conditions = [anyColumnLike(["title", "case_number", "court_case_number", "opposing_party", "judge"], q)];
    if (clients?.length) conditions.push(`client_id.in.(${clients.map((c) => c.id).join(",")})`);
    const filter = conditions.filter(Boolean).join(",");
    if (filter) query = query.or(filter);
  }
  const result = await query.order("updated_at", { ascending: false }).range(from, to);
  return { rows: check(result).map(toCase), total: result.count ?? 0, page };
}

export async function getCasePage(id: string) {
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const legalCase = check(await supabase.from("cases").select("*").eq("id", id).maybeSingle());
  if (!legalCase) notFound();

  const [parties, documents, tasks, events, notes, activity, finance] = await Promise.all([
    supabase.from("case_parties").select("*").eq("case_id", id).order("created_at"),
    supabase.from("documents").select(DOCUMENT_COLUMNS).eq("case_id", id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("case_id", id).is("archived_at", null).order("due_date", { nullsFirst: false }),
    supabase.from("events").select(EVENT_COLUMNS).eq("case_id", id).is("archived_at", null).order("starts_at"),
    supabase.from("notes").select("*").eq("case_id", id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("activity_logs").select("*").eq("case_id", id).order("occurred_at", { ascending: false }).limit(50),
    financeFor(supabase, { caseId: id }),
  ]);

  return {
    legalCase: toCase(legalCase),
    parties: check(parties).map(toParty),
    documents: (check(documents) as DocumentRow[]).map(toDocument),
    tasks: check(tasks).map(toTask),
    events: check(events).map(toEvent),
    notes: check(notes).map(toNote),
    activity: check(activity).map(toActivity),
    finance,
  };
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

async function financeFor(supabase: ServerClient, filter: { clientId?: string; caseId?: string }) {
  let fees = supabase.from("fee_agreements").select("*").is("archived_at", null);
  let payments = supabase.from("payments").select("*").is("archived_at", null);
  let expenses = supabase.from("expenses").select("*").is("archived_at", null);
  if (filter.clientId) {
    fees = fees.eq("client_id", filter.clientId);
    payments = payments.eq("client_id", filter.clientId);
    expenses = expenses.eq("client_id", filter.clientId);
  }
  if (filter.caseId) {
    fees = fees.eq("case_id", filter.caseId);
    payments = payments.eq("case_id", filter.caseId);
    expenses = expenses.eq("case_id", filter.caseId);
  }
  const [f, p, x] = await Promise.all([
    fees.order("agreed_on", { ascending: false }),
    payments.order("paid_on", { ascending: false }),
    expenses.order("incurred_on", { ascending: false }),
  ]);
  return { fees: check(f).map(toFee), payments: check(p).map(toPayment), expenses: check(x).map(toExpense) };
}

export async function listFinance(params: SearchParams) {
  const supabase = await createClient();
  const client = param(params, "client");
  return financeFor(supabase, { clientId: isUuid(client) ? client : undefined });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function listDocuments(params: SearchParams) {
  const supabase = await createClient();
  const { from, to, page } = pageOf(params);
  let query = supabase.from("documents").select(DOCUMENT_COLUMNS, { count: "exact" });
  query = param(params, "archived") === "1" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  for (const [key, column] of [["category", "category_id"], ["client", "client_id"], ["case", "case_id"]] as const) {
    const value = param(params, key);
    if (isUuid(value)) query = query.eq(column, value);
  }
  const search = anyColumnLike(["name", "description"], param(params, "q"));
  if (search) query = query.or(search);
  const result = await query.order("updated_at", { ascending: false }).range(from, to);
  return { rows: (check(result) as DocumentRow[]).map(toDocument), total: result.count ?? 0, page };
}

export async function getDocumentPage(id: string) {
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const doc = check(await supabase.from("documents").select(DOCUMENT_COLUMNS).eq("id", id).maybeSingle()) as DocumentRow | null;
  if (!doc) notFound();
  const [versions, activity] = await Promise.all([
    supabase.from("document_versions").select("*").eq("document_id", id).order("version_no", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("*")
      .or(`and(entity_type.eq.documents,entity_id.eq.${id}),and(entity_type.eq.document_versions,metadata->>document_id.eq.${id})`)
      .order("occurred_at", { ascending: false })
      .limit(30),
  ]);
  return { document: toDocument(doc), versions: check(versions).map(toVersion), activity: check(activity).map(toActivity) };
}

// ---------------------------------------------------------------------------
// Tasks, events, notes, courts
// ---------------------------------------------------------------------------

export const OPEN_TASK_STATUSES = ["new", "in_progress", "waiting"] as const;

export async function listTasks(params: SearchParams) {
  const supabase = await createClient();
  const { from, to, page } = pageOf(params);
  let query = supabase.from("tasks").select("*", { count: "exact" }).is("archived_at", null);
  const status = param(params, "status");
  if (status === "" || status === "open") query = query.in("status", [...OPEN_TASK_STATUSES]);
  else if (["new", "in_progress", "waiting", "completed", "cancelled"].includes(status)) query = query.eq("status", status as Tables<"tasks">["status"]);
  for (const [key, column] of [["assignee", "assigned_to"], ["case", "case_id"], ["client", "client_id"]] as const) {
    const value = param(params, key);
    if (isUuid(value)) query = query.eq(column, value);
  }
  const priority = param(params, "priority");
  if (["low", "normal", "high", "urgent"].includes(priority)) query = query.eq("priority", priority as Tables<"tasks">["priority"]);
  if (param(params, "due") === "overdue") query = query.lt("due_date", dayKey());
  if (param(params, "due") === "today") query = query.eq("due_date", dayKey());
  const search = anyColumnLike(["title", "description"], param(params, "q"));
  if (search) query = query.or(search);
  const result = await query.order("due_date", { nullsFirst: false }).order("created_at", { ascending: false }).range(from, to);
  return { rows: check(result).map(toTask), total: result.count ?? 0, page };
}

/** Events whose start falls in [fromDay, toDay] (Kyiv calendar days). */
export async function listEvents(fromDay: string, toDay: string, params: SearchParams = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .is("archived_at", null)
    .gte("starts_at", kyivIso(fromDay, "00:00"))
    .lt("starts_at", kyivIso(shiftKey(toDay, 1), "00:00"));
  const responsible = param(params, "responsible");
  if (isUuid(responsible)) query = query.eq("responsible_id", responsible);
  const type = param(params, "type");
  if (["hearing", "client_meeting", "call", "internal", "deadline", "other"].includes(type)) query = query.eq("event_type", type as Tables<"events">["event_type"]);
  return check(await query.order("starts_at")).map(toEvent);
}

export async function listNotes(params: SearchParams) {
  const supabase = await createClient();
  const { from, to, page } = pageOf(params);
  let query = supabase.from("notes").select("*", { count: "exact" });
  query = param(params, "archived") === "1" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const author = param(params, "author");
  if (isUuid(author)) query = query.eq("author_id", author);
  const search = anyColumnLike(["title", "content"], param(params, "q"));
  if (search) query = query.or(search);
  const result = await query.order("updated_at", { ascending: false }).range(from, to);
  return { rows: check(result).map(toNote), total: result.count ?? 0, page };
}

export async function listCourts(params: SearchParams) {
  const supabase = await createClient();
  let query = supabase.from("courts").select("*");
  query = param(params, "archived") === "1" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const type = param(params, "type");
  if (isUuid(type)) query = query.eq("court_type_id", type);
  const search = anyColumnLike(["name", "city", "region"], param(params, "q"));
  if (search) query = query.or(search);
  const courts = check(await query.order("name")).map(toCourt);
  // How many active matters each court has, for the directory.
  const { data: usage } = await supabase.from("cases").select("court_id").is("archived_at", null).not("court_id", "is", null);
  const counts = new Map<string, number>();
  for (const row of usage ?? []) if (row.court_id) counts.set(row.court_id, (counts.get(row.court_id) ?? 0) + 1);
  return courts.map((c) => ({ ...c, caseCount: counts.get(c.id) ?? 0 }));
}

/** Task titles for linking a note to a task. */
export async function openTaskOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("id, title").in("status", [...OPEN_TASK_STATUSES]).is("archived_at", null).order("created_at", { ascending: false }).limit(100);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export async function listActivity(params: SearchParams) {
  const supabase = await createClient();
  const { from, to, page } = pageOf(params);
  let query = supabase.from("activity_logs").select("*", { count: "exact" });
  const entity = param(params, "entity");
  if (/^[a-z_]{3,40}$/.test(entity)) query = query.eq("entity_type", entity);
  const actor = param(params, "actor");
  if (isUuid(actor)) query = query.eq("actor_id", actor);
  const result = await query.order("occurred_at", { ascending: false }).range(from, to);
  return { rows: check(result).map(toActivity), total: result.count ?? 0, page };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboard(userId: string) {
  const supabase = await createClient();
  const today = dayKey();
  const head = { count: "exact" as const, head: true };

  const [activeCases, clients, hearings, dueToday, overdue, upcoming, taskRows, recentCases, activity, reminders] = await Promise.all([
    supabase.from("cases").select("id, case_statuses!inner(is_closed)", head).is("archived_at", null).eq("case_statuses.is_closed", false),
    supabase.from("clients").select("id", head).is("archived_at", null),
    supabase.from("events").select("id", head).is("archived_at", null).eq("event_type", "hearing")
      .gte("starts_at", kyivIso(today, "00:00")).lt("starts_at", kyivIso(shiftKey(today, 8), "00:00")),
    supabase.from("tasks").select("id", head).is("archived_at", null).in("status", [...OPEN_TASK_STATUSES]).eq("due_date", today),
    supabase.from("tasks").select("id", head).is("archived_at", null).in("status", [...OPEN_TASK_STATUSES]).lt("due_date", today),
    supabase.from("events").select(EVENT_COLUMNS).is("archived_at", null).in("event_type", ["hearing", "deadline"])
      .gte("starts_at", kyivIso(today, "00:00")).lt("starts_at", kyivIso(shiftKey(today, 15), "00:00")).order("starts_at").limit(12),
    supabase.from("tasks").select("*").is("archived_at", null).in("status", [...OPEN_TASK_STATUSES]).lte("due_date", today)
      .order("due_date").limit(12),
    supabase.from("cases").select("*").is("archived_at", null).order("updated_at", { ascending: false }).limit(6),
    supabase.from("activity_logs").select("*").order("occurred_at", { ascending: false }).limit(8),
    supabase.from("event_reminders").select("id, remind_at, events!inner(id, title, event_type, starts_at, case_id, client_id, archived_at)")
      .eq("user_id", userId).is("dismissed_at", null).lte("remind_at", new Date().toISOString()).is("events.archived_at", null)
      .order("remind_at").limit(10),
  ]);

  return {
    counts: {
      activeCases: activeCases.count ?? 0,
      clients: clients.count ?? 0,
      hearingsWeek: hearings.count ?? 0,
      dueToday: dueToday.count ?? 0,
      overdue: overdue.count ?? 0,
    },
    upcoming: check(upcoming).map(toEvent),
    tasks: check(taskRows).map(toTask),
    recentCases: check(recentCases).map(toCase),
    activity: check(activity).map(toActivity),
    reminders: check(reminders).map((r) => ({
      id: r.id,
      remindAt: r.remind_at,
      event: {
        id: r.events.id, title: r.events.title, type: r.events.event_type, startsAt: r.events.starts_at,
        caseId: r.events.case_id ?? "", clientId: r.events.client_id ?? "",
      },
    })),
  };
}
