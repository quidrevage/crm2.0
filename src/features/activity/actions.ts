"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dbError, fail, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

const period = z.enum(["all", "30", "90", "365"]);

/** Clears the current workspace's history (all, or entries older than N days). Administrator only. */
export async function clearHistory(input: z.infer<typeof period>): Promise<ActionResult<{ id: string; count: number }>> {
  const user = await requireUser();
  if (user.role !== "admin") return fail("Очищати історію може лише адміністратор.");
  const parsed = period.safeParse(input);
  if (!parsed.success) return fail("Некоректний запит.");
  const before = parsed.data === "all" ? undefined : new Date(Date.now() - Number(parsed.data) * 86_400_000).toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clear_activity_history", before ? { p_before: before } : {});
  if (error) return fail(dbError(error, "Не вдалося очистити історію."));
  revalidatePath("/", "layout");
  return { ok: true, data: { id: user.workspace.id, count: data ?? 0 } };
}
