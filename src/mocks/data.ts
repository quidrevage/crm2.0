/**
 * TEMPORARY MOCK DATA — Phase 2 only.
 * Every person, company, case number and amount below is fictional.
 * Court names are real institutions; their addresses and contacts are intentionally left empty.
 * This module is removed when the screens are connected to Supabase (Phase 4).
 */
import type {
  ActivityEntry, CalendarEvent, CaseParty, Client, ClientContact, Court, DocumentRecord,
  Expense, FeeAgreement, LegalCase, Note, Payment, Task, User,
} from "@/types/domain";
import { dayKey, kyivIso, shiftKey } from "@/lib/dates";

const today = dayKey();
const day = (offset: number) => shiftKey(today, offset);
const at = (offset: number, time: string) => kyivIso(day(offset), time);

export const users: User[] = [
  { id: "u1", fullName: "Олена Коваленко", email: "o.kovalenko@example.com", role: "admin", isAdvocate: true },
  { id: "u2", fullName: "Андрій Мельник", email: "a.melnyk@example.com", role: "member", isAdvocate: false },
];
export const currentUser = users[0];

export const clients: Client[] = [
  { id: "c1", number: "К-0001", type: "legal_entity", status: "active", name: "ТОВ «Дніпро-Агротрейд»", edrpou: "00000001", phone: "+380 44 000 00 01", email: "office@agrotrade.example", address: "м. Київ, вул. Зразкова, 1", representative: "Савченко Віктор Іванович, директор", assignedTo: "u1", notes: "Постійний клієнт, абонентське обслуговування.", createdAt: at(-420, "10:00"), updatedAt: at(-1, "16:20") },
  { id: "c2", number: "К-0002", type: "individual", status: "active", name: "Шевченко Ігор Петрович", rnokpp: "0000000002", phone: "+380 50 000 00 02", email: "shevchenko@example.com", address: "м. Київ, вул. Прикладна, 12, кв. 5", assignedTo: "u2", notes: "", createdAt: at(-300, "11:30"), updatedAt: at(-2, "12:05") },
  { id: "c3", number: "К-0003", type: "legal_entity", status: "active", name: "ПП «Будсервіс Плюс»", edrpou: "00000003", phone: "+380 44 000 00 03", email: "info@budservice.example", address: "Київська обл., м. Бровари, вул. Тестова, 7", representative: "Лисенко Оксана Юріївна, директорка", assignedTo: "u1", notes: "", createdAt: at(-210, "09:15"), updatedAt: at(-3, "09:40") },
  { id: "c4", number: "К-0004", type: "individual", status: "active", name: "Бондаренко Наталія Сергіївна", rnokpp: "0000000004", phone: "+380 67 000 00 04", email: "bondarenko@example.com", address: "м. Київ, просп. Умовний, 44, кв. 18", assignedTo: "u2", notes: "Зручний час для дзвінків — після 18:00.", createdAt: at(-150, "14:00"), updatedAt: at(-1, "10:10") },
  { id: "c5", number: "К-0005", type: "legal_entity", status: "potential", name: "ТОВ «Карпати Логістик»", edrpou: "00000005", phone: "+380 32 000 00 05", email: "contact@karpaty-log.example", address: "м. Львів, вул. Демонстраційна, 3", representative: "Гнатюк Роман Богданович, директор", assignedTo: "u1", notes: "Первинна консультація проведена, очікуємо рішення щодо договору.", createdAt: at(-9, "15:45"), updatedAt: at(-4, "17:00") },
  { id: "c6", number: "К-0006", type: "individual", status: "inactive", name: "Ткаченко Олександр Миколайович", rnokpp: "0000000006", phone: "+380 63 000 00 06", email: "", address: "м. Біла Церква, вул. Вигадана, 9", assignedTo: "u2", notes: "", createdAt: at(-260, "13:20"), updatedAt: at(-35, "11:00") },
  { id: "c7", number: "К-0007", type: "individual", status: "active", name: "ФОП Гриценко Марія Василівна", rnokpp: "0000000007", phone: "+380 95 000 00 07", email: "grytsenko@example.com", address: "м. Київ, вул. Навчальна, 21", assignedTo: "u1", notes: "", createdAt: at(-60, "10:30"), updatedAt: at(-6, "15:15") },
  { id: "c8", number: "К-0008", type: "legal_entity", status: "archived", name: "ТОВ «Старий Млин»", edrpou: "00000008", phone: "+380 44 000 00 08", email: "", address: "м. Київ, вул. Архівна, 2", representative: "Мороз Петро Олексійович, директор", assignedTo: "u1", notes: "Співпрацю завершено.", createdAt: at(-700, "12:00"), updatedAt: at(-190, "12:00") },
];

