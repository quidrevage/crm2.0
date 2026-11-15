"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { clientStatusLabel, clientTypeLabel } from "@/i18n/uk";
import { dayKey } from "@/lib/dates";
import { useLookups } from "../lookups/context";
import { saveCase, saveClient, saveContact, saveCourt, saveParty } from "../records/actions";
import {
  caseSchema, clientSchema, contactSchema, courtSchema, partySchema,
  type CaseValues, type ClientValues, type ContactValues, type CourtValues, type PartyValues,
} from "../schemas";
import { FormFooter, FormGrid, LabelOptions, RefOptions, UserOptions, full, useSubmit, type FormProps } from "./shared";

export function ClientForm({ values, meta, onDone }: FormProps<ClientValues>) {
  const { me } = useLookups();
  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: "individual", status: "active", name: "", rnokpp: "", edrpou: "", representative: "",
      phone: "", email: "", address: "", assignedTo: me.id, notes: "", ...values,
    },
  });
  const { register, watch, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, saveClient, {
    meta, onDone, success: meta.id ? "Зміни збережено" : "Клієнта додано", openCreated: (id) => `/clients/${id}`,
  });
  const isEntity = watch("type") === "legal_entity";

  return (
    <FormGrid onSubmit={onSubmit}>
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
      <Field label="Відповідальний">
        <Select {...register("assignedTo")}>
          <UserOptions placeholder="Не призначено" />
        </Select>
      </Field>
      <Field label="Примітки" className={full}>
        <Textarea {...register("notes")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Додати клієнта"} pending={pending} error={error} />
    </FormGrid>
  );
}

export function ContactForm({ values, meta, onDone }: FormProps<ContactValues>) {
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { clientId: "", fullName: "", position: "", phone: "", email: "", comment: "", ...values },
  });
  const { register, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, saveContact, { meta, onDone, success: meta.id ? "Зміни збережено" : "Контакт додано" });

  return (
    <FormGrid onSubmit={onSubmit}>
      <Field label="Прізвище, ім’я, по батькові" required error={errors.fullName?.message} className={full}>
        <Input {...register("fullName")} aria-invalid={!!errors.fullName} />
      </Field>
      <Field label="Посада або роль">
        <Input {...register("position")} />
      </Field>
      <Field label="Телефон">
        <Input {...register("phone")} type="tel" />
      </Field>
      <Field label="Електронна пошта" error={errors.email?.message} className={full}>
        <Input {...register("email")} type="email" aria-invalid={!!errors.email} />
      </Field>
      <Field label="Коментар" className={full}>
        <Textarea {...register("comment")} rows={2} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Додати контакт"} pending={pending} error={error} />
    </FormGrid>
  );
}

export function CaseForm({ values, meta, onDone }: FormProps<CaseValues>) {
  const { me, clients, courts, practiceAreas, matterTypes, caseStatuses } = useLookups();
  const form = useForm<CaseValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      title: "", isLitigation: false, courtCaseNumber: "", practiceAreaId: "", matterTypeId: "", clientId: "",
      responsibleId: me.id, statusId: caseStatuses.find((s) => s.isActive)?.id ?? "", opposingParty: "", courtId: "",
      judge: "", openedOn: dayKey(), nextDate: "", closedOn: "", description: "", ...values,
    },
  });
  const { register, watch, control, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, saveCase, {
    meta, onDone, success: meta.id ? "Зміни збережено" : "Справу створено", openCreated: (id) => `/cases/${id}`,
  });
  const isLitigation = watch("isLitigation");
  const clientId = watch("clientId");
  const statusId = watch("statusId");
  const closed = caseStatuses.find((s) => s.id === statusId)?.isClosed;

  return (
    <FormGrid onSubmit={onSubmit}>
      <Field label="Назва справи" required error={errors.title?.message} className={full}>
        <Input {...register("title")} aria-invalid={!!errors.title} />
      </Field>
      <Field label="Клієнт" required error={errors.clientId?.message}>
        <Select {...register("clientId")} aria-invalid={!!errors.clientId}>
          <option value="">Оберіть клієнта</option>
          {clients
            .filter((c) => !c.archived || c.id === clientId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Відповідальний">
        <Select {...register("responsibleId")}>
          <UserOptions placeholder="Не призначено" />
        </Select>
      </Field>
      <Field label="Галузь права">
        <Select {...register("practiceAreaId")}>
          <RefOptions items={practiceAreas} current={values?.practiceAreaId} placeholder="Не обрано" />
        </Select>
      </Field>
      <Field label="Тип справи">
        <Select {...register("matterTypeId")}>
          <RefOptions items={matterTypes} current={values?.matterTypeId} placeholder="Не обрано" />
        </Select>
      </Field>
      <Field label="Статус" required error={errors.statusId?.message}>
        <Select {...register("statusId")}>
          <RefOptions items={caseStatuses} current={values?.statusId} />
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
          <Field label="Суд" hint={courts.length === 0 ? "Спершу додайте суд у розділі «Суди»" : undefined}>
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
        <Controller control={control} name="nextDate" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} />
      </Field>
      {(closed || values?.closedOn) && (
        <Field label="Дата закриття" error={errors.closedOn?.message}>
          <Controller
            control={control}
            name="closedOn"
            render={({ field, fieldState }) => <DatePicker value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />}
          />
        </Field>
      )}
      <Field label="Короткий опис" className={full}>
        <Textarea {...register("description")} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Створити справу"} pending={pending} error={error} />
    </FormGrid>
  );
}

