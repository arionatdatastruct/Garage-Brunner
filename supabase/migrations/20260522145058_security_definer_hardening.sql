-- Move has_role into a private schema (invisible to PostgREST), keep policies working,
-- and revoke RPC access to trigger functions. Triggers continue to fire normally.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke all on function private.has_role(uuid, public.app_role) from public, anon, authenticated;
grant execute on function private.has_role(uuid, public.app_role) to postgres, service_role;

-- Recreate the user_roles admin policy to use the relocated helper.
drop policy if exists "Admins manage roles" on public.user_roles;
create policy "Admins manage roles" on public.user_roles
  for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop the public copy so it is no longer reachable via /rest/v1/rpc/has_role.
drop function if exists public.has_role(uuid, public.app_role);

-- These are trigger functions only; revoking EXECUTE blocks RPC access but
-- triggers continue to fire (Postgres skips the EXECUTE check for trigger
-- invocations).
revoke execute on function public.fahrzeug_auto_link_kunde()           from public, anon, authenticated;
revoke execute on function public.fahrzeug_backfill_rapporte_kunde()   from public, anon, authenticated;
revoke execute on function public.kunde_backfill_fahrzeuge()           from public, anon, authenticated;
revoke execute on function public.rapport_auto_link_kunde()            from public, anon, authenticated;
