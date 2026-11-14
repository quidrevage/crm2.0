"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Desktop cell classes (width, alignment). */
  className?: string;
  /** On phones: "title" is the card heading, "hidden" is omitted, default is a labelled row. */
  mobile?: "title" | "hidden";
  align?: "right";
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  empty: ReactNode;
};

/** Table on desktop, stacked cards below 640px — same data, no horizontal scrolling. */
export function DataTable<T>({ columns, rows, rowKey, rowHref, empty }: DataTableProps<T>) {
  if (rows.length === 0) return <>{empty}</>;

  const titleCol = columns.find((c) => c.mobile === "title") ?? columns[0];
  const metaCols = columns.filter((c) => c !== titleCol && c.mobile !== "hidden");

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[13px] text-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn("h-9 px-3 font-medium first:pl-4 last:pr-4", col.align === "right" && "text-right", col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-bg">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("h-10 px-3 py-1.5 align-middle first:pl-4 last:pr-4", col.align === "right" && "num text-right", col.className)}
                  >
                    {col === titleCol && rowHref ? (
                      <Link href={rowHref(row)} className="font-medium hover:text-accent hover:underline">
                        {col.cell(row)}
                      </Link>
                    ) : (
                      col.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line sm:hidden">
        {rows.map((row) => {
          // Only the title is a link: cells may contain their own links, and links cannot nest.
          return (
            <li key={rowKey(row)} className="px-4 py-3">
              {rowHref ? (
                <Link href={rowHref(row)} className="block text-sm font-medium text-accent">
                  {titleCol.cell(row)}
                </Link>
              ) : (
                <div className="text-sm font-medium">{titleCol.cell(row)}</div>
              )}
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-[13px]">
                {metaCols.map((col) => (
                  <div key={col.key} className="contents">
                    <dt className="text-muted">{col.header}</dt>
                    <dd className="min-w-0 justify-self-end text-right">{col.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Client-side paging over an already filtered list. Resets to page 1 when the list changes size. */
export function usePagination<T>(rows: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => setPage(1), [rows.length]);
  const current = Math.min(page, pageCount);
  const pageRows = useMemo(() => rows.slice((current - 1) * pageSize, current * pageSize), [rows, current, pageSize]);
  return { page: current, pageCount, pageRows, setPage, total: rows.length, pageSize };
}

type PaginationProps = { page: number; pageCount: number; total: number; pageSize: number; onChange: (page: number) => void };

export function Pagination({ page, pageCount, total, pageSize, onChange }: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-[13px] text-muted">
      <span className="num">
        {from}–{to} з {total}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <IconButton label="Попередня сторінка" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="num px-1">
            {page} / {pageCount}
          </span>
          <IconButton label="Наступна сторінка" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      )}
    </div>
  );
}
