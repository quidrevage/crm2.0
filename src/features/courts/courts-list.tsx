"use client";

import Link from "next/link";
import { Landmark, Pencil } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { DataTable, type Column } from "@/components/ui/data-table";
import type { Court } from "@/types/domain";
import { ArchiveToggle, FilterBar, RefName, UrlPagination, UrlSearch, UrlSelect, useUrlFilters } from "../common";
import { editCourt } from "../form-values";
import { useLookups } from "../lookups/context";
import { useRecordForm } from "../quick-create";
import { ArchiveButton, CreateButton } from "../record-actions";

type CourtRow = Court & { caseCount: number; archivedAt?: string | null };

export const REGIONS = [
  "Вінницька область", "Волинська область", "Дніпропетровська область", "Донецька область", "Житомирська область",
  "Закарпатська область", "Запорізька область", "Івано-Франківська область", "Київська область", "Кіровоградська область",
  "Луганська область", "Львівська область", "Миколаївська область", "Одеська область", "Полтавська область",
  "Рівненська область", "Сумська область", "Тернопільська область", "Харківська область", "Херсонська область",
  "Хмельницька область", "Черкаська область", "Чернівецька область", "Чернігівська область", "м. Київ",
  "Автономна Республіка Крим", "м. Севастополь", "Загальнодержавні",
];

function CourtActions({ court, archived }: { court: CourtRow; archived: boolean }) {
  const form = useRecordForm();
  if (court.official) {
    return (
      <a
        href={`https://court.gov.ua/sud${court.code}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs whitespace-nowrap text-accent hover:underline"
        title="Сторінка суду на порталі «Судова влада України»"
      >
        court.gov.ua
      </a>
    );
  }
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

type Props = { rows: CourtRow[]; total: number; page: number; pageSize: number; archived: boolean };

export function CourtsList({ rows, total, page, pageSize, archived }: Props) {
  const { courtTypes } = useLookups();
  const filters = useUrlFilters();
  const filtered = ["q", "type", "region", "source", "archived"].some((k) => filters.get(k));

  const columns: Column<CourtRow>[] = [
    {
      key: "name", header: "Суд", mobile: "title",
      cell: (c) => (
        <span className="block min-w-56">
          <span className="font-medium">{c.name}</span>
          {!c.official && <Badge className="ml-1.5 align-middle">Додано вручну</Badge>}
          {c.website && (
            <a href={c.website} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-accent hover:underline">
              {c.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {c.workingHours && <span className="block text-xs text-muted">{c.workingHours}</span>}
        </span>
      ),
    },
    { key: "type", header: "Тип", cell: (c) => <RefName list="courtTypes" id={c.typeId} />, mobile: "hidden" },
    { key: "address", header: "Адреса", cell: (c) => (c.address ? <span className="block min-w-48">{c.address}</span> : c.region || blank) },
    {
      key: "contacts", header: "Контакти",
      cell: (c) =>
        c.phone || c.email ? (
          <span className="block min-w-48 text-[13px]">
            {c.email && (
              <a href={`mailto:${c.email.split(/[,;\s]+/)[0]}`} className="block text-accent hover:underline">
                {c.email}
              </a>
            )}
            {c.phone && <span className="num block text-muted">{c.phone}</span>}
          </span>
        ) : (
          blank
        ),
    },
    {
      key: "cases", header: "Справи", align: "right",
      cell: (c) => (c.caseCount ? <Link href={`/cases?court=${c.id}`} className="text-accent hover:underline">{c.caseCount}</Link> : <span className="text-muted">0</span>),
    },
    { key: "actions", header: "", cell: (c) => <CourtActions court={c} archived={archived} />, align: "right", className: "w-28" },
  ];

  return (
    <Card flush>
      <FilterBar pending={filters.pending}>
        <UrlSearch placeholder="Назва суду, місто, адреса…" label="Пошук судів" />
        <UrlSelect param="region" label="Регіон" options={REGIONS.map((r) => ({ value: r, label: r }))} />
        <UrlSelect param="type" label="Тип" options={courtTypes.map((t) => ({ value: t.id, label: t.name }))} />
        <UrlSelect
          param="source"
          label="Джерело"
          options={[
            { value: "official", label: "Офіційний перелік" },
            { value: "own", label: "Додані вручну" },
          ]}
        />
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
              hint="Додайте суд, якого немає в офіційному переліку."
              action={<CreateButton kind="court" label="Додати суд" />}
            />
          )
        }
      />
      <UrlPagination page={page} pageSize={pageSize} total={total} />
    </Card>
  );
}
