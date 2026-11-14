"use client";

import { ErrorState } from "@/components/ui/display";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="Сталася помилка"
      message="Сторінку не вдалося показати. Спробуйте ще раз; якщо помилка повторюється, зверніться до адміністратора."
      onRetry={reset}
    />
  );
}
