import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вхід" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
            <Scale className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base leading-tight font-semibold tracking-tight">LegalDesk UA</p>
            <p className="text-[13px] text-muted">Керування юридичною практикою</p>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <h1 className="text-lg font-semibold tracking-tight">Вхід до системи</h1>
          <p className="mt-1 mb-4 text-[13px] text-muted">Доступ мають лише запрошені користувачі. Реєстрації немає.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
