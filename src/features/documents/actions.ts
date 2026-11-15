"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dbError, fail, invalid, orNull, refreshAll, versionedUpdate, type ActionResult } from "@/lib/actions";
import { FILE_TYPES, contentMatchesExtension, extensionOf } from "@/lib/files";
import { createClient } from "@/lib/supabase/server";
import { documentSchema, editMeta, type DocumentValues, type EditMeta } from "../schemas";

const BUCKET = "documents";

export async function saveDocumentMeta(meta: EditMeta, input: DocumentValues): Promise<ActionResult> {
  await requireUser();
  const parsedMeta = editMeta.safeParse(meta);
  if (!parsedMeta.success || !parsedMeta.data.id) return fail("Некоректний запит.");
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const result = await versionedUpdate(supabase, "documents", parsedMeta.data.id, parsedMeta.data.rowVersion, {
    name: v.name, category_id: v.categoryId, client_id: orNull(v.clientId), case_id: orNull(v.caseId), description: orNull(v.description),
  });
  if (result.ok) refreshAll();
  return result;
}

const uploadInput = z.object({
  documentId: z.uuid(),
  storagePath: z.string(),
  fileName: z.string().min(1).max(255),
  /** Set for a brand-new document; omitted when adding a version. */
  meta: documentSchema.optional(),
});

/**
 * Second step of an upload. The browser has already stored the file in the private bucket
 * under "<documentId>/<random id>". Here the server checks what actually arrived and only
 * then records it. A file that fails any check is removed again.
 */
export async function finalizeUpload(input: z.infer<typeof uploadInput>): Promise<ActionResult> {
  await requireUser();
  const parsed = uploadInput.safeParse(input);
  if (!parsed.success) return parsed.error.issues.some((i) => i.path[0] === "meta") ? invalid(parsed.error) : fail("Некоректний запит.");
  const { documentId, storagePath, fileName, meta } = parsed.data;
  if (!storagePath.startsWith(`${documentId}/`)) return fail("Некоректний запит.");

  const supabase = await createClient();
  const discard = async (message: string) => {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return fail(message);
  };

  const ext = extensionOf(fileName);
  if (!ext) return discard("Непідтримуваний формат. Дозволено: PDF, DOCX, XLSX, JPG, PNG.");

  const { data: settings } = await supabase.from("app_settings").select("max_upload_mb").single();
  const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(storagePath);
  if (downloadError || !blob) return discard("Файл не отримано сховищем. Спробуйте завантажити ще раз.");

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const maxBytes = (settings?.max_upload_mb ?? 25) * 1024 * 1024;
  if (bytes.byteLength === 0) return discard("Файл порожній.");
  if (bytes.byteLength > maxBytes) return discard(`Файл завеликий. Максимальний розмір — ${settings?.max_upload_mb ?? 25} МБ.`);
  if (!contentMatchesExtension(bytes, ext)) {
    return discard("Вміст файлу не відповідає його розширенню. Перевірте, що це справжній файл PDF, DOCX, XLSX, JPG або PNG.");
  }

  const { error } = await supabase.rpc("add_document_version", {
    p_document_id: documentId,
    p_storage_path: storagePath,
    p_original_filename: fileName,
    p_mime_type: FILE_TYPES[ext].mime,
    p_size_bytes: bytes.byteLength,
    p_sha256: createHash("sha256").update(bytes).digest("hex"),
    ...(meta
      ? {
          p_name: meta.name,
          p_category_id: meta.categoryId,
          p_client_id: orNull(meta.clientId) ?? undefined,
          p_case_id: orNull(meta.caseId) ?? undefined,
          p_description: orNull(meta.description) ?? undefined,
        }
      : {}),
  });
  if (error) return discard(dbError(error, "Не вдалося зберегти документ."));

  refreshAll();
  return { ok: true, data: { id: documentId } };
}

/** Removes a file whose upload was abandoned before it was recorded (allowed only for its uploader). */
export async function discardUpload(storagePath: string) {
  await requireUser();
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(storagePath)) return;
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([storagePath]);
}

/** Permanent deletion of a document and every stored version. Administrator only (enforced by the database). */
export async function deleteDocument(documentId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "admin") return fail("Остаточно видаляти документи може лише адміністратор.");
  if (!z.uuid().safeParse(documentId).success) return fail("Некоректний запит.");
  const supabase = await createClient();

  const { data: versions, error: listError } = await supabase.from("document_versions").select("storage_path").eq("document_id", documentId);
  if (listError) return fail(dbError(listError));

  const { data: deleted, error } = await supabase.from("documents").delete().eq("id", documentId).select("id");
  if (error) return fail(dbError(error));
  if (!deleted?.length) return fail("Документ не знайдено.");

  const paths = (versions ?? []).map((v) => v.storage_path);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
    if (storageError) console.error("[storage] orphaned files after delete", documentId, storageError.message);
  }
  refreshAll();
  return { ok: true, data: { id: documentId } };
}
