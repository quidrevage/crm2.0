"use client";

import { Wallet } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/display";
import { DataTable, type Column } from "@/components/ui/data-table";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { Expense, FeeAgreement, Payment } from "@/types/domain";
import { CaseLink, ClientLink } from "../common";
import { editExpense, editFee, editPayment } from "../form-values";
import { useLookups } from "../lookups/context";
import { useRecordForm } from "../quick-create";

export type FeeRow = FeeAgreement & { paid: number };

const money = (n: number) => <span className="num whitespace-nowrap">{formatMoney(n)}</span>;
const empty = (title: string, hint?: string) => <EmptyState icon={<Wallet className="h-6 w-6" />} title={title} hint={hint} />;

/** Title cell that opens the edit form when the user may change finance records. */
function EditableTitle({ text, onEdit }: { text: string; onEdit: () => void }) {
  const { canWriteFinance } = useLookups();
  if (!canWriteFinance) return <>{text}</>;
  return (
    <button type="button" onClick={onEdit} className="text-left font-medium hover:text-accent hover:underline">
      {text}
    </button>
  );
}

const without = <T,>(columns: Column<T>[], hide: string[]) => columns.filter((c) => !hide.includes(c.key));

export function FeesTable({ rows, hide = [] }: { rows: FeeRow[]; hide?: string[] }) {
  const form = useRecordForm();
  const columns: Column<FeeRow>[] = [
    { key: "desc", header: "Домовленість", cell: (f) => <EditableTitle text={f.description || "Гонорар"} onEdit={() => form.open("fee", editFee(f))} />, mobile: "title" },
    { key: "client", header: "Клієнт", cell: (f) => <ClientLink id={f.clientId} /> },
    { key: "case", header: "Справа", cell: (f) => <CaseLink id={f.caseId} /> },
    { key: "date", header: "Дата", cell: (f) => <span className="num">{formatDate(f.agreedOn)}</span> },
    { key: "amount", header: "Погоджено", cell: (f) => money(f.amount), align: "right" },
    { key: "paid", header: "Отримано", cell: (f) => money(f.paid), align: "right" },
    {
      key: "balance", header: "Залишок до сплати", align: "right",
      cell: (f) => {
        const balance = f.amount - f.paid;
        return <span className={cn("num whitespace-nowrap", balance > 0 ? "font-medium text-warning" : "text-muted")}>{formatMoney(balance)}</span>;
      },
    },
  ];
  return <DataTable columns={without(columns, hide)} rows={rows} rowKey={(f) => f.id} empty={empty("Погоджених гонорарів немає", "Додайте домовленість про гонорар, щоб бачити залишок до сплати.")} />;
}

export function PaymentsTable({ rows, hide = [] }: { rows: Payment[]; hide?: string[] }) {
  const form = useRecordForm();
  const columns: Column<Payment>[] = [
    { key: "desc", header: "Призначення", cell: (p) => <EditableTitle text={p.description || "Платіж"} onEdit={() => form.open("payment", editPayment(p))} />, mobile: "title" },
    { key: "client", header: "Клієнт", cell: (p) => <ClientLink id={p.clientId} /> },
    { key: "case", header: "Справа", cell: (p) => <CaseLink id={p.caseId} /> },
    { key: "date", header: "Дата платежу", cell: (p) => <span className="num">{formatDate(p.paidOn)}</span> },
    { key: "method", header: "Спосіб", cell: (p) => p.method || "—", mobile: "hidden" },
    { key: "amount", header: "Сума", cell: (p) => money(p.amount), align: "right" },
  ];
  return <DataTable columns={without(columns, hide)} rows={rows} rowKey={(p) => p.id} empty={empty("Платежів ще не було")} />;
}

export function ExpensesTable({ rows, hide = [] }: { rows: Expense[]; hide?: string[] }) {
  const form = useRecordForm();
  const columns: Column<Expense>[] = [
    {
      key: "desc", header: "Витрата", mobile: "title",
      cell: (x) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          <EditableTitle text={x.description} onEdit={() => form.open("expense", editExpense(x))} />
          {x.reimbursable && <Badge tone="accent">Відшкодовує клієнт</Badge>}
        </span>
      ),
    },
    { key: "client", header: "Клієнт", cell: (x) => <ClientLink id={x.clientId} /> },
    { key: "case", header: "Справа", cell: (x) => <CaseLink id={x.caseId} /> },
    { key: "date", header: "Дата", cell: (x) => <span className="num">{formatDate(x.incurredOn)}</span> },
    { key: "amount", header: "Сума", cell: (x) => money(x.amount), align: "right" },
  ];
  return <DataTable columns={without(columns, hide)} rows={rows} rowKey={(x) => x.id} empty={empty("Витрат не зафіксовано")} />;
}
