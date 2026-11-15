import type { Tables } from "@/types/database";
import type {
  ActivityEntry, CalendarEvent, CaseParty, Client, ClientContact, Court, DocumentRecord, DocumentVersion, Expense,
  FeeAgreement, LegalCase, Note, Payment, Task,
} from "@/types/domain";

/** Database rows (snake_case, nulls) → interface records (camelCase, empty strings). */
const s = (v: string | null | undefined) => v ?? "";
const n = (v: number | string | null | undefined) => Number(v ?? 0);

export const toClient = (r: Tables<"clients">): Client => ({
  id: r.id, number: r.client_number, type: r.client_type, status: r.status, name: r.name,
  rnokpp: s(r.rnokpp), edrpou: s(r.edrpou), representative: s(r.representative), phone: s(r.phone), email: s(r.email),
  address: s(r.address), assignedTo: s(r.assigned_to), notes: s(r.notes), createdAt: r.created_at, updatedAt: r.updated_at,
  archivedAt: r.archived_at, rowVersion: r.row_version,
});

export const toContact = (r: Tables<"client_contacts">): ClientContact => ({
  id: r.id, clientId: r.client_id, fullName: r.full_name, position: s(r.position), phone: s(r.phone), email: s(r.email),
  comment: s(r.comment), rowVersion: r.row_version,
});

export const toCase = (r: Tables<"cases">): LegalCase => ({
  id: r.id, number: r.case_number, courtCaseNumber: s(r.court_case_number), title: r.title, isLitigation: r.is_litigation,
  practiceAreaId: s(r.practice_area_id), matterTypeId: s(r.matter_type_id), statusId: r.status_id, description: s(r.description),
  clientId: r.client_id, responsibleId: s(r.responsible_id), opposingParty: s(r.opposing_party), courtId: s(r.court_id),
  judge: s(r.judge), openedOn: r.opened_on, nextDate: s(r.next_important_date), closedOn: s(r.closed_on), notes: s(r.notes),
  updatedAt: r.updated_at, archivedAt: r.archived_at, rowVersion: r.row_version,
});

export const toParty = (r: Tables<"case_parties">): CaseParty => ({
  id: r.id, caseId: r.case_id, roleId: r.role_id, name: r.name, isOurClient: r.is_our_client, identifier: s(r.identifier),
  contact: s(r.contact), notes: s(r.notes), rowVersion: r.row_version,
});

export const toCourt = (r: Tables<"courts">): Court => ({
  id: r.id, name: r.name, typeId: s(r.court_type_id), region: s(r.region), city: s(r.city), address: s(r.address),
  phone: s(r.phone), email: s(r.email), website: s(r.website), notes: s(r.notes), rowVersion: r.row_version,
});

export const toVersion = (r: Tables<"document_versions">): DocumentVersion => ({
  id: r.id, versionNo: r.version_no, originalFilename: r.original_filename, mimeType: r.mime_type, sizeBytes: n(r.size_bytes),
  uploadedBy: s(r.uploaded_by), uploadedAt: r.uploaded_at,
});

export const toDocument = (r: Tables<"documents"> & { current: Tables<"document_versions"> | null }): DocumentRecord => ({
  id: r.id, name: r.name, categoryId: s(r.category_id), clientId: s(r.client_id), caseId: s(r.case_id),
  description: s(r.description), updatedAt: r.updated_at, archivedAt: r.archived_at, rowVersion: r.row_version,
  current: r.current ? toVersion(r.current) : null,
});

export const toTask = (r: Tables<"tasks">): Task => ({
  id: r.id, title: r.title, description: s(r.description), assignedTo: s(r.assigned_to), createdBy: s(r.created_by),
  dueDate: s(r.due_date), priority: r.priority, status: r.status, clientId: s(r.client_id), caseId: s(r.case_id),
  archivedAt: r.archived_at, rowVersion: r.row_version,
});

const REMINDER_MINUTES = [60, 1440, 4320, 10080];

type EventRow = Tables<"events"> & { event_reminders?: Array<{ remind_at: string; dismissed_at: string | null }> };

function reminderOf(r: EventRow): string {
  const active = r.event_reminders?.find((x) => !x.dismissed_at);
  if (!active) return "";
  const minutes = Math.round((Date.parse(r.starts_at) - Date.parse(active.remind_at)) / 60_000);
  return REMINDER_MINUTES.includes(minutes) ? String(minutes) : "";
}

export const toEvent = (r: EventRow): CalendarEvent => ({
  id: r.id, title: r.title, type: r.event_type, startsAt: r.starts_at, endsAt: s(r.ends_at), location: s(r.location),
  caseId: s(r.case_id), clientId: s(r.client_id), responsibleId: s(r.responsible_id), description: s(r.description),
  deadlineSource: s(r.deadline_source), isVerified: r.is_verified, verifiedBy: s(r.verified_by), archivedAt: r.archived_at,
  rowVersion: r.row_version, reminder: reminderOf(r),
});

export const toFee = (r: Tables<"fee_agreements">): FeeAgreement => ({
  id: r.id, clientId: r.client_id, caseId: s(r.case_id), agreedOn: r.agreed_on, contractNumber: s(r.contract_number),
  amount: n(r.amount_uah), description: s(r.description), rowVersion: r.row_version,
});

export const toPayment = (r: Tables<"payments">): Payment => ({
  id: r.id, clientId: r.client_id, caseId: s(r.case_id), paidOn: r.paid_on, amount: n(r.amount_uah), method: s(r.method),
  description: s(r.description), rowVersion: r.row_version,
});

export const toExpense = (r: Tables<"expenses">): Expense => ({
  id: r.id, clientId: s(r.client_id), caseId: s(r.case_id), incurredOn: r.incurred_on, amount: n(r.amount_uah),
  description: s(r.description), reimbursable: r.reimbursable, rowVersion: r.row_version,
});

export const toNote = (r: Tables<"notes">): Note => ({
  id: r.id, title: r.title, content: r.content, authorId: s(r.author_id), clientId: s(r.client_id), caseId: s(r.case_id),
  taskId: s(r.task_id), createdAt: r.created_at, updatedAt: r.updated_at, rowVersion: r.row_version,
});

export const toActivity = (r: Tables<"activity_logs">): ActivityEntry => {
  const meta = (r.metadata ?? {}) as { label?: string; document_id?: string; changes?: ActivityEntry["changes"] };
  return {
    id: r.id, actorId: s(r.actor_id), action: r.action, entityType: r.entity_type, entityId: s(r.entity_id),
    label: meta.label ?? "", at: r.occurred_at, clientId: s(r.client_id), caseId: s(r.case_id),
    documentId: meta.document_id ?? "", changes: meta.changes ?? {},
  };
};
