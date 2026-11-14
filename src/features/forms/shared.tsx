"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DEMO_SAVE_NOTICE } from "@/i18n/uk";
import { cases, clients, users } from "@/mocks/data";

export type FormProps<T> = { defaults?: Partial<T>; onDone: () => void; isEdit?: boolean };

/**
 * Phase 2: there is no backend yet, so a valid form is never reported as saved.
 * Replaced by real server actions in Phase 4.
 */
export function useDemoSubmit(onDone: () => void) {
  const toast = useToast();
  return () => {
    toast.show({ title: "Демонстраційний режим", description: DEMO_SAVE_NOTICE });
    onDone();
  };
}

export function FormGrid({ children, onSubmit }: { children: ReactNode; onSubmit: React.FormEventHandler<HTMLFormElement> }) {
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-x-3 gap-y-3 sm:grid-cols-2">
      {children}
    </form>
  );
}

export function FormFooter({ onCancel, submitLabel, busy }: { onCancel: () => void; submitLabel: string; busy?: boolean }) {
  return (
    <div className="mt-2 flex justify-end gap-2 border-t border-line pt-3 sm:col-span-2">
      <Button onClick={onCancel}>Скасувати</Button>
      <Button type="submit" variant="primary" disabled={busy}>
        {submitLabel}
      </Button>
    </div>
  );
}

export const full = "sm:col-span-2";

export function UserOptions() {
  return (
    <>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.fullName}
        </option>
      ))}
    </>
  );
}

export function ClientOptions({ placeholder = "Оберіть клієнта" }: { placeholder?: string }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {clients
        .filter((c) => c.status !== "archived")
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
    </>
  );
}

export function CaseOptions({ clientId, placeholder = "Без справи" }: { clientId?: string; placeholder?: string }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {cases
        .filter((k) => !clientId || k.clientId === clientId)
        .map((k) => (
          <option key={k.id} value={k.id}>
            {k.number} · {k.title}
          </option>
        ))}
    </>
  );
}

export function Options({ values, placeholder }: { values: readonly string[]; placeholder?: string }) {
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {values.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </>
  );
}

export function LabelOptions<K extends string>({ labels }: { labels: Record<K, string> }) {
  return (
    <>
      {(Object.keys(labels) as K[]).map((key) => (
        <option key={key} value={key}>
          {labels[key]}
        </option>
      ))}
    </>
  );
}