export const clientContacts: ClientContact[] = [
  { id: "cc1", clientId: "c1", fullName: "Савченко Віктор Іванович", position: "Директор", phone: "+380 44 000 00 01", email: "director@agrotrade.example" },
  { id: "cc2", clientId: "c1", fullName: "Поліщук Ірина Олегівна", position: "Головна бухгалтерка", phone: "+380 44 000 00 11", email: "buh@agrotrade.example" },
  { id: "cc3", clientId: "c3", fullName: "Лисенко Оксана Юріївна", position: "Директорка", phone: "+380 44 000 00 03", email: "lysenko@budservice.example" },
  { id: "cc4", clientId: "c4", fullName: "Бондаренко Сергій Іванович", position: "Батько, довірена особа", phone: "+380 67 000 00 14", email: "" },
];

export const courts: Court[] = [
  { id: "ct1", name: "Господарський суд міста Києва", type: "Місцевий господарський суд", region: "м. Київ", city: "Київ", address: "", phone: "", website: "" },
  { id: "ct2", name: "Печерський районний суд міста Києва", type: "Місцевий загальний суд", region: "м. Київ", city: "Київ", address: "", phone: "", website: "" },
  { id: "ct3", name: "Київський окружний адміністративний суд", type: "Окружний адміністративний суд", region: "Київська область", city: "Київ", address: "", phone: "", website: "" },
  { id: "ct4", name: "Київський апеляційний суд", type: "Апеляційний суд", region: "м. Київ", city: "Київ", address: "", phone: "", website: "" },
  { id: "ct5", name: "Північний апеляційний господарський суд", type: "Апеляційний господарський суд", region: "м. Київ", city: "Київ", address: "", phone: "", website: "" },
  { id: "ct6", name: "Верховний Суд", type: "Верховний Суд", region: "м. Київ", city: "Київ", address: "", phone: "", website: "" },
];

