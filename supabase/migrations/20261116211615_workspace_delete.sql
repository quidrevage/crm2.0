-- LegalDesk UA — deleting a workspace.
-- Rows removed together with their workspace are not written to a history that is being removed too.

create or replace function private.log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_row jsonb;
  v_action text;
  v_changes jsonb := '{}'::jsonb;
  v_key text;
  v_id text;
  v_label text;
  v_client uuid;
  v_case uuid;
  v_document uuid;
  v_workspace uuid;
  v_loggable constant text[] := array[
    'status', 'status_id', 'priority', 'assigned_to', 'responsible_id', 'due_date', 'starts_at', 'ends_at',
    'event_type', 'is_verified', 'amount_uah', 'paid_on', 'agreed_on', 'incurred_on', 'category_id',
    'client_id', 'case_id', 'court_id', 'opened_on', 'closed_on', 'next_important_date', 'archived_at',
    'role', 'is_active', 'max_users', 'member_finance_access', 'max_upload_mb', 'version_no', 'client_type'
  ];
  v_ignored constant text[] := array['updated_at', 'updated_by', 'row_version', 'current_version_id', 'completed_at',
                                     'verified_by', 'verified_at', 'current_workspace_id'];
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
  v_client := case when tg_table_name = 'clients' then v_id::uuid else nullif(v_row ->> 'client_id', '')::uuid end;
  v_case := case when tg_table_name = 'cases' then v_id::uuid else nullif(v_row ->> 'case_id', '')::uuid end;
  v_workspace := case
    when tg_table_name = 'workspaces' then v_id::uuid
    else coalesce(nullif(v_row ->> 'workspace_id', '')::uuid, private.current_workspace_id())
  end;

  if tg_table_name in ('fee_agreements', 'payments', 'expenses') then
    v_label := replace(v_row ->> 'amount_uah', '.', ',') || ' ₴';
  elsif tg_table_name = 'document_versions' then
    v_document := nullif(v_row ->> 'document_id', '')::uuid;
    select d.name || ' (версія ' || (v_row ->> 'version_no') || ')', d.client_id, d.case_id
      into v_label, v_client, v_case
      from public.documents d where d.id = v_document;
  elsif tg_table_name = 'workspace_members' then
    select coalesce(nullif(p.full_name, ''), p.email) into v_label from public.profiles p where p.id = (v_row ->> 'user_id')::uuid;
  else
    v_label := coalesce(v_row ->> 'title', v_row ->> 'name', v_row ->> 'full_name', v_row ->> 'case_number', v_row ->> 'email');
  end if;

  -- The shared court directory has no workspace and is not logged; neither is a workspace being deleted.
  if v_workspace is null or (tg_op = 'DELETE' and not exists (select 1 from public.workspaces where id = v_workspace)) then
    return null;
  end if;

  insert into public.activity_logs (workspace_id, actor_id, action, entity_type, entity_id, client_id, case_id, metadata)
  values (
    v_workspace,
    auth.uid(),
    v_action,
    tg_table_name,
    case when v_id ~ '^[0-9a-f-]{36}$' then v_id::uuid end,
    v_client,
    v_case,
    jsonb_strip_nulls(jsonb_build_object(
      'label', v_label,
      'document_id', v_document,
      'changes', nullif(v_changes, '{}'::jsonb)
    ))
  );
  return null;
end $$;
