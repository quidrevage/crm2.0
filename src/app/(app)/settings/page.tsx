import type { Metadata } from "next";
import { Avatar, Badge, Card, DetailList, PageHeader } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { cancelInvitation } from "@/features/auth/actions";
import { InviteForm, ProfileForm } from "@/features/auth/forms";
import {
  caseStatusLabel, courtTypes, documentCategories, matterTypes, partyRoles, practiceAreas, roleLabel,
} from "@/i18n/uk";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Налаштування" };

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

export default async function SettingsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const supabase = await createClient();

  const [profiles, settings, invitations, own] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, is_active").order("created_at"),
    supabase.from("app_settings").select("max_users").single(),
    // Row-level security returns invitations to the administrator only.
    supabase.from("user_invitations").select("id, email, full_name, created_at").is("accepted_at", null).order("created_at"),
    supabase.from("profiles").select("advocate_certificate_no").eq("id", user.id).single(),
  ]);
  if (profiles.error || settings.error) throw new Error("Failed to load settings");

  const users = profiles.data;
  const maxUsers = settings.data.max_users;
  const activeCount = users.filter((u) => u.is_active).length;
  const pending = invitations.data ?? [];
  const seatFree = activeCount < maxUsers;

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
                    { label: "Електронна пошта", value: user.email },
                    { label: "Роль", value: roleLabel[user.role] },
                  ]}
                />
                <div className="mt-4 border-t border-line pt-4">
                  <ProfileForm fullName={user.fullName} isAdvocate={user.isAdvocate} certificateNo={own.data?.advocate_certificate_no ?? ""} />
                </div>
              </Card>
            ),
          },
          {
            id: "users", label: "Користувачі", count: users.length,
            content: (
              <div className="max-w-2xl space-y-4">
                <Card title={`Активні користувачі: ${activeCount} з ${maxUsers}`} flush>
                  <ul className="divide-y divide-line">
                    {users.map((u) => (
                      <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar name={u.full_name || u.email} className="h-8 w-8 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{u.full_name || "Ім’я не вказано"}</p>
                          <p className="truncate text-[13px] text-muted">{u.email}</p>
                        </div>
                        {!u.is_active && <Badge>Неактивний</Badge>}
                        <Badge tone={u.role === "admin" ? "accent" : "neutral"}>{roleLabel[u.role as "admin" | "member"]}</Badge>
                      </li>
                    ))}
                  </ul>
                </Card>

                {isAdmin && pending.length > 0 && (
                  <Card title="Надіслані запрошення" flush>
                    <ul className="divide-y divide-line">
                      {pending.map((inv) => (
                        <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{inv.full_name || inv.email}</p>
                            <p className="num truncate text-[13px] text-muted">
                              {inv.email} · надіслано {formatDate(inv.created_at)}
                            </p>
                          </div>
                          <form action={cancelInvitation}>
                            <input type="hidden" name="id" value={inv.id} />
                            <Button type="submit" size="sm">
                              Скасувати
                            </Button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {isAdmin && (
                  <Card title="Запросити користувача">
                    {seatFree ? (
                      <InviteForm />
                    ) : (
                      <p className="text-[13px] text-muted">
                        Усі місця зайнято: система розрахована на {maxUsers} користувачів. Публічної реєстрації немає — обліковий запис
                        створюється лише за запрошенням адміністратора.
                      </p>
                    )}
                  </Card>
                )}
              </div>
            ),
          },
          {
            id: "reference", label: "Довідники",
            content: (
              <div className="space-y-4">
                <p className="text-[13px] text-muted">
                  Початкові значення довідників. Редагування буде доступне адміністратору після підключення модулів до бази даних.
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
                    { label: "Пароль", value: "Щоб змінити пароль, вийдіть і скористайтеся посиланням «Забули пароль?» на сторінці входу." },
                    { label: "Двофакторна автентифікація", value: "Ще не підключено" },
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
