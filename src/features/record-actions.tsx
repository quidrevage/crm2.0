"use client";

import { useState, type ReactNode } from "react";
import { Archive, Briefcase, CalendarPlus, FileUp, ListPlus, Pencil, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { DEMO_SAVE_NOTICE } from "@/i18n/uk";
import { useRecordForm, type RecordKind } from "./quick-create";

type CreateButtonProps = {
  kind: RecordKind;
  label: string;
  defaults?: Record<string, unknown>;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  icon?: ReactNode;
};

export function CreateButton({ kind, label, defaults, variant = "primary", size = "md", icon }: CreateButtonProps) {
  const form = useRecordForm();
  return (
    <Button variant={variant} size={size} onClick={() => form.open(kind, { defaults })}>
      {icon ?? <Plus className="h-4 w-4" />}
      {label}
    </Button>
  );
}

type RecordActionsProps = {
  kind: RecordKind;
  defaults: Record<string, unknown>;
  archiveTitle: string;
  archiveMessage: string;
};

/** Edit + archive buttons for a detail page header. */
export function RecordActions({ kind, defaults, archiveTitle, archiveMessage }: RecordActionsProps) {
  const form = useRecordForm();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Button onClick={() => form.open(kind, { defaults, isEdit: true })}>
        <Pencil className="h-4 w-4" />
        Редагувати
      </Button>
      <Button onClick={() => setConfirming(true)}>
        <Archive className="h-4 w-4" />
        До архіву
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={archiveTitle}
        message={archiveMessage}
        confirmLabel="Перемістити до архіву"
        onConfirm={() => toast.show({ title: "Демонстраційний режим", description: DEMO_SAVE_NOTICE })}
      />
    </>
  );
}

export function QuickActions() {
  const icon = "h-4 w-4 text-muted";
  return (
    <div className="flex flex-wrap gap-2">
      <CreateButton kind="client" label="Клієнт" variant="secondary" size="sm" icon={<UserPlus className={icon} />} />
      <CreateButton kind="case" label="Справа" variant="secondary" size="sm" icon={<Briefcase className={icon} />} />
      <CreateButton kind="task" label="Завдання" variant="secondary" size="sm" icon={<ListPlus className={icon} />} />
      <CreateButton kind="event" label="Подія" variant="secondary" size="sm" icon={<CalendarPlus className={icon} />} />
      <CreateButton kind="document" label="Документ" variant="secondary" size="sm" icon={<FileUp className={icon} />} />
    </div>
  );
}
