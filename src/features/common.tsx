import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/display";
import { cn } from "@/lib/cn";
import { getCase, getClient, getUser } from "@/mocks/data";

export function UserCell({ id }: { id?: string }) {
  const user = getUser(id);
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
  const client = getClient(id);
  if (!client) return <span className="text-muted">—</span>;
  return (
    <Link href={`/clients/${client.id}`} className={linkCls}>
      {client.name}
    </Link>
  );
}

export function CaseLink({ id, withNumber }: { id?: string; withNumber?: boolean }) {
  const legalCase = getCase(id);
  if (!legalCase) return <span className="text-muted">—</span>;
  return (
    <Link href={`/cases/${legalCase.id}`} className={linkCls}>
      {withNumber && <span className="num text-muted">{legalCase.number} · </span>}
      {legalCase.title}
    </Link>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">{children}</div>;
}

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
};

/** A compact filter dropdown; the first option ("label: усі") clears the filter. */
export function FilterSelect({ label, value, onChange, options, className }: FilterSelectProps) {
  return (
    <span className={cn("relative block w-[calc(50%-0.25rem)] sm:w-auto", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-md border border-line-strong bg-surface pr-7 pl-2.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 sm:h-9 sm:w-auto sm:max-w-52 sm:text-sm"
      >
        <option value="">{label}: усі</option>
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

export const labelOptions = <K extends string>(labels: Record<K, string>) =>
  (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));

export const valueOptions = (values: readonly string[]) => values.map((value) => ({ value, label: value }));
