"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUploader } from "@/components/ui/file-uploader";
import { documentCategories, eventTypeLabel, taskPriorityLabel, taskStatusLabel } from "@/i18n/uk";
import { dayKey } from "@/lib/dates";
import { cases, clients, currentUser, tasks } from "@/mocks/data";
import {
  documentSchema, eventSchema, noteSchema, paymentSchema, taskSchema,
  type DocumentValues, type EventValues, type NoteValues, type PaymentValues, type TaskValues,
} from "../schemas";
import { CaseOptions, ClientOptions, FormFooter, FormGrid, LabelOptions, Options, UserOptions, full, useDemoSubmit, type FormProps } from "./shared";

export function TaskForm({ defaults, onDone, isEdit }: FormProps<TaskValues>) {
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "", description: "", assignedTo: currentUser.id, dueDate: "", priority: "normal",
      status: "new", clientId: "", caseId: "", ...defaults,
    },
  });
  const submit = useDemoSubmit(onDone);

  return (
    <FormGrid onSubmit={handleSubmit(submit)}>
      <Field label="Завдання" required error={errors.title?.message} className={full}>
        <Input {...register("title")} aria-invalid={!!errors.title} />
      </Field>
      <Field label="Виконавець" required>
        <Select {...register("assignedTo")}>
          <UserOptions />
        </Select>
      </Field>
      <Field label="Термін виконання">
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
      <Field label="Клієнт">
        <Select {...register("clientId")}>
          <ClientOptions placeholder="Без клієнта" />
        </Select>
      </Field>
      <Field label="Справа">
        <Select {...register("caseId")}>
          <CaseOptions clientId={watch("clientId")} />
        </Select>
      </Field>
      <Field label="Опис" className={full}>
        <Textarea {...register("description")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={isEdit ? "Зберегти зміни" : "Додати завдання"} />
    </FormGrid>
  );
}

export function EventForm({ defaults, onDone, isEdit }: FormProps<EventValues>) {
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "", type: "hearing", date: dayKey(), startTime: "10:00", endTime: "", location: "", caseId: "",
      clientId: "", responsibleId: currentUser.id, description: "", deadlineSource: "", isVerified: false, ...defaults,
    },
  });
  const submit = useDemoSubmit(onDone);
  const isDeadline = watch("type") === "deadline";

  return (
    <FormGrid onSubmit={handleSubmit(submit)}>
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
      <Field label="Клієнт">
        <Select {...register("clientId")}>
          <ClientOptions placeholder="Без клієнта" />
        </Select>
      </Field>
      <Field label="Справа">
        <Select {...register("caseId")}>
          <CaseOptions clientId={watch("clientId")} />
        </Select>
      </Field>
      <Field label="Відповідальний" required>
        <Select {...register("responsibleId")}>
          <UserOptions />
        </Select>
      </Field>
      <Field label="Опис" className={full}>
        <Textarea {...register("description")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={isEdit ? "Зберегти зміни" : "Додати подію"} />
    </FormGrid>
  );
}

export function DocumentForm({ defaults, onDone, isEdit }: FormProps<DocumentValues>) {
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<DocumentValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: { name: "", category: "", clientId: "", caseId: "", description: "", ...defaults },
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const done = useDemoSubmit(onDone);

  function submit() {
    if (!isEdit && !file) return setFileError("Оберіть файл для завантаження.");
    done();
  }

  return (
    <FormGrid onSubmit={handleSubmit(submit)}>
      {!isEdit && (
        <div className={full}>
          <FileUploader
            file={file}
            error={fileError}
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
      <Field label="Категорія" required error={errors.category?.message}>
        <Select {...register("category")} aria-invalid={!!errors.category}>
          <Options values={documentCategories} placeholder="Оберіть категорію" />
        </Select>
      </Field>
      <Field label="Клієнт" error={errors.clientId?.message}>
        <Select {...register("clientId")} aria-invalid={!!errors.clientId}>
          <ClientOptions placeholder="Без клієнта" />
        </Select>
      </Field>
      <Field label="Справа" className={full}>
        <Select {...register("caseId")}>
          <CaseOptions clientId={watch("clientId")} />
        </Select>
      </Field>
      <Field label="Опис" className={full}>
        <Textarea {...register("description")} rows={2} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={isEdit ? "Зберегти зміни" : "Завантажити документ"} />
    </FormGrid>
  );
}

export function PaymentForm({ defaults, onDone, isEdit }: FormProps<PaymentValues>) {
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { clientId: "", caseId: "", paidOn: dayKey(), amount: "", description: "", ...defaults },
  });
  const submit = useDemoSubmit(onDone);

  return (
    <FormGrid onSubmit={handleSubmit(submit)}>
      <Field label="Клієнт" required error={errors.clientId?.message}>
        <Select {...register("clientId")} aria-invalid={!!errors.clientId}>
          <ClientOptions />
        </Select>
      </Field>
      <Field label="Справа">
        <Select {...register("caseId")}>
          <CaseOptions clientId={watch("clientId")} />
        </Select>
      </Field>
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
      <Field label="Призначення платежу" className={full}>
        <Input {...register("description")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={isEdit ? "Зберегти зміни" : "Внести платіж"} />
    </FormGrid>
  );
}

export function NoteForm({ defaults, onDone, isEdit }: FormProps<NoteValues>) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: "", content: "", linkType: "case", linkId: "", ...defaults },
  });
  const submit = useDemoSubmit(onDone);
  const linkType = watch("linkType");

  return (
    <FormGrid onSubmit={handleSubmit(submit)}>
      <Field label="Заголовок" required error={errors.title?.message} className={full}>
        <Input {...register("title")} aria-invalid={!!errors.title} />
      </Field>
      <Field label="Стосується" required>
        <Select {...register("linkType")}>
          <option value="case">Справи</option>
          <option value="client">Клієнта</option>
          <option value="task">Завдання</option>
        </Select>
      </Field>
      <Field label="Запис" required error={errors.linkId?.message}>
        <Select {...register("linkId")} aria-invalid={!!errors.linkId}>
          <option value="">Оберіть</option>
          {linkType === "case" && cases.map((k) => <option key={k.id} value={k.id}>{k.number} · {k.title}</option>)}
          {linkType === "client" && clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          {linkType === "task" && tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </Select>
      </Field>
      <Field label="Текст нотатки" required error={errors.content?.message} className={full}>
        <Textarea {...register("content")} rows={6} aria-invalid={!!errors.content} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={isEdit ? "Зберегти зміни" : "Додати нотатку"} />
    </FormGrid>
  );
}
