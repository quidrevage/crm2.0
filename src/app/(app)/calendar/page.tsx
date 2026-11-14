import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { CalendarView } from "@/features/calendar/calendar-view";
import { CreateButton } from "@/features/record-actions";
import { events } from "@/mocks/data";

export const metadata: Metadata = { title: "Календар" };

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        title="Календар"
        meta="Час подій — за київським часом."
        actions={<CreateButton kind="event" label="Додати подію" />}
      />
      <CalendarView events={events} />
    </>
  );
}
