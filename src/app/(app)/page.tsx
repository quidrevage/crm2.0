import Link from "next/link";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui/display";
import { EventsList } from "@/features/calendar/events-list";
import { CaseStatusBadge, ClientLink } from "@/features/common";
import { RemindersCard } from "@/features/dashboard/reminders";
import { ActivityList } from "@/features/lists";
import { CreateButton, QuickActions } from "@/features/record-actions";
import { TasksTable } from "@/features/tasks/tasks";
import { requireUser } from "@/lib/auth";
import { getDashboard } from "@/lib/data/queries";
import { dayKey, formatDate, WEEKDAYS_LONG, weekdayIndex } from "@/lib/dates";

const more = "text-[13px] text-accent hover:underline";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboard(user.id);
  const today = dayKey();
  const { counts } = data;
  const isEmpty = counts.clients === 0 && counts.activeCases === 0;

  return (
    <>
      <PageHeader
        title={user.fullName ? `Добрий день, ${user.fullName.split(" ")[0]}` : "Добрий день"}
        meta={
          <span className="num">
            {WEEKDAYS_LONG[weekdayIndex(today)]}, {formatDate(today)}
          </span>
        }
      />

      {isEmpty && (
        <Card className="mb-4">
          <p className="text-sm font-medium">Почніть з клієнта</p>
          <p className="mt-1 max-w-[70ch] text-[13px] text-muted">
            Усе в системі пов’язано: справи належать клієнтам, а завдання, події, документи, платежі й нотатки прив’язуються до справи
            і автоматично з’являються на сторінках справи та клієнта.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CreateButton kind="client" label="Додати першого клієнта" />
            {!user.fullName && (
              <Link href="/settings" className="inline-flex h-9 items-center px-2 text-[13px] text-accent hover:underline">
                Вказати своє ім’я в профілі
              </Link>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Активні справи" value={counts.activeCases} href="/cases" />
        <Stat label="Клієнти" value={counts.clients} href="/clients" />
        <Stat label="Засідання за 7 днів" value={counts.hearingsWeek} href="/calendar?view=week" />
        <Stat label="Завдання на сьогодні" value={counts.dueToday} href="/tasks?due=today" />
        <Stat label="Прострочені завдання" value={counts.overdue} href="/tasks?due=overdue" tone={counts.overdue > 0 ? "danger" : undefined} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[13px] text-muted">Додати:</span>
        <QuickActions />
      </div>

      {data.reminders.length > 0 && (
        <div className="mt-4">
          <RemindersCard reminders={data.reminders} />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Засідання та строки на 14 днів" flush action={<Link href="/calendar?view=agenda" className={more}>Календар</Link>}>
          <EventsList rows={data.upcoming} emptyTitle="Найближчими днями засідань і строків немає" />
        </Card>

        <Card title="Завдання: сьогодні та прострочені" flush action={<Link href="/tasks" className={more}>Усі завдання</Link>}>
          <TasksTable rows={data.tasks} compact emptyTitle="На сьогодні завдань немає" />
        </Card>

        <Card title="Нещодавно оновлені справи" flush action={<Link href="/cases" className={more}>Усі справи</Link>}>
          {data.recentCases.length === 0 ? (
            <EmptyState title="Справ ще немає" />
          ) : (
            <ul className="divide-y divide-line">
              {data.recentCases.map((k) => (
                <li key={k.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/cases/${k.id}`} className="text-sm font-medium hover:text-accent hover:underline">
                      {k.title}
                    </Link>
                    <p className="text-[13px] text-muted">
                      <span className="num">{k.number}</span> · <ClientLink id={k.clientId} />
                    </p>
                  </div>
                  <CaseStatusBadge id={k.statusId} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Остання активність" flush action={<Link href="/activity" className={more}>Історія дій</Link>}>
          <ActivityList rows={data.activity} />
        </Card>
      </div>
    </>
  );
}
