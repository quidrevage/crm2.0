"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { controlCls } from "./form";

export type SearchOption = { value: string; label: string; hint?: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  emptyLabel?: string;
  /** Shown at most; the person narrows the list by typing. */
  limit?: number;
};

const norm = (s: string) => s.toLocaleLowerCase("uk").replace(/[’'ʼ`]/g, "");

/** A select for long lists (e.g. ~600 courts): type part of a name, pick with the mouse or keyboard. */
export function SearchSelect({ value, onChange, options, placeholder = "Почніть вводити назву…", emptyLabel = "Не обрано", limit = 60 }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  const matches = useMemo(() => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    const found = words.length ? options.filter((o) => words.every((w) => norm(`${o.label} ${o.hint ?? ""}`).includes(w))) : options;
    return found.slice(0, limit);
  }, [options, query, limit]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setActive(0);
        if (!o) setQuery("");
      }}
    >
      <div className="relative">
        <Popover.Trigger asChild>
          <button type="button" className={cn(controlCls, "flex items-center gap-2 pr-16 text-left")} aria-haspopup="listbox">
            <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted")}>{selected?.label ?? emptyLabel}</span>
          </button>
        </Popover.Trigger>
        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted">
          <ChevronDown className="h-4 w-4" />
        </span>
        {selected && (
          <button
            type="button"
            aria-label="Очистити"
            onClick={() => onChange("")}
            className="absolute top-1/2 right-8 -translate-y-1/2 rounded p-0.5 text-muted hover:bg-subtle hover:text-fg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            input.current?.focus();
          }}
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-72 rounded-md bg-surface p-1 shadow-overlay"
        >
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, matches.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (matches[active]) pick(matches[active].value);
              }
            }}
            placeholder={placeholder}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={matches[active] ? `${listId}-${active}` : undefined}
            className={cn(controlCls, "mb-1")}
          />
          <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto">
            {matches.length === 0 && <li className="px-2 py-2 text-[13px] text-muted">Нічого не знайдено</li>}
            {matches.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.value)}
                className={cn("flex cursor-default items-start gap-2 rounded px-2 py-1.5 text-sm", i === active && "bg-subtle")}
              >
                <span className="mt-0.5 w-4 shrink-0 text-accent">{o.value === value && <Check className="h-4 w-4" />}</span>
                <span className="min-w-0">
                  <span className="block">{o.label}</span>
                  {o.hint && <span className="block text-xs text-muted">{o.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
          {matches.length === limit && <p className="px-2 py-1 text-xs text-muted">Уточніть запит, щоб побачити інші варіанти.</p>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
