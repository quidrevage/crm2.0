import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { CourtsList } from "@/features/courts/courts-list";
import { CreateButton } from "@/features/record-actions";
import { listCourts, param, type SearchParams } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Суди" };

export default async function CourtsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const courts = await listCourts(params);
  return (
    <>
      <PageHeader
        title="Суди"
        meta="Довідник ведеться вручну. Адреси та контакти звіряйте з офіційними джерелами."
        actions={<CreateButton kind="court" label="Додати суд" />}
      />
      <CourtsList rows={courts} archived={param(params, "archived") === "1"} />
    </>
  );
}
