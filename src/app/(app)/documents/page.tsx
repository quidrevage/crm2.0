import type { Metadata } from "next";
import { FileUp } from "lucide-react";
import { PageHeader } from "@/components/ui/display";
import { DocumentsList } from "@/features/documents/documents";
import { CreateButton } from "@/features/record-actions";
import { PAGE_SIZE, listDocuments, type SearchParams } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Документи" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { rows, total, page } = await listDocuments(await searchParams);
  return (
    <>
      <PageHeader
        title="Документи"
        meta="Пошук працює за назвою та описом документа, а не за вмістом файлів."
        actions={<CreateButton kind="document" label="Завантажити документ" icon={<FileUp className="h-4 w-4" />} />}
      />
      <DocumentsList rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
