-- LegalDesk UA — core schema.
-- Tables, constraints, numbering and bookkeeping triggers. Access rules live in the next migration.

create schema if not exists private;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerations (fixed: application workflow depends on them)
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'member');
create type public.finance_access as enum ('none', 'read', 'write');
create type public.client_type as enum ('individual', 'legal_entity');
create type public.client_status as enum ('potential', 'active', 'inactive', 'archived');
create type public.task_status as enum ('new', 'in_progress', 'waiting', 'completed', 'cancelled');
create type public.task_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.event_type as enum ('hearing', 'client_meeting', 'call', 'internal', 'deadline', 'other');
create type public.fee_type as enum ('fixed', 'hourly', 'other');

-- ---------------------------------------------------------------------------
-- Users and settings
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'member',
  is_active boolean not null default true,
  is_advocate boolean not null default false,
  advocate_certificate_no text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exactly one row; the boolean primary key makes a second row impossible.
create table public.app_settings (
  id boolean primary key default true check (id),
  practice_name text not null default '',
  max_users integer not null default 2 check (max_users between 1 and 10),
  member_finance_access public.finance_access not null default 'read',
  max_upload_mb integer not null default 25 check (max_upload_mb between 1 and 50),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
insert into public.app_settings (id) values (true);

-- An account can only be created for an e-mail the administrator has invited.
create table public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email)) and email like '%_@_%'),
  full_name text not null default '',
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Configurable reference lists
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['practice_areas', 'matter_types', 'case_statuses', 'party_roles', 'document_categories', 'court_types']
  loop
    execute format(
      'create table public.%I (
         id uuid primary key default gen_random_uuid(),
         name text not null unique check (length(btrim(name)) > 0),
         sort_order integer not null default 0,
         is_active boolean not null default true,
         created_at timestamptz not null default now(),
         updated_at timestamptz not null default now()
       )', t);
  end loop;
end $$;

alter table public.case_statuses
  add column is_closed boolean not null default false,
  add column tone text not null default 'neutral' check (tone in ('neutral', 'accent', 'success', 'warning', 'danger'));

-- ---------------------------------------------------------------------------
-- Business tables (shared bookkeeping columns are added in one place below)
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_number text not null unique,
  client_type public.client_type not null,
  status public.client_status not null default 'active',
  name text not null check (length(btrim(name)) > 0),
  rnokpp text check (rnokpp ~ '^\d{10}$'),
  edrpou text check (edrpou ~ '^\d{8}$'),
  representative text,
  phone text,
  email text,
  address text,
  assigned_to uuid references public.profiles (id),
  notes text
);

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) > 0),
  position text,
  phone text,
  email text,
  comment text,
  is_primary boolean not null default false
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  court_type_id uuid references public.court_types (id),
  region text,
  city text,
  address text,
  phone text,
  email text,
  website text,
  notes text
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  title text not null check (length(btrim(title)) > 0),
  is_litigation boolean not null default false,
  court_case_number text,
  practice_area_id uuid references public.practice_areas (id),
  matter_type_id uuid references public.matter_types (id),
  status_id uuid not null references public.case_statuses (id),
  description text,
  client_id uuid not null references public.clients (id) on delete restrict,
  responsible_id uuid references public.profiles (id),
  opposing_party text,
  court_id uuid references public.courts (id),
  judge text,
  opened_on date not null default current_date,
  next_important_date date,
  closed_on date,
  notes text,
  check (closed_on is null or closed_on >= opened_on)
);

create table public.case_parties (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  role_id uuid not null references public.party_roles (id),
  name text not null check (length(btrim(name)) > 0),
  is_our_client boolean not null default false,
  client_id uuid references public.clients (id),
  identifier text,
  contact text,
  notes text
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  category_id uuid references public.document_categories (id),
  client_id uuid references public.clients (id) on delete restrict,
  case_id uuid references public.cases (id) on delete restrict,
  description text,
  current_version_id uuid,
  check (client_id is not null or case_id is not null)
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version_no integer not null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text,
  uploaded_by uuid references public.profiles (id),
  uploaded_at timestamptz not null default now(),
  unique (document_id, version_no)
);

alter table public.documents
  add constraint documents_current_version_fk
  foreign key (current_version_id) references public.document_versions (id) on delete set null;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  description text,
  assigned_to uuid references public.profiles (id),
  due_date date,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'new',
  client_id uuid references public.clients (id) on delete restrict,
  case_id uuid references public.cases (id) on delete restrict,
  completed_at timestamptz
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  event_type public.event_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  case_id uuid references public.cases (id) on delete restrict,
  client_id uuid references public.clients (id) on delete restrict,
  responsible_id uuid references public.profiles (id),
  description text,
  -- Deadlines are entered by a lawyer; the system never calculates them.
  deadline_source text,
  is_verified boolean not null default false,
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  check (ends_at is null or ends_at > starts_at),
  check (event_type <> 'deadline' or length(btrim(coalesce(deadline_source, ''))) > 0)
);

