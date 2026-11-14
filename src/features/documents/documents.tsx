"use client";

import { useMemo, useState } from "react";
import { Download, Eye, FileImage, FileSpreadsheet, FileText, FileType2, Pencil } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/display";
import { DataTable, Pagination, usePagination, type Column } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { DEMO_FILE_NOTICE, documentCategories } from "@/i18n/uk";
import { formatDate } from "@/lib/dates";
import { formatFileSize } from "@/lib/format";
import { clients, userName } from "@/mocks/data";
import type { DocumentRecord } from "@/types/domain";
import { CaseLink, ClientLink, FilterBar, FilterSelect, valueOptions } from "../common";
import { useRecordForm } from "../quick-create";

function fileKind(mime: string) {
  if (mime === "application/pdf") return { label: "PDF", Icon: FileText, previewable: true };
  if (mime.startsWith("image/")) return { label: mime === "image/png" ? "PNG" : "JPG", Icon: FileImage, previewable: true };
  if (mime.includes("spreadsheet")) return { label: "XLSX", Icon: FileSpreadsheet, previewable: false };
  return { label: "DOCX", Icon: FileType2, previewable: false };
}

function DocumentActions({ doc }: { doc: DocumentRecord }) {
  const toast = useToast();
  const form = useRecordForm();
  const demo = () => toast.show({ title: "Демонстраційний режим", description: DEMO_FILE_NOTICE });
  const { previewable } = fileKind(doc.mimeType);
  return (
    <span className="inline-flex justify-end">
      {/* Preview exists only for formats a browser can render natively. */}
      {previewable && (
        <IconButton label="Переглянути" onClick={demo}>
          <Eye className="h-4 w-4" />
        </IconButton>
      )}
      <IconButton label="Завантажити" onClick={demo}>
        <Download className="h-4 w-4" />
      </IconButton>
      <IconButton
        label="Властивості"
        onClick={() =>
          form.open("document", {
            isEdit: true,
            defaults: { name: doc.name, category: doc.category, clientId: doc.clientId ?? "", caseId: doc.caseId ?? "", description: doc.description },
          })
        }
      >
        <Pencil className="h-4 w-4" />
      </IconButton>
    </span>
  );
}

function documentColumns(showLinks: boolean): Column<DocumentRecord>[] {
  const columns: Column<DocumentRecord>[] = [
    {
      key: "name", header: "Документ", mobile: "title",
      cell: (d) => {
        const { Icon, label } = fileKind(d.mimeType);
        return (
          <span className="flex items-center gap-2">
            <Icon aria-hidden className="h-4 w-4 shrink-0 text-muted" />
            <span className="min-w-0">
              <span className="font-medium">{d.name}</span>
              <span className="num block text-xs font-normal text-muted">
                {label} · {formatFileSize(d.sizeBytes)} · версія {d.version}
              </span>
            </span>
          </span>
        );
      },
    },
    { key: "category", header: "Категорія", cell: (d) => d.category },
    { key: "client", header: "Клієнт", cell: (d) => <ClientLink id={d.clientId} /> },
    { key: "case", header: "Справа", cell: (d) => <CaseLink id={d.caseId} /> },
    {
      key: "uploaded", header: "Завантажено",
      cell: (d) => (
        <span className="whitespace-nowrap">
          <span className="num">{formatDate(d.uploadedAt)}</span>
          <span className="block text-xs text-muted">{userName(d.uploadedBy)}</span>
        </span>
      ),
    },
    { key: "actions", header: "Дії", cell: (d) => <DocumentActions doc={d} />, align: "right", className: "w-28" },
  ];
  return showLinks ? columns : columns.filter((c) => c.key !== "client" && c.key !== "case");
}

const emptyDocuments = (
  <EmptyState
    icon={<FileText className="h-6 w-6" />}
    title="Документів немає"
    hint="Завантажте PDF, DOCX, XLSX, JPG або PNG і прив’яжіть до клієнта чи справи."
  />
);

export function DocumentsTable({ rows, showLinks = true }: { rows: DocumentRecord[]; showLinks?: boolean }) {
  return <DataTable columns={documentColumns(showLinks)} rows={rows} rowKey={(d) => d.id} empty={emptyDocuments} />;
}

export function DocumentsList({ rows, initialQuery = "" }: { rows: DocumentRecord[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [clientId, setClientId] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (d) =>
        (!category || d.category === category) &&
        (!clientId || d.clientId === clientId) &&
        (!q || d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)),
    );
  }, [rows, query, category, clientId]);

  const paging = usePagination(filtered);

  return (
    <Card flush>
      <FilterBar>
        <SearchInput
          className="w-full sm:w-72"
          placeholder="Назва документа…"
          aria-label="Пошук документів за назвою"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <FilterSelect label="Категорія" value={category} onChange={setCategory} options={valueOptions(documentCategories)} />
        <FilterSelect
          label="Клієнт"
          value={clientId}
          onChange={setClientId}
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
        />
      </FilterBar>
      <DocumentsTable rows={paging.pageRows} />
      <Pagination page={paging.page} pageCount={paging.pageCount} total={paging.total} pageSize={paging.pageSize} onChange={paging.setPage} />
    </Card>
  );
}
