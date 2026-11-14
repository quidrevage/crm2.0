import type { Expense, FeeAgreement, Payment } from "@/types/domain";

const sum = (rows: Array<{ amount: number }>) => rows.reduce((total, row) => total + row.amount, 0);

export type FinanceTotals = { agreed: number; received: number; outstanding: number; expenses: number };

/** Agreed fees, received payments and expenses are kept apart; the balance is always derived. */
export function financeTotals(fees: FeeAgreement[], payments: Payment[], expenses: Expense[]): FinanceTotals {
  const agreed = sum(fees);
  const received = sum(payments);
  return { agreed, received, outstanding: agreed - received, expenses: sum(expenses) };
}

/** Adds the amount received towards each agreement (matched by matter). */
export function withPaid(fees: FeeAgreement[], payments: Payment[]) {
  return fees.map((fee) => ({
    ...fee,
    paid: sum(payments.filter((p) => p.clientId === fee.clientId && p.caseId === fee.caseId)),
  }));
}
