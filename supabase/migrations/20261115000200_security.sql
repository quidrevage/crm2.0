-- LegalDesk UA — access control.
-- Every table has row-level security. Nothing is granted to anonymous visitors.

-- ---------------------------------------------------------------------------
-- Helper predicates used by policies (security definer: they must read profiles/settings)
-- ---------------------------------------------------------------------------
create function private.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active);
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active and role = 'admin');
$$;

create function private.can_read_finance() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p cross join public.app_settings s
    where p.id = auth.uid() and p.is_active
      and (p.role = 'admin' or s.member_finance_access in ('read', 'write'))
  );
$$;

create function private.can_write_finance() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p cross join public.app_settings s
    where p.id = auth.uid() and p.is_active
      and (p.role = 'admin' or s.member_finance_access = 'write')
  );
$$;

-- ---------------------------------------------------------------------------
-- User limit and invitation gate
-- ---------------------------------------------------------------------------

-- Runs inside the sign-up/invite transaction: raising here cancels the account creation.
-- The very first account becomes the administrator; every later one needs an invitation
-- and a free seat, even if public sign-up were left enabled by mistake.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_total integer;
  v_active integer;
  v_max integer;
  v_invite public.user_invitations;
begin
  perform pg_advisory_xact_lock(727001);
  select count(*), count(*) filter (where is_active) into v_total, v_active from public.profiles;
  select max_users into v_max from public.app_settings;

  if v_total = 0 then
    insert into public.profiles (id, email, full_name, role)
    values (new.id, v_email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'admin');
    return new;
  end if;

  select * into v_invite from public.user_invitations where email = v_email and accepted_at is null;
  if not found then
    raise exception 'INVITATION_REQUIRED' using errcode = 'P0001';
  end if;
  if v_active >= v_max then
    raise exception 'USER_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, v_email, coalesce(nullif(v_invite.full_name, ''), new.raw_user_meta_data ->> 'full_name', ''), 'member');
  update public.user_invitations set accepted_at = now() where id = v_invite.id;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Role, activity and e-mail can be changed only by an administrator; nobody can remove
-- the last active administrator or reactivate an account past the seat limit.
create function private.protect_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_api_user boolean := auth.uid() is not null;
begin
  new.id := old.id;
  new.created_at := old.created_at;

  if v_api_user and not private.is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.email is distinct from old.email then
      raise exception 'ADMIN_REQUIRED' using errcode = '42501';
    end if;
  end if;

  if old.role = 'admin' and old.is_active and (new.role <> 'admin' or not new.is_active) then
    if not exists (select 1 from public.profiles where role = 'admin' and is_active and id <> old.id) then
      raise exception 'LAST_ADMIN' using errcode = 'P0001';
    end if;
  end if;

  if new.is_active and not old.is_active then
    if (select count(*) from public.profiles where is_active) >= (select max_users from public.app_settings) then
      raise exception 'USER_LIMIT_REACHED' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger protect_profile before update on public.profiles
  for each row execute function private.protect_profile();

-- Invitations cannot be issued when every seat is taken.
create function private.check_invitation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  new.invited_by := coalesce(auth.uid(), new.invited_by);
  if (select count(*) from public.profiles where is_active) >= (select max_users from public.app_settings) then
    raise exception 'USER_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger check_invitation before insert on public.user_invitations
  for each row execute function private.check_invitation();

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, public;
revoke all on all functions in schema private from anon, public;
revoke all on schema private from anon, public;

grant usage on schema private to authenticated, service_role;
grant execute on function private.is_active_user(), private.is_admin(), private.can_read_finance(), private.can_write_finance()
  to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
revoke insert, update, delete, truncate on public.activity_logs from authenticated;
revoke delete on public.profiles, public.app_settings from authenticated;
revoke insert on public.profiles, public.app_settings from authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Shared working records: both users read, create and edit. No hard delete.
  foreach t in array array['clients', 'client_contacts', 'courts', 'cases', 'case_parties', 'documents',
                           'document_versions', 'tasks', 'events', 'event_reminders']
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_active_user()))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_active_user()))', t || '_insert', t);
  end loop;

  foreach t in array array['clients', 'client_contacts', 'courts', 'cases', 'case_parties', 'documents',
                           'tasks', 'events', 'event_reminders']
  loop
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_active_user())) with check ((select private.is_active_user()))', t || '_update', t);
  end loop;

  -- Child rows that are edited as lists may be removed.
  foreach t in array array['client_contacts', 'case_parties', 'event_reminders']
  loop
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_active_user()))', t || '_delete', t);
  end loop;

  -- Permanent deletion of documents is an administrator action.
  foreach t in array array['documents', 'document_versions']
  loop
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))', t || '_delete', t);
  end loop;

  -- Finance follows app_settings.member_finance_access.
  foreach t in array array['fee_agreements', 'payments', 'expenses']
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.can_read_finance()))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.can_write_finance()))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.can_write_finance())) with check ((select private.can_write_finance()))', t || '_update', t);
  end loop;

  -- Reference lists: everyone reads, the administrator maintains.
  foreach t in array array['practice_areas', 'matter_types', 'case_statuses', 'party_roles', 'document_categories', 'court_types']
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.is_active_user()))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t || '_update', t);
  end loop;
end $$;

-- Notes: everyone reads; only the author or the administrator edits.
create policy notes_select on public.notes for select to authenticated
  using ((select private.is_active_user()));
create policy notes_insert on public.notes for insert to authenticated
  with check ((select private.is_active_user()));
create policy notes_update on public.notes for update to authenticated
  using ((select private.is_admin()) or ((select private.is_active_user()) and author_id = (select auth.uid())))
  with check ((select private.is_active_user()));

-- Profiles: both users see each other; a user edits only their own row (guarded by the trigger above).
create policy profiles_select on public.profiles for select to authenticated
  using ((select private.is_active_user()));
create policy profiles_update on public.profiles for update to authenticated
  using ((select private.is_admin()) or ((select private.is_active_user()) and id = (select auth.uid())))
  with check ((select private.is_active_user()));

create policy app_settings_select on public.app_settings for select to authenticated
  using ((select private.is_active_user()));
create policy app_settings_update on public.app_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy user_invitations_select on public.user_invitations for select to authenticated
  using ((select private.is_admin()));
create policy user_invitations_insert on public.user_invitations for insert to authenticated
  with check ((select private.is_admin()));
create policy user_invitations_delete on public.user_invitations for delete to authenticated
  using ((select private.is_admin()) and accepted_at is null);

-- Audit trail: read-only. The administrator sees everything; a member sees their own actions
-- and the history of working records (finance entries only if finance is visible to them).
create policy activity_logs_select on public.activity_logs for select to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.is_active_user())
      and (
        actor_id = (select auth.uid())
        or entity_type in ('clients', 'client_contacts', 'courts', 'cases', 'case_parties', 'documents',
                           'document_versions', 'tasks', 'events', 'notes')
        or (entity_type in ('fee_agreements', 'payments', 'expenses') and (select private.can_read_finance()))
      )
    )
  );
