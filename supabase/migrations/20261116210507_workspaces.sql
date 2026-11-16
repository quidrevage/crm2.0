-- LegalDesk UA — workspaces (separate groups of people with separate data).
--
-- Every practice, team or firm works in its own workspace: its own clients, matters, documents,
-- finance, reference lists, members and settings. One person can belong to several workspaces and
-- switch between them; the database only ever shows the rows of the workspace currently selected
-- (profiles.current_workspace_id), and only while the person is an active member of it.
--
-- The existing data moves into a first workspace created from app_settings, which is then dropped.
-- Court types and the official court directory (courts without a workspace) are shared by everyone.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  max_users integer not null default 10 check (max_users between 1 and 500),
  member_finance_access public.finance_access not null default 'read',
  max_upload_mb integer not null default 25 check (max_upload_mb between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);

create table public.workspace_members (
  id uuid not null default gen_random_uuid() unique,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on public.workspace_members (user_id);

alter table public.profiles add column current_workspace_id uuid references public.workspaces (id) on delete set null;
create index on public.profiles (current_workspace_id);

-- ---------------------------------------------------------------------------
-- Move the existing practice into the first workspace
-- ---------------------------------------------------------------------------
create temporary table _first_workspace as
select gen_random_uuid() as id;

insert into public.workspaces (id, name, max_users, member_finance_access, max_upload_mb)
select w.id, coalesce(nullif(btrim(s.practice_name), ''), 'Моя практика'), greatest(s.max_users, 10), s.member_finance_access, s.max_upload_mb
from _first_workspace w cross join public.app_settings s
where exists (select 1 from public.profiles);

insert into public.workspace_members (workspace_id, user_id, role, is_active)
select w.id, p.id, p.role, p.is_active
from public.profiles p cross join _first_workspace w
where exists (select 1 from public.workspaces where id = w.id);

update public.profiles set current_workspace_id = (select id from _first_workspace)
where exists (select 1 from public.workspaces where id = (select id from _first_workspace));

-- ---------------------------------------------------------------------------
-- The signed-in user's workspace and permissions
-- ---------------------------------------------------------------------------
create function private.current_workspace_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.current_workspace_id
  from public.profiles p
  join public.workspace_members m on m.workspace_id = p.current_workspace_id and m.user_id = p.id and m.is_active
  where p.id = auth.uid();
$$;

create or replace function private.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.current_workspace_id() is not null;
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.user_id = auth.uid() and m.workspace_id = private.current_workspace_id() and m.is_active and m.role = 'admin'
  );
$$;

create or replace function private.can_read_finance() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m join public.workspaces w on w.id = m.workspace_id
    where m.user_id = auth.uid() and m.workspace_id = private.current_workspace_id() and m.is_active
      and (m.role = 'admin' or w.member_finance_access in ('read', 'write'))
  );
$$;

create or replace function private.can_write_finance() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m join public.workspaces w on w.id = m.workspace_id
    where m.user_id = auth.uid() and m.workspace_id = private.current_workspace_id() and m.is_active
      and (m.role = 'admin' or w.member_finance_access = 'write')
  );
$$;

-- Workspaces the signed-in person is an active member of (for the workspace switcher).
create function private.my_workspace_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select workspace_id from public.workspace_members where user_id = auth.uid() and is_active;
$$;

-- People are visible to each other only when they share a workspace.
create function private.shares_workspace(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user = auth.uid() or exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on b.workspace_id = a.workspace_id
    where a.user_id = auth.uid() and a.is_active and b.user_id = p_user
  );
$$;

