import Link from "next/link";
import { Card, DetailList, PageHeader } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { EventsList } from "@/features/calendar/events-list";
import { PartiesList } from "@/features/cases/cases";
import { CaseStatusBadge, ClientLink, RefName, UserCell } from "@/features/common";
import { DocumentsTable } from "@/features/documents/documents";
import { ExpensesTable, FeesTable, PaymentsTable } from "@/features/finance/finance";
import { editCase } from "@/features/form-values";
import { ActivityList, FinanceSummary, NotesList } from "@/features/lists";
import { getLookups } from "@/features/lookups/queries";
import { ArchiveButton, CreateButton, EditButton } from "@/features/record-actions";
import { TasksTable } from "@/features/tasks/tasks";
import { getCasePage } from "@/lib/data/queries";
import { dayKey, formatDate } from "@/lib/dates";
import { financeTotals, withPaid } from "@/lib/finance";
import { isOpenTask } from "@/lib/tasks";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const lookups = await getLookups();
  const { id } = await params;
  return { title: lookups.cases.find((k) => k.id === id)?.title ?? "Справа" };
}

export default async function CasePage({ params }: Props) {
  const { id } = await params;
  const [data, lookups] = await Promise.all([getCasePage(id), getLookups()]);
  const { legalCase, parties, documents, tasks, events, notes, activity, finance } = data;
  const canReadFinance = lookups.me.finance !== "none";
  const canWriteFinance = lookups.me.finance === "write";
  const court = lookups.courts.find((c) => c.id === legalCase.courtId);
  const today = dayKey();
  const upcoming = events.filter((e) => dayKey(e.startsAt) >= today);
  const nextEvent = upcoming[0];
  const openTasks = tasks.filter(isOpenTask);
  const link = { clientId: legalCase.clientId, caseId: id };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Справи", href: "/cases" }, { label: legalCase.number }]}
        title={legalCase.title}
        meta={
          <>
            <span className="num">{legalCase.number}</span>
            {legalCase.courtCaseNumber && <span className="num">судова справа № {legalCase.courtCaseNumber}</span>}
            <CaseStatusBadge id={legalCase.statusId} />
            <ClientLink id={legalCase.clientId} />
          </>
        }
        actions={
          <>
            <EditButton kind="case" options={editCase(legalCase)} />
            <ArchiveButton
              table="cases"
              id={legalCase.id}
              archivedAt={legalCase.archivedAt}
              confirmTitle="Перемістити справу до архіву?"
              confirmMessage="Справа зникне зі списку активних. Документи, завдання, події та платежі збережуться, а справу можна буде відновити."
            />
          </>
        }
      />

      {legalCase.archivedAt && (
        <p className="mb-4 rounded-md bg-subtle px-3 py-2 text-[13px] text-muted">
          Справа в архіві з {formatDate(legalCase.archivedAt)}. Щоб працювати з нею знову, натисніть «Відновити».
        </p>
      )}

      <Tabs
        tabs={[
          {
            id: "overview", label: "Огляд",
            content: (
              <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Відомості про справу" className="lg:col-span-2">
                  <DetailList
                    items={[
                      { label: "Клієнт", value: <ClientLink id={legalCase.clientId} /> },
                      { label: "Відповідальний", value: <UserCell id={legalCase.responsibleId} /> },
                      { label: "Галузь права", value: <RefName list="practiceAreas" id={legalCase.practiceAreaId} /> },
                      { label: "Тип справи", value: <RefName list="matterTypes" id={legalCase.matterTypeId} /> },
                      { label: "Інша сторона", value: legalCase.opposingParty },
                      { label: "Дата відкриття", value: <span className="num">{formatDate(legalCase.openedOn)}</span> },
                      ...(legalCase.isLitigation
                        ? [
                            { label: "Суд", value: court ? <Link href={`/cases?court=${court.id}`} className="hover:text-accent hover:underline">{court.name}</Link> : "" },
                            { label: "Номер судової справи", value: legalCase.courtCaseNumber && <span className="num">{legalCase.courtCaseNumber}</span> },
                            { label: "Суддя", value: legalCase.judge },
                          ]
                        : []),
                      ...(legalCase.closedOn ? [{ label: "Дата закриття", value: <span className="num">{formatDate(legalCase.closedOn)}</span> }] : []),
                    ]}
                  />
                  {legalCase.description && (
                    <p className="mt-4 max-w-[75ch] border-t border-line pt-3 text-sm whitespace-pre-line">{legalCase.description}</p>
                  )}
                </Card>
                <Card title="Що далі" flush>
                  <dl className="grid grid-cols-2 gap-3 border-b border-line px-4 py-3">
                    <div>
                      <dt className="text-[13px] text-muted">Наступна важлива дата</dt>
                      <dd className="num text-sm font-medium">{formatDate(legalCase.nextDate || (nextEvent ? dayKey(nextEvent.startsAt) : ""))}</dd>
                    </div>
                    <div>
                      <dt className="text-[13px] text-muted">Відкриті завдання</dt>
                      <dd className="num text-sm font-medium">{openTasks.length}</dd>
                    </div>
                  </dl>
                  <EventsList rows={upcoming.slice(0, 4)} showCase={false} emptyTitle="Майбутніх подій немає" />
                </Card>
              </div>
            ),
          },
          {
            id: "parties", label: "Учасники", count: parties.length,
            content: (
              <Card flush title="Учасники справи" action={parties.length > 0 && <CreateButton kind="party" label="Додати учасника" size="sm" variant="secondary" values={{ caseId: id }} />}>
                <PartiesList rows={parties} caseId={id} />
              </Card>
            ),
          },
          {
            id: "documents", label: "Документи", count: documents.length,
            content: (
              <Card flush title="Документи" action={<CreateButton kind="document" label="Завантажити" size="sm" variant="secondary" values={link} />}>
                <DocumentsTable rows={documents} showLinks={false} />
              </Card>
            ),
          },
          {
            id: "tasks", label: "Завдання", count: openTasks.length,
            content: (
              <Card flush title="Завдання" action={<CreateButton kind="task" label="Додати завдання" size="sm" variant="secondary" values={link} />}>
                <TasksTable rows={tasks} showCase={false} />
              </Card>
            ),
          },
          {
            id: "events", label: "Події", count: upcoming.length,
            content: (
              <Card flush title="Засідання, строки та зустрічі" action={<CreateButton kind="event" label="Додати подію" size="sm" variant="secondary" values={link} />}>
                <EventsList rows={events} showCase={false} />
              </Card>
            ),
          },
          ...(canReadFinance
            ? [
                {
                  id: "finance", label: "Фінанси",
                  content: (
                    <div className="space-y-4">
                      <FinanceSummary totals={financeTotals(finance.fees, finance.payments, finance.expenses)} />
                      <Card flush title="Погоджені гонорари" action={canWriteFinance && <CreateButton kind="fee" label="Додати домовленість" size="sm" variant="secondary" values={link} />}>
                        <FeesTable rows={withPaid(finance.fees, finance.payments)} hide={["client", "case"]} />
                      </Card>
                      <Card flush title="Отримані платежі" action={canWriteFinance && <CreateButton kind="payment" label="Внести платіж" size="sm" variant="secondary" values={link} />}>
                        <PaymentsTable rows={finance.payments} hide={["client", "case"]} />
                      </Card>
                      <Card flush title="Витрати" action={canWriteFinance && <CreateButton kind="expense" label="Додати витрату" size="sm" variant="secondary" values={link} />}>
                        <ExpensesTable rows={finance.expenses} hide={["client", "case"]} />
                      </Card>
                    </div>
                  ),
                },
              ]
            : []),
          {
            id: "notes", label: "Нотатки", count: notes.length,
            content: (
              <Card flush title="Нотатки" action={<CreateButton kind="note" label="Нова нотатка" size="sm" variant="secondary" values={{ linkType: "case", linkId: id }} />}>
                <NotesList rows={notes} showTarget={false} />
              </Card>
            ),
          },
          {
            id: "history", label: "Історія",
            content: (
              <Card flush title="Історія дій у справі">
                <ActivityList rows={activity} />
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
