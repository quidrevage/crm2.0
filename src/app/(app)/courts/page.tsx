import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { CourtsList } from "@/features/courts/courts-list";
import { CreateButton } from "@/features/record-actions";
import { listCourts, PAGE_SIZE, param, type SearchParams } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Суди" };

export default async function CourtsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { rows, total, page } = await listCourts(params);
  return (
    <>
      <PageHeader
        title="Суди"
        meta="Офіційний перелік судів України (court.gov.ua) та суди, додані вашою командою. Перед поданням документів звіряйте реквізити на сайті суду."
        actions={<CreateButton kind="court" label="Додати свій суд" />}
      />
      <CourtsList rows={rows} total={total} page={page} pageSize={PAGE_SIZE} archived={param(params, "archived") === "1"} />
    </>
  );
}
