"use client";

import Link from "next/link";
import { History, Pencil, StickyNote } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Avatar, EmptyState, Stat } from "@/components/ui/display";
import { clientStatusLabel, taskStatusLabel } from "@/i18n/uk";
import { formatDateTime } from "@/lib/dates";
import type { FinanceTotals } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import type { ActivityEntry, Note } from "@/types/domain";
import { CaseLink, ClientLink } from "./common";
import { editNote } from "./form-values";
import { useLookups } from "./lookups/context";
import { useRecordForm } from "./quick-create";
import { ArchiveButton } from "./record-actions";

function NoteTarget({ note }: { note: Note }) {
  if (note.caseId) return <CaseLink id={note.caseId} withNumber />;
  if (note.clientId) return <ClientLink id={note.clientId} />;
  if (note.taskId) return <Link href="/tasks?status=all" className="hover:text-accent hover:underline">До завдання</Link>;
  return null;
}

export function NotesList({ rows, showTarget = true, empty }: { rows: Note[]; showTarget?: boolean; empty?: React.ReactNode }) {
  const { userName, me } = useLookups();
  const form = useRecordForm();
  if (rows.length === 0) {
    return <>{empty ?? <EmptyState icon={<StickyNote className="h-6 w-6" />} title="Нотаток немає" hint="Нотатки бачать лише користувачі системи." />}</>;
  }
  return (
    <ul className="divide-y divide-line">
      {rows.map((note) => {
        const canEdit = me.role === "admin" || note.authorId === me.id;
        return (
          <li key={note.id} className="group px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{note.title}</p>
              {canEdit && (
                <span className="flex shrink-0 items-center gap-1">
                  <IconButton label="Редагувати нотатку" onClick={() => form.open("note", editNote(note))}>
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <ArchiveButton
                    table="notes"
                    id={note.id}
                    archivedAt={null}
                    size="sm"
                    confirmTitle="Перемістити нотатку до архіву?"
                    confirmMessage="Нотатка зникне зі списків, але її можна буде відновити з архіву на сторінці «Нотатки»."
                  />
                </span>
              )}
            </div>
            <p className="mt-1 max-w-[75ch] text-sm whitespace-pre-line text-fg/90">{note.content}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
              <span>{userName(note.authorId)}</span>
              <span className="num">{formatDateTime(note.updatedAt)}</span>
              {showTarget && <NoteTarget note={note} />}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

const entityNames: Record<string, { noun: string; href?: (e: ActivityEntry) => string | undefined }> = {
  clients: { noun: "клієнта", href: (e) => `/clients/${e.entityId}` },
  client_contacts: { noun: "контактну особу", href: (e) => e.clientId && `/clients/${e.clientId}` },
  cases: { noun: "справу", href: (e) => `/cases/${e.entityId}` },
  case_parties: { noun: "учасника справи", href: (e) => e.caseId && `/cases/${e.caseId}` },
  courts: { noun: "суд", href: () => "/courts" },
  documents: { noun: "документ", href: (e) => `/documents/${e.entityId}` },
  document_versions: { noun: "версію документа", href: (e) => e.documentId && `/documents/${e.documentId}` },
  tasks: { noun: "завдання", href: () => "/tasks?status=all" },
  events: { noun: "подію", href: () => "/calendar" },
  fee_agreements: { noun: "домовленість про гонорар", href: () => "/finance" },
  payments: { noun: "платіж", href: () => "/finance?tab=payments" },
  expenses: { noun: "витрату", href: () => "/finance?tab=expenses" },
  notes: { noun: "нотатку", href: () => "/notes" },
  profiles: { noun: "профіль користувача", href: () => "/settings" },
  app_settings: { noun: "налаштування", href: () => "/settings" },
  user_invitations: { noun: "запрошення", href: () => "/settings" },
};

const verbs: Record<string, string> = {
  created: "Створено",
  updated: "Змінено",
  archived: "До архіву:",
  restored: "Відновлено",
  deleted: "Видалено",
};

/** Turns an audit entry into a readable Ukrainian sentence, e.g. "Змінено статус завдання: Нове → Виконано". */
export function describeActivity(e: ActivityEntry, statusName: (id?: string) => string | undefined): string {
  const noun = entityNames[e.entityType]?.noun ?? "запис";
  if (e.entityType === "document_versions" && e.action === "created") return "Завантажено файл документа";
  if (e.entityType === "user_invitations" && e.action === "created") return "Надіслано запрошення користувачу";
  const status = e.changes.status;
  if (e.action === "updated" && status && "new" in status) {
    const label = (v: unknown) =>
      (e.entityType === "tasks" ? taskStatusLabel : clientStatusLabel)[v as keyof typeof taskStatusLabel & keyof typeof clientStatusLabel] ?? String(v);
    return `Змінено статус ${e.entityType === "tasks" ? "завдання" : "клієнта"}: ${label(status.old)} → ${label(status.new)}`;
  }
  const statusId = e.changes.status_id;
  if (e.action === "updated" && statusId && "new" in statusId) {
    return `Змінено статус справи: ${statusName(statusId.old as string) ?? "—"} → ${statusName(statusId.new as string) ?? "—"}`;
  }
  if (e.action === "updated" && e.changes.role) return "Змінено роль користувача";
  if (e.action === "updated" && e.changes.is_active) return e.changes.is_active.new ? "Користувача активовано" : "Користувача деактивовано";
  return `${verbs[e.action] ?? e.action} ${noun}`;
}

export function ActivityList({ rows, empty }: { rows: ActivityEntry[]; empty?: React.ReactNode }) {
  const { userName, statusOf } = useLookups();
  if (rows.length === 0) return <>{empty ?? <EmptyState icon={<History className="h-6 w-6" />} title="Дій ще не зафіксовано" />}</>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((entry) => {
        const href = entry.action !== "deleted" ? entityNames[entry.entityType]?.href?.(entry) : undefined;
        const actor = entry.actorId ? userName(entry.actorId) : "Система";
        return (
          <li key={entry.id} className="flex gap-2.5 px-4 py-2.5">
            <Avatar name={actor} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{actor}</span>
                <span className="text-muted"> · {describeActivity(entry, (id) => statusOf(id)?.name)}</span>
              </p>
              {entry.label &&
                (href ? (
                  <Link href={href} className="block truncate text-[13px] hover:text-accent hover:underline">
                    {entry.label}
                  </Link>
                ) : (
                  <p className="truncate text-[13px]">{entry.label}</p>
                ))}
            </div>
            <span className="num shrink-0 text-xs whitespace-nowrap text-muted">{formatDateTime(entry.at)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function FinanceSummary({ totals }: { totals: FinanceTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Погоджені гонорари" value={formatMoney(totals.agreed)} />
      <Stat label="Отримано" value={formatMoney(totals.received)} />
      <Stat label="До сплати клієнтами" value={formatMoney(Math.max(0, totals.outstanding))} tone={totals.outstanding > 0 ? "warning" : undefined} />
      <Stat label="Витрати у справах" value={formatMoney(totals.expenses)} />
    </div>
  );
}
