"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dbError, fail, invalid, moneyValue, orNull, refreshAll, versionedUpdate, type ActionResult } from "@/lib/actions";
import { kyivIso } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import {
  caseSchema, clientSchema, contactSchema, courtSchema, editMeta, eventSchema, expenseSchema, feeSchema, noteSchema, partySchema,
  paymentSchema, taskSchema, type CaseValues, type ClientValues, type ContactValues, type CourtValues, type EditMeta,
  type EventValues, type ExpenseValues, type FeeValues, type NoteValues, type PartyValues, type PaymentValues,
  type TaskValues,
} from "../schemas";

/**
 * Create/update actions for every record type.
 * Each one: checks the session, re-validates the input, writes as the signed-in user
 * (row-level security applies), detects concurrent edits, and refreshes all screens.
 */

type Table = keyof Database["public"]["Tables"];

async function save(table: Table, meta: EditMeta, values: Record<string, unknown>): Promise<ActionResult> {
  await requireUser();
  const parsedMeta = editMeta.safeParse(meta);
  if (!parsedMeta.success) return fail("Некоректний запит.");
  const supabase = await createClient();

  let result: ActionResult;
  if (parsedMeta.data.id) {
    result = await versionedUpdate(supabase, table, parsedMeta.data.id, parsedMeta.data.rowVersion, values);
  } else {
    const { data, error } = await supabase.from(table).insert(values as never).select("id").single();
    result = error || !data ? fail(dbError(error)) : { ok: true, data: { id: (data as { id: string }).id } };
  }
  if (result.ok) refreshAll();
  return result;
}

export async function saveClient(meta: EditMeta, input: ClientValues) {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const isEntity = v.type === "legal_entity";
  return save("clients", meta, {
    client_type: v.type, status: v.status, name: v.name,
    rnokpp: isEntity ? null : orNull(v.rnokpp), edrpou: isEntity ? orNull(v.edrpou) : null,
    representative: isEntity ? orNull(v.representative) : null,
    phone: orNull(v.phone), email: orNull(v.email), address: orNull(v.address), assigned_to: orNull(v.assignedTo), notes: orNull(v.notes),
  });
}

export async function saveContact(meta: EditMeta, input: ContactValues) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  return save("client_contacts", meta, {
    client_id: v.clientId, full_name: v.fullName, position: orNull(v.position), phone: orNull(v.phone),
    email: orNull(v.email), comment: orNull(v.comment),
  });
}

export async function saveCase(meta: EditMeta, input: CaseValues) {
  const parsed = caseSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  return save("cases", meta, {
    title: v.title, is_litigation: v.isLitigation,
    court_case_number: v.isLitigation ? orNull(v.courtCaseNumber) : null,
    court_id: v.isLitigation ? orNull(v.courtId) : null,
    judge: v.isLitigation ? orNull(v.judge) : null,
    practice_area_id: orNull(v.practiceAreaId), matter_type_id: orNull(v.matterTypeId), status_id: v.statusId,
    client_id: v.clientId, responsible_id: orNull(v.responsibleId), opposing_party: orNull(v.opposingParty),
    opened_on: v.openedOn, next_important_date: orNull(v.nextDate), closed_on: orNull(v.closedOn),
    description: orNull(v.description),
  });
}

export async function saveParty(meta: EditMeta, input: PartyValues) {
  const parsed = partySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  return save("case_parties", meta, {
    case_id: v.caseId, role_id: v.roleId, name: v.name, is_our_client: v.isOurClient,
    identifier: orNull(v.identifier), contact: orNull(v.contact), notes: orNull(v.notes),
  });
}

export async function saveCourt(meta: EditMeta, input: CourtValues) {
  const parsed = courtSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  return save("courts", meta, {
    name: v.name, court_type_id: orNull(v.typeId), region: orNull(v.region), city: orNull(v.city),
    address: orNull(v.address), phone: orNull(v.phone), email: orNull(v.email), website: orNull(v.website), notes: orNull(v.notes),
  });
}

export async function saveTask(meta: EditMeta, input: TaskValues) {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  // The client of a linked matter is filled in by the database.
  return save("tasks", meta, {
    title: v.title, description: orNull(v.description), assigned_to: orNull(v.assignedTo), due_date: orNull(v.dueDate),
    priority: v.priority, status: v.status, client_id: orNull(v.clientId), case_id: orNull(v.caseId),
  });
}

export async function setTaskStatus(taskId: string, rowVersion: number, status: TaskValues["status"]) {
  await requireUser();
  const parsed = z.object({ id: z.uuid(), rowVersion: z.number().int(), status: taskSchema.shape.status }).safeParse({ id: taskId, rowVersion, status });
  if (!parsed.success) return fail("Некоректний запит.");
  const supabase = await createClient();
  const result = await versionedUpdate(supabase, "tasks", parsed.data.id, parsed.data.rowVersion, { status: parsed.data.status });
  if (result.ok) refreshAll();
  return result;
}

