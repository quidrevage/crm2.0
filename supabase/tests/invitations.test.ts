import { beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type TestDatabase } from "./harness";

let t: TestDatabase;
let admin: string;
let ws: string;

const workspacesOf = async (userId: string) =>
  (await t.asOwner(
    `select w.name, m.role from public.workspace_members m join public.workspaces w on w.id = m.workspace_id where m.user_id = $1 order by w.created_at`,
    [userId],
  )) as { name: string; role: string }[];

beforeAll(async () => {
  t = await createDatabase();
  admin = await t.createAuthUser("owner@example.com");
  [{ id: ws }] = (await t.asOwner(`select current_workspace_id as id from public.profiles where id = $1`, [admin])) as { id: string }[];
  await t.asUser(admin, `update public.workspaces set name = 'Бюро Власника'`);
  // A small team, to exercise the seat limit.
  await t.asOwner(`update public.workspaces set max_users = 2 where id = $1`, [ws]);
}, 120_000);

describe("open registration", () => {
  it("gives the first account its own workspace, as administrator, with the default lists", async () => {
    expect(await workspacesOf(admin)).toEqual([{ name: "Бюро Власника", role: "admin" }]);
    expect(await t.asOwner(`select count(*)::int as n from public.case_statuses where workspace_id = $1`, [ws])).toEqual([{ n: 7 }]);
  });

  it("gives anyone who signs up uninvited a workspace of their own, named as they chose — and nothing of others", async () => {
    const newcomer = await t.createAuthUser("newcomer@example.com", { full_name: "Нова Людина", workspace_name: "АО Новачок" });
    expect(await workspacesOf(newcomer)).toEqual([{ name: "АО Новачок", role: "admin" }]);
    expect(await t.asOwner(`select full_name from public.profiles where id = $1`, [newcomer])).toEqual([{ full_name: "Нова Людина" }]);
    expect(await t.asUser(newcomer, `select 1 from public.workspaces where id = $1`, [ws])).toHaveLength(0);
  });

  it("uses a default name when none is given", async () => {
    const plain = await t.createAuthUser("plain@example.com");
    expect(await workspacesOf(plain)).toEqual([{ name: "Моя практика", role: "admin" }]);
  });

  it("does not create the same e-mail twice", async () => {
    await expect(t.createAuthUser("plain@example.com")).rejects.toThrow(/duplicate key/);
  });
});

describe("inviting into a workspace", () => {
  it("is refused to visitors who are not signed in", async () => {
    await expect(t.asAnon(`insert into public.user_invitations (workspace_id, email) values ($1, 'x@example.com')`, [ws])).rejects.toThrow(/permission denied/);
  });

  it("normalises the e-mail, keeps the role, and refuses a second pending invitation for it", async () => {
    await t.asUser(admin, `insert into public.user_invitations (email, full_name, role) values ('  Partner@Example.COM ', 'Олена Партнер', 'admin')`);
    expect(await t.asOwner(`select email, role from public.user_invitations where accepted_at is null`)).toEqual([{ email: "partner@example.com", role: "admin" }]);
    await expect(t.asUser(admin, `insert into public.user_invitations (email) values ('partner@example.com')`)).rejects.toThrow(/ALREADY_INVITED/);
  });

  it("counts a pending invitation as a taken seat", async () => {
    await expect(t.asUser(admin, `insert into public.user_invitations (email) values ('third@example.com')`)).rejects.toThrow(/USER_LIMIT_REACHED/);
  });

  it("puts the invited person into that workspace with the invited role and name", async () => {
    const partner = await t.createAuthUser("Partner@Example.com");
    expect(await workspacesOf(partner)).toEqual([{ name: "Бюро Власника", role: "admin" }]);
    expect(await t.asOwner(`select full_name, current_workspace_id as ws from public.profiles where id = $1`, [partner])).toEqual([{ full_name: "Олена Партнер", ws }]);
    expect(await t.asOwner(`select accepted_at is not null as accepted from public.user_invitations where email = 'partner@example.com'`)).toEqual([{ accepted: true }]);
    await expect(t.asUser(admin, `insert into public.user_invitations (email) values ('partner@example.com')`)).rejects.toThrow(/ALREADY_MEMBER/);
  });

  it("adds someone who already has an account at once", async () => {
    await t.asOwner(`update public.workspaces set max_users = 3 where id = $1`, [ws]);
    await t.asUser(admin, `insert into public.user_invitations (email) values ('newcomer@example.com')`);
    const [{ id }] = (await t.asOwner(`select id from public.profiles where email = 'newcomer@example.com'`)) as { id: string }[];
    expect((await workspacesOf(id)).map((w) => w.name)).toEqual(["Бюро Власника", "АО Новачок"]);
  });

  it("does not let a member invite or promote themselves", async () => {
    const [{ id }] = (await t.asOwner(`select id from public.profiles where email = 'newcomer@example.com'`)) as { id: string }[];
    await t.asUser(id, `update public.profiles set current_workspace_id = $1 where id = $2`, [ws, id]);
    expect(await t.asUser(id, `update public.workspace_members set role = 'admin' where user_id = $1 returning 1`, [id])).toHaveLength(0);
    await expect(t.asUser(id, `insert into public.user_invitations (email) values ('friend@example.com')`)).rejects.toThrow(/ADMIN_REQUIRED/);
  });
});

describe("an invitation that cannot be honoured", () => {
  it("still gives the person an account with a workspace of their own, and leaves the invitation unused", async () => {
    // Full workspace, invitation forced in by the database owner.
    await t.asOwner(`alter table public.user_invitations disable trigger check_invitation`);
    await t.asOwner(`insert into public.user_invitations (workspace_id, email) values ($1, 'late@example.com')`, [ws]);
    await t.asOwner(`alter table public.user_invitations enable trigger check_invitation`);
    const late = await t.createAuthUser("late@example.com");
    expect(await workspacesOf(late)).toEqual([{ name: "Моя практика", role: "admin" }]);
    expect(await t.asOwner(`select accepted_at from public.user_invitations where email = 'late@example.com'`)).toEqual([{ accepted_at: null }]);
  });

  it("ignores an expired invitation", async () => {
    await t.asOwner(`update public.user_invitations set expires_at = now() - interval '1 day' where email = 'late@example.com'`);
    await t.asOwner(`alter table public.user_invitations disable trigger check_invitation`);
    await t.asOwner(`insert into public.user_invitations (workspace_id, email, expires_at) values ($1, 'expired@example.com', now() - interval '1 day')`, [ws]);
    await t.asOwner(`alter table public.user_invitations enable trigger check_invitation`);
    const expired = await t.createAuthUser("expired@example.com");
    expect((await workspacesOf(expired)).map((w) => w.role)).toEqual(["admin"]);
  });
});
