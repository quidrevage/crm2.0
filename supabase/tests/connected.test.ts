import { beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type TestDatabase } from "./harness";

let t: TestDatabase;
let admin: string;
let member: string;
let clientA: string;
let clientB: string;
let caseId: string;

const statusId = `(select id from public.case_statuses where name = 'Нова')`;

beforeAll(async () => {
  t = await createDatabase();
  admin = await t.createAuthUser("admin@example.com");
  await t.asUser(admin, `insert into public.user_invitations (email) values ('member@example.com')`);
  member = await t.createAuthUser("member@example.com");
  [{ id: clientA }] = (await t.asUser(admin, `insert into public.clients (client_type, name) values ('individual', 'Клієнт А') returning id`)) as { id: string }[];
  [{ id: clientB }] = (await t.asUser(admin, `insert into public.clients (client_type, name) values ('individual', 'Клієнт Б') returning id`)) as { id: string }[];
  [{ id: caseId }] = (await t.asUser(admin, `insert into public.cases (title, client_id, status_id) values ('Справа', $1, ${statusId}) returning id`, [clientA])) as { id: string }[];
}, 120_000);

describe("records linked to a matter", () => {
  it("take the matter's client automatically", async () => {
    const [task] = await t.asUser(member, `insert into public.tasks (title, case_id) values ('Завдання', $1) returning client_id`, [caseId]);
    expect(task.client_id).toBe(clientA);
    // A mismatching client is corrected to the matter's client.
    const [payment] = await t.asUser(admin, `insert into public.payments (client_id, case_id, amount_uah) values ($1, $2, 100) returning client_id`, [clientB, caseId]);
    expect(payment.client_id).toBe(clientA);
  });

  it("follow the matter when it moves to another client", async () => {
    await t.asUser(admin, `insert into public.events (title, event_type, starts_at, case_id) values ('Засідання', 'hearing', now(), $1)`, [caseId]);
    await t.asUser(admin, `update public.cases set client_id = $1 where id = $2`, [clientB, caseId]);
    const rows = await t.asUser(admin, `
      select 'task' k, client_id from public.tasks where case_id = $1
      union all select 'event', client_id from public.events where case_id = $1
      union all select 'payment', client_id from public.payments where case_id = $1`, [caseId]);
    expect(rows.every((r) => r.client_id === clientB)).toBe(true);
    expect(rows).toHaveLength(3);
  });
});

describe("document upload", () => {
  const docId = "11111111-1111-4111-8111-111111111111";
  const path1 = `${docId}/22222222-2222-4222-8222-222222222222`;
  const path2 = `${docId}/33333333-3333-4333-8333-333333333333`;
  const call = `select public.add_document_version($1, $2, 'f.pdf', 'application/pdf', 1024, 'abc', 'Позов', null, null, $3, null) as id`;

  it("creates the document and its first version in one step", async () => {
    await t.asUser(member, `insert into storage.objects (bucket_id, name) values ('documents', $1)`, [path1]);
    const [row] = await t.asUser(member, call, [docId, path1, caseId]);
    const [doc] = await t.asUser(member, `select name, client_id, current_version_id from public.documents where id = $1`, [docId]);
    expect(doc).toEqual({ name: "Позов", client_id: clientB, current_version_id: row.id });
  });

  it("adds a new version to an existing document", async () => {
    const [row] = await t.asUser(admin, call, [docId, path2, caseId]);
    const versions = await t.asUser(admin, `select version_no from public.document_versions where document_id = $1 order by version_no`, [docId]);
    expect(versions.map((v) => v.version_no)).toEqual([1, 2]);
    expect(await t.asUser(admin, `select current_version_id from public.documents where id = $1`, [docId])).toEqual([{ current_version_id: row.id }]);
  });

  it("rejects a storage path outside the document's folder", async () => {
    await expect(t.asUser(member, call, [docId, "other/44444444-4444-4444-8444-444444444444", caseId])).rejects.toThrow(/INVALID_STORAGE_PATH/);
  });

  it("is refused to anonymous visitors", async () => {
    await expect(t.asAnon(call, [docId, path1, caseId])).rejects.toThrow(/permission denied/);
  });

  it("lets the uploader remove a rejected file, but never a stored version", async () => {
    const stray = `${docId}/55555555-5555-4555-8555-555555555555`;
    await t.asUser(member, `insert into storage.objects (bucket_id, name) values ('documents', $1)`, [stray]);
    expect(await t.asUser(admin, `delete from storage.objects where name = $1 and owner_id <> $2 returning id`, [stray, admin])).toHaveLength(1);
    await t.asUser(member, `insert into storage.objects (bucket_id, name) values ('documents', $1)`, [stray]);
    expect(await t.asUser(member, `delete from storage.objects where name = $1 returning id`, [stray])).toHaveLength(1);
    expect(await t.asUser(member, `delete from storage.objects where name = $1 returning id`, [path1])).toHaveLength(0);
  });
});

describe("history labels", () => {
  it("labels finance entries by amount and links file versions to the document's client", async () => {
    const [pay] = await t.asUser(admin, `select metadata->>'label' as label from public.activity_logs where entity_type = 'payments' and action = 'created' limit 1`);
    expect(pay.label).toBe("100,00 ₴");
    const [version] = await t.asUser(admin, `select metadata->>'label' as label, metadata->>'document_id' as doc, client_id from public.activity_logs where entity_type = 'document_versions' order by occurred_at desc limit 1`);
    expect(version.label).toMatch(/^Позов \(версія \d\)$/);
    expect(version.doc).toBe("11111111-1111-4111-8111-111111111111");
    expect(version.client_id).toBe(clientB);
  });
});
