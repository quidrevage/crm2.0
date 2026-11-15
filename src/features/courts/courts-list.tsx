"use client";

import Link from "next/link";
import { Landmark, Pencil } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/display";
import { DataTable, type Column } from "@/components/ui/data-table";
import type { Court } from "@/types/domain";
import { ArchiveToggle, FilterBar, RefName, UrlSearch, UrlSelect, useUrlFilters } from "../common";
import { editCourt } from "../form-values";
import { useLookups } from "../lookups/context";
import { useRecordForm } from "../quick-create";
import { ArchiveButton, CreateButton } from "../record-actions";

type CourtRow = Court & { caseCount: number; archivedAt?: string | null };

function CourtActions({ court, archived }: { court: CourtRow; archived: boolean }) {
  const form = useRecordForm();
  return (
    <span className="inline-flex items-center justify-end gap-1">
      <IconButton label="Редагувати" onClick={() => form.open("court", editCourt(court))}>
        <Pencil className="h-4 w-4" />
      </IconButton>
      <ArchiveButton
        table="courts"
        id={court.id}
        archivedAt={archived ? "archived" : null}
        size="sm"
        confirmTitle="Перемістити суд до архіву?"
        confirmMessage="Суд зникне з довідника та списку вибору. Справи, в яких він указаний, не зміняться."
      />
    </span>
  );
}

const blank = <span className="text-muted">не вказано</span>;

export function CourtsList({ rows, archived }: { rows: CourtRow[]; archived: boolean }) {
  const { courtTypes } = useLookups();
  const filters = useUrlFilters();
  const filtered = ["q", "type", "archived"].some((k) => filters.get(k));

  const columns: Column<CourtRow>[] = [
    {
      key: "name", header: "Суд", mobile: "title",
      cell: (c) => (
        <span>
          <span className="font-medium">{c.name}</span>
          {c.website && (
            <a href={c.website} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-accent hover:underline">
              {c.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </span>
      ),
    },
    { key: "type", header: "Тип", cell: (c) => <RefName list="courtTypes" id={c.typeId} /> },
    { key: "place", header: "Місто", cell: (c) => c.city || blank },
    { key: "address", header: "Адреса", cell: (c) => c.address || blank, mobile: "hidden" },
    { key: "phone", header: "Телефон", cell: (c) => (c.phone ? <span className="num">{c.phone}</span> : blank) },
    {
      key: "cases", header: "Справи", align: "right",
      cell: (c) => (c.caseCount ? <Link href={`/cases?court=${c.id}`} className="text-accent hover:underline">{c.caseCount}</Link> : <span className="text-muted">0</span>),
    },
    { key: "actions", header: "Дії", cell: (c) => <CourtActions court={c} archived={archived} />, align: "right", className: "w-36" },
  ];

  return (
    <Card flush>
      <FilterBar pending={filters.pending}>
        <UrlSearch placeholder="Назва суду, місто, область…" label="Пошук судів" />
        <UrlSelect param="type" label="Тип" options={courtTypes.map((t) => ({ value: t.id, label: t.name }))} />
        <ArchiveToggle />
      </FilterBar>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        empty={
          filtered ? (
            <EmptyState icon={<Landmark className="h-6 w-6" />} title="Судів не знайдено" />
          ) : (
            <EmptyState
              icon={<Landmark className="h-6 w-6" />}
              title="Довідник судів порожній"
              hint="Додавайте суди в міру потреби. Адреси та контакти звіряйте з офіційними джерелами."
              action={<CreateButton kind="court" label="Додати суд" />}
            />
          )
        }
      />
    </Card>
  );
}
