"use client";

import { useEffect, useState } from "react";
import { Popover } from "radix-ui";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { dayKey, formatDate, monthGrid, monthLabel, monthStart, parseDisplayDate, shiftMonth, WEEKDAYS_SHORT } from "@/lib/dates";
import { controlCls } from "./form";
import { IconButton } from "./button";

type DatePickerProps = {
  /** "YYYY-MM-DD" or "" */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
};

/**
 * Phones get the native date control (best touch UX on iOS).
 * Desktop gets a DD.MM.YYYY text field with a month popover.
 */
export function DatePicker({ value, onChange, invalid, placeholder = "ДД.ММ.РРРР" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ? formatDate(value) : "");
  const [month, setMonth] = useState(monthStart(value || dayKey()));

  useEffect(() => {
    setText(value ? formatDate(value) : "");
    if (value) setMonth(monthStart(value));
  }, [value]);

  const today = dayKey();

  function commitText() {
    if (text.trim() === "") return onChange("");
    const parsed = parseDisplayDate(text);
    if (parsed) onChange(parsed);
    else setText(value ? formatDate(value) : "");
  }

  return (
    <>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className={cn(controlCls, "h-10 sm:hidden")}
      />

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Anchor className="relative hidden sm:block">
          <input
            type="text"
            inputMode="numeric"
            value={text}
            placeholder={placeholder}
            aria-invalid={invalid}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitText();
              }
            }}
            className={cn(controlCls, "num h-9 pr-9")}
          />
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="Відкрити календар"
              className="absolute top-1/2 right-1 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted hover:bg-subtle hover:text-fg"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </Popover.Trigger>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={6} className="z-[70] w-64 rounded-md bg-surface p-2 shadow-overlay">
            <div className="mb-1 flex items-center justify-between">
              <IconButton label="Попередній місяць" onClick={() => setMonth(shiftMonth(month, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <span className="text-sm font-medium">{monthLabel(month)}</span>
              <IconButton label="Наступний місяць" onClick={() => setMonth(shiftMonth(month, 1))}>
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-muted">
              {WEEKDAYS_SHORT.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid(month).map((key) => {
                const outside = key.slice(0, 7) !== month.slice(0, 7);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                    className={cn(
                      "num h-8 rounded text-[13px] hover:bg-subtle",
                      outside && "text-muted/60",
                      key === today && "font-semibold text-accent",
                      key === value && "bg-accent font-medium text-white hover:bg-accent-hover",
                    )}
                  >
                    {Number(key.slice(8))}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between border-t border-line pt-1">
              <button type="button" className="rounded px-2 py-1 text-[13px] text-accent hover:bg-subtle" onClick={() => { onChange(today); setOpen(false); }}>
                Сьогодні
              </button>
              <button type="button" className="rounded px-2 py-1 text-[13px] text-muted hover:bg-subtle" onClick={() => { onChange(""); setOpen(false); }}>
                Очистити
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
