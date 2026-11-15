import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { ClientsList } from "@/features/clients/clients-list";
import { CreateButton } from "@/features/record-actions";
import { PAGE_SIZE, listClients, type SearchParams } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Клієнти" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { rows, total, page } = await listClients(await searchParams);
  return (
    <>
      <PageHeader title="Клієнти" meta={<span className="num">Усього: {total}</span>} actions={<CreateButton kind="client" label="Додати клієнта" />} />
      <ClientsList rows={rows} total={total} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
