import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { CreateButton } from "@/features/record-actions";
import { TasksList } from "@/features/tasks/tasks";
import { tasks } from "@/mocks/data";

export const metadata: Metadata = { title: "Завдання" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <>
      <PageHeader title="Завдання" actions={<CreateButton kind="task" label="Додати завдання" />} />
      <TasksList key={q} rows={tasks} initialQuery={q} />
    </>
  );
}
