"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Briefcase, FileText, Landmark, ListChecks, Loader2, Search, Users, type LucideIcon } from "lucide-react";
import { globalSearch, type SearchHit } from "@/features/search/actions";

const groups: Array<{ kind: SearchHit["kind"]; title: string; icon: LucideIcon; href: (hit: SearchHit) => string }> = [
  { kind: "client", title: "Клієнти", icon: Users, href: (h) => `/clients/${h.id}` },
  { kind: "case", title: "Справи", icon: Briefcase, href: (h) => `/cases/${h.id}` },
  { kind: "document", title: "Документи", icon: FileText, href: (h) => `/documents/${h.id}` },
  { kind: "task", title: "Завдання", icon: ListChecks, href: (h) => `/tasks?status=all&q=${encodeURIComponent(h.label)}` },
  { kind: "court", title: "Суди", icon: Landmark, href: (h) => `/courts?q=${encodeURIComponent(h.label)}` },
];

/** Searches the database (names and numbers, not file contents) as you type. */
export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const pathname = usePathname();
  const q = query.trim();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await globalSearch(q);
        if (id === requestId.current) {
          setHits(result);
          setFailed(false);
        }
      } catch {
        if (id === requestId.current) setFailed(true);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
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

  const showPanel = open && q.length >= 2;
  const visible = groups.map((g) => ({ ...g, hits: hits.filter((h) => h.kind === g.kind) })).filter((g) => g.hits.length > 0);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 lg:max-w-md">
      {loading ? (
        <Loader2 aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
      ) : (
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted" />
      )}
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
        <div id="global-search-results" className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-[70dvh] overflow-y-auto rounded-md bg-surface p-1 shadow-overlay">
          {failed ? (
            <p className="px-3 py-4 text-center text-[13px] text-danger">Пошук тимчасово недоступний. Перевірте з’єднання.</p>
          ) : visible.length === 0 ? (
            <p className="px-3 py-4 text-center text-[13px] text-muted">{loading ? "Пошук…" : `Нічого не знайдено за запитом «${q}»`}</p>
          ) : (
            visible.map((group) => (
              <div key={group.kind} className="py-1">
                <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted">
                  <group.icon className="h-3.5 w-3.5" />
                  {group.title}
                </p>
                {group.hits.map((hit) => (
                  <Link
                    key={hit.id}
                    href={group.href(hit)}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="block rounded px-2 py-1.5 hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none"
                  >
                    <span className="block truncate text-sm">{hit.label}</span>
                    {hit.sublabel && <span className="num block truncate text-xs text-muted">{hit.sublabel}</span>}
                  </Link>
                ))}
              </div>
            ))
          )}
          <p className="border-t border-line px-2 pt-1.5 pb-1 text-[11px] text-muted">Пошук за назвами й номерами. Вміст файлів не індексується.</p>
        </div>
      )}
    </div>
  );
}
