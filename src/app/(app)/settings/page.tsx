import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, DetailList, PageHeader } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { cancelInvitation } from "@/features/auth/actions";
import { InviteForm, ProfileForm } from "@/features/auth/forms";
import { FinanceAccessPanel, ReferenceLists, UsersPanel } from "@/features/settings/settings-panels";
import { roleLabel } from "@/i18n/uk";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Налаштування" };

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
  const seatFree = activeCount + pending.length < maxUsers;

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
              <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <UsersPanel users={users} maxUsers={maxUsers} />
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
                          Усі місця зайнято або очікують на прийняття запрошення: система розрахована на {maxUsers} користувачів.
                          Публічної реєстрації немає — обліковий запис створюється лише за запрошенням адміністратора.
                        </p>
                      )}
                    </Card>
                  )}
                </div>
                {isAdmin && <FinanceAccessPanel />}
              </div>
            ),
          },
          {
            id: "reference", label: "Довідники",
            content: <ReferenceLists />,
          },
          {
            id: "security", label: "Безпека",
            content: (
              <Card title="Безпека облікового запису" className="max-w-2xl">
                <DetailList
                  columns={1}
                  items={[
                    { label: "Пароль", value: "Щоб змінити пароль, вийдіть і скористайтеся посиланням «Забули пароль?» на сторінці входу." },
                    { label: "Документи", value: "Зберігаються в закритому сховищі. Посилання на файл діє 60 секунд і видається лише після перевірки доступу." },
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
