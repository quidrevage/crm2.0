-- LegalDesk UA — invitations: role, expiry, re-invites and seats.
--
-- Accounts are still created only for invited e-mails (no public sign-up, no bypass). This adds:
--   * the role is taken from the invitation (an administrator can invite another administrator);
--   * invitations expire (14 days by default); an expired one is refused at sign-up and can be renewed;
--   * an e-mail can be invited again after an earlier invitation was accepted or expired;
--   * pending invitations hold a seat, so the limit cannot be exceeded by inviting several people at once;
--   * the practice's first workspace is limited to two people, as the practice was designed.
-- Everything runs inside the Auth insert transaction: any failure rolls back the whole account.

alter table public.user_invitations
  add column role public.user_role not null default 'member',
  add column expires_at timestamptz not null default now() + interval '14 days';

-- Only one *pending* invitation per e-mail and workspace; accepted ones stay as history.
alter table public.user_invitations drop constraint user_invitations_workspace_id_email_key;
create unique index user_invitations_pending_key on public.user_invitations (workspace_id, email) where accepted_at is null;

-- ---------------------------------------------------------------------------
-- Creating an invitation (CRM, or the SQL editor for the database owner)
-- ---------------------------------------------------------------------------
create or replace function private.check_invitation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  new.email := lower(btrim(new.email));
  new.full_name := btrim(coalesce(new.full_name, ''));
  new.invited_by := coalesce(auth.uid(), new.invited_by);
  new.accepted_at := null;
  new.created_at := now();
  new.expires_at := least(greatest(coalesce(new.expires_at, now() + interval '14 days'), now() + interval '1 hour'), now() + interval '30 days');

  -- Serialise invitations and seat counting per workspace.
  perform 1 from public.workspaces where id = new.workspace_id for update;

  if exists (
    select 1 from public.workspace_members m join public.profiles p on p.id = m.user_id
    where m.workspace_id = new.workspace_id and p.email = new.email and m.is_active
  ) then
    raise exception 'ALREADY_MEMBER' using errcode = 'P0001';
  end if;

  -- An expired invitation for the same address is replaced by the new one.
  delete from public.user_invitations
  where workspace_id = new.workspace_id and email = new.email and accepted_at is null and expires_at <= now();
  if exists (
    select 1 from public.user_invitations
    where workspace_id = new.workspace_id and email = new.email and accepted_at is null
  ) then
    raise exception 'ALREADY_INVITED' using errcode = 'P0001';
  end if;

  -- Active members plus invitations still waiting for an answer.
  if (select count(*) from public.workspace_members where workspace_id = new.workspace_id and is_active)
     + (select count(*) from public.user_invitations where workspace_id = new.workspace_id and accepted_at is null and expires_at > now())
     >= (select max_users from public.workspaces where id = new.workspace_id) then
    raise exception 'USER_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Accepting an invitation: valid, unexpired, a free seat, the invited role
-- ---------------------------------------------------------------------------
create or replace function private.accept_invitation(p_invitation uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.user_invitations;
  v_email text;
begin
  select * into v_invite from public.user_invitations
  where id = p_invitation and accepted_at is null and expires_at > now()
  for update;
  if not found then return false; end if;

  -- The invitation is personal: it is accepted only by the account with that e-mail.
  select email into v_email from public.profiles where id = p_user;
  if v_email is distinct from v_invite.email then return false; end if;

  perform 1 from public.workspaces where id = v_invite.workspace_id for update;

  if exists (select 1 from public.workspace_members where workspace_id = v_invite.workspace_id and user_id = p_user) then
    if exists (select 1 from public.workspace_members where workspace_id = v_invite.workspace_id and user_id = p_user and not is_active)
       and (select count(*) from public.workspace_members where workspace_id = v_invite.workspace_id and is_active)
           >= (select max_users from public.workspaces where id = v_invite.workspace_id) then
      return false;
    end if;
    update public.workspace_members set is_active = true, role = v_invite.role
    where workspace_id = v_invite.workspace_id and user_id = p_user;
  else
    if (select count(*) from public.workspace_members where workspace_id = v_invite.workspace_id and is_active)
       >= (select max_users from public.workspaces where id = v_invite.workspace_id) then
      return false;
    end if;
    insert into public.workspace_members (workspace_id, user_id, role) values (v_invite.workspace_id, p_user, v_invite.role);
  end if;
  update public.user_invitations set accepted_at = now() where id = v_invite.id;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- New account (runs inside the Auth insert; raising cancels the account)
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_invite public.user_invitations;
  v_first uuid;
  v_name text;
begin
  perform pg_advisory_xact_lock(727001);

  -- The very first account of the system: its administrator, with a workspace of its own (runs once).
  if not exists (select 1 from public.profiles) then
    insert into public.profiles (id, email, full_name) values (new.id, v_email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
    insert into public.workspaces (name, max_users, created_by, updated_by) values ('Моя практика', 2, new.id, new.id) returning id into v_first;
    insert into public.workspace_members (workspace_id, user_id, role) values (v_first, new.id, 'admin');
    perform private.seed_workspace(v_first);
    update public.profiles set current_workspace_id = v_first where id = new.id;
    return new;
  end if;

  -- Everyone else needs a valid invitation, created beforehand in the CRM.
  if not exists (select 1 from public.user_invitations where email = v_email and accepted_at is null and expires_at > now()) then
    if exists (select 1 from public.user_invitations where email = v_email and accepted_at is null) then
      raise exception 'INVITATION_EXPIRED' using errcode = 'P0001';
    end if;
    raise exception 'INVITATION_REQUIRED' using errcode = 'P0001';
  end if;

  select full_name into v_name from public.user_invitations
  where email = v_email and accepted_at is null and expires_at > now() and full_name <> ''
  order by created_at limit 1;

  insert into public.profiles (id, email, full_name)
  values (new.id, v_email, coalesce(nullif(v_name, ''), new.raw_user_meta_data ->> 'full_name', ''));

  for v_invite in
    select * from public.user_invitations
    where email = v_email and accepted_at is null and expires_at > now()
    order by created_at
  loop
    if private.accept_invitation(v_invite.id, new.id) then
      v_first := coalesce(v_first, v_invite.workspace_id);
    end if;
  end loop;

  -- Not a single invitation could be honoured (no free seat): no account at all.
  if v_first is null then
    raise exception 'USER_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  update public.profiles set current_workspace_id = v_first where id = new.id;
  return new;
end $$;

-- An existing account joins at once; the e-mail check lives in accept_invitation.
create or replace function private.join_existing_account() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  select id into v_user from public.profiles where email = new.email;
  if v_user is not null and not private.accept_invitation(new.id, v_user) then
    raise exception 'USER_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  return null;
end $$;

-- The practice's workspace holds two people. Pending, unanswered invitations count as seats too.
update public.workspaces w set max_users = 2
where w.name = 'Моя практика'
  and w.max_users > 2
  and (select count(*) from public.workspace_members m where m.workspace_id = w.id and m.is_active) <= 2;

revoke all on all functions in schema private from anon, public, authenticated;
grant execute on function private.current_workspace_id(), private.is_active_user(), private.is_admin(),
  private.can_read_finance(), private.can_write_finance(), private.my_workspace_ids(), private.shares_workspace(uuid),
  private.file_workspace(text)
  to authenticated, service_role;
