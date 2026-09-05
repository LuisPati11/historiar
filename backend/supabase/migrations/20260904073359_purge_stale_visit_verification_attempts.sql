create or replace function public.purge_stale_visit_verification_attempts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.visit_verification_attempts
  where created_at < now() - interval '24 hours';
  return null;
end;
$$;

create trigger purge_stale_visit_verification_attempts_before_insert
before insert on public.visit_verification_attempts
for each statement execute function public.purge_stale_visit_verification_attempts();

revoke all on function public.purge_stale_visit_verification_attempts() from public, anon, authenticated;
