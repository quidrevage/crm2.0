"use server";

import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SearchHit = { kind: "client" | "case" | "document" | "task" | "court"; id: string; label: string; sublabel: string | null };

/** Database search over names and numbers (not file contents). Row-level security applies. */
export async function globalSearch(query: string): Promise<SearchHit[]> {
  const user = await getSessionUser();
  const q = query.trim().slice(0, 100);
  if (!user || q.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_global", { q, max_per_kind: 6 });
  if (error) {
    console.error("[search]", error.message);
    return [];
  }
  return (data ?? []) as SearchHit[];
}
