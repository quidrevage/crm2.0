import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/display";
import { CasesList } from "@/features/cases/cases";
import { CreateButton } from "@/features/record-actions";
import { cases } from "@/mocks/data";

export const metadata: Metadata = { title: "Справи" };

export default function CasesPage() {
  return (
    <>
      <PageHeader title="Справи" actions={<CreateButton kind="case" label="Створити справу" />} />
      <CasesList rows={cases} />
    </>
  );
}
