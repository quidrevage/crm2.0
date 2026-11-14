import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/forms";

export const metadata: Metadata = { title: "Відновлення пароля" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-lg font-semibold tracking-tight">Відновлення пароля</h1>
      <p className="mt-1 mb-4 text-[13px] text-muted">Вкажіть адресу свого облікового запису — ми надішлемо посилання для зміни пароля.</p>
      <ForgotPasswordForm />
    </>
  );
}