export const cases: LegalCase[] = [
  { id: "k1", number: "2026/0001", courtCaseNumber: "910/0001/26", title: "Стягнення заборгованості за договором поставки", practiceArea: "Господарське право", matterType: "Судова справа", isLitigation: true, description: "Стягнення основного боргу, пені та 3 % річних за договором поставки сільськогосподарської продукції.", clientId: "c1", responsibleId: "u1", opposingParty: "ТОВ «Зерновий Альянс»", courtId: "ct1", judge: "", openedOn: day(-95), status: "awaiting_court", nextDate: day(2), updatedAt: at(-1, "16:20") },
  { id: "k2", number: "2026/0002", courtCaseNumber: "757/00002/26-ц", title: "Поділ майна подружжя", practiceArea: "Сімейне право", matterType: "Судова справа", isLitigation: true, description: "Поділ спільного сумісного майна: квартира та автомобіль.", clientId: "c4", responsibleId: "u2", opposingParty: "Бондаренко Максим Андрійович", courtId: "ct2", openedOn: day(-70), status: "in_progress", nextDate: day(6), updatedAt: at(-1, "10:10") },
  { id: "k3", number: "2026/0003", courtCaseNumber: "320/00003/26", title: "Оскарження податкового повідомлення-рішення", practiceArea: "Податкове право", matterType: "Судова справа", isLitigation: true, description: "Визнання протиправним та скасування податкового повідомлення-рішення.", clientId: "c3", responsibleId: "u1", opposingParty: "Головне управління ДПС у Київській області", courtId: "ct3", openedOn: day(-48), status: "in_progress", nextDate: day(12), updatedAt: at(-3, "09:40") },
  { id: "k4", number: "2026/0004", title: "Супровід купівлі-продажу нежитлового приміщення", practiceArea: "Нерухомість", matterType: "Супровід угоди", isLitigation: false, description: "Перевірка об’єкта, підготовка проєкту договору, супровід у нотаріуса.", clientId: "c2", responsibleId: "u2", openedOn: day(-21), status: "in_progress", nextDate: day(4), updatedAt: at(-2, "12:05") },
  { id: "k5", number: "2026/0005", title: "Оформлення спадщини", practiceArea: "Спадкове право", matterType: "Спадкова справа", isLitigation: false, description: "Підготовка документів для отримання свідоцтва про право на спадщину.", clientId: "c6", responsibleId: "u2", openedOn: day(-120), status: "awaiting_client", updatedAt: at(-35, "11:00") },
  { id: "k6", number: "2026/0006", title: "Розробка договору перевезення вантажів", practiceArea: "Договірне право", matterType: "Підготовка договору", isLitigation: false, description: "Типовий договір перевезення та додатки до нього.", clientId: "c5", responsibleId: "u1", openedOn: day(-4), status: "new", updatedAt: at(-4, "17:00") },
  { id: "k7", number: "2026/0007", courtCaseNumber: "757/00007/26-ц", title: "Поновлення на роботі та стягнення середнього заробітку", practiceArea: "Трудове право", matterType: "Судова справа", isLitigation: true, description: "Оскарження наказу про звільнення.", clientId: "c2", responsibleId: "u1", opposingParty: "ТОВ «Меридіан Сервіс»", courtId: "ct2", openedOn: day(-33), status: "awaiting_court", nextDate: day(9), updatedAt: at(-5, "14:30") },
  { id: "k8", number: "2025/0014", title: "Зміна складу учасників товариства", practiceArea: "Корпоративне право", matterType: "Корпоративний супровід", isLitigation: false, description: "Підготовка рішення загальних зборів, нової редакції статуту, державна реєстрація змін.", clientId: "c1", responsibleId: "u2", openedOn: day(-240), status: "completed", closedOn: day(-180), updatedAt: at(-180, "13:00") },
  { id: "k9", number: "2026/0008", courtCaseNumber: "910/0009/25", title: "Апеляційне оскарження рішення про стягнення коштів", practiceArea: "Господарське право", matterType: "Судова справа", isLitigation: true, description: "Апеляційна скарга на рішення суду першої інстанції.", clientId: "c3", responsibleId: "u1", opposingParty: "ТОВ «Техпостач»", courtId: "ct5", openedOn: day(-80), status: "suspended", updatedAt: at(-20, "10:00") },
];

