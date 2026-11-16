"use client";

import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar, Badge, Card } from "@/components/ui/display";
import { Input, Select } from "@/components/ui/form";
import { roleLabel } from "@/i18n/uk";
import { cn } from "@/lib/cn";
import { nameFromEmail } from "@/lib/format";
import type { CaseStatusItem, FinanceAccess, RefItem, Role } from "@/types/domain";
import { useLookups } from "../lookups/context";
import { useRunAction } from "../record-actions";
import { saveRefItem, setMemberFinanceAccess, updateUserAccess, type RefTable } from "./actions";

type ProfileRow = { id: string; full_name: string; email: string; role: Role; is_active: boolean };

export function UsersPanel({ users, maxUsers }: { users: ProfileRow[]; maxUsers: number }) {
  const { me, isAdmin } = useLookups();
  const { run, pending } = useRunAction();
  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <Card title={`Активні учасники: ${activeCount} з ${maxUsers}`} flush>
      <ul className="divide-y divide-line">
        {users.map((u) => {
          const self = u.id === me.id;
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={u.full_name || nameFromEmail(u.email)} className="h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {u.full_name || nameFromEmail(u.email)}
                  {self && <span className="font-normal text-muted"> (ви)</span>}
                </p>
                <p className="truncate text-[13px] text-muted">{u.email}</p>
              </div>
              {!u.is_active && <Badge>Неактивний</Badge>}
              {isAdmin && !self ? (
                <div className="flex items-center gap-2">
                  <Select
                    aria-label={`Роль: ${u.full_name || u.email}`}
                    value={u.role}
                    disabled={pending}
                    onChange={(e) => run(() => updateUserAccess({ id: u.id, role: e.target.value as Role }), "Роль змінено")}
                    className="w-40"
                  >
                    <option value="member">{roleLabel.member}</option>
                    <option value="admin">{roleLabel.admin}</option>
                  </Select>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => updateUserAccess({ id: u.id, isActive: !u.is_active }),
                        u.is_active ? "Доступ користувача вимкнено" : "Доступ користувача відновлено",
                      )
                    }
                  >
                    {u.is_active ? "Вимкнути доступ" : "Відновити доступ"}
                  </Button>
                </div>
              ) : (
                <Badge tone={u.role === "admin" ? "accent" : "neutral"}>{roleLabel[u.role]}</Badge>
              )}
            </li>
          );
        })}
      </ul>
      {isAdmin && (
        <p className="border-t border-line px-4 py-3 text-[13px] text-muted">
          Вимкнений учасник одразу втрачає доступ до даних цього робочого простору, а його місце звільняється для запрошення.
        </p>
      )}
    </Card>
  );
}

const financeOptions: Array<{ value: FinanceAccess; label: string; hint: string }> = [
  { value: "none", label: "Немає доступу", hint: "Розділ «Фінанси» і фінансові вкладки приховано." },
  { value: "read", label: "Лише перегляд", hint: "Бачить гонорари, платежі й витрати, але не змінює їх." },
  { value: "write", label: "Повний доступ", hint: "Може вносити й редагувати фінансові записи." },
];

export function FinanceAccessPanel() {
  const { settings } = useLookups();
  const { run, pending } = useRunAction();
  return (
    <Card title="Доступ учасника до фінансів">
      <div className="space-y-2" role="radiogroup" aria-label="Доступ учасника до фінансів">
        {financeOptions.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2",
              settings.memberFinanceAccess === o.value ? "border-accent bg-accent-soft/50" : "border-line hover:bg-bg",
            )}
          >
            <input
              type="radio"
              name="finance-access"
              className="mt-1 accent-accent"
              checked={settings.memberFinanceAccess === o.value}
              disabled={pending}
              onChange={() => run(() => setMemberFinanceAccess(o.value), "Налаштування збережено")}
            />
            <span>
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="block text-[13px] text-muted">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted">Обмеження застосовує база даних, а не лише інтерфейс.</p>
    </Card>
  );
}

