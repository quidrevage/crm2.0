import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { CalendarView } from "@/features/calendar/calendar-view";
import { calendarRange, type CalendarMode } from "@/features/calendar/range";
import { CreateButton } from "@/features/record-actions";
import { listEvents, param, type SearchParams } from "@/lib/data/queries";
import { dayKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Календар" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const requested = param(params, "view");
  const view: CalendarMode = requested === "week" || requested === "agenda" ? requested : "month";
  const d = param(params, "d");
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : dayKey();
  const [from, to] = calendarRange(view, anchor);
  const events = await listEvents(from, to, params);

  return (
    <>
      <PageHeader title="Календар" meta="Час подій — за київським часом." actions={<CreateButton kind="event" label="Додати подію" />} />
      <CalendarView events={events} view={view} anchor={anchor} />
    </>
  );
}
