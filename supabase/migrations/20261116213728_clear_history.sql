-- LegalDesk UA — clearing the action history.
-- The history stays read-only through the API; an administrator may clear the current
-- workspace's history (entirely or entries older than a date) through this function only.
-- The clearing itself is recorded, so it never happens silently.

create function public.clear_activity_history(p_before timestamptz default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_workspace uuid := private.current_workspace_id();
  v_count integer;
begin
  if v_workspace is null or not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  delete from public.activity_logs
  where workspace_id = v_workspace and occurred_at < coalesce(p_before, now());
  get diagnostics v_count = row_count;

  insert into public.activity_logs (workspace_id, actor_id, action, entity_type, metadata)
  values (v_workspace, auth.uid(), 'cleared', 'activity_logs',
          jsonb_strip_nulls(jsonb_build_object('label', v_count || ' записів', 'before', p_before)));
  return v_count;
end $$;

revoke all on function public.clear_activity_history(timestamptz) from anon, public;
grant execute on function public.clear_activity_history(timestamptz) to authenticated, service_role;
