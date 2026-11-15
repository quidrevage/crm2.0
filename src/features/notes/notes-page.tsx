"use client";

import { StickyNote } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/display";
import type { Note } from "@/types/domain";
import { ArchiveToggle, FilterBar, UrlPagination, UrlSearch, UrlSelect, useUrlFilters } from "../common";
import { NotesList } from "../lists";
import { useLookups } from "../lookups/context";
import { CreateButton } from "../record-actions";

export function NotesBrowser({ rows, total, page, pageSize }: { rows: Note[]; total: number; page: number; pageSize: number }) {
  const { users } = useLookups();
  const filters = useUrlFilters();
  const filtered = ["q", "author", "archived"].some((k) => filters.get(k));
  return (
    <Card flush>
      <FilterBar pending={filters.pending}>
        <UrlSearch placeholder="Заголовок або текст…" label="Пошук нотаток" />
        <UrlSelect param="author" label="Автор" options={users.map((u) => ({ value: u.id, label: u.fullName }))} />
        <ArchiveToggle />
      </FilterBar>
      <NotesList
        rows={rows}
        empty={
          filtered ? (
            <EmptyState icon={<StickyNote className="h-6 w-6" />} title="Нотаток не знайдено" />
          ) : (
            <EmptyState
              icon={<StickyNote className="h-6 w-6" />}
              title="Нотаток ще немає"
              hint="Нотатка прив’язується до справи, клієнта або завдання й показується на їхніх сторінках."
              action={<CreateButton kind="note" label="Нова нотатка" />}
            />
          )
        }
      />
      <UrlPagination page={page} pageSize={pageSize} total={total} />
    </Card>
  );
}
