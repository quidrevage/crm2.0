"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dbError, fail, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

const name = z.string().trim().min(2, "Вкажіть назву щонайменше з 2 символів.").max(120, "Назва задовга.");

/** Switches the whole interface to another workspace the person is a member of. */
export async function switchWorkspace(workspaceId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!z.uuid().safeParse(workspaceId).success) return fail("Некоректний запит.");
  if (!user.workspaces.some((w) => w.id === workspaceId)) return fail("Ви не є учасником цього робочого простору.");
  const supabase = await createClient();
  // The database also refuses a workspace without an active membership.
  const { error } = await supabase.from("profiles").update({ current_workspace_id: workspaceId }).eq("id", user.id);
  if (error) return fail(dbError(error));
  revalidatePath("/", "layout");
  return { ok: true, data: { id: workspaceId } };
}

/** Creates a new, empty workspace (with default reference lists) and switches to it. */
export async function createWorkspace(input: { name: string }): Promise<ActionResult> {
  await requireUser();
  const parsed = name.safeParse(input.name);
  if (!parsed.success) return fail(parsed.error.issues[0].message, { fieldErrors: { name: parsed.error.issues[0].message } });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workspace", { p_name: parsed.data });
  if (error || !data) return fail(dbError(error, "Не вдалося створити робочий простір."));
  revalidatePath("/", "layout");
  return { ok: true, data: { id: data } };
}

const settingsInput = z.object({
  name,
  maxUploadMb: z.coerce.number().int().min(1, "Від 1 до 50 МБ").max(50, "Від 1 до 50 МБ"),
});

/** Name and upload limit of the current workspace. Administrator only (enforced by the database). */
export async function updateWorkspace(input: z.input<typeof settingsInput>): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "admin") return fail("Ця дія доступна лише адміністратору.");
  const parsed = settingsInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update({ name: parsed.data.name, max_upload_mb: parsed.data.maxUploadMb })
    .eq("id", user.workspace.id)
    .select("id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("Недостатньо прав для цієї дії.");
  revalidatePath("/", "layout");
  return { ok: true, data: { id: user.workspace.id } };
}
