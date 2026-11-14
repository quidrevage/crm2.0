import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { CourtsList } from "@/features/courts/courts-list";
import { CreateButton } from "@/features/record-actions";
import { courts } from "@/mocks/data";

export const metadata: Metadata = { title: "Суди" };

export default async function CourtsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <>
      <PageHeader
        title="Суди"
        meta="Довідник ведеться вручну. Адреси та контакти звіряйте з офіційними джерелами."
        actions={<CreateButton kind="court" label="Додати суд" />}
      />
      <CourtsList key={q} rows={courts} initialQuery={q} />
    </>
  );
}
