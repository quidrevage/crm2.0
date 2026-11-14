import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/display";
import { NotesList } from "@/features/lists";
import { CreateButton } from "@/features/record-actions";
import { notes } from "@/mocks/data";

export const metadata: Metadata = { title: "Нотатки" };

export default function NotesPage() {
  const sorted = [...notes].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return (
    <>
      <PageHeader
        title="Нотатки"
        meta="Конфіденційна інформація: нотатки доступні лише користувачам системи."
        actions={<CreateButton kind="note" label="Нова нотатка" />}
      />
      <Card flush>
        <NotesList rows={sorted} />
      </Card>
    </>
  );
}
