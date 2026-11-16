"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { inviteUser, requestPasswordReset, setPassword, signIn, updateProfile, type FormState } from "./actions";

function Message({ state }: { state: FormState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">
        {state.error}
      </p>
    );
  }
  if (state?.success) {
    return (
      <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-[13px] text-success">
        {state.success}
      </p>
    );
  }
  return null;
}

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-3">
      {notice && !state && <p className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">{notice}</p>}
      <Field label="Електронна пошта">
        <Input type="email" name="email" autoComplete="username" required />
      </Field>
      <Field label="Пароль">
        <Input type="password" name="password" autoComplete="current-password" required />
      </Field>
      <Message state={state} />
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Вхід…" : "Увійти"}
      </Button>
      <p className="text-center text-[13px]">
        <Link href="/forgot-password" className="text-accent hover:underline">
          Забули пароль?
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Електронна пошта">
        <Input type="email" name="email" autoComplete="username" required />
      </Field>
      <Message state={state} />
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Надсилання…" : "Надіслати посилання"}
      </Button>
      <p className="text-center text-[13px]">
        <Link href="/login" className="text-accent hover:underline">
          Повернутися до входу
        </Link>
      </p>
    </form>
  );
}

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Новий пароль" hint="Щонайменше 10 символів.">
        <Input type="password" name="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Повторіть пароль">
        <Input type="password" name="confirm" autoComplete="new-password" required />
      </Field>
      <Message state={state} />
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Збереження…" : "Зберегти пароль"}
      </Button>
    </form>
  );
}

type ProfileFormProps = { fullName: string; isAdvocate: boolean; certificateNo: string; onSaved?: () => void };

export function ProfileForm({ fullName, isAdvocate, certificateNo, onSaved }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state, onSaved]);
  return (
    <form action={action} className="max-w-md space-y-3">
      <Field label="Ім’я та прізвище" required>
        <Input name="fullName" defaultValue={fullName} autoComplete="name" required />
      </Field>
      <Checkbox name="isAdvocate" defaultChecked={isAdvocate} label="Я адвокат" />
      <Field label="Номер свідоцтва про право на заняття адвокатською діяльністю" hint="Необов’язково.">
        <Input name="certificateNo" defaultValue={certificateNo} />
      </Field>
      <Message state={state} />
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Збереження…" : "Зберегти профіль"}
      </Button>
    </form>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteUser, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Ім’я та прізвище" required>
        <Input name="fullName" autoComplete="off" required />
      </Field>
      <Field label="Електронна пошта" required>
        <Input type="email" name="email" autoComplete="off" required />
      </Field>
      <div className="space-y-3 sm:col-span-2">
        <Message state={state} />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Надсилання…" : "Надіслати запрошення"}
        </Button>
      </div>
    </form>
  );
}
