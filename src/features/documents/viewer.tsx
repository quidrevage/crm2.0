import "server-only";
import mammoth from "mammoth";
import readXlsxFile from "read-excel-file/node";
import type { DocumentVersion } from "@/types/domain";
import { fileKindByMime, FILE_TYPES } from "@/lib/files";
import { formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

/** Larger Office files are offered for download instead of being converted on the server. */
const MAX_CONVERT_BYTES = 15 * 1024 * 1024;
const MAX_ROWS = 500;
const MAX_COLUMNS = 40;

const frameCss = `
  :root { color-scheme: light; }
  body { margin: 0; padding: 32px 40px; font: 15px/1.6 "Times New Roman", Georgia, serif; color: #1c1c1c; background: #fff; }
  h1, h2, h3, h4 { font-family: inherit; line-height: 1.3; margin: 1.2em 0 0.5em; }
  p { margin: 0 0 0.75em; }
  table { border-collapse: collapse; margin: 0.75em 0; max-width: 100%; }
  td, th { border: 1px solid #bbb; padding: 4px 8px; vertical-align: top; }
  img { max-width: 100%; height: auto; }
  @media (max-width: 640px) { body { padding: 16px; font-size: 14px; } }
`;

/** Converted content is shown in a sandboxed frame: no scripts, no network, no access to the app. */
function SandboxedHtml({ html, title }: { html: string; title: string }) {
  const doc = `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<style>${frameCss}</style></head><body>${html}</body></html>`;
  return <iframe title={title} srcDoc={doc} sandbox="" className="h-[75dvh] w-full rounded border border-line bg-white" />;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="p-4 text-[13px] text-muted">{children}</p>;
}

function download(version: DocumentVersion) {
  return (
    <a href={`/api/files/${version.id}`} className="text-accent hover:underline">
      Завантажити файл
    </a>
  );
}

async function loadBytes(version: DocumentVersion): Promise<Buffer | null> {
  const supabase = await createClient();
  const { data: row } = await supabase.from("document_versions").select("storage_path").eq("id", version.id).maybeSingle();
  if (!row) return null;
  // Row-level security on the version and the storage object applies to this download.
  const { data } = await supabase.storage.from("documents").download(row.storage_path);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDate(value.toISOString());
  if (typeof value === "number") return value.toLocaleString("uk-UA", { maximumFractionDigits: 10 });
  if (typeof value === "boolean") return value ? "ТАК" : "НІ";
  return String(value);
}

async function WordPreview({ version }: { version: DocumentVersion }) {
  const bytes = await loadBytes(version);
  if (!bytes) return <Note>Файл недоступний. {download(version)}</Note>;
  try {
    const { value } = await mammoth.convertToHtml({ buffer: bytes });
    if (!value.trim()) return <Note>Документ не містить тексту для перегляду. {download(version)}</Note>;
    return (
      <div className="space-y-2">
        <SandboxedHtml html={value} title={version.originalFilename} />
        <p className="px-1 text-xs text-muted">
          Спрощений перегляд: оформлення, колонтитули й нумерація сторінок можуть відрізнятися від оригіналу. {download(version)}
        </p>
      </div>
    );
  } catch {
    return <Note>Не вдалося прочитати документ Word. {download(version)}</Note>;
  }
}

async function SheetPreview({ version }: { version: DocumentVersion }) {
  const bytes = await loadBytes(version);
  if (!bytes) return <Note>Файл недоступний. {download(version)}</Note>;
  let sheets: Awaited<ReturnType<typeof readXlsxFile>>;
  try {
    sheets = await readXlsxFile(bytes);
  } catch {
    return <Note>Не вдалося прочитати таблицю Excel. {download(version)}</Note>;
  }
  if (!sheets.length) return <Note>Таблиця порожня.</Note>;

  return (
    <div className="space-y-4">
      {sheets.map((sheet) => {
        const rows = sheet.data.filter((r) => r.some((c) => c !== null && c !== "")).slice(0, MAX_ROWS);
        const width = Math.min(MAX_COLUMNS, Math.max(0, ...rows.map((r) => r.length)));
        return (
          <section key={sheet.sheet}>
            {sheets.length > 1 && <h3 className="mb-1 px-1 text-sm font-medium">Аркуш «{sheet.sheet}»</h3>}
            {rows.length === 0 ? (
              <Note>Аркуш порожній.</Note>
            ) : (
              <div className="max-h-[70dvh] overflow-auto rounded border border-line">
                <table className="num min-w-full border-collapse text-[13px]">
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={i === 0 ? "bg-subtle font-medium" : "even:bg-bg"}>
                        <td className="sticky left-0 border-r border-line bg-subtle px-2 py-1 text-right text-xs text-muted">{i + 1}</td>
                        {Array.from({ length: width }, (_, j) => (
                          <td key={j} className="border-b border-line px-2 py-1 whitespace-pre-wrap">
                            {cellText(row[j])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {sheet.data.length > MAX_ROWS && (
              <p className="mt-1 px-1 text-xs text-muted">Показано перші {MAX_ROWS} рядків. {download(version)}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Shows a document version on the page: PDF and images natively in the browser,
 * Word and Excel converted to HTML on the server (formulas show their last saved values).
 */
export async function DocumentViewer({ version }: { version: DocumentVersion | null }) {
  if (!version) return <Note>Файл ще не завантажено.</Note>;
  const kind = fileKindByMime(version.mimeType);
  const src = `/api/files/${version.id}?inline=1`;

  if (kind.preview === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={version.originalFilename} className="mx-auto max-h-[75dvh] w-auto rounded" />;
  }
  if (kind.preview === "pdf") {
    return (
      <div className="space-y-2">
        <iframe title={version.originalFilename} src={src} className="h-[75dvh] w-full rounded border border-line bg-white" />
        <p className="px-1 text-xs text-muted">
          Якщо PDF не відобразився (наприклад, на iPhone),{" "}
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            відкрийте його в новій вкладці
          </a>
          .
        </p>
      </div>
    );
  }
  if (version.sizeBytes > MAX_CONVERT_BYTES) {
    return <Note>Файл завеликий для перегляду в браузері. {download(version)}</Note>;
  }
  if (version.mimeType === FILE_TYPES.docx.mime) return <WordPreview version={version} />;
  if (version.mimeType === FILE_TYPES.xlsx.mime) return <SheetPreview version={version} />;
  return <Note>Перегляд цього формату недоступний. {download(version)}</Note>;
}
