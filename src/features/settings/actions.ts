"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dbError, fail, refreshAll, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

/** The editable reference lists. The database allows changes only for the administrator. */
const refTable = z.enum(["practice_areas", "matter_types", "case_statuses", "party_roles", "document_categories"]);
export type RefTable = z.infer<typeof refTable>;

const refInput = z.object({
  table: refTable,
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Вкажіть назву").max(120),
  isActive: z.boolean(),
  isClosed: z.boolean().optional(),
});

export async function saveRefItem(input: z.infer<typeof refInput>): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "admin") return fail("Довідники може змінювати лише адміністратор.");
  const parsed = refInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { table, id, name, isActive, isClosed } = parsed.data;
  const supabase = await createClient();
  const values: Record<string, unknown> = { name, is_active: isActive };
  if (table === "case_statuses" && isClosed !== undefined) values.is_closed = isClosed;

  if (id) {
    const { data, error } = await supabase.from(table).update(values as never).eq("id", id).select("id");
    if (error) return fail(dbError(error));
    if (!data?.length) return fail("Значення не знайдено.");
  } else {
    const { data: last } = await supabase.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
    values.sort_order = (last?.[0]?.sort_order ?? 0) + 10;
    const { error } = await supabase.from(table).insert(values as never);
    if (error) return fail(dbError(error));
  }
  refreshAll();
  return { ok: true, data: { id: id ?? "" } };
}

const financeInput = z.enum(["none", "read", "write"]);

export async function setMemberFinanceAccess(value: z.infer<typeof financeInput>): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "admin") return fail("Ця дія доступна лише адміністратору.");
  const parsed = financeInput.safeParse(value);
  if (!parsed.success) return fail("Некоректне значення.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspaces").update({ member_finance_access: parsed.data }).eq("id", user.workspace.id).select("id");
  if (error || !data?.length) return fail(dbError(error));
  refreshAll();
  return { ok: true, data: { id: "settings" } };
}

const memberErrors: Record<string, string> = {
  LAST_ADMIN: "У робочому просторі має залишитися хоча б один адміністратор.",
  USER_LIMIT_REACHED: "Усі місця в робочому просторі зайнято. Спершу вимкніть доступ іншому учаснику.",
};

const userInput = z.object({ id: z.uuid(), role: z.enum(["admin", "member"]).optional(), isActive: z.boolean().optional() });

/** Role and activation changes. The database also blocks removing the last administrator and exceeding the seat limit. */
export async function updateUserAccess(input: z.infer<typeof userInput>): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "admin") return fail("Ця дія доступна лише адміністратору.");
  const parsed = userInput.safeParse(input);
  if (!parsed.success) return fail("Некоректний запит.");
  if (parsed.data.id === user.id && parsed.data.isActive === false) return fail("Не можна деактивувати власний обліковий запис.");
  const values: Record<string, unknown> = {};
  if (parsed.data.role) values.role = parsed.data.role;
  if (parsed.data.isActive !== undefined) values.is_active = parsed.data.isActive;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .update(values as never)
    .eq("workspace_id", user.workspace.id)
    .eq("user_id", parsed.data.id)
    .select("user_id");
  if (error) return fail(memberErrors[error.message] ?? dbError(error));
  if (!data?.length) return fail("Користувача не знайдено.");
  refreshAll();
  return { ok: true, data: { id: parsed.data.id } };
}
