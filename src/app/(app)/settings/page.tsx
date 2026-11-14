import type { Metadata } from "next";
import { Avatar, Badge, Card, DetailList, PageHeader } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import {
  caseStatusLabel, courtTypes, documentCategories, matterTypes, partyRoles, practiceAreas, roleLabel,
} from "@/i18n/uk";
import { currentUser, users } from "@/mocks/data";

export const metadata: Metadata = { title: "Налаштування" };

const MAX_USERS = 2;

function ReferenceList({ title, values }: { title: string; values: readonly string[] }) {
  return (
    <Card title={title}>
      <ul className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <li key={value} className="rounded border border-line px-2 py-0.5 text-[13px]">
            {value}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function SettingsPage() {
  const limitReached = users.length >= MAX_USERS;
  return (
    <>
      <PageHeader title="Налаштування" />
      <Tabs
        tabs={[
          {
            id: "profile", label: "Профіль",
            content: (
              <Card title="Мій профіль" className="max-w-2xl">
                <DetailList
                  items={[
                    { label: "Ім’я та прізвище", value: currentUser.fullName },
                    { label: "Електронна пошта", value: currentUser.email },
                    { label: "Роль", value: roleLabel[currentUser.role] },
                    { label: "Статус адвоката", value: currentUser.isAdvocate ? "Адвокат" : "Не вказано" },
                  ]}
                />
                <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">
                  Редагування профілю та зміна пароля стануть доступні після підключення автентифікації.
                </p>
              </Card>
            ),
          },
          {
            id: "users", label: "Користувачі", count: users.length,
            content: (
              <Card
                title={`Користувачі: ${users.length} з ${MAX_USERS}`}
                flush
                className="max-w-2xl"
                action={
                  <Button size="sm" disabled={limitReached}>
                    Запросити користувача
                  </Button>
                }
              >
                <ul className="divide-y divide-line">
                  {users.map((user) => (
                    <li key={user.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={user.fullName} className="h-8 w-8 text-xs" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="truncate text-[13px] text-muted">{user.email}</p>
                      </div>
                      <Badge tone={user.role === "admin" ? "accent" : "neutral"}>{roleLabel[user.role]}</Badge>
                    </li>
                  ))}
                </ul>
                {limitReached && (
                  <p className="border-t border-line px-4 py-3 text-[13px] text-muted">
                    Досягнуто ліміту в {MAX_USERS} користувачі. Публічної реєстрації немає: обліковий запис створюється лише за
                    запрошенням адміністратора.
                  </p>
                )}
              </Card>
            ),
          },
          {
            id: "reference", label: "Довідники",
            content: (
              <div className="space-y-4">
                <p className="text-[13px] text-muted">
                  Початкові значення довідників. Адміністратор зможе додавати, перейменовувати та вимикати їх після підключення бази даних.
                </p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <ReferenceList title="Галузі права" values={practiceAreas} />
                  <ReferenceList title="Типи справ" values={matterTypes} />
                  <ReferenceList title="Статуси справ" values={Object.values(caseStatusLabel)} />
                  <ReferenceList title="Процесуальні статуси учасників" values={partyRoles} />
                  <ReferenceList title="Категорії документів" values={documentCategories} />
                  <ReferenceList title="Типи судів" values={courtTypes} />
                </div>
              </div>
            ),
          },
          {
            id: "security", label: "Безпека",
            content: (
              <Card title="Безпека облікового запису" className="max-w-2xl">
                <DetailList
                  columns={1}
                  items={[
                    { label: "Пароль", value: "Зміна пароля — після підключення автентифікації" },
                    { label: "Двофакторна автентифікація", value: "Буде налаштовано разом з автентифікацією" },
                    { label: "Часовий пояс", value: "Europe/Kyiv" },
                    { label: "Формат дати та валюта", value: "ДД.ММ.РРРР · гривня (₴)" },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