export function PartyForm({ values, meta, onDone }: FormProps<PartyValues>) {
  const { partyRoles } = useLookups();
  const form = useForm<PartyValues>({
    resolver: zodResolver(partySchema),
    defaultValues: { caseId: "", roleId: "", name: "", isOurClient: false, identifier: "", contact: "", notes: "", ...values },
  });
  const { register, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, saveParty, { meta, onDone, success: meta.id ? "Зміни збережено" : "Учасника додано" });

  return (
    <FormGrid onSubmit={onSubmit}>
      <Field label="Найменування або ПІБ" required error={errors.name?.message} className={full}>
        <Input {...register("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Процесуальний статус" required error={errors.roleId?.message}>
        <Select {...register("roleId")} aria-invalid={!!errors.roleId}>
          <RefOptions items={partyRoles} current={values?.roleId} placeholder="Оберіть статус" />
        </Select>
      </Field>
      <Field label="Код ЄДРПОУ або РНОКПП">
        <Input {...register("identifier")} className="num" />
      </Field>
      <Field label="Контакти" className={full}>
        <Input {...register("contact")} />
      </Field>
      <Checkbox label="Це наш клієнт" {...register("isOurClient")} className={full} />
      <Field label="Примітки" className={full}>
        <Textarea {...register("notes")} rows={2} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Додати учасника"} pending={pending} error={error} />
    </FormGrid>
  );
}

export function CourtForm({ values, meta, onDone }: FormProps<CourtValues>) {
  const { courtTypes } = useLookups();
  const form = useForm<CourtValues>({
    resolver: zodResolver(courtSchema),
    defaultValues: { name: "", typeId: "", region: "", city: "", address: "", phone: "", email: "", website: "", notes: "", ...values },
  });
  const { register, formState: { errors } } = form;
  const { onSubmit, error, pending } = useSubmit(form, saveCourt, { meta, onDone, success: meta.id ? "Зміни збережено" : "Суд додано" });

  return (
    <FormGrid onSubmit={onSubmit}>
      <Field label="Назва суду" required error={errors.name?.message} className={full}>
        <Input {...register("name")} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Тип суду">
        <Select {...register("typeId")}>
          <RefOptions items={courtTypes} current={values?.typeId} placeholder="Не обрано" />
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
      <Field label="Електронна пошта" error={errors.email?.message}>
        <Input {...register("email")} type="email" aria-invalid={!!errors.email} />
      </Field>
      <Field label="Вебсайт" error={errors.website?.message}>
        <Input {...register("website")} type="url" placeholder="https://" aria-invalid={!!errors.website} />
      </Field>
      <Field label="Примітки" className={full}>
        <Textarea {...register("notes")} rows={2} />
      </Field>
      <FormFooter onCancel={onDone} submitLabel={meta.id ? "Зберегти зміни" : "Додати суд"} pending={pending} error={error} />
    </FormGrid>
  );
}
