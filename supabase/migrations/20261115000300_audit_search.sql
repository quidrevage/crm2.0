-- LegalDesk UA — audit trail and global search.

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------
-- One generic trigger writes every create / update / archive / restore / delete.
-- Values are recorded only for a short list of non-confidential fields; for anything else
-- (names, addresses, note text, descriptions…) the log keeps just the fact that it changed.
create function private.log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_row jsonb;
  v_action text;
  v_changes jsonb := '{}'::jsonb;
  v_key text;
  v_id text;
  v_loggable constant text[] := array[
    'status', 'status_id', 'priority', 'assigned_to', 'responsible_id', 'due_date', 'starts_at', 'ends_at',
    'event_type', 'is_verified', 'amount_uah', 'paid_on', 'agreed_on', 'incurred_on', 'category_id',
    'client_id', 'case_id', 'court_id', 'opened_on', 'closed_on', 'next_important_date', 'archived_at',
    'role', 'is_active', 'max_users', 'member_finance_access', 'max_upload_mb', 'version_no', 'client_type'
  ];
  v_ignored constant text[] := array['updated_at', 'updated_by', 'row_version', 'current_version_id', 'completed_at',
                                     'verified_by', 'verified_at'];
begin
  if tg_op = 'INSERT' then
    v_row := to_jsonb(new);
    v_action := 'created';
  elsif tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_action := 'deleted';
  else
    v_new := to_jsonb(new);
    v_old := to_jsonb(old);
    v_row := v_new;
    for v_key in select key from jsonb_object_keys(v_new) as k (key)
    loop
      if v_key = any (v_ignored) or (v_new -> v_key) is not distinct from (v_old -> v_key) then
        continue;
      end if;
      if v_key = any (v_loggable) then
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key));
      else
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('changed', true));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return null;
    end if;
    v_action := case
      when (v_old ->> 'archived_at') is null and (v_new ->> 'archived_at') is not null then 'archived'
      when (v_old ->> 'archived_at') is not null and (v_new ->> 'archived_at') is null then 'restored'
      else 'updated'
    end;
  end if;

  v_id := v_row ->> 'id';

  insert into public.activity_logs (actor_id, action, entity_type, entity_id, client_id, case_id, metadata)
  values (
    auth.uid(),
    v_action,
    tg_table_name,
    case when v_id ~ '^[0-9a-f-]{36}$' then v_id::uuid end,
    case when tg_table_name = 'clients' then v_id::uuid else nullif(v_row ->> 'client_id', '')::uuid end,
    case when tg_table_name = 'cases' then v_id::uuid else nullif(v_row ->> 'case_id', '')::uuid end,
    jsonb_strip_nulls(jsonb_build_object(
      -- A short label so the history is readable; note text and file paths are never copied.
      'label', coalesce(v_row ->> 'title', v_row ->> 'name', v_row ->> 'full_name', v_row ->> 'case_number', v_row ->> 'email'),
      'changes', nullif(v_changes, '{}'::jsonb)
    ))
  );
  return null;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['clients', 'client_contacts', 'courts', 'cases', 'case_parties', 'documents',
                           'document_versions', 'tasks', 'events', 'fee_agreements', 'payments', 'expenses',
                           'notes', 'profiles', 'app_settings', 'user_invitations']
  loop
    execute format(
      'create trigger log_change after insert or update or delete on public.%I
         for each row execute function private.log_change()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Global search
-- ---------------------------------------------------------------------------
-- Runs with the caller's rights, so row-level security applies to every branch.
-- Searches record names and numbers only — not the contents of uploaded files.
create function public.search_global(q text, max_per_kind integer default 6)
returns table (kind text, id uuid, label text, sublabel text)
language sql stable security invoker set search_path = '' as $$
  with term as (
    select '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
    where length(btrim(q)) >= 2
  )
  (select 'client', c.id, c.name, c.client_number
     from public.clients c, term
    where c.name ilike term.pattern or c.client_number ilike term.pattern
       or c.edrpou ilike term.pattern or c.rnokpp ilike term.pattern or c.phone ilike term.pattern
    order by c.archived_at nulls first, c.name
    limit greatest(1, least(max_per_kind, 20)))
  union all
  (select 'case', k.id, k.title, concat_ws(' · ', k.case_number, '№ ' || k.court_case_number)
     from public.cases k, term
    where k.title ilike term.pattern or k.case_number ilike term.pattern
       or k.court_case_number ilike term.pattern or k.opposing_party ilike term.pattern
    order by k.archived_at nulls first, k.updated_at desc
    limit greatest(1, least(max_per_kind, 20)))
  union all
  (select 'document', d.id, d.name, null
     from public.documents d, term
    where d.name ilike term.pattern
    order by d.archived_at nulls first, d.updated_at desc
    limit greatest(1, least(max_per_kind, 20)))
  union all
  (select 'task', t.id, t.title, null
     from public.tasks t, term
    where t.title ilike term.pattern
    order by t.archived_at nulls first, t.due_date nulls last
    limit greatest(1, least(max_per_kind, 20)))
  union all
  (select 'court', ct.id, ct.name, ct.city
     from public.courts ct, term
    where ct.name ilike term.pattern or ct.city ilike term.pattern
    order by ct.name
    limit greatest(1, least(max_per_kind, 20)));
$$;

revoke all on function public.search_global(text, integer) from anon, public;
grant execute on function public.search_global(text, integer) to authenticated, service_role;
