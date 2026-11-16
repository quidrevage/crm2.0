"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { roleLabel } from "@/i18n/uk";
import { cn } from "@/lib/cn";
import type { Role } from "@/types/domain";
import { useRunAction } from "../record-actions";
import { createWorkspace, switchWorkspace, updateWorkspace } from "./actions";

export type WorkspaceOption = { id: string; name: string; role: Role };

const itemCls =
  "flex h-10 cursor-default items-center gap-2 rounded px-2 text-sm outline-none select-none data-[highlighted]:bg-subtle sm:h-8";

/** Shows the current workspace and lets a person in several workspaces move between them. */
export function WorkspaceSwitcher({
  current,
  workspaces,
  collapsed,
}: {
  current: { id: string; name: string };
  workspaces: WorkspaceOption[];
  collapsed?: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useRunAction();
  const [creating, setCreating] = useState(false);

  async function go(id: string) {
    if (id === current.id) return;
    const ok = await run(() => switchWorkspace(id), "Робочий простір змінено");
    if (ok) router.push("/");
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            disabled={pending}
            title={collapsed ? current.name : undefined}
            aria-label={`Робочий простір: ${current.name}. Змінити`}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent/35",
              collapsed && "justify-center px-0",
            )}
          >
            <Building2 className="h-4 w-4 shrink-0 text-muted" />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate font-medium">{current.name}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted" />
              </>
            )}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={6} className="z-50 w-64 rounded-md bg-surface p-1 shadow-overlay">
            <DropdownMenu.Label className="px-2 py-1.5 text-xs text-muted">Робочі простори</DropdownMenu.Label>
            {workspaces.map((w) => (
              <DropdownMenu.Item key={w.id} className={itemCls} onSelect={() => void go(w.id)}>
                <span className="w-4 text-accent">{w.id === current.id && <Check className="h-4 w-4" />}</span>
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                <span className="text-xs text-muted">{roleLabel[w.role]}</span>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item className={itemCls} onSelect={() => setCreating(true)}>
              <Plus className="h-4 w-4 text-muted" />
              Новий робочий простір
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <CreateWorkspaceDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

export function CreateWorkspaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { run, pending } = useRunAction();
  const [name, setName] = useState("");
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Новий робочий простір"
      description="Окрема команда зі своїми клієнтами, справами, документами й учасниками. Ви станете її адміністратором."
    >
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await run(() => createWorkspace({ name }), "Робочий простір створено");
          if (ok) {
            setName("");
            onOpenChange(false);
            router.push("/");
          }
        }}
      >
        <Field label="Назва" required hint="Наприклад: «АО Коваль і партнери» або «Корпоративна практика».">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus required />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button type="submit" variant="primary" disabled={pending || name.trim().length < 2}>
            {pending ? "Створення…" : "Створити"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Name and upload limit of the current workspace (administrator), plus the list of the person's workspaces. */
export function WorkspacePanel({
  workspace,
  workspaces,
  isAdmin,
}: {
  workspace: { id: string; name: string; maxUploadMb: number; maxUsers: number };
  workspaces: WorkspaceOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useRunAction();
  const [name, setName] = useState(workspace.name);
  const [maxUploadMb, setMaxUploadMb] = useState(String(workspace.maxUploadMb));
  const [creating, setCreating] = useState(false);

  return (
    <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
      <Card title="Поточний робочий простір">
        {isAdmin ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => updateWorkspace({ name, maxUploadMb }), "Налаштування збережено");
            }}
          >
            <Field label="Назва" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            </Field>
            <Field label="Максимальний розмір файлу, МБ" hint="Від 1 до 50 МБ.">
              <Input type="number" min={1} max={50} value={maxUploadMb} onChange={(e) => setMaxUploadMb(e.target.value)} className="w-32" />
            </Field>
            <p className="text-[13px] text-muted">Місць для учасників: {workspace.maxUsers}.</p>
            <Button type="submit" variant="primary" disabled={pending || name.trim().length < 2}>
              Зберегти
            </Button>
          </form>
        ) : (
          <p className="text-sm">
            <span className="font-medium">{workspace.name}</span>
            <span className="mt-1 block text-[13px] text-muted">Змінювати налаштування робочого простору може адміністратор.</span>
          </p>
        )}
      </Card>

      <Card title="Мої робочі простори" flush>
        <ul className="divide-y divide-line">
          {workspaces.map((w) => (
            <li key={w.id} className="flex items-center gap-3 px-4 py-2.5">
              <Building2 className="h-4 w-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{w.name}</span>
                <span className="text-[13px] text-muted">{roleLabel[w.role]}</span>
              </span>
              {w.id === workspace.id ? (
                <span className="text-[13px] text-accent">Поточний</span>
              ) : (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={async () => {
                    if (await run(() => switchWorkspace(w.id), "Робочий простір змінено")) router.push("/");
                  }}
                >
                  Перейти
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="border-t border-line px-4 py-3">
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Створити робочий простір
          </Button>
          <p className="mt-2 text-[13px] text-muted">
            Кожен робочий простір має окремі дані й окремих учасників. Одна людина може бути учасником кількох просторів.
          </p>
        </div>
      </Card>
      <CreateWorkspaceDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