export const caseParties: CaseParty[] = [
  { id: "p1", caseId: "k1", role: "Позивач", name: "ТОВ «Дніпро-Агротрейд»", isOurClient: true },
  { id: "p2", caseId: "k1", role: "Відповідач", name: "ТОВ «Зерновий Альянс»", isOurClient: false },
  { id: "p3", caseId: "k1", role: "Третя особа", name: "АТ «Умовний Банк»", isOurClient: false },
  { id: "p4", caseId: "k2", role: "Позивач", name: "Бондаренко Наталія Сергіївна", isOurClient: true },
  { id: "p5", caseId: "k2", role: "Відповідач", name: "Бондаренко Максим Андрійович", isOurClient: false },
  { id: "p6", caseId: "k3", role: "Позивач", name: "ПП «Будсервіс Плюс»", isOurClient: true },
  { id: "p7", caseId: "k3", role: "Відповідач", name: "Головне управління ДПС у Київській області", isOurClient: false },
  { id: "p8", caseId: "k7", role: "Позивач", name: "Шевченко Ігор Петрович", isOurClient: true },
  { id: "p9", caseId: "k7", role: "Відповідач", name: "ТОВ «Меридіан Сервіс»", isOurClient: false },
  { id: "p10", caseId: "k9", role: "Заявник", name: "ПП «Будсервіс Плюс»", isOurClient: true },
  { id: "p11", caseId: "k9", role: "Інша сторона", name: "ТОВ «Техпостач»", isOurClient: false },
];

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const documents: DocumentRecord[] = [
  { id: "d1", name: "Позовна заява про стягнення заборгованості", category: "Позовна заява", clientId: "c1", caseId: "k1", uploadedAt: at(-94, "12:10"), uploadedBy: "u1", sizeBytes: 412_000, mimeType: PDF, version: 2, description: "Подано через Електронний суд." },
  { id: "d2", name: "Договір поставки № 17", category: "Договір", clientId: "c1", caseId: "k1", uploadedAt: at(-95, "10:00"), uploadedBy: "u1", sizeBytes: 1_250_000, mimeType: PDF, version: 1, description: "" },
  { id: "d3", name: "Розрахунок пені та 3 % річних", category: "Докази", clientId: "c1", caseId: "k1", uploadedAt: at(-94, "11:45"), uploadedBy: "u2", sizeBytes: 38_000, mimeType: XLSX, version: 3, description: "" },
  { id: "d4", name: "Відзив на позовну заяву", category: "Відзив", clientId: "c1", caseId: "k1", uploadedAt: at(-40, "09:30"), uploadedBy: "u1", sizeBytes: 690_000, mimeType: PDF, version: 1, description: "Отримано від відповідача." },
  { id: "d5", name: "Ухвала про відкриття провадження", category: "Судове рішення", clientId: "c4", caseId: "k2", uploadedAt: at(-60, "15:00"), uploadedBy: "u2", sizeBytes: 210_000, mimeType: PDF, version: 1, description: "" },
  { id: "d6", name: "Проєкт договору купівлі-продажу", category: "Договір", clientId: "c2", caseId: "k4", uploadedAt: at(-2, "12:05"), uploadedBy: "u2", sizeBytes: 96_000, mimeType: DOCX, version: 4, description: "Редакція після правок покупця." },
  { id: "d7", name: "Довіреність на представництво", category: "Довіреність", clientId: "c2", uploadedAt: at(-30, "10:20"), uploadedBy: "u1", sizeBytes: 540_000, mimeType: "image/jpeg", version: 1, description: "Скан-копія." },
  { id: "d8", name: "Податкове повідомлення-рішення", category: "Докази", clientId: "c3", caseId: "k3", uploadedAt: at(-48, "13:15"), uploadedBy: "u1", sizeBytes: 870_000, mimeType: PDF, version: 1, description: "" },
  { id: "d9", name: "Адвокатський запит до банку", category: "Адвокатський запит", clientId: "c1", caseId: "k1", uploadedAt: at(-12, "16:40"), uploadedBy: "u1", sizeBytes: 74_000, mimeType: DOCX, version: 1, description: "" },
  { id: "d10", name: "Апеляційна скарга", category: "Апеляційна скарга", clientId: "c3", caseId: "k9", uploadedAt: at(-79, "17:30"), uploadedBy: "u1", sizeBytes: 520_000, mimeType: PDF, version: 2, description: "" },
  { id: "d11", name: "Клопотання про витребування доказів", category: "Клопотання", clientId: "c2", caseId: "k7", uploadedAt: at(-5, "14:30"), uploadedBy: "u1", sizeBytes: 61_000, mimeType: DOCX, version: 1, description: "" },
];

