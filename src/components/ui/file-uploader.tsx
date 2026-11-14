"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/format";

export const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx", "jpg", "jpeg", "png"];
export const MAX_FILE_MB = 25;

export function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return "Непідтримуваний формат. Дозволено: PDF, DOCX, XLSX, JPG, PNG.";
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `Файл завеликий. Максимальний розмір — ${MAX_FILE_MB} МБ.`;
  if (file.size === 0) return "Файл порожній.";
  return null;
}

type FileUploaderProps = { file: File | null; onChange: (file: File | null) => void; error?: string };

export function FileUploader({ file, onChange, error }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function pick(candidate: File | undefined) {
    if (!candidate) return;
    const problem = validateFile(candidate);
    setLocalError(problem);
    onChange(problem ? null : candidate);
  }

  const shownError = localError ?? error;

  return (
    <div>
      {file ? (
        <div className="flex items-center gap-3 rounded-md border border-line-strong px-3 py-2">
          <FileText className="h-5 w-5 shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
          </div>
          <button
            type="button"
            aria-label="Прибрати файл"
            onClick={() => onChange(null)}
            className="rounded p-1.5 text-muted hover:bg-subtle hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-1 rounded-md border border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
            dragging ? "border-accent bg-accent-soft" : "border-line-strong hover:bg-bg",
            shownError && "border-danger",
          )}
        >
          <Upload className="h-5 w-5 text-muted" />
          <span className="text-sm font-medium">Оберіть файл або перетягніть його сюди</span>
          <span className="text-xs text-muted">PDF, DOCX, XLSX, JPG, PNG · до {MAX_FILE_MB} МБ</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {shownError && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {shownError}
        </p>
      )}
    </div>
  );
}
