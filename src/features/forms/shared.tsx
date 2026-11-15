"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/actions";
import type { RefItem } from "@/types/domain";
import { useLookups } from "../lookups/context";
import type { EditMeta } from "../schemas";

export type FormProps<T> = { values?: Partial<T>; meta: EditMeta; onDone: () => void };

type SubmitOptions = {
  meta: EditMeta;
  onDone: () => void;
  /** Toast shown after the database confirmed the save. */
  success: string;
  /** Where to go after creating a new record (e.g. its page). */
  openCreated?: (id: string) => string;
};

/**
 * Submits a form through a server action. Success is shown only after the database confirms it;
 * validation errors land on their fields, anything else (including edit conflicts) above the buttons.
 */
export function useSubmit<T extends FieldValues>(
  form: UseFormReturn<T>,
  action: (meta: EditMeta, values: T) => Promise<ActionResult>,
  { meta, onDone, success, openCreated }: SubmitOptions,
) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    setError(undefined);
    try {
      const result = await action(meta, values);
      if (result.ok) {
        toast.show({ tone: "success", title: success });
        onDone();
        if (!meta.id && openCreated) router.push(openCreated(result.data.id));
        return;
      }
      setError(result.error);
      for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(key as Path<T>, { message });
      }
    } catch {
      setError("Немає зв’язку із сервером. Перевірте інтернет-з’єднання і спробуйте ще раз.");
    } finally {
      setPending(false);
    }
  });

  return { onSubmit, error, pending };
}

export function FormGrid({ children, onSubmit }: { children: ReactNode; onSubmit: React.FormEventHandler<HTMLFormElement> }) {
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-x-3 gap-y-3 sm:grid-cols-2">
      {children}
    </form>
  );
}

type FooterProps = { onCancel: () => void; submitLabel: string; pending?: boolean; error?: string };

export function FormFooter({ onCancel, submitLabel, pending, error }: FooterProps) {
  return (
    <div className="mt-2 border-t border-line pt-3 sm:col-span-2">
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} disabled={pending}>
          Скасувати
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Збереження…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export const full = "sm:col-span-2";

export function UserOptions({ placeholder }: { placeholder?: string }) {
  const { users } = useLookups();
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {users
        .filter((u) => u.isActive)
        .map((u) => (
          <option key={u.id} value={u.id}>
            {u.fullName}
          </option>
        ))}
    </>
  );
}

/** Active entries plus the current value, so an existing record never loses a deactivated option. */
export function RefOptions({ items, current, placeholder }: { items: RefItem[]; current?: string; placeholder?: string }) {
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {items
        .filter((item) => item.isActive || item.id === current)
        .map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
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

type LinkFields = { clientId: string; caseId: string };

/**
 * Client + matter pickers that stay consistent: choosing a matter selects its client,
 * and changing the client clears a matter that belongs to someone else.
 * (The database enforces the same rule.)
 */
export function ClientCaseFields<T extends FieldValues & LinkFields>({
  form,
  clientRequired,
  clientLabel = "Клієнт",
}: {
  form: UseFormReturn<T>;
  clientRequired?: boolean;
  clientLabel?: string;
}) {
  const { clients, cases, caseOf } = useLookups();
  const f = form as unknown as UseFormReturn<LinkFields>;
  const clientId = f.watch("clientId");
  const caseId = f.watch("caseId");
  const previousCase = useRef(caseId);

  useEffect(() => {
    if (caseId && caseId !== previousCase.current) {
      const owner = caseOf(caseId)?.clientId;
      if (owner && owner !== f.getValues("clientId")) f.setValue("clientId", owner, { shouldValidate: true });
    }
    previousCase.current = caseId;
  }, [caseId, caseOf, f]);

  useEffect(() => {
    const current = f.getValues("caseId");
    if (current && clientId && caseOf(current)?.clientId !== clientId) f.setValue("caseId", "");
  }, [clientId, caseOf, f]);

  const visibleCases = cases.filter((k) => (!k.archived || k.id === caseId) && (!clientId || k.clientId === clientId));

  return (
    <>
      <Field label={clientLabel} required={clientRequired} error={f.formState.errors.clientId?.message}>
        <Select {...f.register("clientId")} aria-invalid={!!f.formState.errors.clientId}>
          <option value="">{clientRequired ? "Оберіть клієнта" : "Без клієнта"}</option>
          {clients
            .filter((c) => !c.archived || c.id === clientId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Справа" hint={visibleCases.length === 0 && clientId ? "У цього клієнта ще немає справ" : undefined}>
        <Select {...f.register("caseId")}>
          <option value="">Без справи</option>
          {visibleCases.map((k) => (
            <option key={k.id} value={k.id}>
              {k.number} · {k.title}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
