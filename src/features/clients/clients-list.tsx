"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { DataTable, Pagination, usePagination, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/form";
import { clientStatusLabel, clientStatusTone, clientTypeLabel } from "@/i18n/uk";
import { formatDate } from "@/lib/dates";
import type { Client } from "@/types/domain";
import { FilterBar, FilterSelect, UserCell, labelOptions } from "../common";

const columns: Column<Client>[] = [
  { key: "number", header: "№", cell: (c) => <span className="num text-muted">{c.number}</span>, className: "w-20" },
  { key: "name", header: "Клієнт", cell: (c) => c.name, mobile: "title" },
  { key: "type", header: "Тип", cell: (c) => clientTypeLabel[c.type] },
  { key: "status", header: "Статус", cell: (c) => <Badge tone={clientStatusTone[c.status]}>{clientStatusLabel[c.status]}</Badge> },
  { key: "phone", header: "Телефон", cell: (c) => <span className="num whitespace-nowrap">{c.phone || "—"}</span> },
  { key: "assigned", header: "Відповідальний", cell: (c) => <UserCell id={c.assignedTo} /> },
  { key: "updated", header: "Оновлено", cell: (c) => <span className="num text-muted">{formatDate(c.updatedAt)}</span>, mobile: "hidden" },
];

export function ClientsList({ rows }: { rows: Client[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (c) =>
        (!type || c.type === type) &&
        (!status || c.status === status) &&
        (!q || [c.name, c.number, c.edrpou, c.rnokpp, c.phone, c.email].some((f) => f?.toLowerCase().includes(q))),
    );
  }, [rows, query, type, status]);

  const paging = usePagination(filtered);

  return (
    <Card flush>
      <FilterBar>
        <SearchInput
          className="w-full sm:w-72"
          placeholder="Назва, код, телефон…"
          aria-label="Пошук клієнтів"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <FilterSelect label="Тип" value={type} onChange={setType} options={labelOptions(clientTypeLabel)} />
        <FilterSelect label="Статус" value={status} onChange={setStatus} options={labelOptions(clientStatusLabel)} />
      </FilterBar>
      <DataTable
        columns={columns}
        rows={paging.pageRows}
        rowKey={(c) => c.id}
        rowHref={(c) => `/clients/${c.id}`}
        empty={
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Клієнтів не знайдено"
            hint="Змініть умови пошуку або скиньте фільтри."
          />
        }
      />
      <Pagination page={paging.page} pageCount={paging.pageCount} total={paging.total} pageSize={paging.pageSize} onChange={paging.setPage} />
    </Card>
  );
}
