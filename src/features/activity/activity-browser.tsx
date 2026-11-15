"use client";

import { Card } from "@/components/ui/display";
import type { ActivityEntry } from "@/types/domain";
import { FilterBar, UrlPagination, UrlSelect, useUrlFilters } from "../common";
import { ActivityList } from "../lists";
import { useLookups } from "../lookups/context";

const entityOptions = [
  { value: "clients", label: "Клієнти" },
  { value: "cases", label: "Справи" },
  { value: "case_parties", label: "Учасники справ" },
  { value: "documents", label: "Документи" },
  { value: "document_versions", label: "Версії документів" },
  { value: "tasks", label: "Завдання" },
  { value: "events", label: "Події" },
  { value: "notes", label: "Нотатки" },
  { value: "fee_agreements", label: "Гонорари" },
  { value: "payments", label: "Платежі" },
  { value: "expenses", label: "Витрати" },
  { value: "courts", label: "Суди" },
  { value: "profiles", label: "Користувачі" },
  { value: "user_invitations", label: "Запрошення" },
  { value: "app_settings", label: "Налаштування" },
];

export function ActivityBrowser({ rows, total, page, pageSize }: { rows: ActivityEntry[]; total: number; page: number; pageSize: number }) {
  const { users } = useLookups();
  const filters = useUrlFilters();
  return (
    <Card flush>
      <FilterBar pending={filters.pending}>
        <UrlSelect param="entity" label="Тип запису" options={entityOptions} />
        <UrlSelect param="actor" label="Користувач" options={users.map((u) => ({ value: u.id, label: u.fullName }))} />
      </FilterBar>
      <ActivityList rows={rows} />
      <UrlPagination page={page} pageSize={pageSize} total={total} />
    </Card>
  );
}