export const tasks: Task[] = [
  { id: "t1", title: "Підготувати відповідь на відзив", description: "Врахувати доводи відповідача щодо строку позовної давності.", assignedTo: "u1", createdBy: "u1", dueDate: day(0), priority: "urgent", status: "in_progress", clientId: "c1", caseId: "k1" },
  { id: "t2", title: "Надіслати клієнтці перелік документів для оцінки майна", description: "", assignedTo: "u2", createdBy: "u1", dueDate: day(0), priority: "normal", status: "new", clientId: "c4", caseId: "k2" },
  { id: "t3", title: "Отримати витяг з Державного реєстру речових прав", description: "", assignedTo: "u2", createdBy: "u2", dueDate: day(-2), priority: "high", status: "in_progress", clientId: "c2", caseId: "k4" },
  { id: "t4", title: "Узгодити дату зустрічі щодо спадкових документів", description: "Клієнт не відповідає на дзвінки, спробувати ще раз.", assignedTo: "u2", createdBy: "u2", dueDate: day(-6), priority: "normal", status: "waiting", clientId: "c6", caseId: "k5" },
  { id: "t5", title: "Підготувати проєкт договору перевезення", description: "", assignedTo: "u1", createdBy: "u1", dueDate: day(5), priority: "normal", status: "new", clientId: "c5", caseId: "k6" },
  { id: "t6", title: "Подати клопотання про витребування доказів", description: "", assignedTo: "u1", createdBy: "u1", dueDate: day(3), priority: "high", status: "new", clientId: "c2", caseId: "k7" },
  { id: "t7", title: "Виставити рахунок за жовтень", description: "", assignedTo: "u1", createdBy: "u1", dueDate: day(1), priority: "low", status: "new", clientId: "c1" },
  { id: "t8", title: "Ознайомитися з матеріалами справи в суді", description: "", assignedTo: "u2", createdBy: "u1", dueDate: day(-10), priority: "normal", status: "completed", clientId: "c3", caseId: "k3" },
  { id: "t9", title: "Оновити шаблон договору про надання правової допомоги", description: "", assignedTo: "u1", createdBy: "u2", priority: "low", status: "new" },
  { id: "t10", title: "Підготувати пояснення щодо податкового кредиту", description: "", assignedTo: "u1", createdBy: "u1", dueDate: day(8), priority: "normal", status: "in_progress", clientId: "c3", caseId: "k3" },
];

export const events: CalendarEvent[] = [
  { id: "e1", title: "Підготовче засідання", type: "hearing", startsAt: at(2, "10:30"), endsAt: at(2, "11:30"), location: "Господарський суд міста Києва", caseId: "k1", clientId: "c1", responsibleId: "u1", description: "" },
  { id: "e2", title: "Судове засідання у справі про поділ майна", type: "hearing", startsAt: at(6, "14:00"), endsAt: at(6, "15:00"), location: "Печерський районний суд міста Києва", caseId: "k2", clientId: "c4", responsibleId: "u2", description: "" },
  { id: "e3", title: "Зустріч з клієнтом щодо договору", type: "client_meeting", startsAt: at(0, "15:00"), endsAt: at(0, "16:00"), location: "Офіс", caseId: "k6", clientId: "c5", responsibleId: "u1", description: "Обговорити умови відповідальності перевізника." },
  { id: "e4", title: "Подання відповіді на відзив", type: "deadline", startsAt: at(1, "23:59"), location: "", caseId: "k1", clientId: "c1", responsibleId: "u1", description: "", deadlineSource: "Строк встановлено ухвалою суду про відкриття провадження.", isVerified: true },
  { id: "e5", title: "Підписання договору в нотаріуса", type: "client_meeting", startsAt: at(4, "11:00"), endsAt: at(4, "12:30"), location: "Нотаріальна контора (адресу уточнити)", caseId: "k4", clientId: "c2", responsibleId: "u2", description: "" },
  { id: "e6", title: "Дзвінок бухгалтерці клієнта", type: "call", startsAt: at(1, "09:30"), location: "", clientId: "c1", responsibleId: "u2", description: "Уточнити акт звірки." },
  { id: "e7", title: "Судове засідання", type: "hearing", startsAt: at(9, "12:00"), endsAt: at(9, "13:00"), location: "Печерський районний суд міста Києва", caseId: "k7", clientId: "c2", responsibleId: "u1", description: "" },
  { id: "e8", title: "Подання додаткових пояснень", type: "deadline", startsAt: at(10, "23:59"), location: "", caseId: "k3", clientId: "c3", responsibleId: "u1", description: "", deadlineSource: "Дату внесено вручну, потребує перевірки за ухвалою.", isVerified: false },
  { id: "e9", title: "Судове засідання", type: "hearing", startsAt: at(12, "10:00"), endsAt: at(12, "11:00"), location: "Київський окружний адміністративний суд", caseId: "k3", clientId: "c3", responsibleId: "u1", description: "" },
  { id: "e10", title: "Планування тижня", type: "internal", startsAt: at(3, "09:00"), endsAt: at(3, "09:30"), location: "Офіс", responsibleId: "u1", description: "" },
  { id: "e11", title: "Зустріч з клієнткою", type: "client_meeting", startsAt: at(-3, "16:00"), endsAt: at(-3, "17:00"), location: "Офіс", caseId: "k2", clientId: "c4", responsibleId: "u2", description: "" },
];

