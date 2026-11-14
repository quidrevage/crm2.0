"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/overlay";
import { CaseForm, ClientForm, CourtForm } from "./forms/record-forms";
import { DocumentForm, EventForm, NoteForm, PaymentForm, TaskForm } from "./forms/work-forms";

export type RecordKind = "client" | "case" | "task" | "event" | "document" | "payment" | "court" | "note";

type OpenOptions = { defaults?: Record<string, unknown>; isEdit?: boolean };
type State = ({ kind: RecordKind } & OpenOptions) | null;

const titles: Record<RecordKind, [create: string, edit: string]> = {
  client: ["Новий клієнт", "Редагування клієнта"],
  case: ["Нова справа", "Редагування справи"],
  task: ["Нове завдання", "Редагування завдання"],
  event: ["Нова подія", "Редагування події"],
  document: ["Завантаження документа", "Властивості документа"],
  payment: ["Новий платіж", "Редагування платежу"],
  court: ["Новий суд", "Редагування суду"],
  note: ["Нова нотатка", "Редагування нотатки"],
};

const forms = {
  client: ClientForm, case: CaseForm, task: TaskForm, event: EventForm,
  document: DocumentForm, payment: PaymentForm, court: CourtForm, note: NoteForm,
} as const;

const RecordFormContext = createContext<{ open: (kind: RecordKind, options?: OpenOptions) => void } | null>(null);

/** Opens the create/edit form for any record type from anywhere in the app. */
export function useRecordForm() {
  const ctx = useContext(RecordFormContext);
  if (!ctx) throw new Error("useRecordForm must be used inside RecordFormProvider");
  return ctx;
}

export function RecordFormProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);
  const open = useCallback((kind: RecordKind, options?: OpenOptions) => setState({ kind, ...options }), []);
  const close = useCallback(() => setState(null), []);
  const value = useMemo(() => ({ open }), [open]);

  // Defaults are loosely typed at this boundary; each form applies them over its own typed defaults.
  const Form = state ? (forms[state.kind] as React.ComponentType<{ defaults?: Record<string, unknown>; onDone: () => void; isEdit?: boolean }>) : null;

  return (
    <RecordFormContext.Provider value={value}>
      {children}
      <Modal
        open={state !== null}
        onOpenChange={(next) => !next && close()}
        title={state ? titles[state.kind][state.isEdit ? 1 : 0] : ""}
      >
        {state && Form && <Form key={state.kind} defaults={state.defaults} onDone={close} isEdit={state.isEdit} />}
      </Modal>
    </RecordFormContext.Provider>
  );
}
