import "server-only";
import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ZodError } from "zod";
import type { Database } from "@/types/database";
import type { ServerClient } from "./supabase/server";

/** What every mutation returns to the browser. Nothing is reported as saved unless the database confirmed it. */
export type ActionResult<T = { id: string }> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; conflict?: boolean };

export const CONFLICT_MESSAGE =
  "Цей запис щойно змінив інший користувач. Закрийте форму, перегляньте актуальні дані та внесіть зміни ще раз.";

export function fail(error: string, extra?: { fieldErrors?: Record<string, string>; conflict?: boolean }): ActionResult<never> {
  return { ok: false, error, ...extra };
}

export function invalid(error: ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return fail("Перевірте виділені поля.", { fieldErrors });
}

const knownErrors: Record<string, string> = {
  USER_LIMIT_REACHED: "Досягнуто ліміту користувачів.",
  ADMIN_REQUIRED: "Ця дія доступна лише адміністратору.",
  LAST_ADMIN: "У робочому просторі має залишатися хоча б один активний адміністратор.",
  ALREADY_MEMBER: "Ця людина вже є учасником робочого простору.",
  NOT_A_MEMBER: "Ви не є учасником цього робочого простору.",
  INVALID_COURT: "Обраний суд недоступний у цьому робочому просторі.",
  USER_LIMIT_BELOW_ACTIVE: "Ліміт не може бути меншим за кількість активних учасників.",
  WORKSPACE_LIMIT_REACHED: "Досягнуто ліміту робочих просторів, якими ви можете керувати.",
  INVITATION_REQUIRED: "Обліковий запис можна створити лише за запрошенням.",
  INVALID_STORAGE_PATH: "Файл збережено в неправильному місці. Спробуйте завантажити ще раз.",
};

/** Translates a database error into a message safe to show (no SQL or internal details). */
export function dbError(error: PostgrestError | null | undefined, fallback = "Не вдалося зберегти зміни. Спробуйте ще раз."): string {
  if (!error) return fallback;
  for (const [code, message] of Object.entries(knownErrors)) {
    if (error.message?.includes(code)) return message;
  }
  switch (error.code) {
    case "42501":
      return "Недостатньо прав для цієї дії.";
    case "23503":
      return "Пов’язаний запис не знайдено або його використовують інші записи.";
    case "23505":
      return "Такий запис уже існує.";
    case "23514":
      return "Дані не пройшли перевірку. Перевірте заповнені поля.";
    default:
      console.error("[db]", error.code, error.message);
      return fallback;
  }
}

/** Empty form strings become NULL in the database. */
export const orNull = (value: string | undefined | null) => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

export const moneyValue = (value: string) => Number(value.replace(/\s/g, "").replace(",", "."));

type TableName = keyof Database["public"]["Tables"];

/**
 * Optimistic-locking update: succeeds only if nobody saved the row since the form was opened.
 * Returns a conflict instead of silently overwriting the other user's changes.
 */
export async function versionedUpdate(
  supabase: ServerClient,
  table: TableName,
  id: string,
  rowVersion: number | undefined,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  // Table names are a union here, which the typed builder cannot express; columns are checked at runtime.
  type Filter = { eq: (column: string, value: unknown) => Filter; select: (columns: string) => PromiseLike<{ data: unknown[] | null; error: PostgrestError | null }> };
  let query = (supabase.from(table) as unknown as { update: (v: unknown) => Filter }).update(values).eq("id", id);
  if (rowVersion !== undefined) query = query.eq("row_version", rowVersion);
  const { data, error } = await query.select("id");
  if (error) return fail(dbError(error));
  if (!data || data.length === 0) {
    const { data: exists } = await supabase.from(table).select("id").eq("id", id).maybeSingle();
    return exists
      ? fail(CONFLICT_MESSAGE, { conflict: true })
      : fail("Запис не знайдено або у вас немає прав на його зміну.");
  }
  return { ok: true, data: { id } };
}

/** All screens read from the same data, so a change refreshes every page. */
export function refreshAll() {
  revalidatePath("/", "layout");
}