create table public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  remind_at timestamptz not null,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.fee_agreements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  case_id uuid references public.cases (id) on delete restrict,
  agreed_on date not null default current_date,
  contract_number text,
  fee_type public.fee_type not null default 'fixed',
  amount_uah numeric(14, 2) not null check (amount_uah > 0),
  description text
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  case_id uuid references public.cases (id) on delete restrict,
  fee_agreement_id uuid references public.fee_agreements (id) on delete set null,
  paid_on date not null default current_date,
  amount_uah numeric(14, 2) not null check (amount_uah > 0),
  method text,
  description text
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete restrict,
  case_id uuid references public.cases (id) on delete restrict,
  incurred_on date not null default current_date,
  amount_uah numeric(14, 2) not null check (amount_uah > 0),
  description text,
  reimbursable boolean not null default false,
  check (client_id is not null or case_id is not null)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  content text not null,
  author_id uuid references public.profiles (id),
  client_id uuid references public.clients (id) on delete restrict,
  case_id uuid references public.cases (id) on delete restrict,
  task_id uuid references public.tasks (id) on delete cascade,
  check (num_nonnulls(client_id, case_id, task_id) = 1)
);

-- Append-only audit trail; rows are written by triggers only.
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  client_id uuid,
  case_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Bookkeeping columns and triggers
-- ---------------------------------------------------------------------------

