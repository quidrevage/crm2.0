import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/display";
import { ActivityList } from "@/features/lists";
import { activity } from "@/mocks/data";

export const metadata: Metadata = { title: "Історія дій" };

export default function ActivityPage() {
  return (
    <>
      <PageHeader title="Історія дій" meta="Журнал лише для читання. Записи не можна змінити або видалити." />
      <Card flush>
        <ActivityList rows={activity} />
      </Card>
    </>
  );
}
