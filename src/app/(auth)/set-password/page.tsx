import type { Metadata } from "next";
import { SetPasswordForm } from "@/features/auth/forms";

export const metadata: Metadata = { title: "Новий пароль" };

/** Reached from an invitation or password-reset e-mail, after /auth/confirm has opened a session. */
export default function SetPasswordPage() {
  return (
    <>
      <h1 className="text-lg font-semibold tracking-tight">Встановіть пароль</h1>
      <p className="mt-1 mb-4 text-[13px] text-muted">Після збереження ви одразу увійдете до системи.</p>
      <SetPasswordForm />
    </>
  );
}
