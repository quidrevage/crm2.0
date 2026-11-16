import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { clientStatusLabel, clientTypeLabel, taskPriorityLabel, taskStatusLabel } from "@/i18n/uk";

type Cell = string | number | null | undefined;

/** Excel in Ukrainian locale expects ";" and recognises UTF-8 by the byte-order mark. */
function toCsv(header: string[], rows: Cell[][]) {
  const esc = (v: Cell) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Leading =,+,-,@ would be run as a formula by spreadsheet apps.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}

const MAX_ROWS = 10_000;

/**
 * Downloads a list of the current workspace as CSV. Runs as the signed-in user, so row-level
 * security decides what is included, exactly as on screen.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { kind } = await params;
  const supabase = await createClient();

  const [{ data: members }, { data: clients }] = await Promise.all([
    supabase.from("workspace_members").select("profile:profiles (id, full_name, email)").eq("workspace_id", user.workspace.id),
    supabase.from("clients").select("id, name").limit(MAX_ROWS),
  ]);
  const person = new Map((members ?? []).filter((m) => m.profile).map((m) => [m.profile!.id, m.profile!.full_name || m.profile!.email]));
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const who = (id: string | null) => (id ? (person.get(id) ?? "") : "");

  let header: string[];
  let rows: Cell[][];
  if (kind === "clients") {
    const { data, error } = await supabase.from("clients").select("*").is("archived_at", null).order("name").limit(MAX_ROWS);
    if (error) return new NextResponse("Error", { status: 500 });
    header = ["Номер", "Назва / ПІБ", "Тип", "Статус", "РНОКПП", "ЄДРПОУ", "Представник", "Телефон", "Email", "Адреса", "Відповідальний", "Створено"];
    rows = data.map((c) => [
      c.client_number, c.name, clientTypeLabel[c.client_type], clientStatusLabel[c.status], c.rnokpp, c.edrpou, c.representative,
      c.phone, c.email, c.address, who(c.assigned_to), formatDate(c.created_at),
    ]);
  } else if (kind === "cases") {
    const [{ data, error }, { data: statuses }, { data: courts }] = await Promise.all([
      supabase.from("cases").select("*").is("archived_at", null).order("case_number").limit(MAX_ROWS),
      supabase.from("case_statuses").select("id, name"),
      supabase.from("courts").select("id, name").limit(5000),
    ]);
    if (error) return new NextResponse("Error", { status: 500 });
    const status = new Map((statuses ?? []).map((s) => [s.id, s.name]));
    const court = new Map((courts ?? []).map((s) => [s.id, s.name]));
    header = ["Номер", "Назва", "Клієнт", "Статус", "Відповідальний", "Судова", "Суд", "№ судової справи", "Суддя", "Інша сторона", "Відкрито", "Наступна дата", "Закрито"];
    rows = data.map((k) => [
      k.case_number, k.title, clientName.get(k.client_id) ?? "", status.get(k.status_id) ?? "", who(k.responsible_id),
      k.is_litigation ? "так" : "ні", k.court_id ? (court.get(k.court_id) ?? "") : "", k.court_case_number, k.judge, k.opposing_party,
      formatDate(k.opened_on), k.next_important_date ? formatDate(k.next_important_date) : "", k.closed_on ? formatDate(k.closed_on) : "",
    ]);
  } else if (kind === "tasks") {
    const [{ data, error }, { data: cases }] = await Promise.all([
      supabase.from("tasks").select("*").is("archived_at", null).order("due_date", { nullsFirst: false }).limit(MAX_ROWS),
      supabase.from("cases").select("id, case_number, title").limit(MAX_ROWS),
    ]);
    if (error) return new NextResponse("Error", { status: 500 });
    const caseName = new Map((cases ?? []).map((k) => [k.id, `${k.case_number} ${k.title}`]));
    header = ["Завдання", "Статус", "Пріоритет", "Виконавець", "Строк", "Клієнт", "Справа", "Виконано"];
    rows = data.map((t) => [
      t.title, taskStatusLabel[t.status], taskPriorityLabel[t.priority], who(t.assigned_to), t.due_date ? formatDate(t.due_date) : "",
      t.client_id ? (clientName.get(t.client_id) ?? "") : "", t.case_id ? (caseName.get(t.case_id) ?? "") : "",
      t.completed_at ? formatDate(t.completed_at) : "",
    ]);
  } else {
    return new NextResponse("Not found", { status: 404 });
  }

  const names: Record<string, string> = { clients: "klienty", cases: "spravy", tasks: "zavdannia" };
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${names[kind]}-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
