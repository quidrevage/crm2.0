import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { ExpensesTable, FeesTable, PaymentsTable } from "@/features/finance/finance";
import { FinanceSummary } from "@/features/lists";
import { CreateButton } from "@/features/record-actions";
import { financeTotals, withPaid } from "@/lib/finance";
import { expenses, feeAgreements, payments } from "@/mocks/data";

export const metadata: Metadata = { title: "Фінанси" };

export default function FinancePage() {
  const byDate = <T,>(rows: T[], pick: (row: T) => string) => [...rows].sort((a, b) => pick(b).localeCompare(pick(a)));
  return (
    <>
      <PageHeader title="Фінанси" meta="Усі суми — у гривнях." actions={<CreateButton kind="payment" label="Внести платіж" />} />
      <FinanceSummary totals={financeTotals(feeAgreements, payments, expenses)} />
      <div className="mt-4">
        <Tabs
          tabs={[
            {
              id: "fees", label: "Гонорари", count: feeAgreements.length,
              content: (
                <Card flush>
                  <FeesTable rows={withPaid(byDate(feeAgreements, (f) => f.agreedOn), payments)} />
                </Card>
              ),
            },
            {
              id: "payments", label: "Платежі", count: payments.length,
              content: (
                <Card flush>
                  <PaymentsTable rows={byDate(payments, (p) => p.paidOn)} />
                </Card>
              ),
            },
            {
              id: "expenses", label: "Витрати", count: expenses.length,
              content: (
                <Card flush>
                  <ExpensesTable rows={byDate(expenses, (x) => x.incurredOn)} />
                </Card>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
