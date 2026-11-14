"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

const email = z.string().trim().toLowerCase().pipe(z.email("Вкажіть коректну адресу електронної пошти"));
const MIN_PASSWORD = 10;

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Введіть електронну пошту та пароль." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    // One message for every failure, so the form does not reveal which accounts exist.
    return { error: "Неправильна електронна пошта або пароль." };
  }
  // Row-level security hides the profile of a deactivated account, even from its owner.
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Обліковий запис деактивовано. Зверніться до адміністратора." };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/set-password`,
  });
  // Same answer whether or not the address is registered.
  return { success: "Якщо така адреса зареєстрована, на неї надіслано лист із посиланням для зміни пароля." };
}

export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ password: z.string().min(MIN_PASSWORD, `Пароль має містити щонайменше ${MIN_PASSWORD} символів.`), confirm: z.string() })
    .refine((v) => v.password === v.confirm, "Паролі не збігаються.")
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Посилання недійсне або застаріле. Запросіть нове." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Не вдалося змінити пароль. Спробуйте інший пароль або запросіть нове посилання." };
  redirect("/");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Вкажіть ім’я та прізвище.").max(120),
      isAdvocate: z.boolean(),
      certificateNo: z.string().trim().max(60),
    })
    .safeParse({
      fullName: formData.get("fullName"),
      isAdvocate: formData.get("isAdvocate") === "on",
      certificateNo: formData.get("certificateNo") ?? "",
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      is_advocate: parsed.data.isAdvocate,
      advocate_certificate_no: parsed.data.isAdvocate ? parsed.data.certificateNo || null : null,
    })
    .eq("id", user.id)
    .select("id");
  if (error || !data?.length) return { error: "Не вдалося зберегти профіль." };

  revalidatePath("/", "layout");
  return { success: "Профіль збережено." };
}

const dbMessages: Record<string, string> = {
  USER_LIMIT_REACHED: "Досягнуто ліміту користувачів. Спершу деактивуйте наявний обліковий запис.",
  ADMIN_REQUIRED: "Запрошувати користувачів може лише адміністратор.",
};

export async function inviteUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "admin") return { error: dbMessages.ADMIN_REQUIRED };

  const parsed = z
    .object({ email, fullName: z.string().trim().min(2, "Вкажіть ім’я та прізвище.").max(120) })
    .safeParse({ email: formData.get("email"), fullName: formData.get("fullName") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Step 1 — as the signed-in user: the database itself checks "is admin" and "is there a free seat".
  const supabase = await createClient();
  const { data: invitation, error: inviteError } = await supabase
    .from("user_invitations")
    .insert({ email: parsed.data.email, full_name: parsed.data.fullName })
    .select("id")
    .single();
  if (inviteError) {
    if (inviteError.code === "23505") return { error: "Цю адресу вже запрошено." };
    return { error: dbMessages[inviteError.message] ?? "Не вдалося створити запрошення." };
  }

  // Step 2 — only now the secret key is used, to have Supabase Auth send the e-mail.
  const admin = createAdminClient();
  const { error: mailError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.fullName },
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/set-password`,
  });
  if (mailError) {
    await supabase.from("user_invitations").delete().eq("id", invitation.id);
    return { error: "Запрошення не надіслано: сервіс автентифікації відхилив запит. Спробуйте пізніше." };
  }

  revalidatePath("/settings");
  return { success: `Запрошення надіслано на ${parsed.data.email}.` };
}

export async function cancelInvitation(formData: FormData) {
  await requireUser();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  // RLS allows this only for an administrator and only while the invitation is unused.
  await supabase.from("user_invitations").delete().eq("id", id.data);
  revalidatePath("/settings");
}
