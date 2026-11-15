"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Briefcase, CalendarPlus, FileUp, ListPlus, Pencil, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions";
import { deleteRow, setArchived } from "./records/actions";
import { useRecordForm, type OpenOptions, type RecordKind } from "./quick-create";

type CreateButtonProps = {
  kind: RecordKind;
  label: string;
  values?: Record<string, unknown>;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  icon?: ReactNode;
  tasks?: OpenOptions["tasks"];
};

export function CreateButton({ kind, label, values, variant = "primary", size = "md", icon, tasks }: CreateButtonProps) {
  const form = useRecordForm();
  return (
    <Button variant={variant} size={size} onClick={() => form.open(kind, { values, tasks })}>
      {icon ?? <Plus className="h-4 w-4" />}
      {label}
    </Button>
  );
}

export function EditButton({ kind, options, label = "Редагувати", size = "md" }: { kind: RecordKind; options: OpenOptions; label?: string; size?: "sm" | "md" }) {
  const form = useRecordForm();
  return (
    <Button size={size} onClick={() => form.open(kind, options)}>
      <Pencil className="h-4 w-4" />
      {label}
    </Button>
  );
}

/** Runs a server action and reports the real outcome. */
export function useRunAction() {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  async function run(action: () => Promise<ActionResult>, success: string) {
    setPending(true);
    try {
      const result = await action();
      if (result.ok) toast.show({ tone: "success", title: success });
      else toast.show({ tone: "error", title: "Дію не виконано", description: result.error });
      return result.ok;
    } catch {
      toast.show({ tone: "error", title: "Немає зв’язку із сервером", description: "Перевірте інтернет-з’єднання і спробуйте ще раз." });
      return false;
    } finally {
      setPending(false);
    }
  }
  return { run, pending };
}

type ArchiveTable = Parameters<typeof setArchived>[0];

type ArchiveButtonProps = {
  table: ArchiveTable;
  id: string;
  archivedAt: string | null;
  confirmTitle: string;
  confirmMessage: string;
  /** Where to go after archiving (e.g. back to the list). */
  afterArchive?: string;
  size?: "sm" | "md";
};

export function ArchiveButton({ table, id, archivedAt, confirmTitle, confirmMessage, afterArchive, size = "md" }: ArchiveButtonProps) {
  const router = useRouter();
  const { run, pending } = useRunAction();
  const [confirming, setConfirming] = useState(false);

  if (archivedAt) {
    return (
      <Button size={size} disabled={pending} onClick={() => run(() => setArchived(table, id, false), "Запис відновлено з архіву")}>
        <ArchiveRestore className="h-4 w-4" />
        Відновити
      </Button>
    );
  }
  return (
    <>
      <Button size={size} disabled={pending} onClick={() => setConfirming(true)}>
        <Archive className="h-4 w-4" />
        До архіву
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel="Перемістити до архіву"
        onConfirm={async () => {
          const ok = await run(() => setArchived(table, id, true), "Переміщено до архіву");
          if (ok && afterArchive) router.push(afterArchive);
        }}
      />
    </>
  );
}

export function DeleteRowButton({ table, id, title, message }: { table: Parameters<typeof deleteRow>[0]; id: string; title: string; message: string }) {
  const { run, pending } = useRunAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(true)}
        className="rounded px-2 py-1 text-[13px] text-muted hover:bg-danger-soft hover:text-danger"
      >
        Видалити
      </button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={title}
        message={message}
        confirmLabel="Видалити"
        danger
        onConfirm={() => void run(() => deleteRow(table, id), "Видалено")}
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
