import type {
  ClientStatus, ClientType, EventType, Role, TaskPriority, TaskStatus, Tone,
} from "@/types/domain";

/** Ukrainian domain terminology in one place so it stays consistent across screens. */

export const roleLabel: Record<Role, string> = { admin: "Адміністратор", member: "Учасник" };

export const clientTypeLabel: Record<ClientType, string> = {
  individual: "Фізична особа",
  legal_entity: "Юридична особа",
};

export const clientStatusLabel: Record<ClientStatus, string> = {
  potential: "Потенційний",
  active: "Активний",
  inactive: "Неактивний",
  archived: "В архіві",
};
export const clientStatusTone: Record<ClientStatus, Tone> = {
  potential: "accent", active: "success", inactive: "neutral", archived: "neutral",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  new: "Нове",
  in_progress: "В роботі",
  waiting: "Очікує",
  completed: "Виконано",
  cancelled: "Скасовано",
};
export const taskStatusTone: Record<TaskStatus, Tone> = {
  new: "accent", in_progress: "success", waiting: "warning", completed: "neutral", cancelled: "neutral",
};

export const taskPriorityLabel: Record<TaskPriority, string> = {
  low: "Низький", normal: "Звичайний", high: "Високий", urgent: "Терміновий",
};
export const taskPriorityTone: Record<TaskPriority, Tone> = {
  low: "neutral", normal: "neutral", high: "warning", urgent: "danger",
};

export const eventTypeLabel: Record<EventType, string> = {
  hearing: "Судове засідання",
  client_meeting: "Зустріч з клієнтом",
  call: "Дзвінок",
  internal: "Внутрішня нарада",
  deadline: "Процесуальний строк",
  other: "Інше",
};
export const eventTypeTone: Record<EventType, Tone> = {
  hearing: "accent", client_meeting: "success", call: "neutral", internal: "neutral",
  deadline: "danger", other: "neutral",
};
