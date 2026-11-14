/**
 * Date helpers. All calendar days are handled as "YYYY-MM-DD" keys in Europe/Kyiv,
 * so results do not depend on the device time zone.
 */
export const TZ = "Europe/Kyiv";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function kyivParts(value: Date | string) {
  const out: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(new Date(value))) out[p.type] = p.value;
  return out;
}

/** Kyiv calendar day of a timestamp (or the key itself if already a day key). */
export function dayKey(value: Date | string = new Date()): string {
  if (typeof value === "string" && DAY_KEY.test(value)) return value;
  const p = kyivParts(value);
  return `${p.year}-${p.month}-${p.day}`;
}

export function shiftKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function shiftMonth(key: string, months: number): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 10);
}

export function monthStart(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

/** Monday = 0 … Sunday = 6. */
export function weekdayIndex(key: string): number {
  return (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function weekStart(key: string): string {
  return shiftKey(key, -weekdayIndex(key));
}

/** 42 day keys (6 weeks, Monday first) covering the month of `key`. */
export function monthGrid(key: string): string[] {
  const start = weekStart(monthStart(key));
  return Array.from({ length: 42 }, (_, i) => shiftKey(start, i));
}

/** DD.MM.YYYY */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const [y, m, d] = dayKey(value).split("-");
  return `${d}.${m}.${y}`;
}

/** HH:MM in Kyiv */
export function formatTime(value: string): string {
  const p = kyivParts(value);
  return `${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/** Parses DD.MM.YYYY typed by a user into a day key, or null if invalid. */
export function parseDisplayDate(text: string): string | null {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const key = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key ? key : null;
}

const offsetFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, timeZoneName: "longOffset" });

/** ISO timestamp for a Kyiv wall-clock day + "HH:MM". */
export function kyivIso(key: string, time: string): string {
  const guess = new Date(`${key}T${time}:00Z`);
  const name = offsetFmt.formatToParts(guess).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const offset = name.replace("GMT", "") || "+00:00";
  return `${key}T${time}:00${offset}`;
}

export const MONTHS = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
];

export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
export const WEEKDAYS_LONG = ["понеділок", "вівторок", "середа", "четвер", "п’ятниця", "субота", "неділя"];

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
