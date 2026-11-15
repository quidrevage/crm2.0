"use client";

import { Contact, Pencil } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import type { ClientContact } from "@/types/domain";
import { editContact } from "../form-values";
import { useRecordForm } from "../quick-create";
import { CreateButton, DeleteRowButton } from "../record-actions";

export function ContactsList({ rows, clientId }: { rows: ClientContact[]; clientId: string }) {
  const form = useRecordForm();
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Contact className="h-6 w-6" />}
        title="Контактних осіб не додано"
        hint="Наприклад, бухгалтер, довірена особа або представник клієнта."
        action={<CreateButton kind="contact" label="Додати контакт" values={{ clientId }} variant="secondary" size="sm" />}
      />
    );
  }
  return (
    <ul className="divide-y divide-line">
      {rows.map((c) => (
        <li key={c.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{c.fullName}</p>
            {c.position && <p className="text-[13px] text-muted">{c.position}</p>}
            <p className="num mt-0.5 flex flex-wrap gap-x-3 text-[13px]">
              {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="hover:underline">{c.phone}</a>}
              {c.email && <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>}
            </p>
            {c.comment && <p className="mt-1 text-[13px] text-muted">{c.comment}</p>}
          </div>
          <div className="flex items-center gap-1">
            <IconButton label="Редагувати контакт" onClick={() => form.open("contact", editContact(c))}>
              <Pencil className="h-4 w-4" />
            </IconButton>
            <DeleteRowButton table="client_contacts" id={c.id} title="Видалити контакт?" message={`Контакт «${c.fullName}» буде видалено.`} />
          </div>
        </li>
      ))}
    </ul>
  );
}
