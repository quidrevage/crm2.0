import { z } from "zod";

/**
 * Validation schemas shared by forms now and by server actions from Phase 4.
 * Form values are plain strings/booleans; conversion to numbers and dates happens on save.
 */
const REQUIRED = "Обов’язкове поле";
const req = (message = REQUIRED) => z.string().trim().min(1, message);
const opt = z.string().trim();
const optEmail = opt.refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Некоректна адреса електронної пошти");
const optDigits = (length: number, message: string) => opt.refine((v) => v === "" || new RegExp(`^\\d{${length}}$`).test(v), message);
const money = z.string().trim().regex(/^\d+([.,]\d{1,2})?$/, "Вкажіть суму, наприклад 12500,00").refine((v) => Number(v.replace(",", ".")) > 0, "Сума має бути більшою за нуль");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Вкажіть час");

export const clientSchema = z.object({
  type: z.enum(["individual", "legal_entity"]),
  status: z.enum(["potential", "active", "inactive", "archived"]),
  name: req(),
  rnokpp: optDigits(10, "РНОКПП складається з 10 цифр"),
  edrpou: optDigits(8, "Код ЄДРПОУ складається з 8 цифр"),
  representative: opt,
  phone: opt,
  email: optEmail,
  address: opt,
  assignedTo: req("Оберіть відповідального"),
  notes: opt,
});
export type ClientValues = z.infer<typeof clientSchema>;

export const caseSchema = z.object({
  title: req(),
  isLitigation: z.boolean(),
  courtCaseNumber: opt,
  practiceArea: req("Оберіть галузь права"),
  matterType: req("Оберіть тип справи"),
  clientId: req("Оберіть клієнта"),
  responsibleId: req("Оберіть відповідального"),
  status: z.enum(["new", "in_progress", "awaiting_client", "awaiting_court", "suspended", "completed", "archived"]),
  opposingParty: opt,
  courtId: opt,
  judge: opt,
  openedOn: req("Вкажіть дату"),
  nextDate: opt,
  description: opt,
});
export type CaseValues = z.infer<typeof caseSchema>;

export const courtSchema = z.object({
  name: req(),
  type: req("Оберіть тип суду"),
  region: opt,
  city: opt,
  address: opt,
  phone: opt,
  website: opt,
});
export type CourtValues = z.infer<typeof courtSchema>;

export const taskSchema = z.object({
  title: req(),
  description: opt,
  assignedTo: req("Оберіть виконавця"),
  dueDate: opt,
  priority: z.enum(["low", "normal", "high", "urgent"]),
  status: z.enum(["new", "in_progress", "waiting", "completed", "cancelled"]),
  clientId: opt,
  caseId: opt,
});
export type TaskValues = z.infer<typeof taskSchema>;

export const eventSchema = z
  .object({
    title: req(),
    type: z.enum(["hearing", "client_meeting", "call", "internal", "deadline", "other"]),
    date: req("Вкажіть дату"),
    startTime: time,
    endTime: z.string().refine((v) => v === "" || /^\d{2}:\d{2}$/.test(v), "Вкажіть час"),
    location: opt,
    caseId: opt,
    clientId: opt,
    responsibleId: req("Оберіть відповідального"),
    description: opt,
    deadlineSource: opt,
    isVerified: z.boolean(),
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
    name: req(),
    category: req("Оберіть категорію"),
    clientId: opt,
    caseId: opt,
    description: opt,
  })
  .refine((v) => v.clientId !== "" || v.caseId !== "", {
    path: ["clientId"],
    message: "Прив’яжіть документ до клієнта або справи",
  });
export type DocumentValues = z.infer<typeof documentSchema>;

export const paymentSchema = z.object({
  clientId: req("Оберіть клієнта"),
  caseId: opt,
  paidOn: req("Вкажіть дату"),
  amount: money,
  description: opt,
});
export type PaymentValues = z.infer<typeof paymentSchema>;

export const noteSchema = z.object({
  title: req(),
  content: req(),
  linkType: z.enum(["client", "case", "task"]),
  linkId: req("Оберіть запис"),
});
export type NoteValues = z.infer<typeof noteSchema>;
