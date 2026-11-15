"use client";

import { Briefcase, Pencil, UsersRound } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatDate } from "@/lib/dates";
import type { CaseParty, LegalCase } from "@/types/domain";
import {
  ArchiveToggle, CaseStatusBadge, ClientLink, FilterBar, RefName, UrlPagination, UrlSearch, UrlSelect, UserCell, useUrlFilters,
} from "../common";
import { editParty } from "../form-values";
import { useLookups } from "../lookups/context";
import { useRecordForm } from "../quick-create";
import { CreateButton, DeleteRowButton } from "../record-actions";

function caseColumns(showClient: boolean): Column<LegalCase>[] {
  const columns: Column<LegalCase>[] = [
    { key: "number", header: "№", cell: (k) => <span className="num text-muted">{k.number}</span>, className: "w-24" },
    {
      key: "title", header: "Справа", mobile: "title",
      cell: (k) => (
        <>
          {k.title}
          {k.courtCaseNumber && <span className="num block text-xs font-normal text-muted">№ {k.courtCaseNumber}</span>}
        </>
      ),
    },
    { key: "client", header: "Клієнт", cell: (k) => <ClientLink id={k.clientId} /> },
    { key: "area", header: "Галузь", cell: (k) => <RefName list="practiceAreas" id={k.practiceAreaId} /> },
    { key: "status", header: "Статус", cell: (k) => <CaseStatusBadge id={k.statusId} /> },
    { key: "responsible", header: "Відповідальний", cell: (k) => <UserCell id={k.responsibleId} /> },
    { key: "next", header: "Наступна дата", cell: (k) => <span className="num">{formatDate(k.nextDate)}</span> },
  ];
  return showClient ? columns : columns.filter((c) => c.key !== "client");
}

type CasesTableProps = { rows: LegalCase[]; showClient?: boolean; empty?: React.ReactNode };

export function CasesTable({ rows, showClient = true, empty }: CasesTableProps) {
  return (
    <DataTable
      columns={caseColumns(showClient)}
      rows={rows}
      rowKey={(k) => k.id}
      rowHref={(k) => `/cases/${k.id}`}
      empty={empty ?? <EmptyState icon={<Briefcase className="h-6 w-6" />} title="Справ немає" />}
    />
  );
}

export function CasesList({ rows, total, page, pageSize }: { rows: LegalCase[]; total: number; page: number; pageSize: number }) {
  const { users, practiceAreas, caseStatuses, clients, courts } = useLookups();
  const filters = useUrlFilters();
  const filtered = ["q", "status", "area", "responsible", "client", "court", "archived"].some((k) => filters.get(k));

  return (
    <Card flush>
      <FilterBar pending={filters.pending}>
        <UrlSearch placeholder="Назва, номер справи, клієнт…" label="Пошук справ" />
        <UrlSelect param="status" label="Статус" options={caseStatuses.map((s) => ({ value: s.id, label: s.name }))} />
        <UrlSelect param="area" label="Галузь" options={practiceAreas.map((a) => ({ value: a.id, label: a.name }))} />
        <UrlSelect param="responsible" label="Відповідальний" options={users.map((u) => ({ value: u.id, label: u.fullName }))} />
        <UrlSelect param="client" label="Клієнт" options={clients.filter((c) => !c.archived).map((c) => ({ value: c.id, label: c.name }))} />
        {courts.length > 0 && <UrlSelect param="court" label="Суд" options={courts.map((c) => ({ value: c.id, label: c.name }))} />}
        <ArchiveToggle />
      </FilterBar>
      <CasesTable
        rows={rows}
        empty={
          filtered ? (
            <EmptyState icon={<Briefcase className="h-6 w-6" />} title="Справ не знайдено" hint="Змініть умови пошуку або скиньте фільтри." />
          ) : (
            <EmptyState
              icon={<Briefcase className="h-6 w-6" />}
              title="Справ ще немає"
              hint={clients.length === 0 ? "Спершу додайте клієнта — справа завжди належить клієнту." : "Створіть першу справу для клієнта."}
              action={clients.length === 0 ? <CreateButton kind="client" label="Додати клієнта" /> : <CreateButton kind="case" label="Створити справу" />}
            />
          )
        }
      />
      <UrlPagination page={page} pageSize={pageSize} total={total} />
    </Card>
  );
}

export function PartiesList({ rows, caseId }: { rows: CaseParty[]; caseId: string }) {
  const form = useRecordForm();
  const { refName, partyRoles } = useLookups();
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<UsersRound className="h-6 w-6" />}
        title="Учасників ще не додано"
        hint="Додайте сторони та інших учасників справи."
        action={<CreateButton kind="party" label="Додати учасника" values={{ caseId }} variant="secondary" size="sm" />}
      />
    );
  }
  return (
    <ul className="divide-y divide-line">
      {rows.map((p) => (
        <li key={p.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {p.name}
              {p.isOurClient && <Badge tone="accent">Наш клієнт</Badge>}
            </p>
            <p className="text-[13px] text-muted">
              {refName(partyRoles, p.roleId)}
              {p.identifier && <span className="num"> · {p.identifier}</span>}
              {p.contact && ` · ${p.contact}`}
            </p>
            {p.notes && <p className="mt-1 text-[13px]">{p.notes}</p>}
          </div>
          <div className="flex items-center gap-1">
            <IconButton label="Редагувати учасника" onClick={() => form.open("party", editParty(p))}>
              <Pencil className="h-4 w-4" />
            </IconButton>
            <DeleteRowButton table="case_parties" id={p.id} title="Видалити учасника?" message={`«${p.name}» буде прибрано зі списку учасників справи.`} />
          </div>
        </li>
      ))}
    </ul>
  );
}
