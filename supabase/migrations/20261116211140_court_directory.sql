-- LegalDesk UA — official court directory.
-- Courts without a workspace come from the official list of the State Judicial Administration
-- (court.gov.ua) and are shared, read-only, by every workspace. A workspace can still add its own.

alter table public.courts
  add column code text,
  add column working_hours text;

-- One row per official court code.
create unique index courts_official_code_key on public.courts (code) where workspace_id is null;
create index courts_region_idx on public.courts (region);

insert into public.court_types (name, sort_order)
values ('Вищий спеціалізований суд', 75)
on conflict (name) do nothing;
