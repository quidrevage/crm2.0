import { Download } from "lucide-react";
import { buttonCls } from "@/components/ui/button";

/** A plain download link: the browser saves the CSV produced by /api/export. */
export function ExportButton({ kind }: { kind: "clients" | "cases" | "tasks" }) {
  return (
    <a href={`/api/export/${kind}`} download className={buttonCls("secondary", "md")} title="Завантажити список у форматі CSV (відкривається в Excel)">
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Експорт</span>
    </a>
  );
}
