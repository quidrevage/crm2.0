"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Card, DetailList, EmptyState } from "@/components/ui/display";
import { Modal } from "@/components/ui/overlay";
import { eventTypeLabel } from "@/i18n/uk";
import { cn } from "@/lib/cn";
import {
  dayKey, formatDate, formatTime, monthGrid, monthLabel, monthStart, shiftKey, shiftMonth, WEEKDAYS_LONG,
  WEEKDAYS_SHORT, weekdayIndex, weekStart,
} from "@/lib/dates";
import type { CalendarEvent, EventType } from "@/types/domain";
import { ArchiveButton } from "../record-actions";
import { CaseLink, ClientLink, FilterBar, UrlSelect, UserCell, labelOptions, useUrlFilters } from "../common";
import { editEvent } from "../form-values";
import { useLookups } from "../lookups/context";
import { useRecordForm } from "../quick-create";
import { REMINDER_OPTIONS } from "../schemas";
import { VerifiedBadge } from "./events-list";
import type { CalendarMode } from "./range";

const views: Array<{ id: CalendarMode; label: string }> = [
  { id: "month", label: "Місяць" },
  { id: "week", label: "Тиждень" },
  { id: "agenda", label: "Список" },
];

const dot: Record<EventType, string> = {
  hearing: "bg-accent", deadline: "bg-danger", client_meeting: "bg-success",
  call: "bg-muted", internal: "bg-muted", other: "bg-muted",
};

function EventChip({ event, onOpen }: { event: CalendarEvent; onOpen: (e: CalendarEvent) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      title={event.title}
      className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-subtle"
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot[event.type])} />
      <span className="num shrink-0 text-muted">{formatTime(event.startsAt)}</span>
      <span className="truncate">{event.title}</span>
    </button>
  );
}

