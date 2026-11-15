"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Lookups } from "./queries";

type LookupHelpers = Lookups & {
  userName: (id?: string) => string;
  clientName: (id?: string) => string;
  caseOf: (id?: string) => Lookups["cases"][number] | undefined;
  statusOf: (id?: string) => Lookups["caseStatuses"][number] | undefined;
  refName: (list: Array<{ id: string; name: string }>, id?: string) => string;
  canReadFinance: boolean;
  canWriteFinance: boolean;
  isAdmin: boolean;
};

const LookupsContext = createContext<LookupHelpers | null>(null);

export function LookupsProvider({ value, children }: { value: Lookups; children: ReactNode }) {
  const helpers = useMemo<LookupHelpers>(() => {
    const index = <T extends { id: string }>(list: T[]) => new Map(list.map((item) => [item.id, item]));
    const users = index(value.users);
    const clients = index(value.clients);
    const cases = index(value.cases);
    const statuses = index(value.caseStatuses);
    return {
      ...value,
      userName: (id) => (id && users.get(id)?.fullName) || "—",
      clientName: (id) => (id && clients.get(id)?.name) || "—",
      caseOf: (id) => (id ? cases.get(id) : undefined),
      statusOf: (id) => (id ? statuses.get(id) : undefined),
      refName: (list, id) => (id && list.find((item) => item.id === id)?.name) || "—",
      canReadFinance: value.me.finance !== "none",
      canWriteFinance: value.me.finance === "write",
      isAdmin: value.me.role === "admin",
    };
  }, [value]);
  return <LookupsContext.Provider value={helpers}>{children}</LookupsContext.Provider>;
}

export function useLookups() {
  const ctx = useContext(LookupsContext);
  if (!ctx) throw new Error("useLookups must be used inside LookupsProvider");
  return ctx;
}
