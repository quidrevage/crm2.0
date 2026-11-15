"use client";

import { UrlSelect } from "../common";
import { useLookups } from "../lookups/context";

export function FinanceFilters() {
  const { clients } = useLookups();
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <UrlSelect param="client" label="Клієнт" className="w-full sm:w-auto" options={clients.map((c) => ({ value: c.id, label: c.name }))} />
    </div>
  );
}
