import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, DetailList, PageHeader } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { cancelInvitation } from "@/features/auth/actions";
import { AddUserForm, InviteForm, ProfileForm } from "@/features/auth/forms";
import { FinanceAccessPanel, ReferenceLists, UsersPanel } from "@/features/settings/settings-panels";
import { WorkspacePanel } from "@/features/workspaces/workspace-ui";
import { roleLabel } from "@/i18n/uk";
import { nameFromEmail, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Налаштування" };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const supabase = await createClient();

  const [members, invitations, own] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("role, is_active, profile:profiles (id, full_name, email)")
      .eq("workspace_id", user.workspace.id)
      .order("created_at"),
    // Row-level security returns invitations to the administrator only.
    supabase.from("user_invitations").select("id, email, full_name, role, created_at, expires_at").is("accepted_at", null).order("created_at"),
    supabase.from("profiles").select("advocate_certificate_no").eq("id", user.id).single(),
  ]);
  if (members.error) throw new Error("Failed to load settings");

  const users = members.data
    .filter((m) => m.profile)
    .map((m) => ({ id: m.profile!.id, full_name: m.profile!.full_name, email: m.profile!.email, role: m.role, is_active: m.is_active }));
  const maxUsers = user.workspace.maxUsers;
  const activeCount = users.filter((u) => u.is_active).length;
  const now = new Date().toISOString();
  const pending = invitations.data ?? [];
  // Expired invitations no longer hold a seat; they are replaced when the address is invited again.
  const waiting = pending.filter((inv) => inv.expires_at > now);
  const seatFree = activeCount + waiting.length < maxUsers;

  return (
    <>
      <PageHeader title="Налаштування" />
      <Tabs
        defaultTab={tab}
        tabs={[
          {
            id: "profile", label: "Профіль",
            content: (
              <Card title="Мій профіль" className="max-w-2xl">
                <DetailList
                  items={[
                    { label: "Електронна пошта", value: user.email },
                    { label: "Роль у робочому просторі", value: roleLabel[user.role] },
                  ]}
                />
                <div className="mt-4 border-t border-line pt-4">
                  <ProfileForm fullName={user.fullName} isAdvocate={user.isAdvocate} certificateNo={own.data?.advocate_certificate_no ?? ""} />
                </div>
              </Card>
            ),
          },
          {
            id: "workspace", label: "Робочий простір",
            content: (
              <WorkspacePanel
                workspace={{ id: user.workspace.id, name: user.workspace.name, maxUploadMb: user.workspace.maxUploadMb, maxUsers }}
                workspaces={user.workspaces}
                isAdmin={isAdmin}
              />
            ),
          },
          {
            id: "users", label: "Учасники", count: users.length,
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
                              <p className="text-sm font-medium">{inv.full_name || nameFromEmail(inv.email)}</p>
                              <p className="num truncate text-[13px] text-muted">
                                {inv.email} · {roleLabel[inv.role]} ·{" "}
                                {inv.expires_at > now ? `діє до ${formatDate(inv.expires_at)}` : "строк дії минув"}
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
                  {isAdmin && seatFree && (
                    <Card title="Додати користувача">
                      <AddUserForm />
                    </Card>
                  )}
                  {isAdmin && (
                    <Card title="Або запросити поштою">
                      {seatFree ? (
                        <InviteForm />
                      ) : (
                        <p className="text-[13px] text-muted">
                          Усі місця зайнято або очікують на прийняття запрошення: у цьому робочому просторі {maxUsers} місць.
                          Вимкніть доступ учаснику, який більше не працює, щоб звільнити місце.
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
