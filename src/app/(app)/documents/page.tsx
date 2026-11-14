import type { Metadata } from "next";
import { FileUp } from "lucide-react";
import { PageHeader } from "@/components/ui/display";
import { DocumentsList } from "@/features/documents/documents";
import { CreateButton } from "@/features/record-actions";
import { documents } from "@/mocks/data";

export const metadata: Metadata = { title: "Документи" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <>
      <PageHeader
        title="Документи"
        meta="Пошук працює за назвою та описом документа, а не за вмістом файлів."
        actions={<CreateButton kind="document" label="Завантажити документ" icon={<FileUp className="h-4 w-4" />} />}
      />
      <DocumentsList key={q} rows={documents} initialQuery={q} />
    </>
  );
}
