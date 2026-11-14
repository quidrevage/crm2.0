"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
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
import { CaseLink, ClientLink, UserCell } from "../common";
import { useRecordForm } from "../quick-create";
import { VerifiedBadge } from "./events-list";

type View = "month" | "week" | "agenda";
const views: Array<{ id: View; label: string }> = [
  { id: "month", label: "Місяць" },
  { id: "week", label: "Тиждень" },
  { id: "agenda", label: "Список" },
];

const dot: Record<EventType, string> = {
  hearing: "bg-accent", deadline: "bg-danger", client_meeting: "bg-success",
  call: "bg-muted", internal: "bg-muted", other: "bg-muted",
};

function EventChip({ event, onOpen, showTime = true }: { event: CalendarEvent; onOpen: (e: CalendarEvent) => void; showTime?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      title={event.title}
      className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-subtle"
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot[event.type])} />
      {showTime && <span className="num shrink-0 text-muted">{formatTime(event.startsAt)}</span>}
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
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CalendarView({ events }: { events: CalendarEvent[] }) {
  const today = dayKey();
  const form = useRecordForm();
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

  // Phones start on the list view, where nothing is squeezed into a grid.
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setView("agenda");
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
      const key = dayKey(event.startsAt);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const week = Array.from({ length: 7 }, (_, i) => shiftKey(weekStart(anchor), i));
  const agendaDays = Array.from({ length: 30 }, (_, i) => shiftKey(anchor, i)).filter((key) => byDay.has(key));

  const title =
    view === "month" ? monthLabel(anchor)
    : view === "week" ? `${formatDate(week[0])} – ${formatDate(week[6])}`
    : `${formatDate(anchor)} – ${formatDate(shiftKey(anchor, 29))}`;

  function step(direction: 1 | -1) {
    if (view === "month") setAnchor(shiftMonth(monthStart(anchor), direction));
    else setAnchor(shiftKey(anchor, (view === "week" ? 7 : 30) * direction));
  }

  function goToday() {
    setAnchor(today);
    setSelected(today);
  }

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
            <Button size="sm" onClick={goToday}>
              Сьогодні
            </Button>
            <h2 className="num ml-2 text-sm font-semibold">{title}</h2>
          </div>
          <div role="tablist" aria-label="Вигляд календаря" className="flex rounded-md border border-line-strong p-0.5">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
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
              <p className="px-4 pt-3 pb-1 text-[13px] font-medium">
                {formatDate(selected)}, {WEEKDAYS_LONG[weekdayIndex(selected)]}
              </p>
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
                  <p className={cn("num mb-1 px-1 text-[13px]", key === today ? "font-semibold text-accent" : "text-muted")}>
                    {WEEKDAYS_SHORT[weekdayIndex(key)]}, {key.slice(8)}.{key.slice(5, 7)}
                  </p>
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

      <Modal open={detail !== null} onOpenChange={(open) => !open && setDetail(null)} title={detail?.title ?? ""}>
        {detail && (
          <>
            <DetailList
              items={[
                { label: "Тип", value: <span className="flex flex-wrap items-center gap-2">{eventTypeLabel[detail.type]} <VerifiedBadge event={detail} /></span> },
                {
                  label: "Дата і час",
                  value: (
                    <span className="num">
                      {formatDate(detail.startsAt)}, {formatTime(detail.startsAt)}
                      {detail.endsAt && `–${formatTime(detail.endsAt)}`}
                    </span>
                  ),
                },
                { label: "Місце", value: detail.location },
                { label: "Відповідальний", value: <UserCell id={detail.responsibleId} /> },
                { label: "Клієнт", value: <ClientLink id={detail.clientId} /> },
                { label: "Справа", value: <CaseLink id={detail.caseId} /> },
                ...(detail.type === "deadline" ? [{ label: "Підстава строку", value: detail.deadlineSource }] : []),
                { label: "Опис", value: detail.description },
              ]}
            />
            <div className="mt-4 flex justify-end border-t border-line pt-3">
              <Button
                onClick={() => {
                  const event = detail;
                  setDetail(null);
                  form.open("event", {
                    isEdit: true,
                    defaults: {
                      title: event.title, type: event.type, date: dayKey(event.startsAt), startTime: formatTime(event.startsAt),
                      endTime: event.endsAt ? formatTime(event.endsAt) : "", location: event.location, caseId: event.caseId ?? "",
                      clientId: event.clientId ?? "", responsibleId: event.responsibleId, description: event.description,
                      deadlineSource: event.deadlineSource ?? "", isVerified: event.isVerified ?? false,
                    },
                  });
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
