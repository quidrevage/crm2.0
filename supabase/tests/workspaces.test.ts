import { beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type TestDatabase } from "./harness";

let t: TestDatabase;
let alice: string; // administrator of «Перша», creates «Друга»
let bob: string; // member of «Перша»
let carol: string; // invited only to «Друга»
let first: string;
let second: string;
let firstClient: string;

const statusId = `(select id from public.case_statuses where name = 'Нова')`;

beforeAll(async () => {
  t = await createDatabase();
  alice = await t.createAuthUser("alice@example.com");
  [{ id: first }] = (await t.asOwner(`select current_workspace_id as id from public.profiles where id = $1`, [alice])) as { id: string }[];
  await t.asUser(alice, `update public.workspaces set name = 'Перша'`);
  await t.asUser(alice, `insert into public.user_invitations (email, full_name) values ('bob@example.com', 'Боб')`);
  bob = await t.createAuthUser("bob@example.com");
  [{ id: firstClient }] = (await t.asUser(bob, `insert into public.clients (client_type, name) values ('individual', 'Клієнт першої') returning id`)) as { id: string }[];
}, 120_000);

describe("a new workspace", () => {
  it("is created with its creator as administrator, default lists and an empty register", async () => {
    [{ id: second }] = (await t.asUser(alice, `select public.create_workspace('Друга') as id`)) as { id: string }[];
    expect(await t.asUser(alice, `select role from public.workspace_members where workspace_id = $1 and user_id = $2`, [second, alice])).toEqual([{ role: "admin" }]);
    expect(await t.asUser(alice, `select count(*)::int as n from public.case_statuses`)).toEqual([{ n: 7 }]);
    expect(await t.asUser(alice, `select 1 from public.clients`)).toHaveLength(0);
  });

  it("numbers its clients and matters from the start", async () => {
    const [client] = await t.asUser(alice, `insert into public.clients (client_type, name) values ('individual', 'Клієнт другої') returning id, client_number`);
    expect(client.client_number).toBe("К-0001");
    const [legalCase] = await t.asUser(alice, `insert into public.cases (title, client_id, status_id, opened_on) values ('Справа', $1, ${statusId}, '2026-05-01') returning case_number`, [client.id]);
    expect(legalCase.case_number).toBe("2026/0001");
  });

  it("refuses a record that points at another workspace's data", async () => {
    await expect(
      t.asUser(alice, `insert into public.cases (title, client_id, status_id) values ('Чужий клієнт', $1, ${statusId})`, [firstClient]),
    ).rejects.toThrow(/foreign key/);
  });
});

describe("isolation between workspaces", () => {
  it("shows a member nothing of a workspace they do not belong to", async () => {
    expect(await t.asUser(bob, `select name from public.clients`)).toEqual([{ name: "Клієнт першої" }]);
    expect(await t.asUser(bob, `select name from public.workspaces`)).toEqual([{ name: "Перша" }]);
    expect(await t.asUser(bob, `select 1 from public.search_global('клієнт') where kind = 'client'`)).toHaveLength(1);
  });

  it("does not let anyone switch into a workspace they are not a member of", async () => {
    await expect(t.asUser(bob, `update public.profiles set current_workspace_id = $1 where id = $2`, [second, bob])).rejects.toThrow(/NOT_A_MEMBER/);
  });

  it("lets a person in two workspaces switch between them", async () => {
    await t.asUser(alice, `update public.profiles set current_workspace_id = $1 where id = $2`, [first, alice]);
    expect(await t.asUser(alice, `select name from public.clients`)).toEqual([{ name: "Клієнт першої" }]);
    await t.asUser(alice, `update public.profiles set current_workspace_id = $1 where id = $2`, [second, alice]);
    expect(await t.asUser(alice, `select name from public.clients`)).toEqual([{ name: "Клієнт другої" }]);
  });

  it("keeps the history separate", async () => {
    expect(await t.asUser(bob, `select 1 from public.activity_logs where workspace_id <> $1`, [first])).toHaveLength(0);
    expect(await t.asUser(alice, `select 1 from public.activity_logs where metadata->>'label' = 'Клієнт першої'`)).toHaveLength(0);
  });
});

describe("invitations into a workspace", () => {
  it("adds an existing account at once, without a new sign-up", async () => {
    await t.asUser(alice, `insert into public.user_invitations (email) values ('bob@example.com')`);
    expect(await t.asOwner(`select role from public.workspace_members where workspace_id = $1 and user_id = $2`, [second, bob])).toEqual([{ role: "member" }]);
    // Bob keeps working in «Перша» until he switches.
    expect(await t.asUser(bob, `select name from public.clients`)).toEqual([{ name: "Клієнт першої" }]);
    expect((await t.asUser(bob, `select name from public.workspaces order by name`)).map((r) => r.name)).toEqual(["Друга", "Перша"]);
  });

  it("refuses to invite someone who is already a member", async () => {
    await expect(t.asUser(alice, `insert into public.user_invitations (email) values ('bob@example.com')`)).rejects.toThrow(/ALREADY_MEMBER|duplicate key/);
  });

  it("puts a new account straight into the inviting workspace", async () => {
    await t.asUser(alice, `insert into public.user_invitations (email, full_name) values ('carol@example.com', 'Керол')`);
    carol = await t.createAuthUser("carol@example.com");
    expect(await t.asOwner(`select current_workspace_id as ws, full_name from public.profiles where id = $1`, [carol])).toEqual([{ ws: second, full_name: "Керол" }]);
    expect(await t.asUser(carol, `select name from public.clients`)).toEqual([{ name: "Клієнт другої" }]);
  });

  it("shows people only to those who share a workspace with them", async () => {
    await t.asUser(alice, `update public.workspace_members set is_active = false where user_id = $1 and workspace_id = $2`, [bob, second]);
    const names = (await t.asUser(bob, `select full_name from public.profiles order by full_name`)).map((r) => r.full_name);
    expect(names).not.toContain("Керол");
  });
});

describe("shared court directory", () => {
  it("is visible to every workspace but cannot be edited", async () => {
    await t.asOwner(`insert into public.courts (name) values ('Тестовий районний суд')`);
    expect(await t.asUser(bob, `select 1 from public.courts where workspace_id is null`)).toHaveLength(1);
    expect(await t.asUser(alice, `update public.courts set phone = 'x' where workspace_id is null returning 1`)).toHaveLength(0);
    await expect(t.asUser(alice, `insert into public.courts (name, workspace_id) values ('Чужий', null)`)).rejects.toThrow(/row-level security/);
  });

  it("can be used by a matter in any workspace", async () => {
    const [court] = await t.asOwner(`select id from public.courts where workspace_id is null limit 1`);
    const [legalCase] = await t.asUser(bob, `insert into public.cases (title, client_id, status_id, court_id) values ('Судова', $1, ${statusId}, $2) returning court_id`, [firstClient, court.id]);
    expect(legalCase.court_id).toBe(court.id);
  });
});

describe("deleting a workspace", () => {
  it("removes its data without touching other workspaces", async () => {
    await t.asOwner(`delete from public.workspaces where id = $1`, [second]);
    expect(await t.asOwner(`select count(*)::int as n from public.clients where workspace_id = $1`, [second])).toEqual([{ n: 0 }]);
    expect(await t.asUser(bob, `select name from public.clients`)).toEqual([{ name: "Клієнт першої" }]);
  });
});
