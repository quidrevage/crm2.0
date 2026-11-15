"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUploader } from "@/components/ui/file-uploader";
import { useToast } from "@/components/ui/toast";
import { eventTypeLabel, taskPriorityLabel, taskStatusLabel } from "@/i18n/uk";
import type { ActionResult } from "@/lib/actions";
import { dayKey } from "@/lib/dates";
import { FILE_TYPES, extensionOf } from "@/lib/files";
import { getBrowserClient } from "@/lib/supabase/browser";
import { discardUpload, finalizeUpload, saveDocumentMeta } from "../documents/actions";
import { useLookups } from "../lookups/context";
import { saveEvent, saveExpense, saveFee, saveNote, savePayment, saveTask } from "../records/actions";
import {
  REMINDER_OPTIONS, documentSchema, eventSchema, expenseSchema, feeSchema, noteSchema, paymentSchema, taskSchema,
  type DocumentValues, type EventValues, type ExpenseValues, type FeeValues, type NoteValues, type PaymentValues,
  type TaskValues,
} from "../schemas";
import { ClientCaseFields, FormFooter, FormGrid, LabelOptions, RefOptions, UserOptions, full, useSubmit, type FormProps } from "./shared";

export function TaskForm({ values, meta, onDone }: FormProps<TaskValues>) {
  const { me } = useLookups();
  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "", description: "", assignedTo: me.id, dueDate: "", priority: "normal", status: "new", clientId: "", caseId: "",
      ...values,
    },
  });
  const { register, control, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, saveTask, { meta, onDone, success: meta.id ? "Зміни збережено" : "Завдання додано" });

  return (
    <FormGrid onSubmit={onSubmit}>
      <Field label="Завдання" required error={errors.title?.message} className={full}>
        <Input {...register("title")} aria-invalid={!!errors.title} />
      </Field>
      <Field label="Виконавець">
        <Select {...register("assignedTo")}>
          <UserOptions placeholder="Не призначено" />
        </Select>
      </Field>
      <Field label="Термін виконання" error={errors.dueDate?.message}>
        <Controller control={control} name="dueDate" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} />
      </Field>
      <Field label="Пріоритет">
        <Select {...register("priority")}>
          <LabelOptions labels={taskPriorityLabel} />
        </Select>
      </Field>
      <Field label="Статус">
        <Select {...register("status")}>
          <LabelOptions labels={taskStatusLabel} />
        </Select>
      </Field>
      <ClientCaseFields form={form} />
      <Field label="Опис" className={full}>
        <Textarea {...register("description")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Додати завдання"} pending={pending} error={error} />
    </FormGrid>
  );
}