function DayRows({ events, onOpen }: { events: CalendarEvent[]; onOpen: (e: CalendarEvent) => void }) {
  return (
    <ul className="divide-y divide-line">
      {events.map((event) => (
        <li key={event.id}>
          <button type="button" onClick={() => onOpen(event)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-bg">
            <span className="num w-11 shrink-0 text-sm text-muted">{formatTime(event.startsAt)}</span>
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot[event.type])} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{event.title}</span>
              <span className="block text-[13px] text-muted">
                {eventTypeLabel[event.type]}
                {event.location && ` · ${event.location}`}
              </span>
            </span>
            {event.reminder && <Bell aria-label="Є нагадування" className="mt-1 h-3.5 w-3.5 text-muted" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

type CalendarViewProps = { events: CalendarEvent[]; view: CalendarMode; anchor: string };

export function CalendarView({ events, view, anchor }: CalendarViewProps) {
  const today = dayKey();
  const form = useRecordForm();
  const filters = useUrlFilters();
  const { users } = useLookups();
  const [selected, setSelected] = useState(anchor);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

  useEffect(() => setSelected(anchor), [anchor]);

  // Phones open on the list view the first time, where nothing is squeezed into a grid.
  useEffect(() => {
    if (!filters.get("view") && window.matchMedia("(max-width: 639px)").matches) filters.set({ view: "agenda" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
      const key = dayKey(event.startsAt);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  // Keep an open detail in sync when the event changes (e.g. edited by the other user).
  const current = detail ? events.find((e) => e.id === detail.id) ?? null : null;

  const week = Array.from({ length: 7 }, (_, i) => shiftKey(weekStart(anchor), i));
  const agendaDays = Array.from({ length: 30 }, (_, i) => shiftKey(anchor, i)).filter((key) => byDay.has(key));

  const title =
    view === "month" ? monthLabel(anchor)
    : view === "week" ? `${formatDate(week[0])} – ${formatDate(week[6])}`
    : `${formatDate(anchor)} – ${formatDate(shiftKey(anchor, 29))}`;

  const go = (next: string) => filters.set({ d: next === today ? null : next });
  function step(direction: 1 | -1) {
    if (view === "month") go(shiftMonth(monthStart(anchor), direction));
    else go(shiftKey(anchor, (view === "week" ? 7 : 30) * direction));
  }

  const newOn = (key: string) => form.open("event", { values: { date: key } });
  const selectedEvents = byDay.get(selected) ?? [];

  return (
    <>
      <Card flush>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
          <div className="flex items-center gap-1">
            <IconButton label="Назад" onClick={() => step(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <IconButton label="Вперед" onClick={() => step(1)}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
            <Button size="sm" onClick={() => go(today)}>
              Сьогодні
            </Button>
            <h2 className={cn("num ml-2 text-sm font-semibold transition-opacity", filters.pending && "opacity-50")}>{title}</h2>
          </div>
          <div role="tablist" aria-label="Вигляд календаря" className="flex rounded-md border border-line-strong p-0.5">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => filters.set({ view: v.id === "month" ? null : v.id })}
                className={cn(
                  "h-8 rounded px-2.5 text-[13px] sm:h-7",
                  view === v.id ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-fg",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <FilterBar>
          <UrlSelect param="responsible" label="Відповідальний" options={users.map((u) => ({ value: u.id, label: u.fullName }))} />
          <UrlSelect param="type" label="Тип" options={labelOptions(eventTypeLabel)} />
        </FilterBar>

        {view === "month" && (
          <>
            <div className="grid grid-cols-7 border-b border-line text-center text-xs text-muted">
              {WEEKDAYS_SHORT.map((d) => (
                <span key={d} className="py-1.5">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid(anchor).map((key, i) => {
                const dayEvents = byDay.get(key) ?? [];
                const outside = key.slice(0, 7) !== anchor.slice(0, 7);
                return (
                  <div
                    key={key}
                    onDoubleClick={() => newOn(key)}
                    className={cn(
                      "min-h-14 border-line p-1 sm:min-h-24",
                      i % 7 !== 6 && "border-r",
                      i < 35 && "border-b",
                      outside && "bg-bg",
                      key === selected && "bg-accent-soft/60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(key)}
                      aria-label={`${formatDate(key)}, подій: ${dayEvents.length}`}
                      aria-pressed={key === selected}
                      className={cn(
                        "num mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[13px] hover:bg-subtle sm:mx-0 sm:h-6 sm:w-6",
                        outside && "text-muted/70",
                        key === today && "bg-accent font-semibold text-white hover:bg-accent-hover",
                      )}
                    >
                      {Number(key.slice(8))}
                    </button>
                    <div className="mt-0.5 hidden sm:block">
                      {dayEvents.slice(0, 3).map((event) => (
                        <EventChip key={event.id} event={event} onOpen={setDetail} />
                      ))}
                      {dayEvents.length > 3 && (
                        <button type="button" onClick={() => setSelected(key)} className="px-1 text-xs text-muted hover:text-fg">
                          ще {dayEvents.length - 3}
                        </button>
                      )}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex justify-center gap-0.5 sm:hidden">
                        {dayEvents.slice(0, 4).map((event) => (
                          <span key={event.id} className={cn("h-1.5 w-1.5 rounded-full", dot[event.type])} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-line">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <p className="text-[13px] font-medium">
                  {formatDate(selected)}, {WEEKDAYS_LONG[weekdayIndex(selected)]}
                </p>
                <Button size="sm" variant="ghost" onClick={() => newOn(selected)}>
                  <Plus className="h-4 w-4" />
                  Подія на цей день
                </Button>
              </div>
              {selectedEvents.length > 0 ? (
                <DayRows events={selectedEvents} onOpen={setDetail} />
              ) : (
                <p className="px-4 pt-1 pb-4 text-[13px] text-muted">На цей день подій не заплановано.</p>
              )}
            </div>
          </>
        )}

        {view === "week" && (
          <div className="grid divide-y divide-line lg:grid-cols-7 lg:divide-x lg:divide-y-0">
            {week.map((key) => {
              const dayEvents = byDay.get(key) ?? [];
              return (
                <div key={key} className="min-w-0 p-2 lg:min-h-72">
                  <button
                    type="button"
                    onClick={() => newOn(key)}
                    title="Додати подію на цей день"
                    className={cn("num mb-1 rounded px-1 text-[13px] hover:bg-subtle", key === today ? "font-semibold text-accent" : "text-muted")}
                  >
                    {WEEKDAYS_SHORT[weekdayIndex(key)]}, {key.slice(8)}.{key.slice(5, 7)}
                  </button>
                  {dayEvents.length === 0 ? (
                    <p className="px-1 text-xs text-muted/70">—</p>
                  ) : (
                    dayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setDetail(event)}
                        className="mb-1 block w-full rounded border border-line bg-surface px-2 py-1.5 text-left hover:border-line-strong"
                      >
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <span className={cn("h-1.5 w-1.5 rounded-full", dot[event.type])} />
                          <span className="num">{formatTime(event.startsAt)}</span>
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug font-medium">{event.title}</span>
                      </button>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}

        {view === "agenda" &&
          (agendaDays.length === 0 ? (
            <EmptyState title="У цьому періоді подій немає" hint="Перейдіть до іншого періоду або додайте подію." />
          ) : (
            agendaDays.map((key) => (
              <section key={key} className="border-b border-line last:border-0">
                <h3 className={cn("num bg-bg px-4 py-1.5 text-[13px] font-medium", key === today && "text-accent")}>
                  {formatDate(key)}, {WEEKDAYS_LONG[weekdayIndex(key)]}
                  {key === today && " · сьогодні"}
                </h3>
                <DayRows events={byDay.get(key) ?? []} onOpen={setDetail} />
              </section>
            ))
          ))}
      </Card>

      <Modal open={current !== null} onOpenChange={(open) => !open && setDetail(null)} title={current?.title ?? ""}>
        {current && (
          <>
            <DetailList
              items={[
                { label: "Тип", value: <span className="flex flex-wrap items-center gap-2">{eventTypeLabel[current.type]} <VerifiedBadge event={current} /></span> },
                {
                  label: "Дата і час",
                  value: (
                    <span className="num">
                      {formatDate(current.startsAt)}, {formatTime(current.startsAt)}
                      {current.endsAt && `–${formatTime(current.endsAt)}`}
                    </span>
                  ),
                },
                { label: "Місце", value: current.location },
                { label: "Відповідальний", value: <UserCell id={current.responsibleId} /> },
                { label: "Клієнт", value: <ClientLink id={current.clientId} /> },
                { label: "Справа", value: <CaseLink id={current.caseId} /> },
                ...(current.type === "deadline"
                  ? [
                      { label: "Підстава строку", value: current.deadlineSource },
                      { label: "Перевірив", value: current.isVerified ? <UserCell id={current.verifiedBy} /> : "Ще не перевірено" },
                    ]
                  : []),
                { label: "Нагадування", value: REMINDER_OPTIONS.find((o) => o.value === current.reminder)?.label },
                { label: "Опис", value: current.description },
              ]}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-3">
              <ArchiveButton
                table="events"
                id={current.id}
                archivedAt={current.archivedAt}
                confirmTitle="Прибрати подію з календаря?"
                confirmMessage="Подія зникне з календаря, але залишиться в історії дій."
                size="sm"
              />
              <Button
                size="sm"
                onClick={() => {
                  const event = current;
                  setDetail(null);
                  form.open("event", editEvent(event, event.reminder));
                }}
              >
                <Pencil className="h-4 w-4" />
                Редагувати
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