export const feeAgreements: FeeAgreement[] = [
  { id: "f1", clientId: "c1", caseId: "k1", agreedOn: day(-95), amount: 85_000, description: "Гонорар за ведення справи в суді першої інстанції" },
  { id: "f2", clientId: "c4", caseId: "k2", agreedOn: day(-70), amount: 40_000, description: "Гонорар за ведення справи" },
  { id: "f3", clientId: "c3", caseId: "k3", agreedOn: day(-48), amount: 60_000, description: "Гонорар за оскарження ППР" },
  { id: "f4", clientId: "c2", caseId: "k4", agreedOn: day(-21), amount: 25_000, description: "Супровід угоди" },
  { id: "f5", clientId: "c2", caseId: "k7", agreedOn: day(-33), amount: 30_000, description: "Гонорар за ведення справи" },
  { id: "f6", clientId: "c1", caseId: "k8", agreedOn: day(-240), amount: 18_000, description: "Корпоративний супровід" },
];

export const payments: Payment[] = [
  { id: "pm1", clientId: "c1", caseId: "k1", paidOn: day(-90), amount: 40_000, description: "Аванс" },
  { id: "pm2", clientId: "c1", caseId: "k1", paidOn: day(-30), amount: 20_000, description: "Другий платіж" },
  { id: "pm3", clientId: "c4", caseId: "k2", paidOn: day(-68), amount: 20_000, description: "Аванс 50 %" },
  { id: "pm4", clientId: "c3", caseId: "k3", paidOn: day(-45), amount: 60_000, description: "Оплата в повному обсязі" },
  { id: "pm5", clientId: "c2", caseId: "k4", paidOn: day(-20), amount: 10_000, description: "Аванс" },
  { id: "pm6", clientId: "c1", caseId: "k8", paidOn: day(-185), amount: 18_000, description: "Оплата в повному обсязі" },
  { id: "pm7", clientId: "c2", caseId: "k7", paidOn: day(-7), amount: 15_000, description: "Аванс" },
];

export const expenses: Expense[] = [
  { id: "x1", clientId: "c1", caseId: "k1", incurredOn: day(-94), amount: 12_750, description: "Судовий збір" },
  { id: "x2", clientId: "c3", caseId: "k3", incurredOn: day(-47), amount: 3_028, description: "Судовий збір" },
  { id: "x3", clientId: "c2", caseId: "k4", incurredOn: day(-15), amount: 450, description: "Витяг з реєстру" },
];

