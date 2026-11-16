import { ExportButton } from "@/features/export-button";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { CasesList } from "@/features/cases/cases";
import { CreateButton } from "@/features/record-actions";
import { PAGE_SIZE, listCases, type SearchParams } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Справи" };

export default async function CasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { rows, total, page } = await listCases(await searchParams);
  return (
    <>
      <PageHeader title="Справи" meta={<span className="num">Знайдено: {total}</span>} actions={<><ExportButton kind="cases" /><CreateButton kind="case" label="Створити справу" /></>} />
      <CasesList rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
