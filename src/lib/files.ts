/** File types accepted for documents. The extension decides the type; the browser's claim is not trusted. */
export const FILE_TYPES = {
  pdf: { mime: "application/pdf", label: "PDF", preview: "pdf" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "DOCX", preview: null },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "XLSX", preview: null },
  jpg: { mime: "image/jpeg", label: "JPG", preview: "image" },
  jpeg: { mime: "image/jpeg", label: "JPG", preview: "image" },
  png: { mime: "image/png", label: "PNG", preview: "image" },
} as const;

export type FileExtension = keyof typeof FILE_TYPES;

export const MAX_FILE_MB = 25;

export function extensionOf(fileName: string): FileExtension | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ext in FILE_TYPES ? (ext as FileExtension) : null;
}

export function fileKindByMime(mime: string) {
  return Object.values(FILE_TYPES).find((t) => t.mime === mime) ?? { mime, label: "Файл", preview: null };
}

export function validateFile(file: { name: string; size: number }, maxMb = MAX_FILE_MB): string | null {
  if (!extensionOf(file.name)) return "Непідтримуваний формат. Дозволено: PDF, DOCX, XLSX, JPG, PNG.";
  if (file.size === 0) return "Файл порожній.";
  if (file.size > maxMb * 1024 * 1024) return `Файл завеликий. Максимальний розмір — ${maxMb} МБ.`;
  return null;
}

/** Checks the file's first bytes against its extension, so a renamed file is rejected. */
export function contentMatchesExtension(bytes: Uint8Array, ext: FileExtension): boolean {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  switch (ext) {
    case "pdf":
      return starts(0x25, 0x50, 0x44, 0x46, 0x2d); // %PDF-
    case "png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "jpg":
    case "jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "docx":
    case "xlsx": {
      // Office files are ZIP archives; the part names are stored as plain text inside.
      if (!starts(0x50, 0x4b, 0x03, 0x04)) return false;
      const marker = ext === "docx" ? "word/" : "xl/";
      return Buffer.from(bytes).includes(marker);
    }
  }
}
