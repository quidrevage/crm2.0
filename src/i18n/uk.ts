import type {
  CaseStatus, ClientStatus, ClientType, EventType, Role, TaskPriority, TaskStatus, Tone,
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

export const caseStatusLabel: Record<CaseStatus, string> = {
  new: "Нова",
  in_progress: "В роботі",
  awaiting_client: "Очікує клієнта",
  awaiting_court: "Очікує суду",
  suspended: "Зупинена",
  completed: "Завершена",
  archived: "В архіві",
};
export const caseStatusTone: Record<CaseStatus, Tone> = {
  new: "accent", in_progress: "success", awaiting_client: "warning", awaiting_court: "warning",
  suspended: "neutral", completed: "neutral", archived: "neutral",
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

/** Seed values for the configurable reference lists (editable by the admin from Phase 4). */
export const practiceAreas = [
  "Цивільне право", "Господарське право", "Адміністративне право", "Кримінальне право",
  "Трудове право", "Сімейне право", "Спадкове право", "Нерухомість", "Корпоративне право",
  "Договірне право", "Податкове право", "Земельне право", "Інше",
];

export const matterTypes = [
  "Судова справа", "Консультація", "Підготовка договору", "Корпоративний супровід",
  "Супровід угоди", "Спадкова справа", "Адміністративне оскарження", "Захист у кримінальному провадженні", "Інше",
];

export const partyRoles = [
  "Позивач", "Відповідач", "Третя особа", "Заявник", "Представник", "Захисник", "Прокурор", "Інша сторона",
];

export const documentCategories = [
  "Договір", "Позовна заява", "Відзив", "Відповідь на відзив", "Заперечення", "Клопотання", "Заява",
  "Скарга", "Апеляційна скарга", "Касаційна скарга", "Судове рішення", "Довіреність", "Адвокатський запит",
  "Відповідь на адвокатський запит", "Докази", "Листування", "Інше",
];

export const courtTypes = [
  "Місцевий загальний суд", "Місцевий господарський суд", "Окружний адміністративний суд",
  "Апеляційний суд", "Апеляційний господарський суд", "Апеляційний адміністративний суд",
  "Верховний Суд", "Інше",
];

export const DEMO_SAVE_NOTICE =
  "Форму перевірено, але запис не збережено: це демонстраційні дані. Збереження буде підключено разом із базою даних.";
export const DEMO_FILE_NOTICE =
  "Файли недоступні в демонстраційному режимі. Сховище документів буде підключено пізніше.";