export async function saveEvent(meta: EditMeta, input: EventValues): Promise<ActionResult> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const user = await requireUser();
  const startsAt = kyivIso(v.date, v.startTime);
  const result = await save("events", meta, {
    title: v.title, event_type: v.type, starts_at: startsAt,
    ends_at: v.type === "deadline" || !v.endTime ? null : kyivIso(v.date, v.endTime),
    location: orNull(v.location), case_id: orNull(v.caseId), client_id: orNull(v.clientId),
    responsible_id: orNull(v.responsibleId), description: orNull(v.description),
    deadline_source: v.type === "deadline" ? orNull(v.deadlineSource) : null,
    is_verified: v.type === "deadline" ? v.isVerified : false,
  });
  if (!result.ok) return result;

  // One active reminder per event, for the responsible person (or the author).
  const supabase = await createClient();
  const eventId = result.data.id;
  await supabase.from("event_reminders").delete().eq("event_id", eventId).is("dismissed_at", null);
  if (v.reminder) {
    const remindAt = new Date(Date.parse(startsAt) - Number(v.reminder) * 60_000).toISOString();
    const { error } = await supabase
      .from("event_reminders")
      .insert({ event_id: eventId, user_id: orNull(v.responsibleId) ?? user.id, remind_at: remindAt });
    if (error) return fail(`Подію збережено, але нагадування не створено: ${dbError(error)}`);
  }
  refreshAll();
  return result;
}

export async function dismissReminder(reminderId: string) {
  await requireUser();
  if (!z.uuid().safeParse(reminderId).success) return fail("Некоректний запит.");
  const supabase = await createClient();
  const { error } = await supabase.from("event_reminders").update({ dismissed_at: new Date().toISOString() }).eq("id", reminderId);
  if (error) return fail(dbError(error));
  refreshAll();
  return { ok: true as const, data: { id: reminderId } };
}

export async function saveFee(meta: EditMeta, input: FeeValues) {
  const parsed = feeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  return save("fee_agreements", meta, {
    client_id: v.clientId, case_id: orNull(v.caseId), agreed_on: v.agreedOn, amount_uah: moneyValue(v.amount),
    contract_number: orNull(v.contractNumber), description: orNull(v.description),
  });
}

export async function savePayment(meta: EditMeta, input: PaymentValues) {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  return save("payments", meta, {
    client_id: v.clientId, case_id: orNull(v.caseId), paid_on: v.paidOn, amount_uah: moneyValue(v.amount),
    method: orNull(v.method), description: orNull(v.description),
  });
}

export async function saveExpense(meta: EditMeta, input: ExpenseValues) {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  return save("expenses", meta, {
    client_id: orNull(v.clientId), case_id: orNull(v.caseId), incurred_on: v.incurredOn, amount_uah: moneyValue(v.amount),
    description: v.description, reimbursable: v.reimbursable,
  });
}

export async function saveNote(meta: EditMeta, input: NoteValues) {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  return save("notes", meta, {
    title: v.title, content: v.content,
    client_id: v.linkType === "client" ? v.linkId : null,
    case_id: v.linkType === "case" ? v.linkId : null,
    task_id: v.linkType === "task" ? v.linkId : null,
  });
}

// ---------------------------------------------------------------------------
// Archive / restore / delete
// ---------------------------------------------------------------------------

const archivable = z.enum(["clients", "cases", "courts", "documents", "tasks", "events", "notes", "fee_agreements", "payments", "expenses"]);
const deletable = z.enum(["client_contacts", "case_parties"]);

export async function setArchived(table: z.infer<typeof archivable>, recordId: string, archived: boolean): Promise<ActionResult> {
  await requireUser();
  const parsed = z.object({ table: archivable, id: z.uuid(), archived: z.boolean() }).safeParse({ table, id: recordId, archived });
  if (!parsed.success) return fail("Некоректний запит.");
  const supabase = await createClient();
  const values: Record<string, unknown> = { archived_at: archived ? new Date().toISOString() : null };
  // A client's status follows the archive: archived on the way in, active again on restore.
  if (parsed.data.table === "clients") values.status = archived ? "archived" : "active";
  const result = await versionedUpdate(supabase, parsed.data.table, parsed.data.id, undefined, values);
  if (result.ok) refreshAll();
  return result;
}

export async function deleteRow(table: z.infer<typeof deletable>, recordId: string): Promise<ActionResult> {
  await requireUser();
  const parsed = z.object({ table: deletable, id: z.uuid() }).safeParse({ table, id: recordId });
  if (!parsed.success) return fail("Некоректний запит.");
  const supabase = await createClient();
  const { data, error } = await supabase.from(parsed.data.table).delete().eq("id", parsed.data.id).select("id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("Запис не знайдено або у вас немає прав на його видалення.");
  refreshAll();
  return { ok: true, data: { id: parsed.data.id } };
}
