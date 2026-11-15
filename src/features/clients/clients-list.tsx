"use client";

import { Users } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { DataTable, type Column } from "@/components/ui/data-table";
import { clientStatusLabel, clientStatusTone, clientTypeLabel } from "@/i18n/uk";
import { formatDate } from "@/lib/dates";
import type { Client } from "@/types/domain";
import { ArchiveToggle, FilterBar, UrlPagination, UrlSearch, UrlSelect, UserCell, labelOptions, useUrlFilters } from "../common";
import { useLookups } from "../lookups/context";
import { CreateButton } from "../record-actions";

const columns: Column<Client>[] = [
  { key: "number", header: "№", cell: (c) => <span className="num text-muted">{c.number}</span>, className: "w-20" },
  { key: "name", header: "Клієнт", cell: (c) => c.name, mobile: "title" },
  { key: "type", header: "Тип", cell: (c) => clientTypeLabel[c.type] },
  { key: "status", header: "Статус", cell: (c) => <Badge tone={clientStatusTone[c.status]}>{clientStatusLabel[c.status]}</Badge> },
  { key: "phone", header: "Телефон", cell: (c) => <span className="num whitespace-nowrap">{c.phone || "—"}</span> },
  { key: "assigned", header: "Відповідальний", cell: (c) => <UserCell id={c.assignedTo} /> },
  { key: "updated", header: "Оновлено", cell: (c) => <span className="num text-muted">{formatDate(c.updatedAt)}</span>, mobile: "hidden" },
];

type Props = { rows: Client[]; total: number; page: number; pageSize: number };

export function ClientsList({ rows, total, page, pageSize }: Props) {
  const { users } = useLookups();
  const filters = useUrlFilters();
  const filtered = ["q", "type", "status", "assigned", "archived"].some((k) => filters.get(k));

  return (
    <Card flush>
      <FilterBar pending={filters.pending}>
        <UrlSearch placeholder="Назва, код, телефон…" label="Пошук клієнтів" />
        <UrlSelect param="type" label="Тип" options={labelOptions(clientTypeLabel)} />
        <UrlSelect param="status" label="Статус" options={labelOptions(clientStatusLabel)} />
        <UrlSelect param="assigned" label="Відповідальний" options={users.map((u) => ({ value: u.id, label: u.fullName }))} />
        <ArchiveToggle />
      </FilterBar>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        rowHref={(c) => `/clients/${c.id}`}
        empty={
          filtered ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="Клієнтів не знайдено" hint="Змініть умови пошуку або скиньте фільтри." />
          ) : (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Клієнтів ще немає"
              hint="Додайте першого клієнта — фізичну або юридичну особу."
              action={<CreateButton kind="client" label="Додати клієнта" />}
            />
          )
        }
      />
      <UrlPagination page={page} pageSize={pageSize} total={total} />
    </Card>
  );
}
