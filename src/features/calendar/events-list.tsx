import { CalendarDays, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/display";
import { eventTypeLabel, eventTypeTone } from "@/i18n/uk";
import { dayKey, formatTime, WEEKDAYS_SHORT, weekdayIndex } from "@/lib/dates";
import type { CalendarEvent } from "@/types/domain";
import { CaseLink } from "../common";

export function VerifiedBadge({ event }: { event: CalendarEvent }) {
  if (event.type !== "deadline") return null;
  return event.isVerified ? (
    <Badge tone="success">
      <ShieldCheck className="mr-1 h-3 w-3" />
      Перевірено
    </Badge>
  ) : (
    <Badge tone="warning">
      <ShieldAlert className="mr-1 h-3 w-3" />
      Не перевірено
    </Badge>
  );
}

/** Read-only chronological list used on the dashboard and in record tabs. */
export function EventsList({ rows, showCase = true, emptyTitle = "Подій немає" }: { rows: CalendarEvent[]; showCase?: boolean; emptyTitle?: string }) {
  if (rows.length === 0) return <EmptyState icon={<CalendarDays className="h-6 w-6" />} title={emptyTitle} />;
  const sorted = [...rows].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return (
    <ul className="divide-y divide-line">
      {sorted.map((event) => {
        const key = dayKey(event.startsAt);
        return (
          <li key={event.id} className="flex gap-3 px-4 py-2.5">
            <div className="num w-12 shrink-0 text-center leading-tight">
              <span className="block text-base font-semibold">{key.slice(8)}.{key.slice(5, 7)}</span>
              <span className="block text-xs text-muted">{WEEKDAYS_SHORT[weekdayIndex(key)]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                <span className="num text-muted">{formatTime(event.startsAt)}</span> {event.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                <Badge tone={eventTypeTone[event.type]}>{eventTypeLabel[event.type]}</Badge>
                <VerifiedBadge event={event} />
                {event.location && <span>{event.location}</span>}
                {showCase && event.caseId && <CaseLink id={event.caseId} />}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
