"use client";

import { Bell, CalendarDays, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/display";
import { eventTypeLabel, eventTypeTone } from "@/i18n/uk";
import { dayKey, formatTime, WEEKDAYS_SHORT, weekdayIndex } from "@/lib/dates";
import type { CalendarEvent } from "@/types/domain";
import { CaseLink } from "../common";
import { editEvent } from "../form-values";
import { useRecordForm } from "../quick-create";

export function VerifiedBadge({ event }: { event: Pick<CalendarEvent, "type" | "isVerified"> }) {
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

/** Chronological list used on the dashboard and on record pages; a click opens the event. */
export function EventsList({ rows, showCase = true, emptyTitle = "Подій немає", empty }: { rows: CalendarEvent[]; showCase?: boolean; emptyTitle?: string; empty?: React.ReactNode }) {
  const form = useRecordForm();
  if (rows.length === 0) return <>{empty ?? <EmptyState icon={<CalendarDays className="h-6 w-6" />} title={emptyTitle} />}</>;
  const sorted = [...rows].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const today = dayKey();
  return (
    <ul className="divide-y divide-line">
      {sorted.map((event) => {
        const key = dayKey(event.startsAt);
        const past = key < today;
        return (
          <li key={event.id} className={past ? "opacity-60" : undefined}>
            <div className="flex gap-3 px-4 py-2.5">
              <div className="num w-12 shrink-0 text-center leading-tight">
                <span className="block text-base font-semibold">
                  {key.slice(8)}.{key.slice(5, 7)}
                </span>
                <span className="block text-xs text-muted">{WEEKDAYS_SHORT[weekdayIndex(key)]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => form.open("event", editEvent(event, event.reminder))}
                  className="text-left text-sm font-medium hover:text-accent hover:underline"
                >
                  <span className="num text-muted">{formatTime(event.startsAt)}</span> {event.title}
                </button>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                  <Badge tone={eventTypeTone[event.type]}>{eventTypeLabel[event.type]}</Badge>
                  <VerifiedBadge event={event} />
                  {event.reminder && <Bell aria-label="Є нагадування" className="h-3.5 w-3.5" />}
                  {event.location && <span>{event.location}</span>}
                  {showCase && event.caseId && <CaseLink id={event.caseId} />}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
