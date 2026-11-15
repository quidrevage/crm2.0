import { z } from "zod";

/**
 * Validation shared by the forms and the server actions (the server always re-validates).
 * Form values are strings/booleans; conversion to numbers, dates and NULLs happens on save.
 */
const REQUIRED = "Обов’язкове поле";
const req = (message = REQUIRED) => z.string().trim().min(1, message);
const opt = z.string().trim().max(2000, "Занадто довгий текст");
const longText = z.string().trim().max(20000, "Занадто довгий текст");
const id = z.string().trim().refine((v) => v === "" || /^[0-9a-f-]{36}$/i.test(v), "Некоректне значення");
const reqId = (message: string) => id.refine((v) => v !== "", message);
const date = z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Вкажіть дату у форматі ДД.ММ.РРРР");
const reqDate = date.refine((v) => v !== "", "Вкажіть дату");
const optEmail = opt.refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Некоректна адреса електронної пошти");
const optDigits = (length: number, message: string) => opt.refine((v) => v === "" || new RegExp(`^\\d{${length}}$`).test(v), message);
const money = z
  .string()
  .trim()
  .regex(/^\d[\d\s]*([.,]\d{1,2})?$/, "Вкажіть суму, наприклад 12500,00")
  .refine((v) => Number(v.replace(/\s/g, "").replace(",", ".")) > 0, "Сума має бути більшою за нуль")
  .refine((v) => Number(v.replace(/\s/g, "").replace(",", ".")) < 1e12, "Занадто велика сума");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Вкажіть час");

export const clientSchema = z.object({
  type: z.enum(["individual", "legal_entity"]),
  status: z.enum(["potential", "active", "inactive", "archived"]),
  name: req().max(300),
  rnokpp: optDigits(10, "РНОКПП складається з 10 цифр"),
  edrpou: optDigits(8, "Код ЄДРПОУ складається з 8 цифр"),
  representative: opt,
  phone: opt,
  email: optEmail,
  address: opt,
  assignedTo: id,
  notes: longText,
});
export type ClientValues = z.infer<typeof clientSchema>;

export const contactSchema = z.object({
  clientId: reqId("Оберіть клієнта"),
  fullName: req().max(200),
  position: opt,
  phone: opt,
  email: optEmail,
  comment: opt,
});
export type ContactValues = z.infer<typeof contactSchema>;

export const caseSchema = z
  .object({
    title: req().max(300),
    isLitigation: z.boolean(),
    courtCaseNumber: opt,
    practiceAreaId: id,
    matterTypeId: id,
    statusId: reqId("Оберіть статус"),
    clientId: reqId("Оберіть клієнта"),
    responsibleId: id,
    opposingParty: opt,
    courtId: id,
    judge: opt,
    openedOn: reqDate,
    nextDate: date,
    closedOn: date,
    description: longText,
  })
  .refine((v) => v.closedOn === "" || v.closedOn >= v.openedOn, {
    path: ["closedOn"],
    message: "Дата закриття не може бути раніше за дату відкриття",
  });
export type CaseValues = z.infer<typeof caseSchema>;

export const partySchema = z.object({
  caseId: reqId("Оберіть справу"),
  roleId: reqId("Оберіть процесуальний статус"),
  name: req().max(300),
  isOurClient: z.boolean(),
  identifier: opt,
  contact: opt,
  notes: opt,
});
export type PartyValues = z.infer<typeof partySchema>;

export const courtSchema = z.object({
  name: req().max(300),
  typeId: id,
  region: opt,
  city: opt,
  address: opt,
  phone: opt,
  email: optEmail,
  website: opt.refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "Адреса має починатися з https://"),
  notes: opt,
});
export type CourtValues = z.infer<typeof courtSchema>;

export const taskSchema = z.object({
  title: req().max(300),
  description: longText,
  assignedTo: id,
  dueDate: date,
  priority: z.enum(["low", "normal", "high", "urgent"]),
  status: z.enum(["new", "in_progress", "waiting", "completed", "cancelled"]),
  clientId: id,
  caseId: id,
});
export type TaskValues = z.infer<typeof taskSchema>;

export const REMINDER_OPTIONS = [
  { value: "", label: "Без нагадування" },
  { value: "60", label: "За 1 годину" },
  { value: "1440", label: "За 1 день" },
  { value: "4320", label: "За 3 дні" },
  { value: "10080", label: "За 7 днів" },
] as const;

export const eventSchema = z
  .object({
    title: req().max(300),
    type: z.enum(["hearing", "client_meeting", "call", "internal", "deadline", "other"]),
    date: reqDate,
    startTime: time,
    endTime: z.string().refine((v) => v === "" || /^\d{2}:\d{2}$/.test(v), "Вкажіть час"),
    location: opt,
    caseId: id,
    clientId: id,
    responsibleId: id,
    description: longText,
    deadlineSource: opt,
    isVerified: z.boolean(),
    reminder: z.enum(["", "60", "1440", "4320", "10080"]),
  })
  .refine((v) => v.endTime === "" || v.endTime > v.startTime, {
    path: ["endTime"],
    message: "Завершення має бути пізніше за початок",
  })
  .refine((v) => v.type !== "deadline" || v.deadlineSource !== "", {
    path: ["deadlineSource"],
    message: "Вкажіть, звідки взято строк (норма, ухвала тощо)",
  });
export type EventValues = z.infer<typeof eventSchema>;

export const documentSchema = z
  .object({
    name: req().max(300),
    categoryId: reqId("Оберіть категорію"),
    clientId: id,
    caseId: id,
    description: opt,
  })
  .refine((v) => v.clientId !== "" || v.caseId !== "", {
    path: ["clientId"],
    message: "Прив’яжіть документ до клієнта або справи",
  });
export type DocumentValues = z.infer<typeof documentSchema>;

export const feeSchema = z.object({
  clientId: reqId("Оберіть клієнта"),
  caseId: id,
  agreedOn: reqDate,
  amount: money,
  contractNumber: opt,
  description: opt,
});
export type FeeValues = z.infer<typeof feeSchema>;

export const paymentSchema = z.object({
  clientId: reqId("Оберіть клієнта"),
  caseId: id,
  paidOn: reqDate,
  amount: money,
  method: opt,
  description: opt,
});
export type PaymentValues = z.infer<typeof paymentSchema>;

export const expenseSchema = z
  .object({
    clientId: id,
    caseId: id,
    incurredOn: reqDate,
    amount: money,
    description: req("Опишіть витрату").max(500),
    reimbursable: z.boolean(),
  })
  .refine((v) => v.clientId !== "" || v.caseId !== "", {
    path: ["clientId"],
    message: "Прив’яжіть витрату до клієнта або справи",
  });
export type ExpenseValues = z.infer<typeof expenseSchema>;

export const noteSchema = z.object({
  title: req().max(300),
  content: req().pipe(longText),
  linkType: z.enum(["client", "case", "task"]),
  linkId: reqId("Оберіть запис"),
});
export type NoteValues = z.infer<typeof noteSchema>;

/** Identifies the record being edited and the version the form was opened at. */
export const editMeta = z.object({
  id: z.uuid().optional(),
  rowVersion: z.number().int().positive().optional(),
});
export type EditMeta = z.infer<typeof editMeta>;
