import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/forms";

export const metadata: Metadata = { title: "Вхід" };

const notices: Record<string, string> = {
  inactive: "Сеанс завершено: обліковий запис неактивний або ще не налаштований.",
  link: "Посилання недійсне або застаріле. Запросіть нове.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <>
      <h1 className="text-lg font-semibold tracking-tight">Вхід до системи</h1>
      <p className="mt-1 mb-4 text-[13px] text-muted">Немає акаунта? Зареєструйтеся та створіть своє об’єднання.</p>
      <LoginForm notice={reason ? notices[reason] : undefined} />
    </>
  );
}