export const notes: Note[] = [
  { id: "n1", title: "Позиція щодо позовної давності", content: "Відповідач посилатиметься на сплив строку. Перебіг переривався підписанням акта звірки — знайти оригінал акта.", authorId: "u1", caseId: "k1", createdAt: at(-38, "18:00"), updatedAt: at(-1, "16:20") },
  { id: "n2", title: "Побажання клієнтки", content: "Наполягає на залишенні квартири за собою з компенсацією частки. Готова до мирової угоди.", authorId: "u2", caseId: "k2", createdAt: at(-20, "10:30"), updatedAt: at(-20, "10:30") },
  { id: "n3", title: "Контактна особа", content: "З поточних питань спілкуватися з головною бухгалтеркою, директор у відрядженні до кінця місяця.", authorId: "u1", clientId: "c1", createdAt: at(-8, "09:10"), updatedAt: at(-8, "09:10") },
  { id: "n4", title: "Первинна консультація", content: "Потрібен типовий договір перевезення та окремі умови для міжнародних рейсів. Бюджет обмежений.", authorId: "u1", clientId: "c5", createdAt: at(-9, "16:30"), updatedAt: at(-9, "16:30") },
  { id: "n5", title: "Реєстр: що перевірити", content: "Обтяження, арешти, попередні власники за останні три роки.", authorId: "u2", taskId: "t3", createdAt: at(-4, "11:00"), updatedAt: at(-4, "11:00") },
];

export const activity: ActivityEntry[] = [
  { id: "a1", userId: "u1", action: "Змінено нотатку", entityType: "note", entityId: "n1", entityLabel: "Позиція щодо позовної давності", at: at(-1, "16:20"), caseId: "k1", clientId: "c1" },
  { id: "a2", userId: "u2", action: "Змінено статус справи: «В роботі»", entityType: "case", entityId: "k2", entityLabel: "Поділ майна подружжя", at: at(-1, "10:10"), caseId: "k2", clientId: "c4" },
  { id: "a3", userId: "u2", action: "Завантажено нову версію документа", entityType: "document", entityId: "d6", entityLabel: "Проєкт договору купівлі-продажу", at: at(-2, "12:05"), caseId: "k4", clientId: "c2" },
  { id: "a4", userId: "u1", action: "Створено подію", entityType: "event", entityId: "e9", entityLabel: "Судове засідання", at: at(-3, "09:40"), caseId: "k3", clientId: "c3" },
  { id: "a5", userId: "u1", action: "Створено справу", entityType: "case", entityId: "k6", entityLabel: "Розробка договору перевезення вантажів", at: at(-4, "17:00"), caseId: "k6", clientId: "c5" },
  { id: "a6", userId: "u1", action: "Завантажено документ", entityType: "document", entityId: "d11", entityLabel: "Клопотання про витребування доказів", at: at(-5, "14:30"), caseId: "k7", clientId: "c2" },
  { id: "a7", userId: "u1", action: "Внесено платіж", entityType: "payment", entityId: "pm7", entityLabel: "15 000,00 ₴ — аванс", at: at(-7, "13:00"), caseId: "k7", clientId: "c2" },
  { id: "a8", userId: "u1", action: "Створено клієнта", entityType: "client", entityId: "c5", entityLabel: "ТОВ «Карпати Логістик»", at: at(-9, "15:45"), clientId: "c5" },
  { id: "a9", userId: "u2", action: "Завдання виконано", entityType: "task", entityId: "t8", entityLabel: "Ознайомитися з матеріалами справи в суді", at: at(-10, "17:20"), caseId: "k3", clientId: "c3" },
  { id: "a10", userId: "u1", action: "Запрошено користувача", entityType: "user", entityId: "u2", entityLabel: "Андрій Мельник", at: at(-400, "09:00") },
];

const byId = <T extends { id: string }>(list: T[]) => (id?: string) => (id ? list.find((item) => item.id === id) : undefined);

export const getUser = byId(users);
export const getClient = byId(clients);
export const getCase = byId(cases);
export const getCourt = byId(courts);
export const userName = (id?: string) => getUser(id)?.fullName ?? "—";
