import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { ActivityBrowser } from "@/features/activity/activity-browser";
import { ClearHistoryButton } from "@/features/activity/clear-history";
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
            ? "Записи створює база даних, змінити їх неможливо. Адміністратор може очистити старі записи. Вміст нотаток і файлів сюди не потрапляє."
            : "Ваші дії та історія спільних записів. Повний журнал доступний адміністратору."
        }
        actions={user.role === "admin" ? <ClearHistoryButton /> : undefined}
      />
      <ActivityBrowser rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
