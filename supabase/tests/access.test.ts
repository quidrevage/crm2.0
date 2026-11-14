import { beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type TestDatabase } from "./harness";

let t: TestDatabase;
let admin: string;
let member: string;
let clientId: string;
let caseId: string;

const statusId = `(select id from public.case_statuses where name = 'Нова')`;

beforeAll(async () => {
  t = await createDatabase();
}, 120_000);

describe("accounts and the two-user limit", () => {
  it("makes the first account the administrator", async () => {
    admin = await t.createAuthUser("admin@example.com");
    const [profile] = await t.asOwner(`select role, is_active from public.profiles where id = $1`, [admin]);
    expect(profile).toEqual({ role: "admin", is_active: true });
  });

  it("rejects a second account that was not invited", async () => {
    await expect(t.createAuthUser("stranger@example.com")).rejects.toThrow(/INVITATION_REQUIRED/);
    expect(await t.asOwner(`select 1 from auth.users where email = 'stranger@example.com'`)).toHaveLength(0);
  });

  it("creates the invited second account as a member", async () => {
    await t.asUser(admin, `insert into public.user_invitations (email, full_name) values ('member@example.com', 'Андрій Мельник')`);
    member = await t.createAuthUser("member@example.com");
    const [profile] = await t.asOwner(`select role, full_name from public.profiles where id = $1`, [member]);
    expect(profile).toEqual({ role: "member", full_name: "Андрій Мельник" });
  });

  it("refuses to invite or create a third account", async () => {
    await expect(
      t.asUser(admin, `insert into public.user_invitations (email) values ('third@example.com')`),
    ).rejects.toThrow(/USER_LIMIT_REACHED/);
    // Even with an invitation forced in by the database owner, the account itself is refused.
    await t.asOwner(`alter table public.user_invitations disable trigger check_invitation`);
    await t.asOwner(`insert into public.user_invitations (email) values ('third@example.com')`);
    await t.asOwner(`alter table public.user_invitations enable trigger check_invitation`);
    await expect(t.createAuthUser("third@example.com")).rejects.toThrow(/USER_LIMIT_REACHED/);
    expect(await t.asOwner(`select count(*)::int as n from public.profiles`)).toEqual([{ n: 2 }]);
  });

  it("does not let a member invite anyone", async () => {
    await expect(
      t.asUser(member, `insert into public.user_invitations (email) values ('friend@example.com')`),
    ).rejects.toThrow(/ADMIN_REQUIRED/);
    expect(await t.asOwner(`select 1 from public.user_invitations where email = 'friend@example.com'`)).toHaveLength(0);
  });
});

describe("role escalation", () => {
  it("blocks a member from promoting themselves", async () => {
    await expect(t.asUser(member, `update public.profiles set role = 'admin' where id = $1`, [member])).rejects.toThrow(/ADMIN_REQUIRED/);
  });

  it("blocks a member from editing the administrator's profile", async () => {
    const rows = await t.asUser(member, `update public.profiles set full_name = 'x' where id = $1 returning id`, [admin]);
    expect(rows).toHaveLength(0);
  });

  it("lets a member edit their own name", async () => {
    const rows = await t.asUser(member, `update public.profiles set full_name = 'Андрій М.' where id = $1 returning full_name`, [member]);
    expect(rows).toEqual([{ full_name: "Андрій М." }]);
  });

  it("never allows removing the last administrator", async () => {
    await expect(t.asUser(admin, `update public.profiles set role = 'member' where id = $1`, [admin])).rejects.toThrow(/LAST_ADMIN/);
    await expect(t.asUser(admin, `update public.profiles set is_active = false where id = $1`, [admin])).rejects.toThrow(/LAST_ADMIN/);
  });

  it("keeps application settings admin-only", async () => {
    const rows = await t.asUser(member, `update public.app_settings set max_users = 5 returning max_users`);
    expect(rows).toHaveLength(0);
    expect(await t.asOwner(`select max_users from public.app_settings`)).toEqual([{ max_users: 2 }]);
  });
});

