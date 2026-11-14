import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/ui/display";
import { EventsList } from "@/features/calendar/events-list";
import { ClientLink } from "@/features/common";
import { ActivityList } from "@/features/lists";
import { QuickActions } from "@/features/record-actions";
import { TasksTable } from "@/features/tasks/tasks";
import { caseStatusLabel, caseStatusTone } from "@/i18n/uk";
import { dayKey, formatDate, shiftKey, WEEKDAYS_LONG, weekdayIndex } from "@/lib/dates";
import { isOpenTask, isOverdue } from "@/lib/tasks";
import { requireUser } from "@/lib/auth";
import { activity, cases, clients, events, tasks } from "@/mocks/data";

const more = "text-[13px] text-accent hover:underline";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = dayKey();
  const weekAhead = shiftKey(today, 7);

  const activeCases = cases.filter((k) => k.status !== "completed" && k.status !== "archived");
  const upcoming = events.filter((e) => {
    const key = dayKey(e.startsAt);
    return key >= today && key <= shiftKey(today, 14) && (e.type === "hearing" || e.type === "deadline");
  });
  const hearingsThisWeek = upcoming.filter((e) => e.type === "hearing" && dayKey(e.startsAt) <= weekAhead);
  const dueToday = tasks.filter((t) => isOpenTask(t) && t.dueDate === today);
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const recentCases = [...cases].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 5);

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Активні справи" value={activeCases.length} href="/cases" />
        <Stat label="Клієнти" value={clients.filter((c) => c.status !== "archived").length} href="/clients" />
        <Stat label="Засідання за 7 днів" value={hearingsThisWeek.length} href="/calendar" />
        <Stat label="Завдання на сьогодні" value={dueToday.length} href="/tasks" />
        <Stat label="Прострочені завдання" value={overdue.length} href="/tasks" tone={overdue.length > 0 ? "danger" : undefined} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[13px] text-muted">Додати:</span>
        <QuickActions />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Засідання та строки на 14 днів" flush action={<Link href="/calendar" className={more}>Календар</Link>}>
          <EventsList rows={upcoming} emptyTitle="Найближчими днями засідань і строків немає" />
        </Card>

        <Card title="Завдання: сьогодні та прострочені" flush action={<Link href="/tasks" className={more}>Усі завдання</Link>}>
          <TasksTable rows={[...overdue, ...dueToday]} compact emptyTitle="На сьогодні завдань немає" />
        </Card>

        <Card title="Нещодавно оновлені справи" flush action={<Link href="/cases" className={more}>Усі справи</Link>}>
          <ul className="divide-y divide-line">
            {recentCases.map((k) => (
              <li key={k.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <Link href={`/cases/${k.id}`} className="text-sm font-medium hover:text-accent hover:underline">
                    {k.title}
                  </Link>
                  <p className="text-[13px] text-muted">
                    <span className="num">{k.number}</span> · <ClientLink id={k.clientId} />
                  </p>
                </div>
                <Badge tone={caseStatusTone[k.status]}>{caseStatusLabel[k.status]}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Остання активність" flush action={<Link href="/activity" className={more}>Історія дій</Link>}>
          <ActivityList rows={activity.slice(0, 6)} />
        </Card>
      </div>
    </>
  );
}
