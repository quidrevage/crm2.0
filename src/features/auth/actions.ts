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
  // Access exists only through an active membership in at least one workspace.
  const { data: memberships } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", data.user.id).eq("is_active", true).limit(1);
  if (!memberships?.length) {
    await supabase.auth.signOut();
    return { error: "Доступ до робочих просторів вимкнено. Зверніться до адміністратора." };
  }
  redirect("/");
}

/**
 * Open registration: creates the account; the database gives it a workspace of its own
 * (or puts it into the workspaces that invited this e-mail).
 */
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Вкажіть ім’я та прізвище.").max(120),
      workspaceName: z.string().trim().max(120).optional(),
      email,
      password: z.string().min(MIN_PASSWORD, `Пароль має містити щонайменше ${MIN_PASSWORD} символів.`).max(72),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, "Паролі не збігаються.")
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, workspace_name: parsed.data.workspaceName || undefined },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/`,
    },
  });
  if (error) {
    if (/password/i.test(error.message)) return { error: "Пароль занадто простий. Оберіть довший або складніший пароль." };
    if (/rate|too many/i.test(error.message)) return { error: "Забагато спроб. Зачекайте кілька хвилин і спробуйте знову." };
    if (/not allowed|disabled/i.test(error.message)) return { error: "Реєстрацію зараз вимкнено. Зверніться до адміністратора." };
    return { error: "Не вдалося зареєструватися. Спробуйте ще раз." };
  }
  // Without e-mail confirmation the account is signed in straight away.
  if (data.session) redirect("/");
  // Same answer whether or not the address was already registered.
  return { success: `Майже готово! Ми надіслали лист на ${parsed.data.email}. Перейдіть за посиланням у ньому, щоб підтвердити адресу.` };
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
  USER_LIMIT_REACHED: "Усі місця в робочому просторі зайнято. Спершу вимкніть доступ іншому учаснику.",
  ALREADY_MEMBER: "Ця людина вже є учасником робочого простору.",
  ALREADY_INVITED: "На цю адресу вже надіслано запрошення, яке ще діє. Скасуйте його, щоб надіслати нове.",
  ADMIN_REQUIRED: "Запрошувати користувачів може лише адміністратор.",
};

export async function inviteUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "admin") return { error: dbMessages.ADMIN_REQUIRED };

  const parsed = z
    .object({
      email,
      fullName: z.string().trim().min(2, "Вкажіть ім’я та прізвище.").max(120),
      role: z.enum(["member", "admin"]).default("member"),
    })
    .safeParse({ email: formData.get("email"), fullName: formData.get("fullName"), role: formData.get("role") ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Step 1 — as the signed-in user: the database itself checks "is admin" and "is there a free seat".
  // Someone who already has an account is added to the workspace right here by the database.
  const supabase = await createClient();
  const { data: invitation, error: inviteError } = await supabase
    .from("user_invitations")
    .insert({ email: parsed.data.email, full_name: parsed.data.fullName, role: parsed.data.role })
    .select("id")
    .single();
  if (inviteError) {
    if (inviteError.code === "23505") return { error: dbMessages.ALREADY_INVITED };
    return { error: dbMessages[inviteError.message] ?? "Не вдалося створити запрошення." };
  }
  // The database accepts it in an after-insert trigger, so read the row back.
  const { data: accepted } = await supabase.from("user_invitations").select("accepted_at").eq("id", invitation.id).maybeSingle();
  if (accepted?.accepted_at) {
    revalidatePath("/", "layout");
    return { success: `${parsed.data.email} уже має обліковий запис — додано до робочого простору.` };
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

/**
 * Adds a person straight away with an e-mail and a password chosen by the administrator
 * (no e-mail is sent). The same database rules apply as for an invitation: only an administrator,
 * only while a seat is free. The account is created only after the database has accepted it.
 */
export async function addUserWithPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "admin") return { error: "Додавати користувачів може лише адміністратор." };

  const parsed = z
    .object({
      email,
      fullName: z.string().trim().min(2, "Вкажіть ім’я та прізвище.").max(120),
      role: z.enum(["member", "admin"]).default("member"),
      password: z.string().min(MIN_PASSWORD, `Пароль має містити щонайменше ${MIN_PASSWORD} символів.`).max(72),
    })
    .safeParse({
      email: formData.get("email"),
      fullName: formData.get("fullName"),
      role: formData.get("role") ?? undefined,
      password: formData.get("password"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Step 1 — as the signed-in user, so the database checks "is admin" and "is there a free seat".
  const supabase = await createClient();
  const { data: invitation, error: inviteError } = await supabase
    .from("user_invitations")
    .insert({ email: parsed.data.email, full_name: parsed.data.fullName, role: parsed.data.role })
    .select("id")
    .single();
  if (inviteError) {
    if (inviteError.code === "23505") return { error: "На цю адресу вже є запрошення. Скасуйте його нижче і спробуйте знову." };
    return { error: dbMessages[inviteError.message] ?? "Не вдалося додати користувача." };
  }
  const { data: accepted } = await supabase.from("user_invitations").select("accepted_at").eq("id", invitation.id).maybeSingle();
  if (accepted?.accepted_at) {
    revalidatePath("/", "layout");
    return { success: `${parsed.data.email} уже мав обліковий запис — додано до робочого простору з його старим паролем.` };
  }

  // Step 2 — create the account on the server; the database trigger adds it to the workspace.
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (createError) {
    await supabase.from("user_invitations").delete().eq("id", invitation.id);
    if (/password/i.test(createError.message)) return { error: "Пароль занадто простий. Оберіть довший або складніший пароль." };
    if (/already|registered|exists/i.test(createError.message)) return { error: "Користувач з такою адресою вже існує." };
    return { error: "Не вдалося створити обліковий запис. Спробуйте ще раз." };
  }

  revalidatePath("/", "layout");
  return { success: `Користувача ${parsed.data.fullName} додано. Передайте йому email і пароль для входу.` };
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
