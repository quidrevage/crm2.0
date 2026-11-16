"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/display";
import { ConfirmDialog } from "@/components/ui/overlay";
import { formatDateTime } from "@/lib/dates";
import { fileKindByMime } from "@/lib/files";
import { formatFileSize } from "@/lib/format";
import type { DocumentRecord, DocumentVersion } from "@/types/domain";
import { editDocument } from "../form-values";
import { useLookups } from "../lookups/context";
import { useRecordForm } from "../quick-create";
import { ArchiveButton, useRunAction } from "../record-actions";
import { deleteDocument } from "./actions";
import { FileIcon, FileLinks } from "./documents";

export function DocumentActions({ document }: { document: DocumentRecord }) {
  const form = useRecordForm();
  const router = useRouter();
  const { isAdmin } = useLookups();
  const { run, pending } = useRunAction();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      {!document.archivedAt && (
        <Button variant="primary" onClick={() => form.open("documentVersion", { id: document.id })}>
          <FileUp className="h-4 w-4" />
          Нова версія
        </Button>
      )}
      <Button onClick={() => form.open("documentEdit", editDocument(document))}>
        <Pencil className="h-4 w-4" />
        Властивості
      </Button>
      <ArchiveButton
        table="documents"
        id={document.id}
        archivedAt={document.archivedAt}
        confirmTitle="Перемістити документ до архіву?"
        confirmMessage="Документ зникне зі списків, але файли й версії збережуться. Його можна буде відновити."
      />
      {isAdmin && (
        <>
          <Button variant="danger" disabled={pending} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" />
            Видалити
          </Button>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Видалити документ остаточно?"
            message="Буде видалено документ і всі його версії з файлового сховища. Цю дію неможливо скасувати. Якщо документ лише більше не потрібен у роботі, перемістіть його до архіву."
            confirmLabel="Видалити остаточно"
            danger
            onConfirm={async () => {
              const ok = await run(() => deleteDocument(document.id), "Документ видалено");
              if (ok) router.push("/documents");
            }}
          />
        </>
      )}
    </>
  );
}

export function VersionsList({ versions, shownId, documentId }: { versions: DocumentVersion[]; shownId?: string; documentId: string }) {
  const { userName } = useLookups();
  return (
    <ul className="divide-y divide-line">
      {versions.map((v, i) => (
        <li key={v.id} className="flex items-center gap-3 px-4 py-2.5">
          <FileIcon mime={v.mimeType} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">Версія {v.versionNo}</span>
              {i === 0 && <Badge tone="accent">Поточна</Badge>}
              {v.id === shownId ? (
                <span className="text-xs text-muted">переглядається</span>
              ) : (
                <Link href={i === 0 ? `/documents/${documentId}` : `/documents/${documentId}?v=${v.id}`} scroll={false} className="text-xs text-accent hover:underline">
                  Переглянути
                </Link>
              )}
              <span className="truncate text-muted">{v.originalFilename}</span>
            </p>
            <p className="num text-[13px] text-muted">
              {fileKindByMime(v.mimeType).label} · {formatFileSize(v.sizeBytes)} · {formatDateTime(v.uploadedAt)} · {userName(v.uploadedBy)}
            </p>
          </div>
          <FileLinks versionId={v.id} mime={v.mimeType} />
        </li>
      ))}
    </ul>
  );
}
