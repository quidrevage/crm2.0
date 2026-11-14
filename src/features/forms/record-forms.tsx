"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { caseStatusLabel, clientStatusLabel, clientTypeLabel, courtTypes, matterTypes, practiceAreas } from "@/i18n/uk";
import { dayKey } from "@/lib/dates";
import { courts, currentUser } from "@/mocks/data";
import { caseSchema, clientSchema, courtSchema, type CaseValues, type ClientValues, type CourtValues } from "../schemas";
import { ClientOptions, FormFooter, FormGrid, LabelOptions, Options, UserOptions, full, useDemoSubmit, type FormProps } from "./shared";

export function ClientForm({ defaults, onDone, isEdit }: FormProps<ClientValues>) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: "individual", status: "active", name: "", rnokpp: "", edrpou: "", representative: "",
      phone: "", email: "", address: "", assignedTo: currentUser.id, notes: "", ...defaults,
    },
  });
  const submit = useDemoSubmit(onDone);
  const isEntity = watch("type") === "legal_entity";

  return (
    <FormGrid onSubmit={handleSubmit(submit)}>
      <Field label="Тип клієнта" required>
        <Select {...register("type")}>
          <LabelOptions labels={clientTypeLabel} />
        </Select>
      </Field>
      <Field label="Статус" required>
        <Select {...register("status")}>
          <LabelOptions labels={clientStatusLabel} />
        </Select>
      </Field>
      <Field label={isEntity ? "Повне найменування" : "Прізвище, ім’я, по батькові"} required error={errors.name?.message} className={full}>
        <Input {...register("name")} aria-invalid={!!errors.name} autoComplete="off" />
      </Field>
      {isEntity ? (
        <>
          <Field label="Код ЄДРПОУ" error={errors.edrpou?.message}>
            <Input {...register("edrpou")} inputMode="numeric" maxLength={8} aria-invalid={!!errors.edrpou} className="num" />
          </Field>
          <Field label="Керівник або уповноважена особа">
            <Input {...register("representative")} />
          </Field>
        </>
      ) : (
        <Field label="РНОКПП" hint="За наявності" error={errors.rnokpp?.message}>
          <Input {...register("rnokpp")} inputMode="numeric" maxLength={10} aria-invalid={!!errors.rnokpp} className="num" />
        </Field>
      )}
      <Field label="Телефон">
        <Input {...register("phone")} type="tel" autoComplete="off" />
      </Field>
      <Field label="Електронна пошта" error={errors.email?.message}>
        <Input {...register("email")} type="email" aria-invalid={!!errors.email} autoComplete="off" />
      </Field>
      <Field label={isEntity ? "Юридична адреса" : "Адреса"} className={full}>
        <Input {...register("address")} />
      </Field>
      <Field label="Відповідальний" required error={errors.assignedTo?.message}>
        <Select {...register("assignedTo")}>
          <UserOptions />
        </Select>
      </Field>
      <Field label="Примітки" className={full}>
        <Textarea {...register("notes")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={isEdit ? "Зберегти зміни" : "Додати клієнта"} />
    </FormGrid>
  );
}

export function CaseForm({ defaults, onDone, isEdit }: FormProps<CaseValues>) {
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<CaseValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      title: "", isLitigation: false, courtCaseNumber: "", practiceArea: "", matterType: "", clientId: "",
      responsibleId: currentUser.id, status: "new", opposingParty: "", courtId: "", judge: "",
      openedOn: dayKey(), nextDate: "", description: "", ...defaults,
    },
  });
  const submit = useDemoSubmit(onDone);
  const isLitigation = watch("isLitigation");

  return (
    <FormGrid onSubmit={handleSubmit(submit)}>
      <Field label="Назва справи" required error={errors.title?.message} className={full}>
        <Input {...register("title")} aria-invalid={!!errors.title} />
      </Field>
      <Field label="Клієнт" required error={errors.clientId?.message}>
        <Select {...register("clientId")} aria-invalid={!!errors.clientId}>
          <ClientOptions />
        </Select>
      </Field>
      <Field label="Відповідальний" required>
        <Select {...register("responsibleId")}>
          <UserOptions />
        </Select>
      </Field>
      <Field label="Галузь права" required error={errors.practiceArea?.message}>
        <Select {...register("practiceArea")} aria-invalid={!!errors.practiceArea}>
          <Options values={practiceAreas} placeholder="Оберіть галузь" />
        </Select>
      </Field>
      <Field label="Тип справи" required error={errors.matterType?.message}>
        <Select {...register("matterType")} aria-invalid={!!errors.matterType}>
          <Options values={matterTypes} placeholder="Оберіть тип" />
        </Select>
      </Field>
      <Field label="Статус" required>
        <Select {...register("status")}>
          <LabelOptions labels={caseStatusLabel} />
        </Select>
      </Field>
      <Field label="Дата відкриття" required error={errors.openedOn?.message}>
        <Controller
          control={control}
          name="openedOn"
          render={({ field, fieldState }) => <DatePicker value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />}
        />
      </Field>
      <Checkbox label="Судова справа" {...register("isLitigation")} className={full} />
      {isLitigation && (
        <>
          <Field label="Номер судової справи" hint="Якщо вже присвоєно">
            <Input {...register("courtCaseNumber")} className="num" />
          </Field>
          <Field label="Суд">
            <Select {...register("courtId")}>
              <option value="">Не обрано</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Суддя" hint="Якщо відомо">
            <Input {...register("judge")} />
          </Field>
        </>
      )}
      <Field label="Інша сторона">
        <Input {...register("opposingParty")} />
      </Field>
      <Field label="Наступна важлива дата">
        <Controller
          control={control}
          name="nextDate"
          render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
        />
      </Field>
      <Field label="Короткий опис" className={full}>
        <Textarea {...register("description")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={isEdit ? "Зберегти зміни" : "Створити справу"} />
    </FormGrid>
  );
}

export function CourtForm({ defaults, onDone, isEdit }: FormProps<CourtValues>) {
  const { register, handleSubmit, formState: { errors } } = useForm<CourtValues>({
    resolver: zodResolver(courtSchema),
    defaultValues: { name: "", type: "", region: "", city: "", address: "", phone: "", website: "", ...defaults },
  });
  const submit = useDemoSubmit(onDone);

  return (
    <FormGrid onSubmit={handleSubmit(submit)}>
      <Field label="Назва суду" required error={errors.name?.message} className={full}>
        <Input {...register("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Тип суду" required error={errors.type?.message}>
        <Select {...register("type")} aria-invalid={!!errors.type}>
          <Options values={courtTypes} placeholder="Оберіть тип" />
        </Select>
      </Field>
      <Field label="Область">
        <Input {...register("region")} />
      </Field>
      <Field label="Місто">
        <Input {...register("city")} />
      </Field>
      <Field label="Телефон">
        <Input {...register("phone")} type="tel" />
      </Field>
      <Field label="Адреса" className={full}>
        <Input {...register("address")} />
      </Field>
      <Field label="Вебсайт" className={full}>
        <Input {...register("website")} type="url" placeholder="https://" />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={isEdit ? "Зберегти зміни" : "Додати суд"} />
    </FormGrid>
  );
}
