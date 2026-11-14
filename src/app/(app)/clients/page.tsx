import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { ClientsList } from "@/features/clients/clients-list";
import { CreateButton } from "@/features/record-actions";
import { clients } from "@/mocks/data";

export const metadata: Metadata = { title: "Клієнти" };

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Клієнти" actions={<CreateButton kind="client" label="Додати клієнта" />} />
      <ClientsList rows={clients} />
    </>
  );
}
