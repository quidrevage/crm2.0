"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/overlay";
import { CaseForm, ClientForm, ContactForm, CourtForm, PartyForm } from "./forms/record-forms";
import { DocumentForm, EventForm, ExpenseForm, FeeForm, NoteForm, PaymentForm, TaskForm } from "./forms/work-forms";
import type { EditMeta } from "./schemas";

export type RecordKind =
  | "client" | "contact" | "case" | "party" | "court" | "task" | "event"
  | "document" | "documentVersion" | "documentEdit" | "fee" | "payment" | "expense" | "note";

export type OpenOptions = {
  /** Prefilled or current values (form field names). */
  values?: Record<string, unknown>;
  /** Present when editing: the record id and the version it was loaded at. */
  id?: string;
  rowVersion?: number;
  /** Optional choices for note links to tasks. */
  tasks?: Array<{ id: string; title: string }>;
};

type State = ({ kind: RecordKind } & OpenOptions) | null;

const titles: Record<RecordKind, [create: string, edit: string]> = {
  client: ["Новий клієнт", "Редагування клієнта"],
  contact: ["Нова контактна особа", "Редагування контакту"],
  case: ["Нова справа", "Редагування справи"],
  party: ["Новий учасник справи", "Редагування учасника"],
  court: ["Новий суд", "Редагування суду"],
  task: ["Нове завдання", "Редагування завдання"],
  event: ["Нова подія", "Редагування події"],
  document: ["Завантаження документа", "Завантаження документа"],
  documentVersion: ["Нова версія документа", "Нова версія документа"],
  documentEdit: ["Властивості документа", "Властивості документа"],
  fee: ["Нова домовленість про гонорар", "Редагування домовленості"],
  payment: ["Новий платіж", "Редагування платежу"],
  expense: ["Нова витрата", "Редагування витрати"],
  note: ["Нова нотатка", "Редагування нотатки"],
};

const RecordFormContext = createContext<{ open: (kind: RecordKind, options?: OpenOptions) => void } | null>(null);

/** Opens the create/edit form for any record type from anywhere in the app. */
export function useRecordForm() {
  const ctx = useContext(RecordFormContext);
  if (!ctx) throw new Error("useRecordForm must be used inside RecordFormProvider");
  return ctx;
}

function FormFor({ state, onDone }: { state: NonNullable<State>; onDone: () => void }) {
  const meta: EditMeta = { id: state.id, rowVersion: state.rowVersion };
  // Values are loosely typed at this boundary; each form merges them over its own typed defaults.
  const values = state.values as never;
  switch (state.kind) {
    case "client": return <ClientForm values={values} meta={meta} onDone={onDone} />;
    case "contact": return <ContactForm values={values} meta={meta} onDone={onDone} />;
    case "case": return <CaseForm values={values} meta={meta} onDone={onDone} />;
    case "party": return <PartyForm values={values} meta={meta} onDone={onDone} />;
    case "court": return <CourtForm values={values} meta={meta} onDone={onDone} />;
    case "task": return <TaskForm values={values} meta={meta} onDone={onDone} />;
    case "event": return <EventForm values={values} meta={meta} onDone={onDone} />;
    case "document": return <DocumentForm mode="upload" values={values} meta={{}} onDone={onDone} />;
    case "documentVersion": return <DocumentForm mode="version" values={values} meta={meta} onDone={onDone} />;
    case "documentEdit": return <DocumentForm mode="edit" values={values} meta={meta} onDone={onDone} />;
    case "fee": return <FeeForm values={values} meta={meta} onDone={onDone} />;
    case "payment": return <PaymentForm values={values} meta={meta} onDone={onDone} />;
    case "expense": return <ExpenseForm values={values} meta={meta} onDone={onDone} />;
    case "note": return <NoteForm values={values} meta={meta} onDone={onDone} tasks={state.tasks} />;
  }
}

export function RecordFormProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);
  const [instance, setInstance] = useState(0);
  const open = useCallback((kind: RecordKind, options?: OpenOptions) => {
    setInstance((n) => n + 1);
    setState({ kind, ...options });
  }, []);
  const close = useCallback(() => setState(null), []);
  const value = useMemo(() => ({ open }), [open]);
  const isEdit = Boolean(state?.id);

  return (
    <RecordFormContext.Provider value={value}>
      {children}
      <Modal
        open={state !== null}
        onOpenChange={(next) => !next && close()}
        title={state ? titles[state.kind][isEdit ? 1 : 0] : ""}
      >
        {state && <FormFor key={instance} state={state} onDone={close} />}
      </Modal>
    </RecordFormContext.Provider>
  );
}
