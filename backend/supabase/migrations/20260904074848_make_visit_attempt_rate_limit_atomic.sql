create or replace function public.start_visit_verification(
  p_user_id uuid,
  p_monument_id uuid
)
returns table(attempt_id uuid, attempt_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  if (
    select count(*)
    from public.visit_verification_attempts
    where user_id = p_user_id
      and created_at >= now() - interval '10 minutes'
  ) >= 5 then
    return;
  end if;

  return query
  insert into public.visit_verification_attempts (user_id, monument_id)
  values (p_user_id, p_monument_id)
  returning id, expires_at;
end;
$$;

revoke all on function public.start_visit_verification(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_visit_verification(uuid, uuid) to service_role;
