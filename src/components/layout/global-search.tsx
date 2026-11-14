"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, FileText, Landmark, ListChecks, Search, Users, type LucideIcon } from "lucide-react";
import { cases, clients, courts, documents, tasks } from "@/mocks/data";

type Hit = { key: string; label: string; sub?: string; href: string };
type Group = { title: string; icon: LucideIcon; hits: Hit[] };

const LIMIT = 5;
const has = (q: string, ...fields: Array<string | undefined>) => fields.some((f) => f?.toLowerCase().includes(q));

/** Phase 2 searches the mock data in memory; Phase 4 replaces this with the database search. */
function search(query: string): Group[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const groups: Group[] = [
    {
      title: "Клієнти", icon: Users,
      hits: clients.filter((c) => has(q, c.name, c.number, c.edrpou, c.rnokpp, c.phone))
        .map((c) => ({ key: c.id, label: c.name, sub: c.number, href: `/clients/${c.id}` })),
    },
    {
      title: "Справи", icon: Briefcase,
      hits: cases.filter((k) => has(q, k.title, k.number, k.courtCaseNumber, k.opposingParty))
        .map((k) => ({ key: k.id, label: k.title, sub: k.courtCaseNumber ? `${k.number} · № ${k.courtCaseNumber}` : k.number, href: `/cases/${k.id}` })),
    },
    {
      title: "Документи", icon: FileText,
      hits: documents.filter((d) => has(q, d.name, d.category))
        .map((d) => ({ key: d.id, label: d.name, sub: d.category, href: `/documents?q=${encodeURIComponent(d.name)}` })),
    },
    {
      title: "Завдання", icon: ListChecks,
      hits: tasks.filter((t) => has(q, t.title))
        .map((t) => ({ key: t.id, label: t.title, href: `/tasks?q=${encodeURIComponent(t.title)}` })),
    },
    {
      title: "Суди", icon: Landmark,
      hits: courts.filter((c) => has(q, c.name, c.city))
        .map((c) => ({ key: c.id, label: c.name, sub: c.type, href: `/courts?q=${encodeURIComponent(c.name)}` })),
    },
  ];
  return groups.filter((g) => g.hits.length > 0).map((g) => ({ ...g, hits: g.hits.slice(0, LIMIT) }));
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const groups = useMemo(() => search(query), [query]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 lg:max-w-md">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-label="Пошук по всій системі"
        placeholder="Пошук клієнтів, справ, документів…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="h-9 w-full rounded-md border border-line bg-bg pr-2 pl-8 text-base outline-none placeholder:text-muted focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15 sm:h-8 sm:text-sm"
      />
      {showPanel && (
        <div
          id="global-search-results"
          className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-[70dvh] overflow-y-auto rounded-md bg-surface p-1 shadow-overlay"
        >
          {groups.length === 0 ? (
            <p className="px-3 py-4 text-center text-[13px] text-muted">Нічого не знайдено за запитом «{query.trim()}»</p>
          ) : (
            groups.map((group) => (
              <div key={group.title} className="py-1">
                <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted">
                  <group.icon className="h-3.5 w-3.5" />
                  {group.title}
                </p>
                {group.hits.map((hit) => (
                  <Link
                    key={hit.key}
                    href={hit.href}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="block rounded px-2 py-1.5 hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none"
                  >
                    <span className="block truncate text-sm">{hit.label}</span>
                    {hit.sub && <span className="num block truncate text-xs text-muted">{hit.sub}</span>}
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
