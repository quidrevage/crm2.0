import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/forms";

export const metadata: Metadata = { title: "Реєстрація" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-lg font-semibold tracking-tight">Реєстрація</h1>
      <p className="mt-1 mb-4 text-[13px] text-muted">
        Ви отримаєте власне об’єднання, станете його адміністратором і зможете додавати колег. Дані кожного об’єднання бачать лише його учасники.
      </p>
      <RegisterForm />
    </>
  );
}
