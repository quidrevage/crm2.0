import { History, StickyNote } from "lucide-react";
import { Avatar, EmptyState, Stat } from "@/components/ui/display";
import { formatDateTime } from "@/lib/dates";
import type { FinanceTotals } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { getCase, getClient, tasks, userName } from "@/mocks/data";
import type { ActivityEntry, Note } from "@/types/domain";
import { CaseLink, ClientLink } from "./common";

function NoteTarget({ note }: { note: Note }) {
  if (note.caseId && getCase(note.caseId)) return <CaseLink id={note.caseId} withNumber />;
  if (note.clientId && getClient(note.clientId)) return <ClientLink id={note.clientId} />;
  const task = tasks.find((t) => t.id === note.taskId);
  return task ? <span>Завдання: {task.title}</span> : null;
}

export function NotesList({ rows, showTarget = true }: { rows: Note[]; showTarget?: boolean }) {
  if (rows.length === 0) {
    return <EmptyState icon={<StickyNote className="h-6 w-6" />} title="Нотаток немає" hint="Нотатки бачать лише користувачі системи." />;
  }
  return (
    <ul className="divide-y divide-line">
      {rows.map((note) => (
        <li key={note.id} className="px-4 py-3">
          <p className="text-sm font-medium">{note.title}</p>
          <p className="mt-1 max-w-[75ch] text-sm whitespace-pre-line text-fg/90">{note.content}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
            <span>{userName(note.authorId)}</span>
            <span className="num">{formatDateTime(note.updatedAt)}</span>
            {showTarget && <NoteTarget note={note} />}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ActivityList({ rows }: { rows: ActivityEntry[] }) {
  if (rows.length === 0) return <EmptyState icon={<History className="h-6 w-6" />} title="Дій ще не зафіксовано" />;
  return (
    <ul className="divide-y divide-line">
      {rows.map((entry) => (
        <li key={entry.id} className="flex gap-2.5 px-4 py-2.5">
          <Avatar name={userName(entry.userId)} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">{userName(entry.userId)}</span>
              <span className="text-muted"> · {entry.action}</span>
            </p>
            <p className="truncate text-[13px]">{entry.entityLabel}</p>
          </div>
          <span className="num shrink-0 text-xs whitespace-nowrap text-muted">{formatDateTime(entry.at)}</span>
        </li>
      ))}
    </ul>
  );
}

export function FinanceSummary({ totals }: { totals: FinanceTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Погоджені гонорари" value={formatMoney(totals.agreed)} />
      <Stat label="Отримано" value={formatMoney(totals.received)} />
      <Stat label="До сплати клієнтами" value={formatMoney(totals.outstanding)} />
      <Stat label="Витрати у справах" value={formatMoney(totals.expenses)} />
    </div>
  );
}