export function EventForm({ values, meta, onDone }: FormProps<EventValues>) {
  const { me } = useLookups();
  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "", type: "hearing", date: dayKey(), startTime: "10:00", endTime: "", location: "", caseId: "", clientId: "",
      responsibleId: me.id, description: "", deadlineSource: "", isVerified: false, reminder: "1440", ...values,
    },
  });
  const { register, watch, control, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, saveEvent, { meta, onDone, success: meta.id ? "Зміни збережено" : "Подію додано" });
  const isDeadline = watch("type") === "deadline";

  return (
    <FormGrid onSubmit={onSubmit}>
      <Field label="Назва події" required error={errors.title?.message} className={full}>
        <Input {...register("title")} aria-invalid={!!errors.title} />
      </Field>
      <Field label="Тип події" required>
        <Select {...register("type")}>
          <LabelOptions labels={eventTypeLabel} />
        </Select>
      </Field>
      <Field label="Дата" required error={errors.date?.message}>
        <Controller
          control={control}
          name="date"
          render={({ field, fieldState }) => <DatePicker value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />}
        />
      </Field>
      <Field label={isDeadline ? "Час (за київським часом)" : "Початок"} required error={errors.startTime?.message}>
        <Input {...register("startTime")} type="time" aria-invalid={!!errors.startTime} className="num" />
      </Field>
      {!isDeadline && (
        <Field label="Завершення" error={errors.endTime?.message}>
          <Input {...register("endTime")} type="time" aria-invalid={!!errors.endTime} className="num" />
        </Field>
      )}
      {isDeadline && (
        <div className={`${full} rounded-md border border-line bg-bg p-3`}>
          <Field
            label="Підстава строку"
            required
            error={errors.deadlineSource?.message}
            hint="Норма закону, ухвала суду або інше джерело. Система не обчислює строки автоматично."
          >
            <Textarea {...register("deadlineSource")} rows={2} aria-invalid={!!errors.deadlineSource} />
          </Field>
          <Checkbox label="Строк перевірено юристом" {...register("isVerified")} className="mt-2" />
        </div>
      )}
      <Field label="Місце" className={full}>
        <Input {...register("location")} />
      </Field>
      <ClientCaseFields form={form} />
      <Field label="Відповідальний">
        <Select {...register("responsibleId")}>
          <UserOptions placeholder="Не призначено" />
        </Select>
      </Field>
      <Field label="Нагадування" hint="З’явиться на головній сторінці у відповідального">
        <Select {...register("reminder")}>
          {REMINDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Опис" className={full}>
        <Textarea {...register("description")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Додати подію"} pending={pending} error={error} />
    </FormGrid>
  );
}

/**
 * Uploads a file straight from the browser into the private bucket (the user's own session,
 * so storage rules apply), then asks the server to verify and record it.
 */
async function uploadFile(file: File, documentId: string, meta?: DocumentValues): Promise<ActionResult> {
  const ext = extensionOf(file.name);
  if (!ext) return { ok: false, error: "Непідтримуваний формат. Дозволено: PDF, DOCX, XLSX, JPG, PNG." };
  const storagePath = `${documentId}/${crypto.randomUUID()}`;
  const { error } = await getBrowserClient()
    .storage.from("documents")
    .upload(storagePath, file, { contentType: FILE_TYPES[ext].mime, upsert: false, cacheControl: "0" });
  if (error) {
    const tooLarge = /size|large|413/i.test(error.message);
    return { ok: false, error: tooLarge ? "Файл перевищує допустимий розмір." : "Не вдалося передати файл до сховища. Перевірте з’єднання і спробуйте ще раз." };
  }
  try {
    return await finalizeUpload({ documentId, storagePath, fileName: file.name, meta });
  } catch {
    await discardUpload(storagePath).catch(() => undefined);
    return { ok: false, error: "Немає зв’язку із сервером. Файл не збережено." };
  }
}

type DocumentFormProps = FormProps<DocumentValues> & {
  /** "upload": new document with a file; "version": new file for an existing document; "edit": properties only. */
  mode: "upload" | "version" | "edit";
};

export function DocumentForm({ values, meta, onDone, mode }: DocumentFormProps) {
  const { documentCategories, settings } = useLookups();
  const router = useRouter();
  const toast = useToast();
  const form = useForm<DocumentValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: { name: "", categoryId: "", clientId: "", caseId: "", description: "", ...values },
  });
  const { register, getValues, setValue, setError: setFieldError, formState: { errors } } = form;
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const metaSubmit = useSubmit(form, saveDocumentMeta, { meta, onDone, success: "Зміни збережено" });

  async function upload(valuesToSave?: DocumentValues) {
    if (!file) return setFileError("Оберіть файл для завантаження.");
    setPending(true);
    setError(undefined);
    const documentId = mode === "version" && meta.id ? meta.id : crypto.randomUUID();
    const result = await uploadFile(file, documentId, valuesToSave);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
        setFieldError(key.replace(/^meta\./, "") as keyof DocumentValues, { message });
      }
      return;
    }
    toast.show({ tone: "success", title: mode === "version" ? "Нову версію завантажено" : "Документ завантажено" });
    onDone();
    if (mode === "upload") router.push(`/documents/${documentId}`);
  }

  if (mode === "version") {
    return (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void upload();
        }}
        className="grid gap-3"
      >
        <FileUploader file={file} error={fileError} maxMb={settings.maxUploadMb} onChange={(next) => { setFile(next); setFileError(undefined); }} />
        <p className="text-[13px] text-muted">Попередні версії залишаться в історії документа.</p>
        <FormFooter onCancel={onDone} submitLabel="Завантажити версію" pending={pending} error={error} />
      </form>
    );
  }

  const onSubmit = mode === "edit" ? metaSubmit.onSubmit : form.handleSubmit((v) => upload(v));

  return (
    <FormGrid onSubmit={onSubmit}>
      {mode === "upload" && (
        <div className={full}>
          <FileUploader
            file={file}
            error={fileError}
            maxMb={settings.maxUploadMb}
            onChange={(next) => {
              setFile(next);
              setFileError(undefined);
              if (next && !getValues("name")) setValue("name", next.name.replace(/\.[^.]+$/, ""));
            }}
          />
        </div>
      )}
      <Field label="Назва документа" required error={errors.name?.message} className={full}>
        <Input {...register("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Категорія" required error={errors.categoryId?.message} className={full}>
        <Select {...register("categoryId")} aria-invalid={!!errors.categoryId}>
          <RefOptions items={documentCategories} current={values?.categoryId} placeholder="Оберіть категорію" />
        </Select>
      </Field>
      <ClientCaseFields form={form} />
      <Field label="Опис" className={full}>
        <Textarea {...register("description")} rows={2} />
      </Field>
      <FormFooter
        onCancel={onDone}
        submitLabel={mode === "edit" ? "Зберегти зміни" : "Завантажити документ"}
        pending={mode === "edit" ? metaSubmit.pending : pending}
        error={mode === "edit" ? metaSubmit.error : error}
      />
    </FormGrid>
  );
}

export function FeeForm({ values, meta, onDone }: FormProps<FeeValues>) {
  const form = useForm<FeeValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: { clientId: "", caseId: "", agreedOn: dayKey(), amount: "", contractNumber: "", description: "", ...values },
  });
  const { register, control, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, saveFee, { meta, onDone, success: meta.id ? "Зміни збережено" : "Домовленість збережено" });

  return (
    <FormGrid onSubmit={onSubmit}>
      <ClientCaseFields form={form} clientRequired />
      <Field label="Погоджена сума, ₴" required error={errors.amount?.message}>
        <Input {...register("amount")} inputMode="decimal" placeholder="0,00" aria-invalid={!!errors.amount} className="num" />
      </Field>
      <Field label="Дата домовленості" required error={errors.agreedOn?.message}>
        <Controller
          control={control}
          name="agreedOn"
          render={({ field, fieldState }) => <DatePicker value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />}
        />
      </Field>
      <Field label="Номер договору">
        <Input {...register("contractNumber")} />
      </Field>
      <Field label="Опис" hint="Наприклад, «Гонорар за ведення справи в першій інстанції»">
        <Input {...register("description")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Додати домовленість"} pending={pending} error={error} />
    </FormGrid>
  );
}