function RefRow({ table, item, editable }: { table: RefTable; item: RefItem | CaseStatusItem; editable: boolean }) {
  const { run, pending } = useRunAction();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const isStatus = "isClosed" in item;

  if (editing) {
    return (
      <li className="flex items-center gap-2 py-1.5">
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Назва" className="h-9" autoFocus />
        <IconButton
          label="Зберегти"
          disabled={pending || !name.trim()}
          onClick={async () => {
            const ok = await run(() => saveRefItem({ table, id: item.id, name, isActive: item.isActive }), "Збережено");
            if (ok) setEditing(false);
          }}
        >
          <Check className="h-4 w-4" />
        </IconButton>
        <IconButton label="Скасувати" onClick={() => { setEditing(false); setName(item.name); }}>
          <X className="h-4 w-4" />
        </IconButton>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-1.5">
      <span className={cn("min-w-0 flex-1 text-sm", !item.isActive && "text-muted line-through")}>{item.name}</span>
      {isStatus && item.isClosed && <Badge>Закрита</Badge>}
      {editable && (
        <>
          {isStatus && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => saveRefItem({ table, id: item.id, name: item.name, isActive: item.isActive, isClosed: !item.isClosed }), "Збережено")}
              className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-subtle hover:text-fg"
              title="Чи вважається справа з цим статусом закритою (не враховується в активних)"
            >
              {item.isClosed ? "Відкрита?" : "Закрита?"}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => saveRefItem({ table, id: item.id, name: item.name, isActive: !item.isActive }), item.isActive ? "Значення вимкнено" : "Значення увімкнено")}
            className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-subtle hover:text-fg"
          >
            {item.isActive ? "Вимкнути" : "Увімкнути"}
          </button>
          <IconButton label="Перейменувати" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
        </>
      )}
    </li>
  );
}

function AddRef({ table }: { table: RefTable }) {
  const { run, pending } = useRunAction();
  const [name, setName] = useState("");
  return (
    <form
      className="mt-2 flex gap-2 border-t border-line pt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const ok = await run(() => saveRefItem({ table, name, isActive: true }), "Значення додано");
        if (ok) setName("");
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Нове значення" aria-label="Нове значення" className="h-9" />
      <Button type="submit" size="sm" disabled={pending || !name.trim()}>
        <Plus className="h-4 w-4" />
        Додати
      </Button>
    </form>
  );
}

const refLists: Array<{ table: RefTable; key: "practiceAreas" | "matterTypes" | "caseStatuses" | "partyRoles" | "documentCategories"; title: string }> = [
  { table: "practice_areas", key: "practiceAreas", title: "Галузі права" },
  { table: "matter_types", key: "matterTypes", title: "Типи справ" },
  { table: "case_statuses", key: "caseStatuses", title: "Статуси справ" },
  { table: "party_roles", key: "partyRoles", title: "Процесуальні статуси учасників" },
  { table: "document_categories", key: "documentCategories", title: "Категорії документів" },
];

export function ReferenceLists() {
  const lookups = useLookups();
  return (
    <div className="space-y-4">
      <p className="max-w-[75ch] text-[13px] text-muted">
        {lookups.isAdmin
          ? "Значення, які вже використовуються, не видаляються — їх можна вимкнути: вони зникнуть зі списків вибору, але залишаться в наявних записах."
          : "Змінювати довідники може адміністратор."}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {refLists.map((list) => (
          <Card key={list.table} title={list.title}>
            <ul className="divide-y divide-line">
              {lookups[list.key].map((item) => (
                <RefRow key={item.id} table={list.table} item={item} editable={lookups.isAdmin} />
              ))}
            </ul>
            {lookups.isAdmin && <AddRef table={list.table} />}
          </Card>
        ))}
      </div>
    </div>
  );
}