-- Sets created_*/updated_* from the signed-in user and bumps row_version on every update.
-- Clients cannot forge these values: whatever they send is overwritten here.
create function private.touch_row() returns trigger
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

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['clients', 'client_contacts', 'courts', 'cases', 'case_parties', 'documents', 'tasks',
                           'events', 'fee_agreements', 'payments', 'expenses', 'notes']
  loop
    execute format(
      'alter table public.%I
         add column created_at timestamptz not null default now(),
         add column updated_at timestamptz not null default now(),
         add column created_by uuid references public.profiles (id),
         add column updated_by uuid references public.profiles (id),
         add column row_version integer not null default 1,
         add column archived_at timestamptz', t);
    execute format(
      'create trigger touch_row before insert or update on public.%I
         for each row execute function private.touch_row()', t);
  end loop;

  foreach t in array array['profiles', 'app_settings', 'practice_areas', 'matter_types', 'case_statuses',
                           'party_roles', 'document_categories', 'court_types']
  loop
    execute format(
      'create trigger touch_updated_at before update on public.%I
         for each row execute function private.touch_updated_at()', t);
  end loop;
end $$;

-- Internal numbers: clients "К-0001", matters "2026/0001" (sequence restarts each year).
create sequence private.client_number_seq;
create table private.case_counters (year integer primary key, last_value integer not null);

create function private.assign_client_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.client_number := 'К-' || lpad(nextval('private.client_number_seq')::text, 4, '0');
  return new;
end $$;

create function private.assign_case_number() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_year integer := extract(year from new.opened_on)::integer;
  v_next integer;
begin
  insert into private.case_counters as c (year, last_value) values (v_year, 1)
  on conflict (year) do update set last_value = c.last_value + 1
  returning last_value into v_next;
  new.case_number := v_year || '/' || lpad(v_next::text, 4, '0');
  return new;
end $$;

create function private.keep_number() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'clients' then new.client_number := old.client_number; end if;
  if tg_table_name = 'cases' then new.case_number := old.case_number; end if;
  return new;
end $$;

create trigger assign_number before insert on public.clients for each row execute function private.assign_client_number();
create trigger assign_number before insert on public.cases for each row execute function private.assign_case_number();
create trigger keep_number before update on public.clients for each row execute function private.keep_number();
create trigger keep_number before update on public.cases for each row execute function private.keep_number();

-- Notes: the author is always the signed-in user and never changes.
create function private.set_note_author() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id);
  else
    new.author_id := old.author_id;
  end if;
  return new;
end $$;
create trigger set_author before insert or update on public.notes for each row execute function private.set_note_author();

-- Tasks: completion time follows the status.
create function private.set_task_completed() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'completed' then
    if tg_op = 'INSERT' or old.status is distinct from 'completed' then new.completed_at := now(); end if;
  else
    new.completed_at := null;
  end if;
  return new;
end $$;
create trigger set_completed before insert or update on public.tasks for each row execute function private.set_task_completed();

-- Deadlines: who confirmed the date and when is recorded by the database, not the client.
create function private.set_event_verified() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.is_verified then
    if tg_op = 'INSERT' or not old.is_verified then
      new.verified_by := auth.uid();
      new.verified_at := now();
    else
      new.verified_by := old.verified_by;
      new.verified_at := old.verified_at;
    end if;
  else
    new.verified_by := null;
    new.verified_at := null;
  end if;
  return new;
end $$;
create trigger set_verified before insert or update on public.events for each row execute function private.set_event_verified();

-- Document versions: numbered by the database; the newest becomes the current one.
create function private.before_document_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.documents where id = new.document_id for update;
  select coalesce(max(version_no), 0) + 1 into new.version_no
    from public.document_versions where document_id = new.document_id;
  new.uploaded_by := coalesce(auth.uid(), new.uploaded_by);
  new.uploaded_at := now();
  return new;
end $$;

create function private.after_document_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.documents set current_version_id = new.id where id = new.document_id;
  return null;
end $$;

create trigger before_version before insert on public.document_versions for each row execute function private.before_document_version();
create trigger after_version after insert on public.document_versions for each row execute function private.after_document_version();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index on public.clients (status) where archived_at is null;
create index on public.clients (assigned_to);
create index on public.client_contacts (client_id);
create index on public.cases (client_id);
create index on public.cases (status_id) where archived_at is null;
create index on public.cases (responsible_id);
create index on public.cases (court_id);
create index on public.cases (practice_area_id);
create index on public.case_parties (case_id);
create index on public.documents (client_id);
create index on public.documents (case_id);
create index on public.documents (category_id);
create index on public.document_versions (document_id);
create index on public.tasks (assigned_to, status, due_date);
create index on public.tasks (case_id);
create index on public.tasks (client_id);
create index on public.events (starts_at);
create index on public.events (case_id);
create index on public.events (client_id);
create index on public.event_reminders (user_id, remind_at) where dismissed_at is null;
create index on public.fee_agreements (client_id);
create index on public.fee_agreements (case_id);
create index on public.payments (client_id);
create index on public.payments (case_id);
create index on public.expenses (case_id);
create index on public.notes (client_id);
create index on public.notes (case_id);
create index on public.notes (task_id);
create index on public.activity_logs (occurred_at desc);
create index on public.activity_logs (client_id, occurred_at desc);
create index on public.activity_logs (case_id, occurred_at desc);

-- Trigram indexes back the substring search (Ukrainian has no built-in full-text dictionary).
create index clients_name_trgm on public.clients using gin (name extensions.gin_trgm_ops);
create index cases_title_trgm on public.cases using gin (title extensions.gin_trgm_ops);
create index cases_court_number_trgm on public.cases using gin (court_case_number extensions.gin_trgm_ops);
create index documents_name_trgm on public.documents using gin (name extensions.gin_trgm_ops);
create index tasks_title_trgm on public.tasks using gin (title extensions.gin_trgm_ops);
create index courts_name_trgm on public.courts using gin (name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Reference data (the administrator can extend or deactivate these later)
-- ---------------------------------------------------------------------------
insert into public.practice_areas (name, sort_order)
select name, ord * 10 from unnest(array[
  'Цивільне право', 'Господарське право', 'Адміністративне право', 'Кримінальне право', 'Трудове право',
  'Сімейне право', 'Спадкове право', 'Нерухомість', 'Корпоративне право', 'Договірне право', 'Податкове право',
  'Земельне право', 'Інше'
]) with ordinality as t (name, ord);

insert into public.matter_types (name, sort_order)
select name, ord * 10 from unnest(array[
  'Судова справа', 'Консультація', 'Підготовка договору', 'Корпоративний супровід', 'Супровід угоди',
  'Спадкова справа', 'Адміністративне оскарження', 'Захист у кримінальному провадженні', 'Інше'
]) with ordinality as t (name, ord);

insert into public.case_statuses (name, sort_order, is_closed, tone) values
  ('Нова', 10, false, 'accent'),
  ('В роботі', 20, false, 'success'),
  ('Очікує клієнта', 30, false, 'warning'),
  ('Очікує суду', 40, false, 'warning'),
  ('Зупинена', 50, false, 'neutral'),
  ('Завершена', 60, true, 'neutral'),
  ('В архіві', 70, true, 'neutral');

insert into public.party_roles (name, sort_order)
select name, ord * 10 from unnest(array[
  'Позивач', 'Відповідач', 'Третя особа', 'Заявник', 'Представник', 'Захисник', 'Прокурор', 'Інша сторона'
]) with ordinality as t (name, ord);

insert into public.document_categories (name, sort_order)
select name, ord * 10 from unnest(array[
  'Договір', 'Позовна заява', 'Відзив', 'Відповідь на відзив', 'Заперечення', 'Клопотання', 'Заява', 'Скарга',
  'Апеляційна скарга', 'Касаційна скарга', 'Судове рішення', 'Довіреність', 'Адвокатський запит',
  'Відповідь на адвокатський запит', 'Докази', 'Листування', 'Інше'
]) with ordinality as t (name, ord);

insert into public.court_types (name, sort_order)
select name, ord * 10 from unnest(array[
  'Місцевий загальний суд', 'Місцевий господарський суд', 'Окружний адміністративний суд', 'Апеляційний суд',
  'Апеляційний господарський суд', 'Апеляційний адміністративний суд', 'Верховний Суд', 'Інше'
]) with ordinality as t (name, ord);
