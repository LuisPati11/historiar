alter table public.visit_verification_attempts set schema private;

alter function public.handle_new_user() set schema private;
alter function public.grant_eligible_medals() set schema private;
alter function public.purge_stale_visit_verification_attempts() set schema private;

create or replace function private.purge_stale_visit_verification_attempts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from private.visit_verification_attempts
  where created_at < now() - interval '24 hours';
  return null;
end;
$$;

create or replace function public.start_visit_verification(
  p_user_id uuid,
  p_monument_id uuid
)
returns table(attempt_id uuid, attempt_expires_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  if (
    select count(*)
    from private.visit_verification_attempts
    where user_id = p_user_id
      and created_at >= now() - interval '10 minutes'
  ) >= 5 then
    return;
  end if;

  return query
  insert into private.visit_verification_attempts (user_id, monument_id)
  values (p_user_id, p_monument_id)
  returning id, expires_at;
end;
$$;

create or replace function public.complete_visit_verification(
  p_attempt_id uuid,
  p_user_id uuid,
  p_monument_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  consumed_id uuid;
begin
  update private.visit_verification_attempts
  set consumed_at = now()
  where id = p_attempt_id
    and user_id = p_user_id
    and monument_id = p_monument_id
    and consumed_at is null
    and expires_at > now()
  returning id into consumed_id;

  if consumed_id is null then
    return false;
  end if;

  insert into public.visits (user_id, monument_id, verified_geo, verified_image)
  values (p_user_id, p_monument_id, true, true)
  on conflict (user_id, monument_id) do update
  set verified_geo = true,
      verified_image = true;

  return true;
end;
$$;

revoke all on table private.visit_verification_attempts from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on table private.visit_verification_attempts to service_role;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.grant_eligible_medals() from public, anon, authenticated;
revoke all on function private.purge_stale_visit_verification_attempts() from public, anon, authenticated;
revoke all on function public.start_visit_verification(uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_visit_verification(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_visit_verification(uuid, uuid) to service_role;
grant execute on function public.complete_visit_verification(uuid, uuid, uuid) to service_role;

drop policy if exists "user_medals: usuario ve las suyas" on public.user_medals;
drop policy if exists "user_medals: ver medallas de perfiles públicos" on public.user_medals;
create policy "user_medals: propias o de perfiles públicos"
  on public.user_medals for select
  to anon, authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and p.is_public
    )
  );