export function PaymentForm({ values, meta, onDone }: FormProps<PaymentValues>) {
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { clientId: "", caseId: "", paidOn: dayKey(), amount: "", method: "", description: "", ...values },
  });
  const { register, control, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, savePayment, { meta, onDone, success: meta.id ? "Зміни збережено" : "Платіж внесено" });

  return (
    <FormGrid onSubmit={onSubmit}>
      <ClientCaseFields form={form} clientRequired />
      <Field label="Сума, ₴" required error={errors.amount?.message}>
        <Input {...register("amount")} inputMode="decimal" placeholder="0,00" aria-invalid={!!errors.amount} className="num" />
      </Field>
      <Field label="Дата платежу" required error={errors.paidOn?.message}>
        <Controller
          control={control}
          name="paidOn"
          render={({ field, fieldState }) => <DatePicker value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />}
        />
      </Field>
      <Field label="Спосіб оплати" hint="Наприклад, «безготівковий»">
        <Input {...register("method")} />
      </Field>
      <Field label="Призначення платежу">
        <Input {...register("description")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Внести платіж"} pending={pending} error={error} />
    </FormGrid>
  );
}

export function ExpenseForm({ values, meta, onDone }: FormProps<ExpenseValues>) {
  const form = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { clientId: "", caseId: "", incurredOn: dayKey(), amount: "", description: "", reimbursable: false, ...values },
  });
  const { register, control, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, saveExpense, { meta, onDone, success: meta.id ? "Зміни збережено" : "Витрату додано" });

  return (
    <FormGrid onSubmit={onSubmit}>
      <Field label="Витрата" required error={errors.description?.message} hint="Наприклад, «Судовий збір»" className={full}>
        <Input {...register("description")} aria-invalid={!!errors.description} />
      </Field>
      <ClientCaseFields form={form} />
      <Field label="Сума, ₴" required error={errors.amount?.message}>
        <Input {...register("amount")} inputMode="decimal" placeholder="0,00" aria-invalid={!!errors.amount} className="num" />
      </Field>
      <Field label="Дата" required error={errors.incurredOn?.message}>
        <Controller
          control={control}
          name="incurredOn"
          render={({ field, fieldState }) => <DatePicker value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />}
        />
      </Field>
      <Checkbox label="Підлягає відшкодуванню клієнтом" {...register("reimbursable")} className={full} />
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Додати витрату"} pending={pending} error={error} />
    </FormGrid>
  );
}

export function NoteForm({ values, meta, onDone, tasks = [] }: FormProps<NoteValues> & { tasks?: Array<{ id: string; title: string }> }) {
  const { clients, cases } = useLookups();
  const form = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: "", content: "", linkType: "case", linkId: "", ...values },
  });
  const { register, watch, setValue, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, saveNote, { meta, onDone, success: meta.id ? "Зміни збережено" : "Нотатку додано" });
  const linkType = watch("linkType");
  const linkId = watch("linkId");
  // A note opened from a record keeps its link; a task link is offered only when known.
  const lockedTask = linkType === "task";

  return (
    <FormGrid onSubmit={onSubmit}>
      <Field label="Заголовок" required error={errors.title?.message} className={full}>
        <Input {...register("title")} aria-invalid={!!errors.title} />
      </Field>
      <Field label="Стосується" required>
        <Select {...register("linkType", { onChange: () => setValue("linkId", "") })}>
          <option value="case">Справи</option>
          <option value="client">Клієнта</option>
          {(lockedTask || tasks.length > 0) && <option value="task">Завдання</option>}
        </Select>
      </Field>
      <Field label="Запис" required error={errors.linkId?.message}>
        <Select {...register("linkId")} aria-invalid={!!errors.linkId}>
          <option value="">Оберіть</option>
          {linkType === "case" &&
            cases.filter((k) => !k.archived || k.id === linkId).map((k) => <option key={k.id} value={k.id}>{k.number} · {k.title}</option>)}
          {linkType === "client" &&
            clients.filter((c) => !c.archived || c.id === linkId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          {linkType === "task" && (tasks.length ? tasks : linkId ? [{ id: linkId, title: "Поточне завдання" }] : []).map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </Select>
      </Field>
      <Field label="Текст нотатки" required error={errors.content?.message} className={full}>
        <Textarea {...register("content")} rows={7} aria-invalid={!!errors.content} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Додати нотатку"} pending={pending} error={error} />
    </FormGrid>
  );
}
