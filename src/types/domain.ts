export type Role = "admin" | "member";
export type ClientType = "individual" | "legal_entity";
export type ClientStatus = "potential" | "active" | "inactive" | "archived";
export type CaseStatus =
  | "new"
  | "in_progress"
  | "awaiting_client"
  | "awaiting_court"
  | "suspended"
  | "completed"
  | "archived";
export type TaskStatus = "new" | "in_progress" | "waiting" | "completed" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type EventType = "hearing" | "client_meeting" | "call" | "internal" | "deadline" | "other";
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isAdvocate: boolean;
}

export interface Client {
  id: string;
  number: string;
  type: ClientType;
  status: ClientStatus;
  name: string;
  rnokpp?: string;
  edrpou?: string;
  phone: string;
  email: string;
  address: string;
  representative?: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientContact {
  id: string;
  clientId: string;
  fullName: string;
  position: string;
  phone: string;
  email: string;
}

export interface LegalCase {
  id: string;
  number: string;
  courtCaseNumber?: string;
  title: string;
  practiceArea: string;
  matterType: string;
  isLitigation: boolean;
  description: string;
  clientId: string;
  responsibleId: string;
  opposingParty?: string;
  courtId?: string;
  judge?: string;
  openedOn: string;
  status: CaseStatus;
  nextDate?: string;
  closedOn?: string;
  updatedAt: string;
}

export interface CaseParty {
  id: string;
  caseId: string;
  role: string;
  name: string;
  isOurClient: boolean;
}

export interface Court {
  id: string;
  name: string;
  type: string;
  region: string;
  city: string;
  address: string;
  phone: string;
  website: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  category: string;
  clientId?: string;
  caseId?: string;
  uploadedAt: string;
  uploadedBy: string;
  sizeBytes: number;
  mimeType: string;
  version: number;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  createdBy: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  clientId?: string;
  caseId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  startsAt: string;
  endsAt?: string;
  location: string;
  caseId?: string;
  clientId?: string;
  responsibleId: string;
  description: string;
  deadlineSource?: string;
  isVerified?: boolean;
}

export interface FeeAgreement {
  id: string;
  clientId: string;
  caseId?: string;
  agreedOn: string;
  amount: number;
  description: string;
}

export interface Payment {
  id: string;
  clientId: string;
  caseId?: string;
  paidOn: string;
  amount: number;
  description: string;
}

export interface Expense {
  id: string;
  clientId: string;
  caseId?: string;
  incurredOn: string;
  amount: number;
  description: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  authorId: string;
  clientId?: string;
  caseId?: string;
  taskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  action: string;
  entityType: "client" | "case" | "document" | "task" | "event" | "payment" | "note" | "user";
  entityId: string;
  entityLabel: string;
  at: string;
  clientId?: string;
  caseId?: string;
}