describe("anonymous visitors", () => {
  it.each(["clients", "cases", "documents", "notes", "payments", "profiles", "activity_logs", "user_invitations"])(
    "cannot read %s",
    async (table) => {
      await expect(t.asAnon(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
    },
  );

  it("cannot call the search function", async () => {
    await expect(t.asAnon(`select * from public.search_global('тов')`)).rejects.toThrow(/permission denied/);
  });
});

describe("shared records", () => {
  it("lets a member create a client with a generated number and stamped authorship", async () => {
    const [row] = await t.asUser(
      member,
      `insert into public.clients (client_type, name, client_number, created_by)
       values ('legal_entity', 'ТОВ «Тест»', 'FORGED', $1) returning id, client_number, created_by, row_version`,
      [admin],
    );
    clientId = row.id as string;
    expect(row.client_number).toBe("К-0001");
    expect(row.created_by).toBe(member); // the forged author is overwritten
    expect(row.row_version).toBe(1);
  });

  it("lets the other user see and edit the same record", async () => {
    const rows = await t.asUser(admin, `update public.clients set phone = '+380000000000' where id = $1 returning row_version, updated_by`, [clientId]);
    expect(rows).toEqual([{ row_version: 2, updated_by: admin }]);
  });

  it("detects a concurrent edit through row_version", async () => {
    // The member still holds version 1 of the form; their save must not overwrite the admin's change.
    const stale = await t.asUser(member, `update public.clients set phone = 'x' where id = $1 and row_version = 1 returning id`, [clientId]);
    expect(stale).toHaveLength(0);
    const fresh = await t.asUser(member, `update public.clients set email = 'a@b.co' where id = $1 and row_version = 2 returning row_version`, [clientId]);
    expect(fresh).toEqual([{ row_version: 3 }]);
  });

  it("validates identifiers", async () => {
    await expect(
      t.asUser(admin, `insert into public.clients (client_type, name, edrpou) values ('legal_entity', 'X', '123')`),
    ).rejects.toThrow(/check constraint/);
  });

  it("links a matter to a client, numbers it per year and allows several parties", async () => {
    const [row] = await t.asUser(
      admin,
      `insert into public.cases (title, client_id, status_id, opened_on) values ('Тестова справа', $1, ${statusId}, '2026-03-01') returning id, case_number`,
      [clientId],
    );
    caseId = row.id as string;
    expect(row.case_number).toBe("2026/0001");
    await t.asUser(
      member,
      `insert into public.case_parties (case_id, role_id, name)
       select $1, id, 'Сторона ' || name from public.party_roles where name in ('Позивач', 'Відповідач', 'Третя особа')`,
      [caseId],
    );
    expect(await t.asUser(admin, `select count(*)::int as n from public.case_parties where case_id = $1`, [caseId])).toEqual([{ n: 3 }]);
    const [next] = await t.asUser(admin, `insert into public.cases (title, client_id, status_id, opened_on) values ('Друга', $1, ${statusId}, '2027-01-10') returning case_number`, [clientId]);
    expect(next.case_number).toBe("2027/0001");
  });

  it("does not require a court number for non-litigation matters", async () => {
    const [row] = await t.asUser(admin, `select court_case_number, is_litigation from public.cases where id = $1`, [caseId]);
    expect(row).toEqual({ court_case_number: null, is_litigation: false });
  });

  it("offers no hard delete for clients or matters", async () => {
    expect(await t.asUser(admin, `delete from public.clients where id = $1 returning id`, [clientId])).toHaveLength(0);
    expect(await t.asUser(admin, `delete from public.cases where id = $1 returning id`, [caseId])).toHaveLength(0);
  });

  it("assigns tasks between users and records completion", async () => {
    const [task] = await t.asUser(admin, `insert into public.tasks (title, assigned_to, case_id) values ('Підготувати позов', $1, $2) returning id`, [member, caseId]);
    const [done] = await t.asUser(member, `update public.tasks set status = 'completed' where id = $1 returning completed_at is not null as completed`, [task.id]);
    expect(done.completed).toBe(true);
  });

  it("requires a source for a deadline and records who verified it", async () => {
    await expect(
      t.asUser(admin, `insert into public.events (title, event_type, starts_at) values ('Строк', 'deadline', now())`),
    ).rejects.toThrow(/check constraint/);
    const [event] = await t.asUser(
      member,
      `insert into public.events (title, event_type, starts_at, deadline_source, is_verified, verified_by)
       values ('Строк', 'deadline', now(), 'Ухвала суду', true, $1) returning verified_by`,
      [admin],
    );
    expect(event.verified_by).toBe(member); // set by the database, not by the client
  });
});

describe("notes", () => {
  let noteId: string;

  it("stamps the author and requires exactly one link", async () => {
    const [note] = await t.asUser(admin, `insert into public.notes (title, content, case_id, author_id) values ('Позиція', 'Конфіденційний текст', $1, $2) returning id, author_id`, [caseId, member]);
    noteId = note.id as string;
    expect(note.author_id).toBe(admin);
    await expect(
      t.asUser(admin, `insert into public.notes (title, content, case_id, client_id) values ('x', 'y', $1, $2)`, [caseId, clientId]),
    ).rejects.toThrow(/check constraint/);
  });

  it("lets the other user read but not edit someone else's note", async () => {
    expect(await t.asUser(member, `select title from public.notes where id = $1`, [noteId])).toHaveLength(1);
    expect(await t.asUser(member, `update public.notes set content = 'змінено' where id = $1 returning id`, [noteId])).toHaveLength(0);
  });
});

describe("finance permissions", () => {
  it("lets a member read but not write with the default 'read' setting", async () => {
    await t.asUser(admin, `insert into public.fee_agreements (client_id, case_id, amount_uah) values ($1, $2, 50000)`, [clientId, caseId]);
    await t.asUser(admin, `insert into public.payments (client_id, case_id, amount_uah) values ($1, $2, 20000)`, [clientId, caseId]);
    expect(await t.asUser(member, `select amount_uah from public.payments`)).toHaveLength(1);
    await expect(
      t.asUser(member, `insert into public.payments (client_id, amount_uah) values ($1, 1)`, [clientId]),
    ).rejects.toThrow(/row-level security/);
  });

  it("hides finance from a member when set to 'none', including in the audit trail", async () => {
    await t.asUser(admin, `update public.app_settings set member_finance_access = 'none'`);
    expect(await t.asUser(member, `select 1 from public.payments`)).toHaveLength(0);
    expect(await t.asUser(member, `select 1 from public.fee_agreements`)).toHaveLength(0);
    expect(await t.asUser(member, `select 1 from public.activity_logs where entity_type = 'payments'`)).toHaveLength(0);
  });

  it("lets a member write when set to 'write'", async () => {
    await t.asUser(admin, `update public.app_settings set member_finance_access = 'write'`);
    const rows = await t.asUser(member, `insert into public.payments (client_id, amount_uah) values ($1, 1500.50) returning amount_uah`, [clientId]);
    expect(Number(rows[0].amount_uah)).toBe(1500.5);
    await t.asUser(admin, `update public.app_settings set member_finance_access = 'read'`);
  });

  it("rejects zero or negative amounts", async () => {
    await expect(
      t.asUser(admin, `insert into public.payments (client_id, amount_uah) values ($1, 0)`, [clientId]),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("documents and storage", () => {
  let documentId: string;

  it("numbers versions and tracks the current one", async () => {
    const [doc] = await t.asUser(member, `insert into public.documents (name, case_id) values ('Позовна заява', $1) returning id`, [caseId]);
    documentId = doc.id as string;
    const insertVersion = `insert into public.document_versions (document_id, storage_path, original_filename, mime_type, size_bytes, version_no)
                           values ($1, $2, 'f.pdf', 'application/pdf', 1000, 99) returning id, version_no, uploaded_by`;
    const [v1] = await t.asUser(member, insertVersion, [documentId, `${documentId}/v1`]);
    const [v2] = await t.asUser(admin, insertVersion, [documentId, `${documentId}/v2`]);
    expect([v1.version_no, v2.version_no]).toEqual([1, 2]);
    expect(v2.uploaded_by).toBe(admin);
    expect(await t.asUser(member, `select current_version_id from public.documents where id = $1`, [documentId])).toEqual([{ current_version_id: v2.id }]);
  });

  it("requires a document to belong to a client or a matter", async () => {
    await expect(t.asUser(admin, `insert into public.documents (name) values ('Нічий')`)).rejects.toThrow(/check constraint/);
  });

  it("reserves permanent deletion for the administrator", async () => {
    expect(await t.asUser(member, `delete from public.documents where id = $1 returning id`, [documentId])).toHaveLength(0);
    expect(await t.asUser(admin, `delete from public.documents where id = $1 returning id`, [documentId])).toHaveLength(1);
  });

  it("keeps the bucket private and limited to the allowed file types", async () => {
    const [bucket] = await t.asOwner(`select public, file_size_limit::int as size, array_length(allowed_mime_types, 1) as types from storage.buckets where id = 'documents'`);
    expect(bucket).toEqual({ public: false, size: 25 * 1024 * 1024, types: 5 });
  });

  it("allows file access only to signed-in active users", async () => {
    await t.asUser(member, `insert into storage.objects (bucket_id, name) values ('documents', 'a/b')`);
    expect(await t.asUser(admin, `select name from storage.objects`)).toHaveLength(1);
    expect(await t.asAnon(`select name from storage.objects`)).toHaveLength(0);
    await expect(t.asAnon(`insert into storage.objects (bucket_id, name) values ('documents', 'x')`)).rejects.toThrow(/row-level security/);
    expect(await t.asUser(member, `delete from storage.objects returning id`)).toHaveLength(0);
    expect(await t.asUser(admin, `delete from storage.objects returning id`)).toHaveLength(1);
  });
});

describe("audit trail", () => {
  it("records important actions with the acting user", async () => {
    const rows = await t.asUser(admin, `select action, actor_id from public.activity_logs where entity_type = 'clients' and entity_id = $1 order by occurred_at, action`, [clientId]);
    expect(rows.map((r) => r.action)).toEqual(expect.arrayContaining(["created", "updated"]));
    expect(rows.find((r) => r.action === "created")?.actor_id).toBe(member);
  });

  it("logs archive and restore as such", async () => {
    await t.asUser(admin, `update public.cases set archived_at = now() where id = $1`, [caseId]);
    await t.asUser(admin, `update public.cases set archived_at = null where id = $1`, [caseId]);
    const rows = await t.asUser(admin, `select action from public.activity_logs where entity_type = 'cases' and entity_id = $1`, [caseId]);
    expect(rows.map((r) => r.action)).toEqual(expect.arrayContaining(["archived", "restored"]));
  });

  it("never copies confidential text into the log", async () => {
    await t.asUser(admin, `update public.notes set content = 'ДУЖЕ СЕКРЕТНО' where case_id = $1`, [caseId]);
    const [{ dump }] = await t.asOwner<{ dump: string }>(`select string_agg(metadata::text, ' ') as dump from public.activity_logs`);
    expect(dump).not.toContain("СЕКРЕТНО");
    expect(dump).not.toContain("Конфіденційний текст");
    expect(dump).not.toContain("+380000000000");
    expect(dump).toContain(`"content": {"changed": true}`);
  });

  it("records old and new values for status-like fields", async () => {
    const [row] = await t.asUser(admin, `select metadata from public.activity_logs where entity_type = 'tasks' and action = 'updated' limit 1`);
    expect((row.metadata as { changes: { status: unknown } }).changes.status).toEqual({ old: "new", new: "completed" });
  });

  it("cannot be written, changed or erased through the API", async () => {
    await expect(t.asUser(admin, `insert into public.activity_logs (action, entity_type) values ('fake', 'clients')`)).rejects.toThrow(/permission denied/);
    await expect(t.asUser(admin, `update public.activity_logs set action = 'x'`)).rejects.toThrow(/permission denied/);
    await expect(t.asUser(admin, `delete from public.activity_logs`)).rejects.toThrow(/permission denied/);
  });

  it("hides user-administration entries from a member", async () => {
    expect(await t.asUser(member, `select 1 from public.activity_logs where entity_type in ('app_settings', 'user_invitations')`)).toHaveLength(0);
    expect((await t.asUser(admin, `select 1 from public.activity_logs where entity_type in ('app_settings', 'user_invitations')`)).length).toBeGreaterThan(0);
  });
});

describe("search", () => {
  it("finds clients, matters and tasks by part of a Ukrainian name", async () => {
    const rows = await t.asUser(member, `select kind, label from public.search_global('тест')`);
    expect(rows).toEqual(expect.arrayContaining([
      { kind: "client", label: "ТОВ «Тест»" },
      { kind: "case", label: "Тестова справа" },
    ]));
    expect(await t.asUser(member, `select kind from public.search_global('позов')`)).toEqual([{ kind: "task" }]);
  });

  it("treats wildcard characters literally and ignores one-letter queries", async () => {
    expect(await t.asUser(member, `select 1 from public.search_global('%%')`)).toHaveLength(0);
    expect(await t.asUser(member, `select 1 from public.search_global('т')`)).toHaveLength(0);
  });
});

describe("deactivated account", () => {
  it("loses all access immediately, and reference lists stay admin-managed", async () => {
    await expect(t.asUser(member, `insert into public.practice_areas (name) values ('Нова галузь')`)).rejects.toThrow(/row-level security/);
    await t.asUser(admin, `update public.profiles set is_active = false where id = $1`, [member]);
    expect(await t.asUser(member, `select 1 from public.clients`)).toHaveLength(0);
    expect(await t.asUser(member, `select 1 from public.profiles`)).toHaveLength(0);
    expect(await t.asUser(member, `select 1 from public.search_global('тест')`)).toHaveLength(0);
    await expect(t.asUser(member, `insert into public.clients (client_type, name) values ('individual', 'X')`)).rejects.toThrow(/row-level security/);
  });

  it("frees the seat so the administrator can invite a replacement", async () => {
    await t.asOwner(`delete from public.user_invitations where accepted_at is null`);
    await t.asUser(admin, `insert into public.user_invitations (email) values ('new@example.com')`);
    const replacement = await t.createAuthUser("new@example.com");
    expect(await t.asUser(replacement, `select count(*)::int as n from public.clients`)).toEqual([{ n: 1 }]);
    // …and the old account cannot be reactivated past the limit.
    await expect(t.asUser(admin, `update public.profiles set is_active = true where id = $1`, [member])).rejects.toThrow(/USER_LIMIT_REACHED/);
  });
});
