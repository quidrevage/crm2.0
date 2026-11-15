"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Avatar, Badge } from "@/components/ui/display";
import { SearchInput } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { useLookups } from "./lookups/context";

export function UserCell({ id }: { id?: string }) {
  const { users } = useLookups();
  const user = users.find((u) => u.id === id);
  if (!user) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Avatar name={user.fullName} className="h-5 w-5 text-[9px]" />
      {user.fullName}
    </span>
  );
}

const linkCls = "hover:text-accent hover:underline";

export function ClientLink({ id }: { id?: string }) {
  const { clients } = useLookups();
  const client = clients.find((c) => c.id === id);
  if (!client) return <span className="text-muted">—</span>;
  return (
    <Link href={`/clients/${client.id}`} className={linkCls}>
      {client.name}
    </Link>
  );
}

export function CaseLink({ id, withNumber }: { id?: string; withNumber?: boolean }) {
  const { caseOf } = useLookups();
  const legalCase = caseOf(id);
  if (!legalCase) return <span className="text-muted">—</span>;
  return (
    <Link href={`/cases/${legalCase.id}`} className={linkCls}>
      {withNumber && <span className="num text-muted">{legalCase.number} · </span>}
      {legalCase.title}
    </Link>
  );
}

export function CaseStatusBadge({ id }: { id?: string }) {
  const { statusOf } = useLookups();
  const status = statusOf(id);
  return status ? <Badge tone={status.tone}>{status.name}</Badge> : <span className="text-muted">—</span>;
}

export function RefName({ list, id }: { list: "practiceAreas" | "matterTypes" | "partyRoles" | "documentCategories" | "courtTypes"; id?: string }) {
  const lookups = useLookups();
  return <>{lookups.refName(lookups[list], id)}</>;
}

export function ArchivedBadge({ archivedAt }: { archivedAt?: string | null }) {
  return archivedAt ? <Badge>В архіві</Badge> : null;
}

// ---------------------------------------------------------------------------
// Filters kept in the URL: shareable, survive reloads, and are applied by the database query.
// ---------------------------------------------------------------------------

export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function set(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in updates)) next.delete("page");
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  return { get: (key: string) => params.get(key) ?? "", set, pending };
}

export function FilterBar({ children, pending }: { children: ReactNode; pending?: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-b border-line p-3 transition-opacity", pending && "opacity-70")}>
      {children}
    </div>
  );
}

/** Search box that updates the `q` URL parameter after a short pause in typing. */
export function UrlSearch({ placeholder, label, className = "w-full sm:w-72" }: { placeholder: string; label: string; className?: string }) {
  const filters = useUrlFilters();
  const current = filters.get("q");
  const [value, setValue] = useState(current);

  useEffect(() => setValue(current), [current]);
  useEffect(() => {
    if (value === current) return;
    const timer = window.setTimeout(() => filters.set({ q: value.trim() || null }), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <SearchInput className={className} placeholder={placeholder} aria-label={label} value={value} onChange={(e) => setValue(e.target.value)} />
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
  allLabel?: string;
};

/** A compact filter dropdown; the first option clears the filter. */
export function FilterSelect({ label, value, onChange, options, className, allLabel }: FilterSelectProps) {
  return (
    <span className={cn("relative block w-[calc(50%-0.25rem)] sm:w-auto", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-md border border-line-strong bg-surface pr-7 pl-2.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 sm:h-9 sm:w-auto sm:max-w-56 sm:text-sm"
      >
        <option value="">{allLabel ?? `${label}: усі`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-muted">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** FilterSelect bound to a URL parameter. */
export function UrlSelect(props: Omit<FilterSelectProps, "value" | "onChange"> & { param: string }) {
  const filters = useUrlFilters();
  const { param, ...rest } = props;
  return <FilterSelect {...rest} value={filters.get(param)} onChange={(value) => filters.set({ [param]: value || null })} />;
}

export function ArchiveToggle() {
  const filters = useUrlFilters();
  const on = filters.get("archived") === "1";
  return (
    <label className="flex h-9 cursor-pointer items-center gap-2 px-1 text-[13px] text-muted">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => filters.set({ archived: e.target.checked ? "1" : null })}
        className="h-4 w-4 accent-accent"
      />
      Показати архів
    </label>
  );
}

/** Page navigation for database-paginated lists (?page=N). */
export function UrlPagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const filters = useUrlFilters();
  if (total === 0) return null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const go = (p: number) => filters.set({ page: p > 1 ? String(p) : null });
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-[13px] text-muted">
      <span className="num">
        {from}–{to} з {total}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <IconButton label="Попередня сторінка" disabled={page <= 1} onClick={() => go(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="num px-1">
            {page} / {pageCount}
          </span>
          <IconButton label="Наступна сторінка" disabled={page >= pageCount} onClick={() => go(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      )}
    </div>
  );
}

export const labelOptions = <K extends string>(labels: Record<K, string>) =>
  (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
