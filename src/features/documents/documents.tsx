"use client";

import Link from "next/link";
import { Download, Eye, FileImage, FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/display";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatDate } from "@/lib/dates";
import { fileKindByMime } from "@/lib/files";
import { formatFileSize } from "@/lib/format";
import type { DocumentRecord } from "@/types/domain";
import { ArchiveToggle, CaseLink, ClientLink, FilterBar, RefName, UrlPagination, UrlSearch, UrlSelect, useUrlFilters } from "../common";
import { useLookups } from "../lookups/context";
import { CreateButton } from "../record-actions";

export function FileIcon({ mime, className = "h-4 w-4 shrink-0 text-muted" }: { mime?: string; className?: string }) {
  if (!mime) return <FileText aria-hidden className={className} />;
  if (mime.startsWith("image/")) return <FileImage aria-hidden className={className} />;
  if (mime.includes("spreadsheet")) return <FileSpreadsheet aria-hidden className={className} />;
  if (mime === "application/pdf") return <FileText aria-hidden className={className} />;
  return <FileType2 aria-hidden className={className} />;
}

const iconLink =
  "inline-flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-fg sm:h-8 sm:w-8";

/** Open (only for formats a browser can show) and download. Both go through a short-lived signed link. */
export function FileLinks({ versionId, mime }: { versionId: string; mime: string }) {
  const previewable = fileKindByMime(mime).preview !== null;
  return (
    <span className="inline-flex justify-end">
      {previewable && (
        <a href={`/api/files/${versionId}?inline=1`} target="_blank" rel="noopener noreferrer" className={iconLink} title="Переглянути" aria-label="Переглянути">
          <Eye className="h-4 w-4" />
        </a>
      )}
      <a href={`/api/files/${versionId}`} className={iconLink} title="Завантажити" aria-label="Завантажити">
        <Download className="h-4 w-4" />
      </a>
    </span>
  );
}

function documentColumns(showLinks: boolean): Column<DocumentRecord>[] {
  const columns: Column<DocumentRecord>[] = [
    {
      key: "name", header: "Документ", mobile: "title",
      cell: (d) => (
        <span className="flex items-center gap-2">
          <FileIcon mime={d.current?.mimeType} />
          <span className="min-w-0">
            <span className="font-medium">{d.name}</span>
            {d.current && (
              <span className="num block text-xs font-normal text-muted">
                {fileKindByMime(d.current.mimeType).label} · {formatFileSize(d.current.sizeBytes)} · версія {d.current.versionNo}
              </span>
            )}
          </span>
        </span>
      ),
    },
    { key: "category", header: "Категорія", cell: (d) => <RefName list="documentCategories" id={d.categoryId} /> },
    { key: "client", header: "Клієнт", cell: (d) => <ClientLink id={d.clientId} /> },
    { key: "case", header: "Справа", cell: (d) => <CaseLink id={d.caseId} /> },
    {
      key: "uploaded", header: "Оновлено",
      cell: (d) => <span className="num whitespace-nowrap">{formatDate(d.current?.uploadedAt ?? d.updatedAt)}</span>,
    },
    {
      key: "actions", header: "Файл", align: "right", className: "w-24",
      cell: (d) => (d.current ? <FileLinks versionId={d.current.id} mime={d.current.mimeType} /> : <span className="text-muted">—</span>),
    },
  ];
  return showLinks ? columns : columns.filter((c) => c.key !== "client" && c.key !== "case");
}

type DocumentsTableProps = { rows: DocumentRecord[]; showLinks?: boolean; empty?: React.ReactNode };

export function DocumentsTable({ rows, showLinks = true, empty }: DocumentsTableProps) {
  return (
    <DataTable
      columns={documentColumns(showLinks)}
      rows={rows}
      rowKey={(d) => d.id}
      rowHref={(d) => `/documents/${d.id}`}
      empty={
        empty ?? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title="Документів немає" hint="Завантажте PDF, DOCX, XLSX, JPG або PNG." />
        )
      }
    />
  );
}

export function DocumentsList({ rows, total, page, pageSize }: { rows: DocumentRecord[]; total: number; page: number; pageSize: number }) {
  const { documentCategories, clients } = useLookups();
  const filters = useUrlFilters();
  const filtered = ["q", "category", "client", "archived"].some((k) => filters.get(k));

  return (
    <Card flush>
      <FilterBar pending={filters.pending}>
        <UrlSearch placeholder="Назва або опис документа…" label="Пошук документів за назвою" />
        <UrlSelect param="category" label="Категорія" options={documentCategories.map((c) => ({ value: c.id, label: c.name }))} />
        <UrlSelect param="client" label="Клієнт" options={clients.filter((c) => !c.archived).map((c) => ({ value: c.id, label: c.name }))} />
        <ArchiveToggle />
      </FilterBar>
      <DocumentsTable
        rows={rows}
        empty={
          filtered ? (
            <EmptyState icon={<FileText className="h-6 w-6" />} title="Документів не знайдено" hint="Змініть умови пошуку або скиньте фільтри." />
          ) : (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Документів ще немає"
              hint="Файли зберігаються в закритому сховищі й доступні лише користувачам системи."
              action={<CreateButton kind="document" label="Завантажити документ" />}
            />
          )
        }
      />
      <UrlPagination page={page} pageSize={pageSize} total={total} />
    </Card>
  );
}

export function DocumentLink({ document }: { document: DocumentRecord }) {
  return (
    <Link href={`/documents/${document.id}`} className="hover:text-accent hover:underline">
      {document.name}
    </Link>
  );
}
