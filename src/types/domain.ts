import type { Database } from "./database";

type Enums = Database["public"]["Enums"];

export type Role = Enums["user_role"];
export type FinanceAccess = Enums["finance_access"];
export type ClientType = Enums["client_type"];
export type ClientStatus = Enums["client_status"];
export type TaskStatus = Enums["task_status"];
export type TaskPriority = Enums["task_priority"];
export type EventType = Enums["event_type"];
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

/** An entry of an editable reference list (practice areas, statuses, categories…). */
export interface RefItem {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CaseStatusItem extends RefItem {
  isClosed: boolean;
  tone: Tone;
}

export interface UserRef {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
}

/** Every editable record carries the version it was loaded at, to detect concurrent edits. */
interface Versioned {
  rowVersion: number;
}

export interface Client extends Versioned {
  id: string;
  number: string;
  type: ClientType;
  status: ClientStatus;
  name: string;
  rnokpp: string;
  edrpou: string;
  representative: string;
  phone: string;
  email: string;
  address: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ClientContact extends Versioned {
  id: string;
  clientId: string;
  fullName: string;
  position: string;
  phone: string;
  email: string;
  comment: string;
}

export interface LegalCase extends Versioned {
  id: string;
  number: string;
  courtCaseNumber: string;
  title: string;
  isLitigation: boolean;
  practiceAreaId: string;
  matterTypeId: string;
  statusId: string;
  description: string;
  clientId: string;
  responsibleId: string;
  opposingParty: string;
  courtId: string;
  judge: string;
  openedOn: string;
  nextDate: string;
  closedOn: string;
  notes: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CaseParty extends Versioned {
  id: string;
  caseId: string;
  roleId: string;
  name: string;
  isOurClient: boolean;
  identifier: string;
  contact: string;
  notes: string;
}

export interface Court extends Versioned {
  id: string;
  name: string;
  typeId: string;
  region: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  notes: string;
  /** From the shared official directory (read-only), not added by this workspace. */
  official: boolean;
  /** Official court code of the State Judicial Administration, e.g. "2610". */
  code: string;
  workingHours: string;
}

export interface DocumentVersion {
  id: string;
  versionNo: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface DocumentRecord extends Versioned {
  id: string;
  name: string;
  categoryId: string;
  clientId: string;
  caseId: string;
  description: string;
  updatedAt: string;
  archivedAt: string | null;
  current: DocumentVersion | null;
}

export interface Task extends Versioned {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  clientId: string;
  caseId: string;
  archivedAt: string | null;
}

export interface CalendarEvent extends Versioned {
  id: string;
  title: string;
  type: EventType;
  startsAt: string;
  endsAt: string;
  location: string;
  caseId: string;
  clientId: string;
  responsibleId: string;
  description: string;
  deadlineSource: string;
  isVerified: boolean;
  verifiedBy: string;
  archivedAt: string | null;
  /** Active reminder for this event, in minutes before the start ("" if none). */
  reminder: string;
}

export interface FeeAgreement extends Versioned {
  id: string;
  clientId: string;
  caseId: string;
  agreedOn: string;
  contractNumber: string;
  amount: number;
  description: string;
}

export interface Payment extends Versioned {
  id: string;
  clientId: string;
  caseId: string;
  paidOn: string;
  amount: number;
  method: string;
  description: string;
}

export interface Expense extends Versioned {
  id: string;
  clientId: string;
  caseId: string;
  incurredOn: string;
  amount: number;
  description: string;
  reimbursable: boolean;
}

export interface Note extends Versioned {
  id: string;
  title: string;
  content: string;
  authorId: string;
  clientId: string;
  caseId: string;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  label: string;
  at: string;
  clientId: string;
  caseId: string;
  /** For file versions: the document they belong to. */
  documentId: string;
  changes: Record<string, { old?: unknown; new?: unknown; changed?: boolean }>;
}

export interface Reminder {
  id: string;
  remindAt: string;
  event: Pick<CalendarEvent, "id" | "title" | "type" | "startsAt" | "caseId" | "clientId">;
}
