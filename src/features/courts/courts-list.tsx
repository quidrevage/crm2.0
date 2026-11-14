"use client";

import { useMemo, useState } from "react";
import { Landmark, Pencil } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/display";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/form";
import { courtTypes } from "@/i18n/uk";
import type { Court } from "@/types/domain";
import { FilterBar, FilterSelect, valueOptions } from "../common";
import { useRecordForm } from "../quick-create";

function EditCourt({ court }: { court: Court }) {
  const form = useRecordForm();
  const { id: _id, ...defaults } = court;
  return (
    <IconButton label="Редагувати" onClick={() => form.open("court", { isEdit: true, defaults })}>
      <Pencil className="h-4 w-4" />
    </IconButton>
  );
}

const blank = <span className="text-muted">не вказано</span>;

const columns: Column<Court>[] = [
  { key: "name", header: "Суд", cell: (c) => <span className="font-medium">{c.name}</span>, mobile: "title" },
  { key: "type", header: "Тип", cell: (c) => c.type },
  { key: "place", header: "Місто", cell: (c) => c.city || blank },
  { key: "address", header: "Адреса", cell: (c) => c.address || blank },
  { key: "phone", header: "Телефон", cell: (c) => c.phone || blank },
  { key: "actions", header: "Дії", cell: (c) => <EditCourt court={c} />, align: "right", className: "w-16" },
];

export function CourtsList({ rows, initialQuery = "" }: { rows: Court[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((c) => (!type || c.type === type) && (!q || [c.name, c.city, c.region].some((f) => f.toLowerCase().includes(q))));
  }, [rows, query, type]);

  return (
    <Card flush>
      <FilterBar>
        <SearchInput
          className="w-full sm:w-72"
          placeholder="Назва суду або місто…"
          aria-label="Пошук судів"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <FilterSelect label="Тип" value={type} onChange={setType} options={valueOptions(courtTypes)} className="w-full" />
      </FilterBar>
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        empty={<EmptyState icon={<Landmark className="h-6 w-6" />} title="Судів не знайдено" hint="Додайте суд до довідника вручну." />}
      />
    </Card>
  );
}
