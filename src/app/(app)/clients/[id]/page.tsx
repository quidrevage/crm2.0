import { Badge, Card, DetailList, PageHeader } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { EventsList } from "@/features/calendar/events-list";
import { CasesTable } from "@/features/cases/cases";
import { ContactsList } from "@/features/clients/contacts";
import { UserCell } from "@/features/common";
import { DocumentsTable } from "@/features/documents/documents";
import { ExpensesTable, FeesTable, PaymentsTable } from "@/features/finance/finance";
import { editClient } from "@/features/form-values";
import { ActivityList, FinanceSummary, NotesList } from "@/features/lists";
import { getLookups } from "@/features/lookups/queries";
import { ArchiveButton, CreateButton, EditButton } from "@/features/record-actions";
import { TasksTable } from "@/features/tasks/tasks";
import { clientStatusLabel, clientStatusTone, clientTypeLabel } from "@/i18n/uk";
import { getClientPage } from "@/lib/data/queries";
import { formatDate } from "@/lib/dates";
import { financeTotals, withPaid } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { isOpenTask } from "@/lib/tasks";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const lookups = await getLookups();
  const { id } = await params;
  return { title: lookups.clients.find((c) => c.id === id)?.name ?? "Клієнт" };
}

export default async function ClientPage({ params }: Props) {
  const { id } = await params;
  const [data, lookups] = await Promise.all([getClientPage(id), getLookups()]);
  const { client, contacts, cases, documents, tasks, events, notes, activity, finance } = data;
  const canReadFinance = lookups.me.finance !== "none";
  const canWriteFinance = lookups.me.finance === "write";
  const isEntity = client.type === "legal_entity";
  const totals = financeTotals(finance.fees, finance.payments, finance.expenses);
  const openTasks = tasks.filter(isOpenTask);
  const upcoming = events.filter((e) => Date.parse(e.startsAt) >= Date.now() - 86_400_000);
  const link = { clientId: id };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Клієнти", href: "/clients" }, { label: client.name }]}
        title={client.name}
        meta={
          <>
            <span className="num">{client.number}</span>
            <span>{clientTypeLabel[client.type]}</span>
            <Badge tone={clientStatusTone[client.status]}>{clientStatusLabel[client.status]}</Badge>
          </>
        }
        actions={
          <>
            {!client.archivedAt && <CreateButton kind="case" label="Нова справа" values={link} />}
            <EditButton kind="client" options={editClient(client)} />
            <ArchiveButton
              table="clients"
              id={client.id}
              archivedAt={client.archivedAt}
              confirmTitle="Перемістити клієнта до архіву?"
              confirmMessage="Клієнт зникне зі списку активних, але всі його справи, документи й платежі збережуться. Запис можна буде відновити."
            />
          </>
        }
      />

      {client.archivedAt && (
        <p className="mb-4 rounded-md bg-subtle px-3 py-2 text-[13px] text-muted">
          Клієнт в архіві з {formatDate(client.archivedAt)}. Дані доступні для перегляду; щоб працювати з ним знову, натисніть «Відновити».
        </p>
      )}

      <Tabs
        tabs={[
          {
            id: "overview", label: "Огляд",
            content: (
              <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Основні відомості" className="lg:col-span-2">
                  <DetailList
                    items={[
                      { label: isEntity ? "Повне найменування" : "ПІБ", value: client.name },
                      isEntity
                        ? { label: "Код ЄДРПОУ", value: client.edrpou && <span className="num">{client.edrpou}</span> }
                        : { label: "РНОКПП", value: client.rnokpp && <span className="num">{client.rnokpp}</span> },
                      ...(isEntity ? [{ label: "Керівник або уповноважена особа", value: client.representative }] : []),
                      { label: "Телефон", value: client.phone && <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="num hover:underline">{client.phone}</a> },
                      { label: "Електронна пошта", value: client.email && <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a> },
                      { label: isEntity ? "Юридична адреса" : "Адреса", value: client.address },
                      { label: "Відповідальний", value: <UserCell id={client.assignedTo} /> },
                      { label: "Створено", value: <span className="num">{formatDate(client.createdAt)}</span> },
                      { label: "Оновлено", value: <span className="num">{formatDate(client.updatedAt)}</span> },
                    ]}
                  />
                  {client.notes && <p className="mt-4 max-w-[75ch] border-t border-line pt-3 text-sm whitespace-pre-line">{client.notes}</p>}
                </Card>
                <Card title="Коротко">
                  <DetailList
                    columns={1}
                    items={[
                      { label: "Справ", value: <span className="num">{cases.filter((k) => !k.archivedAt).length}</span> },
                      { label: "Відкритих завдань", value: <span className="num">{openTasks.length}</span> },
                      { label: "Документів", value: <span className="num">{documents.length}</span> },
                      ...(canReadFinance ? [{ label: "До сплати", value: <span className="num">{formatMoney(Math.max(0, totals.outstanding))}</span> }] : []),
                    ]}
                  />
                </Card>
                <Card title="Найближчі події" flush className="lg:col-span-3">
                  <EventsList rows={upcoming.slice(0, 5)} emptyTitle="Запланованих подій немає" />
                </Card>
              </div>
            ),
          },
          {
            id: "cases", label: "Справи", count: cases.length,
            content: (
              <Card flush title="Справи клієнта" action={!client.archivedAt && <CreateButton kind="case" label="Нова справа" size="sm" variant="secondary" values={link} />}>
                <CasesTable rows={cases} showClient={false} />
              </Card>
            ),
          },
          {
            id: "work", label: "Завдання й події", count: openTasks.length,
            content: (
              <div className="space-y-4">
                <Card flush title="Завдання" action={<CreateButton kind="task" label="Додати завдання" size="sm" variant="secondary" values={link} />}>
                  <TasksTable rows={tasks} />
                </Card>
                <Card flush title="Події" action={<CreateButton kind="event" label="Додати подію" size="sm" variant="secondary" values={link} />}>
                  <EventsList rows={events} />
                </Card>
              </div>
            ),
          },
          {
            id: "documents", label: "Документи", count: documents.length,
            content: (
              <Card flush title="Документи" action={<CreateButton kind="document" label="Завантажити" size="sm" variant="secondary" values={link} />}>
                <DocumentsTable rows={documents} />
              </Card>
            ),
          },
          ...(canReadFinance
            ? [
                {
                  id: "payments", label: "Фінанси", count: finance.payments.length,
                  content: (
                    <div className="space-y-4">
                      <FinanceSummary totals={totals} />
                      <Card flush title="Погоджені гонорари" action={canWriteFinance && <CreateButton kind="fee" label="Додати домовленість" size="sm" variant="secondary" values={link} />}>
                        <FeesTable rows={withPaid(finance.fees, finance.payments)} hide={["client"]} />
                      </Card>
                      <Card flush title="Отримані платежі" action={canWriteFinance && <CreateButton kind="payment" label="Внести платіж" size="sm" variant="secondary" values={link} />}>
                        <PaymentsTable rows={finance.payments} hide={["client"]} />
                      </Card>
                      <Card flush title="Витрати" action={canWriteFinance && <CreateButton kind="expense" label="Додати витрату" size="sm" variant="secondary" values={link} />}>
                        <ExpensesTable rows={finance.expenses} hide={["client"]} />
                      </Card>
                    </div>
                  ),
                },
              ]
            : []),
          {
            id: "contacts", label: "Контакти", count: contacts.length,
            content: (
              <Card flush title="Контактні особи" action={contacts.length > 0 && <CreateButton kind="contact" label="Додати контакт" size="sm" variant="secondary" values={link} />}>
                <ContactsList rows={contacts} clientId={id} />
              </Card>
            ),
          },
          {
            id: "notes", label: "Нотатки", count: notes.length,
            content: (
              <Card flush title="Нотатки" action={<CreateButton kind="note" label="Нова нотатка" size="sm" variant="secondary" values={{ linkType: "client", linkId: id }} />}>
                <NotesList rows={notes} showTarget={false} />
              </Card>
            ),
          },
          {
            id: "history", label: "Історія",
            content: (
              <Card flush title="Історія дій щодо клієнта та його справ">
                <ActivityList rows={activity} />
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
