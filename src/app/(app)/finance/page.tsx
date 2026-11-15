import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { FinanceFilters } from "@/features/finance/finance-filters";
import { ExpensesTable, FeesTable, PaymentsTable } from "@/features/finance/finance";
import { FinanceSummary } from "@/features/lists";
import { getLookups } from "@/features/lookups/queries";
import { CreateButton } from "@/features/record-actions";
import { listFinance, param, type SearchParams } from "@/lib/data/queries";
import { financeTotals, withPaid } from "@/lib/finance";

export const metadata: Metadata = { title: "Фінанси" };

export default async function FinancePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const lookups = await getLookups();
  if (lookups.me.finance === "none") redirect("/");
  const params = await searchParams;
  const { fees, payments, expenses } = await listFinance(params);
  const canWrite = lookups.me.finance === "write";
  const client = param(params, "client");
  const values = client ? { clientId: client } : undefined;
  const tab = param(params, "tab");

  return (
    <>
      <PageHeader
        title="Фінанси"
        meta={canWrite ? "Усі суми — у гривнях." : "Усі суми — у гривнях. У вас доступ лише для перегляду."}
        actions={
          canWrite && (
            <>
              <CreateButton kind="fee" label="Домовленість" variant="secondary" values={values} />
              <CreateButton kind="expense" label="Витрата" variant="secondary" values={values} />
              <CreateButton kind="payment" label="Внести платіж" values={values} />
            </>
          )
        }
      />
      <FinanceFilters />
      <FinanceSummary totals={financeTotals(fees, payments, expenses)} />
      <div className="mt-4">
        <Tabs
          defaultTab={["payments", "expenses"].includes(tab) ? tab : "fees"}
          tabs={[
            {
              id: "fees", label: "Гонорари", count: fees.length,
              content: (
                <Card flush>
                  <FeesTable rows={withPaid(fees, payments)} />
                </Card>
              ),
            },
            {
              id: "payments", label: "Платежі", count: payments.length,
              content: (
                <Card flush>
                  <PaymentsTable rows={payments} />
                </Card>
              ),
            },
            {
              id: "expenses", label: "Витрати", count: expenses.length,
              content: (
                <Card flush>
                  <ExpensesTable rows={expenses} />
                </Card>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