grant execute on function private.current_workspace_id(), private.my_workspace_ids(), private.shares_workspace(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- workspace_id on every workspace-owned table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  -- Null on a fresh database: there is nothing to move, and the default lists are seeded per workspace.
  v_ws uuid := (select w.id from _first_workspace w join public.workspaces x on x.id = w.id);
begin
  foreach t in array array[
    'clients', 'client_contacts', 'courts', 'cases', 'case_parties', 'documents', 'document_versions', 'tasks',
    'events', 'event_reminders', 'fee_agreements', 'payments', 'expenses', 'notes', 'activity_logs',
    'user_invitations', 'practice_areas', 'matter_types', 'case_statuses', 'party_roles', 'document_categories']
  loop
    execute format('alter table public.%I add column workspace_id uuid references public.workspaces (id) on delete cascade', t);
    if v_ws is null then
      execute format('delete from public.%I', t);
    else
      execute format('update public.%I set workspace_id = $1', t) using v_ws;
    end if;
    execute format('alter table public.%I alter column workspace_id set default private.current_workspace_id()', t);
    if t not in ('courts', 'activity_logs') then
      execute format('alter table public.%I alter column workspace_id set not null', t);
    end if;
    if t not in ('activity_logs', 'user_invitations') then
      execute format('alter table public.%I add constraint %I unique (workspace_id, id)', t, t || '_workspace_id_id_key');
    end if;
  end loop;
end $$;

-- Numbers and names are unique inside a workspace, not across the whole system.
alter table public.clients drop constraint clients_client_number_key, add unique (workspace_id, client_number);
alter table public.cases drop constraint cases_case_number_key, add unique (workspace_id, case_number);
alter table public.user_invitations drop constraint user_invitations_email_key, add unique (workspace_id, email);
do $$
declare
  t text;
begin
  foreach t in array array['practice_areas', 'matter_types', 'case_statuses', 'party_roles', 'document_categories']
  loop
    execute format('alter table public.%I drop constraint %I, add unique (workspace_id, name)', t, t || '_name_key');
  end loop;
end $$;

-- A record can only point at records of its own workspace: every foreign key between two
-- workspace tables is rebuilt to include workspace_id. (Courts are excluded because the
-- shared directory has no workspace; profiles are people, not workspace data.)
do $$
declare
  r record;
  v_action text;
begin
  for r in
    select c.conname, c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent,
           a.attname as col, c.confdeltype
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and array_length(c.conkey, 1) = 1
      and c.connamespace = 'public'::regnamespace
      and (select relname from pg_class where oid = c.confrelid) in (
        'clients', 'client_contacts', 'cases', 'case_parties', 'documents', 'document_versions', 'tasks', 'events',
        'fee_agreements', 'payments', 'expenses', 'notes', 'practice_areas', 'matter_types', 'case_statuses',
        'party_roles', 'document_categories')
      and a.attname <> 'workspace_id'
  loop
    v_action := case r.confdeltype
      when 'c' then 'on delete cascade'
      when 'n' then format('on delete set null (%I)', r.col)
      else 'on delete restrict'
    end;
    execute format('alter table %s drop constraint %I', r.child, r.conname);
    execute format('alter table %s add constraint %I foreign key (workspace_id, %I) references %s (workspace_id, id) %s',
                   r.child, r.conname, r.col, r.parent, v_action);
  end loop;
end $$;

-- A matter may use a court from the shared directory or from its own workspace.
create function private.check_court_workspace() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.court_id is not null and not exists (
    select 1 from public.courts c where c.id = new.court_id and (c.workspace_id is null or c.workspace_id = new.workspace_id)
  ) then
    raise exception 'INVALID_COURT' using errcode = '23503';
  end if;
  return new;
end $$;
create trigger check_court before insert or update of court_id on public.cases
  for each row execute function private.check_court_workspace();

-- ---------------------------------------------------------------------------
-- Numbering per workspace: every workspace starts at К-0001 and YYYY/0001
-- ---------------------------------------------------------------------------
create table private.workspace_counters (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind text not null,
  year integer not null default 0,
  last_value integer not null,
  primary key (workspace_id, kind, year)
);

insert into private.workspace_counters (workspace_id, kind, year, last_value)
select w.id, 'client', 0, greatest((select coalesce(max(nullif(regexp_replace(client_number, '\D', '', 'g'), '')::integer), 0) from public.clients),
                                  coalesce((select last_value from private.client_number_seq where is_called), 0))
from _first_workspace w where exists (select 1 from public.workspaces where id = w.id);

insert into private.workspace_counters (workspace_id, kind, year, last_value)
select w.id, 'case', c.year, c.last_value
from private.case_counters c cross join _first_workspace w where exists (select 1 from public.workspaces where id = w.id);

create function private.next_number(p_workspace uuid, p_kind text, p_year integer) returns integer
language sql security definer set search_path = '' as $$
  insert into private.workspace_counters as c (workspace_id, kind, year, last_value) values (p_workspace, p_kind, p_year, 1)
  on conflict (workspace_id, kind, year) do update set last_value = c.last_value + 1
  returning last_value;
$$;

create or replace function private.assign_client_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.client_number := 'К-' || lpad(private.next_number(new.workspace_id, 'client', 0)::text, 4, '0');
  return new;
end $$;

create or replace function private.assign_case_number() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_year integer := extract(year from new.opened_on)::integer;
begin
  new.case_number := v_year || '/' || lpad(private.next_number(new.workspace_id, 'case', v_year)::text, 4, '0');
  return new;
end $$;

drop table private.case_counters;
drop sequence private.client_number_seq;

-- A row never moves to another workspace.
create or replace function private.touch_row() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.row_version := 1;
    if v_uid is not null then
      new.created_by := v_uid;
      new.updated_by := v_uid;
    end if;
  else
    new.workspace_id := old.workspace_id;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.row_version := old.row_version + 1;
    if v_uid is not null then
      new.updated_by := v_uid;
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Default reference lists for a new workspace
-- ---------------------------------------------------------------------------
create function private.seed_workspace(p_workspace uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.practice_areas (workspace_id, name, sort_order)
  select p_workspace, name, ord * 10 from unnest(array[
    'Цивільне право', 'Господарське право', 'Адміністративне право', 'Кримінальне право', 'Трудове право',
    'Сімейне право', 'Спадкове право', 'Нерухомість', 'Корпоративне право', 'Договірне право', 'Податкове право',
    'Земельне право', 'Інше'
  ]) with ordinality as t (name, ord);

  insert into public.matter_types (workspace_id, name, sort_order)
  select p_workspace, name, ord * 10 from unnest(array[
    'Судова справа', 'Консультація', 'Підготовка договору', 'Корпоративний супровід', 'Супровід угоди',
    'Спадкова справа', 'Адміністративне оскарження', 'Захист у кримінальному провадженні', 'Інше'
  ]) with ordinality as t (name, ord);

  insert into public.case_statuses (workspace_id, name, sort_order, is_closed, tone) values
    (p_workspace, 'Нова', 10, false, 'accent'),
    (p_workspace, 'В роботі', 20, false, 'success'),
    (p_workspace, 'Очікує клієнта', 30, false, 'warning'),
    (p_workspace, 'Очікує суду', 40, false, 'warning'),
    (p_workspace, 'Зупинена', 50, false, 'neutral'),
    (p_workspace, 'Завершена', 60, true, 'neutral'),
    (p_workspace, 'В архіві', 70, true, 'neutral');

  insert into public.party_roles (workspace_id, name, sort_order)
  select p_workspace, name, ord * 10 from unnest(array[
    'Позивач', 'Відповідач', 'Третя особа', 'Заявник', 'Представник', 'Захисник', 'Прокурор', 'Інша сторона'
  ]) with ordinality as t (name, ord);

  insert into public.document_categories (workspace_id, name, sort_order)
  select p_workspace, name, ord * 10 from unnest(array[
    'Договір', 'Позовна заява', 'Відзив', 'Відповідь на відзив', 'Заперечення', 'Клопотання', 'Заява', 'Скарга',
    'Апеляційна скарга', 'Касаційна скарга', 'Судове рішення', 'Довіреність', 'Адвокатський запит',
    'Відповідь на адвокатський запит', 'Докази', 'Листування', 'Інше'
  ]) with ordinality as t (name, ord);
end $$;

-- Creates a workspace with the signed-in person as its administrator and switches to it.
create function public.create_workspace(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'NAME_REQUIRED' using errcode = '22023';
  end if;
  -- A light guard against runaway creation.
  if (select count(*) from public.workspace_members where user_id = v_uid and role = 'admin') >= 20 then
    raise exception 'WORKSPACE_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.workspaces (name, created_by, updated_by) values (btrim(p_name), v_uid, v_uid) returning id into v_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_id, v_uid, 'admin');
  perform private.seed_workspace(v_id);
  update public.profiles set current_workspace_id = v_id where id = v_uid;
  return v_id;
end $$;

revoke all on function public.create_workspace(text) from anon, public;
grant execute on function public.create_workspace(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Accounts, members and invitations
-- ---------------------------------------------------------------------------
alter table public.profiles drop column role, drop column is_active;

-- An account is created only for an invited e-mail (or for the very first person, who gets a
-- workspace of their own). The new person joins every workspace that invited them.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_invite public.user_invitations;
  v_first uuid;
  v_name text;
begin
  perform pg_advisory_xact_lock(727001);

  if not exists (select 1 from public.profiles) then
    insert into public.profiles (id, email, full_name) values (new.id, v_email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
    insert into public.workspaces (name, created_by, updated_by) values ('Моя практика', new.id, new.id) returning id into v_first;
    insert into public.workspace_members (workspace_id, user_id, role) values (v_first, new.id, 'admin');
    perform private.seed_workspace(v_first);
    update public.profiles set current_workspace_id = v_first where id = new.id;
    return new;
  end if;

  select full_name into v_name from public.user_invitations
  where email = v_email and accepted_at is null and full_name <> '' order by created_at limit 1;
  if not found and not exists (select 1 from public.user_invitations where email = v_email and accepted_at is null) then
    raise exception 'INVITATION_REQUIRED' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, email, full_name)
  values (new.id, v_email, coalesce(nullif(v_name, ''), new.raw_user_meta_data ->> 'full_name', ''));

  for v_invite in select * from public.user_invitations where email = v_email and accepted_at is null order by created_at
  loop
    perform private.accept_invitation(v_invite.id, new.id);
    v_first := coalesce(v_first, v_invite.workspace_id);
  end loop;
  if not exists (select 1 from public.workspace_members where user_id = new.id) then
    raise exception 'USER_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  update public.profiles set current_workspace_id = v_first where id = new.id;
  return new;
end $$;

-- Adds an invited person to the workspace if a seat is free.
create function private.accept_invitation(p_invitation uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.user_invitations;
begin
  select * into v_invite from public.user_invitations where id = p_invitation and accepted_at is null;
  if not found then return false; end if;
  if exists (select 1 from public.workspace_members where workspace_id = v_invite.workspace_id and user_id = p_user) then
    update public.workspace_members set is_active = true where workspace_id = v_invite.workspace_id and user_id = p_user;
  else
    if (select count(*) from public.workspace_members where workspace_id = v_invite.workspace_id and is_active)
       >= (select max_users from public.workspaces where id = v_invite.workspace_id) then
      return false;
    end if;
    insert into public.workspace_members (workspace_id, user_id, role) values (v_invite.workspace_id, p_user, 'member');
  end if;
  update public.user_invitations set accepted_at = now() where id = v_invite.id;
  return true;
end $$;

-- Invitations: administrator only, and only while a seat is free.
create or replace function private.check_invitation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  new.invited_by := coalesce(auth.uid(), new.invited_by);
  if exists (
    select 1 from public.workspace_members m join public.profiles p on p.id = m.user_id
    where m.workspace_id = new.workspace_id and p.email = new.email and m.is_active
  ) then
    raise exception 'ALREADY_MEMBER' using errcode = 'P0001';
  end if;
  if (select count(*) from public.workspace_members where workspace_id = new.workspace_id and is_active)
     >= (select max_users from public.workspaces where id = new.workspace_id) then
    raise exception 'USER_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Someone who already has an account joins right away; no e-mail is needed.
create function private.join_existing_account() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  select id into v_user from public.profiles where email = new.email;
  if v_user is not null then
    perform private.accept_invitation(new.id, v_user);
  end if;
  return null;
end $$;
create trigger join_existing_account after insert on public.user_invitations
  for each row execute function private.join_existing_account();

-- Profiles: a person edits only their own name and details; the e-mail follows the login.
-- The selected workspace must be one where the person is an active member.
create or replace function private.protect_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if auth.uid() is not null then
    new.email := old.email;
  end if;
  if new.current_workspace_id is distinct from old.current_workspace_id and new.current_workspace_id is not null
     and not exists (select 1 from public.workspace_members where workspace_id = new.current_workspace_id and user_id = new.id and is_active) then
    raise exception 'NOT_A_MEMBER' using errcode = '42501';
  end if;
  return new;
end $$;

-- Members: no one removes the last active administrator or reactivates past the seat limit.
create function private.protect_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.workspace_id := old.workspace_id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  if old.role = 'admin' and old.is_active and (new.role <> 'admin' or not new.is_active) then
    if not exists (select 1 from public.workspace_members where workspace_id = old.workspace_id and role = 'admin' and is_active and user_id <> old.user_id) then
      raise exception 'LAST_ADMIN' using errcode = 'P0001';
    end if;
  end if;
  if new.is_active and not old.is_active then
    if (select count(*) from public.workspace_members where workspace_id = old.workspace_id and is_active)
       >= (select max_users from public.workspaces where id = old.workspace_id) then
      raise exception 'USER_LIMIT_REACHED' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger protect_member before update on public.workspace_members
  for each row execute function private.protect_member();

create function private.protect_workspace() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.created_by := old.created_by;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if new.max_users < (select count(*) from public.workspace_members where workspace_id = old.id and is_active) then
    raise exception 'USER_LIMIT_BELOW_ACTIVE' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger protect_workspace before update on public.workspaces
  for each row execute function private.protect_workspace();

-- ---------------------------------------------------------------------------
-- Audit trail: each entry belongs to a workspace
-- ---------------------------------------------------------------------------
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

  -- The shared court directory has no workspace and is not logged.
  if v_workspace is null then
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

create trigger log_change after insert or update or delete on public.workspaces
  for each row execute function private.log_change();
create trigger log_change after insert or update or delete on public.workspace_members
  for each row execute function private.log_change();

create index on public.activity_logs (workspace_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- app_settings is replaced by the workspace's own settings
-- ---------------------------------------------------------------------------
drop table public.app_settings;

-- ---------------------------------------------------------------------------
-- Row-level security, rebuilt around the current workspace
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

grant select, insert, update, delete on public.workspaces, public.workspace_members to authenticated;
grant all on public.workspaces, public.workspace_members to service_role;
revoke insert, delete on public.workspaces from authenticated;
revoke insert, delete on public.workspace_members from authenticated;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

do $$
declare
  t text;
  ws constant text := 'workspace_id = (select private.current_workspace_id())';
begin
  foreach t in array array['clients', 'client_contacts', 'cases', 'case_parties', 'documents', 'document_versions',
                           'tasks', 'events', 'event_reminders']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (%s)', t || '_select', t, ws);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)', t || '_insert', t, ws);
  end loop;

  foreach t in array array['clients', 'client_contacts', 'cases', 'case_parties', 'documents', 'tasks', 'events', 'event_reminders']
  loop
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', t || '_update', t, ws, ws);
  end loop;

  foreach t in array array['client_contacts', 'case_parties', 'event_reminders']
  loop
    execute format('create policy %I on public.%I for delete to authenticated using (%s)', t || '_delete', t, ws);
  end loop;

  foreach t in array array['documents', 'document_versions']
  loop
    execute format('create policy %I on public.%I for delete to authenticated using (%s and (select private.is_admin()))', t || '_delete', t, ws);
  end loop;

  foreach t in array array['fee_agreements', 'payments', 'expenses']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (%s and (select private.can_read_finance()))', t || '_select', t, ws);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s and (select private.can_write_finance()))', t || '_insert', t, ws);
    execute format('create policy %I on public.%I for update to authenticated using (%s and (select private.can_write_finance())) with check (%s and (select private.can_write_finance()))', t || '_update', t, ws, ws);
  end loop;

  foreach t in array array['practice_areas', 'matter_types', 'case_statuses', 'party_roles', 'document_categories']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (%s)', t || '_select', t, ws);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s and (select private.is_admin()))', t || '_insert', t, ws);
    execute format('create policy %I on public.%I for update to authenticated using (%s and (select private.is_admin())) with check (%s and (select private.is_admin()))', t || '_update', t, ws, ws);
  end loop;
end $$;

-- Court types are a fixed, shared list.
create policy court_types_select on public.court_types for select to authenticated using (true);
revoke insert, update, delete on public.court_types from authenticated;

-- Courts: the official directory (no workspace) is read-only and visible to everyone signed in;
-- a workspace can add and edit its own entries.
create policy courts_select on public.courts for select to authenticated
  using (workspace_id is null and (select private.is_active_user()) or workspace_id = (select private.current_workspace_id()));
create policy courts_insert on public.courts for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()));
create policy courts_update on public.courts for update to authenticated
  using (workspace_id = (select private.current_workspace_id()))
  with check (workspace_id = (select private.current_workspace_id()));

create policy notes_select on public.notes for select to authenticated
  using (workspace_id = (select private.current_workspace_id()));
create policy notes_insert on public.notes for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()));
create policy notes_update on public.notes for update to authenticated
  using (workspace_id = (select private.current_workspace_id()) and ((select private.is_admin()) or author_id = (select auth.uid())))
  with check (workspace_id = (select private.current_workspace_id()));

