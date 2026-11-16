import { beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type TestDatabase } from "./harness";

let t: TestDatabase;
let admin: string;
let ws: string;

const counts = async (email: string) =>
  (await t.asOwner(
    `select (select count(*)::int from auth.users where email = $1) as auth,
            (select count(*)::int from public.profiles where email = lower($1)) as profiles,
            (select count(*)::int from public.workspace_members m join public.profiles p on p.id = m.user_id where p.email = lower($1)) as members`,
    [email],
  ))[0];

beforeAll(async () => {
  t = await createDatabase();
  admin = await t.createAuthUser("owner@example.com");
  [{ id: ws }] = (await t.asOwner(`select current_workspace_id as id from public.profiles where id = $1`, [admin])) as { id: string }[];
}, 120_000);

describe("first administrator", () => {
  it("gets a two-seat workspace with the default lists, once", async () => {
    expect(await t.asOwner(`select role from public.workspace_members where user_id = $1`, [admin])).toEqual([{ role: "admin" }]);
    expect(await t.asOwner(`select name, max_users from public.workspaces`)).toEqual([{ name: "Моя практика", max_users: 2 }]);
    expect(await t.asOwner(`select count(*)::int as n from public.case_statuses`)).toEqual([{ n: 7 }]);
  });
});

describe("accounts without a valid invitation", () => {
  it("are refused, leaving nothing behind (e.g. «Add user» in the Supabase dashboard)", async () => {
    await expect(t.createAuthUser("stranger@example.com")).rejects.toThrow(/INVITATION_REQUIRED/);
    expect(await counts("stranger@example.com")).toEqual({ auth: 0, profiles: 0, members: 0 });
  });

  it("are refused when the invitation has expired, and a renewed invitation works", async () => {
    await t.asUser(admin, `insert into public.user_invitations (email) values ('late@example.com')`);
    await t.asOwner(`update public.user_invitations set expires_at = now() - interval '1 day' where email = 'late@example.com'`);
    await expect(t.createAuthUser("late@example.com")).rejects.toThrow(/INVITATION_EXPIRED/);
    expect(await counts("late@example.com")).toEqual({ auth: 0, profiles: 0, members: 0 });
    // Inviting again replaces the expired invitation.
    await t.asUser(admin, `insert into public.user_invitations (email) values ('late@example.com')`);
    expect(await t.asOwner(`select count(*)::int as n from public.user_invitations where email = 'late@example.com'`)).toEqual([{ n: 1 }]);
    await t.asOwner(`delete from public.user_invitations where email = 'late@example.com'`);
  });
});

describe("inviting", () => {
  it("is refused to anyone who is not an administrator of the workspace", async () => {
    await expect(t.asAnon(`insert into public.user_invitations (workspace_id, email) values ($1, 'x@example.com')`, [ws])).rejects.toThrow(/permission denied/);
  });

  it("normalises the e-mail and refuses a second pending invitation for it", async () => {
    await t.asUser(admin, `insert into public.user_invitations (email, full_name, role) values ('  Partner@Example.COM ', 'Олена Партнер', 'admin')`);
    expect(await t.asOwner(`select email, role from public.user_invitations where accepted_at is null`)).toEqual([{ email: "partner@example.com", role: "admin" }]);
    await expect(t.asUser(admin, `insert into public.user_invitations (email) values ('partner@example.com')`)).rejects.toThrow(/ALREADY_INVITED/);
  });

  it("counts a pending invitation as a taken seat", async () => {
    await expect(t.asUser(admin, `insert into public.user_invitations (email) values ('third@example.com')`)).rejects.toThrow(/USER_LIMIT_REACHED/);
  });
});

describe("the invited person's account", () => {
  let partner: string;

  it("joins the workspace with the invited role, name and profile, and the invitation is marked accepted", async () => {
    partner = await t.createAuthUser("Partner@Example.com");
    expect(await t.asOwner(`select full_name, email, current_workspace_id as ws from public.profiles where id = $1`, [partner])).toEqual([
      { full_name: "Олена Партнер", email: "partner@example.com", ws },
    ]);
    expect(await t.asOwner(`select role, is_active from public.workspace_members where user_id = $1`, [partner])).toEqual([{ role: "admin", is_active: true }]);
    expect(await t.asOwner(`select accepted_at is not null as accepted from public.user_invitations where email = 'partner@example.com'`)).toEqual([{ accepted: true }]);
  });

  it("cannot be created twice for the same e-mail", async () => {
    await expect(t.createAuthUser("partner@example.com")).rejects.toThrow(/duplicate key|INVITATION_REQUIRED/);
  });

  it("refuses inviting someone who is already a member", async () => {
    await t.asUser(admin, `update public.workspace_members set role = 'member' where user_id = $1`, [partner]);
    await expect(t.asUser(admin, `insert into public.user_invitations (email) values ('partner@example.com')`)).rejects.toThrow(/ALREADY_MEMBER/);
  });

  it("does not let a member promote themselves", async () => {
    expect(await t.asUser(partner, `update public.workspace_members set role = 'admin' where user_id = $1 returning 1`, [partner])).toHaveLength(0);
    await expect(t.asUser(partner, `insert into public.user_invitations (email, role) values ('friend@example.com', 'admin')`)).rejects.toThrow(/ADMIN_REQUIRED|row-level security/);
  });
});

describe("two-person limit", () => {
  it("cannot be exceeded even with an invitation forced in by the database owner — and nothing is left half-created", async () => {
    await t.asOwner(`alter table public.user_invitations disable trigger check_invitation`);
    await t.asOwner(`insert into public.user_invitations (workspace_id, email) values ($1, 'third@example.com')`, [ws]);
    await t.asOwner(`alter table public.user_invitations enable trigger check_invitation`);
    await expect(t.createAuthUser("third@example.com")).rejects.toThrow(/USER_LIMIT_REACHED/);
    expect(await counts("third@example.com")).toEqual({ auth: 0, profiles: 0, members: 0 });
    // The invitation was not consumed by the failed attempt.
    expect(await t.asOwner(`select accepted_at from public.user_invitations where email = 'third@example.com'`)).toEqual([{ accepted_at: null }]);
  });

  it("frees a seat when a member's access is switched off, and the replacement can join", async () => {
    await t.asOwner(`delete from public.user_invitations where email = 'third@example.com'`);
    await t.asUser(admin, `update public.workspace_members set is_active = false where user_id <> $1`, [admin]);
    await t.asUser(admin, `insert into public.user_invitations (email) values ('third@example.com')`);
    const third = await t.createAuthUser("third@example.com");
    expect(await t.asOwner(`select role from public.workspace_members where user_id = $1`, [third])).toEqual([{ role: "member" }]);
  });
});

describe("the database owner (SQL editor), for creating an account from the Supabase dashboard", () => {
  it("can prepare an invitation first, after which the dashboard account is accepted", async () => {
    await t.asOwner(`update public.workspace_members set is_active = false where user_id <> $1`, [admin]);
    await t.asOwner(`insert into public.user_invitations (workspace_id, email, full_name) values ($1, 'Dashboard@Example.com', 'Через панель')`, [ws]);
    const id = await t.createAuthUser("dashboard@example.com");
    expect(await t.asOwner(`select full_name from public.profiles where id = $1`, [id])).toEqual([{ full_name: "Через панель" }]);
  });
});
