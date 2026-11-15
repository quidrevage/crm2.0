import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { ActivityBrowser } from "@/features/activity/activity-browser";
import { requireUser } from "@/lib/auth";
import { PAGE_SIZE, listActivity, type SearchParams } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Історія дій" };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const { rows, total, page } = await listActivity(await searchParams);
  return (
    <>
      <PageHeader
        title="Історія дій"
        meta={
          user.role === "admin"
            ? "Журнал лише для читання: записи створює база даних, їх не можна змінити або видалити. Вміст нотаток і файлів сюди не потрапляє."
            : "Ваші дії та історія спільних записів. Повний журнал доступний адміністратору."
        }
      />
      <ActivityBrowser rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
