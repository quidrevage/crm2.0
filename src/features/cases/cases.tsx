"use client";

import { useMemo, useState } from "react";
import { Briefcase, UsersRound } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { DataTable, Pagination, usePagination, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/form";
import { caseStatusLabel, caseStatusTone, practiceAreas } from "@/i18n/uk";
import { formatDate } from "@/lib/dates";
import { getClient, users } from "@/mocks/data";
import type { CaseParty, LegalCase } from "@/types/domain";
import { ClientLink, FilterBar, FilterSelect, UserCell, labelOptions, valueOptions } from "../common";

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
    { key: "area", header: "Галузь", cell: (k) => k.practiceArea },
    { key: "status", header: "Статус", cell: (k) => <Badge tone={caseStatusTone[k.status]}>{caseStatusLabel[k.status]}</Badge> },
    { key: "responsible", header: "Відповідальний", cell: (k) => <UserCell id={k.responsibleId} /> },
    { key: "next", header: "Наступна дата", cell: (k) => <span className="num">{formatDate(k.nextDate)}</span> },
  ];
  return showClient ? columns : columns.filter((c) => c.key !== "client");
}

const emptyCases = (
  <EmptyState icon={<Briefcase className="h-6 w-6" />} title="Справ не знайдено" hint="Змініть умови пошуку або створіть нову справу." />
);

export function CasesTable({ rows, showClient = true }: { rows: LegalCase[]; showClient?: boolean }) {
  return <DataTable columns={caseColumns(showClient)} rows={rows} rowKey={(k) => k.id} rowHref={(k) => `/cases/${k.id}`} empty={emptyCases} />;
}

export function CasesList({ rows }: { rows: LegalCase[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [area, setArea] = useState("");
  const [responsible, setResponsible] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (k) =>
        (!status || k.status === status) &&
        (!area || k.practiceArea === area) &&
        (!responsible || k.responsibleId === responsible) &&
        (!q ||
          [k.title, k.number, k.courtCaseNumber, k.opposingParty, getClient(k.clientId)?.name].some((f) =>
            f?.toLowerCase().includes(q),
          )),
    );
  }, [rows, query, status, area, responsible]);

  const paging = usePagination(filtered);

  return (
    <Card flush>
      <FilterBar>
        <SearchInput
          className="w-full sm:w-72"
          placeholder="Назва, номер справи, клієнт…"
          aria-label="Пошук справ"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <FilterSelect label="Статус" value={status} onChange={setStatus} options={labelOptions(caseStatusLabel)} />
        <FilterSelect label="Галузь" value={area} onChange={setArea} options={valueOptions(practiceAreas)} />
        <FilterSelect
          label="Відповідальний"
          value={responsible}
          onChange={setResponsible}
          options={users.map((u) => ({ value: u.id, label: u.fullName }))}
        />
      </FilterBar>
      <CasesTable rows={paging.pageRows} />
      <Pagination page={paging.page} pageCount={paging.pageCount} total={paging.total} pageSize={paging.pageSize} onChange={paging.setPage} />
    </Card>
  );
}

const partyColumns: Column<CaseParty>[] = [
  { key: "name", header: "Учасник", cell: (p) => p.name, mobile: "title" },
  { key: "role", header: "Процесуальний статус", cell: (p) => p.role },
  { key: "ours", header: "", cell: (p) => (p.isOurClient ? <Badge tone="accent">Наш клієнт</Badge> : null), mobile: "hidden" },
];

export function PartiesTable({ rows }: { rows: CaseParty[] }) {
  return (
    <DataTable
      columns={partyColumns}
      rows={rows}
      rowKey={(p) => p.id}
      empty={
        <EmptyState
          icon={<UsersRound className="h-6 w-6" />}
          title="Учасників ще не додано"
          hint="Додайте сторони та інших учасників справи."
        />
      }
    />
  );
}
