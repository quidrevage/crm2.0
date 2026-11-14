import { notFound } from "next/navigation";
import { Contact } from "lucide-react";
import { Badge, Card, DetailList, EmptyState, PageHeader } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { CasesTable } from "@/features/cases/cases";
import { UserCell } from "@/features/common";
import { DocumentsTable } from "@/features/documents/documents";
import { FeesTable, PaymentsTable } from "@/features/finance/finance";
import { ActivityList, FinanceSummary, NotesList } from "@/features/lists";
import { CreateButton, RecordActions } from "@/features/record-actions";
import { clientStatusLabel, clientStatusTone, clientTypeLabel } from "@/i18n/uk";
import { formatDate } from "@/lib/dates";
import { financeTotals, withPaid } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { activity, cases, clientContacts, documents, expenses, feeAgreements, getClient, notes, payments } from "@/mocks/data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: getClient((await params).id)?.name ?? "Клієнт" };
}

export default async function ClientPage({ params }: Props) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  const isEntity = client.type === "legal_entity";
  const own = <T extends { clientId?: string }>(rows: T[]) => rows.filter((row) => row.clientId === id);
  const clientCases = own(cases);
  const clientDocs = own(documents);
  const clientFees = own(feeAgreements);
  const clientPayments = own(payments);
  const clientNotes = own(notes);
  const contacts = own(clientContacts);
  const totals = financeTotals(clientFees, clientPayments, own(expenses));

  const { id: _id, number: _n, createdAt: _c, updatedAt: _u, ...values } = client;
  const defaults = { rnokpp: "", edrpou: "", representative: "", ...values };

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
          <RecordActions
            kind="client"
            defaults={defaults}
            archiveTitle="Перемістити клієнта до архіву?"
            archiveMessage="Клієнт зникне зі списку активних, але всі його справи, документи й платежі збережуться. Запис можна буде відновити."
          />
        }
      />

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
                        ? { label: "Код ЄДРПОУ", value: <span className="num">{client.edrpou}</span> }
                        : { label: "РНОКПП", value: <span className="num">{client.rnokpp}</span> },
                      ...(isEntity ? [{ label: "Керівник або уповноважена особа", value: client.representative }] : []),
                      { label: "Телефон", value: client.phone && <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="num hover:underline">{client.phone}</a> },
                      { label: "Електронна пошта", value: client.email && <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a> },
                      { label: isEntity ? "Юридична адреса" : "Адреса", value: client.address },
                      { label: "Відповідальний", value: <UserCell id={client.assignedTo} /> },
                      { label: "Створено", value: <span className="num">{formatDate(client.createdAt)}</span> },
                      { label: "Оновлено", value: <span className="num">{formatDate(client.updatedAt)}</span> },
                      { label: "Примітки", value: client.notes },
                    ]}
                  />
                </Card>
                <Card title="Коротко">
                  <DetailList
                    columns={1}
                    items={[
                      { label: "Справ", value: <span className="num">{clientCases.length}</span> },
                      { label: "Документів", value: <span className="num">{clientDocs.length}</span> },
                      { label: "До сплати", value: <span className="num">{formatMoney(totals.outstanding)}</span> },
                    ]}
                  />
                </Card>
              </div>
            ),
          },
          {
            id: "cases", label: "Справи", count: clientCases.length,
            content: (
              <Card flush title="Справи клієнта" action={<CreateButton kind="case" label="Нова справа" size="sm" variant="secondary" defaults={{ clientId: id }} />}>
                <CasesTable rows={clientCases} showClient={false} />
              </Card>
            ),
          },
          {
            id: "documents", label: "Документи", count: clientDocs.length,
            content: (
              <Card flush title="Документи" action={<CreateButton kind="document" label="Завантажити" size="sm" variant="secondary" defaults={{ clientId: id }} />}>
                <DocumentsTable rows={clientDocs} showLinks={false} />
              </Card>
            ),
          },
          {
            id: "payments", label: "Платежі", count: clientPayments.length,
            content: (
              <div className="space-y-4">
                <FinanceSummary totals={totals} />
                <Card flush title="Погоджені гонорари">
                  <FeesTable rows={withPaid(clientFees, clientPayments)} hide={["client"]} />
                </Card>
                <Card flush title="Отримані платежі" action={<CreateButton kind="payment" label="Внести платіж" size="sm" variant="secondary" defaults={{ clientId: id }} />}>
                  <PaymentsTable rows={clientPayments} hide={["client"]} />
                </Card>
              </div>
            ),
          },
          {
            id: "contacts", label: "Контакти", count: contacts.length,
            content: (
              <Card flush title="Контактні особи">
                {contacts.length === 0 ? (
                  <EmptyState icon={<Contact className="h-6 w-6" />} title="Контактних осіб не додано" />
                ) : (
                  <ul className="divide-y divide-line">
                    {contacts.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{c.fullName}</p>
                          <p className="text-[13px] text-muted">{c.position}</p>
                        </div>
                        <p className="num text-[13px]">
                          {c.phone}
                          {c.email && ` · ${c.email}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ),
          },
          {
            id: "notes", label: "Нотатки", count: clientNotes.length,
            content: (
              <Card flush title="Нотатки" action={<CreateButton kind="note" label="Нова нотатка" size="sm" variant="secondary" defaults={{ linkType: "client", linkId: id }} />}>
                <NotesList rows={clientNotes} showTarget={false} />
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
