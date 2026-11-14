import { notFound } from "next/navigation";
import { Badge, Card, DetailList, PageHeader } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { EventsList } from "@/features/calendar/events-list";
import { PartiesTable } from "@/features/cases/cases";
import { ClientLink, UserCell } from "@/features/common";
import { DocumentsTable } from "@/features/documents/documents";
import { ExpensesTable, FeesTable, PaymentsTable } from "@/features/finance/finance";
import { ActivityList, FinanceSummary, NotesList } from "@/features/lists";
import { CreateButton, RecordActions } from "@/features/record-actions";
import { TasksTable } from "@/features/tasks/tasks";
import { caseStatusLabel, caseStatusTone } from "@/i18n/uk";
import { formatDate } from "@/lib/dates";
import { financeTotals, withPaid } from "@/lib/finance";
import {
  activity, caseParties, documents, events, expenses, feeAgreements, getCase, getCourt, notes, payments, tasks,
} from "@/mocks/data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: getCase((await params).id)?.title ?? "Справа" };
}

export default async function CasePage({ params }: Props) {
  const { id } = await params;
  const legalCase = getCase(id);
  if (!legalCase) notFound();

  const own = <T extends { caseId?: string }>(rows: T[]) => rows.filter((row) => row.caseId === id);
  const parties = own(caseParties);
  const caseDocs = own(documents);
  const caseTasks = own(tasks);
  const caseEvents = own(events);
  const caseFees = own(feeAgreements);
  const casePayments = own(payments);
  const caseExpenses = own(expenses);
  const caseNotes = own(notes);
  const court = getCourt(legalCase.courtId);
  const link = { clientId: legalCase.clientId, caseId: id };

  const { id: _id, number: _n, updatedAt: _u, closedOn: _c, ...values } = legalCase;
  const defaults = { courtCaseNumber: "", opposingParty: "", courtId: "", judge: "", nextDate: "", ...values };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Справи", href: "/cases" }, { label: legalCase.number }]}
        title={legalCase.title}
        meta={
          <>
            <span className="num">{legalCase.number}</span>
            {legalCase.courtCaseNumber && <span className="num">судова справа № {legalCase.courtCaseNumber}</span>}
            <Badge tone={caseStatusTone[legalCase.status]}>{caseStatusLabel[legalCase.status]}</Badge>
          </>
        }
        actions={
          <RecordActions
            kind="case"
            defaults={defaults}
            archiveTitle="Перемістити справу до архіву?"
            archiveMessage="Справа зникне зі списку активних. Документи, завдання, події та платежі збережуться, а справу можна буде відновити."
          />
        }
      />

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
                      { label: "Галузь права", value: legalCase.practiceArea },
                      { label: "Тип справи", value: legalCase.matterType },
                      { label: "Інша сторона", value: legalCase.opposingParty },
                      { label: "Дата відкриття", value: <span className="num">{formatDate(legalCase.openedOn)}</span> },
                      ...(legalCase.isLitigation
                        ? [
                            { label: "Суд", value: court?.name },
                            { label: "Номер судової справи", value: legalCase.courtCaseNumber && <span className="num">{legalCase.courtCaseNumber}</span> },
                            { label: "Суддя", value: legalCase.judge },
                          ]
                        : []),
                      ...(legalCase.closedOn ? [{ label: "Дата закриття", value: <span className="num">{formatDate(legalCase.closedOn)}</span> }] : []),
                    ]}
                  />
                  {legalCase.description && (
                    <p className="mt-4 max-w-[75ch] border-t border-line pt-3 text-sm">{legalCase.description}</p>
                  )}
                </Card>
                <Card title="Найближчі події" flush>
                  <div className="border-b border-line px-4 py-2.5">
                    <p className="text-[13px] text-muted">Наступна важлива дата</p>
                    <p className="num text-sm font-medium">{formatDate(legalCase.nextDate)}</p>
                  </div>
                  <EventsList rows={caseEvents.filter((e) => Date.parse(e.startsAt) >= Date.now()).slice(0, 3)} showCase={false} emptyTitle="Майбутніх подій немає" />
                </Card>
              </div>
            ),
          },
          {
            id: "parties", label: "Учасники", count: parties.length,
            content: (
              <Card flush title="Учасники справи">
                <PartiesTable rows={parties} />
              </Card>
            ),
          },
          {
            id: "documents", label: "Документи", count: caseDocs.length,
            content: (
              <Card flush title="Документи" action={<CreateButton kind="document" label="Завантажити" size="sm" variant="secondary" defaults={link} />}>
                <DocumentsTable rows={caseDocs} showLinks={false} />
              </Card>
            ),
          },
          {
            id: "tasks", label: "Завдання", count: caseTasks.length,
            content: (
              <Card flush title="Завдання" action={<CreateButton kind="task" label="Додати завдання" size="sm" variant="secondary" defaults={link} />}>
                <TasksTable rows={caseTasks} showCase={false} />
              </Card>
            ),
          },
          {
            id: "events", label: "Події", count: caseEvents.length,
            content: (
              <Card flush title="Події та строки" action={<CreateButton kind="event" label="Додати подію" size="sm" variant="secondary" defaults={link} />}>
                <EventsList rows={caseEvents} showCase={false} />
              </Card>
            ),
          },
          {
            id: "finance", label: "Фінанси",
            content: (
              <div className="space-y-4">
                <FinanceSummary totals={financeTotals(caseFees, casePayments, caseExpenses)} />
                <Card flush title="Погоджені гонорари">
                  <FeesTable rows={withPaid(caseFees, casePayments)} hide={["client", "case"]} />
                </Card>
                <Card flush title="Отримані платежі" action={<CreateButton kind="payment" label="Внести платіж" size="sm" variant="secondary" defaults={link} />}>
                  <PaymentsTable rows={casePayments} hide={["client", "case"]} />
                </Card>
                <Card flush title="Витрати">
                  <ExpensesTable rows={caseExpenses} hide={["client", "case"]} />
                </Card>
              </div>
            ),
          },
          {
            id: "notes", label: "Нотатки", count: caseNotes.length,
            content: (
              <Card flush title="Нотатки" action={<CreateButton kind="note" label="Нова нотатка" size="sm" variant="secondary" defaults={{ linkType: "case", linkId: id }} />}>
                <NotesList rows={caseNotes} showTarget={false} />
              </Card>
            ),
          },
          {
            id: "history", label: "Історія",
            content: (
              <Card flush title="Історія дій">
                <ActivityList rows={own(activity)} />
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
