import { dayKey, formatTime } from "@/lib/dates";
import type {
  CalendarEvent, CaseParty, Client, ClientContact, Court, DocumentRecord, Expense, FeeAgreement, LegalCase, Note, Payment, Task,
} from "@/types/domain";
import type { OpenOptions } from "./quick-create";

/** Turns a loaded record into the options for its edit form (values + id + version). */
const edit = (record: { id: string; rowVersion: number }, values: Record<string, unknown>): OpenOptions => ({
  id: record.id,
  rowVersion: record.rowVersion,
  values,
});

const moneyText = (amount: number) => amount.toFixed(2).replace(".", ",");

export const editClient = (c: Client) =>
  edit(c, {
    type: c.type, status: c.status, name: c.name, rnokpp: c.rnokpp, edrpou: c.edrpou, representative: c.representative,
    phone: c.phone, email: c.email, address: c.address, assignedTo: c.assignedTo, notes: c.notes,
  });

export const editContact = (c: ClientContact) =>
  edit(c, { clientId: c.clientId, fullName: c.fullName, position: c.position, phone: c.phone, email: c.email, comment: c.comment });

export const editCase = (k: LegalCase) =>
  edit(k, {
    title: k.title, isLitigation: k.isLitigation, courtCaseNumber: k.courtCaseNumber, practiceAreaId: k.practiceAreaId,
    matterTypeId: k.matterTypeId, statusId: k.statusId, clientId: k.clientId, responsibleId: k.responsibleId,
    opposingParty: k.opposingParty, courtId: k.courtId, judge: k.judge, openedOn: k.openedOn, nextDate: k.nextDate,
    closedOn: k.closedOn, description: k.description,
  });

export const editParty = (p: CaseParty) =>
  edit(p, {
    caseId: p.caseId, roleId: p.roleId, name: p.name, isOurClient: p.isOurClient, identifier: p.identifier,
    contact: p.contact, notes: p.notes,
  });

export const editCourt = (c: Court) =>
  edit(c, {
    name: c.name, typeId: c.typeId, region: c.region, city: c.city, address: c.address, phone: c.phone,
    email: c.email, website: c.website, notes: c.notes,
  });

export const editTask = (t: Task) =>
  edit(t, {
    title: t.title, description: t.description, assignedTo: t.assignedTo, dueDate: t.dueDate, priority: t.priority,
    status: t.status, clientId: t.clientId, caseId: t.caseId,
  });

export const editEvent = (e: CalendarEvent, reminder = "") =>
  edit(e, {
    title: e.title, type: e.type, date: dayKey(e.startsAt), startTime: formatTime(e.startsAt),
    endTime: e.endsAt ? formatTime(e.endsAt) : "", location: e.location, caseId: e.caseId, clientId: e.clientId,
    responsibleId: e.responsibleId, description: e.description, deadlineSource: e.deadlineSource,
    isVerified: e.isVerified, reminder,
  });

export const editDocument = (d: DocumentRecord) =>
  edit(d, { name: d.name, categoryId: d.categoryId, clientId: d.clientId, caseId: d.caseId, description: d.description });

export const editFee = (f: FeeAgreement) =>
  edit(f, {
    clientId: f.clientId, caseId: f.caseId, agreedOn: f.agreedOn, amount: moneyText(f.amount),
    contractNumber: f.contractNumber, description: f.description,
  });

export const editPayment = (p: Payment) =>
  edit(p, {
    clientId: p.clientId, caseId: p.caseId, paidOn: p.paidOn, amount: moneyText(p.amount), method: p.method,
    description: p.description,
  });

export const editExpense = (x: Expense) =>
  edit(x, {
    clientId: x.clientId, caseId: x.caseId, incurredOn: x.incurredOn, amount: moneyText(x.amount),
    description: x.description, reimbursable: x.reimbursable,
  });

export const editNote = (n: Note) =>
  edit(n, {
    title: n.title, content: n.content,
    linkType: n.caseId ? "case" : n.clientId ? "client" : "task",
    linkId: n.caseId || n.clientId || n.taskId,
  });