create policy profiles_select on public.profiles for select to authenticated
  using ((select private.shares_workspace(id)));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy workspaces_select on public.workspaces for select to authenticated
  using (id in (select private.my_workspace_ids()));
create policy workspaces_update on public.workspaces for update to authenticated
  using (id = (select private.current_workspace_id()) and (select private.is_admin()))
  with check (id = (select private.current_workspace_id()) and (select private.is_admin()));

create policy workspace_members_select on public.workspace_members for select to authenticated
  using (workspace_id = (select private.current_workspace_id()) or user_id = (select auth.uid()));
create policy workspace_members_update on public.workspace_members for update to authenticated
  using (workspace_id = (select private.current_workspace_id()) and (select private.is_admin()))
  with check (workspace_id = (select private.current_workspace_id()) and (select private.is_admin()));

create policy user_invitations_select on public.user_invitations for select to authenticated
  using (workspace_id = (select private.current_workspace_id()) and (select private.is_admin()));
create policy user_invitations_insert on public.user_invitations for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and (select private.is_admin()));
create policy user_invitations_delete on public.user_invitations for delete to authenticated
  using (workspace_id = (select private.current_workspace_id()) and (select private.is_admin()) and accepted_at is null);

create policy activity_logs_select on public.activity_logs for select to authenticated
  using (
    workspace_id = (select private.current_workspace_id())
    and (
      (select private.is_admin())
      or actor_id = (select auth.uid())
      or entity_type in ('clients', 'client_contacts', 'courts', 'cases', 'case_parties', 'documents',
                         'document_versions', 'tasks', 'events', 'notes')
      or (entity_type in ('fee_agreements', 'payments', 'expenses') and (select private.can_read_finance()))
    )
  );

