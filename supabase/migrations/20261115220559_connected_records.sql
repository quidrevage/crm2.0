-- LegalDesk UA — links between records, document uploads, realtime.

-- ---------------------------------------------------------------------------
-- A record linked to a matter always belongs to that matter's client.
-- Picking a matter is enough; the client is filled in (and kept in sync) by the database,
-- so the record also shows up on the client's page.
-- ---------------------------------------------------------------------------
create function private.client_from_case() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_client uuid;
begin
  if new.case_id is not null then
    select client_id into v_client from public.cases where id = new.case_id;
    if v_client is not null then
      new.client_id := v_client;
    end if;
  end if;
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'events', 'documents', 'fee_agreements', 'payments', 'expenses']
  loop
    execute format(
      'create trigger client_from_case before insert or update of case_id, client_id on public.%I
         for each row execute function private.client_from_case()', t);
  end loop;
end $$;

-- When a matter moves to another client, its linked records follow.
create function private.cascade_case_client() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.client_id is distinct from old.client_id then
    update public.tasks set client_id = new.client_id where case_id = new.id;
    update public.events set client_id = new.client_id where case_id = new.id;
    update public.documents set client_id = new.client_id where case_id = new.id;
    update public.fee_agreements set client_id = new.client_id where case_id = new.id;
    update public.payments set client_id = new.client_id where case_id = new.id;
    update public.expenses set client_id = new.client_id where case_id = new.id;
  end if;
  return null;
end $$;

create trigger cascade_case_client after update of client_id on public.cases
  for each row execute function private.cascade_case_client();

-- ---------------------------------------------------------------------------
-- Document upload: the browser stores the file under "<document id>/<random id>",
-- then this function records the document (if new) and its version in one transaction.
-- Runs with the caller's rights, so row-level security applies.
-- ---------------------------------------------------------------------------
create function public.add_document_version(
  p_document_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sha256 text,
  p_name text default null,
  p_category_id uuid default null,
  p_client_id uuid default null,
  p_case_id uuid default null,
  p_description text default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_version_id uuid;
begin
  if p_storage_path !~ ('^' || p_document_id::text || '/[0-9a-f-]{36}$') then
    raise exception 'INVALID_STORAGE_PATH' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.documents where id = p_document_id) then
    insert into public.documents (id, name, category_id, client_id, case_id, description)
    values (p_document_id, p_name, p_category_id, p_client_id, p_case_id, p_description);
  end if;

  insert into public.document_versions (document_id, version_no, storage_path, original_filename, mime_type, size_bytes, sha256)
  values (p_document_id, 0, p_storage_path, p_original_filename, p_mime_type, p_size_bytes, p_sha256)
  returning id into v_version_id;

  return v_version_id;
end $$;

revoke all on function public.add_document_version(uuid, text, text, text, bigint, text, text, uuid, uuid, uuid, text) from anon, public;
grant execute on function public.add_document_version(uuid, text, text, text, bigint, text, text, uuid, uuid, uuid, text)
  to authenticated, service_role;

-- A file that failed the server-side check (wrong real type, upload interrupted) may be
-- removed by the person who uploaded it, as long as no document version refers to it.
create policy documents_bucket_delete_unreferenced on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (select private.is_active_user())
    and owner_id = (select auth.uid())::text
    and not exists (select 1 from public.document_versions v where v.storage_path = storage.objects.name)
  );

-- ---------------------------------------------------------------------------
-- Realtime: both users see each other's changes without reloading.
-- Row-level security also applies to these change notifications.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.clients, public.client_contacts, public.cases, public.case_parties, public.courts,
      public.documents, public.document_versions, public.tasks, public.events, public.event_reminders,
      public.fee_agreements, public.payments, public.expenses, public.notes, public.activity_logs,
      public.profiles, public.app_settings;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes for foreign keys used in joins and filters
-- ---------------------------------------------------------------------------
create index on public.activity_logs (actor_id);
create index on public.case_parties (role_id);
create index on public.case_parties (client_id);
create index on public.cases (matter_type_id);
create index on public.courts (court_type_id);
create index on public.event_reminders (event_id);
create index on public.events (responsible_id);
create index on public.expenses (client_id);
create index on public.notes (author_id);
create index on public.payments (fee_agreement_id);
create index on public.documents (current_version_id);
