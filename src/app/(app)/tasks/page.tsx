import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { CreateButton } from "@/features/record-actions";
import { TasksList } from "@/features/tasks/tasks";
import { PAGE_SIZE, listTasks, type SearchParams } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Завдання" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { rows, total, page } = await listTasks(await searchParams);
  return (
    <>
      <PageHeader title="Завдання" meta={<span className="num">Знайдено: {total}</span>} actions={<CreateButton kind="task" label="Додати завдання" />} />
      <TasksList rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