-- ---------------------------------------------------------------------------
-- Document files: readable only through a version of the current workspace
-- ---------------------------------------------------------------------------
-- Which workspace a stored file belongs to (null while it is not yet recorded as a version).
create function private.file_workspace(p_path text) returns uuid
language sql stable security definer set search_path = '' as $$
  select workspace_id from public.document_versions where storage_path = p_path;
$$;

drop policy documents_bucket_select on storage.objects;
drop policy documents_bucket_delete on storage.objects;

create policy documents_bucket_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents' and (select private.is_active_user())
    and (
      private.file_workspace(name) = (select private.current_workspace_id())
      or (private.file_workspace(name) is null and (owner_id = (select auth.uid())::text or (select private.is_admin())))
    )
  );

-- Permanent deletion by the administrator: files of the current workspace, or files that no
-- version refers to any more (the document row is deleted first).
create policy documents_bucket_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents' and (select private.is_admin())
    and coalesce(private.file_workspace(name), (select private.current_workspace_id())) = (select private.current_workspace_id())
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.workspaces, public.workspace_members;
  end if;
end $$;

-- Workspace-scoped lookups used by every page.
create index on public.clients (workspace_id, name);
create index on public.cases (workspace_id, case_number desc);
create index on public.tasks (workspace_id, status, due_date);
create index on public.events (workspace_id, starts_at);

-- ---------------------------------------------------------------------------
-- Privileges for the new objects
-- ---------------------------------------------------------------------------
drop table _first_workspace;

-- Moving rows into the first workspace is bookkeeping, not a change anyone made: keep it out of the history.
-- (On the live project this cleanup was run right after the migration.)
delete from public.activity_logs
where actor_id is null and (metadata -> 'changes' ? 'workspace_id' or metadata -> 'changes' ? 'current_workspace_id');

revoke all on public.workspaces, public.workspace_members from anon, public;
-- Internal functions are reachable only through policies, defaults and triggers.
revoke all on all functions in schema private from anon, public, authenticated;
grant execute on function private.current_workspace_id(), private.is_active_user(), private.is_admin(),
  private.can_read_finance(), private.can_write_finance(), private.my_workspace_ids(), private.shares_workspace(uuid),
  private.file_workspace(text)
  to authenticated, service_role;
