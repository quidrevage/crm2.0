import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { NotesBrowser } from "@/features/notes/notes-page";
import { CreateButton } from "@/features/record-actions";
import { PAGE_SIZE, listNotes, openTaskOptions, type SearchParams } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Нотатки" };

export default async function NotesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [{ rows, total, page }, tasks] = await Promise.all([listNotes(await searchParams), openTaskOptions()]);
  return (
    <>
      <PageHeader
        title="Нотатки"
        meta="Конфіденційна інформація: нотатки доступні лише користувачам системи. Редагувати може автор або адміністратор."
        actions={<CreateButton kind="note" label="Нова нотатка" tasks={tasks} />}
      />
      <NotesBrowser rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
