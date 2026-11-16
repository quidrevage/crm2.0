-- LegalDesk UA — open registration.
--
-- Anyone can sign up. A new account either joins the workspaces that invited it, or — when there is
-- no valid invitation (or no free seat in any of them) — gets a workspace of its own, as administrator,
-- with the default reference lists. Each workspace stays fully isolated by the existing policies.
-- The seat limit per workspace still applies to members added by invitation.

create or replace function private.create_own_workspace(p_user uuid, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.workspaces (name, created_by, updated_by)
  values (left(coalesce(nullif(btrim(p_name), ''), 'Моя практика'), 120), p_user, p_user)
  returning id into v_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (v_id, p_user, 'admin');
  perform private.seed_workspace(v_id);
  return v_id;
end $$;

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_invite public.user_invitations;
  v_first uuid;
  v_name text;
begin
  perform pg_advisory_xact_lock(727001);

  select full_name into v_name from public.user_invitations
  where email = v_email and accepted_at is null and expires_at > now() and full_name <> ''
  order by created_at limit 1;

  insert into public.profiles (id, email, full_name)
  values (new.id, v_email, left(coalesce(nullif(v_name, ''), btrim(new.raw_user_meta_data ->> 'full_name'), ''), 120));

  -- Invited: join every workspace that invited this e-mail and still has a free seat.
  for v_invite in
    select * from public.user_invitations
    where email = v_email and accepted_at is null and expires_at > now()
    order by created_at
  loop
    if private.accept_invitation(v_invite.id, new.id) then
      v_first := coalesce(v_first, v_invite.workspace_id);
    end if;
  end loop;

  -- Not invited (or no seat anywhere): a workspace of one's own.
  if v_first is null then
    v_first := private.create_own_workspace(new.id, new.raw_user_meta_data ->> 'workspace_name');
  end if;

  update public.profiles set current_workspace_id = v_first where id = new.id;
  return new;
end $$;

-- Room for a team: the practice's workspace goes back to the default of 10 seats.
update public.workspaces set max_users = 10 where name = 'Моя практика' and max_users = 2;

revoke all on all functions in schema private from anon, public, authenticated;
grant execute on function private.current_workspace_id(), private.is_active_user(), private.is_admin(),
  private.can_read_finance(), private.can_write_finance(), private.my_workspace_ids(), private.shares_workspace(uuid),
  private.file_workspace(text)
  to authenticated, service_role;
