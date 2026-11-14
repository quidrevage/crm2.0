"use client";

import { useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

/** Phase 2: layout only. Supabase Auth is connected in Phase 3; until then nobody is "signed in". */
export function LoginForm() {
  const [attempted, setAttempted] = useState(false);
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setAttempted(true);
      }}
    >
      <Field label="Електронна пошта">
        <Input type="email" name="email" autoComplete="username" />
      </Field>
      <Field label="Пароль">
        <Input type="password" name="password" autoComplete="current-password" />
      </Field>
      {attempted && (
        <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
          Автентифікацію ще не підключено, тому вхід зараз не працює. Введені дані нікуди не надсилаються.
        </p>
      )}
      <Button type="submit" variant="primary" className="w-full">
        Увійти
      </Button>
      <LinkButton href="/" variant="ghost" className="w-full">
        Відкрити демонстрацію
      </LinkButton>
    </form>
  );
}
